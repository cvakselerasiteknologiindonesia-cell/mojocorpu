<?php

namespace Modules\LMS\Repositories;

use Modules\LMS\Models\LearningMaterial;

class LearningMaterialRepository
{
    public function stats(): array
    {
        // 5 separate COUNT queries collapsed into 1 selectRaw.
        $row = LearningMaterial::selectRaw("
            COUNT(*) as total,
            SUM(is_published = 1)              as published,
            SUM(material_type = 'document')    as document,
            SUM(material_type = 'video')       as video,
            SUM(material_type = 'link')        as link
        ")->first();

        return [
            'total' => (int) $row->total,
            'published' => (int) $row->published,
            'document' => (int) $row->document,
            'video' => (int) $row->video,
            'link' => (int) $row->link,
        ];
    }

    public function paginate(int $perPage = 15, array $filters = [])
    {
        $q = LearningMaterial::with([
            'event:id,uuid,title',
            'uploader:id,name',
        ]);

        if ($type = $filters['material_type'] ?? null) {
            $q->where('material_type', $type);
        }

        if (isset($filters['is_published']) && $filters['is_published'] !== null) {
            $q->where('is_published', (bool) $filters['is_published']);
        }

        if ($eventId = $filters['event_id'] ?? null) {
            $q->where('training_event_id', $eventId);
        }

        if ($search = $filters['search'] ?? null) {
            // Prefix-match: '{search}%' can use B-tree index on title.
            $q->where('title', 'like', "{$search}%");
        }

        return $q->latest()->paginate($perPage);
    }

    public function findByUuid(string $uuid): ?LearningMaterial
    {
        return LearningMaterial::where('uuid', $uuid)->first();
    }

    public function create(array $data): LearningMaterial
    {
        return LearningMaterial::create($data);
    }

    public function update(LearningMaterial $material, array $data): LearningMaterial
    {
        $material->update($data);

        return $material->fresh(['event:id,uuid,title', 'uploader:id,name']);
    }

    public function delete(LearningMaterial $material): void
    {
        $material->delete();
    }
}
