<?php

use App\Http\Controllers\BlogPostController;
use App\Http\Controllers\BlogCategoryController;
use App\Http\Controllers\LearningPathController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SecurityController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'success' => true,
    'message' => 'Corporate University API is healthy',
    'data' => ['service' => 'corporateuniversity-app'],
]));

Route::get('public/blog-posts', [BlogPostController::class, 'publicIndex']);
Route::get('public/blog-posts/{slug}', [BlogPostController::class, 'publicShow']);

Route::middleware(['auth:sanctum', 'role:super-admin'])->prefix('security')->group(function () {
    Route::get('dashboard', [SecurityController::class, 'dashboard']);
    Route::get('events', [SecurityController::class, 'events']);
    Route::post('events/{id}/resolve', [SecurityController::class, 'resolveEvent']);
    Route::get('attempts', [SecurityController::class, 'attempts']);
    Route::get('blocked-ips', [SecurityController::class, 'blockedIps']);
    Route::post('blocked-ips', [SecurityController::class, 'blockIp']);
    Route::delete('blocked-ips/{id}', [SecurityController::class, 'unblockIp']);
    Route::get('suspicious-requests', [SecurityController::class, 'suspiciousRequests']);
});

Route::middleware(['auth:sanctum', 'role:super-admin'])->prefix('admin')->group(function () {
    Route::get('learning-paths', [LearningPathController::class, 'adminIndex']);
    Route::post('learning-paths', [LearningPathController::class, 'store']);
    Route::get('learning-paths/{uuid}', [LearningPathController::class, 'adminShow']);
    Route::put('learning-paths/{uuid}', [LearningPathController::class, 'update']);
    Route::delete('learning-paths/{uuid}', [LearningPathController::class, 'destroy']);
    Route::put('learning-paths/{uuid}/steps', [LearningPathController::class, 'updateSteps']);
    Route::post('learning-paths/{uuid}/duplicate', [LearningPathController::class, 'duplicate']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('search', SearchController::class);
    Route::get('learning-paths', [LearningPathController::class, 'publicIndex']);
    Route::get('learning-paths/{uuid}', [LearningPathController::class, 'publicShow']);
    Route::post('learning-paths/{uuid}/enroll', [LearningPathController::class, 'enroll']);
    Route::post('learning-paths/{uuid}/steps/{stepUuid}/complete', [LearningPathController::class, 'completeStep']);
    Route::get('blog-categories', [BlogCategoryController::class, 'index']);
    Route::post('blog-categories', [BlogCategoryController::class, 'store']);
    Route::put('blog-categories/{uuid}', [BlogCategoryController::class, 'update']);
    Route::delete('blog-categories/{uuid}', [BlogCategoryController::class, 'destroy']);
    Route::get('blog-posts', [BlogPostController::class, 'index']);
    Route::post('blog-posts/media', [BlogPostController::class, 'media']);
    Route::post('blog-posts', [BlogPostController::class, 'store']);
    Route::put('blog-posts/{uuid}', [BlogPostController::class, 'update']);
    Route::delete('blog-posts/{uuid}', [BlogPostController::class, 'destroy']);
});
