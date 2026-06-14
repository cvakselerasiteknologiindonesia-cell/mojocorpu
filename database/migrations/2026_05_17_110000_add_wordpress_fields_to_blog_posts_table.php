<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            if (! Schema::hasColumn('blog_posts', 'featured_image')) {
                $table->string('featured_image')->nullable()->after('excerpt');
            }
            if (! Schema::hasColumn('blog_posts', 'tags')) {
                $table->json('tags')->nullable()->after('featured_image');
            }
            if (! Schema::hasColumn('blog_posts', 'seo_title')) {
                $table->string('seo_title', 180)->nullable()->after('tags');
            }
            if (! Schema::hasColumn('blog_posts', 'seo_description')) {
                $table->string('seo_description', 320)->nullable()->after('seo_title');
            }
            if (! Schema::hasColumn('blog_posts', 'seo_canonical_url')) {
                $table->string('seo_canonical_url')->nullable()->after('seo_description');
            }
            if (! Schema::hasColumn('blog_posts', 'seo_image')) {
                $table->string('seo_image')->nullable()->after('seo_canonical_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            foreach (['featured_image', 'tags', 'seo_title', 'seo_description', 'seo_canonical_url', 'seo_image'] as $column) {
                if (Schema::hasColumn('blog_posts', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
