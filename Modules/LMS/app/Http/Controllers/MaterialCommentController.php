<?php

namespace Modules\LMS\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Modules\LMS\Models\MaterialComment;
use Modules\Notification\Models\AppNotification;
use Modules\TrainingEvent\Models\EventMaterial;

class MaterialCommentController extends Controller
{
    public function index(int $materialId)
    {
        $comments = MaterialComment::where('material_id', $materialId)
            ->with('author:id,name')
            ->latest()
            ->get()
            ->map(fn ($c) => [
                'id'          => $c->id,
                'uuid'        => $c->uuid,
                'body'        => $c->body,
                'author_name' => $c->author?->name ?? '—',
                'author_id'   => $c->user_id,
                'created_at'  => $c->created_at,
            ]);

        return ApiResponse::success('Comments retrieved', $comments);
    }

    public function store(Request $request, int $materialId)
    {
        try {
            $data = $request->validate(['body' => ['required', 'string', 'max:1000']]);

            $material = EventMaterial::with(['event.facilitator.user'])->find($materialId);
            abort_if(!$material, 404, 'Materi tidak ditemukan.');

            $comment = MaterialComment::create([
                'material_id' => $materialId,
                'user_id'     => $request->user()->id,
                'body'        => $data['body'],
            ]);

            $facilitatorUser = $material->event?->facilitator?->user;
            if ($facilitatorUser) {
                AppNotification::create([
                    'user_id' => $facilitatorUser->id,
                    'title'   => 'Komentar pada Materi Pembelajaran',
                    'message' => sprintf(
                        '%s memberikan komentar pada materi "%s": %s',
                        $request->user()->name,
                        $material->title,
                        mb_strimwidth($data['body'], 0, 120, '…')
                    ),
                    'channel' => 'in-app',
                ]);
            }

            activity('lms-comments')->event('created')->causedBy($request->user())->log("Comment on material {$materialId}");

            return ApiResponse::success('Comment added', [
                'id'          => $comment->id,
                'uuid'        => $comment->uuid,
                'body'        => $comment->body,
                'author_name' => $request->user()->name,
                'author_id'   => $comment->user_id,
                'created_at'  => $comment->created_at,
            ], 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function destroy(Request $request, int $commentId)
    {
        try {
            $comment = MaterialComment::findOrFail($commentId);
            abort_unless(
                $request->user()->can('create lms material') || $comment->user_id === $request->user()->id,
                403,
                'Tidak diizinkan.'
            );
            $comment->delete();
            return ApiResponse::success('Deleted');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error($e->getMessage());
        }
    }
}
