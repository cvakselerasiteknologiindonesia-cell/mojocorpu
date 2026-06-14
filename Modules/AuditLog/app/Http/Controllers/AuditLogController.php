<?php

namespace Modules\AuditLog\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AuditLogController extends Controller
{
    public function apiIndex(Request $request)
    {
        try {
            $validated = $request->validate([
                'search' => ['nullable', 'string', 'max:100'],
                'log_name' => ['nullable', 'string', 'max:100'],
                'event' => ['nullable', 'string', 'max:100'],
                'causer_id' => ['nullable', 'integer'],
                'date_from' => ['nullable', 'date'],
                'date_to' => ['nullable', 'date'],
                'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            ]);

            $base = DB::table('activity_log as a')
                ->leftJoin('users as u', 'u.id', '=', 'a.causer_id')
                ->when($validated['search'] ?? null, function ($query, $search) {
                    $query->where(function ($query) use ($search) {
                        $query->where('a.description', 'like', "%{$search}%")
                            ->orWhere('a.log_name', 'like', "%{$search}%")
                            ->orWhere('a.event', 'like', "%{$search}%")
                            ->orWhere('u.name', 'like', "%{$search}%")
                            ->orWhere('u.email', 'like', "%{$search}%");
                    });
                })
                ->when($validated['log_name'] ?? null, fn ($query, $value) => $query->where('a.log_name', $value))
                ->when($validated['event'] ?? null, fn ($query, $value) => $query->where('a.event', $value))
                ->when($validated['causer_id'] ?? null, fn ($query, $value) => $query->where('a.causer_id', $value))
                ->when($validated['date_from'] ?? null, fn ($query, $value) => $query->whereDate('a.created_at', '>=', $value))
                ->when($validated['date_to'] ?? null, fn ($query, $value) => $query->whereDate('a.created_at', '<=', $value));

            $logs = (clone $base)
                ->select([
                    'a.id',
                    'a.log_name',
                    'a.description',
                    'a.subject_type',
                    'a.subject_id',
                    'a.event',
                    'a.causer_type',
                    'a.causer_id',
                    'a.properties',
                    'a.attribute_changes',
                    'a.batch_uuid',
                    'a.created_at',
                    'u.name as causer_name',
                    'u.email as causer_email',
                    'u.nip as causer_nip',
                ])
                ->orderByDesc('a.created_at')
                ->paginate((int) ($validated['per_page'] ?? 20));

            $logs->getCollection()->transform(fn ($log) => [
                'id' => $log->id,
                'log_name' => $log->log_name,
                'description' => $log->description,
                'event' => $log->event,
                'subject_type' => $log->subject_type,
                'subject_id' => $log->subject_id,
                'causer_id' => $log->causer_id,
                'causer_name' => $log->causer_name,
                'causer_email' => $log->causer_email,
                'causer_nip' => $log->causer_nip,
                'properties' => $this->decodeJson($log->properties),
                'attribute_changes' => $this->decodeJson($log->attribute_changes),
                'batch_uuid' => $log->batch_uuid,
                'created_at' => $log->created_at,
            ]);

            $summary = [
                'total' => DB::table('activity_log')->count(),
                'today' => DB::table('activity_log')->whereDate('created_at', now()->toDateString())->count(),
                'actors' => DB::table('activity_log')->whereNotNull('causer_id')->distinct('causer_id')->count('causer_id'),
                'filtered' => (clone $base)->count('a.id'),
            ];

            $filters = [
                'log_names' => DB::table('activity_log')->whereNotNull('log_name')->distinct()->orderBy('log_name')->pluck('log_name'),
                'events' => DB::table('activity_log')->whereNotNull('event')->distinct()->orderBy('event')->pluck('event'),
            ];

            return ApiResponse::success('Audit logs retrieved', [
                'logs' => $logs,
                'summary' => $summary,
                'filters' => $filters,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    private function decodeJson(?string $value): mixed
    {
        if (! $value) {
            return null;
        }

        $decoded = json_decode($value, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return view('auditlog::index');
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return view('auditlog::create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request) {}

    /**
     * Show the specified resource.
     */
    public function show($id)
    {
        return view('auditlog::show');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit($id)
    {
        return view('auditlog::edit');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id) {}

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id) {}
}
