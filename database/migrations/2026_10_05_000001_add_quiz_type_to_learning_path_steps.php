<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE learning_path_steps MODIFY type ENUM('module', 'training_event', 'material', 'quiz') DEFAULT 'module'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("UPDATE learning_path_steps SET type = 'module' WHERE type = 'quiz'");
            DB::statement("ALTER TABLE learning_path_steps MODIFY type ENUM('module', 'training_event', 'material') DEFAULT 'module'");
        }
    }
};
