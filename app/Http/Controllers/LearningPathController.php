<?php

namespace App\Http\Controllers;

use App\Models\LearningPath;
use App\Models\LearningPathEnrollment;
use App\Models\LearningPathStep;
use App\Models\LearningPathStepProgress;
use App\Services\LearningPathProgressService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Modules\Certificate\Models\Certificate;
use Modules\Certificate\Models\CertificateTemplate;
use Modules\LMS\Models\LearningMaterial;
use Modules\LMS\Models\LearningMaterialView;
use Modules\TrainingEvent\Models\AssessmentSubmission;
use Modules\TrainingEvent\Models\EventAssessment;
use Modules\TrainingEvent\Models\EventMaterial;
use Modules\TrainingEvent\Models\EventParticipant;
use Modules\TrainingEvent\Models\TrainingEvent;

class LearningPathController extends Controller
{
    // ── Admin ──────────────────────────────────────────────────────────────────

    public function adminIndex(Request $request)
    {
        try {
            $query = LearningPath::withCount(['steps', 'enrollments'])
                ->with(['creator:id,name', 'certificateTemplate:id,name'])
                ->orderByDesc('created_at');

            if ($request->filled('status')) {
                $query->where('status', $request->input('status'));
            }
            if ($request->filled('search')) {
                $query->where('title', 'like', '%'.$request->input('search').'%');
            }

            return ApiResponse::success('OK', $query->paginate($request->integer('per_page', 15)));
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'           => 'required|string|max:255',
            'description'     => 'nullable|string',
            'thumbnail_url'   => 'nullable|url|max:1000',
            'status'          => 'in:draft,published',
            'target_role'     => 'nullable|string|max:100',
            'estimated_hours' => 'integer|min:0|max:9999',
            'is_sequential'   => 'boolean',
            'certificate_template_id' => [
                'nullable',
                'integer',
                Rule::exists('certificate_templates', 'id')->where('is_active', true),
            ],
        ]);

