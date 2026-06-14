<?php

use Illuminate\Support\Facades\Route;
use Modules\LMS\Http\Controllers\LMSController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('lms', LMSController::class)->names('lms');
});
