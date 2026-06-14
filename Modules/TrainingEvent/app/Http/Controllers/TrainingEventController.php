<?php

namespace Modules\TrainingEvent\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Modules\Facilitator\Models\Facilitator;
use Modules\TrainingEvent\Http\Requests\StoreTrainingEventRequest;
use Modules\TrainingEvent\Http\Requests\UpdateTrainingEventRequest;
use Modules\TrainingEvent\Models\EventParticipant;
use Modules\TrainingEvent\Models\TrainingEvent;
use Modules\TrainingEvent\Services\TrainingEventService;

class TrainingEventController extends Controller
{
    public function leaderboard()
    {
        try {
            $rows = DB::table('assessment_submissions as s')
                ->join('users as u', 'u.id', '=', 's.user_id')
                ->leftJoin('opds as o', 'o.id', '=', 'u.opd_id')
                ->whereNotNull('s.score')
                ->groupBy('u.id', 'u.name', 'u.nip', 'o.name')
                ->select([
                    'u.id as user_id',
                    'u.name',
                    'u.nip',
                    DB::raw('COALESCE(o.name, u.opd_name, \'\') as opd_name'),
                    DB::raw('ROUND(AVG(s.score), 1) as avg_score'),
                    DB::raw('MAX(s.score) as best_score'),
                    DB::raw('COUNT(s.id) as submission_count'),
                    DB::raw('SUM(CASE WHEN s.is_passed = 1 THEN 1 ELSE 0 END) as passed_count'),
                ])
                ->orderByDesc('avg_score')
                ->orderByDesc('best_score')
                ->limit(15)
                ->get()
                ->map(function ($row, $index) {
                    $row->rank = $index + 1;
                    return $row;
                });

            return ApiResponse::success('Data retrieved', $rows);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    public function myAssignedCount(Request $request)
    {
        try {
            $count = EventParticipant::query()
                ->where('user_id', $request->user()->id)
                ->whereHas('event', fn ($q) => $q->where('status', 'active'))
                ->count();

            return ApiResponse::success('Data retrieved', ['count' => $count]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function index(Request $request, TrainingEventService $service)
    {
        try {
            $user = $request->user();

            if ($user->hasRole('asn')) {
                $events = TrainingEvent::query()
                    ->with('facilitators.user')
                    ->where('status', 'active')
                    ->where('end_date', '>=', now()->toDateString())
                    ->withExists(['participants as is_enrolled' => fn ($q) => $q->where('user_id', $user->id)])
                    ->orderBy('start_date')
                    ->paginate((int) $request->integer('per_page', 15));

                return ApiResponse::success('Data retrieved', $events);
            }

            $facilitatorId = null;
            if ($user->hasAnyRole(['fasilitator-internal', 'fasilitator-eksternal'])) {
                $facilitatorId = Facilitator::query()
                    ->where('user_id', $user->id)
                    ->value('id');
            }

            return ApiResponse::success('Data retrieved', $service->paginate(
                (int) $request->integer('per_page', 15),
                $facilitatorId,
            ));
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function store(StoreTrainingEventRequest $request, TrainingEventService $service)
    {
        try {
            $data         = $request->validated();
            $facilitatorIds = array_values(array_filter($data['facilitator_ids'] ?? []));
            unset($data['facilitator_ids']);

            if ($request->user()->hasAnyRole(['fasilitator-internal', 'fasilitator-eksternal'])) {
                $selfId         = Facilitator::query()->where('user_id', $request->user()->id)->value('id');
                $facilitatorIds = $selfId ? [$selfId] : [];
            }

            $data['facilitator_id'] = $facilitatorIds[0] ?? null;

            $record = $service->create($data);

            if (! empty($facilitatorIds)) {
                $record->facilitators()->sync($facilitatorIds);
            }

            activity('training-events')->event('created')->causedBy($request->user())->performedOn($record)->log('training-events created');

            return ApiResponse::success('Created successfully', $record->load('facilitators.user'), 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function update(UpdateTrainingEventRequest $request, string $uuid, TrainingEventService $service)
    {
        try {
            $event = $service->findByUuid($uuid);

            if ($event->status === 'rejected' && ! $request->user()->can('approve training event')) {
                return ApiResponse::error('Event ini telah ditolak dan tidak dapat diubah.', 403);
            }

            $data           = $request->validated();
            $facilitatorIds = isset($data['facilitator_ids']) ? array_values(array_filter($data['facilitator_ids'])) : null;
            unset($data['facilitator_ids']);

            if ($request->user()->hasAnyRole(['fasilitator-internal', 'fasilitator-eksternal'])) {
                $data['facilitator_id'] = $event->facilitator_id;
                $facilitatorIds         = null;
            } elseif ($facilitatorIds !== null) {
                $data['facilitator_id'] = $facilitatorIds[0] ?? null;
            }

            $updated = $service->update($event, $data);

            if ($facilitatorIds !== null) {
                $event->facilitators()->sync($facilitatorIds);
            }

            activity('training-events')->event('updated')->causedBy($request->user())->performedOn($updated)->log('training-events updated');

            return ApiResponse::success('Updated successfully', $updated->load('facilitators.user'));
        } catch (ModelNotFoundException) {
            return ApiResponse::error('Event not found', 404);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function show(string $uuid, TrainingEventService $service)
    {
        try {
            $event = $service->findByUuid($uuid);

            return ApiResponse::success('Data retrieved', $event->load('facilitators.user'));
        } catch (ModelNotFoundException) {
            return ApiResponse::error('Event not found', 404);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function uploadBanner(Request $request, string $uuid, TrainingEventService $service)
    {
        $request->validate(['banner' => 'required|image|max:5120']);

        try {
            $event = $service->findByUuid($uuid);

            if ($event->banner_image) {
                Storage::disk('public')->delete($event->banner_image);
            }

            $path = $request->file('banner')->store('event-banners', 'public');
            $event->update(['banner_image' => $path]);

            return ApiResponse::success('Banner uploaded', ['banner_url' => Storage::disk('public')->url($path)]);
        } catch (ModelNotFoundException) {
            return ApiResponse::error('Event not found', 404);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function approve(Request $request, string $uuid, TrainingEventService $service)
    {
        $request->validate(['status' => 'required|in:active,rejected']);

        try {
            $event = $service->findByUuid($uuid);
            $updated = $service->update($event, ['status' => $request->input('status')]);
            activity('training-events')->event('approved')->causedBy($request->user())->performedOn($updated)->log('training-events status changed to '.$request->input('status'));

            return ApiResponse::success('Status updated', $updated);
        } catch (ModelNotFoundException) {
            return ApiResponse::error('Event not found', 404);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function assignCertificateTemplate(Request $request, string $uuid, TrainingEventService $service)
    {
        $request->validate([
            'certificate_template_id' => ['nullable', 'integer', 'exists:certificate_templates,id'],
        ]);

        try {
            $event   = $service->findByUuid($uuid);
            $updated = $service->update($event, ['certificate_template_id' => $request->input('certificate_template_id')]);
            activity('training-events')->event('updated')->causedBy($request->user())->performedOn($updated)
                ->log('certificate template assigned');

            return ApiResponse::success('Template sertifikat berhasil ditetapkan.', [
                'uuid'                    => $updated->uuid,
                'certificate_template_id' => $updated->certificate_template_id,
                'certificate_template'    => $updated->certificateTemplate ? ['id' => $updated->certificateTemplate->id, 'name' => $updated->certificateTemplate->name] : null,
            ]);
        } catch (ModelNotFoundException) {
            return ApiResponse::error('Event not found', 404);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function destroy(Request $request, string $uuid, TrainingEventService $service)
    {
        try {
            $event = $service->findByUuid($uuid);
            activity('training-events')->event('deleted')->causedBy($request->user())->performedOn($event)->log('training-events deleted');
            $service->delete($event);

            return ApiResponse::success('Deleted successfully');
        } catch (ModelNotFoundException) {
            return ApiResponse::error('Event not found', 404);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }
}
