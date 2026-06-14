<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now  = now();
        $rows = [
            ['key' => 'wallet_enabled',           'value' => '1',         'group' => 'wallet', 'is_secret' => false],
            ['key' => 'wallet_auto_credit',        'value' => '1',         'group' => 'wallet', 'is_secret' => false],
            ['key' => 'wallet_max_balance',        'value' => '1000000',   'group' => 'wallet', 'is_secret' => false],
            ['key' => 'wallet_max_single_credit',  'value' => '10000',     'group' => 'wallet', 'is_secret' => false],
            ['key' => 'wallet_score_tiers', 'value' => json_encode([
                ['min_score' => 90, 'multiplier' => 1.5, 'label' => 'Excellent'],
                ['min_score' => 75, 'multiplier' => 1.0, 'label' => 'Good'],
                ['min_score' => 60, 'multiplier' => 0.5, 'label' => 'Pass'],
            ]), 'group' => 'wallet', 'is_secret' => false],
        ];

        foreach ($rows as $row) {
            DB::table('app_settings')->insertOrIgnore(array_merge($row, ['created_at' => $now, 'updated_at' => $now]));
        }
    }

    public function down(): void
    {
        DB::table('app_settings')->where('group', 'wallet')->delete();
    }
};
