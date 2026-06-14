<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Modules\Facilitator\Models\Facilitator;
use Modules\TrainingEvent\Models\TrainingEvent;
use Modules\TrainingProposal\Models\TrainingProposal;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(AsnUsersSeeder::class);
        $this->call(\Modules\KMS\Database\Seeders\KMSDatabaseSeeder::class);

        $permissions = [
            'view dashboard',
            'view user', 'create user', 'update user', 'delete user',
            'view opd', 'create opd',
            'view facilitator', 'create facilitator',
            'view training proposal', 'create training proposal', 'approve training proposal',
            'view training event', 'create training event', 'update training event', 'delete training event', 'approve training event',
            'view lms', 'create lms material',
            'view kms asset', 'create kms asset',
            'view quiz', 'create quiz',
            'view certificate', 'create certificate',
            'view discussion forum', 'create discussion forum',
            'view attendance', 'create attendance',
            'view notification',
            'view audit log',
            'view report',
            'manage settings',
            'view facilitator dashboard',
            'see assigned classes',
            'see participant statistics',
            'see training schedules',
            'see learning analytics',
            'view own training events',
            'view assigned training events',
            'create learning sessions',
            'update own learning sessions',
            'manage own class sessions',
            'manage own class modules',
            'manage learning schedules',
            'manage own teaching materials',
            'upload learning materials',
            'upload pdf modules',
            'upload videos',
            'upload ppt files',
            'upload presentations',
            'create learning articles',
            'create assignments',
            'manage downloadable resources',
            'create pre-test',
            'create post-test',
            'manage question banks',
            'set passing grade',
            'grade assignments',
            'review participant answers',
            'review assignments',
            'input participant grades',
            'export participant scores',
            'create quiz',
            'manage assessments',
            'evaluate participants',
            'view participant list',
            'view assigned class participants',
            'monitor participant progress',
            'monitor attendance',
            'monitor participant attendance',
            'provide participant feedback',
            'create discussion topics',
            'reply to discussions',
            'create announcements',
            'create assigned class announcements',
            'communicate with participants',
            'recommend participant graduation',
            'approve training completion',
            'export attendance reports',
            'export participant grades',
            'export class reports',
            'export reports',
            'upload kms assets',
            'share best practices',
            'contribute institutional knowledge',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        foreach (['super-admin', 'admin-opd', 'asn', 'fasilitator-internal', 'fasilitator-eksternal'] as $roleName) {
            Role::findOrCreate($roleName, 'web');
        }

        Role::findByName('super-admin')->syncPermissions($permissions);
        Role::findByName('admin-opd')->syncPermissions([
            'view dashboard', 'view user', 'view opd', 'view facilitator',
            'view training proposal', 'create training proposal',
            'view training event', 'create training event', 'update training event', 'delete training event',
            'view kms asset', 'create kms asset', 'view report',
        ]);
        Role::findByName('asn')->syncPermissions([
            'view dashboard', 'view training event', 'view lms',
            'view kms asset', 'view certificate', 'view discussion forum',
            'create discussion forum', 'view attendance',
        ]);
        Role::findByName('fasilitator-internal')->syncPermissions([
            'view dashboard', 'view training event', 'create training event', 'update training event', 'delete training event', 'view lms',
            'create lms material', 'view quiz', 'create quiz',
            'view certificate', 'create certificate',
            'view discussion forum', 'view attendance',
            'view facilitator dashboard',
            'see assigned classes',
            'see participant statistics',
            'see training schedules',
            'see learning analytics',
            'view own training events',
            'create learning sessions',
            'update own learning sessions',
            'upload learning materials',
            'manage own class modules',
            'manage learning schedules',
            'upload pdf modules',
            'upload videos',
            'upload ppt files',
            'create learning articles',
            'create assignments',
            'manage downloadable resources',
            'create pre-test',
            'create post-test',
            'manage question banks',
            'set passing grade',
            'grade assignments',
            'review participant answers',
            'export participant scores',
            'manage assessments',
            'evaluate participants',
            'view participant list',
            'monitor participant progress',
            'monitor attendance',
            'provide participant feedback',
            'create discussion topics',
            'reply to discussions',
            'create announcements',
            'communicate with participants',
            'recommend participant graduation',
            'approve training completion',
            'export attendance reports',
            'export participant grades',
            'export class reports',
            'export reports',
            'upload kms assets',
            'share best practices',
            'contribute institutional knowledge',
        ]);
        Role::findByName('fasilitator-eksternal')->syncPermissions([
            'view dashboard', 'view training event', 'create training event', 'update training event', 'delete training event', 'view lms',
            'view quiz', 'view certificate', 'create certificate', 'view discussion forum', 'view attendance',
            'view facilitator dashboard',
            'see assigned classes',
            'see training schedules',
            'view assigned training events',
            'upload learning materials',
            'manage own class sessions',
            'manage own teaching materials',
            'upload pdf modules',
            'upload videos',
            'upload presentations',
            'create assignments',
            'create quiz',
            'evaluate participants',
            'input participant grades',
            'review assignments',
            'view assigned class participants',
            'monitor participant attendance',
            'provide participant feedback',
            'reply to discussions',
            'create assigned class announcements',
            'export participant scores',
            'export attendance reports',
            'export reports',
        ]);

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

        $proposal = TrainingProposal::query()->updateOrCreate(
            ['title' => 'Program Penguatan Kompetensi ASN Digital'],
            [
                'opd_id' => 1,
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
