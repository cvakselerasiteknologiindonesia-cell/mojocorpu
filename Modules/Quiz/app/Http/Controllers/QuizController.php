<?php

namespace Modules\Quiz\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Modules\Quiz\Models\Quiz;
use Modules\Quiz\Models\QuizComment;
use Modules\Quiz\Models\QuizQuestion;
use Modules\Notification\Models\AppNotification;
use Modules\TrainingEvent\Models\TrainingEvent;

class QuizController extends Controller
{
    // ── Stats ──────────────────────────────────────────────────────────────────

    public function stats()
    {
        return ApiResponse::success('Stats retrieved', [
            'total'           => Quiz::count(),
            'pre_test'        => Quiz::where('quiz_type', 'pre-test')->count(),
            'post_test'       => Quiz::where('quiz_type', 'post-test')->count(),
            'total_questions' => QuizQuestion::count(),
        ]);
    }

    // ── Quizzes ────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = Quiz::query()->with(['event:id,uuid,title,status', 'questions'])->latest();

        if ($request->filled('event_uuid')) {
            $query->whereHas('event', fn ($q) => $q->where('uuid', $request->input('event_uuid')));
        }

        if ($request->filled('quiz_type')) {
            $query->where('quiz_type', $request->input('quiz_type'));
        }

        $quizzes = $query->withCount('comments')->get()->map(fn ($quiz) => $this->formatQuiz($quiz));

