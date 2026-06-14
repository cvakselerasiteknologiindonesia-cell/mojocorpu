<?php

namespace Modules\TrainingProposal\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Modules\TrainingProposal\Models\TrainingProposal;

class TrainingProposalRepository
{
    public function stats(): array
    {
        return [
            'total'     => TrainingProposal::count(),
            'draft'     => TrainingProposal::where('status', 'draft')->count(),
            'submitted' => TrainingProposal::where('status', 'submitted')->count(),
            'approved'  => TrainingProposal::where('status', 'approved')->count(),
            'rejected'  => TrainingProposal::where('status', 'rejected')->count(),
        ];
    }

    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = TrainingProposal::query()
            ->with('proposer:id,name,opd_name')
            ->withCount('trainingEvents')
            ->latest();

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['mine']) && !empty($filters['user_id'])) {
            $query->where('proposed_by', $filters['user_id']);
        }

        if (!empty($filters['search'])) {
            $s = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', $s)
                  ->orWhere('description', 'like', $s);
            });
        }

        return $query->paginate($perPage);
    }

    public function findByUuid(string $uuid): ?TrainingProposal
    {
        return TrainingProposal::query()
            ->with('proposer:id,name,opd_name')
            ->where('uuid', $uuid)
            ->first();
    }

    public function create(array $data): TrainingProposal
    {
        return TrainingProposal::query()->create($data);
    }

    public function update(TrainingProposal $proposal, array $data): TrainingProposal
    {
        $proposal->update($data);

        return $proposal->fresh(['proposer']);
    }

    public function delete(TrainingProposal $proposal): void
    {
        $proposal->delete();
    }
}
