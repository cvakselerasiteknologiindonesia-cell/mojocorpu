<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('group')->default('general');
            $table->boolean('is_secret')->default(false);
            $table->timestamps();
        });

        // Seed default AI settings
        $now = now();
        DB::table('app_settings')->insert([
            ['key' => 'ai_provider',       'value' => 'openai',  'group' => 'ai', 'is_secret' => false, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'ai_model',          'value' => 'gpt-4o-mini', 'group' => 'ai', 'is_secret' => false, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'ai_api_key',        'value' => null,      'group' => 'ai', 'is_secret' => true,  'created_at' => $now, 'updated_at' => $now],
            ['key' => 'ai_base_url',       'value' => null,      'group' => 'ai', 'is_secret' => false, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'ai_quiz_gen',       'value' => '0',       'group' => 'ai', 'is_secret' => false, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'ai_content_assist', 'value' => '0',       'group' => 'ai', 'is_secret' => false, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'ai_proposal_assist','value' => '0',       'group' => 'ai', 'is_secret' => false, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'ai_max_tokens',     'value' => '2048',    'group' => 'ai', 'is_secret' => false, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'ai_temperature',    'value' => '0.7',     'group' => 'ai', 'is_secret' => false, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
