<?php

namespace Modules\TrainingEvent\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LearningPathProgressService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Modules\Attendance\Models\AttendanceRecord;
use Modules\Certificate\Models\Certificate;
use Modules\Facilitator\Models\Facilitator;
use Modules\TrainingEvent\Models\AssessmentQuestion;
use Modules\TrainingEvent\Models\AssessmentSubmission;
use Modules\TrainingEvent\Models\EventAssessment;
use Modules\TrainingEvent\Models\EventMaterial;
use Modules\TrainingEvent\Models\EventParticipant;
use Modules\TrainingEvent\Models\EventSession;
use Modules\TrainingEvent\Models\SessionAttendance;
use Modules\TrainingEvent\Models\TrainingEvent;

class EventContentController extends Controller
{
    private function resolveEvent(string $uuid): TrainingEvent
    {
        return TrainingEvent::query()->where('uuid', $uuid)->firstOrFail();
    }

    private function userIsAssignedFacilitator(User $user, TrainingEvent $event): bool
    {
        $facilitatorId = Facilitator::query()
            ->where('user_id', $user->id)
            ->value('id');

        if (! $facilitatorId) {
            return false;
        }

        return (int) $event->facilitator_id === (int) $facilitatorId
            || $event->facilitators()->where('facilitators.id', $facilitatorId)->exists();
    }

    private function authorizeAssignedFacilitatorAccess(Request $request, TrainingEvent $event, string $permission, string $message): void
    {
        $user = $request->user();

        if ($user->can('update training event')) {
            return;
        }

        abort_unless($user->can($permission), 403, $message);
        abort_unless($this->userIsAssignedFacilitator($user, $event), 403, 'Anda hanya dapat mengelola event yang ditugaskan kepada Anda.');
    }

    private function authorizeSessionManagement(Request $request, TrainingEvent $event): void
    {
        $this->authorizeAssignedFacilitatorAccess(
            $request,
            $event,
            'manage own class sessions',
            'Anda tidak memiliki akses untuk mengelola sesi event ini.'
        );
    }

    private function authorizeMaterialManagement(Request $request, TrainingEvent $event): void
    {
        $this->authorizeAssignedFacilitatorAccess(
            $request,
            $event,
            'manage own teaching materials',
            'Anda tidak memiliki akses untuk mengelola materi event ini.'
        );
    }

    private function authorizeAttendanceManagement(Request $request, TrainingEvent $event): void
    {
        $this->authorizeAssignedFacilitatorAccess(
            $request,
            $event,
            'monitor participant attendance',
            'Anda tidak memiliki akses untuk mengelola presensi event ini.'
        );
    }

    private function authorizeAssessmentManagement(Request $request, TrainingEvent $event): void
    {
        $this->authorizeAssignedFacilitatorAccess(
            $request,
            $event,
            'create quiz',
            'Anda tidak memiliki akses untuk mengelola asesmen event ini.'
        );
    }

    private function authorizeSubmissionGrading(Request $request, TrainingEvent $event): void
    {
        $this->authorizeAssignedFacilitatorAccess(
            $request,
            $event,
            'input participant grades',
            'Anda tidak memiliki akses untuk menilai peserta event ini.'
        );
    }

    private function authorizeParticipantViewing(Request $request, TrainingEvent $event): void
    {
        $this->authorizeAssignedFacilitatorAccess(
            $request,
            $event,
            'view assigned class participants',
            'Anda tidak memiliki akses untuk melihat peserta event ini.'
        );
    }

    // ── Sessions (Learning Path) ──────────────────────────────────────────

    public function indexSessions(Request $request, string $uuid)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeSessionManagement($request, $event);

            return ApiResponse::success('Data retrieved', $event->sessions);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    private function sessionDateRules(TrainingEvent $event): array
    {
        $startRules = ['nullable', 'date'];
        $endRules = ['nullable', 'date', 'after_or_equal:start_date'];

        if ($event->start_date) {
            $startRules[] = 'after_or_equal:'.$event->start_date->toDateString();
        }
        if ($event->end_date) {
            $startRules[] = 'before_or_equal:'.$event->end_date->toDateString();
            $endRules[] = 'before_or_equal:'.$event->end_date->toDateString();
        }

        return [
            'start_date' => $startRules,
            'end_date' => $endRules,
        ];
    }

    private function sessionDateMessages(): array
    {
        return [
            'start_date.after_or_equal' => 'Tanggal mulai sesi tidak boleh sebelum tanggal mulai event.',
            'start_date.before_or_equal' => 'Tanggal mulai sesi tidak boleh melewati tanggal selesai event.',
            'end_date.after_or_equal' => 'Tanggal selesai sesi harus setelah atau sama dengan tanggal mulai sesi.',
            'end_date.before_or_equal' => 'Tanggal selesai sesi tidak boleh melewati tanggal selesai event.',
        ];
    }

