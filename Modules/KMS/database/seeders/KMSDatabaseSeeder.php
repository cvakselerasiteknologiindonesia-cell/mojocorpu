<?php

namespace Modules\KMS\Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class KMSDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Manajemen SDM',           'slug' => 'manajemen-sdm'],
            ['name' => 'Tata Kelola Pemerintahan', 'slug' => 'tata-kelola-pemerintahan'],
            ['name' => 'Kompetensi Teknis',        'slug' => 'kompetensi-teknis'],
            ['name' => 'Kepemimpinan',             'slug' => 'kepemimpinan'],
            ['name' => 'Inovasi & Transformasi',   'slug' => 'inovasi-transformasi'],
            ['name' => 'Hukum & Regulasi',         'slug' => 'hukum-regulasi'],
            ['name' => 'Keuangan & Anggaran',      'slug' => 'keuangan-anggaran'],
            ['name' => 'Pelayanan Publik',         'slug' => 'pelayanan-publik'],
            ['name' => 'Teknologi Informasi',      'slug' => 'teknologi-informasi'],
            ['name' => 'Lainnya',                  'slug' => 'lainnya'],
        ];

        foreach ($categories as $cat) {
            DB::table('kms_categories')->updateOrInsert(
                ['slug' => $cat['slug']],
                ['uuid' => (string) Str::uuid(), 'name' => $cat['name'], 'slug' => $cat['slug'],
                 'created_at' => now(), 'updated_at' => now()],
            );
        }
    }
}
