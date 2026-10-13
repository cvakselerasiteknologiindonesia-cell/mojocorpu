<?php

namespace Modules\Settings\Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

class SettingsDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // ── AI Settings ────────────────────────────────────────────────────────
        $aiDefaults = [
            ['key' => 'ai_provider',        'value' => 'openai',      'is_secret' => false],
            ['key' => 'ai_model',           'value' => 'gpt-4o-mini', 'is_secret' => false],
            ['key' => 'ai_api_key',         'value' => null,          'is_secret' => true],
            ['key' => 'ai_base_url',        'value' => null,          'is_secret' => false],
            ['key' => 'ai_quiz_gen',        'value' => '0',           'is_secret' => false],
            ['key' => 'ai_content_assist',  'value' => '0',           'is_secret' => false],
            ['key' => 'ai_proposal_assist', 'value' => '0',           'is_secret' => false],
            ['key' => 'ai_max_tokens',      'value' => '2048',        'is_secret' => false],
            ['key' => 'ai_temperature',     'value' => '0.7',         'is_secret' => false],
        ];

        foreach ($aiDefaults as $row) {
            DB::table('app_settings')->upsert(
                array_merge($row, ['group' => 'ai', 'created_at' => $now, 'updated_at' => $now]),
                ['key'],
                ['group', 'is_secret', 'updated_at'],
            );
        }

        // ── Wallet Settings ────────────────────────────────────────────────────
        $walletDefaults = [
            ['key' => 'wallet_enabled',            'value' => '1'],
            ['key' => 'wallet_auto_credit',        'value' => '1'],
            ['key' => 'wallet_max_balance',        'value' => '1000000'],
            ['key' => 'wallet_max_single_credit',  'value' => '10000'],
            ['key' => 'wallet_score_tiers',        'value' => json_encode([
                ['min_score' => 90, 'multiplier' => 3.0, 'label' => 'Excellent'],
                ['min_score' => 75, 'multiplier' => 2.0, 'label' => 'Good'],
                ['min_score' => 60, 'multiplier' => 1.0, 'label' => 'Pass'],
            ])],
        ];

        foreach ($walletDefaults as $row) {
            DB::table('app_settings')->upsert(
                array_merge($row, ['group' => 'wallet', 'is_secret' => false, 'created_at' => $now, 'updated_at' => $now]),
                ['key'],
                ['group', 'updated_at'],
            );
        }

        // ── Payment (Midtrans) ─────────────────────────────────────────────────
        // Credentials dibaca dari .env — JANGAN hardcode di sini (git history exposure)
        $paymentDefaults = [
            ['key' => 'midtrans_merchant_id',              'value' => env('MIDTRANS_MERCHANT_ID', ''),  'is_secret' => false],
            ['key' => 'midtrans_client_key',               'value' => env('MIDTRANS_CLIENT_KEY', ''),  'is_secret' => true],
            ['key' => 'midtrans_server_key',               'value' => env('MIDTRANS_SERVER_KEY', ''),  'is_secret' => true],
            ['key' => 'midtrans_mode',                     'value' => env('MIDTRANS_MODE', 'sandbox'),  'is_secret' => false],
            ['key' => 'midtrans_webhook_url',              'value' => env('APP_URL', 'http://localhost').'/api/payment/webhook/midtrans', 'is_secret' => false],
            ['key' => 'midtrans_webhook_verify_signature', 'value' => '1',  'is_secret' => false],
            ['key' => 'midtrans_webhook_verify_amount',    'value' => '1',  'is_secret' => false],
            ['key' => 'midtrans_ip_whitelist',             'value' => '0',  'is_secret' => false],
            ['key' => 'midtrans_idempotency_guard',        'value' => '1',  'is_secret' => false],
        ];

        foreach ($paymentDefaults as $row) {
            DB::table('app_settings')->upsert(
                array_merge($row, ['group' => 'payment', 'created_at' => $now, 'updated_at' => $now]),
                ['key'],
                ['group', 'is_secret', 'updated_at'],
            );
        }

        // ── App Identity ───────────────────────────────────────────────────────
        $this->seedDefaultLogo();

        $identityDefaults = [
            ['key' => 'app_name',    'value' => 'MojoCorpu'],
            ['key' => 'app_tagline', 'value' => 'Platform Pembelajaran ASN Kabupaten Mojokerto'],
            ['key' => 'app_logo',    'value' => '/storage/app-identity/default-logo.png'],
        ];

        foreach ($identityDefaults as $row) {
            DB::table('app_settings')->upsert(
                array_merge($row, ['group' => 'general', 'is_secret' => false, 'created_at' => $now, 'updated_at' => $now]),
                ['key'],
                ['group', 'updated_at'],
                // nilai TIDAK dioverwrite agar logo/nama yang sudah dikustomisasi admin tetap terjaga
            );
        }
    }

    private function seedDefaultLogo(): void
    {
        $dest = Storage::disk('public')->path('app-identity/default-logo.png');

        if (file_exists($dest)) {
            return;
        }

        $src = public_path('images/corpu-topbar-logo.png');

        if (! file_exists($src)) {
            return;
        }

        File::ensureDirectoryExists(dirname($dest));
        File::copy($src, $dest);
    }
}
