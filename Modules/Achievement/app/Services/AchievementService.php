<?php

namespace Modules\Achievement\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Modules\Achievement\Models\Badge;
use Modules\Achievement\Models\UserStreak;

class AchievementService
{
    /**
     * Call after any user activity. Returns array of newly awarded Badge objects.
     */
    public function checkAndAward(User $user, array $context = []): array
    {
        $this->updateStreak($user);

        $alreadyOwned = DB::table('user_badges')
            ->where('user_id', $user->id)
            ->pluck('badge_id')
            ->all();

        $badges = Badge::where('is_active', true)
            ->when(count($alreadyOwned), fn($q) => $q->whereNotIn('id', $alreadyOwned))
            ->orderBy('sort_order')
            ->get();

        $stats = $this->userStats($user);
        $newlyAwarded = [];

        foreach ($badges as $badge) {
            if ($this->meets($badge, $stats, $user)) {
                DB::table('user_badges')->insertOrIgnore([
                    'user_id'    => $user->id,
                    'badge_id'   => $badge->id,
                    'awarded_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $newlyAwarded[] = $badge;
            }
        }

        return $newlyAwarded;
    }

    /**
     * Update streak for today's activity.
     */
    public function updateStreak(User $user): UserStreak
    {
        $streak = UserStreak::firstOrNew(['user_id' => $user->id]);
        $today  = now()->toDateString();

        if ($streak->last_activity_date?->toDateString() === $today) {
            $streak->save(); // already counted today
            return $streak;
        }

        $yesterday = now()->subDay()->toDateString();
        if ($streak->last_activity_date?->toDateString() === $yesterday) {
            $streak->current_streak += 1;
        } else {
            $streak->current_streak = 1; // broken or first
        }

        $streak->longest_streak   = max($streak->longest_streak, $streak->current_streak);
        $streak->last_activity_date = $today;
        $streak->save();

        return $streak;
    }

    /**
     * Aggregate stats used for criteria evaluation.
     */
    private function userStats(User $user): array
    {
        $submissions = DB::table('assessment_submissions')
            ->where('user_id', $user->id)
            ->whereNotNull('score')
            ->select([
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN is_passed = 1 THEN 1 ELSE 0 END) as passed'),
                DB::raw('MAX(score) as best_score'),
            ])
            ->first();

        $tokensEarned = DB::table('wallet_transactions')
            ->where('user_id', $user->id)
            ->where('type', 'credit')
            ->sum('amount');

        $purchases = DB::table('store_purchases')
            ->where('user_id', $user->id)
            ->count();

        $streak = UserStreak::where('user_id', $user->id)->first();

        return [
            'submission_count' => (int) ($submissions->total ?? 0),
            'pass_count'       => (int) ($submissions->passed ?? 0),
            'best_score'       => (int) ($submissions->best_score ?? 0),
            'streak_days'      => (int) ($streak?->current_streak ?? 0),
            'tokens_earned'    => (int) $tokensEarned,
            'store_purchase'   => (int) $purchases,
        ];
    }

    private function meets(Badge $badge, array $stats, User $user): bool
    {
        return match ($badge->criteria_type) {
            'submission_count' => $stats['submission_count'] >= $badge->criteria_value,
            'pass_count'       => $stats['pass_count']       >= $badge->criteria_value,
            'score_gte'        => $stats['best_score']        >= $badge->criteria_value,
            'score_perfect'    => $stats['best_score']        >= 100,
            'streak_days'      => $stats['streak_days']       >= $badge->criteria_value,
            'tokens_earned'    => $stats['tokens_earned']     >= $badge->criteria_value,
            'store_purchase'   => $stats['store_purchase']    >= $badge->criteria_value,
            default            => false,
        };
    }

    /**
     * Return all badges with earned status for a user.
     */
    public function badgesForUser(User $user): array
    {
        $earned = DB::table('user_badges')
            ->where('user_id', $user->id)
            ->pluck('awarded_at', 'badge_id');

        return Badge::where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(function (Badge $b) use ($earned) {
                $b->earned      = isset($earned[$b->id]);
                $b->awarded_at  = $earned[$b->id] ?? null;
                return $b;
            })
            ->all();
    }

    /**
     * Leaderboard: top users by badge count + tier points.
     */
    public function leaderboard(int $limit = 15): array
    {
        $tierPoints = ['platinum' => 8, 'gold' => 4, 'silver' => 2, 'bronze' => 1];

        $rows = DB::table('user_badges as ub')
            ->join('users as u', 'u.id', '=', 'ub.user_id')
            ->join('badges as b', 'b.id', '=', 'ub.badge_id')
            ->leftJoin('opds as o', 'o.id', '=', 'u.opd_id')
            ->select([
                'u.id as user_id',
                'u.name',
                'u.nip',
                DB::raw('COALESCE(o.name, u.opd_name, \'\') as opd_name'),
                DB::raw('COUNT(ub.id) as badge_count'),
                DB::raw('SUM(CASE b.tier WHEN \'platinum\' THEN 8 WHEN \'gold\' THEN 4 WHEN \'silver\' THEN 2 ELSE 1 END) as score'),
                DB::raw('SUM(CASE WHEN b.tier = \'platinum\' THEN 1 ELSE 0 END) as platinum_count'),
                DB::raw('SUM(CASE WHEN b.tier = \'gold\' THEN 1 ELSE 0 END) as gold_count'),
                DB::raw('SUM(CASE WHEN b.tier = \'silver\' THEN 1 ELSE 0 END) as silver_count'),
                DB::raw('SUM(CASE WHEN b.tier = \'bronze\' THEN 1 ELSE 0 END) as bronze_count'),
            ])
            ->groupBy('u.id', 'u.name', 'u.nip', 'o.name', 'u.opd_name')
            ->orderByDesc('score')
            ->orderByDesc('badge_count')
            ->limit($limit)
            ->get()
            ->map(function ($row, $i) { $row->rank = $i + 1; return $row; })
            ->all();

        return $rows;
    }

    public function streakForUser(User $user): ?UserStreak
    {
        return UserStreak::where('user_id', $user->id)->first();
    }
}
