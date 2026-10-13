<?php

namespace Modules\Notification\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Modules\Notification\Models\AppNotification;

class AppNotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = AppNotification::where('user_id', $request->user()->id)
            ->latest()
            ->paginate((int) $request->integer('per_page', 20));

        $notifications->through(fn ($n) => [
            'id'         => $n->id,
            'uuid'       => $n->uuid,
            'title'      => $n->title,
            'message'    => $n->message,
            'type'       => $n->type ?? 'system',
            'link'       => $n->link,
            'channel'    => $n->channel,
            'read_at'    => $n->read_at,
            'is_read'    => !is_null($n->read_at),
            'created_at' => $n->created_at,
        ]);

        return ApiResponse::success('Notifications retrieved', $notifications);
    }

    public function unreadCount(Request $request)
    {
        $query = AppNotification::where('user_id', $request->user()->id)
            ->whereNull('read_at');

        if ($request->filled('type')) {
            $query->where('type', $request->string('type')->toString());
        }

        if ($request->filled('link')) {
            $query->where('link', $request->string('link')->toString());
        }

        $count = $query->count();

        return ApiResponse::success('Count retrieved', ['count' => $count]);
    }

    public function markRead(Request $request, int $id)
    {
        $notification = AppNotification::where('user_id', $request->user()->id)->findOrFail($id);
        $notification->update(['read_at' => now()]);
        return ApiResponse::success('Marked as read');
    }

    public function markAllRead(Request $request)
    {
        $query = AppNotification::where('user_id', $request->user()->id)
            ->whereNull('read_at');

        if ($request->filled('type')) {
            $query->where('type', $request->string('type')->toString());
        }

        if ($request->filled('link')) {
            $query->where('link', $request->string('link')->toString());
        }

        $query->update(['read_at' => now()]);

        return ApiResponse::success('All marked as read');
    }
}
