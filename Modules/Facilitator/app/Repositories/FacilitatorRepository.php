<?php

namespace Modules\Facilitator\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Modules\Facilitator\Models\Facilitator;

class FacilitatorRepository
{
    public function stats(): array
    {
        return [
            'total'    => Facilitator::count(),
            'internal' => Facilitator::where('facilitator_type', 'internal')->count(),
            'external' => Facilitator::where('facilitator_type', 'external')->count(),
            'active'   => Facilitator::where('status', 'active')->count(),
            'inactive' => Facilitator::where('status', '!=', 'active')->count(),
            'without_expertise' => Facilitator::where(function ($q) {
                $q->whereNull('expertise')->orWhere('expertise', '');
            })->count(),
            'without_institution' => Facilitator::where(function ($q) {
                $q->whereNull('institution')->orWhere('institution', '');
            })->count(),
        ];
    }

    public function all(): Collection
    {
        return Facilitator::query()->with('user:id,name,email')->where('status', 'active')->orderBy('id')->get();
    }

    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = Facilitator::query()->with('user:id,name,email')->latest();

        if (!empty($filters['type'])) {
            $query->where('facilitator_type', $filters['type']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $s = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($s) {
                $q->whereHas('user', fn ($uq) => $uq->where('name', 'like', $s)->orWhere('email', 'like', $s))
                  ->orWhere('institution', 'like', $s)
                  ->orWhere('expertise', 'like', $s);
            });
        }

        return $query->paginate($perPage);
    }

    public function findByUuid(string $uuid): ?Facilitator
    {
        return Facilitator::query()->with('user:id,name,email')->where('uuid', $uuid)->first();
    }

    public function create(array $data): Facilitator
    {
        return Facilitator::query()->create($data);
    }

    public function update(Facilitator $facilitator, array $data): Facilitator
    {
        $facilitator->update($data);

        return $facilitator->fresh('user');
    }

    public function delete(Facilitator $facilitator): void
    {
        $facilitator->delete();
    }
}
