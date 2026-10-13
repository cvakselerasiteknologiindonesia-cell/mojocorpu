<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Certificate\Models\Certificate;
use Modules\Certificate\Models\CertificateTemplate;
use Modules\TrainingEvent\Models\TrainingEvent;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CertificateOfficialTest extends TestCase
{
    use RefreshDatabase;

    public function test_certificate_builder_loads_active_officials_from_users_database(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo(Permission::findOrCreate('create certificate'));

        User::factory()->create([
            'name' => 'Pejabat Aktif',
            'nip' => '197001011990011001',
            'position_name' => 'Kepala BKPSDM',
            'opd_name' => 'BKPSDM',
            'is_active' => true,
        ]);

        User::factory()->create([
            'name' => 'Pejabat Nonaktif',
            'position_name' => 'Sekretaris BKPSDM',
            'is_active' => false,
        ]);

        User::factory()->create([
            'name' => 'Tanpa Jabatan',
            'position_name' => null,
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/certificate-templates/officials')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Pejabat Aktif')
            ->assertJsonPath('data.0.position_name', 'Kepala BKPSDM')
            ->assertJsonPath('data.0.is_default', true)
            ->assertJsonCount(1, 'data');
    }

    public function test_certificate_detail_contains_learning_materials_for_the_back_page(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo(Permission::findOrCreate('view certificate'));
        $admin->assignRole(Role::findOrCreate('super-admin'));
        $participant = User::factory()->create();

        $template = CertificateTemplate::query()->create([
            'created_by' => $admin->id,
            'name' => 'Template Materi',
            'body_template' => '{{participant_name}}',
            'layout' => [
                'back_canvas_elements' => [[
                    'id' => 'materials-table',
                    'type' => 'table',
                    'label' => 'materials_table',
                    'dataSource' => 'materials',
                ]],
            ],
        ]);

        $event = TrainingEvent::query()->create([
            'title' => 'Pelatihan Digital ASN',
            'start_date' => now(),
            'end_date' => now()->addDay(),
            'status' => 'active',
        ]);

        $event->materials()->create([
            'title' => 'Modul Transformasi Digital',
            'type' => 'document',
            'description' => 'Materi utama pelatihan.',
            'duration_minutes' => 90,
            'order' => 1,
        ]);

        $certificate = Certificate::query()->create([
            'user_id' => $participant->id,
            'training_event_id' => $event->id,
            'certificate_template_id' => $template->id,
            'certificate_number' => 'CERT-MATERIAL-001',
            'issued_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/certificates/{$certificate->uuid}")
            ->assertOk()
            ->assertJsonPath('data.event.materials.0.title', 'Modul Transformasi Digital')
            ->assertJsonPath('data.event.materials.0.type', 'document')
            ->assertJsonPath('data.event.materials.0.description', 'Materi utama pelatihan.')
            ->assertJsonPath('data.event.materials.0.duration_minutes', 90)
            ->assertJsonPath('data.event.materials.0.learning_hours', 2);
    }
}
