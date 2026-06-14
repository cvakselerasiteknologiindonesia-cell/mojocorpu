<?php

namespace Modules\KMS\Services;

use Illuminate\Support\Facades\DB;
use Modules\KMS\Models\KmsAsset;
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

    public function create(array $data, array $categoryIds = []): KmsAsset
    {
        return DB::transaction(fn () => $this->repository->create($data, $categoryIds));
    }

    public function update(string $uuid, array $data, int $userId, array $categoryIds = []): KmsAsset
    {
        $asset = $this->repository->findByUuid($uuid);
        abort_if(!$asset, 404, 'Aset tidak ditemukan.');
        abort_unless($asset->uploaded_by === $userId, 403, 'Anda hanya dapat mengedit aset milik Anda sendiri.');

        return DB::transaction(fn () => $this->repository->update($asset, $data, $categoryIds));
    }

    public function delete(string $uuid, int $userId): void
    {
        $asset = $this->repository->findByUuid($uuid);
        abort_if(!$asset, 404, 'Aset tidak ditemukan.');
        abort_unless($asset->uploaded_by === $userId, 403, 'Anda hanya dapat menghapus aset milik Anda sendiri.');

        DB::transaction(fn () => $this->repository->delete($asset));
    }
}
