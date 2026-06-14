<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('certificates', function (Blueprint $table) {
            $table->foreignId('certificate_template_id')->nullable()->after('training_event_id')->constrained('certificate_templates')->nullOnDelete();
            $table->string('verification_token', 80)->nullable()->unique()->after('certificate_number');
        });

        DB::table('certificates')
            ->whereNull('verification_token')
            ->orderBy('id')
            ->get(['id'])
            ->each(function ($certificate): void {
                DB::table('certificates')
                    ->where('id', $certificate->id)
                    ->update(['verification_token' => (string) Illuminate\Support\Str::uuid()]);
            });
    }

    public function down(): void
    {
        Schema::table('certificates', function (Blueprint $table) {
            $table->dropConstrainedForeignId('certificate_template_id');
            $table->dropColumn('verification_token');
        });
    }
};
