<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\KMS\Database\Seeders\KMSDatabaseSeeder;
use Modules\Settings\Database\Seeders\SettingsDatabaseSeeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            SettingsDatabaseSeeder::class,
            KMSDatabaseSeeder::class,
            AsnUsersSeeder::class,
            PejabatSeeder::class,
            DemoEndToEndSeeder::class,
            BlogPostSeeder::class,
            LearningPathSeeder::class,
            DemoEndToEndSeeder::class,
        ]);
    }
}
