<?php

use Illuminate\Support\Facades\Route;
use Modules\Certificate\Http\Controllers\CertificateController;

Route::get('certificates/verify/{token}', [CertificateController::class, 'verify']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('certificates', [CertificateController::class, 'index'])->middleware('permission:view certificate');
    Route::get('certificate-templates', [CertificateController::class, 'templates'])->middleware('permission:view certificate');
    Route::get('certificate-templates/officials', [CertificateController::class, 'officials'])->middleware('permission:create certificate');
    Route::get('certificate-templates/images', [CertificateController::class, 'imageAssets'])->middleware('permission:view certificate');
    Route::post('certificate-templates/upload-image', [CertificateController::class, 'uploadImage'])->middleware('permission:create certificate');
    Route::post('certificate-templates', [CertificateController::class, 'storeTemplate'])->middleware('permission:create certificate');
    Route::put('certificate-templates/{template}', [CertificateController::class, 'updateTemplate'])->middleware('permission:create certificate');
    Route::delete('certificate-templates/{template}', [CertificateController::class, 'destroyTemplate'])->middleware('permission:create certificate');

    // Issue certificates
    Route::get('certificates/issue/events', [CertificateController::class, 'issueEvents'])->middleware('permission:create certificate');
    Route::get('certificates/issue/events/{uuid}/participants', [CertificateController::class, 'issueParticipants'])->middleware('permission:create certificate');
    Route::post('certificates/issue/preview', [CertificateController::class, 'issuePreview'])->middleware('permission:create certificate');
    Route::post('certificates/issue', [CertificateController::class, 'issue'])->middleware('permission:create certificate');

    Route::get('certificates/{uuid}', [CertificateController::class, 'show'])->middleware('permission:view certificate');
});
