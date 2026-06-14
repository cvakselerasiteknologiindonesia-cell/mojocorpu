<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            // Prevent duplicate credits for the same source event (replay / retry protection).
            // Only enforces uniqueness when both columns are non-null (MySQL partial index workaround).
            $table->unique(['reference_type', 'reference_id'], 'wallet_txn_ref_unique');
        });
    }

    public function down(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->dropUnique('wallet_txn_ref_unique');
        });
    }
};
