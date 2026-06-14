<?php

use Illuminate\Support\Facades\Route;
use Modules\Wallet\Http\Controllers\WalletController;

Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () {
    Route::get('wallet', [WalletController::class, 'show']);
    Route::get('wallet/transactions', [WalletController::class, 'transactions']);
    Route::get('wallet/token-info', [WalletController::class, 'tokenInfo']);

    Route::middleware(['role:super-admin|admin-opd', 'throttle:30,1'])->group(function () {
        Route::get('wallet/all', [WalletController::class, 'all']);
        Route::post('wallet/top-up', [WalletController::class, 'topUp']);
    });
});
