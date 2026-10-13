<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Modules\OPD\Services\OPDService;

class SyncSimpegSatker extends Command
{
    protected $signature = 'simpeg:sync-satker {--force : Ambil ulang dari API SIMPEG, abaikan cache}';

    protected $description = 'Sinkronisasi data satuan kerja SIMPEG ke database lokal Corpu';

    public function handle(OPDService $service): int
    {
        $result = $service->syncFromSimpegSatker((bool) $this->option('force'));

        $this->info($result['message']);
        $this->line('Total sumber: '.($result['total_source'] ?? 0));
        $this->line('Total tersinkron: '.$result['synced']);

        return self::SUCCESS;
    }
}
