<?php

namespace Modules\Facilitator\Services;

use Illuminate\Support\Facades\DB;
use Modules\Facilitator\Models\Facilitator;
use Modules\Facilitator\Repositories\FacilitatorRepository;

class FacilitatorService
{
    public function __construct(private readonly FacilitatorRepository $repository) {}

    public function stats(): array
    {
        return $this->repository->stats();
    }

    public function all()
    {
        return $this->repository->all();
    }

    public function paginate(int $perPage = 15, array $filters = [])
    {
        return $this->repository->paginate($perPage, $filters);
    }

    public function create(array $data): Facilitator
    {
        return DB::transaction(fn () => $this->repository->create($data));
    }

    public function update(string $uuid, array $data): Facilitator
    {
        $facilitator = $this->repository->findByUuid($uuid);
        abort_if(!$facilitator, 404, 'Fasilitator tidak ditemukan.');

        $oldType = $facilitator->facilitator_type;
        $newType = $data['facilitator_type'] ?? $oldType;

        $result = DB::transaction(fn () => $this->repository->update($facilitator, $data));

        if ($oldType !== $newType && $result->user) {
            $oldRole = 'fasilitator-' . ($oldType === 'internal' ? 'internal' : 'eksternal');
            $newRole = 'fasilitator-' . ($newType === 'internal' ? 'internal' : 'eksternal');
            $result->user->removeRole($oldRole);
            $result->user->assignRole($newRole);
        }

        return $result;
    }

    public function delete(string $uuid): void
    {
        $facilitator = $this->repository->findByUuid($uuid);
        abort_if(!$facilitator, 404, 'Fasilitator tidak ditemukan.');

        DB::transaction(fn () => $this->repository->delete($facilitator));
    }
}
