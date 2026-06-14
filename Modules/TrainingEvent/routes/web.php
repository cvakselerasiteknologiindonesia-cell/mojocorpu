<?php

use Illuminate\Support\Facades\Route;
use Modules\TrainingEvent\Http\Controllers\TrainingEventController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('trainingevents', TrainingEventController::class)->names('trainingevent');
});
