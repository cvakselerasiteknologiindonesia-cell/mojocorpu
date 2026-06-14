<?php

use Illuminate\Support\Facades\Route;
use Modules\Report\Http\Controllers\ReportController;

Route::middleware(['auth:sanctum', 'permission:view report'])->group(function () {
    Route::get('reports/summary', [ReportController::class, 'summary']);
    Route::get('reports/proposals', [ReportController::class, 'proposals']);
    Route::get('reports/events', [ReportController::class, 'events']);
    Route::get('reports/export', [ReportController::class, 'export']);
});
