<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kms_assets', function (Blueprint $table) {
            $table->string('internal_scope', 20)->default('all')->after('visibility')->index();
        });

        Schema::create('kms_asset_opd', function (Blueprint $table) {
            $table->foreignId('kms_asset_id')->constrained('kms_assets')->cascadeOnDelete();
            $table->foreignId('opd_id')->constrained('opds')->cascadeOnDelete();
            $table->timestamps();

            $table->primary(['kms_asset_id', 'opd_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kms_asset_opd');

        Schema::table('kms_assets', function (Blueprint $table) {
            $table->dropColumn('internal_scope');
        });
    }
};
