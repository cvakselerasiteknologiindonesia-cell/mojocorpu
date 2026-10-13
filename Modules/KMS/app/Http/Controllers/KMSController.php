<?php

namespace Modules\KMS\Http\Controllers;

use App\Models\User;
use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\KMS\Http\Requests\StoreKmsAssetRequest;
use Modules\KMS\Http\Requests\UpdateKmsAssetRequest;
use Modules\KMS\Models\KmsCategory;
use Modules\KMS\Models\KmsAsset;
use Modules\KMS\Services\KMSService;
use Modules\Notification\Services\NotificationService;
use Modules\OPD\Models\OPD;

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
            'name' => ['required', 'string', 'max:100', 'unique:kms_categories,name,'.$category->id],
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

    public function opdOptions()
    {
        $opds = OPD::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'code', 'name'])
            ->map(fn ($opd) => [
                'id' => $opd->id,
                'code' => $opd->code,
                'name' => $opd->name,
            ]);

        return ApiResponse::success('OPD options retrieved', $opds);
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
                'user_id' => $request->user()->id,
                'viewer' => $request->user(),
                'mine' => $request->boolean('mine'),
                'visibility' => $request->input('visibility'),
                'status' => $request->input('status'),
                'search' => $request->input('search'),
            ];

            $paginated = $service->paginate((int) $request->integer('per_page', 12), $filters);

            $paginated->through(fn ($asset) => [
                'uuid' => $asset->uuid,
                'id' => $asset->id,
                'title' => $asset->title,
                'description' => $asset->description,
                'file_path' => $asset->file_path,
                'file_url' => $this->resolveFileUrl($asset->file_path, $asset->uuid),
                'is_upload' => ! filter_var($asset->file_path, FILTER_VALIDATE_URL),
                'sources' => $this->mapSources($asset),
                'visibility' => $asset->visibility,
                'internal_scope' => $asset->internal_scope ?? 'all',
                'opd_ids' => $asset->visibleOpds->pluck('id'),
                'opd_names' => $asset->visibleOpds->pluck('name'),
                'category_ids' => $asset->categories->pluck('id'),
                'category_names' => $asset->categories->pluck('name'),
                'uploader_name' => $asset->uploader?->name ?? '—',
                'uploader_opd' => $asset->uploader?->opd_name ?? '—',
                'status' => $asset->status,
                'rejection_reason' => $asset->rejection_reason,
                'is_mine' => $asset->uploaded_by === $request->user()->id,
                'created_at' => $asset->created_at,
                'updated_at' => $asset->updated_at,
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
            $data = $request->validated();
            $categoryIds = array_filter((array) ($data['category_ids'] ?? []));
            $opdIds = $this->normalizeOpdIds($data);
            $sources = $this->resolveSources($request, $data);
            unset($data['category_ids'], $data['opd_ids'], $data['source_urls'], $data['source_existing_paths'], $data['source_existing_names'], $data['source_files'], $data['file']);
            $data['visibility'] ??= 'internal';
            $data['internal_scope'] = $data['visibility'] === 'internal'
                ? ($data['internal_scope'] ?? 'all')
                : 'all';
            $data['uploaded_by'] = $request->user()->id;
            $data['opd_id'] = $request->user()->opd_id;
            $data['file_path'] = $sources[0]['file_path'] ?? $this->resolveFilePath($request, $data['file_path'] ?? null);

            $record = $service->create($data, $categoryIds, $opdIds, $sources);
            activity('kms-assets')->event('created')->causedBy($request->user())->performedOn($record)->log('kms-assets created');
            $this->notifySuperAdminsAboutPendingAsset($request->user(), $record);

            return ApiResponse::success('Created successfully', $record, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function update(UpdateKmsAssetRequest $request, string $uuid, KMSService $service)
    {
        try {
            $data = $request->validated();
            $categoryIds = array_filter((array) ($data['category_ids'] ?? []));
            $opdIds = $this->normalizeOpdIds($data);
            $hasSourceInput = $this->hasSourceInput($request);
            $sources = $hasSourceInput ? $this->resolveSources($request, $data) : null;
            unset($data['category_ids'], $data['opd_ids'], $data['source_urls'], $data['source_existing_paths'], $data['source_existing_names'], $data['source_files'], $data['file']);
            $data['visibility'] ??= 'internal';
            $data['internal_scope'] = $data['visibility'] === 'internal'
                ? ($data['internal_scope'] ?? 'all')
                : 'all';

            if ($sources !== null) {
                $data['file_path'] = $sources[0]['file_path'] ?? '';
            } elseif ($request->hasFile('file')) {
                $data['file_path'] = $this->resolveFilePath($request, null);
            } elseif (! $request->filled('file_path')) {
                unset($data['file_path']);
            }

            $record = $service->update($uuid, $data, $request->user()->id, $categoryIds, $opdIds, $sources);
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
            'status' => ['required', 'in:approved,rejected'],
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $asset = $service->review($uuid, $data['status'], $data['rejection_reason'] ?? null);
            activity('kms-assets')->event('reviewed')->causedBy($request->user())->performedOn($asset)
                ->log("kms-assets reviewed: {$data['status']}");
            $this->notifyUploaderAboutReviewedAsset($asset, $data['status'], $data['rejection_reason'] ?? null);

            return ApiResponse::success('Reviewed successfully', $asset);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

            return ApiResponse::error($e->getMessage());
        }
    }

    public function destroy(Request $request, string $uuid, KMSService $service)
    {
        try {
            $service->delete($uuid, $request->user());
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
            // Store in local (non-public) disk — served via authenticated download route [M3 fix]
            return $request->file('file')->store('kms-assets', 'local');
        }

        return $urlFallback ?? '';
    }

    private function resolveFileUrl(?string $filePath, ?string $uuid = null): ?string
    {
        if (! $filePath) {
            return null;
        }
        if (filter_var($filePath, FILTER_VALIDATE_URL)) {
            return $filePath;
        }

        // Return authenticated download URL for local files
        if ($uuid) {
            return url("/api/kms-assets/{$uuid}/download");
        }

        // Backwards-compat for old public files
        return Storage::disk('public')->exists($filePath)
            ? Storage::disk('public')->url($filePath)
            : null;
    }

    private function mapSources($asset): array
    {
        $sources = $asset->sources->map(fn ($source) => [
            'id' => $source->id,
            'file_path' => $source->file_path,
            'file_url' => $this->resolveSourceUrl($source->file_path, $asset->uuid, $source->id),
            'source_type' => $source->source_type,
            'original_name' => $source->original_name,
            'is_upload' => ! filter_var($source->file_path, FILTER_VALIDATE_URL),
        ])->values()->all();

        if ($sources === [] && filled($asset->file_path)) {
            $sources[] = [
                'id' => null,
                'file_path' => $asset->file_path,
                'file_url' => $this->resolveFileUrl($asset->file_path, $asset->uuid),
                'source_type' => filter_var($asset->file_path, FILTER_VALIDATE_URL) ? 'url' : 'file',
                'original_name' => basename($asset->file_path),
                'is_upload' => ! filter_var($asset->file_path, FILTER_VALIDATE_URL),
            ];
        }

        return $sources;
    }

    private function resolveSourceUrl(?string $filePath, string $uuid, int $sourceId): ?string
    {
        if (! $filePath) {
            return null;
        }

        if (filter_var($filePath, FILTER_VALIDATE_URL)) {
            return $filePath;
        }

        return url("/api/kms-assets/{$uuid}/sources/{$sourceId}/download");
    }

    private function hasSourceInput(Request $request): bool
    {
        return $request->has('source_urls') || $request->has('source_existing_paths') || $request->hasFile('source_files');
    }

    private function resolveSources(Request $request, array $data): array
    {
        $sources = [];

        foreach (array_filter((array) ($data['source_urls'] ?? [])) as $url) {
            $sources[] = [
                'file_path' => $url,
                'source_type' => 'url',
                'original_name' => parse_url($url, PHP_URL_HOST),
            ];
        }

        $existingNames = (array) ($data['source_existing_names'] ?? []);
        foreach (array_values(array_filter((array) ($data['source_existing_paths'] ?? []))) as $index => $path) {
            $sources[] = [
                'file_path' => $path,
                'source_type' => filter_var($path, FILTER_VALIDATE_URL) ? 'url' : 'file',
                'original_name' => $existingNames[$index] ?? basename($path),
            ];
        }

        foreach ((array) $request->file('source_files', []) as $file) {
            if (! $file) {
                continue;
            }

            $sources[] = [
                'file_path' => $file->store('kms-assets', 'local'),
                'source_type' => 'file',
                'original_name' => $file->getClientOriginalName(),
            ];
        }

        if ($sources === []) {
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $sources[] = [
                    'file_path' => $file->store('kms-assets', 'local'),
                    'source_type' => 'file',
                    'original_name' => $file->getClientOriginalName(),
                ];
            } elseif (! empty($data['file_path'])) {
                $sources[] = [
                    'file_path' => $data['file_path'],
                    'source_type' => 'url',
                    'original_name' => parse_url($data['file_path'], PHP_URL_HOST),
                ];
            }
        }

        return $sources;
    }

    private function normalizeOpdIds(array $data): array
    {
        if (($data['visibility'] ?? 'internal') !== 'internal' || ($data['internal_scope'] ?? 'all') !== 'selected') {
            return [];
        }

        return collect($data['opd_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function notifySuperAdminsAboutPendingAsset(User $uploader, KmsAsset $asset): void
    {
        if (($asset->status ?? 'pending') !== 'pending') {
            return;
        }

        $userIds = User::role('super-admin')
            ->where('is_active', true)
            ->whereKeyNot($uploader->id)
            ->pluck('id')
            ->all();

        app(NotificationService::class)->sendMany(
            $userIds,
            'Aset KMS menunggu review',
            "{$uploader->name} mengirim aset pengetahuan \"{$asset->title}\" untuk ditinjau.",
            'kms',
            '/kms-assets',
        );
    }

    private function notifyUploaderAboutReviewedAsset(KmsAsset $asset, string $status, ?string $rejectionReason = null): void
    {
        if (! $asset->uploaded_by) {
            return;
        }

        $statusLabel = $status === 'approved' ? 'disetujui' : 'ditolak';
        $message = "Aset pengetahuan \"{$asset->title}\" telah {$statusLabel}.";

        if ($status === 'rejected' && filled($rejectionReason)) {
            $message .= " Alasan: {$rejectionReason}";
        }

        app(NotificationService::class)->send(
            $asset->uploaded_by,
            'Review Aset KMS selesai',
            $message,
            'kms',
            '/kms-assets',
        );
    }
}
