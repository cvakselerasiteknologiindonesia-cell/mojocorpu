<?php

namespace Modules\TrainingProposal\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Notification\Services\NotificationService;
use Modules\TrainingEvent\Models\TrainingEvent;
use Modules\TrainingEvent\Models\TrainingEventSupportingDocument;
use Modules\TrainingProposal\Models\TrainingProposal;
use Modules\TrainingProposal\Repositories\TrainingProposalRepository;

class TrainingProposalService
{
    public function __construct(
        private readonly TrainingProposalRepository $repository,
        private readonly NotificationService $notifications,
    ) {}

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
        return DB::transaction(function () use ($data) {
            $proposal = $this->repository->create($this->proposalData($data));
            $this->syncDraftEvent($proposal, $data['event'] ?? null, $proposal->status);

            return $proposal->fresh(['proposer', 'trainingEvents.facilitators.user', 'trainingEvents.targetOpds', 'trainingEvents.targetUsers']);
        });
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

        return DB::transaction(function () use ($proposal, $data) {
            $updated = $this->repository->update($proposal, $this->proposalData($data));
            $this->syncDraftEvent($updated, $data['event'] ?? null, $updated->status);

            return $updated->fresh(['proposer', 'trainingEvents.facilitators.user', 'trainingEvents.targetOpds', 'trainingEvents.targetUsers']);
        });
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

        return DB::transaction(function () use ($proposal, $newStatus) {
            $updated = $this->repository->update($proposal, ['status' => $newStatus]);
            $event = $updated->trainingEvents()->oldest('id')->first();

            if ($newStatus === 'approved') {
                abort_unless($event, 422, 'Proposal belum memiliki rancangan event.');
                $event->update(['status' => 'active']);
                $this->notifyTargetAsns($event->fresh(['targetOpds', 'targetUsers']), $updated);
                $this->notifyFacilitators($event->fresh(['facilitators.user']), $updated);
            } elseif ($event) {
                $event->update(['status' => 'rejected']);
            }

            return $updated->fresh(['proposer', 'trainingEvents.facilitators.user', 'trainingEvents.targetOpds', 'trainingEvents.targetUsers']);
        });
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

    private function proposalData(array $data): array
    {
        unset($data['event']);

        return $data;
    }

    private function syncDraftEvent(TrainingProposal $proposal, ?array $eventData, string $proposalStatus): ?TrainingEvent
    {
        if ($eventData === null) {
            return null;
        }

        $facilitatorIds = array_values(array_filter($eventData['facilitator_ids'] ?? []));
        $targetAllOpds = (bool) ($eventData['target_all_opds'] ?? false);
        $targetOpdIds = array_values(array_filter($eventData['target_opd_ids'] ?? []));
        $targetUserIds = array_values(array_filter($eventData['target_user_ids'] ?? []));
        $banner = $eventData['banner'] ?? null;
        $removeBanner = (bool) ($eventData['banner_remove'] ?? false);
        $supportingDocuments = $eventData['supporting_documents'] ?? [];
        $removeSupportingDocumentIds = array_values(array_filter($eventData['remove_supporting_document_ids'] ?? []));
        unset(
            $eventData['facilitator_ids'],
            $eventData['target_all_opds'],
            $eventData['target_opd_ids'],
            $eventData['target_user_ids'],
            $eventData['banner'],
            $eventData['banner_remove'],
            $eventData['supporting_documents'],
            $eventData['remove_supporting_document_ids'],
        );

        $eventData = array_filter($eventData, fn ($value) => $value !== null && $value !== '');

        abort_unless(! empty($facilitatorIds), 422, 'Fasilitator wajib dipilih.');
        abort_unless(! empty($eventData['start_date']), 422, 'Tanggal mulai event wajib diisi.');
        abort_unless(! empty($eventData['end_date']), 422, 'Tanggal selesai event wajib diisi.');

        $payload = [
            'training_proposal_id' => $proposal->id,
            'title' => $eventData['title'] ?? $proposal->title,
            'description' => $eventData['description'] ?? $proposal->description,
            'location' => $eventData['location'] ?? null,
            'start_date' => $eventData['start_date'],
            'end_date' => $eventData['end_date'],
            'quota' => (int) ($eventData['quota'] ?? 0),
            'is_paid' => (bool) ($eventData['is_paid'] ?? false),
            'price' => ! empty($eventData['is_paid']) ? (int) ($eventData['price'] ?? 0) : null,
            'facilitator_id' => $facilitatorIds[0] ?? null,
            'target_all_opds' => $targetAllOpds,
            'status' => $this->eventStatusForProposal($proposalStatus),
        ];

        $event = $proposal->trainingEvents()->oldest('id')->first();

        if ($event) {
            if ($removeBanner && $event->banner_image) {
                Storage::disk('public')->delete($event->banner_image);
                $payload['banner_image'] = null;
            }

            if ($banner instanceof UploadedFile) {
                if ($event->banner_image) {
                    Storage::disk('public')->delete($event->banner_image);
                }

                $payload['banner_image'] = $banner->store('event-banners', 'public');
            }

            $event->update($payload);
        } else {
            if ($banner instanceof UploadedFile) {
                $payload['banner_image'] = $banner->store('event-banners', 'public');
            }

            $event = TrainingEvent::query()->create($payload);
        }

        $event->facilitators()->sync($facilitatorIds);
        $event->targetOpds()->sync($targetAllOpds ? [] : $targetOpdIds);
        $event->targetUsers()->sync($targetUserIds);
        $this->removeSupportingDocuments($event, $removeSupportingDocumentIds);
        $this->storeSupportingDocuments($event, $supportingDocuments);

        return $event;
    }

