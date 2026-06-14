<?php

use Illuminate\Support\Facades\Route;
use Modules\Facilitator\Http\Controllers\FacilitatorController;
use Modules\Facilitator\Http\Controllers\FacilitatorWorkspaceController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('facilitators/stats', [FacilitatorController::class, 'stats'])->middleware('permission:view facilitator');
    Route::get('facilitators', [FacilitatorController::class, 'index'])->middleware('permission:view facilitator');
    Route::post('facilitators', [FacilitatorController::class, 'store'])->middleware('permission:create facilitator');
    Route::patch('facilitators/{uuid}', [FacilitatorController::class, 'update'])->middleware('permission:create facilitator');
    Route::delete('facilitators/{uuid}', [FacilitatorController::class, 'destroy'])->middleware('permission:create facilitator');
});

Route::middleware(['auth:sanctum', 'role:fasilitator-internal|fasilitator-eksternal'])->prefix('facilitator')->group(function () {
    Route::get('dashboard', [FacilitatorWorkspaceController::class, 'dashboard'])->middleware('permission:view facilitator dashboard');
    Route::get('classes', [FacilitatorWorkspaceController::class, 'classes'])->middleware('permission:see assigned classes');
    Route::post('classes/{uuid}/materials', [FacilitatorWorkspaceController::class, 'uploadMaterial'])->middleware('permission:upload learning materials');
    Route::post('classes/{uuid}/evaluations', [FacilitatorWorkspaceController::class, 'evaluateParticipant'])->middleware('permission:evaluate participants');
    Route::get('classes/{uuid}/reports', [FacilitatorWorkspaceController::class, 'exportReport'])->middleware('permission:export reports');
});
