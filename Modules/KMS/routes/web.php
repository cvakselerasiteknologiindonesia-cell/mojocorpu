<?php

use Illuminate\Support\Facades\Route;
use Modules\KMS\Http\Controllers\KMSController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('kms', KMSController::class)->names('kms');
});
