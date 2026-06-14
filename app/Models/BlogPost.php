<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable([
    'uuid', 'author_id', 'blog_category_id', 'title', 'slug', 'category', 'excerpt', 'featured_image', 'tags',
    'seo_title', 'seo_description', 'seo_canonical_url', 'seo_image', 'body', 'status', 'published_at',
])]
class BlogPost extends Model
{
    protected static function booted(): void
    {
        static::creating(function (BlogPost $post): void {
            $post->uuid ??= (string) Str::uuid();
        });
    }

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'published_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function blogCategory(): BelongsTo
    {
        return $this->belongsTo(BlogCategory::class, 'blog_category_id');
    }
}
