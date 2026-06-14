<?php

use Illuminate\Support\Facades\Route;
use Modules\Settings\Http\Controllers\SettingsController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('settings',              [SettingsController::class, 'index'])->middleware('permission:manage settings');
    Route::put('settings',              [SettingsController::class, 'update'])->middleware('permission:manage settings');
    Route::post('settings/test-ai',     [SettingsController::class, 'testConnection'])->middleware('permission:manage settings');
    Route::get('settings/wallet',       [SettingsController::class, 'walletIndex'])->middleware('permission:manage settings');
    Route::put('settings/wallet',       [SettingsController::class, 'walletUpdate'])->middleware('permission:manage settings');
});
