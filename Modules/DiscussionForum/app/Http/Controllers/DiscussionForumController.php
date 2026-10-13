<?php

namespace Modules\DiscussionForum\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Modules\DiscussionForum\Models\DiscussionComment;
use Modules\DiscussionForum\Models\DiscussionThread;

class DiscussionForumController extends Controller
{
    // ── Threads ───────────────────────────────────────────────────────────────

    public function indexThreads(Request $request)
    {
        $q = DiscussionThread::with(['author:id,name,nip', 'trainingEvent:id,uuid,title'])
            ->withCount('comments')
            ->orderByDesc('updated_at');

        if ($search = $request->string('search')->trim()) {
            $q->where('title', 'like', "%{$search}%");
        }

        if ($eventUuid = $request->string('event_uuid')->trim()) {
            $q->whereHas('trainingEvent', fn ($sq) => $sq->where('uuid', $eventUuid));
        }

        $threads = $q->paginate($request->integer('per_page', 20));

        return response()->json(['success' => true, 'data' => $threads]);
    }

    public function storeThread(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
        ]);

        /** @var DiscussionThread $thread */
        $thread = DiscussionThread::create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'data' => $thread->load('author:id,name,nip')->loadCount('comments'),
        ], 201);
    }

    public function showThread(string $uuid)
    {
        $thread = DiscussionThread::with([
            'author:id,name,nip',
            'trainingEvent:id,uuid,title',
            'comments.author:id,name,nip',
        ])->withCount('comments')->where('uuid', $uuid)->firstOrFail();

        return response()->json(['success' => true, 'data' => $thread]);
    }

    public function updateThread(Request $request, string $uuid)
    {
        /** @var DiscussionThread $thread */
        $thread = DiscussionThread::where('uuid', $uuid)->firstOrFail();

        if ($thread->created_by !== $request->user()->id && ! $request->user()->hasAnyRole(['super-admin', 'admin-opd'])) {
            return response()->json(['success' => false, 'message' => 'Anda tidak memiliki akses untuk mengubah diskusi ini.'], 403);
        }

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'body' => 'sometimes|string',
            'status' => 'sometimes|in:open,closed',
        ]);

        $thread->update($data);

        return response()->json(['success' => true, 'data' => $thread->loadCount('comments')]);
    }

    public function destroyThread(Request $request, string $uuid)
    {
        /** @var DiscussionThread $thread */
        $thread = DiscussionThread::where('uuid', $uuid)->firstOrFail();

        if ($thread->created_by !== $request->user()->id && ! $request->user()->hasAnyRole(['super-admin', 'admin-opd'])) {
            return response()->json(['success' => false, 'message' => 'Anda tidak memiliki akses untuk menghapus diskusi ini.'], 403);
        }

        $thread->delete();

        return response()->json(['success' => true]);
    }

    // ── Comments ──────────────────────────────────────────────────────────────

    public function storeComment(Request $request, string $uuid)
    {
        /** @var DiscussionThread $thread */
        $thread = DiscussionThread::where('uuid', $uuid)->firstOrFail();

        $data = $request->validate(['body' => 'required|string']);

        /** @var DiscussionComment $comment */
        $comment = DiscussionComment::create([
            'thread_id' => $thread->id,
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        $thread->touch();

        return response()->json([
            'success' => true,
            'data' => $comment->load('author:id,name,nip'),
        ], 201);
    }

    public function updateComment(Request $request, string $uuid, int $commentId)
    {
        /** @var DiscussionComment $comment */
        $comment = DiscussionComment::whereHas('thread', fn ($q) => $q->where('uuid', $uuid))
            ->findOrFail($commentId);

        if ($comment->user_id !== $request->user()->id && ! $request->user()->hasAnyRole(['super-admin', 'admin-opd'])) {
            return response()->json(['success' => false, 'message' => 'Anda tidak memiliki akses untuk mengubah balasan ini.'], 403);
        }

        $data = $request->validate(['body' => 'required|string']);
        $comment->update($data);

        return response()->json(['success' => true, 'data' => $comment->load('author:id,name,nip')]);
    }

    public function destroyComment(Request $request, string $uuid, int $commentId)
    {
        /** @var DiscussionComment $comment */
        $comment = DiscussionComment::whereHas('thread', fn ($q) => $q->where('uuid', $uuid))
            ->findOrFail($commentId);

        if ($comment->user_id !== $request->user()->id && ! $request->user()->hasAnyRole(['super-admin', 'admin-opd'])) {
            return response()->json(['success' => false, 'message' => 'Anda tidak memiliki akses untuk menghapus balasan ini.'], 403);
        }

        $comment->delete();

        return response()->json(['success' => true]);
    }

    // ── Media upload ──────────────────────────────────────────────────────────

    public function uploadMedia(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:jpg,jpeg,png,gif,webp,mp4,webm,mov|max:51200',
        ]);

        // [M5] Simpan di local disk — diakses via authenticated download route
        $path = $request->file('file')->store('discussion-media', 'local');

        return response()->json([
            'success' => true,
            'data' => ['url' => url('/api/discussion-forum/media/'.basename($path)), 'path' => $path],
        ], 201);
    }

    public function serveMedia(Request $request, string $filename)
    {
        // Sanitize: no directory traversal
        $filename = basename($filename);
        $path = 'discussion-media/'.$filename;

        if (! Storage::disk('local')->exists($path)) {
            // Backwards-compat for old public files
            if (Storage::disk('public')->exists($path)) {
                return Storage::disk('public')->response($path);
            }
            abort(404);
        }

        return Storage::disk('local')->response($path);
    }
}
