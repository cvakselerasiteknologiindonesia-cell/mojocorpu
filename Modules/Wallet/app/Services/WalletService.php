<?php

namespace Modules\Wallet\Services;

use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Settings\Models\AppSetting;
use Modules\Wallet\Models\Wallet;
use Modules\Wallet\Models\WalletTransaction;

class WalletService
{
    // Fallback constants — used when the DB setting is missing or cache is cold.
    public const DEFAULT_MAX_BALANCE       = 1_000_000;
    public const DEFAULT_MAX_SINGLE_CREDIT = 10_000;
    private const CACHE_KEY = 'wallet_cfg';
    private const CACHE_TTL = 300; // 5 minutes

    // ── Config helpers ──────────────────────────────────────────────────────────

    private function cfg(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            /** @var array<string, AppSetting> $rows */
            $rows = AppSetting::where('group', 'wallet')->get()->keyBy('key')->all();

            $tiers = json_decode($rows['wallet_score_tiers']?->value ?? '[]', true) ?: [
                ['min_score' => 90, 'multiplier' => 1.5],
                ['min_score' => 75, 'multiplier' => 1.0],
                ['min_score' => 60, 'multiplier' => 0.5],
            ];

            // Sort tiers descending by min_score so the first match wins.
            usort($tiers, fn ($a, $b) => $b['min_score'] <=> $a['min_score']);

            return [
                'enabled'           => ($rows['wallet_enabled']?->value          ?? '1') === '1',
                'auto_credit'       => ($rows['wallet_auto_credit']?->value      ?? '1') === '1',
                'max_balance'       => (int) ($rows['wallet_max_balance']?->value       ?? self::DEFAULT_MAX_BALANCE),
                'max_single_credit' => (int) ($rows['wallet_max_single_credit']?->value ?? self::DEFAULT_MAX_SINGLE_CREDIT),
                'score_tiers'       => $tiers,
            ];
        });
    }

    public function isEnabled(): bool      { return $this->cfg()['enabled']; }
    public function isAutoCredit(): bool   { return $this->cfg()['auto_credit']; }
    public function maxBalance(): int      { return $this->cfg()['max_balance']; }
    public function maxSingleCredit(): int { return $this->cfg()['max_single_credit']; }
    public function scoreTiers(): array    { return $this->cfg()['score_tiers']; }

    // ── Core operations ─────────────────────────────────────────────────────────

    public function getOrCreate(int $userId): Wallet
    {
        DB::table('wallets')->insertOrIgnore([
            'user_id'    => $userId,
            'balance'    => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return Wallet::where('user_id', $userId)->firstOrFail();
    }

    /**
     * Credit a user's wallet.
     * Returns null (idempotent no-op) if the same reference was already credited.
     */
    public function credit(int $userId, int $amount, string $description, ?string $refType = null, ?int $refId = null): ?WalletTransaction
    {
        if (! $this->isEnabled()) {
            return null;
        }

        if ($amount <= 0) {
            throw new \InvalidArgumentException('Credit amount must be positive.');
        }

        if ($amount > $this->maxSingleCredit()) {
            throw new \InvalidArgumentException('Credit amount exceeds per-transaction limit of '.$this->maxSingleCredit().' tokens.');
        }

        // Idempotency guard — skip if already credited for this exact source.
        if ($refType !== null && $refId !== null) {
            if (WalletTransaction::where('reference_type', $refType)->where('reference_id', $refId)->exists()) {
                return null;
            }
        }

        return DB::transaction(function () use ($userId, $amount, $description, $refType, $refId) {
            DB::table('wallets')->insertOrIgnore([
                'user_id' => $userId, 'balance' => 0,
                'created_at' => now(), 'updated_at' => now(),
            ]);

            $wallet = Wallet::lockForUpdate()->where('user_id', $userId)->firstOrFail();

            if ($wallet->balance + $amount > $this->maxBalance()) {
                throw new \RuntimeException('Penambahan token melebihi batas maksimum saldo ('.$this->maxBalance().' token).');
            }

            $newBalance = $wallet->balance + $amount;
            $wallet->increment('balance', $amount);

            try {
                return WalletTransaction::create([
                    'wallet_id'      => $wallet->id,
                    'type'           => 'credit',
                    'amount'         => $amount,
                    'balance_after'  => $newBalance,
                    'description'    => $description,
                    'reference_type' => $refType,
                    'reference_id'   => $refId,
                ]);
            } catch (UniqueConstraintViolationException) {
                throw new \RuntimeException('Duplicate credit detected — transaction rolled back.');
            }
        });
    }

    /**
     * Debit a user's wallet.
     * Returns null (idempotent no-op) if the same reference was already debited.
     */
    public function debit(int $userId, int $amount, string $description, ?string $refType = null, ?int $refId = null): ?WalletTransaction
    {
        if (! $this->isEnabled()) {
            return null;
        }

        if ($amount <= 0) {
            throw new \InvalidArgumentException('Debit amount must be positive.');
        }

        if ($refType !== null && $refId !== null) {
            if (WalletTransaction::where('reference_type', $refType)->where('reference_id', $refId)->exists()) {
                return null;
            }
        }

        return DB::transaction(function () use ($userId, $amount, $description, $refType, $refId) {
            $wallet = Wallet::lockForUpdate()->where('user_id', $userId)->firstOrFail();

            if ($wallet->balance < $amount) {
                throw new \RuntimeException('Saldo token tidak mencukupi.');
            }

            $newBalance = $wallet->balance - $amount;
            $wallet->decrement('balance', $amount);

            return WalletTransaction::create([
                'wallet_id'      => $wallet->id,
                'type'           => 'debit',
                'amount'         => $amount,
                'balance_after'  => $newBalance,
                'description'    => $description,
                'reference_type' => $refType,
                'reference_id'   => $refId,
            ]);
        });
    }

    /**
     * Convert an assessment score (0–100) to tokens using tiers from DB settings.
     */
    public function tokensFromScore(int $score): int
    {
        $score = max(0, min(100, $score));
        $tiers = $this->cfg()['score_tiers'];

        foreach ($tiers as $tier) {
            if ($score >= (int) $tier['min_score']) {
                return (int) round($score * (float) $tier['multiplier']);
            }
        }

        return 0;
    }
}
