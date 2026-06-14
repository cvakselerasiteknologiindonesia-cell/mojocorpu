<?php

namespace Modules\OPD\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Modules\OPD\Repositories\OPDRepository;

class OPDService
{
    public function __construct(private readonly OPDRepository $repository)
    {
    }

    public function stats(): array
    {
        return $this->repository->stats();
    }

    public function paginate(int $perPage = 15, array $filters = [])
    {
        return $this->repository->paginate($perPage, $filters);
    }

    public function create(array $data)
    {
        return DB::transaction(fn () => $this->repository->create($data));
    }

    public function syncFromSso(): array
    {
        $baseUrl     = rtrim(config('services.sso.base_url'), '/');
        $path        = config('services.sso.internal_opds_path', '/api/internal/opds');
        $serviceToken = config('services.sso.service_token');

        $response = Http::withHeader('X-Service-Token', $serviceToken)
            ->timeout(15)
            ->get($baseUrl.$path);

        if (!$response->successful()) {
            Log::warning('OPD SSO sync failed', ['status' => $response->status(), 'body' => $response->body()]);
            throw new \RuntimeException('Gagal terhubung ke SSO: '.$response->status());
        }

        $records = $response->json('data', []);

        if (empty($records)) {
            return ['synced' => 0, 'message' => 'Tidak ada data OPD dari SSO.'];
        }

        $synced = DB::transaction(fn () => $this->repository->upsertFromSso($records));

        return ['synced' => $synced, 'message' => "Berhasil sinkronisasi {$synced} OPD dari SSO."];
    }
}