<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_path_step_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained('learning_path_enrollments')->cascadeOnDelete();
            $table->foreignId('step_id')->constrained('learning_path_steps')->cascadeOnDelete();
            $table->timestamp('completed_at')->useCurrent();
            $table->timestamps();

            $table->unique(['enrollment_id', 'step_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_path_step_progress');
    }
};
