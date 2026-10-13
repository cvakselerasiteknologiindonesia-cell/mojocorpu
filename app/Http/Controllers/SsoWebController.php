<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Modules\Auth\Services\SsoAuthenticationService;

class SsoWebController extends Controller
{
    public function redirect(Request $request)
    {
        $state = Str::random(40);
        $request->session()->put('sso_state', $state);
        Cache::put($this->stateCacheKey($state), true, now()->addMinutes(10));

        $baseUrl = rtrim(config('services.sso.base_url'), '/');

        if ($healthPath = $this->healthPath()) {
            try {
                $health = Http::acceptJson()->timeout(3)->get($baseUrl.$healthPath);

                if (! $health->successful()) {
                    return redirect('/?sso_unavailable=1');
                }
            } catch (\Throwable $e) {
                Log::warning('SSO unavailable during redirect', [
                    'message' => $e->getMessage(),
                    'base_url' => $baseUrl,
                ]);

                return redirect('/?sso_unavailable=1');
            }
        }

        $query = [
            'response_type' => 'code',
            'client_id' => config('services.sso.client_id'),
            'redirect_uri' => config('services.sso.redirect_uri'),
            'state' => $state,
        ];

        if ($this->isOidc()) {
            $query['scope'] = config('services.sso.scopes', 'openid profile email');
            $query['prompt'] = 'login';
        }

        return redirect()->away($baseUrl.$this->authorizePath().'?'.http_build_query($query));
    }

    public function callback(Request $request, SsoAuthenticationService $service)
    {
        // [L3] Batasi panjang state untuk mencegah memory spike dari input besar
        $incomingState = substr((string) $request->query('state', ''), 0, 80);

        if ($request->filled('error')) {
            Log::warning('SSO callback returned error', [
                'driver' => config('services.sso.driver'),
                'base_url' => rtrim(config('services.sso.base_url'), '/'),
                'realm' => config('services.sso.realm'),
                'client_id' => config('services.sso.client_id'),
                'error' => $request->query('error'),
                'error_description' => $request->query('error_description'),
            ]);

            return view('auth.sso-callback', [
                'sessionPayload' => null,
                'error' => 'SSO menolak proses login. Silakan coba kembali atau hubungi administrator.',
            ]);
        }

        if (! $request->filled('code') || ! $this->hasValidState($request, $incomingState)) {
            Log::warning('SSO callback invalid', [
                'has_code' => $request->filled('code'),
                'has_state' => $incomingState !== '',
                'driver' => config('services.sso.driver'),
                'base_url' => rtrim(config('services.sso.base_url'), '/'),
                'realm' => config('services.sso.realm'),
                'client_id' => config('services.sso.client_id'),
            ]);

            return view('auth.sso-callback', [
                'sessionPayload' => null,
                'error' => 'SSO callback tidak valid. Silakan coba login kembali.',
            ]);
        }

        $baseUrl = rtrim(config('services.sso.base_url'), '/');

        try {
            $response = Http::acceptJson()->timeout(10)->asForm()->post($baseUrl.$this->tokenPath(), [
                'grant_type' => 'authorization_code',
                'client_id' => config('services.sso.client_id'),
                'client_secret' => config('services.sso.client_secret'),
                'redirect_uri' => config('services.sso.redirect_uri'),
                'code' => $request->query('code'),
            ]);
        } catch (\Throwable $e) {
            Log::warning('SSO unavailable during token exchange', [
                'message' => $e->getMessage(),
                'base_url' => $baseUrl,
            ]);

            return view('auth.sso-callback', [
                'sessionPayload' => null,
                'error' => 'Server SSO sedang tidak tersedia. Silakan masuk menggunakan NIP/email BKPSDM.',
            ]);
        }

        $accessToken = (string) ($response->json('data.access_token') ?? $response->json('access_token') ?? '');

        Log::info('SSO token response received', [
            'driver' => config('services.sso.driver'),
            'base_url' => $baseUrl,
            'realm' => config('services.sso.realm'),
            'client_id' => config('services.sso.client_id'),
            'payload' => $this->sanitizeSsoPayload($response->json() ?? []),
        ]);

        if (! $response->successful() || $accessToken === '' || (! $this->isOidc() && ! $response->json('success'))) {
            Log::warning('SSO token exchange failed', [
                'status' => $response->status(),
                'driver' => config('services.sso.driver'),
                'base_url' => $baseUrl,
                'realm' => config('services.sso.realm'),
                'client_id' => config('services.sso.client_id'),
                'response_error' => $response->json('error'),
                'response_error_description' => $response->json('error_description'),
                'response_message' => $response->json('message'),
            ]);

            return view('auth.sso-callback', [
                'sessionPayload' => null,
                'error' => $response->json('message', 'Gagal menukar authorization code ke server SSO.'),
            ]);
        }

        try {
            if ($this->isOidc()) {
                $sessionPayload = $service->loginWithUserInfo(
                    $this->fetchUserInfo($baseUrl, $accessToken),
                    'corporateuniversity-app'
                );
            } else {
                $sessionPayload = $service->login($accessToken, 'corporateuniversity-app');
            }
        } catch (\Throwable $e) {
            Log::warning('SSO login session creation failed', [
                'message' => $e->getMessage(),
                'driver' => config('services.sso.driver'),
                'base_url' => $baseUrl,
                'realm' => config('services.sso.realm'),
                'client_id' => config('services.sso.client_id'),
            ]);

            return view('auth.sso-callback', [
                'sessionPayload' => null,
                'error' => 'SSO berhasil dihubungi, tetapi profil pengguna belum dapat diproses di Corpu.',
            ]);
        }

        return view('auth.sso-callback', [
            'sessionPayload' => $sessionPayload,
            'error' => null,
        ]);
    }

