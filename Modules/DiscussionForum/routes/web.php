<?php

use Illuminate\Support\Facades\Route;
use Modules\DiscussionForum\Http\Controllers\DiscussionForumController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('discussionforums', DiscussionForumController::class)->names('discussionforum');
});
