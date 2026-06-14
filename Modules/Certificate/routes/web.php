<?php

use Illuminate\Support\Facades\Route;
use Modules\Certificate\Http\Controllers\CertificateController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('certificates', CertificateController::class)->names('certificate');
});
