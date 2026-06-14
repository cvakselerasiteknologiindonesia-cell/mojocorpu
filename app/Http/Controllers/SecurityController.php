<?php

namespace App\Http\Controllers;

use App\Models\BlockedIp;
use App\Models\LoginAttempt;
use App\Models\SecurityEvent;
use App\Models\SuspiciousRequest;
use App\Services\IntrusionDetectionService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SecurityController extends Controller
{
    public function dashboard()
    {
        try {
            $failedToday    = LoginAttempt::where('success', false)->whereDate('created_at', today())->count();
            $failed24h      = LoginAttempt::where('success', false)->where('created_at', '>=', now()->subHours(24))->count();
            $blockedIps     = BlockedIp::active()->count();
            $activeThreats  = SecurityEvent::where('resolved', false)->count();
            $criticalEvents = SecurityEvent::where('resolved', false)->where('severity', 'critical')->count();
            $attacksToday   = SuspiciousRequest::whereDate('created_at', today())->whereNotIn('attack_type', ['enumeration_404'])->count();

            $suspiciousIps = LoginAttempt::where('success', false)
                ->where('created_at', '>=', now()->subHours(24))
                ->selectRaw('ip_address, COUNT(*) as attempts')
                ->groupBy('ip_address')
                ->orderByDesc('attempts')
                ->limit(5)
                ->get();

            $recentEvents = SecurityEvent::with(['user:id,name,email', 'resolver:id,name'])
                ->orderByDesc('created_at')
                ->limit(10)
                ->get();

            $recentAttempts = LoginAttempt::with('user:id,name,email')
                ->where('success', false)
                ->orderByDesc('created_at')
                ->limit(10)
                ->get();

            return ApiResponse::success('OK', [
                'kpis' => [
                    'failed_today'    => $failedToday,
                    'failed_24h'      => $failed24h,
                    'blocked_ips'     => $blockedIps,
                    'active_threats'  => $activeThreats,
                    'critical_events' => $criticalEvents,
                    'attacks_today'   => $attacksToday,
                ],
                'suspicious_ips'  => $suspiciousIps,
                'recent_events'   => $recentEvents,
                'recent_attempts' => $recentAttempts,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function events(Request $request)
    {
        try {
            $query = SecurityEvent::with(['user:id,name,email', 'resolver:id,name'])
                ->orderByDesc('created_at');

            if ($request->filled('type')) {
                $query->where('type', $request->input('type'));
            }
            if ($request->filled('severity')) {
                $query->where('severity', $request->input('severity'));
            }
            if ($request->boolean('unresolved')) {
                $query->where('resolved', false);
            }

            $data = $query->paginate($request->integer('per_page', 20));

            return ApiResponse::success('OK', $data);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function attempts(Request $request)
    {
        try {
            $query = LoginAttempt::with('user:id,name,email')
                ->orderByDesc('created_at');

            if ($request->filled('ip')) {
                $query->where('ip_address', $request->input('ip'));
            }
            if ($request->boolean('failed_only')) {
                $query->where('success', false);
            }

            $data = $query->paginate($request->integer('per_page', 25));

            return ApiResponse::success('OK', $data);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function blockedIps(Request $request)
    {
        try {
            $data = BlockedIp::with('blocker:id,name')
                ->active()
                ->orderByDesc('created_at')
                ->paginate($request->integer('per_page', 20));

            return ApiResponse::success('OK', $data);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function blockIp(Request $request, IntrusionDetectionService $ids)
    {
        $request->validate([
            'ip_address' => 'required|ip',
            'reason'     => 'nullable|string|max:255',
            'expires_at' => 'nullable|date|after:now',
        ]);

        try {
            $blocked = $ids->blockIp(
                $request->input('ip_address'),
                $request->input('reason', 'Manually blocked by administrator'),
                'manual',
                $request->filled('expires_at') ? new \DateTime($request->input('expires_at')) : null,
                $request->user()->id
            );

            activity('security')->event('ip_blocked')
                ->causedBy($request->user())
                ->withProperties(['ip' => $request->input('ip_address'), 'reason' => $request->input('reason')])
                ->log("IP {$request->input('ip_address')} manually blocked");

            return ApiResponse::success('IP blocked', $blocked, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function unblockIp(Request $request, int $id)
    {
        try {
            $blocked = BlockedIp::findOrFail($id);
            $ip = $blocked->ip_address;
            $blocked->delete();

            activity('security')->event('ip_unblocked')
                ->causedBy($request->user())
                ->withProperties(['ip' => $ip])
                ->log("IP {$ip} unblocked");

            return ApiResponse::success('IP unblocked');
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function suspiciousRequests(Request $request)
    {
        try {
            $query = SuspiciousRequest::orderByDesc('created_at');

            if ($request->filled('attack_type')) {
                $query->where('attack_type', $request->input('attack_type'));
            }
            if ($request->filled('ip')) {
                $query->where('ip_address', $request->input('ip'));
            }
            if ($request->filled('severity')) {
                $query->where('severity', $request->input('severity'));
            }
            if ($request->boolean('exclude_404')) {
                $query->whereNotIn('attack_type', ['enumeration_404']);
            }

            $data = $query->paginate($request->integer('per_page', 25));

            $summary = SuspiciousRequest::where('created_at', '>=', now()->subHours(24))
                ->selectRaw('attack_type, COUNT(*) as count')
                ->groupBy('attack_type')
                ->orderByDesc('count')
                ->get();

            return ApiResponse::success('OK', ['requests' => $data, 'summary' => $summary]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function resolveEvent(Request $request, int $id)
    {
        try {
            $event = SecurityEvent::findOrFail($id);
            $event->update([
                'resolved'    => true,
                'resolved_at' => now(),
                'resolved_by' => $request->user()->id,
            ]);

            return ApiResponse::success('Event resolved', $event->fresh(['resolver:id,name']));
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }
}
