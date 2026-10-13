<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Modules\Facilitator\Models\Facilitator;
use Modules\KMS\Database\Seeders\KMSDatabaseSeeder;
use Modules\OPD\Models\OPD;
use Modules\Settings\Database\Seeders\SettingsDatabaseSeeder;
use Modules\TrainingEvent\Models\TrainingEvent;
use Modules\TrainingProposal\Models\TrainingProposal;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(AsnUsersSeeder::class);
        $this->call(KMSDatabaseSeeder::class);
        $this->call(SettingsDatabaseSeeder::class);
        $this->call(RolePermissionSeeder::class);

        $opd = OPD::query()->updateOrCreate(
            ['code' => '08'],
            [
                'name' => 'BADAN KEPEGAWAIAN DAN PENGEMBANGAN SUMBER DAYA MANUSIA',
                'address' => 'JL. A. YANI NO. 16 MOJOKERTO',
                'is_active' => true,
            ]
        );

        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@mojokertokab.go.id'],
            [
                'name' => 'Super Admin Corporate University',
                'password' => Hash::make('password'),
                'user_type' => 'super_admin',
                'is_active' => true,
            ]
        );
        $admin->syncRoles(['super-admin']);

        $internalFacilitator = User::query()->updateOrCreate(
            ['nip' => '198201012010011001'],
            [
                'sso_user_id' => 'SSO-FASIL-INTERNAL-001',
                'name' => 'Siti Aminah',
                'email' => 'siti.fasilitator@mojokertokab.go.id',
                'password' => Hash::make('password'),
                'opd_id' => $opd->id,
                'opd_name' => $opd->name,
                'organization_unit_name' => 'BIDANG PENGEMBANGAN KOMPETENSI ASN',
                'position_name' => 'Analis Sumber Daya Manusia Aparatur',
                'employee_status' => 'PNS',
                'user_type' => 'asn',
                'is_active' => true,
            ]
        );
        $internalFacilitator->syncRoles(['fasilitator-internal']);
        $internalFacilitatorProfile = Facilitator::query()->updateOrCreate(
            ['user_id' => $internalFacilitator->id],
            [
                'facilitator_type' => 'internal',
                'institution' => 'BKPSDM Kabupaten Mojokerto',
                'expertise' => 'Leadership, LMS, Competency Development',
                'bio' => 'Fasilitator internal untuk kelas pengembangan kompetensi ASN.',
                'status' => 'active',
            ]
        );

        $externalFacilitator = User::query()->updateOrCreate(
            ['email' => 'external.fasilitator@example.com'],
            [
                'name' => 'External Facilitator',
                'password' => Hash::make('password'),
                'user_type' => 'external',
                'is_active' => true,
            ]
        );
        $externalFacilitator->syncRoles(['fasilitator-eksternal']);
        $externalFacilitatorProfile = Facilitator::query()->updateOrCreate(
            ['user_id' => $externalFacilitator->id],
            [
                'facilitator_type' => 'external',
                'institution' => 'Mitra Profesional',
                'expertise' => 'Public Speaking, Digital Collaboration',
                'bio' => 'Fasilitator eksternal untuk kelas profesional tematik.',
                'status' => 'active',
            ]
        );

        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@mojokertokab.go.id'],
            [
                'name' => 'Super Admin Corporate University',
                'password' => Hash::make('password'),
                'user_type' => 'super_admin',
                'is_active' => true,
            ]
        );
        $admin->assignRole('super-admin');

        $adminOpd = User::query()->updateOrCreate(
            ['email' => 'admin.opd@mojokertokab.go.id'],
            [
                'sso_user_id' => 'SSO-ADMIN-OPD-001',
                'nip' => '197701012001121001',
                'name' => 'Admin OPD BKPSDM',
                'password' => Hash::make('password'),
                'opd_name' => 'BKPSDM Kabupaten Mojokerto',
                'organization_unit_name' => 'Competency Development Division',
                'position_name' => 'Human Resource Analyst',
                'employee_status' => 'PNS',
                'user_type' => 'asn',
                'is_active' => true,
            ]
        );
        $adminOpd->assignRole('admin-opd');

        $asn = User::query()->updateOrCreate(
            ['nip' => '198909102020121001'],
            [
                'sso_user_id' => 'SSO-20260001',
                'name' => 'Budi Santoso',
                'email' => 'budi@mojokertokab.go.id',
                'password' => Hash::make('password'),
                'opd_name' => 'BKPSDM Kabupaten Mojokerto',
                'organization_unit_name' => 'Competency Development Division',
                'position_name' => 'Human Resource Analyst',
                'employee_status' => 'PNS',
                'photo_url' => 'https://domain/photos/123.jpg',
                'user_type' => 'asn',
                'is_active' => true,
            ]
        );
        $asn->assignRole('asn');

        $internalFacilitator = User::query()->updateOrCreate(
            ['nip' => '198201012010011001'],
            [
                'sso_user_id' => 'SSO-FASIL-INTERNAL-001',
                'name' => 'Siti Aminah',
                'email' => 'siti.fasilitator@mojokertokab.go.id',
                'password' => Hash::make('password'),
                'opd_name' => 'BKPSDM Kabupaten Mojokerto',
                'organization_unit_name' => 'Competency Development Division',
                'position_name' => 'Human Resource Analyst',
                'employee_status' => 'PNS',
                'user_type' => 'asn',
                'is_active' => true,
            ]
        );
        $internalFacilitator->assignRole('fasilitator-internal');
        $internalFacilitatorProfile = Facilitator::query()->updateOrCreate(
            ['user_id' => $internalFacilitator->id],
            [
                'facilitator_type' => 'internal',
                'institution' => 'BKPSDM Kabupaten Mojokerto',
                'expertise' => 'Leadership, LMS, Competency Development',
                'bio' => 'Fasilitator internal untuk kelas pengembangan kompetensi ASN.',
                'status' => 'active',
            ]
        );

        $externalFacilitator = User::query()->updateOrCreate(
            ['email' => 'external.fasilitator@example.com'],
            [
                'name' => 'External Facilitator',
                'password' => Hash::make('password'),
                'user_type' => 'external',
                'is_active' => true,
            ]
        );
        $externalFacilitator->assignRole('fasilitator-eksternal');
        $externalFacilitatorProfile = Facilitator::query()->updateOrCreate(
            ['user_id' => $externalFacilitator->id],
            [
                'facilitator_type' => 'external',
                'institution' => 'Mitra Profesional',
                'expertise' => 'Public Speaking, Digital Collaboration',
                'bio' => 'Fasilitator eksternal untuk kelas profesional tematik.',
                'status' => 'active',
            ]
        );

        $this->call(PejabatSeeder::class);

        $proposal = TrainingProposal::query()->updateOrCreate(
            ['title' => 'Program Penguatan Kompetensi ASN Digital'],
            [
                'opd_id' => $opd->id,
                'description' => 'Program demo untuk kelas fasilitator pada LMS Corporate University.',
                'recommendation' => 'Disetujui untuk pelaksanaan pembelajaran blended.',
                'proposed_by' => $admin->id,
                'status' => 'approved',
            ]
        );

        TrainingEvent::query()->updateOrCreate(
            ['title' => 'Kelas Internal: Desain Pembelajaran ASN Digital'],
            [
                'training_proposal_id' => $proposal->id,
                'description' => 'Kelas fasilitator internal untuk merancang modul, assessment, dan evaluasi peserta.',
                'facilitator_id' => $internalFacilitatorProfile->id,
                'start_date' => now()->addDays(3)->setTime(9, 0),
                'end_date' => now()->addDays(5)->setTime(15, 0),
                'quota' => 32,
                'status' => 'active',
            ]
        );

        TrainingEvent::query()->updateOrCreate(
            ['title' => 'Kelas Internal: Evaluasi Kompetensi dan Umpan Balik'],
            [
                'training_proposal_id' => $proposal->id,
                'description' => 'Kelas lanjutan untuk penilaian, feedback, dan rekomendasi kelulusan peserta.',
                'facilitator_id' => $internalFacilitatorProfile->id,
                'start_date' => now()->addDays(10)->setTime(8, 30),
                'end_date' => now()->addDays(11)->setTime(14, 30),
                'quota' => 28,
                'status' => 'scheduled',
            ]
        );

        TrainingEvent::query()->updateOrCreate(
            ['title' => 'Kelas Eksternal: Komunikasi Publik Digital'],
            [
                'training_proposal_id' => $proposal->id,
                'description' => 'Kelas fasilitator eksternal untuk praktik komunikasi publik dan kolaborasi digital.',
                'facilitator_id' => $externalFacilitatorProfile->id,
                'start_date' => now()->addDays(7)->setTime(10, 0),
                'end_date' => now()->addDays(8)->setTime(16, 0),
                'quota' => 24,
                'status' => 'active',
            ]
        );

        $this->call(BlogPostSeeder::class);
        $this->call(LearningPathSeeder::class);
    }
}
