<?php

use Illuminate\Support\Facades\Route;
use Modules\Quiz\Http\Controllers\QuizController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('quizzes', QuizController::class)->names('quiz');
});
