<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Modules\Notification\Services\NotificationService;
use Modules\Settings\Models\AppSetting;

class PaymentWebhookController extends Controller
{
    private const TERMINAL_STATUSES = ['settlement', 'capture', 'deny', 'cancel', 'expire', 'failure'];

    public function midtrans(Request $request, NotificationService $notif)
    {
        $payload = $request->all();
        $ip = $request->ip();

        Log::info('Midtrans webhook received', ['ip' => $ip, 'order_id' => $payload['order_id'] ?? null]);

        // [M1] Load all payment settings once with a 60s cache — prevents N+1 queries
        $cfg = Cache::remember('payment_cfg_webhook', 60, function () {
            return AppSetting::where('group', 'payment')->get()->keyBy('key')->map(fn ($r) => $r->value)->all();
        });

        $orderId = $payload['order_id'] ?? null;
        $txStatus = $payload['transaction_status'] ?? null;

        if (! $orderId || ! $txStatus) {
            Log::warning('Midtrans webhook: missing required fields', $payload);

            return response()->json(['success' => false, 'message' => 'Bad payload.'], 400);
        }

        // ── 1. Idempotency guard ──────────────────────────────────────────────
        if (($cfg['midtrans_idempotency_guard'] ?? '1') === '1') {
            $alreadyTerminal = DB::table('payment_logs')
                ->where('order_id', $orderId)
                ->whereIn('transaction_status', self::TERMINAL_STATUSES)
                ->exists();

            if ($alreadyTerminal) {
                Log::info('Midtrans webhook: duplicate terminal notification ignored', ['order_id' => $orderId]);

                return response()->json(['success' => true, 'message' => 'Duplicate ignored.']);
            }
        }

        // ── 2. Signature verification — ALWAYS enforced, not a toggle [C1 fix] ─
        $serverKey = AppSetting::get('midtrans_server_key'); // decrypts from DB
        $statusCode = $payload['status_code'] ?? '';
        $grossAmount = $payload['gross_amount'] ?? '';
        $incomingSig = $payload['signature_key'] ?? '';

        if (! $serverKey) {
            Log::error('Midtrans webhook: server key not configured');

            return response()->json(['success' => false, 'message' => 'Gateway misconfigured.'], 500);
        }

        $expected = hash('sha512', $orderId.$statusCode.$grossAmount.$serverKey);
        $sigValid = hash_equals($expected, $incomingSig);

        if (! $sigValid) {
            Log::warning('Midtrans webhook: INVALID SIGNATURE — possible spoofed request', [
                'order_id' => $orderId,
                'ip' => $ip,
            ]);
            $this->writeLog($payload, $ip, false, false, false);
            $this->alertAdmins($notif, $orderId, 'Signature tidak valid — kemungkinan request palsu dari IP '.$ip);

            return response()->json(['success' => false, 'message' => 'Invalid signature.'], 403);
        }

        // ── 3. Amount verification ────────────────────────────────────────────
        $amountValid = true;
        $incomingAmount = (int) str_replace([',', '.00'], '', $payload['gross_amount'] ?? '0');
        $dbAmount = $this->getOrderAmount($orderId);

        if ($dbAmount !== null && $incomingAmount !== $dbAmount) {
            Log::warning('Midtrans webhook: amount mismatch', [
                'order_id' => $orderId,
                'incoming' => $incomingAmount,
                'db_amount' => $dbAmount,
            ]);
            $this->writeLog($payload, $ip, true, false, false);
            $this->alertAdmins($notif, $orderId, "Nominal tidak cocok: webhook Rp{$incomingAmount}, DB Rp{$dbAmount}.");

            return response()->json(['success' => false, 'message' => 'Amount mismatch.'], 422);
        }

        // ── 4. Log the notification ───────────────────────────────────────────
        $isDuplicate = DB::table('payment_logs')
            ->where('order_id', $orderId)
            ->where('transaction_status', $txStatus)
            ->exists();

        $this->writeLog($payload, $ip, true, $amountValid, $isDuplicate);

        // ── 5. Alert admins on failure statuses ───────────────────────────────
        if (in_array($txStatus, ['deny', 'cancel', 'expire', 'failure'], true)) {
            $paymentType = $payload['payment_type'] ?? 'unknown';
            $amount = number_format((float) ($payload['gross_amount'] ?? 0), 0, ',', '.');
            $this->alertAdmins($notif, $orderId, "Payment {$txStatus}: order {$orderId} via {$paymentType} Rp{$amount}.");
        }

        // ── 6. Process settled/captured payment ───────────────────────────────
        if (in_array($txStatus, ['settlement', 'capture'], true) && ! $isDuplicate) {
            $this->processSuccessfulPayment($orderId, $payload);
        }

        Log::info('Midtrans webhook: processed', ['order_id' => $orderId, 'status' => $txStatus]);

        return response()->json(['success' => true]);
    }

