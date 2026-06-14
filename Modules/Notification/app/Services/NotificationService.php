<?php

namespace Modules\Notification\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class NotificationService
{
    /**
     * Send a notification to one user.
     */
    public function send(
        int    $userId,
        string $title,
        string $message,
        string $type  = 'system',
        ?string $link = null,
    ): void {
        try {
            DB::table('app_notifications')->insert([
                'uuid'       => (string) Str::uuid(),
                'user_id'    => $userId,
                'title'      => $title,
                'message'    => $message,
                'channel'    => 'in-app',
                'type'       => $type,
                'link'       => $link,
                'read_at'    => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('NotificationService::send failed: '.$e->getMessage(), [
                'user_id' => $userId, 'type' => $type,
            ]);
        }
    }

    /**
     * Send to multiple users at once.
     */
    public function sendMany(
        array  $userIds,
        string $title,
        string $message,
        string $type   = 'system',
        ?string $link  = null,
    ): void {
        if (empty($userIds)) return;
        $now  = now();
        $rows = array_map(fn ($uid) => [
            'uuid'       => (string) Str::uuid(),
            'user_id'    => $uid,
            'title'      => $title,
            'message'    => $message,
            'channel'    => 'in-app',
            'type'       => $type,
            'link'       => $link,
            'read_at'    => null,
            'created_at' => $now,
            'updated_at' => $now,
        ], array_unique($userIds));

        try {
            foreach (array_chunk($rows, 100) as $chunk) {
                DB::table('app_notifications')->insert($chunk);
            }
        } catch (\Throwable $e) {
            Log::warning('NotificationService::sendMany failed: '.$e->getMessage());
        }
    }
}
