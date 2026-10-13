<?php

namespace Modules\Report\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\LearningPath;
use App\Models\LearningPathEnrollment;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Modules\Certificate\Models\Certificate;
use Modules\KMS\Models\KmsAsset;
use Modules\TrainingEvent\Models\EventParticipant;
use Modules\TrainingEvent\Models\TrainingEvent;
use Modules\TrainingProposal\Models\TrainingProposal;

class ReportController extends Controller
{
    private function statusLabel(?string $status): string
    {
        return [
            'draft' => 'Draf',
            'submitted' => 'Diajukan',
            'approved' => 'Disetujui',
            'rejected' => 'Ditolak',
            'scheduled' => 'Terjadwal',
            'ongoing' => 'Berjalan',
            'completed' => 'Selesai',
            'cancelled' => 'Dibatalkan',
            'published' => 'Terbit',
        ][$status] ?? ($status ?: '—');
    }

    private function opdId(Request $request): ?int
    {
        return $request->user()->hasRole('admin-opd') ? (int) $request->user()->opd_id : null;
    }

    public function summary(Request $request)
    {
        try {
            $opdId = $this->opdId($request);

            // Users
            $usersQ = User::query()
                ->whereHas('roles', fn ($q) => $q->where('name', 'asn'));
            if ($opdId) {
                $usersQ->where('opd_id', $opdId);
            }
            $totalAsn = $usersQ->count();
            $activeAsn = (clone $usersQ)->where('is_active', true)->count();

            // Proposals
            $propQ = TrainingProposal::query();
            if ($opdId) {
                $propQ->where('opd_id', $opdId);
            }
            $proposals = (clone $propQ)->selectRaw("
                COUNT(*) as total,
                SUM(status = 'draft')     as draft,
                SUM(status = 'submitted') as submitted,
                SUM(status = 'approved')  as approved,
                SUM(status = 'rejected')  as rejected
            ")->first();

            // Events — scoped via proposals using subquery to avoid PHP array overhead.
            $eventQ = TrainingEvent::query();
            if ($opdId) {
                $propSubquery = TrainingProposal::where('opd_id', $opdId)->select('id');
                $eventQ->whereIn('training_proposal_id', $propSubquery);
            }
            $events = (clone $eventQ)->selectRaw("
                COUNT(*) as total,
                SUM(status = 'ongoing')   as ongoing,
                SUM(status = 'completed') as completed,
                SUM(status = 'scheduled') as scheduled
            ")->first();

            // Participants from this OPD's events — chain subquery from events.
            $eventSubquery = (clone $eventQ)->select('id');
            $participants = EventParticipant::whereIn('training_event_id', $eventSubquery)
                ->selectRaw("
                    COUNT(*) as total,
                    SUM(completion_status IN ('completed', 'approved') OR completed_at IS NOT NULL) as completed
                ")->first();

            // KMS
            $kmsQ = KmsAsset::query();
            if ($opdId) {
                $kmsQ->where('opd_id', $opdId);
            }
            $kms = (clone $kmsQ)->selectRaw("
                COUNT(*) as total,
                SUM(status = 'approved') as approved
            ")->first();

            $learningPathQ = LearningPath::query();
            $learningEnrollmentsQ = LearningPathEnrollment::query();
            if ($opdId) {
                $learningEnrollmentsQ->whereHas('user', fn ($q) => $q->where('opd_id', $opdId));
            }
            $learningPaths = (clone $learningPathQ)->selectRaw("
                COUNT(*) as total,
                SUM(status = 'published') as published,
                SUM(status = 'draft') as draft
            ")->first();
            $learningEnrollments = (clone $learningEnrollmentsQ)->selectRaw("
                COUNT(*) as total,
                SUM(completed_at IS NOT NULL) as completed
            ")->first();

            return ApiResponse::success('Data laporan berhasil diambil', [
                'asn' => [
                    'total' => $totalAsn,
                    'active' => $activeAsn,
                ],
                'proposals' => [
                    'total' => (int) $proposals->total,
                    'draft' => (int) $proposals->draft,
                    'submitted' => (int) $proposals->submitted,
                    'approved' => (int) $proposals->approved,
                    'rejected' => (int) $proposals->rejected,
                ],
                'events' => [
                    'total' => (int) $events->total,
                    'ongoing' => (int) $events->ongoing,
                    'completed' => (int) $events->completed,
                    'scheduled' => (int) $events->scheduled,
                ],
                'participants' => [
                    'total' => (int) $participants->total,
                    'completed' => (int) $participants->completed,
                ],
                'kms' => [
                    'total' => (int) $kms->total,
                    'approved' => (int) $kms->approved,
                ],
                'learning_paths' => [
                    'total' => (int) $learningPaths->total,
                    'published' => (int) $learningPaths->published,
                    'draft' => (int) $learningPaths->draft,
                    'enrollments' => (int) $learningEnrollments->total,
                    'completed' => (int) $learningEnrollments->completed,
                    'active' => max(0, (int) $learningEnrollments->total - (int) $learningEnrollments->completed),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

            return ApiResponse::error();
        }
    }

    public function proposals(Request $request)
    {
        try {
            $opdId = $this->opdId($request);
            $q = TrainingProposal::query()
                ->with('proposer:id,name,nip')
                ->latest();
            if ($opdId) {
                $q->where('opd_id', $opdId);
            }

            return ApiResponse::success('Data usulan berhasil diambil', $q->paginate((int) $request->integer('per_page', 15)));
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

            return ApiResponse::error();
        }
    }

    public function events(Request $request)
    {
        try {
            $opdId = $this->opdId($request);
            $q = TrainingEvent::query()->latest('start_date');
            if ($opdId) {
                $propSubquery = TrainingProposal::where('opd_id', $opdId)->select('id');
                $q->whereIn('training_proposal_id', $propSubquery);
            }

            return ApiResponse::success('Data kegiatan pelatihan berhasil diambil', $q->paginate((int) $request->integer('per_page', 15)));
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

            return ApiResponse::error();
        }
    }

    public function learningPaths(Request $request)
    {
        try {
            $opdId = $this->opdId($request);

            $query = LearningPath::query()
                ->with('certificateTemplate:id,name')
                ->withCount('steps')
                ->withCount([
                    'enrollments as enrollments_count' => function ($q) use ($opdId): void {
                        if ($opdId) {
                            $q->whereHas('user', fn ($user) => $user->where('opd_id', $opdId));
                        }
                    },
                    'enrollments as completed_enrollments_count' => function ($q) use ($opdId): void {
                        $q->whereNotNull('completed_at');
                        if ($opdId) {
                            $q->whereHas('user', fn ($user) => $user->where('opd_id', $opdId));
                        }
                    },
                ])
                ->selectSub(function ($query) use ($opdId): void {
                    $query->from('certificates')
                        ->selectRaw('COUNT(*)')
                        ->whereColumn('certificates.learning_path_id', 'learning_paths.id');

                    if ($opdId) {
                        $query->join('users', 'users.id', '=', 'certificates.user_id')
                            ->where('users.opd_id', $opdId);
                    }
                }, 'certificates_count')
                ->latest();

            return ApiResponse::success('Data kurikulum berhasil diambil', $query->paginate((int) $request->integer('per_page', 15)));
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

            return ApiResponse::error();
        }
    }

    public function learningPathEnrollments(Request $request, string $uuid)
    {
        try {
            $opdId = $this->opdId($request);
            $path = LearningPath::query()
                ->where('uuid', $uuid)
                ->withCount('steps')
                ->firstOrFail();

            $query = LearningPathEnrollment::query()
                ->where('learning_path_id', $path->id)
                ->with('user:id,name,nip,email,opd_id,opd_name,organization_unit_name')
                ->withCount('stepProgresses as completed_steps_count')
                ->latest('enrolled_at');

            if ($opdId) {
                $query->whereHas('user', fn ($user) => $user->where('opd_id', $opdId));
            }

            $paginated = $query->paginate((int) $request->integer('per_page', 20));
            $totalSteps = (int) $path->steps_count;
            $certificatesByUser = Certificate::query()
                ->where('learning_path_id', $path->id)
                ->whereIn('user_id', $paginated->getCollection()->pluck('user_id'))
                ->get(['uuid', 'user_id', 'certificate_number', 'verification_token', 'issued_at'])
                ->keyBy('user_id');

            $paginated->through(function (LearningPathEnrollment $enrollment) use ($totalSteps, $certificatesByUser) {
                $completedSteps = (int) $enrollment->completed_steps_count;
                $certificate = $certificatesByUser->get($enrollment->user_id);

                return [
                    'id' => $enrollment->id,
                    'user' => $enrollment->user,
                    'enrolled_at' => $enrollment->enrolled_at,
                    'completed_at' => $enrollment->completed_at,
                    'completed_steps_count' => $completedSteps,
                    'total_steps' => $totalSteps,
                    'progress' => $totalSteps > 0 ? (int) round(($completedSteps / $totalSteps) * 100) : 0,
                    'certificate' => $certificate ? [
                        'uuid' => $certificate->uuid,
                        'certificate_number' => $certificate->certificate_number,
                        'verification_token' => $certificate->verification_token,
                        'issued_at' => $certificate->issued_at?->toDateString(),
                    ] : null,
                ];
            });

            return ApiResponse::success('Data peserta kurikulum berhasil diambil', [
                'path' => [
                    'uuid' => $path->uuid,
                    'title' => $path->title,
                    'status' => $path->status,
                    'steps_count' => $totalSteps,
                ],
                'enrollments' => $paginated,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

            return ApiResponse::error();
        }
    }

    public function learningPathEnrollmentSteps(Request $request, string $uuid, int $enrollmentId)
    {
        try {
            $opdId = $this->opdId($request);
            $path = LearningPath::query()
                ->where('uuid', $uuid)
                ->with('steps')
                ->firstOrFail();

            $enrollment = LearningPathEnrollment::query()
                ->where('learning_path_id', $path->id)
                ->whereKey($enrollmentId)
                ->with(['user:id,name,nip,email,opd_id,opd_name,organization_unit_name', 'stepProgresses'])
                ->firstOrFail();

            if ($opdId && (int) $enrollment->user?->opd_id !== $opdId) {
                abort(404);
            }

            $progressByStep = $enrollment->stepProgresses->keyBy('step_id');

            $steps = $path->steps->values()->map(function ($step) use ($progressByStep) {
                $progress = $progressByStep->get($step->id);

                return [
                    'uuid' => $step->uuid,
                    'order' => $step->order,
                    'title' => $step->title,
                    'type' => $step->type,
                    'is_required' => $step->is_required,
                    'estimated_minutes' => $step->estimated_minutes,
                    'completed' => $progress !== null,
                    'completed_at' => $progress?->completed_at,
                ];
            });

            return ApiResponse::success('Data langkah peserta berhasil diambil', [
                'path' => [
                    'uuid' => $path->uuid,
                    'title' => $path->title,
                    'steps_count' => $path->steps->count(),
                ],
                'enrollment' => [
                    'id' => $enrollment->id,
                    'user' => $enrollment->user,
                    'enrolled_at' => $enrollment->enrolled_at,
                    'completed_at' => $enrollment->completed_at,
                ],
                'steps' => $steps,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

            return ApiResponse::error();
        }
    }

    public function export(Request $request)
    {
        $opdId = $this->opdId($request);
        $opdLabel = $request->user()->opd_name ?? 'Semua OPD';

        // Events with participant counts — use subquery instead of pluck array.
        $eventQ = TrainingEvent::query()
            ->withCount('participants')
            ->latest('start_date');
        if ($opdId) {
            $propSubquery = TrainingProposal::where('opd_id', $opdId)->select('id');
            $eventQ->whereIn('training_proposal_id', $propSubquery);
        }

        // Proposals
        $propQ = TrainingProposal::query()->with('proposer:id,name,nip')->latest();
        if ($opdId) {
            $propQ->where('opd_id', $opdId);
        }

        // Snapshot counts before streaming (cursor() is forward-only).
        $totalEvents = (clone $eventQ)->count();
        $totalProposals = (clone $propQ)->count();
        $learningEnrollmentsQ = LearningPathEnrollment::query();
        if ($opdId) {
            $learningEnrollmentsQ->whereHas('user', fn ($q) => $q->where('opd_id', $opdId));
        }
        $learningEnrollments = (clone $learningEnrollmentsQ)->selectRaw("
            COUNT(*) as total,
            SUM(completed_at IS NOT NULL) as completed
        ")->first();

        // cursor() streams rows one at a time — avoids loading all records into
        // PHP memory at once, which could cause timeouts or OOM on large datasets.
        $learningPathQ = LearningPath::query()
            ->with('certificateTemplate:id,name')
            ->withCount('steps')
            ->withCount([
                'enrollments as enrollments_count' => function ($q) use ($opdId): void {
                    if ($opdId) {
                        $q->whereHas('user', fn ($user) => $user->where('opd_id', $opdId));
                    }
                },
                'enrollments as completed_enrollments_count' => function ($q) use ($opdId): void {
                    $q->whereNotNull('completed_at');
                    if ($opdId) {
                        $q->whereHas('user', fn ($user) => $user->where('opd_id', $opdId));
                    }
                },
            ])
            ->selectSub(function ($query) use ($opdId): void {
                $query->from('certificates')
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('certificates.learning_path_id', 'learning_paths.id');

                if ($opdId) {
                    $query->join('users', 'users.id', '=', 'certificates.user_id')
                        ->where('users.opd_id', $opdId);
                }
            }, 'certificates_count')
            ->latest();

        $events = $eventQ->cursor();
        $proposals = $propQ->cursor();
        $learningPaths = $learningPathQ->cursor();

        $filename = 'laporan-pelatihan-'.now()->format('Ymd').'.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-cache, no-store',
        ];

        $callback = function () use ($events, $proposals, $learningPaths, $learningEnrollments, $opdLabel, $totalEvents, $totalProposals) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");

            // ── Report header ──────────────────────────────────────────────
            fputcsv($out, ['LAPORAN PELATIHAN CORPORATE UNIVERSITY']);
            fputcsv($out, ['OPD',             $opdLabel]);
            fputcsv($out, ['Tanggal Ekspor',  now()->format('d M Y H:i')]);
            fputcsv($out, ['Total Kegiatan',  $totalEvents]);
            fputcsv($out, ['Total Usulan',    $totalProposals]);
            fputcsv($out, ['Peserta Kurikulum', (int) $learningEnrollments->total]);
            fputcsv($out, ['Kurikulum Selesai', (int) $learningEnrollments->completed]);
            fputcsv($out, []);

            // ── Training Events ────────────────────────────────────────────
            fputcsv($out, ['== KEGIATAN PELATIHAN ==']);
            fputcsv($out, ['No', 'Nama Kegiatan', 'Tanggal Mulai', 'Tanggal Selesai', 'Kuota', 'Peserta Terdaftar', 'Status']);
            foreach ($events as $i => $e) {
                fputcsv($out, [
                    $i + 1,
                    $e->title,
                    $e->start_date ? $e->start_date->format('d M Y') : '—',
                    $e->end_date ? $e->end_date->format('d M Y') : '—',
                    $e->quota ?? '—',
                    $e->participants_count,
                    $this->statusLabel($e->status),
                ]);
            }
            fputcsv($out, []);

            // ── Proposals ─────────────────────────────────────────────────
            fputcsv($out, ['== USULAN PELATIHAN ==']);
            fputcsv($out, ['No', 'Judul Usulan', 'Diusulkan oleh', 'NIP', 'Status', 'Tanggal Pengajuan']);
            foreach ($proposals as $i => $p) {
                fputcsv($out, [
                    $i + 1,
                    $p->title,
                    $p->proposer->name ?? '—',
                    $p->proposer->nip ?? '—',
                    $this->statusLabel($p->status),
                    $p->created_at ? $p->created_at->format('d M Y') : '—',
                ]);
            }
            fputcsv($out, []);

            // ── Learning Paths ─────────────────────────────────────────────
            fputcsv($out, ['== KURIKULUM ==']);
            fputcsv($out, ['No', 'Nama Kurikulum', 'Status', 'Template Sertifikat', 'Langkah', 'Peserta', 'Selesai', 'Sertifikat', 'Tingkat Selesai']);
            foreach ($learningPaths as $i => $path) {
                $completionRate = $path->enrollments_count > 0
                    ? round(($path->completed_enrollments_count / $path->enrollments_count) * 100)
                    : 0;

                fputcsv($out, [
                    $i + 1,
                    $path->title,
                    $this->statusLabel($path->status),
                    $path->certificateTemplate?->name ?? 'Default',
                    $path->steps_count,
                    $path->enrollments_count,
                    $path->completed_enrollments_count,
                    $path->certificates_count,
                    $completionRate.'%',
                ]);
            }

            fclose($out);
        };

        return response()->stream($callback, 200, $headers);
    }
}
