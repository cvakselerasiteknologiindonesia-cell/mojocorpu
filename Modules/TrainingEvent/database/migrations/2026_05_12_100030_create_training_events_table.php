<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('training_proposal_id')->nullable()->constrained('training_proposals')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('facilitator_id')->nullable()->constrained('facilitators')->nullOnDelete();
            $table->dateTime('start_date')->index();
            $table->dateTime('end_date')->index();
            $table->unsignedInteger('quota')->default(0);
            $table->string('status', 50)->default('draft')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_events');
    }
};