    private function writeLog(array $payload, string $ip, bool $sigValid, bool $amountValid, bool $isDuplicate): void
    {
        try {
            DB::table('payment_logs')->insert([
                'order_id' => $payload['order_id'] ?? '',
                'transaction_id' => $payload['transaction_id'] ?? null,
                'transaction_status' => $payload['transaction_status'] ?? '',
                'payment_type' => $payload['payment_type'] ?? null,
                'gross_amount' => (int) str_replace([',', '.00'], '', $payload['gross_amount'] ?? '0'),
                'currency' => $payload['currency'] ?? 'IDR',
                'status_code' => $payload['status_code'] ?? null,
                'fraud_status' => $payload['fraud_status'] ?? null,
                'signature_key' => $payload['signature_key'] ?? null,
                'signature_valid' => $sigValid,
                'amount_valid' => $amountValid,
                'is_duplicate' => $isDuplicate,
                'raw_payload' => json_encode($payload),
                'ip_address' => $ip,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Midtrans webhook: failed to write log — '.$e->getMessage());
        }
    }

    private function alertAdmins(NotificationService $notif, string $orderId, string $detail): void
    {
        try {
            $adminIds = User::role('super-admin')->pluck('id')->toArray();
            if (empty($adminIds)) {
                return;
            }

            $notif->sendMany(
                $adminIds,
                title: '⚠️ Payment Alert',
                message: "[{$orderId}] {$detail}",
                type: 'warning',
                link: '/settings',
            );
        } catch (\Throwable $e) {
            Log::error('Midtrans webhook: failed to alert admins — '.$e->getMessage());
        }
    }

    private function getOrderAmount(string $orderId): ?int
    {
        // Check event payment
        $eventPayment = DB::table('event_payments')->where('order_id', $orderId)->first();
        if ($eventPayment) {
            return (int) $eventPayment->amount;
        }

        $purchase = DB::table('store_purchases')->where('uuid', $orderId)->first();
        if ($purchase) {
            return (int) ($purchase->tokens_spent ?? 0);
        }

        return null;
    }

    private function processSuccessfulPayment(string $orderId, array $payload): void
    {
        Log::info('Midtrans webhook: processing successful payment', ['order_id' => $orderId]);

        // ── Event payment fulfillment ─────────────────────────────────────────
        $eventPayment = DB::table('event_payments')->where('order_id', $orderId)->first();
        if ($eventPayment) {
            DB::transaction(function () use ($orderId, $payload): void {
                // Re-fetch with lock inside transaction to prevent race from duplicate webhook.
                $locked = DB::table('event_payments')
                    ->where('order_id', $orderId)
                    ->lockForUpdate()
                    ->first();

                if (! $locked || $locked->status === 'paid') {
                    Log::info('Midtrans webhook: event payment already paid, skip', ['order_id' => $orderId]);

                    return;
                }

                DB::table('event_payments')->where('order_id', $orderId)->update([
                    'status' => 'paid',
                    'payment_type' => $payload['payment_type'] ?? null,
                    'paid_at' => now(),
                    'updated_at' => now(),
                ]);

                // Enroll user if not already enrolled — done inside the same
                // transaction so payment + enroll are always consistent.
                $alreadyEnrolled = DB::table('event_participants')
                    ->where('training_event_id', $locked->training_event_id)
                    ->where('user_id', $locked->user_id)
                    ->exists();

                if (! $alreadyEnrolled) {
                    DB::table('event_participants')->insert([
                        'training_event_id' => $locked->training_event_id,
                        'user_id' => $locked->user_id,
                        'status' => 'enrolled',
                        'enrolled_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                Log::info('Midtrans webhook: event payment fulfilled', [
                    'order_id' => $orderId,
                    'user_id' => $locked->user_id,
                    'event_id' => $locked->training_event_id,
                ]);
            });

            return;
        }

        Log::info('Midtrans webhook: no fulfillment handler found', ['order_id' => $orderId]);
    }
}
