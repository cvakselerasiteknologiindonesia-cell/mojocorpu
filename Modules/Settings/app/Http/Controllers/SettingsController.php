<?php

namespace Modules\Settings\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Modules\Settings\Models\AppSetting;
use Modules\Wallet\Services\WalletService;

class SettingsController extends Controller
{
    public function index()
    {
        try {
            $settings = AppSetting::where('group', 'ai')->get();

            $data = $settings->mapWithKeys(function ($s) {
                $value = $s->is_secret && $s->value ? '••••••••' : $s->value;

                return [$s->key => $value];
            });

            return ApiResponse::success('Settings retrieved', $data);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'ai_provider' => ['sometimes', 'string', 'in:openai,anthropic,deepseek,ollama'],
            'ai_model' => ['sometimes', 'string', 'max:100'],
            'ai_api_key' => ['sometimes', 'nullable', 'string', 'max:500'],
            'ai_base_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'ai_quiz_gen' => ['sometimes', 'boolean'],
            'ai_content_assist' => ['sometimes', 'boolean'],
            'ai_proposal_assist' => ['sometimes', 'boolean'],
            'ai_max_tokens' => ['sometimes', 'integer', 'min:256', 'max:16384'],
            'ai_temperature' => ['sometimes', 'numeric', 'min:0', 'max:2'],
        ]);