    private function isOidc(): bool
    {
        return config('services.sso.driver') === 'oidc';
    }

    private function hasValidState(Request $request, string $incomingState): bool
    {
        if ($incomingState === '') {
            return false;
        }

        $sessionState = (string) $request->session()->pull('sso_state');

        if ($sessionState !== '' && hash_equals($sessionState, $incomingState)) {
            Cache::forget($this->stateCacheKey($incomingState));

            return true;
        }

        $cacheKey = $this->stateCacheKey($incomingState);

        if (! Cache::pull($cacheKey)) {
            return false;
        }

        return true;
    }

    private function stateCacheKey(string $state): string
    {
        return 'sso_state:'.hash('sha256', $state);
    }

    private function realmPath(string $suffix): string
    {
        return '/realms/'.trim((string) config('services.sso.realm'), '/').$suffix;
    }

    private function authorizePath(): string
    {
        $path = config('services.sso.authorize_path');

        return $this->isOidc()
            ? ($path && $path !== '/oauth/authorize' ? $path : $this->realmPath('/protocol/openid-connect/auth'))
            : $path;
    }

    private function tokenPath(): string
    {
        $path = config('services.sso.token_path');

        return $this->isOidc()
            ? ($path && $path !== '/api/oauth/token' ? $path : $this->realmPath('/protocol/openid-connect/token'))
            : $path;
    }

    private function userInfoPath(): string
    {
        return config('services.sso.userinfo_path') ?: $this->realmPath('/protocol/openid-connect/userinfo');
    }

    private function healthPath(): ?string
    {
        $path = config('services.sso.health_path');

        if ($path === null || trim((string) $path) === '') {
            return null;
        }

        return $path;
    }

    private function fetchUserInfo(string $baseUrl, string $accessToken): array
    {
        $response = Http::acceptJson()
            ->withToken($accessToken)
            ->timeout(10)
            ->get($baseUrl.$this->userInfoPath());

        if (! $response->successful()) {
            Log::warning('SSO userinfo request failed', [
                'status' => $response->status(),
                'base_url' => $baseUrl,
                'realm' => config('services.sso.realm'),
                'client_id' => config('services.sso.client_id'),
                'response_error' => $response->json('error'),
                'response_error_description' => $response->json('error_description'),
            ]);

            throw \Illuminate\Validation\ValidationException::withMessages([
                'access_token' => 'Gagal mengambil profil pengguna dari SSO.',
            ]);
        }

        $payload = $response->json() ?? [];

        Log::info('SSO userinfo response received', [
            'base_url' => $baseUrl,
            'realm' => config('services.sso.realm'),
            'client_id' => config('services.sso.client_id'),
            'payload' => $this->sanitizeSsoPayload($payload),
        ]);

        return $payload;
    }

    private function sanitizeSsoPayload(array $payload): array
    {
        $sensitiveKeys = [
            'access_token',
            'refresh_token',
            'id_token',
            'token',
            'client_secret',
            'secret',
            'password',
            'passwd',
        ];

        foreach ($payload as $key => $value) {
            if (in_array(strtolower((string) $key), $sensitiveKeys, true)) {
                $payload[$key] = '[redacted]';

                continue;
            }

            if (is_array($value)) {
                $payload[$key] = $this->sanitizeSsoPayload($value);
            }
        }

        return $payload;
    }
}
