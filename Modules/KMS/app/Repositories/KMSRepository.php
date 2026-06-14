<?php

namespace Modules\KMS\Repositories;

use Modules\KMS\Models\KmsAsset;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class KMSRepository
{
    public function stats(): array
    {
        $q = KmsAsset::query();
        return [
            'total'    => (clone $q)->count(),
            'pending'  => (clone $q)->where('status', 'pending')->count(),
            'approved' => (clone $q)->where('status', 'approved')->count(),
            'rejected' => (clone $q)->where('status', 'rejected')->count(),
        ];
    }

    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = KmsAsset::query()->with(['uploader:id,name,opd_name', 'categories:id,name'])->latest();

        if (!empty($filters['mine']) && !empty($filters['user_id'])) {
            $query->where('uploaded_by', $filters['user_id']);
        }

        if (!empty($filters['visibility'])) {
            $query->where('visibility', $filters['visibility']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $term = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($term) {
                $q->where('title', 'like', $term)
                  ->orWhere('description', 'like', $term);
            });
        }

        return $query->paginate($perPage);
    }

    public function findByUuid(string $uuid): ?KmsAsset
    {
        return KmsAsset::query()->where('uuid', $uuid)->first();
    }

    public function create(array $data, array $categoryIds = []): KmsAsset
    {
        $asset = KmsAsset::query()->create($data);
        if ($categoryIds) {
            $asset->categories()->sync($categoryIds);
        }
        return $asset;
    }

    public function update(KmsAsset $asset, array $data, array $categoryIds = []): KmsAsset
    {
        $asset->update($data);
        $asset->categories()->sync($categoryIds);
        return $asset->fresh(['uploader', 'categories']);
    }

    public function review(KmsAsset $asset, string $status, ?string $rejectionReason = null): KmsAsset
    {
        $asset->update([
            'status'           => $status,
            'rejection_reason' => $status === 'rejected' ? $rejectionReason : null,
        ]);
        return $asset->fresh();
    }

    public function delete(KmsAsset $asset): void
    {
        $asset->delete();
    }
}
