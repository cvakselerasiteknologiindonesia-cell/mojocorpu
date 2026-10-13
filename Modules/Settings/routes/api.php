<?php

use Illuminate\Support\Facades\Route;
use Modules\Settings\Http\Controllers\SettingsController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('settings', [SettingsController::class, 'index'])->middleware('permission:manage settings');
    Route::put('settings', [SettingsController::class, 'update'])->middleware('permission:manage settings');
    Route::post('settings/test-ai', [SettingsController::class, 'testConnection'])->middleware('permission:manage settings');
    Route::get('settings/wallet', [SettingsController::class, 'walletIndex'])->middleware('permission:manage settings');
    Route::put('settings/wallet', [SettingsController::class, 'walletUpdate'])->middleware('permission:manage settings');
    Route::get('settings/app', [SettingsController::class, 'appIndex'])->middleware('permission:manage settings');
    Route::post('settings/app', [SettingsController::class, 'appUpdate'])->middleware('permission:manage settings');
    Route::get('settings/payment', [SettingsController::class, 'paymentIndex'])->middleware('permission:manage settings');
    Route::put('settings/payment', [SettingsController::class, 'paymentUpdate'])->middleware('permission:manage settings');
    Route::post('settings/test-payment', [SettingsController::class, 'testPaymentConnection'])->middleware('permission:manage settings');
});
