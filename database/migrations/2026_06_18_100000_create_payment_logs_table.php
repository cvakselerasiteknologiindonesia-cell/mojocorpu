<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_logs', function (Blueprint $table) {
            $table->id();
            $table->string('order_id')->index();
            $table->string('transaction_id')->nullable()->index();
            $table->string('transaction_status');        // capture, settlement, pending, deny, cancel, expire, failure
            $table->string('payment_type')->nullable();  // credit_card, gopay, bank_transfer, etc.
            $table->unsignedBigInteger('gross_amount');
            $table->string('currency', 10)->default('IDR');
            $table->string('status_code', 10)->nullable();
            $table->string('fraud_status')->nullable();  // accept, challenge, deny
            $table->text('signature_key')->nullable();
            $table->boolean('signature_valid')->default(false);
            $table->boolean('amount_valid')->default(false);
            $table->boolean('is_duplicate')->default(false);
            $table->json('raw_payload')->nullable();     // full Midtrans notification body
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_logs');
    }
};
