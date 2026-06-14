<?php

namespace Modules\TrainingProposal\Services;

use Illuminate\Support\Facades\DB;
use Modules\TrainingProposal\Models\TrainingProposal;
use Modules\TrainingProposal\Repositories\TrainingProposalRepository;

class TrainingProposalService
{
    public function __construct(private readonly TrainingProposalRepository $repository) {}

    public function stats(): array
    {
        return $this->repository->stats();
    }

    public function paginate(int $perPage = 15, array $filters = [])
    {
        return $this->repository->paginate($perPage, $filters);
    }

    public function create(array $data): TrainingProposal
    {
        return DB::transaction(fn () => $this->repository->create($data));
    }

    public function update(string $uuid, array $data, int $userId, bool $isAdmin = false): TrainingProposal
    {
        $proposal = $this->repository->findByUuid($uuid);
        abort_if(!$proposal, 404, 'Proposal tidak ditemukan.');

        if (!$isAdmin) {
            abort_unless($proposal->proposed_by === $userId, 403, 'Anda tidak memiliki akses untuk mengedit proposal ini.');
            abort_unless(
                in_array($proposal->status, ['draft', 'rejected']),
                422,
                'Proposal yang sudah diajukan tidak dapat diedit.'
            );
        }

        return DB::transaction(fn () => $this->repository->update($proposal, $data));
    }

    public function approve(string $uuid, string $newStatus): TrainingProposal
    {
        abort_unless(in_array($newStatus, ['approved', 'rejected']), 422, 'Status tidak valid.');

        $proposal = $this->repository->findByUuid($uuid);
        abort_if(!$proposal, 404, 'Proposal tidak ditemukan.');
        abort_unless(
            $proposal->status === 'submitted',
            422,
            'Hanya proposal yang diajukan yang dapat disetujui atau ditolak.'
        );

        return DB::transaction(fn () => $this->repository->update($proposal, ['status' => $newStatus]));
    }

    public function delete(string $uuid, int $userId, bool $isAdmin = false): void
    {
        $proposal = $this->repository->findByUuid($uuid);
        abort_if(!$proposal, 404, 'Proposal tidak ditemukan.');

        if (!$isAdmin) {
            abort_unless($proposal->proposed_by === $userId, 403, 'Anda tidak memiliki akses untuk menghapus proposal ini.');
            abort_unless(
                in_array($proposal->status, ['draft', 'rejected']),
                422,
                'Proposal yang sudah diajukan tidak dapat dihapus.'
            );
        }

        DB::transaction(fn () => $this->repository->delete($proposal));
    }
}
