<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Modules\Settings\Models\AppSetting;
use Symfony\Component\HttpFoundation\Response;

class MidtransIpWhitelist
{
    // Midtrans official IPs — https://docs.midtrans.com/docs/ip-address-list
    private const ALLOWED_CIDRS = [
        '103.208.23.0/24',
        '103.208.23.12',
        '103.208.23.13',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Only enforce if the setting is explicitly enabled
        $enabled = AppSetting::where('key', 'midtrans_ip_whitelist')->value('value') === '1';

        if (! $enabled) {
            return $next($request);
        }

        // Always allow in local/testing
        if (app()->environment(['local', 'testing'])) {
            return $next($request);
        }

        $clientIp = $request->ip();

        foreach (self::ALLOWED_CIDRS as $cidr) {
            if ($this->ipInRange($clientIp, $cidr)) {
                return $next($request);
            }
        }

        Log::warning('Midtrans webhook: blocked IP', [
            'ip' => $clientIp,
            'path' => $request->path(),
        ]);

        return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
    }

    private function ipInRange(string $ip, string $cidr): bool
    {
        if (! str_contains($cidr, '/')) {
            return $ip === $cidr;
        }

        [$subnet, $bits] = explode('/', $cidr, 2);
        $bits = (int) $bits;
        $ipLong = ip2long($ip);
        $snLong = ip2long($subnet);

        if ($ipLong === false || $snLong === false) {
            return false;
        }

        $mask = $bits === 0 ? 0 : (~0 << (32 - $bits));

        return ($ipLong & $mask) === ($snLong & $mask);
    }
}
