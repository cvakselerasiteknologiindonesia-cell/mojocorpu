<?php

use Illuminate\Support\Facades\Route;
use Modules\Report\Http\Controllers\ReportController;

Route::middleware(['auth:sanctum', 'permission:view report'])->group(function () {
    Route::get('reports/summary', [ReportController::class, 'summary']);
    Route::get('reports/proposals', [ReportController::class, 'proposals']);
    Route::get('reports/events', [ReportController::class, 'events']);
    Route::get('reports/learning-paths', [ReportController::class, 'learningPaths']);
    Route::get('reports/learning-paths/{uuid}/enrollments', [ReportController::class, 'learningPathEnrollments']);
    Route::get('reports/learning-paths/{uuid}/enrollments/{enrollment}/steps', [ReportController::class, 'learningPathEnrollmentSteps']);
    Route::get('reports/export', [ReportController::class, 'export']);
});
