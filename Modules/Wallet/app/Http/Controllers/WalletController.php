<?php

namespace Modules\Wallet\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Modules\Notification\Services\NotificationService;
use Modules\Wallet\Models\Wallet;
use Modules\Wallet\Services\WalletService;

class WalletController extends Controller
{
    private const MAX_PER_PAGE = 100;

    public function __construct(private readonly WalletService $service) {}

    /** GET /wallet */
    public function show(Request $request)
    {
        try {
            $wallet = $this->service->getOrCreate($request->user()->id);
            $wallet->load(['transactions' => fn ($q) => $q->limit(10)]);

            return ApiResponse::success('Data retrieved', [
                'balance'      => $wallet->balance,
                'transactions' => $wallet->transactions,
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    /** GET /wallet/transactions */
    public function transactions(Request $request)
    {
        try {
            $perPage = min(self::MAX_PER_PAGE, max(1, (int) $request->integer('per_page', 20)));
            $wallet  = $this->service->getOrCreate($request->user()->id);

            return ApiResponse::success('Data retrieved', $wallet->transactions()->paginate($perPage));
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    /** GET /wallet/all — admin: wallets ranked by balance, OPD-scoped for admin-opd */
    public function all(Request $request)
    {
        try {
            $perPage = min(self::MAX_PER_PAGE, max(1, (int) $request->integer('per_page', 20)));
            $user    = $request->user();

            $query = Wallet::query()->with('user:id,name,nip,opd_id,opd_name')->orderByDesc('balance');

            // Scope admin-opd to their own OPD only.
            if ($user->hasRole('admin-opd') && $user->opd_id) {
                $query->whereHas('user', fn ($q) => $q->where('opd_id', $user->opd_id));
            }

            return ApiResponse::success('Data retrieved', $query->paginate($perPage));
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    /** POST /wallet/top-up — admin manually credits a user */
    public function topUp(Request $request)
    {
        $data = $request->validate([
            'user_id'     => 'required|integer|exists:users,id',
            'amount'      => 'required|integer|min:1|max:'.$this->service->maxSingleCredit(),
            'description' => 'nullable|string|max:255',
        ]);

        // Prevent admins from crediting their own wallet.
        if ((int) $data['user_id'] === $request->user()->id) {
            return ApiResponse::error('Tidak dapat menambahkan token ke akun sendiri.', 403);
        }

        // admin-opd can only top-up users within their own OPD.
        if ($request->user()->hasRole('admin-opd') && $request->user()->opd_id) {
            $targetOpdId = \App\Models\User::where('id', $data['user_id'])->value('opd_id');
            if ($targetOpdId !== $request->user()->opd_id) {
                return ApiResponse::error('Tidak dapat menambahkan token ke pengguna di luar OPD Anda.', 403);
            }
        }

        try {
            $txn = $this->service->credit(
                $data['user_id'],
                $data['amount'],
                $data['description'] ?? 'Top-up by admin',
                'admin_top_up_by',
                $request->user()->id,
            );

            activity('wallet')
                ->event('top-up')
                ->causedBy($request->user())
                ->withProperties([
                    'target_user_id' => $data['user_id'],
                    'amount'         => $data['amount'],
                    'description'    => $data['description'] ?? null,
                ])
                ->log('Admin top-up wallet');

            try {
                app(NotificationService::class)->send(
                    $data['user_id'],
                    'Top-up Token Diterima',
                    "{$data['amount']} token telah ditambahkan ke dompet Anda oleh admin." . ($data['description'] ? " ({$data['description']})" : ''),
                    'wallet_topup',
                    '/wallet',
                );
            } catch (\Throwable) {}

            return ApiResponse::success('Token berhasil ditambahkan.', $txn, 201);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);

            return ApiResponse::error();
        }
    }

    /** GET /wallet/token-info */
    public function tokenInfo()
    {
        try {
            return ApiResponse::success('Token info', [
                'enabled'           => $this->service->isEnabled(),
                'auto_credit'       => $this->service->isAutoCredit(),
                'max_balance'       => $this->service->maxBalance(),
                'max_single_credit' => $this->service->maxSingleCredit(),
                'score_tiers'       => $this->service->scoreTiers(),
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }
}
