<?php

namespace Modules\KMS\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Modules\KMS\Models\KmsAsset;

class KMSRepository
{
    public function stats(): array
    {
        // 4 separate COUNT queries collapsed into 1 selectRaw.
        $row = KmsAsset::selectRaw("
            COUNT(*) as total,
            SUM(status = 'pending')  as pending,
            SUM(status = 'approved') as approved,
            SUM(status = 'rejected') as rejected
        ")->first();

        return [
            'total' => (int) $row->total,
            'pending' => (int) $row->pending,
            'approved' => (int) $row->approved,
            'rejected' => (int) $row->rejected,
        ];
    }

    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = KmsAsset::query()
            ->with(['uploader:id,name,opd_id,opd_name', 'categories:id,name', 'visibleOpds:id,name', 'sources'])
            ->latest();

        if (! empty($filters['mine']) && ! empty($filters['user_id'])) {
            $query->where('uploaded_by', $filters['user_id']);
        }

        if (empty($filters['mine']) && ! empty($filters['viewer'])) {
            $viewer = $filters['viewer'];
            if (! $viewer->hasRole('super-admin')) {
                $query->where(function ($q) use ($viewer) {
                    $q->where('uploaded_by', $viewer->id)
                        ->orWhere(function ($internal) use ($viewer) {
                            $internal->where('status', 'approved')
                                ->where(function ($scope) use ($viewer) {
                                    $scope->where('visibility', 'public')
                                        ->orWhere(function ($internalScope) use ($viewer) {
                                            $internalScope->where('visibility', 'internal')
                                                ->where(function ($selectedScope) use ($viewer) {
                                                    $selectedScope->where('internal_scope', 'all');

                                                    if ($viewer->opd_id) {
                                                        $selectedScope->orWhereHas('visibleOpds', fn ($opd) => $opd->where('opds.id', $viewer->opd_id));
                                                    }
                                                });
                                        });
                                });
                        });
                });
            }
        }

        if (! empty($filters['visibility'])) {
            $query->where('visibility', $filters['visibility']);
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['search'])) {
            $term = $filters['search'];
            // Prefix-match: '{term}%' allows B-tree index scans.
            // Leading wildcard '%term%' on description (TEXT column) is especially slow.
            $query->where(function ($q) use ($term) {
                $q->where('title', 'like', "{$term}%")
                    ->orWhere('description', 'like', "{$term}%");
            });
        }

        return $query->paginate($perPage);
    }

    public function findByUuid(string $uuid): ?KmsAsset
    {
        return KmsAsset::query()->where('uuid', $uuid)->first();
    }

    public function create(array $data, array $categoryIds = [], array $opdIds = [], array $sources = []): KmsAsset
    {
        $asset = KmsAsset::query()->create($data);
        if ($categoryIds) {
            $asset->categories()->sync($categoryIds);
        }
        $asset->visibleOpds()->sync($opdIds);
        $this->syncSources($asset, $sources);

        return $asset->fresh(['uploader', 'categories', 'visibleOpds', 'sources']);
    }

    public function update(KmsAsset $asset, array $data, array $categoryIds = [], array $opdIds = [], ?array $sources = null): KmsAsset
    {
        $asset->update($data);
        $asset->categories()->sync($categoryIds);
        $asset->visibleOpds()->sync($opdIds);
        if ($sources !== null) {
            $this->syncSources($asset, $sources);
        }

        return $asset->fresh(['uploader', 'categories', 'visibleOpds', 'sources']);
    }

    public function review(KmsAsset $asset, string $status, ?string $rejectionReason = null): KmsAsset
    {
        $asset->update([
            'status' => $status,
            'rejection_reason' => $status === 'rejected' ? $rejectionReason : null,
        ]);

        return $asset->fresh();
    }

    public function delete(KmsAsset $asset): void
    {
        $asset->delete();
    }

    private function syncSources(KmsAsset $asset, array $sources): void
    {
        $asset->sources()->delete();

        foreach (array_values($sources) as $index => $source) {
            if (empty($source['file_path'])) {
                continue;
            }

            $asset->sources()->create([
                'file_path' => $source['file_path'],
                'source_type' => $source['source_type'] ?? 'url',
                'original_name' => $source['original_name'] ?? null,
                'sort_order' => $index,
            ]);
        }
    }
}
