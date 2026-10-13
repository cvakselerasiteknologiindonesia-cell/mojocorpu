<?php

use Illuminate\Support\Facades\Route;
use Modules\LMS\Http\Controllers\LearningMaterialController;
use Modules\LMS\Http\Controllers\MaterialCommentController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('lms/stats', [LearningMaterialController::class, 'stats'])->middleware('permission:view lms');
    Route::get('lms', [LearningMaterialController::class, 'index'])->middleware('permission:view lms');
    Route::post('lms/{uuid}/track-open', [LearningMaterialController::class, 'trackOpen'])->middleware('permission:view lms');
    Route::post('lms', [LearningMaterialController::class, 'store'])->middleware('permission:create lms material');
    Route::post('lms/{uuid}', [LearningMaterialController::class, 'update'])->middleware('permission:create lms material');
    Route::post('lms/{uuid}/toggle-publish', [LearningMaterialController::class, 'togglePublish'])->middleware('permission:create lms material');
    Route::delete('lms/{uuid}', [LearningMaterialController::class, 'destroy'])->middleware('permission:create lms material');

    Route::get('lms/materials/{materialId}/comments', [MaterialCommentController::class, 'index'])->middleware('permission:view lms');
    Route::post('lms/materials/{materialId}/comments', [MaterialCommentController::class, 'store'])->middleware('permission:view lms');
    Route::delete('lms/comments/{commentId}', [MaterialCommentController::class, 'destroy'])->middleware('permission:create lms material');
});
