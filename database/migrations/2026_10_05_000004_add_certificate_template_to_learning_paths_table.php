<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learning_paths', function (Blueprint $table): void {
            $table->foreignId('certificate_template_id')
                ->nullable()
                ->after('is_sequential')
                ->constrained('certificate_templates')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('learning_paths', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('certificate_template_id');
        });
    }
};
