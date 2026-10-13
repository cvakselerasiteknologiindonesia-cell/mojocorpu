<?php

namespace Modules\TrainingProposal\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Modules\OPD\Models\OPD;
use Modules\TrainingProposal\Http\Requests\StoreTrainingProposalRequest;
use Modules\TrainingProposal\Http\Requests\UpdateTrainingProposalRequest;
use Modules\TrainingProposal\Services\TrainingProposalService;

class TrainingProposalController extends Controller
{
    public function stats(TrainingProposalService $service)
    {
        return ApiResponse::success('Stats retrieved', $service->stats());
    }

    public function audienceOptions(Request $request)
    {
        try {
            $opds = OPD::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code'])
                ->map(fn ($opd) => [
                    'id' => $opd->id,
                    'name' => $opd->name,
                    'code' => $opd->code,
                ]);

            $asns = User::role('asn')
                ->where('is_active', true)
                ->orderBy('name')
                ->limit(500)
                ->get(['id', 'name', 'nip', 'email', 'opd_id', 'opd_name'])
                ->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'nip' => $user->nip,
                    'email' => $user->email,
                    'opd_id' => $user->opd_id,
                    'opd_name' => $user->opd_name,
                ]);

            return ApiResponse::success('Audience options retrieved', [
                'opds' => $opds,
                'asns' => $asns,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function index(Request $request, TrainingProposalService $service)
    {
        try {
            $user = $request->user();
            $filters = [
                'status' => $request->input('status'),
                'search' => $request->input('search'),
                'mine' => $request->boolean('mine'),
                'user_id' => $user->id,
                // [H5] Scoped per OPD — super-admin bisa lihat semua
                'opd_id' => $user->hasRole('super-admin') ? null : $user->opd_id,
            ];

            $paginated = $service->paginate((int) $request->integer('per_page', 12), $filters);

            $canApprove = $user->can('approve training proposal');

            $paginated->through(fn ($p) => $this->formatProposal($p, $request->user()->id, $canApprove));

            return ApiResponse::success('Data retrieved', $paginated);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function store(StoreTrainingProposalRequest $request, TrainingProposalService $service)
    {
        try {
            $data = $request->validated();
            $data['proposed_by'] = $request->user()->id;
            $data['opd_id'] = $request->user()->opd_id ?? 0;
            $data['status'] = $data['status'] ?? 'draft';

            $record = $service->create($data);
            activity('training-proposals')->event('created')->causedBy($request->user())->performedOn($record)->log('Proposal created');

            return ApiResponse::success('Created successfully', $record, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error($e->getMessage());
        }
    }

    public function update(UpdateTrainingProposalRequest $request, string $uuid, TrainingProposalService $service)
    {
        try {
            $isAdmin = $request->user()->can('approve training proposal');
            $record = $service->update($uuid, $request->validated(), $request->user()->id, $isAdmin);
            activity('training-proposals')->event('updated')->causedBy($request->user())->performedOn($record)->log('Proposal updated');

            return ApiResponse::success('Updated successfully', $record);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error($e->getMessage());
        }
    }

    public function approve(Request $request, string $uuid, TrainingProposalService $service)
    {
        try {
            $data = $request->validate(['status' => ['required', 'in:approved,rejected']]);
            $record = $service->approve($uuid, $data['status']);
            activity('training-proposals')->event('updated')->causedBy($request->user())->performedOn($record)->log("Proposal {$data['status']}: {$uuid}");

            return ApiResponse::success('Status updated', $record);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error($e->getMessage());
        }
    }

    public function destroy(Request $request, string $uuid, TrainingProposalService $service)
    {
        try {
            $isAdmin = $request->user()->can('approve training proposal');
            $service->delete($uuid, $request->user()->id, $isAdmin);
            activity('training-proposals')->event('deleted')->causedBy($request->user())->log("Proposal deleted: {$uuid}");

            return ApiResponse::success('Deleted successfully');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error($e->getMessage());
        }
    }

    private function formatProposal($p, int $userId, bool $canApprove): array
    {
        $event = $p->trainingEvents->sortBy('id')->first();

        return [
            'uuid' => $p->uuid,
            'id' => $p->id,
            'title' => $p->title,
            'description' => $p->description,
            'recommendation' => $p->recommendation,
            'status' => $p->status,
            'opd_id' => $p->opd_id,
            'opd_name' => $p->proposer?->opd_name ?? '—',
            'proposer_id' => $p->proposed_by,
            'proposer_name' => $p->proposer?->name ?? '—',
            'events_count' => $p->training_events_count,
            'event' => $event ? [
                'id' => $event->id,
                'uuid' => $event->uuid,
                'title' => $event->title,
                'description' => $event->description,
                'location' => $event->location,
                'start_date' => optional($event->start_date)->toDateString(),
                'end_date' => optional($event->end_date)->toDateString(),
                'quota' => $event->quota,
                'status' => $event->status,
                'banner_url' => $event->banner_url,
                'is_paid' => (bool) $event->is_paid,
                'price' => $event->price,
                'facilitator_ids' => $event->facilitators->pluck('id')->values(),
                'facilitator_names' => $event->facilitators
                    ->map(fn ($f) => $f->user?->name)
                    ->filter()
                    ->values(),
                'target_all_opds' => (bool) $event->target_all_opds,
                'target_opd_ids' => $event->targetOpds->pluck('id')->values(),
                'target_opd_names' => $event->targetOpds->pluck('name')->values(),
                'target_user_ids' => $event->targetUsers->pluck('id')->values(),
                'target_user_names' => $event->targetUsers
                    ->map(fn ($u) => $u->name)
                    ->filter()
                    ->values(),
                'supporting_documents' => $event->supportingDocuments
                    ->map(fn ($document) => [
                        'id' => $document->id,
                        'name' => $document->original_name,
                        'url' => $document->file_url,
                        'mime_type' => $document->mime_type,
                        'size' => $document->size,
                    ])
                    ->values(),
            ] : null,
            'is_mine' => $p->proposed_by === $userId,
            'can_approve' => $canApprove,
            'created_at' => $p->created_at,
            'updated_at' => $p->updated_at,
        ];
    }
}
