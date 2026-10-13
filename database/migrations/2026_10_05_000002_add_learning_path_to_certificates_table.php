<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('certificates', function (Blueprint $table): void {
            $table->dropForeign(['training_event_id']);
        });

        DB::statement('ALTER TABLE certificates MODIFY training_event_id BIGINT UNSIGNED NULL');

        Schema::table('certificates', function (Blueprint $table): void {
            $table->foreign('training_event_id')
                ->references('id')
                ->on('training_events')
                ->cascadeOnDelete();
        });

        Schema::table('certificates', function (Blueprint $table): void {
            $table->foreignId('learning_path_id')
                ->nullable()
                ->after('training_event_id')
                ->constrained('learning_paths')
                ->cascadeOnDelete();

            $table->unique(['user_id', 'learning_path_id'], 'certificates_user_learning_path_unique');
        });
    }

    public function down(): void
    {
        Schema::table('certificates', function (Blueprint $table): void {
            $table->dropForeign(['training_event_id']);
        });

        DB::statement('ALTER TABLE certificates MODIFY training_event_id BIGINT UNSIGNED NOT NULL');

        Schema::table('certificates', function (Blueprint $table): void {
            $table->dropUnique('certificates_user_learning_path_unique');
            $table->dropConstrainedForeignId('learning_path_id');
            $table->foreign('training_event_id')
                ->references('id')
                ->on('training_events')
                ->cascadeOnDelete();
        });
    }
};
