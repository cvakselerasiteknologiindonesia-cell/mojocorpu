<?php

namespace Modules\Store\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Modules\Achievement\Services\AchievementService;
use Modules\Notification\Services\NotificationService;
use Modules\Store\Models\StoreItem;
use Modules\Store\Models\StorePurchase;
use Modules\Wallet\Services\WalletService;

class StoreService
{
    public function __construct(private readonly WalletService $wallet) {}

    public function purchase(StoreItem $item, int $userId): StorePurchase
    {
        if (! $item->is_active) {
            throw new \RuntimeException('Item tidak tersedia.');
        }

        return DB::transaction(function () use ($item, $userId) {
            // Lock the item row to prevent overselling
            $locked = StoreItem::lockForUpdate()->findOrFail($item->id);

            if (! $locked->is_active) {
                throw new \RuntimeException('Item tidak tersedia.');
            }

            if ($locked->stock !== null && $locked->stock <= 0) {
                throw new \RuntimeException('Stok item habis.');
            }

            // Debit wallet — uses idempotency via reference_type+reference_id,
            // but we need the purchase UUID first; do a pre-flight balance check instead.
            $walletBal = DB::table('wallets')->where('user_id', $userId)->value('balance') ?? 0;
            if ($walletBal < $locked->price) {
                throw new \RuntimeException('Saldo token tidak mencukupi.');
            }

            // Create purchase record first so we have an ID for the wallet reference.
            $purchase = StorePurchase::create([
                'user_id'       => $userId,
                'store_item_id' => $locked->id,
                'tokens_spent'  => $locked->price,
                'status'        => 'pending',
            ]);

            // Deduct stock
            if ($locked->stock !== null) {
                $locked->decrement('stock');
            }

            // Debit wallet using purchase UUID as idempotency key
            $this->wallet->debit(
                $userId,
                $locked->price,
                "Pembelian: {$locked->name}",
                'store_purchase',
                $purchase->id,
            );

            $result = $purchase->load('item');

            // Check badges outside the transaction to avoid locking
            try {
                $user = \App\Models\User::find($userId);
                if ($user) {
                    app(AchievementService::class)->checkAndAward($user);
                }
            } catch (\Throwable $e) {
                Log::warning('Achievement check after purchase failed: '.$e->getMessage());
            }

            return $result;
        });
    }

    public function fulfill(StorePurchase $purchase, ?string $note): StorePurchase
    {
        if ($purchase->status !== 'pending') {
            throw new \RuntimeException('Pembelian ini sudah diproses.');
        }

        $purchase->load('item');
        $purchase->update([
            'status'       => 'fulfilled',
            'note'         => $note,
            'fulfilled_at' => now(),
        ]);

        try {
            app(NotificationService::class)->send(
                $purchase->user_id,
                "Pesanan Diproses: {$purchase->item->name}",
                "Pesanan Anda telah diproses." . ($note ? " Catatan: {$note}" : ''),
                'store_fulfilled',
                '/store',
            );
        } catch (\Throwable $e) {
            Log::warning('Notify store fulfill failed: '.$e->getMessage());
        }

        return $purchase;
    }

    public function cancel(StorePurchase $purchase, ?string $note): StorePurchase
    {
        if ($purchase->status !== 'pending') {
            throw new \RuntimeException('Pembelian ini sudah diproses.');
        }

        $purchase->load('item');

        DB::transaction(function () use ($purchase, $note) {
            $purchase->update(['status' => 'cancelled', 'note' => $note]);

            if ($purchase->item->stock !== null) {
                $purchase->item->increment('stock');
            }

            $this->wallet->credit(
                $purchase->user_id,
                $purchase->tokens_spent,
                "Refund: {$purchase->item->name}",
                'store_refund',
                $purchase->id,
            );
        });

        try {
            app(NotificationService::class)->send(
                $purchase->user_id,
                "Pesanan Dibatalkan: {$purchase->item->name}",
                "{$purchase->tokens_spent} token telah dikembalikan ke dompet Anda." . ($note ? " Alasan: {$note}" : ''),
                'store_cancelled',
                '/store',
            );
        } catch (\Throwable $e) {
            Log::warning('Notify store cancel failed: '.$e->getMessage());
        }

        return $purchase;
    }
}
