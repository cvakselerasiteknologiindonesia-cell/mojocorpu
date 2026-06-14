<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facilitators', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('facilitator_type', ['internal', 'external'])->index();
            $table->string('institution')->nullable();
            $table->string('expertise')->nullable();
            $table->text('bio')->nullable();
            $table->string('cv_file')->nullable();
            $table->string('status', 50)->default('active')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facilitators');
    }
};