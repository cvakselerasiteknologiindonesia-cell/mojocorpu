<?php

use Illuminate\Support\Facades\Route;
use Modules\TrainingProposal\Http\Controllers\TrainingProposalController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('trainingproposals', TrainingProposalController::class)->names('trainingproposal');
});
