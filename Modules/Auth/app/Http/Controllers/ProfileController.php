<?php

namespace Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /** GET /api/profile */
    public function show(Request $request)
    {
        try {
            $user = $request->user();

            // Training stats
            $eventsRow = DB::table('event_participants as ep')
                ->join('training_events as te', 'te.id', '=', 'ep.training_event_id')
                ->where('ep.user_id', $user->id)
                ->selectRaw("
                    COUNT(*) as total,
                    SUM(ep.completion_status = 'completed') as completed
                ")->first();

            // Assessment stats
            $assessRow = DB::table('assessment_submissions')
                ->where('user_id', $user->id)
                ->whereNotNull('score')
                ->selectRaw("
                    COUNT(*) as total,
                    ROUND(AVG(score), 1) as avg_score,
                    MAX(score) as best_score,
                    SUM(is_passed = 1) as passed
                ")->first();

            // Recent events
            $recentEvents = DB::table('event_participants as ep')
                ->join('training_events as te', 'te.id', '=', 'ep.training_event_id')
                ->where('ep.user_id', $user->id)
                ->select([
                    'te.uuid', 'te.title', 'te.status',
                    'te.start_date', 'te.end_date',
                    'ep.completion_status',
                ])
                ->latest('te.start_date')
                ->limit(5)
                ->get();

            // Wallet
            $wallet = DB::table('wallets')->where('user_id', $user->id)
                ->select(['balance', 'updated_at'])->first();

            // Badges
            $badges = DB::table('user_badges as ub')
                ->join('badges as b', 'b.id', '=', 'ub.badge_id')
                ->where('ub.user_id', $user->id)
                ->select(['b.name', 'b.icon', 'b.color', 'b.background', 'b.tier', 'ub.awarded_at'])
                ->orderBy('b.sort_order')
                ->get();

            // Streak
            $streak = DB::table('user_streaks')
                ->where('user_id', $user->id)
                ->first();

            // Role(s)
            $roles = $user->getRoleNames();

            return ApiResponse::success('Profile retrieved', [
                'user' => [
                    'id'                    => $user->id,
                    'uuid'                  => $user->uuid,
                    'name'                  => $user->name,
                    'nip'                   => $user->nip,
                    'email'                 => $user->email,
                    'opd_name'              => $user->opd_name,
                    'organization_unit_name'=> $user->organization_unit_name,
                    'position_name'         => $user->position_name,
                    'employee_status'       => $user->employee_status,
                    'user_type'             => $user->user_type,
                    'photo_url'             => self::resolvePhotoUrl($user->photo_url),
                    'is_active'             => $user->is_active,
                    'last_login_at'         => $user->last_login_at,
                    'created_at'            => $user->created_at,
                    'roles'                 => $roles,
                ],
                'stats' => [
                    'events_total'     => (int) ($eventsRow->total ?? 0),
                    'events_completed' => (int) ($eventsRow->completed ?? 0),
                    'assessments_total'=> (int) ($assessRow->total ?? 0),
                    'avg_score'        => (float) ($assessRow->avg_score ?? 0),
                    'best_score'       => (int) ($assessRow->best_score ?? 0),
                    'passed_count'     => (int) ($assessRow->passed ?? 0),
                ],
                'wallet' => [
                    'balance' => (int) ($wallet?->balance ?? 0),
                ],
                'badges'        => $badges,
                'streak'        => $streak,
                'recent_events' => $recentEvents,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    /** PUT /api/profile */
    public function update(Request $request)
    {
        $data = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'email'         => 'sometimes|nullable|email|unique:users,email,'.$request->user()->id,
            'position_name' => 'sometimes|nullable|string|max:255',
        ]);

        try {
            $request->user()->update($data);
            return ApiResponse::success('Profil diperbarui.', $request->user()->fresh());
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    /** POST /api/profile/avatar */
    public function uploadAvatar(Request $request)
    {
        $request->validate(['avatar' => 'required|image|max:2048']);

        try {
            $user = $request->user();

            // Delete old avatar if it was stored locally
            if ($user->photo_url && str_contains($user->photo_url, '/storage/avatars/')) {
                $oldPath = 'avatars/'.basename($user->photo_url);
                Storage::disk('public')->delete($oldPath);
            }

            $path = $request->file('avatar')->storeAs(
                'avatars',
                $user->uuid.'.'.$request->file('avatar')->extension(),
                'public',
            );

            $url = asset('storage/'.$path);
            $user->update(['photo_url' => $url]);

            return ApiResponse::success('Avatar diperbarui.', ['photo_url' => $url]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    /** POST /api/profile/change-password */
    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (! $user->password || ! Hash::check($data['current_password'], $user->password)) {
            return ApiResponse::error('Password lama tidak sesuai.', 422);
        }

        $user->update(['password' => Hash::make($data['password'])]);
        return ApiResponse::success('Password berhasil diubah.');
    }

    /**
     * Return null for URLs that use placeholder/unresolvable domains so the
     * frontend falls back to the generated default avatar instead of a 404.
     */
    private static function resolvePhotoUrl(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        $host = parse_url($url, PHP_URL_HOST);

        // Reject placeholder hostnames that have no real DNS record
        $blocked = ['domain', 'example.com', 'example.org', 'localhost', '127.0.0.1'];
        if (! $host || in_array(strtolower($host), $blocked, true)) {
            return null;
        }

        return $url;
    }
}