    private function findOverlappingSession(TrainingEvent $event, string $startDate, string $endDate, ?int $excludeId = null): ?EventSession
    {
        return $event->sessions()
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->where('start_date', '<', $endDate)
            ->where('end_date', '>', $startDate)
            ->first();
    }

    public function storeSession(Request $request, string $uuid)
    {
        $event = $this->resolveEvent($uuid);
        $this->authorizeSessionManagement($request, $event);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'nullable|integer|min:1',
            'duration_minutes' => 'nullable|integer|min:1',
            'status' => 'nullable|string|in:draft,active,completed',
            ...$this->sessionDateRules($event),
        ], $this->sessionDateMessages());

        if (! empty($data['start_date']) && ! empty($data['end_date'])) {
            $conflict = $this->findOverlappingSession($event, $data['start_date'], $data['end_date']);
            if ($conflict) {
                return response()->json([
                    'success' => false,
                    'message' => "Jadwal bertabrakan dengan sesi \"{$conflict->title}\". Sesi tidak boleh tumpang tindih.",
                ], 422);
            }
        }

        try {
            $session = $event->sessions()->create($data);

            return ApiResponse::success('Created successfully', $session, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function updateSession(Request $request, string $uuid, int $sessionId)
    {
        $event = $this->resolveEvent($uuid);
        $this->authorizeSessionManagement($request, $event);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'nullable|integer|min:1',
            'duration_minutes' => 'nullable|integer|min:1',
            'status' => 'nullable|string|in:draft,active,completed',
            ...$this->sessionDateRules($event),
        ], $this->sessionDateMessages());

        try {
            $session = EventSession::query()->where('training_event_id', $event->id)->findOrFail($sessionId);

            if (! empty($data['start_date']) && ! empty($data['end_date'])) {
                $conflict = $this->findOverlappingSession($event, $data['start_date'], $data['end_date'], $session->id);
                if ($conflict) {
                    return response()->json([
                        'success' => false,
                        'message' => "Jadwal bertabrakan dengan sesi \"{$conflict->title}\". Sesi tidak boleh tumpang tindih.",
                    ], 422);
                }
            }

            $session->update($data);

            return ApiResponse::success('Updated successfully', $session);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function destroySession(Request $request, string $uuid, int $sessionId)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeSessionManagement($request, $event);
            $session = EventSession::query()->where('training_event_id', $event->id)->findOrFail($sessionId);
            $session->delete();

            return ApiResponse::success('Deleted successfully');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    // ── Materials ─────────────────────────────────────────────────────────

    public function indexMaterials(Request $request, string $uuid)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeMaterialManagement($request, $event);

            return ApiResponse::success('Data retrieved', $event->materials);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function storeMaterial(Request $request, string $uuid)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'nullable|string|in:document,video,link,presentation',
            'url' => 'nullable|string|max:2048',
            'file' => 'nullable|file|max:1024000',
            'files' => 'nullable|array|max:50',
            'files.*' => 'file|max:1024000',
            'description' => 'nullable|string',
            'duration_minutes' => 'nullable|integer|min:1|max:65535',
            'order' => 'nullable|integer|min:1',
        ]);

        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeMaterialManagement($request, $event);

            if ($request->hasFile('files')) {
                $files = $request->file('files');
                $materials = collect($files)->map(function ($file, int $index) use ($event, $data, $files) {
                    $payload = $data;
                    $payload['title'] = count($files) > 1
                        ? mb_substr(trim($data['title'].' - '.$file->getClientOriginalName()), 0, 255)
                        : $data['title'];
                    $payload['file_path'] = $file->store('event-materials', 'local');
                    $payload['url'] = null;
                    $payload['order'] = ((int) ($data['order'] ?? 1)) + $index;

                    unset($payload['file'], $payload['files']);

                    return $event->materials()->create($payload);
                });

                return ApiResponse::success('Created successfully', $materials, 201);
            }

            if ($request->hasFile('file')) {
                // Store in local disk — served via authenticated download route [M3 fix]
                $data['file_path'] = $request->file('file')->store('event-materials', 'local');
                $data['url'] = null;
            }

            unset($data['file'], $data['files']);
            $material = $event->materials()->create($data);

            return ApiResponse::success('Created successfully', $material, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function updateMaterial(Request $request, string $uuid, int $materialId)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'nullable|string|in:document,video,link,presentation',
            'url' => 'nullable|string|max:2048',
            'file' => 'nullable|file|max:1024000',
            'clear_file' => 'nullable|boolean',
            'description' => 'nullable|string',
            'duration_minutes' => 'nullable|integer|min:1|max:65535',
            'order' => 'nullable|integer|min:1',
        ]);

        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeMaterialManagement($request, $event);
            $material = EventMaterial::query()->where('training_event_id', $event->id)->findOrFail($materialId);

            if ($request->hasFile('file')) {
                if ($material->file_path) {
                    Storage::disk('local')->exists($material->file_path)
                        ? Storage::disk('local')->delete($material->file_path)
                        : Storage::disk('public')->delete($material->file_path);
                }
                // Store in local disk — served via authenticated download route [M3 fix]
                $data['file_path'] = $request->file('file')->store('event-materials', 'local');
                $data['url'] = null;
            } elseif ($request->boolean('clear_file') && $material->file_path) {
                Storage::disk('local')->exists($material->file_path)
                    ? Storage::disk('local')->delete($material->file_path)
                    : Storage::disk('public')->delete($material->file_path);
                $data['file_path'] = null;
            }

            unset($data['file'], $data['clear_file']);
            $material->update($data);

            return ApiResponse::success('Updated successfully', $material);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function destroyMaterial(Request $request, string $uuid, int $materialId)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeMaterialManagement($request, $event);
            $material = EventMaterial::query()->where('training_event_id', $event->id)->findOrFail($materialId);

            if ($material->file_path) {
                Storage::disk('local')->exists($material->file_path)
                    ? Storage::disk('local')->delete($material->file_path)
                    : Storage::disk('public')->delete($material->file_path);
            }
            $material->delete();

            return ApiResponse::success('Deleted successfully');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    // ── Assessments ───────────────────────────────────────────────────────

    public function indexAssessments(Request $request, string $uuid)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAssessmentManagement($request, $event);

            return ApiResponse::success('Data retrieved', $event->assessments);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function storeAssessment(Request $request, string $uuid)
    {
        $data = $request->validate([
            'type' => 'required|string|in:pre_test,post_test',
            'title' => 'required|string|max:255',
            'instructions' => 'nullable|string',
            'passing_score' => 'nullable|integer|min:0|max:100',
            'time_limit_minutes' => 'nullable|integer|min:1',
            'status' => 'nullable|string|in:draft,published',
            'bank_draw_count' => 'nullable|integer|min:1',
        ]);

        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAssessmentManagement($request, $event);
            $assessment = $event->assessments()->create($data);

            return ApiResponse::success('Created successfully', $assessment, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function updateAssessment(Request $request, string $uuid, int $assessmentId)
    {
        $data = $request->validate([
            'type' => 'required|string|in:pre_test,post_test',
            'title' => 'required|string|max:255',
            'instructions' => 'nullable|string',
            'passing_score' => 'nullable|integer|min:0|max:100',
            'time_limit_minutes' => 'nullable|integer|min:1',
            'status' => 'nullable|string|in:draft,published',
            'bank_draw_count' => 'nullable|integer|min:1',
        ]);

        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAssessmentManagement($request, $event);
            $assessment = EventAssessment::query()->where('training_event_id', $event->id)->findOrFail($assessmentId);
            $assessment->update($data);

            return ApiResponse::success('Updated successfully', $assessment);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function destroyAssessment(Request $request, string $uuid, int $assessmentId)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAssessmentManagement($request, $event);
            $assessment = EventAssessment::query()->where('training_event_id', $event->id)->findOrFail($assessmentId);
            $assessment->delete();

            return ApiResponse::success('Deleted successfully');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    // ── Assessment Questions ──────────────────────────────────────────────

    private function resolveAssessment(string $uuid, int $assessmentId): EventAssessment
    {
        $event = $this->resolveEvent($uuid);

        return EventAssessment::query()->where('training_event_id', $event->id)->findOrFail($assessmentId);
    }

    public function indexQuestions(Request $request, string $uuid, int $assessmentId)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAssessmentManagement($request, $event);
            $assessment = $this->resolveAssessment($uuid, $assessmentId);

            return ApiResponse::success('Data retrieved', $assessment->questions);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function storeQuestion(Request $request, string $uuid, int $assessmentId)
    {
        $data = $request->validate([
            'question' => 'required|string',
            'type' => 'required|string|in:multiple_choice,true_false,essay,multiple_select,fill_in_blank,matching,ordering',
            'options' => 'nullable|array',
            'options.*' => 'nullable',
            'correct_answer' => 'nullable|string|max:5000',
            'points' => 'nullable|integer|min:1',
            'order' => 'nullable|integer|min:1',
            'in_bank' => 'nullable|boolean',
        ]);

        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAssessmentManagement($request, $event);
            $assessment = $this->resolveAssessment($uuid, $assessmentId);
            $question = $assessment->questions()->create($data);

            return ApiResponse::success('Created successfully', $question, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function updateQuestion(Request $request, string $uuid, int $assessmentId, int $questionId)
    {
        $data = $request->validate([
            'question' => 'required|string',
            'type' => 'required|string|in:multiple_choice,true_false,essay,multiple_select,fill_in_blank,matching,ordering',
            'options' => 'nullable|array',
            'options.*' => 'nullable',
            'correct_answer' => 'nullable|string|max:5000',
            'points' => 'nullable|integer|min:1',
            'order' => 'nullable|integer|min:1',
            'in_bank' => 'nullable|boolean',
        ]);

        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAssessmentManagement($request, $event);
            $assessment = $this->resolveAssessment($uuid, $assessmentId);
            $question = AssessmentQuestion::query()->where('event_assessment_id', $assessment->id)->findOrFail($questionId);
            $question->update($data);

            return ApiResponse::success('Updated successfully', $question);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function destroyQuestion(Request $request, string $uuid, int $assessmentId, int $questionId)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAssessmentManagement($request, $event);
            $assessment = $this->resolveAssessment($uuid, $assessmentId);
            $question = AssessmentQuestion::query()->where('event_assessment_id', $assessment->id)->findOrFail($questionId);
            $question->delete();

            return ApiResponse::success('Deleted successfully');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function importQuestions(Request $request, string $uuid, int $assessmentId)
    {
        $request->validate([
            'questions' => 'required|array|min:1|max:200',
            'questions.*.question' => 'required|string',
            'questions.*.type' => 'required|string|in:multiple_choice,true_false,essay,multiple_select,fill_in_blank,matching,ordering',
            'questions.*.options' => 'nullable|array',
            'questions.*.options.*' => 'nullable',
            'questions.*.correct_answer' => 'nullable|string|max:5000',
            'questions.*.points' => 'nullable|integer|min:1',
            'questions.*.order' => 'nullable|integer|min:1',
            'questions.*.in_bank' => 'nullable|boolean',
        ]);

        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAssessmentManagement($request, $event);
            $assessment = $this->resolveAssessment($uuid, $assessmentId);
            $imported = 0;
            $errors = [];

            foreach ($request->input('questions') as $i => $q) {
                try {
                    $assessment->questions()->create([
                        'question' => $q['question'],
                        'type' => $q['type'],
                        'options' => $q['options'] ?? null,
                        'correct_answer' => $q['correct_answer'] ?? null,
                        'points' => $q['points'] ?? 1,
                        'order' => $q['order'] ?? ($assessment->questions()->count() + 1),
                        'in_bank' => $q['in_bank'] ?? false,
                    ]);
                    $imported++;
                } catch (\Throwable $e) {
                    $errors[] = 'Baris '.($i + 2).': '.$e->getMessage();
                }
            }

            return ApiResponse::success("{$imported} soal berhasil diimport.", [
                'imported' => $imported,
                'errors' => $errors,
            ], 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    // ── Assessment Submissions ────────────────────────────────────────────

    public function indexSubmissions(Request $request, string $uuid, int $assessmentId)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeSubmissionGrading($request, $event);
            $assessment = $this->resolveAssessment($uuid, $assessmentId);
            $assessment->load(['questions', 'submissions.user']);

            $hasEssay = $assessment->questions->contains('type', 'essay');

            return ApiResponse::success('Data retrieved', [
                'assessment' => $assessment->only(['id', 'title', 'type', 'passing_score']),
                'has_essay' => $hasEssay,
                'questions' => $assessment->questions,
                'submissions' => $assessment->submissions->map(fn ($s) => [
                    'id' => $s->id,
                    'user' => $s->user ? ['id' => $s->user->id, 'name' => $s->user->name, 'nip' => $s->user->nip] : null,
                    'answers' => $s->answers,
                    'score' => $s->score,
                    'is_passed' => $s->is_passed,
                    'submitted_at' => $s->submitted_at,
                ]),
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function gradeSubmission(Request $request, string $uuid, int $assessmentId, int $submissionId)
    {
        $data = $request->validate([
            'score' => 'required|integer|min:0|max:100',
        ]);

        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeSubmissionGrading($request, $event);
            $assessment = $this->resolveAssessment($uuid, $assessmentId);
            $submission = AssessmentSubmission::query()
                ->where('event_assessment_id', $assessment->id)
                ->findOrFail($submissionId);

            $submission->update([
                'score' => $data['score'],
                'is_passed' => $data['score'] >= $assessment->passing_score,
            ]);

            return ApiResponse::success('Nilai berhasil disimpan.', $submission);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    // ── Participants ──────────────────────────────────────────────────────

    public function indexParticipants(Request $request, string $uuid)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeParticipantViewing($request, $event);

            // Load user explicitly now that the relation no longer auto-eager-loads it.
            return ApiResponse::success('Data retrieved', $event->participants()->with('user:id,name,email,nip')->get());
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function searchParticipantCandidates(Request $request, string $uuid)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeParticipantViewing($request, $event);

            $users = User::query()
                ->select('id', 'name', 'nip', 'email', 'opd_name', 'organization_unit_name')
                ->when($request->filled('search'), function ($q) use ($request) {
                    $term = $request->string('search');
                    $q->where(fn ($q2) => $q2
                        ->where('name', 'like', "%{$term}%")
                        ->orWhere('nip', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%"));
                })
                ->when($request->filled('opd_name'), fn ($q) => $q->where('opd_name', $request->string('opd_name')))
                ->orderBy('name')
                ->paginate($request->integer('per_page', 15));

            return ApiResponse::success('Data retrieved', $users);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function listOpdsForEnrollment(Request $request, string $uuid)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeParticipantViewing($request, $event);

            $opds = User::query()
                ->whereNotNull('opd_name')
                ->where('opd_name', '!=', '')
                ->selectRaw('opd_name, COUNT(*) as user_count')
                ->groupBy('opd_name')
                ->orderBy('opd_name')
                ->get();

            return ApiResponse::success('Data retrieved', $opds);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function bulkEnrollByOpd(Request $request, string $uuid)
    {
        $request->validate([
            'opd_name' => 'required|string|max:255',
            'exclude_nips' => 'nullable|array',
            'exclude_nips.*' => 'string|max:32',
        ]);

        try {
            $event = $this->resolveEvent($uuid);
            $excludeNips = array_filter($request->input('exclude_nips', []));

            $users = User::where('opd_name', $request->string('opd_name'))
                ->when(! empty($excludeNips), fn ($q) => $q->whereNotIn('nip', $excludeNips))
                ->get(['id']);

            $enrolled = $this->enrollUsers($event, $users);

            return ApiResponse::success("{$enrolled} peserta baru berhasil ditambahkan dari OPD.");
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function bulkEnrollAll(Request $request, string $uuid)
    {
        $request->validate([
            'exclude_opds' => 'nullable|array',
            'exclude_opds.*' => 'string|max:255',
            'exclude_nips' => 'nullable|array',
            'exclude_nips.*' => 'string|max:32',
        ]);

        try {
            $event = $this->resolveEvent($uuid);
            $excludeOpds = array_filter($request->input('exclude_opds', []));
            $excludeNips = array_filter($request->input('exclude_nips', []));

            $users = User::query()
                ->when(! empty($excludeOpds), fn ($q) => $q->whereNotIn('opd_name', $excludeOpds))
                ->when(! empty($excludeNips), fn ($q) => $q->whereNotIn('nip', $excludeNips))
                ->get(['id']);

            $enrolled = $this->enrollUsers($event, $users);

            return ApiResponse::success("{$enrolled} peserta baru berhasil ditambahkan dari semua OPD.");
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    private function enrollUsers($event, $users): int
    {
        $enrolled = 0;

        // Count once before the loop — avoids N+1 quota check queries.
        $currentCount = $event->quota ? $event->participants()->count() : 0;

        foreach ($users as $user) {
            if ($event->quota && $currentCount >= $event->quota) {
                break;
            }

            $participant = EventParticipant::firstOrCreate(
                ['training_event_id' => $event->id, 'user_id' => $user->id],
                ['status' => 'enrolled', 'enrolled_at' => now()],
            );

            if ($participant->wasRecentlyCreated) {
                $enrolled++;
                $currentCount++;
            }
        }

        return $enrolled;
    }

    public function importParticipants(Request $request, string $uuid)
    {
        $request->validate([
            'nips' => 'required|array|min:1|max:500',
            'nips.*' => 'required|string|max:32',
        ]);

        try {
            $event = $this->resolveEvent($uuid);
            $nips = array_unique(array_filter($request->input('nips')));
            $users = User::whereIn('nip', $nips)->get(['id', 'nip', 'name']);
            $foundNips = $users->pluck('nip')->all();
            $notFound = array_values(array_diff($nips, $foundNips));

            $enrolled = 0;

            // Count once before the loop — avoids N+1 quota check queries.
            $currentCount = $event->quota ? $event->participants()->count() : 0;

            foreach ($users as $user) {
                if ($event->quota && $currentCount >= $event->quota) {
                    break;
                }
                $participant = EventParticipant::firstOrCreate(
                    ['training_event_id' => $event->id, 'user_id' => $user->id],
                    ['status' => 'enrolled', 'enrolled_at' => now()],
                );
                if ($participant->wasRecentlyCreated) {
                    $enrolled++;
                    $currentCount++;
                }
            }

            return ApiResponse::success("{$enrolled} peserta berhasil diimport.", [
                'enrolled' => $enrolled,
                'not_found_nips' => $notFound,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function storeParticipant(Request $request, string $uuid)
    {
        $data = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);

        try {
            $event = $this->resolveEvent($uuid);

            if ($event->quota && $event->participants()->count() >= $event->quota) {
                return ApiResponse::error('Kuota peserta sudah penuh.', 422);
            }

            $participant = EventParticipant::firstOrCreate(
                ['training_event_id' => $event->id, 'user_id' => $data['user_id']],
                ['status' => 'enrolled', 'enrolled_at' => now()],
            );

            return ApiResponse::success('Participant enrolled', $participant->load('user:id,name,email,nip'), 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function selfEnroll(Request $request, string $uuid)
    {
        try {
            $event = $this->resolveEvent($uuid);

            if ($event->status !== 'active') {
                return ApiResponse::error('Event tidak tersedia untuk pendaftaran.', 422);
            }

            if (now()->gt($event->start_date)) {
                return ApiResponse::error('Pendaftaran sudah ditutup, event telah dimulai.', 422);
            }

            if ($event->quota && $event->participants()->count() >= $event->quota) {
                return ApiResponse::error('Kuota peserta sudah penuh.', 422);
            }

            $participant = EventParticipant::firstOrCreate(
                ['training_event_id' => $event->id, 'user_id' => $request->user()->id],
                ['status' => 'enrolled', 'enrolled_at' => now()],
            );

            return ApiResponse::success('Berhasil mendaftar ke event.', $participant, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function destroyParticipant(string $uuid, int $userId)
    {
        try {
            $event = $this->resolveEvent($uuid);
            EventParticipant::query()
                ->where('training_event_id', $event->id)
                ->where('user_id', $userId)
                ->firstOrFail()
                ->delete();

            return ApiResponse::success('Participant removed');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function bulkRemoveParticipants(Request $request, string $uuid)
    {
        $request->validate([
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'integer',
        ]);

        try {
            $event = $this->resolveEvent($uuid);
            $deleted = EventParticipant::where('training_event_id', $event->id)
                ->whereIn('user_id', $request->input('user_ids'))
                ->delete();

            return ApiResponse::success("{$deleted} peserta berhasil dihapus.");
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    // ── Attendance ────────────────────────────────────────────────────────────

    public function indexAttendance(Request $request, string $uuid)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAttendanceManagement($request, $event);

            // All enrolled participants with user info
            $participants = EventParticipant::query()
                ->where('training_event_id', $event->id)
                ->with('user:id,name,email,nip,opd_name')
                ->orderBy('enrolled_at')
                ->get();

            $userIds = $participants->pluck('user_id');

            // Event-level attendance
            $eventAttendances = AttendanceRecord::query()
                ->where('training_event_id', $event->id)
                ->whereIn('user_id', $userIds)
                ->get()
                ->keyBy('user_id');

            // Sessions with session-level attendances
            $sessions = EventSession::query()
                ->where('training_event_id', $event->id)
                ->withCount('attendances')
                ->orderBy('order')
                ->get();

            $sessionIds = $sessions->pluck('id');

            $sessionAttendances = SessionAttendance::query()
                ->whereIn('event_session_id', $sessionIds)
                ->whereIn('user_id', $userIds)
                ->get();

            // Group session attendances by user_id → session_id
            $sessionAttByUser = [];
            foreach ($sessionAttendances as $sa) {
                $sessionAttByUser[$sa->user_id][$sa->event_session_id] = $sa->checked_in_at;
            }

            $rows = $participants->map(function ($p) use ($eventAttendances, $sessionAttByUser) {
                $att = $eventAttendances->get($p->user_id);

                return [
                    'id' => $p->id,
                    'user_id' => $p->user_id,
                    'user' => $p->user,
                    'participant_status' => $p->status,
                    'event_attendance' => $att ? [
                        'checked_in' => true,
                        'checked_in_at' => $att->checked_in_at,
                        'status' => $att->status,
                    ] : ['checked_in' => false, 'checked_in_at' => null, 'status' => null],
                    'session_attendances' => $sessionAttByUser[$p->user_id] ?? [],
                ];
            });

            $presentCount = $eventAttendances->count();

            return ApiResponse::success('Data retrieved', [
                'participants' => $rows,
                'sessions' => $sessions->map(fn ($s) => [
                    'id' => $s->id,
                    'title' => $s->title,
                    'start_date' => $s->start_date,
                    'attendance_count' => $s->attendances_count,
                ]),
                'stats' => [
                    'total' => $participants->count(),
                    'present' => $presentCount,
                    'absent' => $participants->count() - $presentCount,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function bulkMarkAttendance(Request $request, string $uuid)
    {
        $request->validate(['user_ids' => 'required|array|min:1', 'user_ids.*' => 'integer']);

        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAttendanceManagement($request, $event);
            $now = now();
            foreach ($request->input('user_ids') as $userId) {
                AttendanceRecord::firstOrCreate(
                    ['training_event_id' => $event->id, 'user_id' => $userId],
                    ['checked_in_at' => $now, 'status' => 'present'],
                );
            }

            return ApiResponse::success(count($request->input('user_ids')).' presensi dicatat.');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function bulkUnmarkAttendance(Request $request, string $uuid)
    {
        $request->validate(['user_ids' => 'required|array|min:1', 'user_ids.*' => 'integer']);

        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAttendanceManagement($request, $event);
            AttendanceRecord::where('training_event_id', $event->id)
                ->whereIn('user_id', $request->input('user_ids'))
                ->delete();

            return ApiResponse::success('Presensi dihapus.');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function bulkMarkSessionAttendance(Request $request, string $uuid, int $sessionId)
    {
        $request->validate(['user_ids' => 'required|array|min:1', 'user_ids.*' => 'integer']);

        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAttendanceManagement($request, $event);
            $session = EventSession::where('training_event_id', $event->id)->findOrFail($sessionId);
            $now = now();
            foreach ($request->input('user_ids') as $userId) {
                SessionAttendance::firstOrCreate(
                    ['event_session_id' => $session->id, 'user_id' => $userId],
                    ['checked_in_at' => $now],
                );
            }

            return ApiResponse::success(count($request->input('user_ids')).' presensi sesi dicatat.');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function bulkUnmarkSessionAttendance(Request $request, string $uuid, int $sessionId)
    {
        $request->validate(['user_ids' => 'required|array|min:1', 'user_ids.*' => 'integer']);

        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAttendanceManagement($request, $event);
            $session = EventSession::where('training_event_id', $event->id)->findOrFail($sessionId);
            SessionAttendance::where('event_session_id', $session->id)
                ->whereIn('user_id', $request->input('user_ids'))
                ->delete();

            return ApiResponse::success('Presensi sesi dihapus.');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function markAttendance(Request $request, string $uuid, int $userId)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAttendanceManagement($request, $event);

            abort_unless(
                EventParticipant::where('training_event_id', $event->id)->where('user_id', $userId)->exists(),
                404,
                'Peserta tidak ditemukan.'
            );

            AttendanceRecord::firstOrCreate(
                ['training_event_id' => $event->id, 'user_id' => $userId],
                ['checked_in_at' => now(), 'status' => 'present'],
            );

            return ApiResponse::success('Presensi dicatat.');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function unmarkAttendance(Request $request, string $uuid, int $userId)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAttendanceManagement($request, $event);

            AttendanceRecord::where('training_event_id', $event->id)
                ->where('user_id', $userId)
                ->delete();

            return ApiResponse::success('Presensi dihapus.');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function markSessionAttendance(Request $request, string $uuid, int $sessionId, int $userId)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAttendanceManagement($request, $event);
            $session = EventSession::where('training_event_id', $event->id)->findOrFail($sessionId);

            abort_unless(
                EventParticipant::where('training_event_id', $event->id)->where('user_id', $userId)->exists(),
                404,
                'Peserta tidak ditemukan.'
            );

            SessionAttendance::firstOrCreate(
                ['event_session_id' => $session->id, 'user_id' => $userId],
                ['checked_in_at' => now()],
            );

            return ApiResponse::success('Presensi sesi dicatat.');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function unmarkSessionAttendance(Request $request, string $uuid, int $sessionId, int $userId)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $this->authorizeAttendanceManagement($request, $event);
            $session = EventSession::where('training_event_id', $event->id)->findOrFail($sessionId);

            SessionAttendance::where('event_session_id', $session->id)
                ->where('user_id', $userId)
                ->delete();

            return ApiResponse::success('Presensi sesi dihapus.');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    // ── Completion Approval ───────────────────────────────────────────────────

    public function indexCompletion(string $uuid)
    {
        try {
            $event = TrainingEvent::with('sessions:id,training_event_id,title')
                ->where('uuid', $uuid)->firstOrFail();

            $participants = EventParticipant::where('training_event_id', $event->id)
                ->with('user:id,name,nip,opd_name')
                ->get();

            $userIds = $participants->pluck('user_id');
            $sessionIds = $event->sessions->pluck('id');
            $totalSessions = $event->sessions->count();

            // Event-level attendance
            $attendances = AttendanceRecord::where('training_event_id', $event->id)
                ->whereIn('user_id', $userIds)
                ->get()->keyBy('user_id');

            // Session attendance counts per user
            $sessionCounts = SessionAttendance::whereIn('event_session_id', $sessionIds)
                ->whereIn('user_id', $userIds)
                ->selectRaw('user_id, COUNT(*) as cnt')
                ->groupBy('user_id')
                ->pluck('cnt', 'user_id');

            // Assessments with submissions
            $assessments = EventAssessment::where('training_event_id', $event->id)->get();
            $assessmentIds = $assessments->pluck('id');
            $submissions = AssessmentSubmission::whereIn('event_assessment_id', $assessmentIds)
                ->whereIn('user_id', $userIds)
                ->get()->groupBy('user_id');

            // Certificates
            $certificates = Certificate::where('training_event_id', $event->id)
                ->whereIn('user_id', $userIds)
                ->get()->keyBy('user_id');

            $list = $participants->map(function ($p) use (
                $attendances, $sessionCounts, $submissions, $certificates,
                $assessments, $totalSessions
            ) {
                $att = $attendances->get($p->user_id);
                $userSubs = $submissions->get($p->user_id, collect());
                $assessmentData = $assessments->map(fn ($a) => [
                    'id' => $a->id,
                    'title' => $a->title,
                    'type' => $a->type,
                    'passing_score' => $a->passing_score,
                    'score' => $userSubs->firstWhere('event_assessment_id', $a->id)?->score,
                    'is_passed' => $userSubs->firstWhere('event_assessment_id', $a->id)?->is_passed,
                    'submitted' => $userSubs->contains('event_assessment_id', $a->id),
                ])->values();

                return [
                    'id' => $p->id,
                    'user_id' => $p->user_id,
                    'status' => $p->status,
                    'completion_status' => $p->completion_status,
                    'approved_by' => $p->approved_by,
                    'approved_at' => $p->approved_at,
                    'rejection_reason' => $p->rejection_reason,
                    'enrolled_at' => $p->enrolled_at,
                    'completed_at' => $p->completed_at,
                    'user' => $p->user,
                    'attendance' => [
                        'checked_in' => $att !== null,
                        'checked_in_at' => $att?->checked_in_at,
                    ],
                    'session_attendance_count' => $sessionCounts->get($p->user_id, 0),
                    'total_sessions' => $totalSessions,
                    'assessments' => $assessmentData,
                    'certificate' => $certificates->get($p->user_id),
                ];
            });

            $stats = [
                'total' => $participants->count(),
                'pending' => $participants->where('completion_status', 'pending')->count(),
                'approved' => $participants->where('completion_status', 'approved')->count(),
                'rejected' => $participants->where('completion_status', 'rejected')->count(),
            ];

            return ApiResponse::success('Data retrieved', [
                'participants' => $list,
                'stats' => $stats,
                'total_sessions' => $totalSessions,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function approveCompletion(Request $request, string $uuid, int $userId, LearningPathProgressService $learningPathProgressService)
    {
        try {
            $event = $this->resolveEvent($uuid);
            $participant = EventParticipant::where('training_event_id', $event->id)
                ->where('user_id', $userId)->firstOrFail();

            $participant->update([
                'completion_status' => 'approved',
                'status' => 'completed',
                'completed_at' => now(),
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
                'rejection_reason' => null,
            ]);

            $certNumber = 'CERT/'.date('Y').'/'.str_pad($event->id, 4, '0', STR_PAD_LEFT)
                .'/'.str_pad($userId, 4, '0', STR_PAD_LEFT);

            $certificate = Certificate::firstOrCreate(
                ['training_event_id' => $event->id, 'user_id' => $userId],
                ['certificate_number' => $certNumber, 'issued_at' => now()]
            );

            $learningPathProgressService->completeReferencedSteps('training_event', $event->uuid, $userId);

            return ApiResponse::success('Kelulusan disetujui.', [
                'participant' => $participant,
                'certificate' => $certificate,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function rejectCompletion(Request $request, string $uuid, int $userId)
    {
        try {
            $data = $request->validate(['reason' => 'nullable|string|max:500']);

            $event = $this->resolveEvent($uuid);
            $participant = EventParticipant::where('training_event_id', $event->id)
                ->where('user_id', $userId)->firstOrFail();

            $participant->update([
                'completion_status' => 'rejected',
                'status' => 'enrolled',
                'completed_at' => null,
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
                'rejection_reason' => $data['reason'] ?? null,
            ]);

            return ApiResponse::success('Kelulusan ditolak.');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function bulkApproveCompletion(Request $request, string $uuid, LearningPathProgressService $learningPathProgressService)
    {
        try {
            $data = $request->validate(['user_ids' => 'required|array', 'user_ids.*' => 'integer']);

            $event = $this->resolveEvent($uuid);
            $participants = EventParticipant::where('training_event_id', $event->id)
                ->whereIn('user_id', $data['user_ids'])->get();

            foreach ($participants as $participant) {
                $participant->update([
                    'completion_status' => 'approved',
                    'status' => 'completed',
                    'completed_at' => now(),
                    'approved_by' => $request->user()->id,
                    'approved_at' => now(),
                    'rejection_reason' => null,
                ]);

                $certNumber = 'CERT/'.date('Y').'/'.str_pad($event->id, 4, '0', STR_PAD_LEFT)
                    .'/'.str_pad($participant->user_id, 4, '0', STR_PAD_LEFT);

                Certificate::firstOrCreate(
                    ['training_event_id' => $event->id, 'user_id' => $participant->user_id],
                    ['certificate_number' => $certNumber, 'issued_at' => now()]
                );

                $learningPathProgressService->completeReferencedSteps('training_event', $event->uuid, $participant->user_id);
            }

            return ApiResponse::success('Kelulusan massal disetujui.', ['approved_count' => $participants->count()]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }
}
