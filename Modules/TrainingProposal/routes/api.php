<?php

use Illuminate\Support\Facades\Route;
use Modules\TrainingProposal\Http\Controllers\TrainingProposalController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('training-proposals/stats', [TrainingProposalController::class, 'stats'])->middleware('permission:view training proposal');
    Route::get('training-proposals/audience-options', [TrainingProposalController::class, 'audienceOptions'])->middleware('permission:create training proposal');
    Route::get('training-proposals', [TrainingProposalController::class, 'index'])->middleware('permission:view training proposal');
    Route::post('training-proposals', [TrainingProposalController::class, 'store'])->middleware('permission:create training proposal');
    Route::patch('training-proposals/{uuid}', [TrainingProposalController::class, 'update'])->middleware('permission:create training proposal');
    Route::post('training-proposals/{uuid}/approve', [TrainingProposalController::class, 'approve'])->middleware('permission:approve training proposal');
    Route::delete('training-proposals/{uuid}', [TrainingProposalController::class, 'destroy'])->middleware('permission:create training proposal');
});
