<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suspicious_requests', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address', 45);
            $table->string('method', 10);
            $table->string('path', 500);
            $table->text('user_agent')->nullable();
            $table->string('attack_type');
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->string('pattern_matched', 255)->nullable();
            $table->text('payload_snippet')->nullable();
            $table->timestamps();

            $table->index(['ip_address', 'created_at']);
            $table->index(['attack_type', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suspicious_requests');
    }
};
