<?php

namespace App\Http\Controllers;

use App\Models\EventPayment;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Modules\Settings\Models\AppSetting;
use Modules\TrainingEvent\Models\TrainingEvent;

class EventPaymentController extends Controller
{
    public function config(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'client_key' => AppSetting::get('midtrans_client_key', ''),
                'is_production' => AppSetting::get('midtrans_mode', 'sandbox') === 'production',
            ],
        ]);
    }

    public function initiate(Request $request, string $uuid): JsonResponse
    {
        try {
            $user = $request->user();
            $event = TrainingEvent::where('uuid', $uuid)->firstOrFail();

            if ($event->status !== 'active') {
                return ApiResponse::error('Event tidak tersedia untuk pendaftaran.', 422);
            }
            if (! $event->is_paid || ! $event->price) {
                return ApiResponse::error('Event ini gratis, gunakan endpoint enroll biasa.', 422);
            }

            // Wrap all checks + writes in a transaction so concurrent requests
            // cannot both pass the quota/enrollment checks before either saves.
            $result = DB::transaction(function () use ($user, $event, $uuid) {
                // Re-check quota inside the transaction with a shared lock.
                $participantCount = DB::table('event_participants')
                    ->where('training_event_id', $event->id)
                    ->lockForUpdate()
                    ->count();

                if ($event->quota && $participantCount >= $event->quota) {
                    return ['error' => 'Kuota peserta sudah penuh.', 'status' => 422];
                }

                $alreadyEnrolled = DB::table('event_participants')
                    ->where('training_event_id', $event->id)
                    ->where('user_id', $user->id)
                    ->exists();

                if ($alreadyEnrolled) {
                    return ['error' => 'Anda sudah terdaftar di event ini.', 'status' => 422];
                }

                // Reuse pending payment if exists (user can retry).
                $payment = EventPayment::lockForUpdate()
                    ->where('training_event_id', $event->id)
                    ->where('user_id', $user->id)
                    ->first();

                if ($payment && $payment->isPaid()) {
                    return ['error' => 'Pembayaran untuk event ini sudah selesai.', 'status' => 422];
                }

                if (! $payment) {
                    $payment = new EventPayment([
                        'training_event_id' => $event->id,
                        'user_id' => $user->id,
                    ]);
                }

                // Generate order_id only when needed — use Str::random instead
                // of time() to guarantee uniqueness even for rapid retries.
                if (! $payment->order_id) {
                    $payment->order_id = 'EVT-'.strtoupper(substr($uuid, 0, 8)).'-'.$user->id.'-'.Str::random(8);
                    $payment->amount = $event->price;
                    $payment->status = 'pending';
                }

                return ['payment' => $payment, 'event' => $event];
            });

            if (isset($result['error'])) {
                return ApiResponse::error($result['error'], $result['status']);
            }

            $payment = $result['payment'];
            $event = $result['event'];

            // Get Snap token from Midtrans (outside transaction — HTTP call should not hold DB lock).
            $snapToken = $this->createSnapToken($payment->order_id, $event, $user);
            if (! $snapToken) {
                return ApiResponse::error('Gagal menghubungi payment gateway. Coba lagi.', 502);
            }

            $payment->snap_token = $snapToken;
            $payment->save();

            return ApiResponse::success('Snap token dibuat.', [
                'snap_token' => $snapToken,
                'order_id' => $payment->order_id,
                'amount' => $payment->amount,
                'event_title' => $event->title,
            ]);
        } catch (\Throwable $e) {
            Log::error('EventPayment initiate error: '.$e->getMessage(), [
                'uuid' => $uuid,
                'user_id' => $request->user()?->id,
            ]);

            return ApiResponse::error();
        }
    }

    public function status(Request $request, string $uuid): JsonResponse
    {
        $event = TrainingEvent::where('uuid', $uuid)->firstOrFail();
        $payment = EventPayment::where('training_event_id', $event->id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $payment) {
            return response()->json(['success' => true, 'data' => ['status' => null]]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'status' => $payment->status,
                'order_id' => $payment->order_id,
                'amount' => $payment->amount,
                'paid_at' => $payment->paid_at?->toDateTimeString(),
            ],
        ]);
    }

    private function createSnapToken(string $orderId, TrainingEvent $event, $user): ?string
    {
        $serverKey = AppSetting::get('midtrans_server_key', '');
        $isProduction = AppSetting::get('midtrans_mode', 'sandbox') === 'production';
        $snapUrl = $isProduction
            ? 'https://app.midtrans.com/snap/v1/transactions'
            : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

        if (! $serverKey) {
            Log::error('EventPayment: midtrans_server_key not configured');

            return null;
        }

        $nameParts = explode(' ', $user->name, 2);
        $payload = [
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => (int) $event->price,
            ],
            'item_details' => [[
                'id' => $event->uuid,
                'price' => (int) $event->price,
                'quantity' => 1,
                'name' => mb_substr($event->title, 0, 50),
            ]],
            'customer_details' => [
                'first_name' => $nameParts[0],
                'last_name' => $nameParts[1] ?? '',
                'email' => $user->email ?? ($user->nip.'@corpu.local'),
            ],
            'callbacks' => [
                'finish' => config('app.url').'/training-events',
            ],
        ];

        try {
            $response = Http::withBasicAuth($serverKey, '')
                ->timeout(15)
                ->post($snapUrl, $payload);

            if ($response->successful()) {
                return $response->json('token');
            }

            Log::error('EventPayment: Snap API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        } catch (\Throwable $e) {
            Log::error('EventPayment: Snap API exception: '.$e->getMessage());

            return null;
        }
    }
}
