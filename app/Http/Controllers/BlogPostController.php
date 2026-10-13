<?php

namespace App\Http\Controllers;

use App\Models\BlogCategory;
use App\Models\BlogPost;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BlogPostController extends Controller
{
    public function publicIndex(Request $request)
    {
        $posts = BlogPost::query()
            ->with(['author:id,name,opd_name', 'blogCategory:id,uuid,name,slug'])
            ->where('status', 'published')
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = '%'.$request->string('search')->trim()->toString().'%';

                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', $search)
                        ->orWhere('excerpt', 'like', $search)
                        ->orWhere('body', 'like', $search)
                        ->orWhere('category', 'like', $search)
                        ->orWhereHas('blogCategory', fn ($category) => $category->where('name', 'like', $search));
                });
            })
            ->latest('published_at')
            ->latest()
            ->paginate((int) $request->integer('per_page', 3));

        $posts->through(fn (BlogPost $post) => $this->payload($post));

        return ApiResponse::success('Published blog posts retrieved', $posts);
    }

    public function publicShow(string $slug)
    {
        $post = BlogPost::query()
            ->with(['author:id,name,opd_name', 'blogCategory:id,uuid,name,slug'])
            ->where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        return ApiResponse::success('Published blog post retrieved', $this->payload($post));
    }

    public function show(string $slug)
    {
        $post = BlogPost::query()
            ->with(['author:id,name,opd_name', 'blogCategory:id,uuid,name,slug'])
            ->where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        $recentPosts = BlogPost::query()
            ->with('blogCategory:id,name,slug')
            ->where('status', 'published')
            ->whereKeyNot($post->getKey())
            ->latest('published_at')
            ->latest()
            ->limit(3)
            ->get();

        $categories = BlogCategory::query()
            ->whereHas('posts', fn ($query) => $query->where('status', 'published'))
            ->withCount(['posts as published_posts_count' => fn ($query) => $query->where('status', 'published')])
            ->orderBy('name')
            ->get();

        $readingMinutes = max(1, (int) ceil(str_word_count(strip_tags($post->body)) / 220));

        return view('blog-detail', compact('post', 'recentPosts', 'categories', 'readingMinutes'));
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $canManage = $this->canManage($user);
        $status = $request->input('status', 'published');

        $query = BlogPost::query()
            ->with(['author:id,name,opd_name', 'blogCategory:id,uuid,name,slug'])
            ->latest('published_at')
            ->latest();

        if ($status === 'mine') {
            $query->where('author_id', $user->id);
        } elseif ($status === 'all' && $canManage) {
            // Managers can inspect the complete editorial pipeline.
        } elseif (in_array($status, ['draft', 'published'], true) && $canManage) {
            $query->where('status', $status);
        } else {
            $query->where('status', 'published');
        }

        if ($request->filled('search')) {
            $search = '%'.$request->string('search')->trim()->toString().'%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                    ->orWhere('excerpt', 'like', $search)
                    ->orWhere('body', 'like', $search)
                    ->orWhere('category', 'like', $search)
                    ->orWhereHas('blogCategory', fn ($category) => $category->where('name', 'like', $search));
            });
        }

        if ($request->filled('category')) {
            $category = $request->string('category')->trim()->toString();
            $query->where(function ($q) use ($category) {
                $q->where('category', $category)
                    ->orWhereHas('blogCategory', fn ($cat) => $cat->where('slug', $category)->orWhere('name', $category));
            });
        }

        $posts = $query->paginate((int) $request->integer('per_page', 12));

        $posts->through(fn (BlogPost $post) => $this->payload($post, $canManage || $post->author_id === $user->id));

        return ApiResponse::success('Blog posts retrieved', $posts);
    }

    public function store(Request $request)
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $this->validated($request);
        $data = $this->normalizeCategory($data);
        $data['tags'] = $this->normalizeTags($data['tags'] ?? []);
        $data['author_id'] = $request->user()->id;
        $data['slug'] = $this->uniqueSlug($data['slug'] ?: $data['title']);
        $data['excerpt'] = $data['excerpt'] ?: Str::limit(strip_tags($data['body']), 180);
        $data['published_at'] = $data['status'] === 'published' ? now() : null;

        $post = BlogPost::query()->create($data);
        activity('blog')->event('created')->causedBy($request->user())->performedOn($post)->log('Blog post created');

        return ApiResponse::success('Blog post created', $this->payload($post->load(['author:id,name,opd_name', 'blogCategory:id,uuid,name,slug']), true), 201);
    }

    public function media(Request $request)
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:5120'],
        ]);

        $path = $data['image']->store('blog-posts', 'public');

        return ApiResponse::success('Image uploaded', [
            'url' => '/storage/'.ltrim($path, '/'),
            'path' => $path,
        ], 201);
    }

    public function update(Request $request, string $uuid)
    {
        $post = BlogPost::query()->where('uuid', $uuid)->firstOrFail();
        abort_unless($this->canManage($request->user()) || $post->author_id === $request->user()->id, 403);

        $data = $this->validated($request);
        $data = $this->normalizeCategory($data);
        $data['tags'] = $this->normalizeTags($data['tags'] ?? []);
        $data['slug'] = $this->uniqueSlug($data['slug'] ?: $data['title'], $post->id);
        $data['excerpt'] = $data['excerpt'] ?: Str::limit(strip_tags($data['body']), 180);
        if ($post->status !== 'published' && $data['status'] === 'published') {
            $data['published_at'] = now();
        }
        if ($data['status'] === 'draft') {
            $data['published_at'] = null;
        }

        $post->update($data);
        activity('blog')->event('updated')->causedBy($request->user())->performedOn($post)->log('Blog post updated');

        return ApiResponse::success('Blog post updated', $this->payload($post->fresh(['author:id,name,opd_name', 'blogCategory:id,uuid,name,slug']), true));
    }

    public function destroy(Request $request, string $uuid)
    {
        $post = BlogPost::query()->where('uuid', $uuid)->firstOrFail();
        abort_unless($this->canManage($request->user()) || $post->author_id === $request->user()->id, 403);

        $post->delete();
        activity('blog')->event('deleted')->causedBy($request->user())->log("Blog post deleted: {$uuid}");

        return ApiResponse::success('Blog post deleted');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'slug' => ['nullable', 'string', 'max:180'],
            'blog_category_id' => ['nullable', 'integer', 'exists:blog_categories,id'],
            'category' => ['nullable', 'string', 'max:80'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'featured_image' => ['nullable', 'string', 'max:2048'],
            'tags' => ['nullable'],
            'tags.*' => ['nullable', 'string', 'max:50'],
            'seo_title' => ['nullable', 'string', 'max:180'],
            'seo_description' => ['nullable', 'string', 'max:320'],
            'seo_canonical_url' => ['nullable', 'url', 'max:2048'],
            'seo_image' => ['nullable', 'string', 'max:2048'],
            'body' => ['required', 'string', 'min:20'],
            'status' => ['required', 'in:draft,published'],
        ]);
    }

    private function normalizeCategory(array $data): array
    {
        if (! empty($data['blog_category_id'])) {
            $data['category'] = BlogCategory::query()->where('id', $data['blog_category_id'])->value('name');
        }

        return $data;
    }

    private function normalizeTags($tags): array
    {
        if (is_string($tags)) {
            $tags = explode(',', $tags);
        }

        if (! is_array($tags)) {
            return [];
        }

        return collect($tags)
            ->map(fn ($tag) => Str::of((string) $tag)->trim()->lower()->toString())
            ->filter()
            ->unique()
            ->take(12)
            ->values()
            ->all();
    }

    private function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'post';
        $slug = $base;
        $i = 2;

        while (BlogPost::query()
            ->where('slug', $slug)
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    private function payload(BlogPost $post, bool $canEdit = false): array
    {
        $words = str_word_count(strip_tags($post->body));

        return [
            'uuid' => $post->uuid,
            'title' => $post->title,
            'slug' => $post->slug,
            'blog_category_id' => $post->blog_category_id,
            'category' => $post->blogCategory?->name ?? $post->category,
            'category_slug' => $post->blogCategory?->slug,
            'excerpt' => $post->excerpt,
            'featured_image' => $post->featured_image,
            'tags' => $post->tags ?? [],
            'seo_title' => $post->seo_title,
            'seo_description' => $post->seo_description,
            'seo_canonical_url' => $post->seo_canonical_url,
            'seo_image' => $post->seo_image,
            'body' => $post->body,
            'status' => $post->status,
            'published_at' => optional($post->published_at)->toISOString(),
            'created_at' => optional($post->created_at)->toISOString(),
            'updated_at' => optional($post->updated_at)->toISOString(),
            'reading_minutes' => max(1, (int) ceil($words / 220)),
            'author' => [
                'id' => $post->author?->id,
                'name' => $post->author?->name ?? 'CorpU Author',
                'opd_name' => $post->author?->opd_name,
            ],
            'can_edit' => $canEdit,
        ];
    }

    private function canManage($user): bool
    {
        return $user?->hasRole('super-admin')
            || $user?->hasAnyPermission(['create kms asset', 'upload kms assets', 'create learning articles', 'create discussion topics']);
    }
}
