<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_categories', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::table('blog_posts', function (Blueprint $table) {
            $table->foreignId('blog_category_id')->nullable()->after('author_id')->constrained('blog_categories')->nullOnDelete();
        });

        $now = now();
        DB::table('blog_posts')
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->pluck('category')
            ->unique()
            ->values()
            ->each(function (string $name) use ($now) {
                DB::table('blog_categories')->updateOrInsert(
                    ['name' => $name],
                    [
                        'uuid' => (string) Str::uuid(),
                        'slug' => Str::slug($name) ?: Str::uuid()->toString(),
                        'updated_at' => $now,
                        'created_at' => $now,
                    ]
                );
            });

        DB::table('blog_posts')
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->orderBy('id')
            ->get(['id', 'category'])
            ->each(function ($post) {
                $categoryId = DB::table('blog_categories')->where('name', $post->category)->value('id');
                if ($categoryId) {
                    DB::table('blog_posts')->where('id', $post->id)->update(['blog_category_id' => $categoryId]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('blog_category_id');
        });

        Schema::dropIfExists('blog_categories');
    }
};
