<?php

namespace Modules\Auth\Services;

use App\Models\User;
use App\Support\AuthSessionPayload;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Modules\OPD\Models\OPD;

class SsoAuthenticationService
{
    public function login(string $accessToken, string $deviceName = 'corporateuniversity-app'): array
    {
        return DB::transaction(function () use ($accessToken, $deviceName): array {
            $payload = $this->validateToken($accessToken);
            $ssoUser = Arr::get($payload, 'user');

            return $this->loginFromSsoUser($ssoUser, $deviceName);
        });
    }

    public function loginWithUserInfo(array $userInfo, string $deviceName = 'corporateuniversity-app'): array
    {
        return DB::transaction(function () use ($userInfo, $deviceName): array {
            return $this->loginFromSsoUser($this->mapOidcUserInfo($userInfo), $deviceName);
        });
    }

    private function loginFromSsoUser(?array $ssoUser, string $deviceName): array
    {
        if (! is_array($ssoUser) || ! Arr::get($ssoUser, 'is_active', true)) {
            throw ValidationException::withMessages(['access_token' => 'Inactive or invalid SSO user.']);
        }

        $ssoUserId = $ssoUser['uuid'] ?? $ssoUser['sso_id'] ?? null;

        if (! $ssoUserId) {
            throw ValidationException::withMessages(['access_token' => 'Invalid SSO user identifier.']);
        }

        $existingUser = $this->findExistingUser($ssoUser);
        $user = $existingUser['user'];
        $matchedBy = $existingUser['matched_by'];

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

        $attributes = $this->withoutConflictingUniqueAttributes($attributes, $user);

        $isNewUser = ! $user;

        if ($user) {
            $user->forceFill($attributes)->save();
            $syncAction = 'updated';
        } else {
            $user = User::query()->create($attributes);
            $syncAction = 'created';
        }

        Log::info('SSO user synchronized into users table', [
            'action' => $syncAction,
            'matched_by' => $matchedBy,
            'user_id' => $user->id,
            'sso_user_id' => $user->sso_user_id,
            'nip' => $user->nip,
            'email' => $user->email,
            'user_type' => $user->user_type,
        ]);

        // SSO hanya menyinkronkan identitas. Role dikelola dari panel Users/Roles
        // agar assignment super-admin tidak bergantung pada NIP hardcode/allowlist.
        if ($isNewUser || ! $user->roles()->exists()) {
            $user->syncRoles(['asn']);

            Log::info('SSO user assigned default role', [
                'user_id' => $user->id,
                'sso_user_id' => $ssoUserId,
                'role' => 'asn',
            ]);
        }

        $token = $user->createToken($deviceName, ['*'], now()->addHour());

        activity('auth')->event('sso_login')->causedBy($user)->log('SSO login');

        return AuthSessionPayload::make($token->plainTextToken, $user);
    }

    private function mapOidcUserInfo(array $userInfo): array
    {
        $nip = $this->firstFilled($userInfo, ['nip', 'pegawai_nip', 'employee_number', 'preferred_username', 'username']);
        $name = $this->firstFilled($userInfo, ['name', 'nama', 'full_name', 'preferred_username', 'username', 'nip'])
            ?? 'ASN SIMPEG';
        $satkerCode = $this->firstFilled($userInfo, ['kode_satker', 'satker_id', 'opd_id', 'skpd_id', 'unit_id']);
        $opd = $satkerCode ? OPD::query()->where('code', $satkerCode)->first() : null;
        return [
            'sso_id' => $this->firstFilled($userInfo, ['sub', 'uuid', 'id', 'sso_user_id']),
            'nip' => $nip,
            'name' => $name,
            'email' => $this->firstFilled($userInfo, ['email', 'mail']),
            'opd_id' => $opd?->id,
            'opd_name' => $opd?->name ?? $this->firstFilled($userInfo, ['opd_name', 'nama_opd', 'nama_satker', 'skpd', 'unit_kerja', 'organization_name']),
            'organization_unit_id' => $this->firstFilled($userInfo, ['organization_unit_id', 'unit_organisasi_id', 'kode_unit_kerja']),
            'organization_unit_name' => $this->firstFilled($userInfo, ['organization_unit_name', 'nama_unit_kerja', 'unit_organisasi', 'unit_name']),
            'position_name' => $this->firstFilled($userInfo, ['position_name', 'jabatan', 'nama_jabatan']),
            'employee_status' => $this->firstFilled($userInfo, ['employee_status', 'status_pegawai']),
            'photo_url' => $this->firstFilled($userInfo, ['photo_url', 'picture', 'avatar']),
            'user_type' => 'asn',
            'is_active' => (bool) ($userInfo['is_active'] ?? $userInfo['active'] ?? $userInfo['enabled'] ?? true),
            'role' => 'asn',
        ];
    }

    private function firstFilled(array $payload, array $keys): ?string
    {
        foreach ($keys as $key) {
            $value = Arr::get($payload, $key);

            if (is_scalar($value) && trim((string) $value) !== '') {
                return trim((string) $value);
            }
        }

        return null;
    }

    private function findExistingUser(array $ssoUser): array
    {
        $ssoUserId = $ssoUser['uuid'] ?? $ssoUser['sso_id'] ?? null;
        $nip = $ssoUser['nip'] ?? null;
        $email = $ssoUser['email'] ?? null;

        if ($nip && $user = User::query()->where('nip', $nip)->first()) {
            return ['user' => $user, 'matched_by' => 'nip'];
        }

        if ($email && $user = User::query()->where('email', $email)->first()) {
            return ['user' => $user, 'matched_by' => 'email'];
        }

        if ($ssoUserId && $user = User::query()->where('sso_user_id', $ssoUserId)->first()) {
            return ['user' => $user, 'matched_by' => 'sso_user_id'];
        }

        return ['user' => null, 'matched_by' => null];
    }

    private function withoutConflictingUniqueAttributes(array $attributes, ?User $user): array
    {
        foreach (['nip', 'email', 'sso_user_id'] as $column) {
            $value = $attributes[$column] ?? null;

            if (! $value) {
                continue;
            }

            $conflict = User::query()
                ->where($column, $value)
                ->when($user, fn ($query) => $query->whereKeyNot($user->getKey()))
                ->first(['id']);

            if (! $conflict) {
                continue;
            }

            Log::warning('SSO user sync skipped conflicting unique attribute', [
                'column' => $column,
                'value' => $value,
                'current_user_id' => $user?->id,
                'conflicting_user_id' => $conflict->id,
            ]);

            unset($attributes[$column]);
        }

        return $attributes;
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