        try {
            foreach ($validated as $key => $value) {
                // Skip sentinel for secret fields — don't overwrite with mask
                if ($value === '••••••••') {
                    continue;
                }
                $cast = is_bool($value) ? ($value ? '1' : '0') : (string) $value;
                AppSetting::where('key', $key)->update(['value' => $cast]);
            }

            return ApiResponse::success('Settings saved.');
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function walletIndex()
    {
        try {
            /** @var array<string, AppSetting> $s */
            $s = AppSetting::where('group', 'wallet')->get()->keyBy('key')->all();

            $tiers = json_decode($s['wallet_score_tiers']?->value ?? '[]', true) ?: [];

            return ApiResponse::success('Wallet settings retrieved', [
                'wallet_enabled' => ($s['wallet_enabled']?->value ?? '1') === '1',
                'wallet_auto_credit' => ($s['wallet_auto_credit']?->value ?? '1') === '1',
                'wallet_max_balance' => (int) ($s['wallet_max_balance']?->value ?? WalletService::DEFAULT_MAX_BALANCE),
                'wallet_max_single_credit' => (int) ($s['wallet_max_single_credit']?->value ?? WalletService::DEFAULT_MAX_SINGLE_CREDIT),
                'wallet_score_tiers' => $tiers,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function walletUpdate(Request $request)
    {
        $validated = $request->validate([
            'wallet_enabled' => ['sometimes', 'boolean'],
            'wallet_auto_credit' => ['sometimes', 'boolean'],
            'wallet_max_balance' => ['sometimes', 'integer', 'min:100', 'max:100000000'],
            'wallet_max_single_credit' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'wallet_score_tiers' => ['sometimes', 'array', 'min:1', 'max:10'],
            'wallet_score_tiers.*.min_score' => ['required_with:wallet_score_tiers', 'integer', 'min:0', 'max:100'],
            'wallet_score_tiers.*.multiplier' => ['required_with:wallet_score_tiers', 'numeric', 'min:0', 'max:10'],
            'wallet_score_tiers.*.label' => ['required_with:wallet_score_tiers', 'string', 'max:50'],
        ]);

        try {
            foreach ($validated as $key => $value) {
                if ($key === 'wallet_score_tiers') {
                    AppSetting::set($key, json_encode($value));
                } elseif (\is_bool($value)) {
                    AppSetting::set($key, $value ? '1' : '0');
                } else {
                    AppSetting::set($key, (string) $value);
                }
            }

            // Bust the runtime cache so WalletService picks up new values immediately.
            cache()->forget('wallet_cfg');

            activity('settings')->event('updated')->causedBy(auth()->user())->log('Wallet settings updated');

            return ApiResponse::success('Wallet settings berhasil disimpan.');
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function appIndex()
    {
        try {
            $s = AppSetting::whereIn('key', ['app_name', 'app_tagline', 'app_logo'])
                ->get()->keyBy('key');

            return ApiResponse::success('App identity retrieved', [
                'app_name' => $s['app_name']?->value ?? 'MojoCorpu',
                'app_tagline' => $s['app_tagline']?->value ?? '',
                'app_logo' => $s['app_logo']?->value ?? null,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function appUpdate(Request $request)
    {
        $request->validate([
            'app_name' => ['sometimes', 'string', 'max:100'],
            'app_tagline' => ['sometimes', 'nullable', 'string', 'max:255'],
            'app_logo' => ['sometimes', 'nullable', 'file', 'image', 'mimes:jpeg,png,gif,webp', 'max:2048'],
        ]);

        try {
            if ($request->has('app_name')) {
                AppSetting::set('app_name', $request->input('app_name'));
            }
            if ($request->has('app_tagline')) {
                AppSetting::set('app_tagline', $request->input('app_tagline') ?? '');
            }
            if ($request->hasFile('app_logo')) {
                $old = AppSetting::get('app_logo');
                if ($old) {
                    // Strip any scheme+host prefix so we work with a relative path.
                    $oldRelative = parse_url($old, PHP_URL_PATH);
                    $oldPath = ltrim(str_replace('/storage/', '', $oldRelative ?? ''), '/');
                    if ($oldPath) {
                        Storage::disk('public')->delete($oldPath);
                    }
                }

                $path = $request->file('app_logo')->store('app-identity', 'public');
                // Use Storage::url() instead of hardcoding /storage/ prefix so
                // the URL is always correct regardless of deploy subdirectory.
                AppSetting::set('app_logo', Storage::disk('public')->url($path));
            }

            activity('settings')->event('updated')->causedBy(auth()->user())->log('App identity updated');

            return ApiResponse::success('Identitas aplikasi berhasil disimpan.', [
                'app_name' => AppSetting::get('app_name', 'MojoCorpu'),
                'app_tagline' => AppSetting::get('app_tagline', ''),
                'app_logo' => AppSetting::get('app_logo'),
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function paymentIndex()
    {
        try {
            $s = AppSetting::where('group', 'payment')->get()->keyBy('key');

            $mask = fn ($v) => $v ? '••••••••' : null;

            return ApiResponse::success('Payment settings retrieved', [
                'midtrans_merchant_id' => $s['midtrans_merchant_id']?->value ?? null,
                'midtrans_client_key' => $s['midtrans_client_key']?->value ? $mask($s['midtrans_client_key']->value) : null,
                'midtrans_server_key' => $s['midtrans_server_key']?->value ? $mask($s['midtrans_server_key']->value) : null,
                'midtrans_mode' => $s['midtrans_mode']?->value ?? 'sandbox',
                'midtrans_webhook_url' => $s['midtrans_webhook_url']?->value ?? (config('app.url').'/api/payment/webhook/midtrans'),
                'midtrans_webhook_verify_signature' => ($s['midtrans_webhook_verify_signature']?->value ?? '1') === '1',
                'midtrans_webhook_verify_amount' => ($s['midtrans_webhook_verify_amount']?->value ?? '1') === '1',
                'midtrans_ip_whitelist' => ($s['midtrans_ip_whitelist']?->value ?? '0') === '1',
                'midtrans_idempotency_guard' => ($s['midtrans_idempotency_guard']?->value ?? '1') === '1',
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function paymentUpdate(Request $request)
    {
        $validated = $request->validate([
            'midtrans_merchant_id' => ['sometimes', 'nullable', 'string', 'max:100'],
            'midtrans_client_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'midtrans_server_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'midtrans_mode' => ['sometimes', 'string', 'in:sandbox,production'],
            'midtrans_webhook_url' => ['sometimes', 'nullable', 'url', 'max:500'],
            'midtrans_webhook_verify_signature' => ['sometimes', 'boolean'],
            'midtrans_webhook_verify_amount' => ['sometimes', 'boolean'],
            'midtrans_ip_whitelist' => ['sometimes', 'boolean'],
            'midtrans_idempotency_guard' => ['sometimes', 'boolean'],
        ]);

        try {
            $boolKeys = ['midtrans_webhook_verify_signature', 'midtrans_webhook_verify_amount', 'midtrans_ip_whitelist', 'midtrans_idempotency_guard'];
            $secretKeys = ['midtrans_client_key', 'midtrans_server_key'];

            // Only iterate over validated keys — prevents arbitrary setting injection.
            foreach ($validated as $key => $value) {
                if (in_array($key, $secretKeys, true)) {
                    // Secret fields — skip sentinel mask
                    if ($value === '••••••••' || $value === null) {
                        continue;
                    }
                    AppSetting::where('key', $key)->update(['value' => $value]);
                } else {
                    $cast = in_array($key, $boolKeys, true) ? ($value ? '1' : '0') : (string) ($value ?? '');
                    AppSetting::where('key', $key)->update(['value' => $cast]);
                }
            }

            activity('settings')->event('updated')->causedBy(auth()->user())->log('Payment settings updated');

            return ApiResponse::success('Pengaturan pembayaran berhasil disimpan.');
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error();
        }
    }

    public function testPaymentConnection()
    {
        try {
            $serverKey = AppSetting::get('midtrans_server_key');
            $mode = AppSetting::get('midtrans_mode', 'sandbox');

            if (! $serverKey) {
                return ApiResponse::error('Server Key belum dikonfigurasi.', 422);
            }

            $baseUrl = $mode === 'production'
                ? 'https://api.midtrans.com'
                : 'https://api.sandbox.midtrans.com';

            // GET status of a fake order — valid key returns 404, invalid returns 401
            $response = Http::withBasicAuth($serverKey, '')
                ->timeout(10)
                ->get("{$baseUrl}/v2/corpu-test-ping/status");

            $httpStatus = $response->status();
            $bodyCode = (string) ($response->json('status_code') ?? $httpStatus);

            // Midtrans returns HTTP 200 with status_code in body
            // status_code 404 = valid key, order not found (expected)
            // status_code 401 = invalid key
            if ($httpStatus === 401 || $bodyCode === '401') {
                return ApiResponse::error('Server Key tidak valid atau akses ditolak.', 422);
            }

            if ($bodyCode === '404' || $bodyCode === '200') {
                $modeLabel = $mode === 'production' ? 'Production' : 'Sandbox';

                return ApiResponse::success("Server Key valid. Terhubung ke Midtrans {$modeLabel}.");
            }

            return ApiResponse::error("Koneksi gagal (status {$bodyCode}).", 422);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error('Koneksi gagal: '.$e->getMessage(), 422);
        }
    }

    public function testConnection()
    {
        try {
            $provider = AppSetting::get('ai_provider', 'openai');
            $apiKey = AppSetting::get('ai_api_key');
            $model = AppSetting::get('ai_model', 'gpt-4o-mini');
            $baseUrl = AppSetting::get('ai_base_url');

            if (! $apiKey) {
                return ApiResponse::error('API key belum dikonfigurasi.', 422);
            }

            [$url, $headers, $body] = match ($provider) {
                'anthropic' => [
                    ($baseUrl ?: 'https://api.anthropic.com').'/v1/messages',
                    ['x-api-key' => $apiKey, 'anthropic-version' => '2023-06-01', 'content-type' => 'application/json'],
                    ['model' => $model, 'max_tokens' => 10, 'messages' => [['role' => 'user', 'content' => 'ping']]],
                ],
                default => [
                    ($baseUrl ?: 'https://api.openai.com').'/v1/chat/completions',
                    ['Authorization' => "Bearer {$apiKey}", 'Content-Type' => 'application/json'],
                    ['model' => $model, 'max_tokens' => 10, 'messages' => [['role' => 'user', 'content' => 'ping']]],
                ],
            };

            $response = Http::withHeaders($headers)->timeout(10)->post($url, $body);

            if ($response->successful()) {
                return ApiResponse::success('Koneksi berhasil! AI siap digunakan.');
            }

            $status = $response->status();
            $errCode = $response->json('error.code') ?? $response->json('error.type') ?? '';
            $errMsg = $response->json('error.message') ?? 'Unknown error';

            // Quota / billing errors mean the API key IS valid and the endpoint IS reachable
            if ($status === 429 || str_contains($errCode, 'quota') || str_contains($errMsg, 'quota') || str_contains($errMsg, 'billing')) {
                return ApiResponse::success(
                    'API key valid dan endpoint terhubung, namun kuota habis. Tambahkan kredit di platform.openai.com/settings/billing.',
                    ['warning' => true]
                );
            }

            if ($status === 401) {
                return ApiResponse::error('API key tidak valid atau sudah dicabut. Periksa kembali API key Anda.', 422);
            }

            return ApiResponse::error("Koneksi gagal ({$status}): {$errMsg}", 422);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());

            return ApiResponse::error('Koneksi gagal: '.$e->getMessage(), 422);
        }
    }
}
