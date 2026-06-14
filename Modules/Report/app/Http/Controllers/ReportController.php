<?php

namespace Modules\Report\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Modules\KMS\Models\KmsAsset;
use Modules\TrainingEvent\Models\EventParticipant;
use Modules\TrainingEvent\Models\TrainingEvent;
use Modules\TrainingProposal\Models\TrainingProposal;

class ReportController extends Controller
{
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
            if ($opdId) $usersQ->where('opd_id', $opdId);
            $totalAsn    = $usersQ->count();
            $activeAsn   = (clone $usersQ)->where('is_active', true)->count();

            // Proposals
            $propQ = TrainingProposal::query();
            if ($opdId) $propQ->where('opd_id', $opdId);
            $proposals = (clone $propQ)->selectRaw("
                COUNT(*) as total,
                SUM(status = 'draft')     as draft,
                SUM(status = 'submitted') as submitted,
                SUM(status = 'approved')  as approved,
                SUM(status = 'rejected')  as rejected
            ")->first();

            // Events — scoped via proposals
            $eventQ = TrainingEvent::query();
            if ($opdId) {
                $proposalIds = TrainingProposal::where('opd_id', $opdId)->pluck('id');
                $eventQ->whereIn('training_proposal_id', $proposalIds);
            }
            $events = (clone $eventQ)->selectRaw("
                COUNT(*) as total,
                SUM(status = 'ongoing')   as ongoing,
                SUM(status = 'completed') as completed,
                SUM(status = 'scheduled') as scheduled
            ")->first();

            // Participants from this OPD's events
            $eventIds = (clone $eventQ)->pluck('id');
            $participants = EventParticipant::whereIn('training_event_id', $eventIds)
                ->selectRaw("
                    COUNT(*) as total,
                    SUM(completion_status = 'completed') as completed
                ")->first();

            // KMS
            $kmsQ = KmsAsset::query();
            if ($opdId) $kmsQ->where('opd_id', $opdId);
            $kms = (clone $kmsQ)->selectRaw("
                COUNT(*) as total,
                SUM(status = 'approved') as approved
            ")->first();

            return ApiResponse::success('OK', [
                'asn' => [
                    'total'  => $totalAsn,
                    'active' => $activeAsn,
                ],
                'proposals' => [
                    'total'     => (int) $proposals->total,
                    'draft'     => (int) $proposals->draft,
                    'submitted' => (int) $proposals->submitted,
                    'approved'  => (int) $proposals->approved,
                    'rejected'  => (int) $proposals->rejected,
                ],
                'events' => [
                    'total'     => (int) $events->total,
                    'ongoing'   => (int) $events->ongoing,
                    'completed' => (int) $events->completed,
                    'scheduled' => (int) $events->scheduled,
                ],
                'participants' => [
                    'total'     => (int) $participants->total,
                    'completed' => (int) $participants->completed,
                ],
                'kms' => [
                    'total'    => (int) $kms->total,
                    'approved' => (int) $kms->approved,
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
            if ($opdId) $q->where('opd_id', $opdId);

            return ApiResponse::success('OK', $q->paginate((int) $request->integer('per_page', 15)));
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
                $proposalIds = TrainingProposal::where('opd_id', $opdId)->pluck('id');
                $q->whereIn('training_proposal_id', $proposalIds);
            }

            return ApiResponse::success('OK', $q->paginate((int) $request->integer('per_page', 15)));
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    public function export(Request $request)
    {
        $opdId    = $this->opdId($request);
        $opdLabel = $request->user()->opd_name ?? 'Semua OPD';

        // Events with participant counts
        $eventQ = TrainingEvent::query()
            ->withCount('participants')
            ->latest('start_date');
        if ($opdId) {
            $proposalIds = TrainingProposal::where('opd_id', $opdId)->pluck('id');
            $eventQ->whereIn('training_proposal_id', $proposalIds);
        }
        $events = $eventQ->get();

        // Proposals
        $propQ = TrainingProposal::query()->with('proposer:id,name,nip')->latest();
        if ($opdId) $propQ->where('opd_id', $opdId);
        $proposals = $propQ->get();

        $filename = 'laporan-pelatihan-' . now()->format('Ymd') . '.csv';

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'no-cache, no-store',
        ];

        $callback = function () use ($events, $proposals, $opdLabel) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");

            // ── Report header ──────────────────────────────────────────────
            fputcsv($out, ['LAPORAN PELATIHAN CORPORATE UNIVERSITY']);
            fputcsv($out, ['OPD',             $opdLabel]);
            fputcsv($out, ['Tanggal Export',  now()->format('d M Y H:i')]);
            fputcsv($out, ['Total Event',     $events->count()]);
            fputcsv($out, ['Total Proposal',  $proposals->count()]);
            fputcsv($out, []);

            // ── Training Events ────────────────────────────────────────────
            fputcsv($out, ['== TRAINING EVENTS ==']);
            fputcsv($out, ['No', 'Nama Event', 'Tanggal Mulai', 'Tanggal Selesai', 'Kuota', 'Peserta Terdaftar', 'Status']);
            foreach ($events as $i => $e) {
                fputcsv($out, [
                    $i + 1,
                    $e->title,
                    $e->start_date ? $e->start_date->format('d M Y') : '—',
                    $e->end_date   ? $e->end_date->format('d M Y')   : '—',
                    $e->quota ?? '—',
                    $e->participants_count,
                    $e->status,
                ]);
            }
            fputcsv($out, []);

            // ── Proposals ─────────────────────────────────────────────────
            fputcsv($out, ['== PROPOSAL PELATIHAN ==']);
            fputcsv($out, ['No', 'Judul Proposal', 'Diusulkan oleh', 'NIP', 'Status', 'Tanggal Pengajuan']);
            foreach ($proposals as $i => $p) {
                fputcsv($out, [
                    $i + 1,
                    $p->title,
                    $p->proposer->name ?? '—',
                    $p->proposer->nip  ?? '—',
                    $p->status,
                    $p->created_at ? $p->created_at->format('d M Y') : '—',
                ]);
            }

            fclose($out);
        };

        return response()->stream($callback, 200, $headers);
    }
}
