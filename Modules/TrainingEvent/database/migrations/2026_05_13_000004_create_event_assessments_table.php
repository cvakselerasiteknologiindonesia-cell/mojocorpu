<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_event_id')->constrained('training_events')->cascadeOnDelete();
            $table->string('type')->default('pre_test'); // pre_test | post_test
            $table->string('title');
            $table->text('instructions')->nullable();
            $table->unsignedTinyInteger('passing_score')->default(70); // 0-100
            $table->unsignedSmallInteger('time_limit_minutes')->nullable();
            $table->string('status')->default('draft'); // draft | published
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_assessments');
    }
};
