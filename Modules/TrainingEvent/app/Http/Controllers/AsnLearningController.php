<?php

namespace Modules\TrainingEvent\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Modules\Attendance\Models\AttendanceRecord;
use Modules\Achievement\Services\AchievementService;
use Modules\Notification\Services\NotificationService;
use Modules\Wallet\Services\WalletService;
use Illuminate\Support\Str;
use Modules\Certificate\Models\Certificate;
use Modules\TrainingEvent\Models\AssessmentSubmission;
use Modules\TrainingEvent\Models\EventAssessment;
use Modules\TrainingEvent\Models\EventParticipant;
use Modules\TrainingEvent\Models\EventSession;
use Modules\TrainingEvent\Models\SessionAttendance;
use Modules\TrainingEvent\Models\TrainingEvent;

class AsnLearningController extends Controller
{
    private function resolveEnrolledEvent(string $uuid, int $userId): TrainingEvent
    {
        $event = TrainingEvent::query()->where('uuid', $uuid)->firstOrFail();

        abort_unless(
            EventParticipant::query()
                ->where('training_event_id', $event->id)
                ->where('user_id', $userId)
                ->exists(),
            403,
            'Anda tidak terdaftar sebagai peserta event ini.'
        );

        return $event;
    }

    public function show(string $uuid, Request $request)
    {
        try {
            $userId = $request->user()->id;
            $event  = $this->resolveEnrolledEvent($uuid, $userId);

            $materials = $event->materials;

            $submissionsByAssessment = AssessmentSubmission::query()
                ->where('user_id', $userId)
                ->whereIn('event_assessment_id', $event->assessments->pluck('id'))
                ->get()
                ->keyBy('event_assessment_id');

            $assessments = $event->assessments
                ->where('status', 'published')
                ->map(function ($a) use ($submissionsByAssessment) {
                    $submission = $submissionsByAssessment->get($a->id);
                    $a->my_submission = $submission
                        ? ['score' => $submission->score, 'is_passed' => $submission->is_passed, 'submitted_at' => $submission->submitted_at]
                        : null;

                    return $a;
                })
                ->values();

            $attendance = AttendanceRecord::query()
                ->where('training_event_id', $event->id)
                ->where('user_id', $userId)
                ->first();

            $sessionAttendances = SessionAttendance::query()
                ->where('user_id', $userId)
                ->whereIn('event_session_id', $event->sessions->pluck('id'))
                ->get()
                ->keyBy('event_session_id');

            $sessions = $event->sessions->map(function ($s) use ($sessionAttendances) {
                $s->my_attendance = $sessionAttendances->has($s->id)
                    ? ['checked_in_at' => $sessionAttendances->get($s->id)->checked_in_at]
                    : null;

                return $s;
            });

            $certificate = Certificate::query()
                ->where('user_id', $userId)
                ->where('training_event_id', $event->id)
                ->first();

            return ApiResponse::success('Data retrieved', [
                'event'       => $event->only(['uuid', 'title', 'description', 'location', 'start_date', 'end_date', 'status', 'banner_url']),
                'sessions'    => $sessions,
                'materials'   => $materials,
                'assessments' => $assessments,
                'attendance'  => [
                    'checked_in'    => (bool) $attendance,
                    'checked_in_at' => $attendance?->checked_in_at,
                    'status'        => $attendance?->status,
                ],
                'certificate' => $certificate ? [
                    'uuid'               => $certificate->uuid,
                    'certificate_number' => $certificate->certificate_number,
                    'issued_date'        => $certificate->issued_at?->locale('id')->translatedFormat('d F Y'),
                    'verification_token' => $certificate->verification_token,
                ] : null,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function checkIn(string $uuid, Request $request)
    {
        try {
            $userId = $request->user()->id;
            $event  = $this->resolveEnrolledEvent($uuid, $userId);

            $record = AttendanceRecord::query()->firstOrCreate(
                ['training_event_id' => $event->id, 'user_id' => $userId],
                ['checked_in_at' => now(), 'status' => 'present'],
            );

            if ($record->wasRecentlyCreated) {
                return ApiResponse::success('Presensi berhasil dicatat.', $record, 201);
            }

            return ApiResponse::success('Anda sudah melakukan presensi.', $record);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function takeAssessment(string $uuid, int $assessmentId, Request $request)
    {
        try {
            $userId     = $request->user()->id;
            $event      = $this->resolveEnrolledEvent($uuid, $userId);
            $assessment = EventAssessment::query()
                ->where('training_event_id', $event->id)
                ->where('status', 'published')
                ->findOrFail($assessmentId);

            $alreadySubmitted = AssessmentSubmission::query()
                ->where('event_assessment_id', $assessment->id)
                ->where('user_id', $userId)
                ->exists();

            if ($alreadySubmitted) {
                return ApiResponse::error('Anda sudah mengerjakan asesmen ini.', 422);
            }

            // Apply question bank draw if configured
            $allQuestions = $assessment->questions;

            if ($assessment->bank_draw_count && $assessment->bank_draw_count < $allQuestions->count()) {
                $bankPool   = $allQuestions->where('in_bank', true)->values();
                $alwaysShow = $allQuestions->where('in_bank', false)->values();
                $drawn      = $bankPool->count() > $assessment->bank_draw_count
                    ? $bankPool->random($assessment->bank_draw_count)
                    : $bankPool;
                $allQuestions = $alwaysShow->merge($drawn)->sortBy('order')->values();
            }

            // Strip correct_answer so it isn't exposed to the client
            $questions = $allQuestions->map(fn ($q) => $q->only(['id', 'question', 'type', 'options', 'points', 'order']));

            return ApiResponse::success('Data retrieved', [
                'assessment' => $assessment->only(['id', 'type', 'title', 'instructions', 'passing_score', 'time_limit_minutes']),
                'questions'  => $questions,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function checkInSession(string $uuid, int $sessionId, Request $request)
    {
        try {
            $userId  = $request->user()->id;
            $event   = $this->resolveEnrolledEvent($uuid, $userId);
            $session = EventSession::query()
                ->where('training_event_id', $event->id)
                ->findOrFail($sessionId);

            $record = SessionAttendance::query()->firstOrCreate(
                ['event_session_id' => $session->id, 'user_id' => $userId],
                ['checked_in_at' => now()],
            );

            if ($record->wasRecentlyCreated) {
                return ApiResponse::success('Presensi sesi berhasil dicatat.', $record, 201);
            }

            return ApiResponse::success('Anda sudah melakukan presensi untuk sesi ini.', $record);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function submitAssessment(string $uuid, int $assessmentId, Request $request)
    {
        $request->validate([
            'answers'        => 'required|array',
            'answers.*'      => 'nullable|string|max:5000',
            'question_ids'   => 'nullable|array',
            'question_ids.*' => 'integer',
        ]);

        try {
            $userId     = $request->user()->id;
            $event      = $this->resolveEnrolledEvent($uuid, $userId);
            $assessment = EventAssessment::query()
                ->where('training_event_id', $event->id)
                ->where('status', 'published')
                ->with('questions')
                ->findOrFail($assessmentId);

            $alreadySubmitted = AssessmentSubmission::query()
                ->where('event_assessment_id', $assessment->id)
                ->where('user_id', $userId)
                ->exists();

            if ($alreadySubmitted) {
                return ApiResponse::error('Anda sudah mengerjakan asesmen ini.', 422);
            }

            $answers     = $request->input('answers'); // [question_id => answer]
            $shownIds    = $request->input('question_ids');
            $questions   = $shownIds
                ? $assessment->questions->whereIn('id', $shownIds)->values()
                : $assessment->questions;

            $totalPoints  = 0;
            $scoredPoints = 0;
            $hasEssay     = false;

            foreach ($questions as $question) {
                $totalPoints += $question->points;

                if ($question->type === 'essay') {
                    $hasEssay = true;
                    continue;
                }

                $given   = (string) ($answers[$question->id] ?? '');
                $correct = (string) ($question->correct_answer ?? '');

                if ($given === '') {
                    continue;
                }

                switch ($question->type) {
                    case 'multiple_choice':
                    case 'true_false':
                    case 'ordering':
                        if ($given === $correct) {
                            $scoredPoints += $question->points;
                        }
                        break;

                    case 'multiple_select':
                        $givenSet   = explode(',', $given);
                        $correctSet = explode(',', $correct);
                        sort($givenSet);
                        sort($correctSet);
                        if ($givenSet === $correctSet) {
                            $scoredPoints += $question->points;
                        }
                        break;

                    case 'fill_in_blank':
                        $givenLower   = mb_strtolower(trim($given));
                        $correctLower = mb_strtolower(trim($correct));
                        $alternatives = array_map(
                            fn ($a) => mb_strtolower(trim((string) $a)),
                            $question->options ?? []
                        );
                        if ($givenLower === $correctLower || in_array($givenLower, $alternatives)) {
                            $scoredPoints += $question->points;
                        }
                        break;

                    case 'matching':
                        if ($correct !== '') {
                            $givenPairs   = explode(',', $given);
                            $correctPairs = explode(',', $correct);
                            $total        = count($correctPairs);
                            $matched      = 0;
                            foreach ($correctPairs as $i => $correctRight) {
                                if (isset($givenPairs[$i]) && trim($givenPairs[$i]) === trim($correctRight)) {
                                    $matched++;
                                }
                            }
                            $scoredPoints += $total > 0 ? (int) round($question->points * $matched / $total) : 0;
                        }
                        break;
                }
            }

            $score    = $hasEssay ? null : ($totalPoints > 0 ? (int) round($scoredPoints / $totalPoints * 100) : 0);
            $isPassed = $score !== null ? $score >= $assessment->passing_score : null;

            $submission = AssessmentSubmission::query()->create([
                'event_assessment_id' => $assessment->id,
                'user_id'             => $userId,
                'answers'             => $answers,
                'score'               => $score,
                'is_passed'           => $isPassed,
                'submitted_at'        => now(),
            ]);

            // Credit wallet tokens based on score (skipped if pending essay review or already credited).
            $tokensEarned = 0;
            if ($score !== null && $score > 0) {
                try {
                    $walletService = app(WalletService::class);
                    $tokensEarned  = $walletService->tokensFromScore($score);
                    if ($tokensEarned > 0) {
                        $txn = $walletService->credit(
                            $userId,
                            $tokensEarned,
                            "Skor asesmen: {$assessment->title} ({$score} poin)",
                            'assessment_submission',
                            $submission->id,
                        );
                        // null means already credited (idempotent dedup) — don't double-report
                        if ($txn === null) {
                            $tokensEarned = 0;
                        }
                    }
                } catch (\InvalidArgumentException $e) {
                    Log::warning('Wallet credit rejected: '.$e->getMessage(), ['user_id' => $userId, 'score' => $score]);
                } catch (\RuntimeException $e) {
                    Log::warning('Wallet credit failed: '.$e->getMessage(), ['user_id' => $userId]);
                } catch (\Throwable $e) {
                    Log::error('Wallet credit unexpected error: '.$e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => $userId]);
                }
            }

            // Check and award badges.
            $newBadges = [];
            try {
                $newBadges = app(AchievementService::class)->checkAndAward($request->user());
            } catch (\Throwable $e) {
                Log::warning('Achievement check failed: '.$e->getMessage(), ['user_id' => $userId]);
            }

            // Send notifications.
            try {
                $notif = app(NotificationService::class);
                $scoreLabel = $score !== null ? "{$score}/100" : 'menunggu penilaian';
                $passLabel  = $isPassed ? '✓ Lulus' : '✗ Belum lulus';
                $notif->send(
                    $userId,
                    "Asesmen Selesai: {$assessment->title}",
                    "Nilai Anda: {$scoreLabel} — {$passLabel}" . ($tokensEarned > 0 ? ". Anda mendapat {$tokensEarned} token." : ''),
                    'assessment_result',
                    '/wallet',
                );
                foreach ($newBadges as $badge) {
                    $notif->send(
                        $userId,
                        "Badge Baru: {$badge->name}",
                        "Selamat! Anda meraih badge \"{$badge->name}\" ({$badge->tier}).",
                        'badge_earned',
                        '/achievements',
                    );
                }
            } catch (\Throwable $e) {
                Log::warning('Notification send failed: '.$e->getMessage(), ['user_id' => $userId]);
            }

            // Auto-issue certificate on post-test pass.
            $certificateUuid = null;
            if ($assessment->type === 'post_test' && $isPassed === true) {
                try {
                    $event->loadMissing('certificateTemplate');
                    if ($event->certificate_template_id) {
                        $existing = Certificate::query()
                            ->where('user_id', $userId)
                            ->where('training_event_id', $event->id)
                            ->first();

                        if ($existing) {
                            $certificateUuid = $existing->uuid;
                        } else {
                            $cert = Certificate::create([
                                'user_id'                => $userId,
                                'training_event_id'       => $event->id,
                                'certificate_template_id' => $event->certificate_template_id,
                                'certificate_number'      => (string) Str::uuid(),
                                'issued_at'               => now(),
                            ]);
                            $cert->update([
                                'certificate_number' => sprintf('CERT-CORPU-%s-%04d', now()->year, $cert->id),
                            ]);
                            $certificateUuid = $cert->uuid;

                            app(NotificationService::class)->send(
                                $userId,
                                'Sertifikat Diterbitkan',
                                "Sertifikat untuk \"{$event->title}\" sudah tersedia di halaman Sertifikat Anda.",
                                'certificate_issued',
                                '/certificates',
                            );
                        }
                    }
                } catch (\Throwable $e) {
                    Log::error('Auto-issue certificate failed: '.$e->getMessage(), ['user_id' => $userId, 'event_id' => $event->id]);
                }
            }

            return ApiResponse::success('Asesmen berhasil dikumpulkan.', [
                'score'            => $score,
                'is_passed'        => $isPassed,
                'passing_score'    => $assessment->passing_score,
                'has_essay'        => $hasEssay,
                'tokens_earned'    => $tokensEarned,
                'new_badges'       => array_map(fn($b) => ['name' => $b->name, 'icon' => $b->icon, 'color' => $b->color, 'tier' => $b->tier], $newBadges),
                'certificate_uuid' => $certificateUuid,
            ], 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }
}
