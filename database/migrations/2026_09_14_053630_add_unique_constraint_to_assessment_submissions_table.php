<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add a unique constraint on (event_assessment_id, user_id) in
     * assessment_submissions.
     *
     * Without this constraint, a race condition in submitAssessment()
     * allows two concurrent requests from the same user (e.g. double-tap)
     * to both pass the exists() check and both create a submission row.
     * The DB-level unique constraint is the last line of defence.
     */
    public function up(): void
    {
        Schema::table('assessment_submissions', function (Blueprint $table): void {
            $table->unique(
                ['event_assessment_id', 'user_id'],
                'assessment_submissions_assessment_user_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('assessment_submissions', function (Blueprint $table): void {
            $table->dropUnique('assessment_submissions_assessment_user_unique');
        });
    }
};
