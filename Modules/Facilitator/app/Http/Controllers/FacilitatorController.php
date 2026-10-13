<?php

namespace Modules\Facilitator\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Modules\Facilitator\Http\Requests\StoreFacilitatorRequest;
use Modules\Facilitator\Services\FacilitatorService;

class FacilitatorController extends Controller
{
    public function stats(FacilitatorService $service)
    {
        return ApiResponse::success('Statistik berhasil diambil', $service->stats());
    }

    public function index(Request $request, FacilitatorService $service)
    {
        try {
            if ($request->boolean('all')) {
                return ApiResponse::success('Data berhasil diambil', $service->all()->map(fn ($f) => [
                    'uuid'             => $f->uuid,
                    'id'               => $f->id,
                    'user_id'          => $f->user_id,
                    'user_name'        => $f->user?->name ?? '—',
                    'user_email'       => $f->user?->email ?? '—',
                    'facilitator_type' => $f->facilitator_type,
                    'institution'      => $f->institution,
                    'expertise'        => $f->expertise,
                    'status'           => $f->status,
                ]));
            }

            $filters = [
                'type'   => $request->input('type'),
                'status' => $request->input('status'),
                'search' => $request->input('search'),
            ];

            $paginated = $service->paginate((int) $request->integer('per_page', 15), $filters);

            $paginated->through(fn ($f) => [
                'uuid'             => $f->uuid,
                'id'               => $f->id,
                'user_id'          => $f->user_id,
                'user_name'        => $f->user?->name ?? '—',
                'user_email'       => $f->user?->email ?? '—',
                'facilitator_type' => $f->facilitator_type,
                'institution'      => $f->institution,
                'expertise'        => $f->expertise,
                'bio'              => $f->bio,
                'status'           => $f->status,
                'created_at'       => $f->created_at,
            ]);

            return ApiResponse::success('Data berhasil diambil', $paginated);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function store(StoreFacilitatorRequest $request, FacilitatorService $service)
    {
        try {
            $record = $service->create($request->validated());
            activity('facilitators')->event('created')->causedBy($request->user())->performedOn($record)->log('fasilitator dibuat');

            return ApiResponse::success('Fasilitator berhasil dibuat', $record, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error($e->getMessage());
        }
    }

    public function update(Request $request, string $uuid, FacilitatorService $service)
    {
        try {
            $data = $request->validate([
                'facilitator_type' => ['required', 'in:internal,external'],
                'institution'      => ['nullable', 'string', 'max:255'],
                'expertise'        => ['nullable', 'string', 'max:255'],
                'bio'              => ['nullable', 'string'],
                'status'           => ['nullable', 'string', 'max:50'],
            ]);

            $record = $service->update($uuid, $data);
            activity('facilitators')->event('updated')->causedBy($request->user())->performedOn($record)->log('fasilitator diperbarui');

            return ApiResponse::success('Fasilitator berhasil diperbarui', $record);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error($e->getMessage());
        }
    }

    public function destroy(Request $request, string $uuid, FacilitatorService $service)
    {
        try {
            $service->delete($uuid);
            activity('facilitators')->event('deleted')->causedBy($request->user())->log("fasilitator dihapus: {$uuid}");

            return ApiResponse::success('Fasilitator berhasil dihapus');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error($e->getMessage());
        }
    }
}