        return ApiResponse::success('Quizzes retrieved', $quizzes);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'event_uuid'    => ['required', 'string', 'exists:training_events,uuid'],
            'title'         => ['required', 'string', 'max:255'],
            'quiz_type'     => ['required', 'in:pre-test,post-test,evaluation'],
            'passing_score' => ['required', 'integer', 'min:0', 'max:100'],
        ]);

        $event = TrainingEvent::where('uuid', $data['event_uuid'])->firstOrFail();

        try {
            $quiz = DB::transaction(function () use ($event, $data) {
                return Quiz::create([
                    'training_event_id' => $event->id,
                    'title'             => $data['title'],
                    'quiz_type'         => $data['quiz_type'],
                    'passing_score'     => $data['passing_score'],
                ]);
            });

            return ApiResponse::success('Quiz created', $this->formatQuiz($quiz->load(['event:id,uuid,title,status', 'questions'])), 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());
            return ApiResponse::error();
        }
    }

    public function update(Request $request, string $uuid)
    {
        $quiz = Quiz::where('uuid', $uuid)->firstOrFail();

        $data = $request->validate([
            'title'         => ['required', 'string', 'max:255'],
            'quiz_type'     => ['required', 'in:pre-test,post-test,evaluation'],
            'passing_score' => ['required', 'integer', 'min:0', 'max:100'],
        ]);

        try {
            $quiz->update($data);
            return ApiResponse::success('Quiz updated', $this->formatQuiz($quiz->load(['event:id,uuid,title,status', 'questions'])));
        } catch (\Throwable $e) {
            Log::error($e->getMessage());
            return ApiResponse::error();
        }
    }

    public function destroy(string $uuid)
    {
        $quiz = Quiz::where('uuid', $uuid)->firstOrFail();

        try {
            $quiz->delete();
            return ApiResponse::success('Quiz deleted');
        } catch (\Throwable $e) {
            Log::error($e->getMessage());
            return ApiResponse::error();
        }
    }

    // ── Questions ──────────────────────────────────────────────────────────────

    public function storeQuestion(Request $request, string $uuid)
    {
        $quiz = Quiz::where('uuid', $uuid)->firstOrFail();

        $data = $request->validate([
            'question'       => ['required', 'string'],
            'options'        => ['required', 'array', 'min:2', 'max:5'],
            'options.*'      => ['required', 'string', 'max:500'],
            'correct_answer' => ['required', 'string'],
            'score'          => ['required', 'integer', 'min:1'],
        ]);

        try {
            $question = $quiz->questions()->create([
                'question'       => $data['question'],
                'options'        => $data['options'],
                'correct_answer' => $data['correct_answer'],
                'score'          => $data['score'],
            ]);

            return ApiResponse::success('Question added', $this->formatQuestion($question), 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());
            return ApiResponse::error();
        }
    }

    public function updateQuestion(Request $request, string $uuid, int $questionId)
    {
        $quiz     = Quiz::where('uuid', $uuid)->firstOrFail();
        $question = QuizQuestion::where('id', $questionId)->where('quiz_id', $quiz->id)->firstOrFail();

        $data = $request->validate([
            'question'       => ['required', 'string'],
            'options'        => ['required', 'array', 'min:2', 'max:5'],
            'options.*'      => ['required', 'string', 'max:500'],
            'correct_answer' => ['required', 'string'],
            'score'          => ['required', 'integer', 'min:1'],
        ]);

        try {
            $question->update($data);
            return ApiResponse::success('Question updated', $this->formatQuestion($question));
        } catch (\Throwable $e) {
            Log::error($e->getMessage());
            return ApiResponse::error();
        }
    }

    public function destroyQuestion(string $uuid, int $questionId)
    {
        $quiz     = Quiz::where('uuid', $uuid)->firstOrFail();
        $question = QuizQuestion::where('id', $questionId)->where('quiz_id', $quiz->id)->firstOrFail();

        try {
            $question->delete();
            return ApiResponse::success('Question deleted');
        } catch (\Throwable $e) {
            Log::error($e->getMessage());
            return ApiResponse::error();
        }
    }

    // ── Comments ───────────────────────────────────────────────────────────────

    public function indexComments(string $uuid)
    {
        $quiz = Quiz::where('uuid', $uuid)->firstOrFail();

        $comments = QuizComment::where('quiz_id', $quiz->id)
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

    public function storeComment(Request $request, string $uuid)
    {
        $quiz = Quiz::where('uuid', $uuid)
            ->with(['event.facilitator.user'])
            ->firstOrFail();

        $data = $request->validate(['body' => ['required', 'string', 'max:1000']]);

        try {
            $comment = QuizComment::create([
                'quiz_id' => $quiz->id,
                'user_id' => $request->user()->id,
                'body'    => $data['body'],
            ]);

            $facilitatorUser = $quiz->event?->facilitator?->user;
            if ($facilitatorUser) {
                AppNotification::create([
                    'user_id' => $facilitatorUser->id,
                    'title'   => 'Komentar pada Quiz',
                    'message' => sprintf(
                        '%s memberikan komentar pada quiz "%s": %s',
                        $request->user()->name,
                        $quiz->title,
                        mb_strimwidth($data['body'], 0, 120, '…')
                    ),
                    'channel' => 'in-app',
                ]);
            }

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
            return ApiResponse::error();
        }
    }

    public function destroyComment(Request $request, int $commentId)
    {
        try {
            $comment = QuizComment::findOrFail($commentId);
            abort_unless(
                $request->user()->can('create quiz') || $comment->user_id === $request->user()->id,
                403,
                'Tidak diizinkan.'
            );
            $comment->delete();
            return ApiResponse::success('Deleted');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private function formatQuiz(Quiz $quiz): array
    {
        return [
            'uuid'          => $quiz->uuid,
            'id'            => $quiz->id,
            'title'         => $quiz->title,
            'quiz_type'     => $quiz->quiz_type,
            'passing_score' => $quiz->passing_score,
            'event_uuid'    => $quiz->event?->uuid,
            'event_title'   => $quiz->event?->title ?? '—',
            'event_status'  => $quiz->event?->status ?? '—',
            'question_count' => $quiz->questions->count(),
            'total_score'   => $quiz->questions->sum('score'),
            'comment_count' => $quiz->comments_count ?? 0,
            'questions'     => $quiz->questions->map(fn ($q) => $this->formatQuestion($q))->values(),
            'created_at'    => $quiz->created_at,
        ];
    }

    private function formatQuestion(QuizQuestion $q): array
    {
        return [
            'id'             => $q->id,
            'question'       => $q->question,
            'options'        => $q->options ?? [],
            'correct_answer' => $q->correct_answer,
            'score'          => $q->score,
        ];
    }
}
