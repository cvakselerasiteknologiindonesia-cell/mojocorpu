<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        app()['cache']->forget(config('permission.cache.key'));

        $permission = Permission::firstOrCreate([
            'name' => 'manage settings',
            'guard_name' => 'web',
        ]);

        $role = Role::firstOrCreate([
            'name' => 'super-admin',
            'guard_name' => 'web',
        ]);

        $role->givePermissionTo($permission);

        app()['cache']->forget(config('permission.cache.key'));
    }

    public function down(): void
    {
        $permission = Permission::where('name', 'manage settings')->first();
        $role = Role::where('name', 'super-admin')->first();

        if ($permission && $role) {
            $role->revokePermissionTo($permission);
        }

        app()['cache']->forget(config('permission.cache.key'));
    }
};
