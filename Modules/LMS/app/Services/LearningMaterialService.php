<?php

namespace Modules\LMS\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\LMS\Models\LearningMaterial;
use Modules\LMS\Repositories\LearningMaterialRepository;

class LearningMaterialService
{
    public function __construct(private readonly LearningMaterialRepository $repository) {}

    public function stats(): array
    {
        return $this->repository->stats();
    }

    public function paginate(int $perPage = 15, array $filters = [])
    {
        return $this->repository->paginate($perPage, $filters);
    }

    public function create(array $data): LearningMaterial
    {
        return DB::transaction(fn () => $this->repository->create($data));
    }

    public function update(string $uuid, array $data): LearningMaterial
    {
        $material = $this->repository->findByUuid($uuid);
        abort_if(!$material, 404, 'Materi tidak ditemukan.');

        if (isset($data['_delete_file']) && $data['_delete_file']) {
            $this->deleteFile($material->file_path);
            $data['file_path'] = null;
            unset($data['_delete_file']);
        }

        return DB::transaction(fn () => $this->repository->update($material, $data));
    }

    public function togglePublish(string $uuid): LearningMaterial
    {
        $material = $this->repository->findByUuid($uuid);
        abort_if(!$material, 404, 'Materi tidak ditemukan.');

        return DB::transaction(fn () => $this->repository->update($material, ['is_published' => !$material->is_published]));
    }

    public function delete(string $uuid): void
    {
        $material = $this->repository->findByUuid($uuid);
        abort_if(!$material, 404, 'Materi tidak ditemukan.');

        $this->deleteFile($material->file_path);
        DB::transaction(fn () => $this->repository->delete($material));
    }

    private function deleteFile(?string $filePath): void
    {
        if ($filePath && !filter_var($filePath, FILTER_VALIDATE_URL)) {
            Storage::disk('public')->delete($filePath);
        }
    }
}
