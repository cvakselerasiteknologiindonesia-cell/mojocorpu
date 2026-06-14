<?php

use Illuminate\Support\Facades\Route;
use Modules\Achievement\Http\Controllers\AchievementController;

Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () {
    Route::get('achievements/badges', [AchievementController::class, 'myBadges']);
    Route::get('achievements/leaderboard', [AchievementController::class, 'leaderboard']);

    Route::middleware('role:super-admin|admin-opd')->group(function () {
        Route::get('achievements/all-badges', [AchievementController::class, 'allBadges']);
        Route::get('achievements/user/{userId}', [AchievementController::class, 'userBadges']);
        Route::post('achievements/award', [AchievementController::class, 'award']);
    });

    Route::middleware('role:super-admin')->group(function () {
        Route::post('achievements/badges', [AchievementController::class, 'storeBadge']);
        Route::put('achievements/badges/{badge}', [AchievementController::class, 'updateBadge']);
    });
});
