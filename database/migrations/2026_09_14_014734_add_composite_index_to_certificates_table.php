<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add a composite unique index on (user_id, training_event_id) to the
     * certificates table.
     *
     * Benefits:
     *   - Makes Certificate::where('user_id', $uid)->where('training_event_id', $eid)->exists()
     *     an index-only lookup instead of a full-table scan.
     *   - Enforces the business rule that a user can only hold one certificate
     *     per training event at the database level.
     */
    public function up(): void
    {
        Schema::table('certificates', function (Blueprint $table): void {
            // Drop individual FK indexes first if they conflict with the new unique.
            // InnoDB auto-creates FK indexes; the new unique index covers both columns
            // so the individual index on user_id is redundant after this migration.
            $table->unique(['user_id', 'training_event_id'], 'certificates_user_event_unique');
        });
    }

    public function down(): void
    {
        Schema::table('certificates', function (Blueprint $table): void {
            $table->dropUnique('certificates_user_event_unique');
        });
    }
};
