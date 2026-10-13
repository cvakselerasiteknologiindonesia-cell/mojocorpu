<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $keys = ['app_name', 'app_tagline', 'app_logo'];

        foreach ($keys as $key) {
            if (! DB::table('app_settings')->where('key', $key)->exists()) {
                DB::table('app_settings')->insert([
                    'key' => $key,
                    'value' => null,
                    'group' => 'general',
                    'is_secret' => false,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('app_settings')->whereIn('key', ['app_name', 'app_tagline', 'app_logo'])->delete();
    }
};
