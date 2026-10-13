<?php

namespace Modules\KMS\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\KMS\Models\KmsAsset;
use Modules\KMS\Models\KmsAssetSource;
use Modules\KMS\Repositories\KMSRepository;

class KMSService
{
    public function __construct(private readonly KMSRepository $repository) {}

    public function stats(): array
    {
        return $this->repository->stats();
    }

    public function paginate(int $perPage = 15, array $filters = [])
    {
        return $this->repository->paginate($perPage, $filters);
    }

    public function review(string $uuid, string $status, ?string $rejectionReason = null): KmsAsset
    {
        $asset = $this->repository->findByUuid($uuid);
        abort_if(!$asset, 404, 'Aset tidak ditemukan.');
        abort_unless(in_array($status, ['approved', 'rejected']), 422, 'Status tidak valid.');

        return $this->repository->review($asset, $status, $rejectionReason);
    }

    public function create(array $data, array $categoryIds = [], array $opdIds = [], array $sources = []): KmsAsset
    {
        return DB::transaction(fn () => $this->repository->create($data, $categoryIds, $opdIds, $sources));
    }

    public function update(string $uuid, array $data, int $userId, array $categoryIds = [], array $opdIds = [], ?array $sources = null): KmsAsset
    {
        $asset = $this->repository->findByUuid($uuid);
        abort_if(!$asset, 404, 'Aset tidak ditemukan.');
        abort_unless($asset->uploaded_by === $userId, 403, 'Anda hanya dapat mengedit aset milik Anda sendiri.');

        return DB::transaction(fn () => $this->repository->update($asset, $data, $categoryIds, $opdIds, $sources));
    }

    public function delete(string $uuid, User $user): void
    {
        $asset = $this->repository->findByUuid($uuid);
        abort_if(!$asset, 404, 'Aset tidak ditemukan.');
        abort_unless(
            $user->hasRole('super-admin') || $asset->uploaded_by === $user->id,
            403,
            'Anda tidak berhak menghapus aset ini.'
        );

        $asset->loadMissing('sources:id,kms_asset_id,file_path');
        $filePaths = $this->deletableFilePaths($asset);

        DB::transaction(fn () => $this->repository->delete($asset));

        $this->deleteStoredFiles($filePaths, $asset->id);
    }

    private function deletableFilePaths(KmsAsset $asset): array
    {
        return collect([$asset->file_path])
            ->merge($asset->sources->pluck('file_path'))
            ->filter(fn ($path) => filled($path) && ! filter_var($path, FILTER_VALIDATE_URL))
            ->unique()
            ->values()
            ->all();
    }

    private function deleteStoredFiles(array $filePaths, int $deletedAssetId): void
    {
        foreach ($filePaths as $path) {
            if ($this->isReferencedByAnotherActiveAsset($path, $deletedAssetId)) {
                continue;
            }

            foreach (['local', 'public'] as $disk) {
                try {
                    if (Storage::disk($disk)->exists($path)) {
                        Storage::disk($disk)->delete($path);
                    }
                } catch (\Throwable $e) {
                    report($e);
                }
            }
        }
    }

    private function isReferencedByAnotherActiveAsset(string $path, int $deletedAssetId): bool
    {
        return KmsAsset::query()
            ->whereKeyNot($deletedAssetId)
            ->where('file_path', $path)
            ->exists()
            || KmsAssetSource::query()
                ->where('kms_asset_id', '!=', $deletedAssetId)
                ->where('file_path', $path)
                ->whereHas('asset')
                ->exists();
    }
}
