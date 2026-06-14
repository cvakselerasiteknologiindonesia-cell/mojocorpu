<?php

namespace Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuthSessionPayload;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Services\IntrusionDetectionService;
use Modules\Auth\Http\Requests\CredentialLoginRequest;
use Modules\Auth\Http\Requests\SsoLoginRequest;
use Modules\Auth\Services\SsoAuthenticationService;

class AuthController extends Controller
{
    public function login(CredentialLoginRequest $request, IntrusionDetectionService $ids)
    {
        $ip         = $request->ip();
        $identifier = $request->string('identifier')->trim()->toString();
        $userAgent  = $request->userAgent();

        try {
            $user = User::query()
                ->where('email', $identifier)
                ->orWhere('nip', $identifier)
                ->first();

            if (! $user || ! $user->password || ! Hash::check($request->string('password')->toString(), $user->password)) {
                $ids->recordAttempt($ip, $identifier, false, $user?->id, $userAgent, 'invalid_credentials');
                throw ValidationException::withMessages([
                    'identifier' => 'NIP/email atau kata sandi tidak sesuai.',
                ]);
            }

            if (! $user->is_active) {
                $ids->recordAttempt($ip, $identifier, false, $user->id, $userAgent, 'account_inactive');
                throw ValidationException::withMessages([
                    'identifier' => 'Akun tidak aktif. Hubungi Admin BKPSDM.',
                ]);
            }

            $ids->recordAttempt($ip, $identifier, true, $user->id, $userAgent);

            $user->forceFill(['last_login_at' => now()])->save();
            $token = $user->createToken(
                $request->string('device_name', 'corporateuniversity-app')->toString(),
                ['*'],
                now()->addHour()
            );

            activity('auth')->event('credential_login')->causedBy($user)->log('Credential login');

            return ApiResponse::success('Login successful', AuthSessionPayload::make($token->plainTextToken, $user));
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function ssoLogin(SsoLoginRequest $request, SsoAuthenticationService $service)
    {
        try {
            return ApiResponse::success('SSO login successful', $service->login(
                $request->string('access_token')->toString(),
                $request->string('device_name', 'corporateuniversity-app')->toString()
            ));
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    public function logout(Request $request)
    {
        try {
            DB::transaction(function () use ($request): void {
                $request->user()?->currentAccessToken()?->delete();
                activity('auth')->event('logout')->causedBy($request->user())->log('User logged out');
            });

            return ApiResponse::success('Logout successful');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }
}
