<?php

use Illuminate\Support\Facades\Route;
use Modules\Facilitator\Http\Controllers\FacilitatorController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('facilitators', FacilitatorController::class)->names('facilitator');
});
