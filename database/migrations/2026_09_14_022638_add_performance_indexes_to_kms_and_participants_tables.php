<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add performance indexes for two frequently-filtered columns:
     *
     *  1. kms_assets.status
     *     KMSRepository always filters by status ('pending','approved','rejected').
     *     The column was added in a later alter migration without an index.
     *     Guard: some environments already have this index — skip if present.
     *
     *  2. event_participants.(training_event_id, completion_status)
     *     Dashboard and completion controllers query:
     *     WHERE training_event_id = ? AND completion_status = 'approved'
     *     A composite index covers both predicates in one scan.
     */
    public function up(): void
    {
        // Guard: only add if the index does not already exist.
        if (! $this->indexExists('kms_assets', 'kms_assets_status_index')) {
            Schema::table('kms_assets', function (Blueprint $table): void {
                $table->index('status', 'kms_assets_status_index');
            });
        }

        Schema::table('event_participants', function (Blueprint $table): void {
            $table->index(
                ['training_event_id', 'completion_status'],
                'event_participants_event_completion_index'
            );
        });
    }

    public function down(): void
    {
        if ($this->indexExists('kms_assets', 'kms_assets_status_index')) {
            Schema::table('kms_assets', function (Blueprint $table): void {
                $table->dropIndex('kms_assets_status_index');
            });
        }

        Schema::table('event_participants', function (Blueprint $table): void {
            $table->dropIndex('event_participants_event_completion_index');
        });
    }

    private function indexExists(string $table, string $indexName): bool
    {
        return (bool) DB::select(
            'SELECT 1 FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND INDEX_NAME  = ?
             LIMIT 1',
            [$table, $indexName]
        );
    }
};
