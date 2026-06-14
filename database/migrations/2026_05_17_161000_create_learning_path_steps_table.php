<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_path_steps', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->foreignId('learning_path_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('order')->default(1);
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('type', ['module', 'training_event', 'material'])->default('module');
            $table->string('reference_id')->nullable();
            $table->boolean('is_required')->default(true);
            $table->unsignedSmallInteger('estimated_minutes')->default(60);
            $table->timestamps();

            $table->index(['learning_path_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_path_steps');
    }
};
