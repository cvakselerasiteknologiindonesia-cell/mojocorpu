<?php

namespace Modules\Certificate\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Modules\Certificate\Http\Requests\StoreCertificateTemplateRequest;
use Modules\Certificate\Http\Requests\UpdateCertificateTemplateRequest;
use Modules\Certificate\Models\Certificate;
use Modules\Certificate\Models\CertificateAsset;
use Modules\Certificate\Models\CertificateTemplate;
use Modules\Facilitator\Models\Facilitator;
use Modules\TrainingEvent\Models\EventParticipant;
use Modules\TrainingEvent\Models\TrainingEvent;

class CertificateController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Certificate::query()
                ->with('event:id,title,start_date,end_date')
                ->latest();

            if (! $request->user()->hasAnyRole(['super-admin', 'admin-opd'])) {
                $query->where('user_id', $request->user()->id);
            }

            return ApiResponse::success('Data retrieved', $query->paginate((int) $request->integer('per_page', 15)));
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function show(Request $request, string $uuid)
    {
        try {
            $query = Certificate::query()
                ->where('uuid', $uuid)
                ->with([
                    'user:id,name,nip,opd_name,organization_unit_name',
                    'event:id,uuid,title,start_date,end_date',
                    'event.sessions:id,training_event_id,title,order,duration_minutes,status',
                    'template:id,name,paper_size,orientation,background_color,layout',
                ]);

            if (! $request->user()->hasAnyRole(['super-admin', 'admin-opd'])) {
                $query->where('user_id', $request->user()->id);
            }

            $cert = $query->firstOrFail();

            return ApiResponse::success('OK', [
                'uuid'               => $cert->uuid,
                'certificate_number' => $cert->certificate_number,
                'issued_at'          => $cert->issued_at?->toDateString(),
                'issued_date'        => $cert->issued_at?->locale('id')->translatedFormat('d F Y'),
                'verification_token' => $cert->verification_token,
                'verification_url'   => $cert->verification_token ? url('/api/certificates/verify/' . $cert->verification_token) : null,
                'participant' => [
                    'name'                   => $cert->user?->name,
                    'nip'                    => $cert->user?->nip,
                    'opd_name'               => $cert->user?->opd_name,
                    'organization_unit_name' => $cert->user?->organization_unit_name,
                ],
                'event' => [
                    'title'      => $cert->event?->title,
                    'start_date' => $cert->event?->start_date?->toDateString(),
                    'end_date'   => $cert->event?->end_date?->toDateString(),
                    'sessions'   => $cert->event?->sessions
                        ?->sortBy('order')
                        ->map(fn ($s) => [
                            'order'            => $s->order,
                            'title'            => $s->title,
                            'duration_minutes' => $s->duration_minutes,
                            'status'           => $s->status,
                        ])
                        ->values()
                        ->all() ?? [],
                ],
                'template' => $cert->template ? [
                    'paper_size'       => $cert->template->paper_size,
                    'orientation'      => $cert->template->orientation,
                    'background_color' => $cert->template->background_color,
                    'layout'           => $cert->template->layout,
                ] : null,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return ApiResponse::error('Sertifikat tidak ditemukan.', 404);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function templates(Request $request)
    {
        try {
            if (! $request->user()->hasAnyRole(['super-admin', 'fasilitator-internal', 'fasilitator-eksternal'])) {
                return ApiResponse::error('Forbidden', 403);
            }

            $query = CertificateTemplate::query()
                ->with('creator:id,name,email')
                ->latest();

            if (! $request->user()->hasRole('super-admin')) {
                $query->where(function ($query) use ($request) {
                    $query->where('created_by', $request->user()->id)
                        ->orWhere('is_default', true);
                });
            }

            return ApiResponse::success('Data retrieved', $query->paginate((int) $request->integer('per_page', 30)));
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function imageAssets(Request $request)
    {
        try {
            if (! $request->user()->hasAnyRole(['super-admin', 'fasilitator-internal', 'fasilitator-eksternal'])) {
                return ApiResponse::error('Forbidden', 403);
            }

            $assets = CertificateAsset::query()
                ->with('uploader:id,name,email')
                ->latest()
                ->paginate((int) $request->integer('per_page', 60));

            return ApiResponse::success('Data retrieved', $assets);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function storeTemplate(StoreCertificateTemplateRequest $request)
    {
        try {
            $template = DB::transaction(function () use ($request) {
                $data = $request->validated();
                $data['created_by'] = $request->user()->id;
                $data['is_active'] = $data['is_active'] ?? true;
                $data['is_default'] = $data['is_default'] ?? false;

                if ($data['is_default']) {
                    CertificateTemplate::query()->update(['is_default' => false]);
                }

                return CertificateTemplate::query()->create($data)->load('creator:id,name,email');
            });

            activity('certificate-templates')->event('created')->causedBy($request->user())->performedOn($template)->log('certificate template created');

            return ApiResponse::success('Created successfully', $template, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function updateTemplate(UpdateCertificateTemplateRequest $request, CertificateTemplate $template)
    {
        try {
            if (! $this->canManageTemplate($request, $template)) {
                return ApiResponse::error('Forbidden', 403);
            }

            $template = DB::transaction(function () use ($request, $template) {
                $data = $request->validated();
                $data['is_active'] = $data['is_active'] ?? false;
                $data['is_default'] = $data['is_default'] ?? false;

                if ($data['is_default']) {
                    CertificateTemplate::query()->whereKeyNot($template->id)->update(['is_default' => false]);
                }

                $template->update($data);

                return $template->refresh()->load('creator:id,name,email');
            });

            activity('certificate-templates')->event('updated')->causedBy($request->user())->performedOn($template)->log('certificate template updated');

            return ApiResponse::success('Updated successfully', $template);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function destroyTemplate(Request $request, CertificateTemplate $template)
    {
        try {
            if (! $request->user()->hasAnyRole(['super-admin', 'fasilitator-internal', 'fasilitator-eksternal'])
                || ! $request->user()->can('create certificate')
                || ! $this->canManageTemplate($request, $template)) {
                return ApiResponse::error('Forbidden', 403);
            }

            $template->delete();

            return ApiResponse::success('Deleted successfully');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function issueEvents(Request $request)
    {
        try {
            $query = TrainingEvent::query()
                ->withCount([
                    'participants as approved_count' => fn ($q) => $q->where('completion_status', 'approved'),
                    'participants as issued_count'   => fn ($q) => $q->whereIn('user_id', Certificate::select('user_id')->whereColumn('training_event_id', 'training_events.id')),
                ])
                ->latest('start_date');

            if ($request->user()->hasAnyRole(['fasilitator-internal', 'fasilitator-eksternal'])) {
                $facilitator = Facilitator::where('user_id', $request->user()->id)->first();
                if ($facilitator) {
                    $query->where(function ($q) use ($facilitator) {
                        $q->where('facilitator_id', $facilitator->id)
                          ->orWhereHas('facilitators', fn ($fq) => $fq->where('facilitators.id', $facilitator->id));
                    });
                }
            }

            $events = $query->get()->map(fn ($e) => [
                'id'                     => $e->id,
                'uuid'                   => $e->uuid,
                'title'                  => $e->title,
                'start_date'             => $e->start_date?->toDateString(),
                'status'                 => $e->status,
                'approved_count'         => (int) $e->approved_count,
                'issued_count'           => (int) $e->issued_count,
                'pending_count'          => max(0, (int) $e->approved_count - (int) $e->issued_count),
                'certificate_template_id'=> $e->certificate_template_id,
            ]);

            return ApiResponse::success('OK', $events);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    public function issueParticipants(Request $request, string $uuid)
    {
        try {
            $event = TrainingEvent::where('uuid', $uuid)->firstOrFail();
            if (! $this->canManageEvent($request, $event)) {
                return ApiResponse::error('Forbidden', 403);
            }

            $issuedUserIds = Certificate::where('training_event_id', $event->id)->pluck('user_id');

            $participants = EventParticipant::where('training_event_id', $event->id)
                ->where('completion_status', 'approved')
                ->whereNotIn('user_id', $issuedUserIds)
                ->with('user:id,name,nip,email,opd_name,organization_unit_name')
                ->get()
                ->map(fn ($p) => [
                    'user_id'                => $p->user_id,
                    'name'                   => $p->user->name,
                    'nip'                    => $p->user->nip,
                    'email'                  => $p->user->email,
                    'opd_name'               => $p->user->opd_name,
                    'organization_unit_name' => $p->user->organization_unit_name,
                    'completed_at'           => $p->completed_at?->toDateString(),
                ]);

            return ApiResponse::success('OK', $participants);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    public function issuePreview(Request $request)
    {
        $request->validate([
            'event_uuid'       => ['required', 'string', 'exists:training_events,uuid'],
            'template_id'      => ['required', 'integer', 'exists:certificate_templates,id'],
            'participant_ids'  => ['required', 'array', 'min:1'],
            'participant_ids.*'=> ['integer'],
        ]);

        try {
            $event = TrainingEvent::where('uuid', $request->event_uuid)->firstOrFail();
            if (! $this->canManageEvent($request, $event)) {
                return ApiResponse::error('Forbidden', 403);
            }

            $template = CertificateTemplate::query()->findOrFail($request->integer('template_id'));
            if (! $this->canUseTemplate($request, $template)) {
                return ApiResponse::error('Forbidden', 403);
            }

            $issuedUserIds = Certificate::where('training_event_id', $event->id)->pluck('user_id');
            $participants = EventParticipant::where('training_event_id', $event->id)
                ->where('completion_status', 'approved')
                ->whereNotIn('user_id', $issuedUserIds)
                ->whereIn('user_id', $request->participant_ids)
                ->with('user:id,name,nip,email,opd_name,organization_unit_name')
                ->get();

            $next = Certificate::count() + 1;
            $year = now()->format('Y');

            return ApiResponse::success('OK', [
                'event' => [
                    'uuid'       => $event->uuid,
                    'title'      => $event->title,
                    'start_date' => $event->start_date?->toDateString(),
                    'end_date'   => $event->end_date?->toDateString(),
                ],
                'template' => [
                    'id'   => $template->id,
                    'name' => $template->name,
                ],
                'participants' => $participants->values()->map(function ($participant, int $index) use ($next, $year) {
                    $number = 'CERT-CORPU-' . $year . '-' . str_pad((string) ($next + $index), 4, '0', STR_PAD_LEFT);
                    $token  = 'preview-' . sha1($number . '|' . $participant->user_id);

                    return [
                        'user_id'                => $participant->user_id,
                        'name'                   => $participant->user->name,
                        'nip'                    => $participant->user->nip,
                        'email'                  => $participant->user->email,
                        'opd_name'               => $participant->user->opd_name,
                        'organization_unit_name' => $participant->user->organization_unit_name,
                        'completed_at'           => $participant->completed_at?->toDateString(),
                        'certificate_number'     => $number,
                        'issued_date'            => now()->locale('id')->translatedFormat('d F Y'),
                        'verification_url'       => url('/api/certificates/verify/' . $token),
                    ];
                }),
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    public function issue(Request $request)
    {
        $request->validate([
            'event_uuid'       => ['required', 'string', 'exists:training_events,uuid'],
            'template_id'      => ['required', 'integer', 'exists:certificate_templates,id'],
            'participant_ids'  => ['required', 'array', 'min:1'],
            'participant_ids.*'=> ['integer'],
        ]);

        try {
            $event = TrainingEvent::where('uuid', $request->event_uuid)->firstOrFail();
            if (! $this->canManageEvent($request, $event)) {
                return ApiResponse::error('Forbidden', 403);
            }

            $template = CertificateTemplate::query()->findOrFail($request->integer('template_id'));
            if (! $this->canUseTemplate($request, $template)) {
                return ApiResponse::error('Forbidden', 403);
            }

            $year   = now()->format('Y');
            $issued = 0;

            DB::transaction(function () use ($request, $event, $template, $year, &$issued) {
                foreach ($request->participant_ids as $userId) {
                    $already = Certificate::where('user_id', $userId)
                        ->where('training_event_id', $event->id)
                        ->exists();
                    if ($already) continue;

                    // Insert first to obtain the auto-increment id, then build the
                    // cert number from it — avoids duplicate-number races under concurrency.
                    $cert = Certificate::create([
                        'user_id'                 => $userId,
                        'training_event_id'        => $event->id,
                        'certificate_template_id'  => $template->id,
                        'certificate_number'       => (string) Str::uuid(),
                        'issued_at'               => now(),
                    ]);
                    $cert->update([
                        'certificate_number' => sprintf('CERT-CORPU-%s-%04d', $year, $cert->id),
                    ]);
                    $issued++;
                }
            });

            activity('certificates')->event('issued')->causedBy($request->user())
                ->log("{$issued} certificate(s) issued for event #{$event->id}");

            return ApiResponse::success("{$issued} sertifikat berhasil diterbitkan.");
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    public function verify(string $token)
    {
        try {
            $certificate = Certificate::query()
                ->where('verification_token', $token)
                ->with(['user:id,name,nip,email,opd_name', 'event:id,uuid,title,start_date,end_date', 'template:id,name'])
                ->first();

            if (! $certificate) {
                return ApiResponse::error('Sertifikat tidak ditemukan.', 404);
            }

            return ApiResponse::success('Sertifikat valid.', [
                'certificate_number' => $certificate->certificate_number,
                'issued_at' => $certificate->issued_at?->toDateString(),
                'participant' => [
                    'name' => $certificate->user?->name,
                    'nip' => $certificate->user?->nip,
                    'email' => $certificate->user?->email,
                    'opd_name' => $certificate->user?->opd_name,
                ],
                'event' => [
                    'title' => $certificate->event?->title,
                    'start_date' => $certificate->event?->start_date?->toDateString(),
                    'end_date' => $certificate->event?->end_date?->toDateString(),
                ],
                'template' => [
                    'name' => $certificate->template?->name,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:8192'],
        ]);

        try {
            $file = $request->file('image');
            $path = $file->store('certificates', 'public');

            $asset = CertificateAsset::query()->create([
                'uploaded_by' => $request->user()->id,
                'name' => $file->getClientOriginalName(),
                'path' => $path,
                'mime_type' => $file->getClientMimeType(),
                'size' => $file->getSize() ?: 0,
            ])->load('uploader:id,name,email');

            return ApiResponse::success('Gambar berhasil diunggah.', $asset);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error('Gagal mengunggah gambar.');
        }
    }

    private function canManageTemplate(Request $request, CertificateTemplate $template): bool
    {
        if ($request->user()->hasRole('super-admin')) {
            return true;
        }

        return (int) $template->created_by === (int) $request->user()->id;
    }

    private function canUseTemplate(Request $request, CertificateTemplate $template): bool
    {
        return $request->user()->hasRole('super-admin')
            || (bool) $template->is_default
            || (int) $template->created_by === (int) $request->user()->id;
    }

    private function canManageEvent(Request $request, TrainingEvent $event): bool
    {
        if (! $request->user()->hasAnyRole(['fasilitator-internal', 'fasilitator-eksternal'])) {
            return true;
        }

        $facilitator = Facilitator::where('user_id', $request->user()->id)->first();
        if (! $facilitator) {
            return false;
        }

        return (int) $event->facilitator_id === (int) $facilitator->id
            || $event->facilitators()->where('facilitators.id', $facilitator->id)->exists();
    }
}
