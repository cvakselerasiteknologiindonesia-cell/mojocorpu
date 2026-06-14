<?php

namespace App\Http\Middleware;

use App\Models\BlockedIp;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckBlockedIp
{
    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();

        if (app()->environment(['local', 'testing']) && in_array($ip, ['127.0.0.1', '::1'], true)) {
            return $next($request);
        }

        $blocked = BlockedIp::where('ip_address', $ip)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->exists();

        if ($blocked) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Your IP address has been blocked due to suspicious activity.',
                'data'    => null,
            ], 403);
        }

        return $next($request);
    }
}
