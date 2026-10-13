<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SearchController extends Controller
{
    public function __invoke(Request $request)
    {
        $q     = trim($request->string('q'));
        $limit = min((int) $request->integer('limit', 5), 10);

        if (strlen($q) < 2) {
            return ApiResponse::success('OK', []);
        }

        $like   = "%{$q}%";
        $user   = $request->user();
        $isSuper  = $user->hasRole('super-admin');
        $isAdminOpd = $user->hasRole('admin-opd');
        $opdId  = $isAdminOpd ? (int) $user->opd_id : null;

        $results = collect();

        // ── Learning Paths ─────────────────────────────────────────────────────
        $lp = DB::table('learning_paths')
            ->where('title', 'like', $like)
            ->where('status', 'published')
            ->select(['uuid', 'title', 'description'])
            ->limit($limit)->get()
            ->map(fn ($r) => [
                'type'  => 'learning_path',
                'label' => 'Kurikulum',
                'title' => $r->title,
                'sub'   => $r->description ? mb_strimwidth($r->description, 0, 80, '…') : null,
                'path'  => '/learning-paths',
            ]);
        $results = $results->merge($lp);

        // ── Training Events ────────────────────────────────────────────────────
        $evQ = DB::table('training_events')
            ->where('title', 'like', $like)
            ->whereIn('status', ['scheduled', 'ongoing', 'completed']);
        if ($opdId) {
            $propIds = DB::table('training_proposals')->where('opd_id', $opdId)->pluck('id');
            $evQ->whereIn('training_proposal_id', $propIds);
        }
        $events = $evQ->select(['uuid', 'title', 'status', 'start_date'])
            ->orderByDesc('start_date')->limit($limit)->get()
            ->map(fn ($r) => [
                'type'  => 'event',
                'label' => 'Training Event',
                'title' => $r->title,
                'sub'   => $r->status . ($r->start_date ? ' · ' . date('d M Y', strtotime($r->start_date)) : ''),
                'path'  => '/training-events',
            ]);
        $results = $results->merge($events);

        // ── Proposals ─────────────────────────────────────────────────────────
        $prQ = DB::table('training_proposals')->where('title', 'like', $like);
        if ($opdId) $prQ->where('opd_id', $opdId);
        $proposals = $prQ->select(['id', 'title', 'status'])
            ->orderByDesc('created_at')->limit($limit)->get()
            ->map(fn ($r) => [
                'type'  => 'proposal',
                'label' => 'Proposal',
                'title' => $r->title,
                'sub'   => ucfirst($r->status),
                'path'  => '/training-proposals',
            ]);
        $results = $results->merge($proposals);

        // ── KMS Assets ────────────────────────────────────────────────────────
        $kmsQ = DB::table('kms_assets')
            ->where(function ($q2) use ($like) {
                $q2->where('title', 'like', $like)->orWhere('description', 'like', $like);
            })
            ->where('status', 'approved');
        if (! $isSuper) {
            $kmsQ->where(function ($visible) use ($user) {
                $visible->where('uploaded_by', $user->id)
                    ->orWhere('visibility', 'public')
                    ->orWhere(function ($internal) use ($user) {
                        $internal->where('visibility', 'internal')
                            ->where(function ($scope) use ($user) {
                                $scope->where('internal_scope', 'all');

                                if ($user->opd_id) {
                                    $scope->orWhereExists(function ($exists) use ($user) {
                                        $exists->selectRaw('1')
                                            ->from('kms_asset_opd')
                                            ->whereColumn('kms_asset_opd.kms_asset_id', 'kms_assets.id')
                                            ->where('kms_asset_opd.opd_id', $user->opd_id);
                                    });
                                }
                            });
                    });
            });
        }
        $kms = $kmsQ->select(['id', 'title', 'visibility'])
            ->orderByDesc('created_at')->limit($limit)->get()
            ->map(fn ($r) => [
                'type'  => 'kms',
                'label' => 'Aset KMS',
                'title' => $r->title,
                'sub'   => $r->visibility === 'public' ? 'Publik' : 'Internal',
                'path'  => '/kms-assets',
            ]);
        $results = $results->merge($kms);

        // ── Blog Posts ─────────────────────────────────────────────────────────
        $blog = DB::table('blog_posts')
            ->where('title', 'like', $like)
            ->where('status', 'published')
            ->select(['slug', 'title'])
            ->orderByDesc('published_at')->limit(3)->get()
            ->map(fn ($r) => [
                'type'  => 'blog',
                'label' => 'Artikel',
                'title' => $r->title,
                'sub'   => null,
                'path'  => "/artikel/{$r->slug}",
            ]);
        $results = $results->merge($blog);

        // ── Users (super-admin or admin-opd only) ──────────────────────────────
        if ($isSuper || $isAdminOpd) {
            $uQ = DB::table('users')
                ->where(function ($q2) use ($like) {
                    $q2->where('name', 'like', $like)->orWhere('nip', 'like', $like);
                });
            if ($opdId) $uQ->where('opd_id', $opdId);
            $users = $uQ->select(['id', 'name', 'nip'])
                ->limit($limit)->get()
                ->map(fn ($r) => [
                    'type'  => 'user',
                    'label' => 'Pengguna',
                    'title' => $r->name,
                    'sub'   => $r->nip ?? null,
                    'path'  => '/users',
                ]);
            $results = $results->merge($users);
        }

        return ApiResponse::success('OK', $results->take(15)->values());
    }
}
