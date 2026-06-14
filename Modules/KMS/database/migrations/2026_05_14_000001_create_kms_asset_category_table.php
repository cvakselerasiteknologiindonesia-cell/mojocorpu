<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kms_asset_category', function (Blueprint $table) {
            $table->foreignId('kms_asset_id')->constrained('kms_assets')->cascadeOnDelete();
            $table->foreignId('kms_category_id')->constrained('kms_categories')->cascadeOnDelete();
            $table->primary(['kms_asset_id', 'kms_category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kms_asset_category');
    }
};
