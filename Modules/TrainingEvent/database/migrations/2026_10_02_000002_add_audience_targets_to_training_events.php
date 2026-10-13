<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_events', function (Blueprint $table): void {
            $table->boolean('target_all_opds')->default(false)->after('certificate_template_id');
        });

        Schema::create('training_event_target_opds', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('training_event_id')->constrained('training_events')->cascadeOnDelete();
            $table->foreignId('opd_id')->constrained('opds')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['training_event_id', 'opd_id'], 'tet_opd_unique');
        });

        Schema::create('training_event_target_users', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('training_event_id')->constrained('training_events')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['training_event_id', 'user_id'], 'tet_user_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_event_target_users');
        Schema::dropIfExists('training_event_target_opds');

        Schema::table('training_events', function (Blueprint $table): void {
            $table->dropColumn('target_all_opds');
        });
    }
};
