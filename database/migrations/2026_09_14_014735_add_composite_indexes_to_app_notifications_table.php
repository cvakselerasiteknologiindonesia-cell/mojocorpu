<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add composite indexes to app_notifications for the two most common
     * query patterns:
     *
     *   1. (user_id, read_at)    — notification polling:
     *      WHERE user_id = ? AND read_at IS NULL
     *
     *   2. (user_id, created_at) — notification listing:
     *      WHERE user_id = ? ORDER BY created_at DESC
     *
     * Both patterns are used on every page load by authenticated users, so
     * these indexes have an outsized impact on overall response times.
     */
    public function up(): void
    {
        Schema::table('app_notifications', function (Blueprint $table): void {
            $table->index(['user_id', 'read_at'], 'app_notifications_user_read_index');
            $table->index(['user_id', 'created_at'], 'app_notifications_user_created_index');
        });
    }

    public function down(): void
    {
        Schema::table('app_notifications', function (Blueprint $table): void {
            $table->dropIndex('app_notifications_user_read_index');
            $table->dropIndex('app_notifications_user_created_index');
        });
    }
};
