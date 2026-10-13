<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $rows = [
            ['key' => 'midtrans_merchant_id',                'value' => null,       'is_secret' => false],
            ['key' => 'midtrans_client_key',                 'value' => null,       'is_secret' => true],
            ['key' => 'midtrans_server_key',                 'value' => null,       'is_secret' => true],
            ['key' => 'midtrans_mode',                       'value' => 'sandbox',  'is_secret' => false],
            ['key' => 'midtrans_webhook_verify_signature',   'value' => '1',        'is_secret' => false],
            ['key' => 'midtrans_webhook_verify_amount',      'value' => '1',        'is_secret' => false],
            ['key' => 'midtrans_ip_whitelist',               'value' => '0',        'is_secret' => false],
            ['key' => 'midtrans_idempotency_guard',          'value' => '1',        'is_secret' => false],
        ];

        foreach ($rows as $row) {
            if (! DB::table('app_settings')->where('key', $row['key'])->exists()) {
                DB::table('app_settings')->insert(array_merge($row, [
                    'group' => 'payment',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]));
            }
        }
    }

    public function down(): void
    {
        DB::table('app_settings')->where('group', 'payment')->delete();
    }
};
