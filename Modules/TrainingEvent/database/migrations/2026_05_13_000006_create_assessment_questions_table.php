<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_assessment_id')->constrained('event_assessments')->cascadeOnDelete();
            $table->text('question');
            $table->string('type')->default('multiple_choice'); // multiple_choice | true_false | essay
            $table->json('options')->nullable();                 // array of option strings
            $table->string('correct_answer')->nullable();        // option index (MC/TF) or null (essay)
            $table->unsignedSmallInteger('points')->default(1);
            $table->unsignedSmallInteger('order')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_questions');
    }
};
