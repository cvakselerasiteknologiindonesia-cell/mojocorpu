<?php

use Illuminate\Support\Facades\Route;
use Modules\OPD\Http\Controllers\OPDController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('opds/stats', [OPDController::class, 'stats'])->middleware('permission:view opd');
    Route::get('opds', [OPDController::class, 'index'])->middleware('permission:view opd');
    Route::post('opds/sync-sso', [OPDController::class, 'syncFromSso'])->middleware('permission:create opd');
    Route::post('opds', [OPDController::class, 'store'])->middleware('permission:create opd');
});