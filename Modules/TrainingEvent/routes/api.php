<?php

use Illuminate\Support\Facades\Route;
use Modules\TrainingEvent\Http\Controllers\AsnLearningController;
use Modules\TrainingEvent\Http\Controllers\EventContentController;
use Modules\TrainingEvent\Http\Controllers\TrainingEventController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('leaderboard', [TrainingEventController::class, 'leaderboard'])->middleware('permission:view training event');
    Route::get('training-events/my-assigned-count', [TrainingEventController::class, 'myAssignedCount'])->middleware('permission:view training event');
    Route::post('training-events/{uuid}/enroll', [EventContentController::class, 'selfEnroll'])->middleware('permission:view training event');

    // ASN learning routes (enrolled participants only)
    Route::prefix('training-events/{uuid}/learn')->middleware('permission:view training event')->group(function () {
        Route::get('/', [AsnLearningController::class, 'show']);
        Route::post('check-in', [AsnLearningController::class, 'checkIn']);
        Route::post('sessions/{sessionId}/check-in', [AsnLearningController::class, 'checkInSession']);
        Route::get('assessments/{assessmentId}', [AsnLearningController::class, 'takeAssessment']);
        Route::post('assessments/{assessmentId}/submit', [AsnLearningController::class, 'submitAssessment']);
    });
    Route::get('training-events', [TrainingEventController::class, 'index'])->middleware('permission:view training event');
    Route::post('training-events', [TrainingEventController::class, 'store'])->middleware('permission:create training event');
    Route::get('training-events/{uuid}', [TrainingEventController::class, 'show'])->middleware('permission:view training event');
    Route::put('training-events/{uuid}', [TrainingEventController::class, 'update'])->middleware('permission:update training event');
    Route::patch('training-events/{uuid}/approve', [TrainingEventController::class, 'approve'])->middleware('permission:approve training event');
    Route::patch('training-events/{uuid}/certificate-template', [TrainingEventController::class, 'assignCertificateTemplate'])->middleware('permission:update training event');
    Route::post('training-events/{uuid}/banner', [TrainingEventController::class, 'uploadBanner'])->middleware('permission:update training event');
    Route::delete('training-events/{uuid}', [TrainingEventController::class, 'destroy'])->middleware('permission:delete training event');

    // Completion Approval
    Route::prefix('training-events/{uuid}')->middleware('permission:approve training completion')->group(function () {
        Route::get('completion', [EventContentController::class, 'indexCompletion']);
        Route::patch('completion/{userId}/approve', [EventContentController::class, 'approveCompletion']);
        Route::patch('completion/{userId}/reject', [EventContentController::class, 'rejectCompletion']);
        Route::post('completion/bulk-approve', [EventContentController::class, 'bulkApproveCompletion']);
    });

    Route::prefix('training-events/{uuid}')->middleware('permission:update training event')->group(function () {
        // Learning Path (sessions)
        Route::get('sessions', [EventContentController::class, 'indexSessions']);
        Route::post('sessions', [EventContentController::class, 'storeSession']);
        Route::put('sessions/{sessionId}', [EventContentController::class, 'updateSession']);
        Route::delete('sessions/{sessionId}', [EventContentController::class, 'destroySession']);

        // Learning Materials
        Route::get('materials', [EventContentController::class, 'indexMaterials']);
        Route::post('materials', [EventContentController::class, 'storeMaterial']);
        Route::put('materials/{materialId}', [EventContentController::class, 'updateMaterial']);
        Route::delete('materials/{materialId}', [EventContentController::class, 'destroyMaterial']);

        // Assessments
        Route::get('assessments', [EventContentController::class, 'indexAssessments']);
        Route::post('assessments', [EventContentController::class, 'storeAssessment']);
        Route::put('assessments/{assessmentId}', [EventContentController::class, 'updateAssessment']);
        Route::delete('assessments/{assessmentId}', [EventContentController::class, 'destroyAssessment']);

        // Assessment Questions
        Route::get('assessments/{assessmentId}/questions', [EventContentController::class, 'indexQuestions']);
        Route::post('assessments/{assessmentId}/questions', [EventContentController::class, 'storeQuestion']);
        Route::put('assessments/{assessmentId}/questions/{questionId}', [EventContentController::class, 'updateQuestion']);
        Route::delete('assessments/{assessmentId}/questions/{questionId}', [EventContentController::class, 'destroyQuestion']);

        Route::post('assessments/{assessmentId}/questions/import', [EventContentController::class, 'importQuestions']);

        // Assessment Submissions
        Route::get('assessments/{assessmentId}/submissions', [EventContentController::class, 'indexSubmissions']);
        Route::put('assessments/{assessmentId}/submissions/{submissionId}/grade', [EventContentController::class, 'gradeSubmission']);

        // Participants
        Route::get('participants', [EventContentController::class, 'indexParticipants']);
        Route::post('participants', [EventContentController::class, 'storeParticipant']);
        Route::get('participants/search', [EventContentController::class, 'searchParticipantCandidates']);
        Route::get('participants/opds', [EventContentController::class, 'listOpdsForEnrollment']);
        Route::post('participants/bulk-opd', [EventContentController::class, 'bulkEnrollByOpd']);
        Route::post('participants/bulk-all', [EventContentController::class, 'bulkEnrollAll']);
        Route::post('participants/import', [EventContentController::class, 'importParticipants']);
        Route::post('participants/bulk-remove', [EventContentController::class, 'bulkRemoveParticipants']);
        Route::delete('participants/{userId}', [EventContentController::class, 'destroyParticipant']);

        // Attendance
        Route::get('attendance', [EventContentController::class, 'indexAttendance']);
        Route::post('attendance/bulk-mark', [EventContentController::class, 'bulkMarkAttendance']);
        Route::post('attendance/bulk-unmark', [EventContentController::class, 'bulkUnmarkAttendance']);
        Route::post('attendance/{userId}/mark', [EventContentController::class, 'markAttendance']);
        Route::delete('attendance/{userId}', [EventContentController::class, 'unmarkAttendance']);
        Route::post('sessions/{sessionId}/attendance/bulk-mark', [EventContentController::class, 'bulkMarkSessionAttendance']);
        Route::post('sessions/{sessionId}/attendance/bulk-unmark', [EventContentController::class, 'bulkUnmarkSessionAttendance']);
        Route::post('sessions/{sessionId}/attendance/{userId}/mark', [EventContentController::class, 'markSessionAttendance']);
        Route::delete('sessions/{sessionId}/attendance/{userId}', [EventContentController::class, 'unmarkSessionAttendance']);
    });
});
