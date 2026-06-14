<?php

use Illuminate\Support\Facades\Route;
use Modules\UserManagement\Http\Controllers\UserManagementController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('users/stats', [UserManagementController::class, 'stats'])->middleware('permission:view user');
    Route::get('users/roles', [UserManagementController::class, 'roles'])->middleware('permission:view user');
    Route::get('users', [UserManagementController::class, 'index'])->middleware('permission:view user');
    Route::post('users', [UserManagementController::class, 'store'])->middleware('permission:create user');
    Route::post('users/{userId}/assign-role', [UserManagementController::class, 'assignRole'])->middleware('permission:update user');
});
