<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_event_id')->constrained('training_events')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('order_id')->unique()->index();
            $table->unsignedBigInteger('amount');
            $table->string('status', 20)->default('pending'); // pending, paid, expired, failed
            $table->string('snap_token')->nullable();
            $table->string('payment_type', 50)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->unique(['training_event_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_payments');
    }
};
