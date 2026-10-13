<?php

namespace App\Http\Controllers;

use App\Services\LearningPathProgressService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\KMS\Models\KmsAsset;
use Modules\KMS\Models\KmsAssetSource;
use Modules\TrainingEvent\Models\EventMaterial;

class SecureDownloadController extends Controller
{
    /** GET /api/kms-assets/{uuid}/download */
    public function kmsAsset(Request $request, string $uuid)
    {
        $asset = KmsAsset::with('visibleOpds:id')->where('uuid', $uuid)->firstOrFail();

        // Only approved assets accessible to all authenticated users; unapproved only to managers
        if ($asset->status !== 'approved') {
            $user = $request->user();
            if (! $user->hasAnyPermission(['create kms asset', 'view kms asset']) && ! $user->hasRole('super-admin')) {
                abort(403);
            }
        }

        abort_unless($asset->isVisibleFor($request->user()), 403, 'Anda tidak memiliki akses ke aset pengetahuan ini.');

        $filePath = $asset->file_path;

        // External URL — redirect (still requires auth to reach this point)
        if (filter_var($filePath, FILTER_VALIDATE_URL)) {
            if ($request->expectsJson()) {
                return response()->json(['url' => $filePath]);
            }

            return redirect()->away($filePath);
        }

        // Local file — try local disk first, then public for backwards-compat
        if (Storage::disk('local')->exists($filePath)) {
            return Storage::disk('local')->download($filePath);
        }

        if (Storage::disk('public')->exists($filePath)) {
            return Storage::disk('public')->download($filePath);
        }

        abort(404);
    }

    /** GET /api/kms-assets/{uuid}/sources/{source}/download */
    public function kmsAssetSource(Request $request, string $uuid, int $source)
    {
        $asset = KmsAsset::with('visibleOpds:id')->where('uuid', $uuid)->firstOrFail();
        abort_unless($asset->isVisibleFor($request->user()), 403, 'Anda tidak memiliki akses ke aset pengetahuan ini.');

        $sourceRecord = KmsAssetSource::query()
            ->where('kms_asset_id', $asset->id)
            ->where('id', $source)
            ->firstOrFail();

        $filePath = $sourceRecord->file_path;

        if (filter_var($filePath, FILTER_VALIDATE_URL)) {
            if ($request->expectsJson()) {
                return response()->json(['url' => $filePath]);
            }

            return redirect()->away($filePath);
        }

        if (Storage::disk('local')->exists($filePath)) {
            return Storage::disk('local')->download($filePath, $sourceRecord->original_name);
        }

        if (Storage::disk('public')->exists($filePath)) {
            return Storage::disk('public')->download($filePath, $sourceRecord->original_name);
        }

        abort(404);
    }

    /** GET /api/event-materials/{id}/download */
    public function eventMaterial(Request $request, int $id, LearningPathProgressService $progressService)
    {
        $material = EventMaterial::findOrFail($id);

        // Authorization: user must be enrolled in the event, or be an admin/facilitator.
        // Using integer id in the route is sequential — pairing it with an enrollment
        // check prevents authenticated-but-unenrolled users from enumerating materials.
        $user = $request->user();
        $isPrivileged = $user->hasAnyRole(['super-admin', 'admin-opd', 'fasilitator-internal', 'fasilitator-eksternal']);

        if (! $isPrivileged) {
            $isEnrolled = DB::table('event_participants')
                ->where('training_event_id', $material->training_event_id)
                ->where('user_id', $user->id)
                ->exists();

            abort_unless($isEnrolled, 403, 'Anda tidak terdaftar sebagai peserta event ini.');
        }

        $filePath = $material->file_path;

        if (! $filePath) {
            abort(404);
        }

        $progressService->completeReferencedSteps('material', "event_material:{$material->id}", $user->id);

        // External URL
        if (filter_var($filePath, FILTER_VALIDATE_URL)) {
            return redirect()->away($filePath);
        }

        if (Storage::disk('local')->exists($filePath)) {
            return Storage::disk('local')->download($filePath);
        }

        if (Storage::disk('public')->exists($filePath)) {
            return Storage::disk('public')->download($filePath);
        }

        abort(404);
    }
}
