<?php

use Illuminate\Support\Facades\Route;
use Modules\Quiz\Http\Controllers\QuizController;

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('quizzes/stats', [QuizController::class, 'stats'])->middleware('permission:view quiz');
    Route::get('quizzes', [QuizController::class, 'index'])->middleware('permission:view quiz');
    Route::post('quizzes', [QuizController::class, 'store'])->middleware('permission:create quiz');
    Route::put('quizzes/{uuid}', [QuizController::class, 'update'])->middleware('permission:create quiz');
    Route::delete('quizzes/{uuid}', [QuizController::class, 'destroy'])->middleware('permission:create quiz');

    Route::post('quizzes/{uuid}/questions', [QuizController::class, 'storeQuestion'])->middleware('permission:create quiz');
    Route::put('quizzes/{uuid}/questions/{questionId}', [QuizController::class, 'updateQuestion'])->middleware('permission:create quiz');
    Route::delete('quizzes/{uuid}/questions/{questionId}', [QuizController::class, 'destroyQuestion'])->middleware('permission:create quiz');

    Route::get('quizzes/{uuid}/comments', [QuizController::class, 'indexComments'])->middleware('permission:view quiz');
    Route::post('quizzes/{uuid}/comments', [QuizController::class, 'storeComment'])->middleware('permission:view quiz');
    Route::delete('quizzes/comments/{commentId}', [QuizController::class, 'destroyComment'])->middleware('permission:view quiz');
});
