<?php

use Illuminate\Support\Facades\Route;
use Modules\Notification\Http\Controllers\AppNotificationController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('notifications/unread-count', [AppNotificationController::class, 'unreadCount']);
    Route::get('notifications', [AppNotificationController::class, 'index']);
    Route::patch('notifications/read-all', [AppNotificationController::class, 'markAllRead']);
    Route::patch('notifications/{id}/read', [AppNotificationController::class, 'markRead']);
});