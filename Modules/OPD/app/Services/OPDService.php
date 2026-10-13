<?php

namespace Modules\OPD\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Modules\OPD\Repositories\OPDRepository;

class OPDService
{
    public function __construct(private readonly OPDRepository $repository) {}

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
        return $this->syncFromSimpegSatker();
    }

    public function syncFromSimpegSatker(bool $forceRefresh = false): array
    {
        $payload = $this->fetchSimpegSatkerAll($forceRefresh);
        $records = $payload['satker'] ?? [];

        if (empty($records)) {
            return ['synced' => 0, 'total_source' => 0, 'message' => 'Tidak ada data satuan kerja dari SIMPEG.'];
        }

        $rootRecords = array_values(array_filter($records, fn ($rec) => (string) ($rec['satker_id_parent'] ?? '') === '0'));
        $synced = DB::transaction(fn () => $this->repository->upsertFromSimpegSatker($rootRecords));

        Log::info('SIMPEG satker sync completed', [
            'source_total' => count($records),
            'root_total' => count($rootRecords),
            'synced' => $synced,
        ]);

        return [
            'synced' => $synced,
            'total_source' => count($records),
            'message' => "Berhasil sinkronisasi {$synced} OPD induk dari {$payload['source']} SIMPEG.",
        ];
    }

    public function fetchSimpegSatkerAll(bool $forceRefresh = false): array
    {
        $ttl = max(60, (int) config('services.simpeg.cache_ttl', 3600));
        $snapshotPath = storage_path('app/simpeg/get-satker-all.json');

        if (
            ! $forceRefresh
            && File::exists($snapshotPath)
            && (time() - File::lastModified($snapshotPath)) <= $ttl
        ) {
            $payload = json_decode(File::get($snapshotPath), true) ?: [];

            return ['source' => 'snapshot-cache', ...$payload];
        }

        $baseUrl = rtrim(config('services.simpeg.base_url'), '/');
        $path = config('services.simpeg.satker_all_path', '/api/get-satker-all');

        try {
            $response = Http::acceptJson()
                ->timeout(10)
                ->retry(2, 500)
                ->get($baseUrl.$path);

            if (! $response->successful()) {
                throw new \RuntimeException('HTTP '.$response->status());
            }

            $payload = $response->json() ?? [];
            Storage::disk('local')->put('simpeg/get-satker-all.json', json_encode($payload, JSON_UNESCAPED_UNICODE));

            return ['source' => 'api', ...$payload];
        } catch (\Throwable $e) {
            Log::warning('SIMPEG satker API unavailable, trying local snapshot', [
                'message' => $e->getMessage(),
                'url' => $baseUrl.$path,
            ]);

            $snapshotPath = storage_path('app/simpeg/get-satker-all.json');

            if (! File::exists($snapshotPath)) {
                throw new \RuntimeException('Gagal terhubung ke API SIMPEG dan snapshot lokal belum tersedia.');
            }

            $payload = json_decode(File::get($snapshotPath), true) ?: [];

            return ['source' => 'snapshot', ...$payload];
        }
    }

    public function syncFromInternalSso(): array
    {
        $baseUrl = rtrim(config('services.sso.base_url'), '/');
        $path = config('services.sso.internal_opds_path', '/api/internal/opds');
        $serviceToken = config('services.sso.service_token');

        $response = Http::withHeader('X-Service-Token', $serviceToken)
            ->timeout(15)
            ->get($baseUrl.$path);

        if (! $response->successful()) {
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
