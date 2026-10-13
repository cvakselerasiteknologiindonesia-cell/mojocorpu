<?php

use App\Http\Controllers\BlogCategoryController;
use App\Http\Controllers\BlogPostController;
use App\Http\Controllers\EventPaymentController;
use App\Http\Controllers\LearningPathController;
use App\Http\Controllers\PaymentWebhookController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SecureDownloadController;
use App\Http\Controllers\SecurityController;
use Illuminate\Support\Facades\Route;

// ── Midtrans Webhook — public, no auth, throttled + IP-whitelisted ────────────
Route::post('payment/webhook/midtrans', [PaymentWebhookController::class, 'midtrans'])
    ->middleware(['throttle:60,1', 'midtrans.ip']);

// ── Payment config — public client key for Snap.js ───────────────────────────
Route::get('payment/config', [EventPaymentController::class, 'config'])->middleware('throttle:30,1');

// ── Event payment — auth required ─────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::post('training-events/{uuid}/payment/initiate', [EventPaymentController::class, 'initiate']);
    Route::get('training-events/{uuid}/payment/status', [EventPaymentController::class, 'status']);
});

Route::get('/health', fn () => response()->json([
    'success' => true,
    'message' => 'Corporate University API is healthy',
    'data' => ['status' => 'ok'],
]))->middleware('throttle:10,1');

Route::get('public/blog-posts', [BlogPostController::class, 'publicIndex']);
Route::get('public/blog-posts/{slug}', [BlogPostController::class, 'publicShow']);

// ── Protected file downloads — auth required [M3 fix] ────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('kms-assets/{uuid}/download', [SecureDownloadController::class, 'kmsAsset']);
    Route::get('kms-assets/{uuid}/sources/{source}/download', [SecureDownloadController::class, 'kmsAssetSource']);
    Route::get('event-materials/{id}/download', [SecureDownloadController::class, 'eventMaterial']);
});

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
    Route::get('learning-paths/references', [LearningPathController::class, 'referenceOptions']);
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
    Route::post('learning-paths/materials/{source}/{id}/track-open', [LearningPathController::class, 'trackEventMaterialOpen']);
    Route::post('learning-paths/{uuid}/enroll', [LearningPathController::class, 'enroll']);
    Route::post('learning-paths/{uuid}/steps/{stepUuid}/complete', [LearningPathController::class, 'completeStep']);
    Route::get('blog-categories', [BlogCategoryController::class, 'index']);
    Route::post('blog-categories', [BlogCategoryController::class, 'store'])->middleware('permission:create learning articles');
    Route::put('blog-categories/{uuid}', [BlogCategoryController::class, 'update'])->middleware('permission:create learning articles');
    Route::delete('blog-categories/{uuid}', [BlogCategoryController::class, 'destroy'])->middleware('permission:create learning articles');
    Route::get('blog-posts', [BlogPostController::class, 'index']);
    // [M6] Defense-in-depth: permission at route layer + canManage() check inside controller
    Route::post('blog-posts/media', [BlogPostController::class, 'media'])->middleware('permission:create learning articles');
    Route::post('blog-posts', [BlogPostController::class, 'store'])->middleware('permission:create learning articles');
    Route::put('blog-posts/{uuid}', [BlogPostController::class, 'update'])->middleware('permission:create learning articles');
    Route::delete('blog-posts/{uuid}', [BlogPostController::class, 'destroy'])->middleware('permission:create learning articles');
});