        try {
            if (($validated['status'] ?? null) === 'published') {
                $this->validatePublishReadiness(null, []);
            }

            $path = LearningPath::create([...$validated, 'created_by' => $request->user()->id]);

            return ApiResponse::success('Learning path created', $path->load('creator:id,name'), 201);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function adminShow(string $uuid)
    {
        try {
            $path = LearningPath::where('uuid', $uuid)
                ->withCount('enrollments')
                ->with(['steps', 'creator:id,name', 'certificateTemplate:id,name'])
                ->firstOrFail();

            return ApiResponse::success('OK', $path);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function referenceOptions(Request $request)
    {
        $type = $request->input('type');
        $search = trim((string) $request->input('search', ''));

        try {
            $items = match ($type) {
                'training_event' => TrainingEvent::query()
                    ->select('uuid', 'title', 'status', 'start_date', 'end_date')
                    ->when($search !== '', fn ($q) => $q->where('title', 'like', "%{$search}%"))
                    ->latest('start_date')
                    ->limit(30)
                    ->get()
                    ->map(fn ($event) => [
                        'id' => $event->uuid,
                        'label' => $event->title,
                        'meta' => trim(implode(' · ', array_filter([
                            $event->status,
                            $event->start_date?->format('d M Y'),
                        ]))),
                    ]),
                'material' => $this->materialReferenceOptions($search),
                'quiz' => EventAssessment::query()
                    ->with('event:id,title')
                    ->select('id', 'training_event_id', 'type', 'title', 'status', 'passing_score')
                    ->when($search !== '', fn ($q) => $q->where('title', 'like', "%{$search}%"))
                    ->latest()
                    ->limit(30)
                    ->get()
                    ->map(fn ($assessment) => [
                        'id' => (string) $assessment->id,
                        'label' => $assessment->title,
                        'meta' => trim(implode(' · ', array_filter([
                            $assessment->type,
                            $assessment->status,
                            'KKM '.$assessment->passing_score,
                            $assessment->event?->title,
                        ]))),
                    ]),
                default => collect(),
            };

            return ApiResponse::success('OK', $items);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function update(Request $request, string $uuid)
    {
        $validated = $request->validate([
            'title'           => 'string|max:255',
            'description'     => 'nullable|string',
            'thumbnail_url'   => 'nullable|url|max:1000',
            'status'          => 'in:draft,published',
            'target_role'     => 'nullable|string|max:100',
            'estimated_hours' => 'integer|min:0|max:9999',
            'is_sequential'   => 'boolean',
            'certificate_template_id' => [
                'nullable',
                'integer',
                Rule::exists('certificate_templates', 'id')->where('is_active', true),
            ],
        ]);

        try {
            $path = LearningPath::where('uuid', $uuid)->firstOrFail();

            if (array_key_exists('certificate_template_id', $validated)) {
                $path->certificate_template_id = $validated['certificate_template_id'];
            }

            if (($validated['status'] ?? null) === 'published') {
                $this->validatePublishReadiness($path);
            }

            $path->update($validated);
            if (array_key_exists('certificate_template_id', $validated)) {
                $this->syncIssuedLearningPathCertificateTemplates($path->fresh());
            }

            return ApiResponse::success('Updated', $path->load(['creator:id,name', 'certificateTemplate:id,name']));
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function destroy(string $uuid)
    {
        try {
            LearningPath::where('uuid', $uuid)->firstOrFail()->delete();

            return ApiResponse::success('Deleted');
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function duplicate(string $uuid)
    {
        try {
            $original = LearningPath::where('uuid', $uuid)->with('steps')->firstOrFail();

            $copy = $original->replicate(['uuid', 'slug']);
            $copy->title  = 'Copy of '.$original->title;
            $copy->status = 'draft';
            $copy->save();

            foreach ($original->steps as $step) {
                $copy->steps()->create($step->only([
                    'title', 'description', 'type', 'reference_id',
                    'is_required', 'estimated_minutes', 'order',
                ]));
            }

            return ApiResponse::success('Duplicated', $copy->load('creator:id,name')->loadCount(['steps', 'enrollments']), 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function updateSteps(Request $request, string $uuid)
    {
        $request->validate([
            'steps'                     => 'array',
            'steps.*.title'             => 'required|string|max:255',
            'steps.*.description'       => 'nullable|string',
            'steps.*.type'              => 'required|in:module,training_event,material,quiz',
            'steps.*.reference_id'      => 'nullable|string|max:255',
            'steps.*.is_required'       => 'boolean',
            'steps.*.estimated_minutes' => 'integer|min:1|max:9999',
        ]);

        try {
            $path = LearningPath::where('uuid', $uuid)->firstOrFail();
            $this->validateStepReferences($request->input('steps', []));
            if ($path->status === 'published') {
                $this->validatePublishReadiness($path, $request->input('steps', []));
            }

            DB::transaction(function () use ($path, $request): void {
                $path->steps()->delete();
                foreach ($request->input('steps', []) as $i => $step) {
                    $path->steps()->create([...$step, 'order' => $i + 1]);
                }
            });

            return ApiResponse::success('Steps saved', $path->fresh('steps'));
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    // ── Participant ────────────────────────────────────────────────────────────

    private function materialReferenceOptions(string $search)
    {
        $lmsMaterials = LearningMaterial::query()
            ->with('event:id,title')
            ->select('id', 'uuid', 'training_event_id', 'title', 'material_type', 'is_published')
            ->when($search !== '', fn ($q) => $q->where('title', 'like', "%{$search}%"))
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn ($material) => [
                'id' => $material->uuid,
                'label' => $material->title,
                'meta' => trim(implode(' · ', array_filter([
                    'LMS',
                    $material->material_type,
                    $material->is_published ? 'Terbit' : 'Draf',
                    $material->event?->title,
                ]))),
            ]);

        $eventMaterials = EventMaterial::query()
            ->with('event:id,title')
            ->select('id', 'training_event_id', 'title', 'type', 'url', 'file_path')
            ->when($search !== '', fn ($q) => $q->where('title', 'like', "%{$search}%"))
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn ($material) => [
                'id' => $this->eventMaterialReference($material->id),
                'label' => $material->title,
                'meta' => trim(implode(' · ', array_filter([
                    'Event',
                    $material->type,
                    ($material->url || $material->file_path) ? 'Siap' : 'Kosong',
                    $material->event?->title,
                ]))),
            ]);

        return $lmsMaterials
            ->concat($eventMaterials)
            ->values()
            ->take(40);
    }

    public function publicIndex(Request $request)
    {
        try {
            $userId = $request->user()->id;

            $paths = LearningPath::where('status', 'published')
                ->withCount(['steps', 'enrollments'])
                ->with('creator:id,name')
                ->orderByDesc('created_at')
                ->get()
                ->map(function ($path) use ($userId) {
                    $enrollment = LearningPathEnrollment::where('learning_path_id', $path->id)
                        ->where('user_id', $userId)
                        ->first();
                    $certificate = $enrollment?->completed_at
                        ? $this->learningPathCertificate($path->id, $userId)
                        : null;

                    $progress = 0;
                    if ($enrollment && $path->steps_count > 0) {
                        $path->loadMissing('steps');
                        $this->syncExternalStepProgress($path, $enrollment, $userId);
                        $enrollment->refresh();
                        $done     = LearningPathStepProgress::where('enrollment_id', $enrollment->id)->count();
                        $progress = (int) round(($done / $path->steps_count) * 100);
                    }

                    return array_merge($path->toArray(), [
                        'enrolled'  => $enrollment !== null,
                        'completed' => $enrollment?->completed_at !== null,
                        'progress'  => $progress,
                        'certificate' => $certificate,
                    ]);
                });

            return ApiResponse::success('OK', $paths);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function publicShow(Request $request, string $uuid)
    {
        try {
            $path = LearningPath::where('uuid', $uuid)
                ->where('status', 'published')
                ->with(['steps', 'creator:id,name'])
                ->firstOrFail();

            $userId     = $request->user()->id;
            $enrollment = LearningPathEnrollment::where('learning_path_id', $path->id)
                ->where('user_id', $userId)
                ->first();

            $completedStepIds = $enrollment
                ? LearningPathStepProgress::where('enrollment_id', $enrollment->id)->pluck('step_id')->toArray()
                : [];

            if ($enrollment) {
                $this->syncExternalStepProgress($path, $enrollment, $userId);
                $enrollment->refresh();
                $completedStepIds = LearningPathStepProgress::where('enrollment_id', $enrollment->id)->pluck('step_id')->toArray();
            }

            $certificate = $enrollment?->completed_at
                ? $this->learningPathCertificate($path->id, $userId)
                : null;

            $stepReferences = $this->stepReferencePayloads($path->steps);

            $steps = $path->steps->values()->map(function ($step, $i) use ($completedStepIds, $enrollment, $path, $stepReferences) {
                $completed = in_array($step->id, $completedStepIds);
                $available = true;

                if ($path->is_sequential) {
                    if (! $enrollment) {
                        $available = $i === 0;
                    } elseif ($i > 0) {
                        $available = in_array($path->steps[$i - 1]->id, $completedStepIds);
                    }
                }

                $referenceKey = $this->stepReferenceKey($step->type, $step->reference_id);

                return array_merge($step->toArray(), [
                    'completed' => $completed,
                    'available' => $available,
                    'reference' => $stepReferences[$referenceKey] ?? null,
                ]);
            });

            $totalSteps = $path->steps->count();
            $progress   = ($enrollment && $totalSteps > 0)
                ? (int) round((count($completedStepIds) / $totalSteps) * 100)
                : 0;

            return ApiResponse::success('OK', array_merge($path->toArray(), [
                'steps'       => $steps,
                'enrolled'    => $enrollment !== null,
                'completed'   => $enrollment?->completed_at !== null,
                'progress'    => $progress,
                'enrolled_at' => $enrollment?->enrolled_at,
                'certificate'  => $certificate,
            ]));
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    private function validateStepReferences(array $steps): void
    {
        foreach ($steps as $index => $step) {
            $type = $step['type'] ?? 'module';
            $reference = $step['reference_id'] ?? null;

            if ($type === 'module') {
                continue;
            }

            if (! filled($reference)) {
                throw ValidationException::withMessages([
                    "steps.{$index}.reference_id" => 'Referensi wajib dipilih untuk langkah '.($index + 1).'.',
                ]);
            }

            $exists = match ($type) {
                'training_event' => TrainingEvent::where('uuid', $reference)->exists(),
                'material' => $this->materialReferenceExists($reference),
                'quiz' => EventAssessment::whereKey($reference)->exists(),
                default => false,
            };

            if (! $exists) {
                throw ValidationException::withMessages([
                    "steps.{$index}.reference_id" => 'Referensi langkah '.($index + 1).' tidak valid.',
                ]);
            }
        }
    }

    private function validatePublishReadiness(?LearningPath $path, ?array $pendingSteps = null): void
    {
        $steps = $pendingSteps ?? $path?->steps()->orderBy('order')->get()->map(fn ($step) => $step->toArray())->all() ?? [];
        $messages = [];

        if (count($steps) === 0) {
            $messages['status'][] = 'Kurikulum belum bisa diterbitkan karena belum memiliki langkah belajar.';
        }

        $requiredCount = collect($steps)->where('is_required', true)->count();
        if ($requiredCount === 0) {
            $messages['status'][] = 'Kurikulum harus memiliki minimal 1 langkah wajib sebelum diterbitkan.';
        }

        if ($path?->certificate_template_id) {
            $templateActive = CertificateTemplate::query()
                ->whereKey($path->certificate_template_id)
                ->where('is_active', true)
                ->exists();

            if (! $templateActive) {
                $messages['certificate_template_id'][] = 'Template sertifikat kurikulum tidak aktif.';
            }
        }

        foreach (array_values($steps) as $index => $step) {
            $label = 'Langkah '.($index + 1);
            $type = $step['type'] ?? 'module';
            $reference = $step['reference_id'] ?? null;

            if ($type === 'module') {
                continue;
            }

            if (! filled($reference)) {
                $messages["steps.{$index}.reference_id"][] = "{$label} belum memilih referensi.";
                continue;
            }

            match ($type) {
                'training_event' => $this->validatePublishEvent($reference, $label, $messages, $index),
                'material' => $this->validatePublishMaterial($reference, $label, $messages, $index),
                'quiz' => $this->validatePublishQuiz($reference, $label, $messages, $index),
                default => $messages["steps.{$index}.type"][] = "{$label} memiliki tipe yang tidak didukung.",
            };
        }

        if (! empty($messages)) {
            throw ValidationException::withMessages($messages);
        }
    }

    private function validatePublishEvent(string $uuid, string $label, array &$messages, int $index): void
    {
        $event = TrainingEvent::where('uuid', $uuid)->first();

        if (! $event) {
            $messages["steps.{$index}.reference_id"][] = "{$label} memilih event yang tidak valid.";
            return;
        }

        if (! in_array($event->status, ['active', 'ongoing', 'scheduled', 'completed'], true)) {
            $messages["steps.{$index}.reference_id"][] = "{$label} memakai event yang belum aktif/siap.";
        }
    }

    private function validatePublishMaterial(string $reference, string $label, array &$messages, int $index): void
    {
        if ($this->isEventMaterialReference($reference)) {
            $material = EventMaterial::find($this->eventMaterialId($reference));

            if (! $material) {
                $messages["steps.{$index}.reference_id"][] = "{$label} memilih materi event yang tidak valid.";
                return;
            }

            if (! $material->url && ! $material->file_path) {
                $messages["steps.{$index}.reference_id"][] = "{$label} memakai materi event tanpa file atau tautan.";
            }

            return;
        }

        $material = LearningMaterial::where('uuid', $reference)->first();

        if (! $material) {
            $messages["steps.{$index}.reference_id"][] = "{$label} memilih materi yang tidak valid.";
            return;
        }

        if (! $material->is_published) {
            $messages["steps.{$index}.reference_id"][] = "{$label} memakai materi yang masih draf.";
        }

        if (! $material->external_url && ! $material->file_path) {
            $messages["steps.{$index}.reference_id"][] = "{$label} memakai materi tanpa file atau tautan.";
        }
    }

    private function validatePublishQuiz(string $id, string $label, array &$messages, int $index): void
    {
        $assessment = EventAssessment::withCount('questions')->find($id);

        if (! $assessment) {
            $messages["steps.{$index}.reference_id"][] = "{$label} memilih kuis yang tidak valid.";
            return;
        }

        if ($assessment->status !== 'published') {
            $messages["steps.{$index}.reference_id"][] = "{$label} memakai kuis yang belum terbit.";
        }

        if ((int) $assessment->questions_count === 0) {
            $messages["steps.{$index}.reference_id"][] = "{$label} memakai kuis tanpa soal.";
        }
    }

    private function syncExternalStepProgress(LearningPath $path, LearningPathEnrollment $enrollment, int $userId): void
    {
        $path->loadMissing('steps');

        foreach ($path->steps as $step) {
            if (LearningPathStepProgress::where('enrollment_id', $enrollment->id)->where('step_id', $step->id)->exists()) {
                continue;
            }

            $completed = match ($step->type) {
                'training_event' => $this->isTrainingEventCompleted($step->reference_id, $userId),
                'material' => $this->isLearningMaterialViewed($step->reference_id, $userId),
                'quiz' => $this->isAssessmentPassed($step->reference_id, $userId),
                default => false,
            };

            if ($completed) {
                LearningPathStepProgress::create([
                    'enrollment_id' => $enrollment->id,
                    'step_id' => $step->id,
                    'completed_at' => now(),
                ]);
            }
        }

        $this->markEnrollmentCompleteIfReady($path, $enrollment);
    }

    private function stepReferencePayloads($steps): array
    {
        $payloads = [];

        $eventUuids = $steps
            ->where('type', 'training_event')
            ->pluck('reference_id')
            ->filter()
            ->unique()
            ->values();
        if ($eventUuids->isNotEmpty()) {
            TrainingEvent::query()
                ->whereIn('uuid', $eventUuids)
                ->get(['id', 'uuid', 'title', 'status', 'start_date', 'end_date'])
                ->each(function (TrainingEvent $event) use (&$payloads): void {
                    $payloads[$this->stepReferenceKey('training_event', $event->uuid)] = [
                        'id' => $event->uuid,
                        'title' => $event->title,
                        'status' => $event->status,
                        'meta' => trim(implode(' · ', array_filter([
                            $event->status,
                            $event->start_date?->format('d M Y'),
                        ]))),
                        'action_url' => "/training-events/{$event->uuid}/learn",
                        'action_label' => 'Buka event',
                    ];
                });
        }

        $materialRefs = $steps
            ->where('type', 'material')
            ->pluck('reference_id')
            ->filter()
            ->unique()
            ->values();
        $materialUuids = $materialRefs
            ->reject(fn ($reference) => $this->isEventMaterialReference($reference))
            ->values();
        $eventMaterialIds = $materialRefs
            ->filter(fn ($reference) => $this->isEventMaterialReference($reference))
            ->map(fn ($reference) => $this->eventMaterialId($reference))
            ->filter()
            ->values();

        if ($materialUuids->isNotEmpty()) {
            LearningMaterial::query()
                ->with('event:id,uuid,title')
                ->whereIn('uuid', $materialUuids)
                ->get(['id', 'uuid', 'training_event_id', 'title', 'material_type', 'file_path', 'external_url', 'is_published'])
                ->each(function (LearningMaterial $material) use (&$payloads): void {
                    $payloads[$this->stepReferenceKey('material', $material->uuid)] = [
                        'id' => $material->uuid,
                        'title' => $material->title,
                        'status' => $material->is_published ? 'published' : 'draft',
                        'meta' => trim(implode(' · ', array_filter([
                            'LMS',
                            $material->material_type,
                            $material->event?->title,
                        ]))),
                        'action_url' => $material->external_url ?: $material->file_url,
                        'track_url' => "/lms/{$material->uuid}/track-open",
                        'action_label' => $material->external_url ? 'Buka tautan' : 'Buka materi',
                        'event_uuid' => $material->event?->uuid,
                    ];
                });
        }

        if ($eventMaterialIds->isNotEmpty()) {
            EventMaterial::query()
                ->with('event:id,uuid,title')
                ->whereIn('id', $eventMaterialIds)
                ->get(['id', 'training_event_id', 'title', 'type', 'url', 'file_path'])
                ->each(function (EventMaterial $material) use (&$payloads): void {
                    $reference = $this->eventMaterialReference($material->id);

                    $payloads[$this->stepReferenceKey('material', $reference)] = [
                        'id' => $reference,
                        'title' => $material->title,
                        'status' => 'published',
                        'meta' => trim(implode(' · ', array_filter([
                            'Event',
                            $material->type,
                            $material->event?->title,
                        ]))),
                        'action_url' => $material->url ?: $material->file_url,
                        'track_url' => "/learning-paths/materials/event_material/{$material->id}/track-open",
                        'action_label' => $material->url ? 'Buka tautan' : 'Buka materi',
                        'event_uuid' => $material->event?->uuid,
                    ];
                });
        }

        $assessmentIds = $steps
            ->where('type', 'quiz')
            ->pluck('reference_id')
            ->filter()
            ->unique()
            ->values();
        if ($assessmentIds->isNotEmpty()) {
            EventAssessment::query()
                ->with('event:id,uuid,title')
                ->whereIn('id', $assessmentIds)
                ->get(['id', 'training_event_id', 'type', 'title', 'status', 'passing_score'])
                ->each(function (EventAssessment $assessment) use (&$payloads): void {
                    $eventUuid = $assessment->event?->uuid;
                    $payloads[$this->stepReferenceKey('quiz', (string) $assessment->id)] = [
                        'id' => (string) $assessment->id,
                        'title' => $assessment->title,
                        'status' => $assessment->status,
                        'meta' => trim(implode(' · ', array_filter([
                            $assessment->type,
                            $assessment->status,
                            'KKM '.$assessment->passing_score,
                            $assessment->event?->title,
                        ]))),
                        'action_url' => $eventUuid ? "/training-events/{$eventUuid}/learn?assessment={$assessment->id}" : null,
                        'action_label' => 'Kerjakan kuis',
                        'event_uuid' => $eventUuid,
                    ];
                });
        }

        return $payloads;
    }

    private function stepReferenceKey(string $type, ?string $referenceId): string
    {
        return $type.':'.(string) $referenceId;
    }

    private function materialReferenceExists(?string $reference): bool
    {
        if (! filled($reference)) {
            return false;
        }

        if ($this->isEventMaterialReference($reference)) {
            return EventMaterial::whereKey($this->eventMaterialId($reference))->exists();
        }

        return LearningMaterial::where('uuid', $reference)->exists();
    }

    private function learningPathCertificate(int $learningPathId, int $userId): ?array
    {
        $certificate = Certificate::query()
            ->where('learning_path_id', $learningPathId)
            ->where('user_id', $userId)
            ->first(['uuid', 'certificate_number', 'verification_token', 'issued_at']);

        if (! $certificate) {
            return null;
        }

        return [
            'uuid' => $certificate->uuid,
            'certificate_number' => $certificate->certificate_number,
            'verification_token' => $certificate->verification_token,
            'issued_at' => $certificate->issued_at?->toDateString(),
            'verification_url' => $certificate->verification_token ? url('/api/certificates/verify/'.$certificate->verification_token) : null,
        ];
    }

    private function syncIssuedLearningPathCertificateTemplates(LearningPath $path): void
    {
        $templateId = $path->certificate_template_id
            ?: CertificateTemplate::query()
                ->where('is_active', true)
                ->where('is_default', true)
                ->value('id');

        Certificate::query()
            ->where('learning_path_id', $path->id)
            ->update(['certificate_template_id' => $templateId]);
    }

    private function isEventMaterialReference(?string $reference): bool
    {
        return str_starts_with((string) $reference, 'event_material:');
    }

    private function eventMaterialReference(int $id): string
    {
        return "event_material:{$id}";
    }

    private function eventMaterialId(string $reference): ?int
    {
        $id = substr($reference, strlen('event_material:'));

        return ctype_digit($id) ? (int) $id : null;
    }

    private function isTrainingEventCompleted(?string $eventUuid, int $userId): bool
    {
        if (! filled($eventUuid)) {
            return false;
        }

        return EventParticipant::query()
            ->where('user_id', $userId)
            ->where(function ($query): void {
                $query->whereIn('completion_status', ['completed', 'approved'])
                    ->orWhereNotNull('completed_at');
            })
            ->whereHas('event', fn ($event) => $event->where('uuid', $eventUuid))
            ->exists();
    }

    private function isAssessmentPassed(?string $assessmentId, int $userId): bool
    {
        if (! filled($assessmentId)) {
            return false;
        }

        return AssessmentSubmission::query()
            ->where('event_assessment_id', $assessmentId)
            ->where('user_id', $userId)
            ->where('is_passed', true)
            ->exists();
    }

    private function isLearningMaterialViewed(?string $materialUuid, int $userId): bool
    {
        if (! filled($materialUuid)) {
            return false;
        }

        return LearningMaterialView::query()
            ->where('user_id', $userId)
            ->whereHas('material', fn ($material) => $material->where('uuid', $materialUuid))
            ->exists();
    }

    private function markEnrollmentCompleteIfReady(LearningPath $path, LearningPathEnrollment $enrollment): void
    {
        app(LearningPathProgressService::class)->markEnrollmentCompleteIfReady($enrollment);
    }

    public function enroll(Request $request, string $uuid)
    {
        try {
            $path = LearningPath::where('uuid', $uuid)->where('status', 'published')->firstOrFail();

            $enrollment = LearningPathEnrollment::firstOrCreate(
                ['learning_path_id' => $path->id, 'user_id' => $request->user()->id],
                ['enrolled_at' => now()]
            );

            $this->enrollLinkedTrainingEvents($path, $request->user()->id);
            $this->syncExternalStepProgress($path->loadMissing('steps'), $enrollment, $request->user()->id);

            return ApiResponse::success('Enrolled', $enrollment, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function trackEventMaterialOpen(Request $request, string $source, string $id, LearningPathProgressService $progressService)
    {
        try {
            if ($source !== 'event_material' || ! ctype_digit($id)) {
                return ApiResponse::error('Sumber materi tidak valid.', 422);
            }

            $material = EventMaterial::with('event:id,uuid,title')
                ->findOrFail((int) $id);

            $user = $request->user();
            $isPrivileged = $user->hasAnyRole(['super-admin', 'admin-opd', 'fasilitator-internal', 'fasilitator-eksternal']);

            if (! $isPrivileged) {
                $isEnrolled = EventParticipant::query()
                    ->where('training_event_id', $material->training_event_id)
                    ->where('user_id', $user->id)
                    ->exists();

                if (! $isEnrolled) {
                    return ApiResponse::error('Anda belum terdaftar pada event materi ini.', 403);
                }
            }

            $url = $material->url ?: $material->file_url;
            if (! $url) {
                return ApiResponse::error('Materi belum memiliki file atau tautan.', 422);
            }

            $progressService->completeReferencedSteps('material', $this->eventMaterialReference($material->id), $user->id);

            return ApiResponse::success('Material opened', [
                'url' => $url,
                'material' => [
                    'id' => $this->eventMaterialReference($material->id),
                    'title' => $material->title,
                    'event_uuid' => $material->event?->uuid,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function completeStep(Request $request, string $uuid, string $stepUuid)
    {
        try {
            $path = LearningPath::where('uuid', $uuid)->where('status', 'published')->firstOrFail();
            $step = LearningPathStep::where('uuid', $stepUuid)
                ->where('learning_path_id', $path->id)
                ->firstOrFail();

            $enrollment = LearningPathEnrollment::where('learning_path_id', $path->id)
                ->where('user_id', $request->user()->id)
                ->firstOrFail();

            if (in_array($step->type, ['training_event', 'material', 'quiz'], true)) {
                $this->syncExternalStepProgress($path, $enrollment, $request->user()->id);

                $completed = LearningPathStepProgress::where('enrollment_id', $enrollment->id)
                    ->where('step_id', $step->id)
                    ->exists();

                if (! $completed) {
                    return ApiResponse::error('Langkah ini selesai otomatis dari modul terkait.', 422);
                }

                return ApiResponse::success('Step completed');
            }

            LearningPathStepProgress::firstOrCreate(
                ['enrollment_id' => $enrollment->id, 'step_id' => $step->id],
                ['completed_at' => now()]
            );

            $this->markEnrollmentCompleteIfReady($path, $enrollment);

            return ApiResponse::success('Step completed');
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    private function enrollLinkedTrainingEvents(LearningPath $path, int $userId): void
    {
        $path->loadMissing('steps');

        $eventUuids = $path->steps
            ->where('type', 'training_event')
            ->pluck('reference_id')
            ->filter();

        $assessmentIds = $path->steps
            ->where('type', 'quiz')
            ->pluck('reference_id')
            ->filter();

        $eventMaterialIds = $path->steps
            ->where('type', 'material')
            ->pluck('reference_id')
            ->filter(fn ($reference) => $this->isEventMaterialReference($reference))
            ->map(fn ($reference) => $this->eventMaterialId($reference))
            ->filter();

        $assessmentEventIds = $assessmentIds->isNotEmpty()
            ? EventAssessment::whereIn('id', $assessmentIds)->pluck('training_event_id')
            : collect();

        $materialEventIds = $eventMaterialIds->isNotEmpty()
            ? EventMaterial::whereIn('id', $eventMaterialIds)->pluck('training_event_id')
            : collect();

        $linkedEventIds = $assessmentEventIds
            ->concat($materialEventIds)
            ->filter()
            ->unique()
            ->values();

        if ($eventUuids->isEmpty() && $linkedEventIds->isEmpty()) {
            return;
        }

        $events = TrainingEvent::query()
            ->where(function ($query) use ($eventUuids, $linkedEventIds): void {
                if ($eventUuids->isNotEmpty()) {
                    $query->whereIn('uuid', $eventUuids);
                }
                if ($linkedEventIds->isNotEmpty()) {
                    $method = $eventUuids->isNotEmpty() ? 'orWhereIn' : 'whereIn';
                    $query->{$method}('id', $linkedEventIds);
                }
            })
            ->get(['id', 'quota']);

        foreach ($events as $event) {
            $alreadyEnrolled = EventParticipant::where('training_event_id', $event->id)
                ->where('user_id', $userId)
                ->exists();

            if ($alreadyEnrolled) {
                continue;
            }

            if ($event->quota && $event->participants()->count() >= $event->quota) {
                continue;
            }

            EventParticipant::create([
                'training_event_id' => $event->id,
                'user_id' => $userId,
                'status' => 'enrolled',
                'enrolled_at' => now(),
            ]);
        }
    }
}
