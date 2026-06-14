<?php

namespace App\Services;

use App\Models\BlockedIp;
use App\Models\LoginAttempt;
use App\Models\SecurityEvent;

class IntrusionDetectionService
{
    // Thresholds
    private const BRUTE_FORCE_LIMIT    = 5;   // failed logins from same IP in 15 min
    private const BRUTE_FORCE_WINDOW   = 15;
    private const STUFFING_LIMIT       = 10;  // failed logins targeting ≥3 accounts from same IP in 60 min
    private const STUFFING_WINDOW      = 60;
    private const STUFFING_ACCOUNTS    = 3;
    private const ACCOUNT_TARGET_LIMIT = 8;   // failed logins on same identifier in 30 min
    private const ACCOUNT_TARGET_WINDOW = 30;
    private const SUSTAINED_LIMIT      = 30;  // failed logins from same IP in 24 h → permanent block
    private const SUSTAINED_WINDOW     = 1440;

    public function recordAttempt(
        string $ip,
        string $identifier,
        bool $success,
        ?int $userId = null,
        ?string $userAgent = null,
        ?string $failureReason = null
    ): void {
        LoginAttempt::create([
            'ip_address'     => $ip,
            'identifier'     => $identifier,
            'success'        => $success,
            'user_id'        => $userId,
            'user_agent'     => $userAgent,
            'failure_reason' => $failureReason,
        ]);

        if (! $success) {
            $this->analyze($ip, $identifier);
        }
    }

    public function blockIp(string $ip, string $reason, string $source = 'auto', ?\DateTimeInterface $expiresAt = null, ?int $blockedBy = null): BlockedIp
    {
        return BlockedIp::updateOrCreate(
            ['ip_address' => $ip],
            [
                'reason'     => $reason,
                'source'     => $source,
                'blocked_by' => $blockedBy,
                'expires_at' => $expiresAt,
            ]
        );
    }

    public function isBlocked(string $ip): bool
    {
        return BlockedIp::where('ip_address', $ip)
            ->active()
            ->exists();
    }

    private function analyze(string $ip, string $identifier): void
    {
        // Already blocked — skip further analysis
        if ($this->isBlocked($ip)) {
            return;
        }

        $this->checkBruteForce($ip);
        $this->checkCredentialStuffing($ip);
        $this->checkAccountTargeted($identifier, $ip);
        $this->checkSustainedAttack($ip);
    }

    private function checkBruteForce(string $ip): void
    {
        $count = LoginAttempt::where('ip_address', $ip)
            ->where('success', false)
            ->where('created_at', '>=', now()->subMinutes(self::BRUTE_FORCE_WINDOW))
            ->count();

        if ($count < self::BRUTE_FORCE_LIMIT) {
            return;
        }

        $alreadyFlagged = SecurityEvent::where('type', 'brute_force')
            ->where('ip_address', $ip)
            ->where('resolved', false)
            ->where('created_at', '>=', now()->subMinutes(self::BRUTE_FORCE_WINDOW))
            ->exists();

        if ($alreadyFlagged) {
            return;
        }

        SecurityEvent::create([
            'type'        => 'brute_force',
            'severity'    => 'high',
            'ip_address'  => $ip,
            'description' => "{$count} failed login attempts from IP {$ip} in the last " . self::BRUTE_FORCE_WINDOW . ' minutes.',
            'metadata'    => ['failed_count' => $count, 'window_minutes' => self::BRUTE_FORCE_WINDOW],
        ]);

        $this->blockIp($ip, "Brute force: {$count} failed logins in " . self::BRUTE_FORCE_WINDOW . ' min', 'auto', now()->addHours(2));
    }

    private function checkCredentialStuffing(string $ip): void
    {
        $rows = LoginAttempt::where('ip_address', $ip)
            ->where('success', false)
            ->where('created_at', '>=', now()->subMinutes(self::STUFFING_WINDOW))
            ->selectRaw('COUNT(*) as cnt, COUNT(DISTINCT identifier) as unique_ids')
            ->first();

        if (! $rows || $rows->cnt < self::STUFFING_LIMIT || $rows->unique_ids < self::STUFFING_ACCOUNTS) {
            return;
        }

        $alreadyFlagged = SecurityEvent::where('type', 'credential_stuffing')
            ->where('ip_address', $ip)
            ->where('resolved', false)
            ->where('created_at', '>=', now()->subMinutes(self::STUFFING_WINDOW))
            ->exists();

        if ($alreadyFlagged) {
            return;
        }

        SecurityEvent::create([
            'type'        => 'credential_stuffing',
            'severity'    => 'critical',
            'ip_address'  => $ip,
            'description' => "{$rows->cnt} failed logins targeting {$rows->unique_ids} different accounts from IP {$ip} in the last " . self::STUFFING_WINDOW . ' minutes.',
            'metadata'    => ['failed_count' => $rows->cnt, 'unique_accounts' => $rows->unique_ids, 'window_minutes' => self::STUFFING_WINDOW],
        ]);

        $this->blockIp($ip, "Credential stuffing: {$rows->cnt} attempts across {$rows->unique_ids} accounts", 'auto', now()->addHours(24));
    }

    private function checkAccountTargeted(string $identifier, string $ip): void
    {
        if (! $identifier) {
            return;
        }

        $count = LoginAttempt::where('identifier', $identifier)
            ->where('success', false)
            ->where('created_at', '>=', now()->subMinutes(self::ACCOUNT_TARGET_WINDOW))
            ->count();

        if ($count < self::ACCOUNT_TARGET_LIMIT) {
            return;
        }

        $alreadyFlagged = SecurityEvent::where('type', 'account_targeted')
            ->where('ip_address', $ip)
            ->where('resolved', false)
            ->where('created_at', '>=', now()->subMinutes(self::ACCOUNT_TARGET_WINDOW))
            ->exists();

        if ($alreadyFlagged) {
            return;
        }

        SecurityEvent::create([
            'type'        => 'account_targeted',
            'severity'    => 'high',
            'ip_address'  => $ip,
            'description' => "Account '{$identifier}' targeted with {$count} failed login attempts in the last " . self::ACCOUNT_TARGET_WINDOW . ' minutes.',
            'metadata'    => ['identifier' => $identifier, 'failed_count' => $count, 'window_minutes' => self::ACCOUNT_TARGET_WINDOW],
        ]);
    }

    private function checkSustainedAttack(string $ip): void
    {
        $count = LoginAttempt::where('ip_address', $ip)
            ->where('success', false)
            ->where('created_at', '>=', now()->subMinutes(self::SUSTAINED_WINDOW))
            ->count();

        if ($count < self::SUSTAINED_LIMIT) {
            return;
        }

        $alreadyFlagged = SecurityEvent::where('type', 'sustained_attack')
            ->where('ip_address', $ip)
            ->where('resolved', false)
            ->where('created_at', '>=', now()->subDay())
            ->exists();

        if ($alreadyFlagged) {
            return;
        }

        SecurityEvent::create([
            'type'        => 'sustained_attack',
            'severity'    => 'critical',
            'ip_address'  => $ip,
            'description' => "Sustained attack: {$count} failed login attempts from IP {$ip} in the last 24 hours.",
            'metadata'    => ['failed_count' => $count],
        ]);

        $this->blockIp($ip, "Sustained attack: {$count} failed logins in 24 h", 'auto');
    }
}
