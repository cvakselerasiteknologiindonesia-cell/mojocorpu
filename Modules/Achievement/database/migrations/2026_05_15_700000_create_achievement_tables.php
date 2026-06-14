<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('badges', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('icon')->default('Award');        // Lucide icon name
            $table->string('color')->default('#6366f1');     // hex color
            $table->string('background')->default('#eef2ff');
            $table->enum('tier', ['bronze', 'silver', 'gold', 'platinum'])->default('bronze');
            $table->string('criteria_type');                 // submission_count|pass_count|score_gte|score_perfect|streak_days|tokens_earned|wallet_balance|store_purchase
            $table->unsignedInteger('criteria_value')->default(1);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('user_badges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('badge_id')->constrained()->cascadeOnDelete();
            $table->timestamp('awarded_at');
            $table->timestamps();
            $table->unique(['user_id', 'badge_id']);
        });

        Schema::create('user_streaks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->unique();
            $table->unsignedInteger('current_streak')->default(0);
            $table->unsignedInteger('longest_streak')->default(0);
            $table->date('last_activity_date')->nullable();
            $table->timestamps();
        });

        // Seed default badges
        $now = now();
        DB::table('badges')->insert([
            ['name' => 'Pemula',           'slug' => 'first-submission',  'description' => 'Selesaikan asesmen pertama Anda',         'icon' => 'Star',      'color' => '#92400e', 'background' => '#fef3c7', 'tier' => 'bronze',   'criteria_type' => 'submission_count', 'criteria_value' => 1,    'sort_order' => 10, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Rajin Belajar',    'slug' => 'five-submissions',  'description' => 'Selesaikan 5 asesmen',                    'icon' => 'BookOpen',  'color' => '#92400e', 'background' => '#fef3c7', 'tier' => 'bronze',   'criteria_type' => 'submission_count', 'criteria_value' => 5,    'sort_order' => 20, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Mahir',            'slug' => 'ten-submissions',   'description' => 'Selesaikan 10 asesmen',                   'icon' => 'BookOpen',  'color' => '#6b7280', 'background' => '#f3f4f6', 'tier' => 'silver',   'criteria_type' => 'submission_count', 'criteria_value' => 10,   'sort_order' => 30, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Berprestasi',      'slug' => 'five-passed',       'description' => 'Lulus 5 asesmen',                         'icon' => 'Medal',     'color' => '#6b7280', 'background' => '#f3f4f6', 'tier' => 'silver',   'criteria_type' => 'pass_count',       'criteria_value' => 5,    'sort_order' => 40, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Juara',            'slug' => 'twenty-passed',     'description' => 'Lulus 20 asesmen',                        'icon' => 'Medal',     'color' => '#b45309', 'background' => '#fffbeb', 'tier' => 'gold',     'criteria_type' => 'pass_count',       'criteria_value' => 20,   'sort_order' => 50, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Nilai Tinggi',     'slug' => 'score-90',          'description' => 'Raih nilai ≥90 dalam satu asesmen',        'icon' => 'TrendingUp','color' => '#6b7280', 'background' => '#f3f4f6', 'tier' => 'silver',   'criteria_type' => 'score_gte',        'criteria_value' => 90,   'sort_order' => 60, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Sempurna',         'slug' => 'perfect-score',     'description' => 'Raih nilai sempurna 100',                  'icon' => 'Crown',     'color' => '#b45309', 'background' => '#fffbeb', 'tier' => 'gold',     'criteria_type' => 'score_perfect',    'criteria_value' => 100,  'sort_order' => 70, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Konsisten 3 Hari', 'slug' => 'streak-3',         'description' => 'Aktivitas belajar 3 hari berturut-turut',  'icon' => 'Flame',     'color' => '#92400e', 'background' => '#fef3c7', 'tier' => 'bronze',   'criteria_type' => 'streak_days',      'criteria_value' => 3,    'sort_order' => 80, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Seminggu Penuh',   'slug' => 'streak-7',         'description' => 'Aktivitas belajar 7 hari berturut-turut',  'icon' => 'Flame',     'color' => '#b45309', 'background' => '#fffbeb', 'tier' => 'gold',     'criteria_type' => 'streak_days',      'criteria_value' => 7,    'sort_order' => 90, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Sebulan Berturut', 'slug' => 'streak-30',        'description' => 'Aktivitas belajar 30 hari berturut-turut', 'icon' => 'Flame',     'color' => '#7c3aed', 'background' => '#f5f3ff', 'tier' => 'platinum', 'criteria_type' => 'streak_days',      'criteria_value' => 30,   'sort_order' => 100, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Kolektor Token',   'slug' => 'tokens-100',        'description' => 'Kumpulkan total 100 token',               'icon' => 'Coins',     'color' => '#92400e', 'background' => '#fef3c7', 'tier' => 'bronze',   'criteria_type' => 'tokens_earned',    'criteria_value' => 100,  'sort_order' => 110, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Sultan Token',     'slug' => 'tokens-1000',       'description' => 'Kumpulkan total 1.000 token',             'icon' => 'Coins',     'color' => '#b45309', 'background' => '#fffbeb', 'tier' => 'gold',     'criteria_type' => 'tokens_earned',    'criteria_value' => 1000, 'sort_order' => 120, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Pembeli Pertama',  'slug' => 'first-purchase',    'description' => 'Beli item pertama di Token Store',         'icon' => 'ShoppingBag','color' => '#6b7280','background' => '#f3f4f6', 'tier' => 'silver',  'criteria_type' => 'store_purchase',   'criteria_value' => 1,    'sort_order' => 130, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('user_streaks');
        Schema::dropIfExists('user_badges');
        Schema::dropIfExists('badges');
    }
};
