<?php

use Illuminate\Support\Facades\Route;
use Modules\KMS\Http\Controllers\KMSController;

Route::middleware('auth:sanctum')->group(function () {
    // Categories — read open to anyone with view/upload; write gated to create kms asset
    Route::get('kms-categories', [KMSController::class, 'categories'])->middleware('permission:view kms asset|upload kms assets');
    Route::post('kms-categories', [KMSController::class, 'storeCategory'])->middleware('permission:create kms asset');
    Route::put('kms-categories/{uuid}', [KMSController::class, 'updateCategory'])->middleware('permission:create kms asset');
    Route::delete('kms-categories/{uuid}', [KMSController::class, 'destroyCategory'])->middleware('permission:create kms asset');

    // Assets
    Route::get('kms-assets/stats', [KMSController::class, 'stats'])->middleware('permission:view kms asset|upload kms assets');
    Route::get('kms-assets', [KMSController::class, 'index'])->middleware('permission:view kms asset|upload kms assets');
    Route::post('kms-assets', [KMSController::class, 'store'])->middleware('permission:create kms asset|upload kms assets');
    Route::post('kms-assets/{uuid}/review', [KMSController::class, 'review'])->middleware('permission:create kms asset');
    Route::post('kms-assets/{uuid}', [KMSController::class, 'update'])->middleware('permission:create kms asset|upload kms assets');
    Route::delete('kms-assets/{uuid}', [KMSController::class, 'destroy'])->middleware('permission:create kms asset|upload kms assets');
});
