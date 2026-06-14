<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_event_facilitators', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_event_id')->constrained('training_events')->cascadeOnDelete();
            $table->foreignId('facilitator_id')->constrained('facilitators')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['training_event_id', 'facilitator_id'], 'tef_event_facilitator_unique');
        });

        // Migrate existing single facilitator_id data into the pivot table
        \DB::statement('
            INSERT INTO training_event_facilitators (training_event_id, facilitator_id, created_at, updated_at)
            SELECT id, facilitator_id, NOW(), NOW()
            FROM training_events
            WHERE facilitator_id IS NOT NULL
        ');
    }

    public function down(): void
    {
        Schema::dropIfExists('training_event_facilitators');
    }
};
