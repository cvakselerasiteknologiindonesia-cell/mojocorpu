<?php

use Illuminate\Support\Facades\Route;
use Modules\DiscussionForum\Http\Controllers\DiscussionForumController;

Route::middleware(['auth:sanctum', 'permission:view discussion forum'])
    ->prefix('discussion-forum')
    ->group(function () {
        Route::get('threads', [DiscussionForumController::class, 'indexThreads']);
        Route::post('threads', [DiscussionForumController::class, 'storeThread']);
        Route::get('threads/{uuid}', [DiscussionForumController::class, 'showThread']);
        Route::put('threads/{uuid}', [DiscussionForumController::class, 'updateThread']);
        Route::delete('threads/{uuid}', [DiscussionForumController::class, 'destroyThread']);

        Route::post('threads/{uuid}/comments', [DiscussionForumController::class, 'storeComment']);
        Route::put('threads/{uuid}/comments/{commentId}', [DiscussionForumController::class, 'updateComment']);
        Route::delete('threads/{uuid}/comments/{commentId}', [DiscussionForumController::class, 'destroyComment']);

        Route::post('media', [DiscussionForumController::class, 'uploadMedia']);
        // [M5] Serve media via authenticated route (local disk)
        Route::get('media/{filename}', [DiscussionForumController::class, 'serveMedia']);
    });
