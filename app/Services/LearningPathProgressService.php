<?php

namespace App\Services;

use App\Models\LearningPathEnrollment;
use App\Models\LearningPathStep;
use App\Models\LearningPathStepProgress;
use Illuminate\Support\Str;
use Modules\Certificate\Models\Certificate;
use Modules\Certificate\Models\CertificateTemplate;

class LearningPathProgressService
{
    public function completeReferencedSteps(string $type, string $referenceId, int $userId): void
    {
        $steps = LearningPathStep::query()
            ->where('type', $type)
            ->where('reference_id', $referenceId)
            ->get();

        foreach ($steps as $step) {
            $enrollment = LearningPathEnrollment::query()
                ->where('learning_path_id', $step->learning_path_id)
                ->where('user_id', $userId)
                ->first();

            if (! $enrollment) {
                continue;
            }

            LearningPathStepProgress::query()->firstOrCreate(
                ['enrollment_id' => $enrollment->id, 'step_id' => $step->id],
                ['completed_at' => now()]
            );

            $this->markEnrollmentCompleteIfReady($enrollment);
        }
    }

    public function markEnrollmentCompleteIfReady(LearningPathEnrollment $enrollment): void
    {
        if ($enrollment->completed_at) {
            return;
        }

        $requiredIds = LearningPathStep::query()
            ->where('learning_path_id', $enrollment->learning_path_id)
            ->where('is_required', true)
            ->pluck('id');

        if ($requiredIds->isEmpty()) {
            return;
        }

        $doneRequired = LearningPathStepProgress::query()
            ->where('enrollment_id', $enrollment->id)
            ->whereIn('step_id', $requiredIds)
            ->count();

        if ($doneRequired >= $requiredIds->count()) {
            $enrollment->update(['completed_at' => now()]);
            $this->issueLearningPathCertificate($enrollment->fresh());
        }
    }

    private function issueLearningPathCertificate(LearningPathEnrollment $enrollment): void
    {
        if (! $enrollment->learning_path_id) {
            return;
        }

        $enrollment->loadMissing('learningPath:id,certificate_template_id');

        $templateId = $enrollment->learningPath?->certificate_template_id
            ?: CertificateTemplate::query()
                ->where('is_active', true)
                ->where('is_default', true)
                ->value('id');

        $certificate = Certificate::query()->firstOrCreate(
            [
                'user_id' => $enrollment->user_id,
                'learning_path_id' => $enrollment->learning_path_id,
            ],
            [
                'training_event_id' => null,
                'certificate_template_id' => $templateId,
                'certificate_number' => (string) Str::uuid(),
                'issued_at' => now(),
            ]
        );

        if (Str::isUuid($certificate->certificate_number)) {
            $certificate->update([
                'certificate_number' => sprintf('CERT-LP-%s-%04d', now()->format('Y'), $certificate->id),
            ]);
        }
    }
}
