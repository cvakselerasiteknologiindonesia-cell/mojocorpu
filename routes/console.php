<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// [M4] Hapus expired Sanctum tokens dari DB setiap hari
Schedule::command('sanctum:prune-expired --hours=2')->daily();
Schedule::command('simpeg:sync-satker')->dailyAt('02:10')->withoutOverlapping();
