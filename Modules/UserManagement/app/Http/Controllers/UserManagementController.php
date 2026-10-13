<?php

namespace Modules\UserManagement\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Modules\UserManagement\Http\Requests\StoreUserRequest;
use Spatie\Permission\Models\Role;

class UserManagementController extends Controller
{
    public function stats(Request $request)
    {
        $base = User::query()
            ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id');

        if ($request->user()->hasRole('admin-opd')) {
            $base->where('users.opd_id', $request->user()->opd_id);
        }

        $opds = User::query()
            ->when($request->user()->hasRole('admin-opd'), fn ($q) => $q->where('opd_id', $request->user()->opd_id))
            ->whereNotNull('opd_name')
            ->where('opd_name', '!=', '')
            ->distinct()
            ->orderBy('opd_name')
            ->pluck('opd_name')
            ->values();

        $hasNoOpd = User::query()
            ->when($request->user()->hasRole('admin-opd'), fn ($q) => $q->where('opd_id', $request->user()->opd_id))
            ->where(fn ($q) => $q->whereNull('opd_name')->orWhere('opd_name', ''))
            ->exists();

        if ($hasNoOpd) {
            $opds->push('Tanpa OPD');
        }

        $counts = $base->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN roles.name = 'asn' THEN 1 ELSE 0 END) as asn,
                SUM(CASE WHEN roles.name IN ('fasilitator-internal','fasilitator-eksternal') THEN 1 ELSE 0 END) as facilitator,
                SUM(CASE WHEN roles.name = 'admin-opd' THEN 1 ELSE 0 END) as admin_opd,
                SUM(CASE WHEN roles.name = 'super-admin' THEN 1 ELSE 0 END) as super_admin,
                SUM(CASE WHEN users.is_active = 1 THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN users.is_active = 0 THEN 1 ELSE 0 END) as inactive,
                SUM(CASE WHEN users.last_login_at IS NULL THEN 1 ELSE 0 END) as never_logged_in
            ")
            ->first();

        return ApiResponse::success('Stats retrieved', [
            'total' => (int) $counts->total,
            'asn' => (int) $counts->asn,
            'facilitator' => (int) $counts->facilitator,
            'admin_opd' => (int) $counts->admin_opd,
            'super_admin' => (int) $counts->super_admin,
            'active' => (int) $counts->active,
            'inactive' => (int) $counts->inactive,
            'never_logged_in' => (int) $counts->never_logged_in,
            'opds' => $opds,
        ]);
    }

    public function index(Request $request)
    {
        try {
            $query = User::query()->with('roles:id,name')->orderBy('name');

            if ($request->user()->hasRole('admin-opd')) {
                $query->where('opd_id', $request->user()->opd_id);
            }

            if ($search = $request->input('search')) {
                $query->where(function ($q) use ($search) {
                    // Prefix-match on NIP (exact prefix is common for NIP lookup)
                    // and prefix-match on name. Leading wildcard '%search%' prevents
                    // index use; '{search}%' allows B-tree index prefix scans.
                    $q->where('name', 'like', "{$search}%")
                        ->orWhere('nip', 'like', "{$search}%")
                        ->orWhere('email', 'like', "{$search}%")
                        ->orWhere('opd_name', 'like', "{$search}%");
                });
            }

            if ($roleFilter = $request->input('role')) {
                $query->whereHas('roles', fn ($q) => $q->whereIn('name', (array) $roleFilter));
            }

            if ($statusFilter = $request->input('status')) {
                if ($statusFilter === 'active') {
                    $query->where('is_active', true);
                } elseif ($statusFilter === 'inactive') {
                    $query->where('is_active', false);
                }
            }

            if ($loginFilter = $request->input('login')) {
                if ($loginFilter === 'ever') {
                    $query->whereNotNull('last_login_at');
                } elseif ($loginFilter === 'never') {
                    $query->whereNull('last_login_at');
                }
            }

            if ($opdFilter = $request->input('opd')) {
                $opdFilter === '__none'
                    ? $query->where(fn ($q) => $q->whereNull('opd_name')->orWhere('opd_name', ''))
                    : $query->where('opd_name', $opdFilter);
            }

            $perPage = min(max((int) $request->integer('per_page', 25), 10), 100);
            $users = $query->paginate($perPage);

            $users->through(fn ($user) => [
                'id' => $user->id,
                'uuid' => $user->uuid,
                'name' => $user->name,
                'email' => $user->email,
                'nip' => $user->nip,
                'opd_name' => $user->opd_name,
                'organization_unit_name' => $user->organization_unit_name,
                'position_name' => $user->position_name,
                'user_type' => $user->user_type,
                'is_active' => (bool) $user->is_active,
                'last_login_at' => $user->last_login_at,
                'roles' => $user->roles->pluck('name')->values(),
            ]);

            return ApiResponse::success('Data retrieved', $users);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

            return ApiResponse::error();
        }
    }

    public function store(StoreUserRequest $request)
    {
        try {
            $user = DB::transaction(function () use ($request): User {
                $data = Arr::except($request->validated(), ['roles']);
                $roles = $request->input('roles', ['asn']);

                if (in_array('super-admin', $roles, true) && ! $request->user()->hasRole('super-admin')) {
                    abort(403, 'Role super-admin hanya dapat ditetapkan oleh super-admin.');
                }

                $user = User::query()->create($data);
                $user->syncRoles($roles);
                activity('user')->event('created')->causedBy($request->user())->performedOn($user)->log('User created');

                return $user->load('roles:id,name');
            });

            return ApiResponse::success('Created successfully', $user, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

            return ApiResponse::error();
        }
    }

    public function assignRole(Request $request, int $userId)
    {
        $data = $request->validate([
            'role' => ['required', 'string', 'exists:roles,name'],
        ]);

        if ($request->user()->id === $userId) {
            return ApiResponse::error('Anda tidak dapat mengubah role akun yang sedang digunakan.', 422);
        }

        if ($data['role'] === 'super-admin' && ! $request->user()->hasRole('super-admin')) {
            return ApiResponse::error('Role super-admin hanya dapat ditetapkan oleh super-admin.', 403);
        }

        try {
            $user = User::findOrFail($userId);

            if ($user->hasRole('super-admin') && ! $request->user()->hasRole('super-admin')) {
                return ApiResponse::error('Pengguna super-admin hanya dapat diubah oleh super-admin.', 403);
            }

            if ($user->hasRole('super-admin') && $data['role'] !== 'super-admin') {
                $superAdminCount = User::role('super-admin')->whereKeyNot($user->getKey())->count();

                if ($superAdminCount < 1) {
                    return ApiResponse::error('Minimal harus ada satu super-admin aktif di sistem.', 422);
                }
            }

            DB::transaction(function () use ($user, $data, $request) {
                $user->syncRoles([$data['role']]);
                activity('user')->event('role_assigned')->causedBy($request->user())->performedOn($user)
                    ->log("Role changed to {$data['role']}");
            });

            return ApiResponse::success('Role berhasil diperbarui.', [
                'id' => $user->id,
                'roles' => $user->fresh('roles')->roles->pluck('name')->values(),
            ]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

            return ApiResponse::error($e->getMessage());
        }
    }

    public function roles(Request $request)
    {
        $roles = Role::query()
            ->when(! $request->user()->hasRole('super-admin'), fn ($query) => $query->whereNotIn('name', ['super-admin']))
            ->orderBy('name')
            ->pluck('name');

        return ApiResponse::success('Roles retrieved', $roles);
    }
}
