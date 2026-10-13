<?php

namespace Modules\Dashboard\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $data = Cache::remember('dashboard.stats', 300, fn () => [
            'users' => User::query()->count(),
            'training_proposals' => DB::table('training_proposals')->count(),
            'training_events' => DB::table('training_events')->count(),
            'kms_assets' => DB::table('kms_assets')->count(),
            'certificates' => DB::table('certificates')->count(),
        ]);

        return ApiResponse::success('Dashboard retrieved', $data);
    }

    public function opdAdmin(Request $request)
    {
        $opdId = (int) $request->user()->opd_id;

        $data = Cache::remember("dashboard.opd.{$opdId}", 300, function () use ($opdId) {
            // Use subqueries instead of pluck('id') to avoid loading large ID arrays
            // into PHP memory and sending them back as a WHERE IN clause.
            $propSubquery = DB::table('training_proposals')->where('opd_id', $opdId)->select('id');
            $eventSubquery = DB::table('training_events')->whereIn('training_proposal_id', $propSubquery)->select('id');

            $asn = DB::table('users as u')
                ->join('model_has_roles as mr', 'mr.model_id', '=', 'u.id')
                ->join('roles as r', 'r.id', '=', 'mr.role_id')
                ->where('r.name', 'asn')
                ->where('u.opd_id', $opdId)
                ->selectRaw('COUNT(*) as total, SUM(u.is_active = 1) as active')
                ->first();

            $proposals = DB::table('training_proposals')
                ->where('opd_id', $opdId)
                ->selectRaw("
                    COUNT(*) as total,
                    SUM(status = 'draft')     as draft,
                    SUM(status = 'submitted') as submitted,
                    SUM(status = 'approved')  as approved,
                    SUM(status = 'rejected')  as rejected
                ")->first();

            $events = DB::table('training_events')
                ->whereIn('training_proposal_id', $propSubquery)
                ->selectRaw("
                    COUNT(*) as total,
                    SUM(status = 'ongoing')   as ongoing,
                    SUM(status = 'scheduled') as scheduled,
                    SUM(status = 'completed') as completed
                ")->first();

            $participants = DB::table('event_participants')
                ->whereIn('training_event_id', $eventSubquery)
                ->selectRaw("COUNT(*) as total, SUM(completion_status = 'completed') as completed")
                ->first();

            $kms = DB::table('kms_assets')
                ->where('opd_id', $opdId)
                ->selectRaw("COUNT(*) as total, SUM(status = 'approved') as approved")
                ->first();

            $recentProposals = DB::table('training_proposals as tp')
                ->leftJoin('users as u', 'u.id', '=', 'tp.proposed_by')
                ->where('tp.opd_id', $opdId)
                ->whereIn('tp.status', ['submitted', 'draft'])
                ->select(['tp.id', 'tp.title', 'tp.status', 'tp.created_at', 'u.name as proposer_name'])
                ->latest('tp.created_at')->limit(5)->get();

            $upcomingEvents = DB::table('training_events')
                ->whereIn('training_proposal_id', $propSubquery)
                ->whereIn('status', ['scheduled', 'ongoing'])
                ->select(['id', 'title', 'status', 'start_date', 'end_date', 'quota'])
                ->orderBy('start_date')->limit(5)->get();

            return [
                'asn' => ['total' => (int) $asn->total, 'active' => (int) $asn->active],
                'proposals' => [
                    'total' => (int) $proposals->total,
                    'draft' => (int) $proposals->draft,
                    'submitted' => (int) $proposals->submitted,
                    'approved' => (int) $proposals->approved,
                    'rejected' => (int) $proposals->rejected,
                    'recent' => $recentProposals,
                ],
                'events' => [
                    'total' => (int) $events->total,
                    'ongoing' => (int) $events->ongoing,
                    'scheduled' => (int) $events->scheduled,
                    'completed' => (int) $events->completed,
                    'upcoming' => $upcomingEvents,
                ],
                'participants' => [
                    'total' => (int) $participants->total,
                    'completed' => (int) $participants->completed,
                    'rate' => $participants->total > 0
                        ? round($participants->completed / $participants->total * 100, 1) : 0,
                ],
                'kms' => ['total' => (int) $kms->total, 'approved' => (int) $kms->approved],
            ];
        });

        return ApiResponse::success('OK', $data);
    }

    public function superAdmin()
    {
        $data = Cache::remember('dashboard.super_admin', 120, function () {
            // Users
            $userStats = DB::table('users')
                ->selectRaw('
                    COUNT(*) as total,
                    SUM(is_active = 1) as active,
                    SUM(is_active = 0) as inactive
                ')->first();

            $byRole = DB::table('model_has_roles as mr')
                ->join('roles as r', 'r.id', '=', 'mr.role_id')
                ->selectRaw('r.name as role, COUNT(*) as total')
                ->groupBy('r.name')
                ->get()
                ->keyBy('role');

            // Proposals
            $proposals = DB::table('training_proposals')
                ->selectRaw("
                    COUNT(*) as total,
                    SUM(status = 'submitted') as pending,
                    SUM(status = 'approved')  as approved,
                    SUM(status = 'rejected')  as rejected
                ")->first();

            $pendingProposals = DB::table('training_proposals as tp')
                ->leftJoin('users as u', 'u.id', '=', 'tp.proposed_by')
                ->leftJoin('opds as o', 'o.id', '=', 'tp.opd_id')
                ->where('tp.status', 'submitted')
                ->select(['tp.id', 'tp.title', 'tp.created_at',
                    'u.name as proposer_name', 'o.name as opd_name'])
                ->latest('tp.created_at')->limit(5)->get();

            // Events
            $events = DB::table('training_events')
                ->selectRaw("
                    COUNT(*) as total,
                    SUM(status = 'ongoing')   as ongoing,
                    SUM(status = 'scheduled') as scheduled,
                    SUM(status = 'completed') as completed
                ")->first();

            $recentEvents = DB::table('training_events as te')
                ->leftJoin('training_proposals as tp', 'tp.id', '=', 'te.training_proposal_id')
                ->leftJoin('opds as o', 'o.id', '=', 'tp.opd_id')
                ->select(['te.uuid', 'te.title', 'te.status', 'te.start_date', 'o.name as opd_name'])
                ->latest('te.created_at')->limit(5)->get();

            // Participants & completions
            $participants = DB::table('event_participants')
                ->selectRaw("
                    COUNT(*) as total,
                    SUM(completion_status = 'completed') as completed
                ")->first();

            // Assessments & scores
            $assessments = DB::table('assessment_submissions')
                ->whereNotNull('score')
                ->selectRaw('
                    COUNT(*) as total,
                    ROUND(AVG(score), 1) as avg_score,
                    SUM(is_passed = 1) as passed
                ')->first();

            // Wallet
            $wallets = DB::table('wallets')
                ->selectRaw('
                    COUNT(*) as total,
                    SUM(balance) as total_balance,
                    ROUND(AVG(balance), 0) as avg_balance
                ')->first();

            $tokenVolume = DB::table('wallet_transactions')
                ->selectRaw("
                    SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credited,
                    SUM(CASE WHEN type = 'debit'  THEN amount ELSE 0 END) as total_debited,
                    COUNT(*) as total_txn
                ")->first();

            // Store
            $store = DB::table('store_purchases')
                ->selectRaw("
                    COUNT(*) as total,
                    SUM(status = 'pending')   as pending,
                    SUM(status = 'fulfilled') as fulfilled,
                    SUM(tokens_spent) as tokens_spent
                ")->first();

            // Badges
            $badges = DB::table('user_badges')
                ->selectRaw('COUNT(*) as total_awarded')->first();

            $topBadges = DB::table('user_badges as ub')
                ->join('badges as b', 'b.id', '=', 'ub.badge_id')
                ->selectRaw('b.name, b.icon, b.color, COUNT(*) as count')
                ->groupBy('b.id', 'b.name', 'b.icon', 'b.color')
                ->orderByDesc('count')->limit(5)->get();

            // Top scorers preview
            $topScorers = DB::table('assessment_submissions as s')
                ->join('users as u', 'u.id', '=', 's.user_id')
                ->whereNotNull('s.score')
                ->groupBy('u.id', 'u.name', 'u.nip')
                ->selectRaw('u.id, u.name, u.nip, ROUND(AVG(s.score),1) as avg_score, COUNT(*) as submissions')
                ->orderByDesc('avg_score')->limit(5)->get()
                ->map(fn ($r, $i) => (object) array_merge((array) $r, ['rank' => $i + 1]));

            // KMS
            $kms = DB::table('kms_assets')
                ->selectRaw("COUNT(*) as total, SUM(status = 'approved') as approved")
                ->first();

            return [
                'users' => [
                    'total' => (int) $userStats->total,
                    'active' => (int) $userStats->active,
                    'inactive' => (int) $userStats->inactive,
                    'asn' => (int) ($byRole['asn']->total ?? 0),
                    'facilitators' => (int) (
                        ($byRole['fasilitator-internal']->total ?? 0) +
                        ($byRole['fasilitator-eksternal']->total ?? 0)
                    ),
                    'admins' => (int) ($byRole['admin-opd']->total ?? 0),
                ],
                'proposals' => [
                    'total' => (int) $proposals->total,
                    'pending' => (int) $proposals->pending,
                    'approved' => (int) $proposals->approved,
                    'rejected' => (int) $proposals->rejected,
                    'recent' => $pendingProposals,
                ],
                'events' => [
                    'total' => (int) $events->total,
                    'ongoing' => (int) $events->ongoing,
                    'scheduled' => (int) $events->scheduled,
                    'completed' => (int) $events->completed,
                    'recent' => $recentEvents,
                ],
                'participants' => [
                    'total' => (int) $participants->total,
                    'completed' => (int) $participants->completed,
                    'rate' => $participants->total > 0
                        ? round($participants->completed / $participants->total * 100, 1) : 0,
                ],
                'assessments' => [
                    'total' => (int) $assessments->total,
                    'avg_score' => (float) $assessments->avg_score,
                    'passed' => (int) $assessments->passed,
                ],
                'wallet' => [
                    'total_wallets' => (int) $wallets->total,
                    'total_balance' => (int) $wallets->total_balance,
                    'avg_balance' => (int) $wallets->avg_balance,
                    'total_credited' => (int) $tokenVolume->total_credited,
                    'total_debited' => (int) $tokenVolume->total_debited,
                    'total_txn' => (int) $tokenVolume->total_txn,
                ],
                'store' => [
                    'total' => (int) $store->total,
                    'pending' => (int) $store->pending,
                    'fulfilled' => (int) $store->fulfilled,
                    'tokens_spent' => (int) $store->tokens_spent,
                ],
                'badges' => [
                    'total_awarded' => (int) $badges->total_awarded,
                    'top' => $topBadges,
                ],
                'kms' => [
                    'total' => (int) $kms->total,
                    'approved' => (int) $kms->approved,
                ],
                'top_scorers' => $topScorers,
            ];
        });

        return ApiResponse::success('Dashboard retrieved', $data);
    }
}
