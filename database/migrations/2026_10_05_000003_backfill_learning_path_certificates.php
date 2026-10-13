<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $templateId = DB::table('certificate_templates')
            ->where('is_active', true)
            ->where('is_default', true)
            ->value('id');

        DB::table('learning_path_enrollments')
            ->whereNotNull('completed_at')
            ->orderBy('id')
            ->get(['learning_path_id', 'user_id', 'completed_at'])
            ->each(function ($enrollment) use ($templateId): void {
                $exists = DB::table('certificates')
                    ->where('user_id', $enrollment->user_id)
                    ->where('learning_path_id', $enrollment->learning_path_id)
                    ->exists();

                if ($exists) {
                    return;
                }

                $id = DB::table('certificates')->insertGetId([
                    'uuid' => (string) Str::uuid(),
                    'user_id' => $enrollment->user_id,
                    'training_event_id' => null,
                    'learning_path_id' => $enrollment->learning_path_id,
                    'certificate_template_id' => $templateId,
                    'certificate_number' => (string) Str::uuid(),
                    'verification_token' => Str::random(48),
                    'issued_at' => $enrollment->completed_at,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('certificates')
                    ->where('id', $id)
                    ->update(['certificate_number' => sprintf('CERT-LP-%s-%04d', now()->format('Y'), $id)]);
            });
    }

    public function down(): void
    {
        DB::table('certificates')
            ->whereNotNull('learning_path_id')
            ->delete();
    }
};
