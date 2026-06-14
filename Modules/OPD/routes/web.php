<?php

use Illuminate\Support\Facades\Route;
use Modules\OPD\Http\Controllers\OPDController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('opds', OPDController::class)->names('opd');
});
