<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Modules\Certificate\Models\CertificateTemplate;
use Spatie\Permission\Models\Role;

class PejabatSeeder extends Seeder
{
    public function run(): void
    {
        Role::findOrCreate('asn', 'web');

        $official = User::query()->updateOrCreate(
            ['nip' => '197201011995031001'],
            [
                'sso_user_id' => 'SSO-PEJABAT-BKPSDM-001',
                'name' => 'Dr. Budi Setiawan, S.STP., M.Si.',
                'email' => 'kepala.bkpsdm@mojokertokab.go.id',
                'password' => Hash::make('password'),
                'opd_name' => 'BKPSDM Kabupaten Mojokerto',
                'organization_unit_name' => 'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia',
                'position_name' => 'Kepala BKPSDM',
                'employee_status' => 'PNS',
                'user_type' => 'asn',
                'is_active' => true,
            ]
        );

        $official->syncRoles(['asn']);

        CertificateTemplate::query()
            ->whereNull('signature_name')
            ->update([
                'signature_name' => $official->name,
                'signature_title' => $official->position_name,
            ]);
    }
}
