<?php

namespace Modules\OPD\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Modules\OPD\Http\Requests\StoreOPDRequest;
use Modules\OPD\Services\OPDService;

class OPDController extends Controller
{
    public function stats(OPDService $service)
    {
        return ApiResponse::success('Stats retrieved', $service->stats());
    }

    public function index(Request $request, OPDService $service)
    {
        try {
            $filters = ['search' => $request->input('search')];
            $paginated = $service->paginate((int) $request->integer('per_page', 15), $filters);

            $paginated->through(fn ($opd) => [
                'uuid' => $opd->uuid,
                'code' => $opd->code,
                'name' => $opd->name,
                'address' => $opd->address,
                'phone' => $opd->phone,
                'email' => $opd->email,
                'is_active' => (bool) $opd->is_active,
                'asn_count' => (int) $opd->asn_count,
                'unit_count' => (int) $opd->unit_count,
                'created_at' => $opd->created_at,
            ]);

            return ApiResponse::success('Data retrieved', $paginated);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

            return ApiResponse::error();
        }
    }

    public function store(StoreOPDRequest $request, OPDService $service)
    {
        try {
            $opd = $service->create($request->validated());
            activity('opd')->event('created')->causedBy($request->user())->performedOn($opd)->log('OPD created');

            return ApiResponse::success('Created successfully', $opd, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

            return ApiResponse::error();
        }
    }

    public function syncFromSso(Request $request, OPDService $service)
    {
        try {
            $result = $service->syncFromSso();
            activity('opd')->event('synced')->causedBy($request->user())->log('OPD synced from SIMPEG: '.$result['synced'].' records');

            return ApiResponse::success($result['message'], [
                'synced' => $result['synced'],
                'total_source' => $result['total_source'] ?? null,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

            return ApiResponse::error($e->getMessage(), 502);
        }
    }
}
