<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificate_templates', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('paper_size', 24)->default('a4');
            $table->string('orientation', 24)->default('landscape');
            $table->string('background_color', 24)->default('#ffffff');
            $table->string('accent_color', 24)->default('#8a05ff');
            $table->string('text_color', 24)->default('#0d0d0d');
            $table->string('font_family', 80)->default('Inter');
            $table->string('logo_path')->nullable();
            $table->string('signature_name')->nullable();
            $table->string('signature_title')->nullable();
            $table->text('body_template');
            $table->string('footer_text')->nullable();
            $table->json('layout')->nullable();
            $table->boolean('is_default')->default(false)->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        $permission = Permission::findOrCreate('create certificate', 'web');

        foreach (['super-admin', 'fasilitator-internal', 'fasilitator-eksternal'] as $roleName) {
            $role = Role::findOrCreate($roleName, 'web');
            $role->givePermissionTo($permission);
            $role->givePermissionTo(Permission::findOrCreate('view certificate', 'web'));
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('certificate_templates');
    }
};
