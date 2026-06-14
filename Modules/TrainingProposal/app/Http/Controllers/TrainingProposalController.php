<?php

namespace Modules\TrainingProposal\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Modules\TrainingProposal\Http\Requests\StoreTrainingProposalRequest;
use Modules\TrainingProposal\Http\Requests\UpdateTrainingProposalRequest;
use Modules\TrainingProposal\Services\TrainingProposalService;

class TrainingProposalController extends Controller
{
    public function stats(TrainingProposalService $service)
    {
        return ApiResponse::success('Stats retrieved', $service->stats());
    }

    public function index(Request $request, TrainingProposalService $service)
    {
        try {
            $filters = [
                'status'  => $request->input('status'),
                'search'  => $request->input('search'),
                'mine'    => $request->boolean('mine'),
                'user_id' => $request->user()->id,
            ];

            $paginated = $service->paginate((int) $request->integer('per_page', 12), $filters);

            $canApprove = $request->user()->can('approve training proposal');

            $paginated->through(fn ($p) => [
                'uuid'            => $p->uuid,
                'id'              => $p->id,
                'title'           => $p->title,
                'description'     => $p->description,
                'recommendation'  => $p->recommendation,
                'status'          => $p->status,
                'opd_id'          => $p->opd_id,
                'opd_name'        => $p->proposer?->opd_name ?? '—',
                'proposer_id'     => $p->proposed_by,
                'proposer_name'   => $p->proposer?->name ?? '—',
                'events_count'    => $p->training_events_count,
                'is_mine'         => $p->proposed_by === $request->user()->id,
                'can_approve'     => $canApprove,
                'created_at'      => $p->created_at,
                'updated_at'      => $p->updated_at,
            ]);

            return ApiResponse::success('Data retrieved', $paginated);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function store(StoreTrainingProposalRequest $request, TrainingProposalService $service)
    {
        try {
            $data                = $request->validated();
            $data['proposed_by'] = $request->user()->id;
            $data['opd_id']      = $request->user()->opd_id ?? 0;
            $data['status']      = $data['status'] ?? 'draft';

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
            $record  = $service->update($uuid, $request->validated(), $request->user()->id, $isAdmin);
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
            $data   = $request->validate(['status' => ['required', 'in:approved,rejected']]);
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
}
