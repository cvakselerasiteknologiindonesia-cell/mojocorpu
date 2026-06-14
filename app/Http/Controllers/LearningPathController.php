<?php

namespace App\Http\Controllers;

use App\Models\LearningPath;
use App\Models\LearningPathEnrollment;
use App\Models\LearningPathStep;
use App\Models\LearningPathStepProgress;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LearningPathController extends Controller
{
    // ── Admin ──────────────────────────────────────────────────────────────────

    public function adminIndex(Request $request)
    {
        try {
            $query = LearningPath::withCount(['steps', 'enrollments'])
                ->with('creator:id,name')
                ->orderByDesc('created_at');

            if ($request->filled('status')) {
                $query->where('status', $request->input('status'));
            }
            if ($request->filled('search')) {
                $query->where('title', 'like', '%'.$request->input('search').'%');
            }

            return ApiResponse::success('OK', $query->paginate($request->integer('per_page', 15)));
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'           => 'required|string|max:255',
            'description'     => 'nullable|string',
            'thumbnail_url'   => 'nullable|url|max:1000',
            'status'          => 'in:draft,published',
            'target_role'     => 'nullable|string|max:100',
            'estimated_hours' => 'integer|min:0|max:9999',
            'is_sequential'   => 'boolean',
        ]);

        try {
            $path = LearningPath::create([...$validated, 'created_by' => $request->user()->id]);

            return ApiResponse::success('Learning path created', $path->load('creator:id,name'), 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function adminShow(string $uuid)
    {
        try {
            $path = LearningPath::where('uuid', $uuid)
                ->withCount('enrollments')
                ->with(['steps', 'creator:id,name'])
                ->firstOrFail();

            return ApiResponse::success('OK', $path);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function update(Request $request, string $uuid)
    {
        $validated = $request->validate([
            'title'           => 'string|max:255',
            'description'     => 'nullable|string',
            'thumbnail_url'   => 'nullable|url|max:1000',
            'status'          => 'in:draft,published',
            'target_role'     => 'nullable|string|max:100',
            'estimated_hours' => 'integer|min:0|max:9999',
            'is_sequential'   => 'boolean',
        ]);

        try {
            $path = LearningPath::where('uuid', $uuid)->firstOrFail();
            $path->update($validated);

            return ApiResponse::success('Updated', $path->load('creator:id,name'));
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function destroy(string $uuid)
    {
        try {
            LearningPath::where('uuid', $uuid)->firstOrFail()->delete();

            return ApiResponse::success('Deleted');
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function duplicate(string $uuid)
    {
        try {
            $original = LearningPath::where('uuid', $uuid)->with('steps')->firstOrFail();

            $copy = $original->replicate(['uuid', 'slug']);
            $copy->title  = 'Copy of '.$original->title;
            $copy->status = 'draft';
            $copy->save();

            foreach ($original->steps as $step) {
                $copy->steps()->create($step->only([
                    'title', 'description', 'type', 'reference_id',
                    'is_required', 'estimated_minutes', 'order',
                ]));
            }

            return ApiResponse::success('Duplicated', $copy->load('creator:id,name')->loadCount(['steps', 'enrollments']), 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function updateSteps(Request $request, string $uuid)
    {
        $request->validate([
            'steps'                     => 'array',
            'steps.*.title'             => 'required|string|max:255',
            'steps.*.description'       => 'nullable|string',
            'steps.*.type'              => 'required|in:module,training_event,material',
            'steps.*.reference_id'      => 'nullable|string|max:255',
            'steps.*.is_required'       => 'boolean',
            'steps.*.estimated_minutes' => 'integer|min:1|max:9999',
        ]);

        try {
            $path = LearningPath::where('uuid', $uuid)->firstOrFail();

            DB::transaction(function () use ($path, $request): void {
                $path->steps()->delete();
                foreach ($request->input('steps', []) as $i => $step) {
                    $path->steps()->create([...$step, 'order' => $i + 1]);
                }
            });

            return ApiResponse::success('Steps saved', $path->fresh('steps'));
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    // ── Participant ────────────────────────────────────────────────────────────

    public function publicIndex(Request $request)
    {
        try {
            $userId = $request->user()->id;

            $paths = LearningPath::where('status', 'published')
                ->withCount(['steps', 'enrollments'])
                ->with('creator:id,name')
                ->orderByDesc('created_at')
                ->get()
                ->map(function ($path) use ($userId) {
                    $enrollment = LearningPathEnrollment::where('learning_path_id', $path->id)
                        ->where('user_id', $userId)
                        ->first();

                    $progress = 0;
                    if ($enrollment && $path->steps_count > 0) {
                        $done     = LearningPathStepProgress::where('enrollment_id', $enrollment->id)->count();
                        $progress = (int) round(($done / $path->steps_count) * 100);
                    }

                    return array_merge($path->toArray(), [
                        'enrolled'  => $enrollment !== null,
                        'completed' => $enrollment?->completed_at !== null,
                        'progress'  => $progress,
                    ]);
                });

            return ApiResponse::success('OK', $paths);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function publicShow(Request $request, string $uuid)
    {
        try {
            $path = LearningPath::where('uuid', $uuid)
                ->where('status', 'published')
                ->with(['steps', 'creator:id,name'])
                ->firstOrFail();

            $userId     = $request->user()->id;
            $enrollment = LearningPathEnrollment::where('learning_path_id', $path->id)
                ->where('user_id', $userId)
                ->first();

            $completedStepIds = $enrollment
                ? LearningPathStepProgress::where('enrollment_id', $enrollment->id)->pluck('step_id')->toArray()
                : [];

            $steps = $path->steps->values()->map(function ($step, $i) use ($completedStepIds, $enrollment, $path) {
                $completed = in_array($step->id, $completedStepIds);
                $available = true;

                if ($path->is_sequential) {
                    if (! $enrollment) {
                        $available = $i === 0;
                    } elseif ($i > 0) {
                        $available = in_array($path->steps[$i - 1]->id, $completedStepIds);
                    }
                }

                return array_merge($step->toArray(), ['completed' => $completed, 'available' => $available]);
            });

            $totalSteps = $path->steps->count();
            $progress   = ($enrollment && $totalSteps > 0)
                ? (int) round((count($completedStepIds) / $totalSteps) * 100)
                : 0;

            return ApiResponse::success('OK', array_merge($path->toArray(), [
                'steps'       => $steps,
                'enrolled'    => $enrollment !== null,
                'completed'   => $enrollment?->completed_at !== null,
                'progress'    => $progress,
                'enrolled_at' => $enrollment?->enrolled_at,
            ]));
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function enroll(Request $request, string $uuid)
    {
        try {
            $path = LearningPath::where('uuid', $uuid)->where('status', 'published')->firstOrFail();

            $enrollment = LearningPathEnrollment::firstOrCreate(
                ['learning_path_id' => $path->id, 'user_id' => $request->user()->id],
                ['enrolled_at' => now()]
            );

            return ApiResponse::success('Enrolled', $enrollment, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function completeStep(Request $request, string $uuid, string $stepUuid)
    {
        try {
            $path = LearningPath::where('uuid', $uuid)->where('status', 'published')->firstOrFail();
            $step = LearningPathStep::where('uuid', $stepUuid)
                ->where('learning_path_id', $path->id)
                ->firstOrFail();

            $enrollment = LearningPathEnrollment::where('learning_path_id', $path->id)
                ->where('user_id', $request->user()->id)
                ->firstOrFail();

            LearningPathStepProgress::firstOrCreate(
                ['enrollment_id' => $enrollment->id, 'step_id' => $step->id],
                ['completed_at' => now()]
            );

            // Mark path complete when all required steps are done
            $requiredIds  = $path->steps()->where('is_required', true)->pluck('id');
            $doneRequired = LearningPathStepProgress::where('enrollment_id', $enrollment->id)
                ->whereIn('step_id', $requiredIds)
                ->count();

            if ($requiredIds->count() > 0 && $doneRequired >= $requiredIds->count() && ! $enrollment->completed_at) {
                $enrollment->update(['completed_at' => now()]);
            }

            return ApiResponse::success('Step completed');
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }
}
