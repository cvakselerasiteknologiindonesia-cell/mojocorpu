<?php

namespace Modules\TrainingEvent\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Modules\TrainingEvent\Models\TrainingEvent;

class TrainingEventRepository
{
    public function paginate(int $perPage = 15, ?int $facilitatorId = null): LengthAwarePaginator
    {
        return TrainingEvent::query()
            ->with(['facilitators.user', 'certificateTemplate:id,name'])
            ->withCount('participants')
            ->when($facilitatorId !== null, fn ($q) => $q->where(function ($q) use ($facilitatorId) {
                $q->where('facilitator_id', $facilitatorId)
                    ->orWhereHas('facilitators', fn ($q) => $q->where('facilitator_id', $facilitatorId));
            }))
            ->latest()
            ->paginate($perPage);
    }

    public function findByUuid(string $uuid): TrainingEvent
    {
        return TrainingEvent::query()->where('uuid', $uuid)->firstOrFail();
    }

    public function create(array $data): TrainingEvent
    {
        return TrainingEvent::query()->create($data);
    }

    public function update(TrainingEvent $event, array $data): TrainingEvent
    {
        $event->update($data);

        return $event->load(['facilitators.user']);
    }

    public function delete(TrainingEvent $event): void
    {
        $event->delete();
    }
}
