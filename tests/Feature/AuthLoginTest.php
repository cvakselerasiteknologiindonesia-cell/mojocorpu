<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_with_email_or_nip(): void
    {
        $user = User::factory()->create([
            'email' => 'asn@mojokertokab.go.id',
            'nip' => '198801012010011001',
            'password' => Hash::make('secret-password'),
            'is_active' => true,
        ]);

        $this->postJson('/api/auth/login', [
            'identifier' => $user->email,
            'password' => 'secret-password',
        ])->assertOk()->assertJsonPath('data.user.email', $user->email)->assertJsonStructure(['data' => ['permissions']]);

        $this->postJson('/api/auth/login', [
            'identifier' => $user->nip,
            'password' => 'secret-password',
        ])->assertOk()->assertJsonPath('data.user.nip', $user->nip);
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        User::factory()->create([
            'email' => 'asn@mojokertokab.go.id',
            'password' => Hash::make('secret-password'),
        ]);

        $this->postJson('/api/auth/login', [
            'identifier' => 'asn@mojokertokab.go.id',
            'password' => 'wrong-password',
        ])->assertUnprocessable()->assertJsonValidationErrors('identifier');
    }

    public function test_seeded_demo_role_accounts_can_login(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $accounts = [
            ['identifier' => 'admin@mojokertokab.go.id', 'role' => 'super-admin'],
            ['identifier' => 'admin.opd@mojokertokab.go.id', 'role' => 'admin-opd'],
            ['identifier' => '198909102020121001', 'role' => 'asn'],
            ['identifier' => '198201012010011001', 'role' => 'fasilitator-internal'],
            ['identifier' => 'external.fasilitator@example.com', 'role' => 'fasilitator-eksternal'],
        ];

        foreach ($accounts as $account) {
            $response = $this->postJson('/api/auth/login', [
                'identifier' => $account['identifier'],
                'password' => 'password',
            ])->assertOk();

            $roles = collect($response->json('data.user.roles'))->pluck('name');
            $this->assertTrue($roles->contains($account['role']));
            $this->assertIsArray($response->json('data.permissions'));
        }
    }

    public function test_sso_login_updates_existing_user_with_same_nip_when_sso_id_changes(): void
    {
        Role::query()->create(['name' => 'asn']);

        $existingUser = User::factory()->create([
            'sso_user_id' => 'SSO-20260001',
            'nip' => '198909102020121001',
            'name' => 'Budi Santoso',
            'email' => 'budi@mojokertokab.go.id',
            'is_active' => true,
        ]);

        Http::fake([
            config('services.sso.base_url').config('services.sso.validate_token_path') => Http::response([
                'data' => [
                    'valid' => true,
                    'user' => [
                        'uuid' => '019e1b6c-4644-70c2-8081-ee7ddf286699',
                        'nip' => '198909102020121001',
                        'name' => 'Budi Santoso',
                        'email' => 'budi@mojokertokab.go.id',
                        'opd_id' => 1,
                        'organization_unit_id' => 1,
                        'employee_status' => 'PNS',
                        'photo_url' => 'https://domain/photos/123.jpg',
                        'user_type' => 'asn',
                        'is_active' => true,
                        'role' => 'asn',
                    ],
                ],
            ]),
        ]);

        $this->postJson('/api/auth/sso-login', [
            'access_token' => 'valid-sso-token',
        ])->assertOk()
            ->assertJsonPath('data.user.id', $existingUser->id)
            ->assertJsonPath('data.user.sso_user_id', '019e1b6c-4644-70c2-8081-ee7ddf286699');

        $this->assertSame(1, User::query()->where('nip', '198909102020121001')->count());
    }
}
