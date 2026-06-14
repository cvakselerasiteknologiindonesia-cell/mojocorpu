<?php

namespace Modules\TrainingEvent\Services;

use Illuminate\Support\Facades\DB;
use Modules\TrainingEvent\Models\TrainingEvent;
use Modules\TrainingEvent\Repositories\TrainingEventRepository;

class TrainingEventService
{
    public function __construct(private readonly TrainingEventRepository $repository)
    {
    }

    public function paginate(int $perPage = 15, ?int $facilitatorId = null)
    {
        return $this->repository->paginate($perPage, $facilitatorId);
    }

    public function findByUuid(string $uuid): TrainingEvent
    {
        return $this->repository->findByUuid($uuid);
    }

    public function create(array $data): TrainingEvent
    {
        return DB::transaction(fn () => $this->repository->create($data));
    }

    public function update(TrainingEvent $event, array $data): TrainingEvent
    {
        return DB::transaction(fn () => $this->repository->update($event, $data));
    }

    public function delete(TrainingEvent $event): void
    {
        DB::transaction(fn () => $this->repository->delete($event));
    }
}
