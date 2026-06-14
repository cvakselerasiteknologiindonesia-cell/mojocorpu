<?php

use Illuminate\Support\Facades\Route;
use Modules\Dashboard\Http\Controllers\DashboardController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index']);
    Route::get('dashboard/super-admin', [DashboardController::class, 'superAdmin'])
        ->middleware('role:super-admin');
    Route::get('dashboard/opd-admin', [DashboardController::class, 'opdAdmin'])
        ->middleware('role:admin-opd');
});