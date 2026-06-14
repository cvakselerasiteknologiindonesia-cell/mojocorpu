<?php

namespace Modules\Settings\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Modules\Settings\Models\AppSetting;

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
            'ai_provider'        => ['sometimes', 'string', 'in:openai,anthropic,deepseek,ollama'],
            'ai_model'           => ['sometimes', 'string', 'max:100'],
            'ai_api_key'         => ['sometimes', 'nullable', 'string', 'max:500'],
            'ai_base_url'        => ['sometimes', 'nullable', 'url', 'max:255'],
            'ai_quiz_gen'        => ['sometimes', 'boolean'],
            'ai_content_assist'  => ['sometimes', 'boolean'],
            'ai_proposal_assist' => ['sometimes', 'boolean'],
            'ai_max_tokens'      => ['sometimes', 'integer', 'min:256', 'max:16384'],
            'ai_temperature'     => ['sometimes', 'numeric', 'min:0', 'max:2'],
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
                'wallet_enabled'           => ($s['wallet_enabled']?->value          ?? '1') === '1',
                'wallet_auto_credit'       => ($s['wallet_auto_credit']?->value      ?? '1') === '1',
                'wallet_max_balance'       => (int) ($s['wallet_max_balance']?->value       ?? 1000000),
                'wallet_max_single_credit' => (int) ($s['wallet_max_single_credit']?->value ?? 10000),
                'wallet_score_tiers'       => $tiers,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage());
            return ApiResponse::error();
        }
    }

    public function walletUpdate(Request $request)
    {
        $validated = $request->validate([
            'wallet_enabled'               => ['sometimes', 'boolean'],
            'wallet_auto_credit'           => ['sometimes', 'boolean'],
            'wallet_max_balance'           => ['sometimes', 'integer', 'min:100', 'max:100000000'],
            'wallet_max_single_credit'     => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'wallet_score_tiers'           => ['sometimes', 'array', 'min:1', 'max:10'],
            'wallet_score_tiers.*.min_score'  => ['required_with:wallet_score_tiers', 'integer', 'min:0', 'max:100'],
            'wallet_score_tiers.*.multiplier' => ['required_with:wallet_score_tiers', 'numeric', 'min:0', 'max:10'],
            'wallet_score_tiers.*.label'      => ['required_with:wallet_score_tiers', 'string', 'max:50'],
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

    public function testConnection()
    {
        try {
            $provider  = AppSetting::get('ai_provider', 'openai');
            $apiKey    = AppSetting::get('ai_api_key');
            $model     = AppSetting::get('ai_model', 'gpt-4o-mini');
            $baseUrl   = AppSetting::get('ai_base_url');

            if (!$apiKey) {
                return ApiResponse::error('API key belum dikonfigurasi.', 422);
            }

            [$url, $headers, $body] = match ($provider) {
                'anthropic' => [
                    ($baseUrl ?: 'https://api.anthropic.com') . '/v1/messages',
                    ['x-api-key' => $apiKey, 'anthropic-version' => '2023-06-01', 'content-type' => 'application/json'],
                    ['model' => $model, 'max_tokens' => 10, 'messages' => [['role' => 'user', 'content' => 'ping']]],
                ],
                default => [
                    ($baseUrl ?: 'https://api.openai.com') . '/v1/chat/completions',
                    ['Authorization' => "Bearer {$apiKey}", 'Content-Type' => 'application/json'],
                    ['model' => $model, 'max_tokens' => 10, 'messages' => [['role' => 'user', 'content' => 'ping']]],
                ],
            };

            $response = Http::withHeaders($headers)->timeout(10)->post($url, $body);

            if ($response->successful()) {
                return ApiResponse::success('Koneksi berhasil! AI siap digunakan.');
            }

            $status  = $response->status();
            $errCode = $response->json('error.code') ?? $response->json('error.type') ?? '';
            $errMsg  = $response->json('error.message') ?? 'Unknown error';

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
            return ApiResponse::error('Koneksi gagal: ' . $e->getMessage(), 422);
        }
    }
}
