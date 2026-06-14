<?php

use Illuminate\Support\Facades\Route;
use Modules\ASN\Http\Controllers\ASNController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('asns', ASNController::class)->names('asn');
});
