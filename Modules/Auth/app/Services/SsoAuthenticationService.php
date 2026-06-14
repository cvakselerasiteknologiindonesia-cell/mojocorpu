<?php

namespace Modules\Auth\Services;

use App\Models\User;
use App\Support\AuthSessionPayload;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class SsoAuthenticationService
{
    public function login(string $accessToken, string $deviceName = 'corporateuniversity-app'): array
    {
        return DB::transaction(function () use ($accessToken, $deviceName): array {
            $payload = $this->validateToken($accessToken);
            $ssoUser = Arr::get($payload, 'user');

            if (! is_array($ssoUser) || ! Arr::get($ssoUser, 'is_active', true)) {
                throw ValidationException::withMessages(['access_token' => 'Inactive or invalid SSO user.']);
            }

            $ssoUserId = $ssoUser['uuid'] ?? $ssoUser['sso_id'] ?? null;

            if (! $ssoUserId) {
                throw ValidationException::withMessages(['access_token' => 'Invalid SSO user identifier.']);
            }

            $user = $this->findExistingUser($ssoUser);

            $attributes = [
                'sso_user_id' => $ssoUserId,
                'nip' => $ssoUser['nip'] ?? null,
                'name' => $ssoUser['name'],
                'email' => $ssoUser['email'] ?? null,
                'opd_id' => $ssoUser['opd_id'] ?? null,
                'opd_name' => $ssoUser['opd_name'] ?? null,
                'organization_unit_id' => $ssoUser['organization_unit_id'] ?? null,
                'organization_unit_name' => $ssoUser['organization_unit_name'] ?? null,
                'position_name' => $ssoUser['position_name'] ?? null,
                'employee_status' => $ssoUser['employee_status'] ?? null,
                'photo_url' => $ssoUser['photo_url'] ?? null,
                'user_type' => $ssoUser['user_type'] ?? 'asn',
                'is_active' => (bool) ($ssoUser['is_active'] ?? true),
                'last_login_at' => now(),
            ];

            if ($user) {
                $user->forceFill($attributes)->save();
            } else {
                $user = User::query()->create($attributes);
            }

            $role = $ssoUser['role'] ?? 'asn';
            $user->syncRoles([$role]);

            $token = $user->createToken($deviceName, ['*'], now()->addHour());

            activity('auth')->event('sso_login')->causedBy($user)->log('SSO login');

            return AuthSessionPayload::make($token->plainTextToken, $user);
        });
    }

    private function findExistingUser(array $ssoUser): ?User
    {
        $ssoUserId = $ssoUser['uuid'] ?? $ssoUser['sso_id'] ?? null;
        $nip = $ssoUser['nip'] ?? null;
        $email = $ssoUser['email'] ?? null;

        if ($ssoUserId && $user = User::query()->where('sso_user_id', $ssoUserId)->first()) {
            return $user;
        }

        if ($nip && $user = User::query()->where('nip', $nip)->first()) {
            return $user;
        }

        if ($email && $user = User::query()->where('email', $email)->first()) {
            return $user;
        }

        return null;
    }

    private function validateToken(string $accessToken): array
    {
        $url = rtrim(config('services.sso.base_url'), '/').config('services.sso.validate_token_path');
        $response = Http::acceptJson()->timeout(10)->post($url, ['token' => $accessToken]);

        if (! $response->successful() || ! $response->json('data.valid')) {
            Log::warning('SSO token validation failed', ['status' => $response->status()]);
            throw ValidationException::withMessages(['access_token' => 'Invalid SSO token.']);
        }

        return $response->json('data');
    }
}
