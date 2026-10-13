<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Services\LearningPathProgressService;
use Modules\Achievement\Services\AchievementService;
use Modules\Certificate\Models\Certificate;
use Modules\Notification\Services\NotificationService;
use Modules\TrainingEvent\Models\EventAssessment;
use Modules\TrainingEvent\Models\TrainingEvent;
use Modules\Wallet\Services\WalletService;

/**
 * Process all post-assessment side effects asynchronously.
 *
 * Moves wallet credit, badge check, notifications, and certificate
 * auto-issuance out of the HTTP request so the user gets a fast response.
 */
class ProcessAssessmentRewards implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Retry up to 3 times before marking as failed. */
    public int $tries = 3;

    /** Do not retry sooner than 30 seconds after a failure. */
    public int $backoff = 30;

    /**
     * Unique key based on submission ID — prevents duplicate side effects
     * (double notifications, double badge awards) when the queue worker
     * retries a failed job.
     */
    public function uniqueId(): string
    {
        return (string) $this->submissionId;
    }

    /**
     * Keep the unique lock for 5 minutes. If the job does not complete
     * within this window it will be allowed to retry once the lock expires.
     */
    public int $uniqueFor = 300;

    public function __construct(
        public readonly int $userId,
        public readonly int $submissionId,
        public readonly ?int $score,
        public readonly ?bool $isPassed,
        public readonly int $assessmentId,
        public readonly int $trainingEventId,
        public readonly string $assessmentTitle,
    ) {}

    public function handle(
        WalletService $walletService,
        AchievementService $achievementService,
        NotificationService $notificationService,
        LearningPathProgressService $learningPathProgressService,
    ): void {
        $user = User::find($this->userId);
        if (! $user) {
            return;
        }

        // ── 1. Credit wallet tokens ────────────────────────────────────────────
        $tokensEarned = 0;
        if ($this->score !== null && $this->score > 0) {
            try {
                $tokens = $walletService->tokensFromScore($this->score);
                if ($tokens > 0) {
                    $txn = $walletService->credit(
                        $this->userId,
                        $tokens,
                        "Skor asesmen: {$this->assessmentTitle} ({$this->score} poin)",
                        'assessment_submission',
                        $this->submissionId,
                    );
                    if ($txn !== null) {
                        $tokensEarned = $tokens;
                    }
                }
            } catch (\InvalidArgumentException $e) {
                Log::warning('Wallet credit rejected in job', ['user_id' => $this->userId, 'message' => $e->getMessage()]);
            } catch (\RuntimeException $e) {
                Log::warning('Wallet credit failed in job', ['user_id' => $this->userId, 'message' => $e->getMessage()]);
            }
        }

        // ── 2. Check and award badges ──────────────────────────────────────────
        $newBadges = [];
        try {
            $newBadges = $achievementService->checkAndAward($user);
        } catch (\Throwable $e) {
            Log::warning('Achievement check failed in job', ['user_id' => $this->userId, 'message' => $e->getMessage()]);
        }

        // ── 3. Send notifications ──────────────────────────────────────────────
        try {
            $scoreLabel = $this->score !== null ? "{$this->score}/100" : 'menunggu penilaian';
            $passLabel = $this->isPassed ? '✓ Lulus' : '✗ Belum lulus';
            $tokenNote = $tokensEarned > 0 ? ". Anda mendapat {$tokensEarned} token." : '';

            $notificationService->send(
                $this->userId,
                "Asesmen Selesai: {$this->assessmentTitle}",
                "Nilai Anda: {$scoreLabel} — {$passLabel}{$tokenNote}",
                'assessment_result',
                '/wallet',
            );

            foreach ($newBadges as $badge) {
                $notificationService->send(
                    $this->userId,
                    "Badge Baru: {$badge->name}",
                    "Selamat! Anda meraih badge \"{$badge->name}\" ({$badge->tier}).",
                    'badge_earned',
                    '/achievements',
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Notification send failed in job', ['user_id' => $this->userId, 'message' => $e->getMessage()]);
        }

        // ── 4. Auto-issue certificate on post_test pass ────────────────────────
        if ($this->isPassed !== true) {
            return;
        }

        $learningPathProgressService->completeReferencedSteps('quiz', (string) $this->assessmentId, $this->userId);

        try {
            $assessment = EventAssessment::find($this->assessmentId);
            if (! $assessment || $assessment->type !== 'post_test') {
                return;
            }

            $event = TrainingEvent::find($this->trainingEventId);
            if (! $event || ! $event->certificate_template_id) {
                return;
            }

            $existing = Certificate::query()
                ->where('user_id', $this->userId)
                ->where('training_event_id', $this->trainingEventId)
                ->first();

            if ($existing) {
                return;
            }

            $cert = Certificate::create([
                'user_id' => $this->userId,
                'training_event_id' => $this->trainingEventId,
                'certificate_template_id' => $event->certificate_template_id,
                'certificate_number' => (string) Str::uuid(),
                'issued_at' => now(),
            ]);

            $cert->update([
                'certificate_number' => sprintf('CERT-CORPU-%s-%04d', now()->year, $cert->id),
            ]);

            $notificationService->send(
                $this->userId,
                'Sertifikat Diterbitkan',
                "Sertifikat untuk \"{$event->title}\" sudah tersedia di halaman Sertifikat Anda.",
                'certificate_issued',
                '/certificates',
            );
        } catch (\Throwable $e) {
            Log::error('Auto-issue certificate failed in job', [
                'user_id' => $this->userId,
                'event_id' => $this->trainingEventId,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
