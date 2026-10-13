<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kms_asset_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kms_asset_id')->constrained('kms_assets')->cascadeOnDelete();
            $table->string('file_path');
            $table->string('source_type', 20)->default('url')->index();
            $table->string('original_name')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['kms_asset_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kms_asset_sources');
    }
};
