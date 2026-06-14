<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
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

        $baseUrl = rtrim(config('services.sso.base_url'), '/');

        try {
            $health = Http::acceptJson()->timeout(2)->get($baseUrl.config('services.sso.health_path'));

            if (! $health->successful()) {
                return redirect('/?sso_unavailable=1');
            }
        } catch (\Throwable $e) {
            Log::warning('Jakarta SSO unavailable during redirect', [
                'message' => $e->getMessage(),
                'base_url' => $baseUrl,
            ]);

            return redirect('/?sso_unavailable=1');
        }

        return redirect()->away($baseUrl.config('services.sso.authorize_path').'?'.http_build_query([
            'response_type' => 'code',
            'client_id' => config('services.sso.client_id'),
            'redirect_uri' => config('services.sso.redirect_uri'),
            'state' => $state,
        ]));
    }

    public function callback(Request $request, SsoAuthenticationService $service)
    {
        if (! $request->filled('code') || ! hash_equals((string) $request->session()->pull('sso_state'), (string) $request->query('state'))) {
            return view('auth.sso-callback', [
                'sessionPayload' => null,
                'error' => 'SSO callback tidak valid. Silakan coba login kembali.',
            ]);
        }

        $baseUrl = rtrim(config('services.sso.base_url'), '/');

        try {
            $response = Http::acceptJson()->timeout(5)->asForm()->post($baseUrl.config('services.sso.token_path'), [
                'grant_type' => 'authorization_code',
                'client_id' => config('services.sso.client_id'),
                'client_secret' => config('services.sso.client_secret'),
                'redirect_uri' => config('services.sso.redirect_uri'),
                'code' => $request->query('code'),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Jakarta SSO unavailable during token exchange', [
                'message' => $e->getMessage(),
                'base_url' => $baseUrl,
            ]);

            return view('auth.sso-callback', [
                'sessionPayload' => null,
                'error' => 'Server SSO Jakarta sedang tidak tersedia. Silakan masuk menggunakan NIP/email BKPSDM.',
            ]);
        }

        if (! $response->successful() || ! $response->json('success')) {
            return view('auth.sso-callback', [
                'sessionPayload' => null,
                'error' => $response->json('message', 'Gagal menukar authorization code ke server SSO Jakarta.'),
            ]);
        }

        $sessionPayload = $service->login((string) $response->json('data.access_token'), 'corporateuniversity-app');

        return view('auth.sso-callback', [
            'sessionPayload' => $sessionPayload,
            'error' => null,
        ]);
    }
}
