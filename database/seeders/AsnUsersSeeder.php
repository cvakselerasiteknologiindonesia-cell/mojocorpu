<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class AsnUsersSeeder extends Seeder
{
    public function run(): void
    {
        Role::findOrCreate('asn', 'web');

        $users = [
            [
                'sso_user_id'             => 'SSO-ASN-0001',
                'nip'                     => '197803152006041001',
                'name'                    => 'Ahmad Fauzi',
                'email'                   => 'ahmad.fauzi@mojokertokab.go.id',
                'opd_name'                => 'Dinas Pendidikan Kabupaten Mojokerto',
                'organization_unit_name'  => 'Bidang Pendidikan Dasar',
                'position_name'           => 'Analis Kebijakan Pendidikan',
                'employee_status'         => 'PNS',
            ],
            [
                'sso_user_id'             => 'SSO-ASN-0002',
                'nip'                     => '198504222010012002',
                'name'                    => 'Sari Dewi Lestari',
                'email'                   => 'sari.dewi@mojokertokab.go.id',
                'opd_name'                => 'Dinas Kesehatan Kabupaten Mojokerto',
                'organization_unit_name'  => 'Bidang Pelayanan Kesehatan',
                'position_name'           => 'Pranata Kesehatan Masyarakat',
                'employee_status'         => 'PNS',
            ],
            [
                'sso_user_id'             => 'SSO-ASN-0003',
                'nip'                     => '199001082015031003',
                'name'                    => 'Rizky Pratama',
                'email'                   => 'rizky.pratama@mojokertokab.go.id',
                'opd_name'                => 'Dinas Pekerjaan Umum Kabupaten Mojokerto',
                'organization_unit_name'  => 'Bidang Bina Marga',
                'position_name'           => 'Teknik Jalan dan Jembatan',
                'employee_status'         => 'PNS',
            ],
            [
                'sso_user_id'             => 'SSO-ASN-0004',
                'nip'                     => '198712302012122004',
                'name'                    => 'Nur Aini Rahmawati',
                'email'                   => 'nur.aini@mojokertokab.go.id',
                'opd_name'                => 'BKPSDM Kabupaten Mojokerto',
                'organization_unit_name'  => 'Bidang Pengembangan Kompetensi',
                'position_name'           => 'Analis Sumber Daya Manusia',
                'employee_status'         => 'PNS',
            ],
            [
                'sso_user_id'             => 'SSO-ASN-0005',
                'nip'                     => '199205142018011005',
                'name'                    => 'Dimas Eko Saputro',
                'email'                   => 'dimas.eko@mojokertokab.go.id',
                'opd_name'                => 'Dinas Kependudukan dan Pencatatan Sipil Kab. Mojokerto',
                'organization_unit_name'  => 'Bidang Pelayanan Pendaftaran Penduduk',
                'position_name'           => 'Pengelola Data Kependudukan',
                'employee_status'         => 'PPPK',
            ],
            [
                'sso_user_id'             => 'SSO-ASN-0006',
                'nip'                     => '198306182009032006',
                'name'                    => 'Fitria Handayani',
                'email'                   => 'fitria.handayani@mojokertokab.go.id',
                'opd_name'                => 'Dinas Sosial Kabupaten Mojokerto',
                'organization_unit_name'  => 'Bidang Rehabilitasi Sosial',
                'position_name'           => 'Pekerja Sosial Pertama',
                'employee_status'         => 'PNS',
            ],
            [
                'sso_user_id'             => 'SSO-ASN-0007',
                'nip'                     => '197912052003121007',
                'name'                    => 'Hendra Gunawan',
                'email'                   => 'hendra.gunawan@mojokertokab.go.id',
                'opd_name'                => 'Badan Perencanaan Pembangunan Daerah Kab. Mojokerto',
                'organization_unit_name'  => 'Bidang Perencanaan Ekonomi',
                'position_name'           => 'Perencana Muda',
                'employee_status'         => 'PNS',
            ],
            [
                'sso_user_id'             => 'SSO-ASN-0008',
                'nip'                     => '199308252020122008',
                'name'                    => 'Indah Permatasari',
                'email'                   => 'indah.permata@mojokertokab.go.id',
                'opd_name'                => 'Dinas Komunikasi dan Informatika Kabupaten Mojokerto',
                'organization_unit_name'  => 'Bidang Pengelolaan Informasi',
                'position_name'           => 'Pranata Komputer Pertama',
                'employee_status'         => 'PPPK',
            ],
            [
                'sso_user_id'             => 'SSO-ASN-0009',
                'nip'                     => '198110142007011009',
                'name'                    => 'Joko Susilo',
                'email'                   => 'joko.susilo@mojokertokab.go.id',
                'opd_name'                => 'Dinas Pertanian Kabupaten Mojokerto',
                'organization_unit_name'  => 'Bidang Tanaman Pangan',
                'position_name'           => 'Penyuluh Pertanian Muda',
                'employee_status'         => 'PNS',
            ],
            [
                'sso_user_id'             => 'SSO-ASN-0010',
                'nip'                     => '199407172022012010',
                'name'                    => 'Kartika Wulandari',
                'email'                   => 'kartika.wulan@mojokertokab.go.id',
                'opd_name'                => 'Dinas Pemberdayaan Perempuan dan PA Kab. Mojokerto',
                'organization_unit_name'  => 'Bidang Pemberdayaan Perempuan',
                'position_name'           => 'Analis Kebijakan Pemberdayaan Perempuan',
                'employee_status'         => 'PNS',
            ],
        ];

        foreach ($users as $data) {
            $user = User::query()->updateOrCreate(
                ['nip' => $data['nip']],
                array_merge($data, [
                    'password'  => Hash::make('password'),
                    'user_type' => 'asn',
                    'is_active' => true,
                ])
            );
            $user->assignRole('asn');
        }
    }
}
