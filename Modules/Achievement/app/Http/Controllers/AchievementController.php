<?php

namespace Modules\Achievement\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Modules\Achievement\Models\Badge;
use Modules\Achievement\Services\AchievementService;

class AchievementController extends Controller
{
    public function __construct(private readonly AchievementService $service) {}

    /** GET /api/achievements/badges — all badges with earned status for current user */
    public function myBadges(Request $request)
    {
        $badges = $this->service->badgesForUser($request->user());
        $streak = $this->service->streakForUser($request->user());

        return ApiResponse::success('Data retrieved', [
            'badges' => $badges,
            'streak' => $streak,
        ]);
    }

    /** GET /api/achievements/leaderboard — badge leaderboard */
    public function leaderboard()
    {
        return ApiResponse::success('Data retrieved', $this->service->leaderboard(15));
    }

    /** GET /api/achievements/all-badges — list of all badge definitions (admin) */
    public function allBadges()
    {
        return ApiResponse::success('Data retrieved', Badge::orderBy('sort_order')->get());
    }

    /** POST /api/achievements/badges — create badge (super-admin) */
    public function storeBadge(Request $request)
    {
        $data = $request->validate([
            'name'            => 'required|string|max:100',
            'slug'            => 'required|string|max:100|unique:badges,slug',
            'description'     => 'nullable|string',
            'icon'            => 'required|string|max:50',
            'color'           => 'required|string|max:20',
            'background'      => 'required|string|max:20',
            'tier'            => 'required|in:bronze,silver,gold,platinum',
            'criteria_type'   => 'required|in:submission_count,pass_count,score_gte,score_perfect,streak_days,tokens_earned,store_purchase',
            'criteria_value'  => 'required|integer|min:1',
            'sort_order'      => 'nullable|integer|min:0',
        ]);

        $badge = Badge::create($data);
        return ApiResponse::success('Badge created', $badge, 201);
    }

    /** PUT /api/achievements/badges/{badge} — update badge (super-admin) */
    public function updateBadge(Request $request, Badge $badge)
    {
        $data = $request->validate([
            'name'            => 'sometimes|string|max:100',
            'description'     => 'nullable|string',
            'icon'            => 'sometimes|string|max:50',
            'color'           => 'sometimes|string|max:20',
            'background'      => 'sometimes|string|max:20',
            'tier'            => 'sometimes|in:bronze,silver,gold,platinum',
            'criteria_type'   => 'sometimes|in:submission_count,pass_count,score_gte,score_perfect,streak_days,tokens_earned,store_purchase',
            'criteria_value'  => 'sometimes|integer|min:1',
            'is_active'       => 'sometimes|boolean',
            'sort_order'      => 'sometimes|integer|min:0',
        ]);

        $badge->update($data);
        return ApiResponse::success('Badge updated', $badge);
    }

    /** POST /api/achievements/award — manually award badge to user (super-admin) */
    public function award(Request $request)
    {
        $data = $request->validate([
            'user_id'  => 'required|exists:users,id',
            'badge_id' => 'required|exists:badges,id',
        ]);

        \Illuminate\Support\Facades\DB::table('user_badges')->insertOrIgnore([
            'user_id'    => $data['user_id'],
            'badge_id'   => $data['badge_id'],
            'awarded_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::success('Badge awarded');
    }

    /** GET /api/achievements/user/{userId} — badges for a specific user (admin) */
    public function userBadges(int $userId)
    {
        $user = \App\Models\User::findOrFail($userId);
        $badges = $this->service->badgesForUser($user);
        $streak = $this->service->streakForUser($user);

        return ApiResponse::success('Data retrieved', [
            'badges' => $badges,
            'streak' => $streak,
        ]);
    }
}
