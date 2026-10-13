<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class KmsAssetRoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_opd_can_create_kms_asset(): void
    {
        $user = User::factory()->create();
        $user->assignRole(Role::findOrCreate('admin-opd'));

        Sanctum::actingAs($user);

        $this->postJson('/api/kms-assets', [
            'title' => 'Panduan Pelayanan Publik',
            'description' => 'Praktik baik dari OPD.',
            'file_path' => 'https://example.test/panduan.pdf',
            'visibility' => 'internal',
        ])->assertCreated();

        $this->assertDatabaseHas('kms_assets', [
            'title' => 'Panduan Pelayanan Publik',
            'uploaded_by' => $user->id,
        ]);
    }

    public function test_non_opd_role_cannot_create_kms_asset_despite_upload_permission(): void
    {
        $user = User::factory()->create();
        $user->assignRole(Role::findOrCreate('fasilitator-internal'));
        $user->givePermissionTo(Permission::findOrCreate('upload kms assets'));

        Sanctum::actingAs($user);

        $this->postJson('/api/kms-assets', [
            'title' => 'Aset Fasilitator',
            'file_path' => 'https://example.test/aset.pdf',
        ])->assertForbidden();

        $this->assertDatabaseMissing('kms_assets', [
            'title' => 'Aset Fasilitator',
        ]);
    }
}
