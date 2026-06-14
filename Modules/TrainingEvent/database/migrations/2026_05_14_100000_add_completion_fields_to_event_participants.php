<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_participants', function (Blueprint $table) {
            $table->string('completion_status')->default('pending')->after('status'); // pending | approved | rejected
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete()->after('completed_at');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->text('rejection_reason')->nullable()->after('approved_at');
        });
    }

    public function down(): void
    {
        Schema::table('event_participants', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['completion_status', 'approved_by', 'approved_at', 'rejection_reason']);
        });
    }
};
