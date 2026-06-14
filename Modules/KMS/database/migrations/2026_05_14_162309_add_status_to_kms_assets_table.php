<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('kms_assets', function (Blueprint $table) {
            $table->string('status', 20)->default('pending')->index()->after('visibility');
            $table->text('rejection_reason')->nullable()->after('status');
        });

        // Existing assets are considered already approved
        \Illuminate\Support\Facades\DB::table('kms_assets')->update(['status' => 'approved']);
    }

    public function down(): void
    {
        Schema::table('kms_assets', function (Blueprint $table) {
            $table->dropColumn(['status', 'rejection_reason']);
        });
    }
};
