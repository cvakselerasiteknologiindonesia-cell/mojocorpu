<?php

namespace Modules\KMS\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Modules\KMS\Http\Requests\StoreKmsAssetRequest;
use Modules\KMS\Http\Requests\UpdateKmsAssetRequest;
use Modules\KMS\Models\KmsCategory;
use Modules\KMS\Services\KMSService;

class KMSController extends Controller
{
    // ── Categories ─────────────────────────────────────────────────────────────

    public function categories()
    {
        $cats = KmsCategory::query()
            ->withCount('assets')
            ->orderBy('name')
            ->get(['id', 'uuid', 'name', 'slug']);

        return ApiResponse::success('Categories retrieved', $cats);
    }

    public function storeCategory(Request $request)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:100', 'unique:kms_categories,name']]);

        $category = KmsCategory::query()->create([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
        ]);

        activity('kms-categories')->event('created')->causedBy($request->user())->performedOn($category)->log('Category created');

        return ApiResponse::success('Category created', $category->only(['id', 'uuid', 'name', 'slug']), 201);
    }

    public function updateCategory(Request $request, string $uuid)
    {
        $category = KmsCategory::query()->where('uuid', $uuid)->firstOrFail();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:kms_categories,name,' . $category->id],
        ]);

        $category->update(['name' => $data['name'], 'slug' => Str::slug($data['name'])]);

        activity('kms-categories')->event('updated')->causedBy($request->user())->performedOn($category)->log('Category updated');

        return ApiResponse::success('Category updated', $category->only(['id', 'uuid', 'name', 'slug']));
    }

    public function destroyCategory(Request $request, string $uuid)
    {
        $category = KmsCategory::query()->where('uuid', $uuid)->firstOrFail();

        $assetCount = $category->assets()->count();
        if ($assetCount > 0) {
            return ApiResponse::error("Kategori masih digunakan oleh {$assetCount} aset.", 422);
        }

        $category->delete();
        activity('kms-categories')->event('deleted')->causedBy($request->user())->log("Category deleted: {$uuid}");

        return ApiResponse::success('Category deleted');
    }

    // ── Assets ─────────────────────────────────────────────────────────────────

    public function stats(KMSService $service)
    {
        return ApiResponse::success('Stats retrieved', $service->stats());
    }

    public function index(Request $request, KMSService $service)
    {
        try {
            $filters = [
                'user_id'    => $request->user()->id,
                'mine'       => $request->boolean('mine'),
                'visibility' => $request->input('visibility'),
                'status'     => $request->input('status'),
                'search'     => $request->input('search'),
            ];

            $paginated = $service->paginate((int) $request->integer('per_page', 12), $filters);

            $paginated->through(fn ($asset) => [
                'uuid'          => $asset->uuid,
                'id'            => $asset->id,
                'title'         => $asset->title,
                'description'   => $asset->description,
                'file_path'     => $asset->file_path,
                'file_url'      => $this->resolveFileUrl($asset->file_path),
                'is_upload'     => !filter_var($asset->file_path, FILTER_VALIDATE_URL),
                'visibility'     => $asset->visibility,
                'category_ids'   => $asset->categories->pluck('id'),
                'category_names' => $asset->categories->pluck('name'),
                'uploader_name' => $asset->uploader?->name ?? '—',
                'uploader_opd'  => $asset->uploader?->opd_name ?? '—',
                'status'          => $asset->status,
                'rejection_reason' => $asset->rejection_reason,
                'is_mine'       => $asset->uploaded_by === $request->user()->id,
                'created_at'    => $asset->created_at,
                'updated_at'    => $asset->updated_at,
            ]);

            return ApiResponse::success('Data retrieved', $paginated);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function store(StoreKmsAssetRequest $request, KMSService $service)
    {
        try {
            $data                = $request->validated();
            $categoryIds         = array_filter((array) ($data['category_ids'] ?? []));
            unset($data['category_ids']);
            $data['uploaded_by'] = $request->user()->id;
            $data['file_path']   = $this->resolveFilePath($request, $data['file_path'] ?? null);

            $record = $service->create($data, $categoryIds);
            activity('kms-assets')->event('created')->causedBy($request->user())->performedOn($record)->log('kms-assets created');

            return ApiResponse::success('Created successfully', $record, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function update(UpdateKmsAssetRequest $request, string $uuid, KMSService $service)
    {
        try {
            $data        = $request->validated();
            $categoryIds = array_filter((array) ($data['category_ids'] ?? []));
            unset($data['category_ids']);

            if ($request->hasFile('file')) {
                $data['file_path'] = $this->resolveFilePath($request, null);
            } elseif (!$request->filled('file_path')) {
                unset($data['file_path']);
            }

            $record = $service->update($uuid, $data, $request->user()->id, $categoryIds);
            activity('kms-assets')->event('updated')->causedBy($request->user())->performedOn($record)->log('kms-assets updated');

            return ApiResponse::success('Updated successfully', $record);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error($e->getMessage());
        }
    }

    public function review(Request $request, string $uuid, KMSService $service)
    {
        $data = $request->validate([
            'status'           => ['required', 'in:approved,rejected'],
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $asset = $service->review($uuid, $data['status'], $data['rejection_reason'] ?? null);
            activity('kms-assets')->event('reviewed')->causedBy($request->user())->performedOn($asset)
                ->log("kms-assets reviewed: {$data['status']}");

            return ApiResponse::success('Reviewed successfully', $asset);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error($e->getMessage());
        }
    }

    public function destroy(Request $request, string $uuid, KMSService $service)
    {
        try {
            $service->delete($uuid, $request->user()->id);
            activity('kms-assets')->event('deleted')->causedBy($request->user())->log("kms-assets deleted: {$uuid}");

            return ApiResponse::success('Deleted successfully');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error($e->getMessage());
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private function resolveFilePath(Request $request, ?string $urlFallback): string
    {
        if ($request->hasFile('file')) {
            return $request->file('file')->store('kms-assets', 'public');
        }

        return $urlFallback ?? '';
    }

    private function resolveFileUrl(?string $filePath): ?string
    {
        if (!$filePath) return null;
        if (filter_var($filePath, FILTER_VALIDATE_URL)) return $filePath;

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = \Illuminate\Support\Facades\Storage::disk('public');

        return $disk->url($filePath);
    }
}
