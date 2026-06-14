<?php

use Illuminate\Support\Facades\Route;
use Modules\AuditLog\Http\Controllers\AuditLogController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('audit-logs', [AuditLogController::class, 'apiIndex'])->middleware('permission:view audit log');
    Route::get('audit-logs/status', fn () => response()->json([
        'success' => true,
        'message' => 'AuditLog module ready',
        'data' => ['module' => 'AuditLog'],
    ]));
});
