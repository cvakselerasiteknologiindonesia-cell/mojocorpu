<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_proposals', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('opd_id')->index();
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('recommendation')->nullable();
            $table->foreignId('proposed_by')->constrained('users')->cascadeOnDelete();
            $table->string('status', 50)->default('submitted')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_proposals');
    }
};