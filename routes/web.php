<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SsoWebController;

Route::get('/auth/sso/redirect', [SsoWebController::class, 'redirect'])->name('sso.redirect');
Route::get('/auth/sso/callback', [SsoWebController::class, 'callback'])->name('sso.callback');
Route::view('/{path?}', 'app')->where('path', '^(?!api(/|$)).*');
