<?php

namespace Modules\LMS\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\LearningPathProgressService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Modules\LMS\Http\Requests\StoreLearningMaterialRequest;
use Modules\LMS\Http\Requests\UpdateLearningMaterialRequest;
use Modules\LMS\Models\LearningMaterial;
use Modules\LMS\Models\LearningMaterialView;
use Modules\LMS\Services\LearningMaterialService;

class LearningMaterialController extends Controller
{
    public function stats(LearningMaterialService $service)
    {
        return ApiResponse::success('Stats retrieved', $service->stats());
    }

    public function index(Request $request, LearningMaterialService $service)
    {
        try {
            $filters = [
                'material_type' => $request->input('material_type'),
                'is_published'  => $request->has('is_published') ? $request->boolean('is_published') : null,
                'event_id'      => $request->input('event_id'),
                'search'        => $request->input('search'),
            ];

            $paginated = $service->paginate((int) $request->integer('per_page', 15), $filters);

            $paginated->through(fn ($m) => [
                'uuid'         => $m->uuid,
                'id'           => $m->id,
                'title'        => $m->title,
                'material_type'=> $m->material_type,
                'file_url'     => $m->file_url,
                'external_url' => $m->external_url,
                'is_published' => $m->is_published,
                'event_id'     => $m->training_event_id,
                'event_title'  => $m->event?->title ?? '—',
                'event_uuid'   => $m->event?->uuid,
                'uploader_name'=> $m->uploader?->name ?? '—',
                'created_at'   => $m->created_at,
                'updated_at'   => $m->updated_at,
            ]);

            return ApiResponse::success('Data retrieved', $paginated);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);
            return ApiResponse::error();
        }
    }

    public function trackOpen(Request $request, string $uuid, LearningPathProgressService $progressService)
    {
        try {
            $material = LearningMaterial::query()
                ->where('uuid', $uuid)
                ->firstOrFail();

            LearningMaterialView::query()->updateOrCreate(
                [
                    'learning_material_id' => $material->id,
                    'user_id' => $request->user()->id,
                ],
                ['viewed_at' => now()]
            );

            $progressService->completeReferencedSteps('material', $material->uuid, $request->user()->id);

            return ApiResponse::success('Materi dibuka.', [
                'uuid' => $material->uuid,
                'title' => $material->title,
                'url' => $material->external_url ?: $material->file_url,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function store(StoreLearningMaterialRequest $request, LearningMaterialService $service)
    {
        try {
            $data                = $request->validated();
            $data['uploaded_by'] = $request->user()->id;
            $data['is_published'] = $request->boolean('is_published', false);

            if ($request->hasFile('file')) {
                $data['file_path'] = $request->file('file')->store('lms-materials', 'public');
            }
            unset($data['file']);

            $record = $service->create($data);
            activity('lms-materials')->event('created')->causedBy($request->user())->performedOn($record)->log('Material created');

            return ApiResponse::success('Created successfully', $record, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function update(UpdateLearningMaterialRequest $request, string $uuid, LearningMaterialService $service)
    {
        try {
            $data = $request->validated();

            if ($request->hasFile('file')) {
                $data['file_path'] = $request->file('file')->store('lms-materials', 'public');
            }

            if ($request->boolean('delete_file')) {
                $data['_delete_file'] = true;
            }

            unset($data['file'], $data['delete_file']);

            $record = $service->update($uuid, $data);
            activity('lms-materials')->event('updated')->causedBy($request->user())->performedOn($record)->log('Material updated');

            return ApiResponse::success('Updated successfully', $record);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function togglePublish(Request $request, string $uuid, LearningMaterialService $service)
    {
        try {
            $record = $service->togglePublish($uuid);
            $action = $record->is_published ? 'published' : 'unpublished';
            activity('lms-materials')->event('updated')->causedBy($request->user())->performedOn($record)->log("Material {$action}");

            return ApiResponse::success('Status updated', $record);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function destroy(Request $request, string $uuid, LearningMaterialService $service)
    {
        try {
            $service->delete($uuid);
            activity('lms-materials')->event('deleted')->causedBy($request->user())->log("Material deleted: {$uuid}");

            return ApiResponse::success('Deleted successfully');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);
            return ApiResponse::error($e->getMessage());
        }
    }
}
