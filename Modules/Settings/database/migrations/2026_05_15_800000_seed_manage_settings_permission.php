<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        app()['cache']->forget(config('permission.cache.key'));

        $perm = Permission::firstOrCreate(['name' => 'manage settings', 'guard_name' => 'web']);

        $role = Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
        if (! $role->hasPermissionTo($perm)) {
            $role->givePermissionTo($perm);
        }

        app()['cache']->forget(config('permission.cache.key'));
    }

    public function down(): void
    {
        $perm = Permission::where('name', 'manage settings')->first();
        if ($perm) {
            Role::where('name', 'super-admin')->first()?->revokePermissionTo($perm);
        }
    }
};