    private function eventStatusForProposal(string $proposalStatus): string
    {
        return match ($proposalStatus) {
            'submitted' => 'scheduled',
            'approved' => 'active',
            'rejected' => 'rejected',
            default => 'draft',
        };
    }

    private function notifyFacilitators(TrainingEvent $event, TrainingProposal $proposal): void
    {
        $userIds = $event->facilitators
            ->pluck('user_id')
            ->filter()
            ->values()
            ->all();

        $this->notifications->sendMany(
            $userIds,
            'Event pelatihan baru aktif',
            "Usulan \"{$proposal->title}\" telah disetujui dan event \"{$event->title}\" sudah aktif untuk Anda kelola.",
            'training_event',
            '/training-events',
        );
    }

    private function storeSupportingDocuments(TrainingEvent $event, array $documents): void
    {
        foreach ($documents as $document) {
            if (! $document instanceof UploadedFile) {
                continue;
            }

            $event->supportingDocuments()->create([
                'original_name' => $document->getClientOriginalName(),
                'file_path' => $document->store('event-supporting-documents', 'public'),
                'mime_type' => $document->getClientMimeType(),
                'size' => $document->getSize() ?: 0,
            ]);
        }
    }

    private function removeSupportingDocuments(TrainingEvent $event, array $documentIds): void
    {
        if (empty($documentIds)) {
            return;
        }

        $documents = TrainingEventSupportingDocument::query()
            ->where('training_event_id', $event->id)
            ->whereIn('id', $documentIds)
            ->get();

        foreach ($documents as $document) {
            Storage::disk('public')->delete($document->file_path);
            $document->delete();
        }
    }

    private function notifyTargetAsns(TrainingEvent $event, TrainingProposal $proposal): void
    {
        $query = User::role('asn')
            ->where('is_active', true);

        $targetUserIds = $event->targetUsers->pluck('id')->filter()->values();
        $targetOpdIds = $event->targetOpds->pluck('id')->filter()->values();

        if ($event->target_all_opds) {
            $userIds = $query->pluck('id')->all();
        } elseif ($targetOpdIds->isNotEmpty() || $targetUserIds->isNotEmpty()) {
            $userIds = $query
                ->where(function ($q) use ($targetOpdIds, $targetUserIds): void {
                    if ($targetOpdIds->isNotEmpty()) {
                        $q->orWhereIn('opd_id', $targetOpdIds->all());
                    }

                    if ($targetUserIds->isNotEmpty()) {
                        $q->orWhereIn('id', $targetUserIds->all());
                    }
                })
                ->pluck('id')
                ->all();
        } else {
            $userIds = [];
        }

        $this->notifications->sendMany(
            $userIds,
            'Event pelatihan baru tersedia',
            "Usulan \"{$proposal->title}\" telah disetujui. Event \"{$event->title}\" kini tersedia untuk Anda.",
            'training_event_asn',
            '/training-events',
        );
    }
}
