<?php

use Illuminate\Support\Facades\Route;
use Modules\Store\Http\Controllers\StoreController;

Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::get('store', [StoreController::class, 'index']);
    Route::post('store/{uuid}/purchase', [StoreController::class, 'purchase'])->middleware('throttle:10,1');
    Route::get('store/my-purchases', [StoreController::class, 'myPurchases']);

    Route::middleware('role:super-admin|admin-opd')->prefix('store/admin')->group(function () {
        Route::get('items', [StoreController::class, 'adminItems']);
        Route::post('items', [StoreController::class, 'storeItem']);
        Route::put('items/{uuid}', [StoreController::class, 'updateItem']);
        Route::post('items/{uuid}/image', [StoreController::class, 'uploadImage']);
        Route::delete('items/{uuid}', [StoreController::class, 'destroyItem']);
        Route::get('purchases', [StoreController::class, 'adminPurchases']);
        Route::patch('purchases/{id}/fulfill', [StoreController::class, 'fulfill']);
        Route::patch('purchases/{id}/cancel', [StoreController::class, 'cancel']);
    });
});
