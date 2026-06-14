<?php

namespace App\Http\Controllers;

use App\Models\BlogCategory;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class BlogCategoryController extends Controller
{
    public function index(Request $request)
    {
        $categories = BlogCategory::query()
            ->withCount('posts')
            ->orderBy('name')
            ->get()
            ->map(fn (BlogCategory $category) => $this->payload($category, $this->canManage($request->user())));

        return ApiResponse::success('Blog categories retrieved', $categories);
    }

    public function store(Request $request)
    {
        abort_unless($this->canManage($request->user()), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', 'unique:blog_categories,name'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $category = BlogCategory::query()->create($data);
        activity('blog-categories')->event('created')->causedBy($request->user())->performedOn($category)->log('Blog category created');

        return ApiResponse::success('Blog category created', $this->payload($category->loadCount('posts'), true), 201);
    }

    public function update(Request $request, string $uuid)
    {
        abort_unless($this->canManage($request->user()), 403);

        $category = BlogCategory::query()->where('uuid', $uuid)->firstOrFail();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', 'unique:blog_categories,name,' . $category->id],
            'description' => ['nullable', 'string', 'max:500'],
        ]);
        $data['slug'] = BlogCategory::uniqueSlug($data['name'], $category->id);

        $category->update($data);
        activity('blog-categories')->event('updated')->causedBy($request->user())->performedOn($category)->log('Blog category updated');

        return ApiResponse::success('Blog category updated', $this->payload($category->fresh()->loadCount('posts'), true));
    }

    public function destroy(Request $request, string $uuid)
    {
        abort_unless($this->canManage($request->user()), 403);

        $category = BlogCategory::query()->where('uuid', $uuid)->firstOrFail();
        $category->delete();
        activity('blog-categories')->event('deleted')->causedBy($request->user())->log("Blog category deleted: {$uuid}");

        return ApiResponse::success('Blog category deleted');
    }

    private function payload(BlogCategory $category, bool $canEdit): array
    {
        return [
            'id' => $category->id,
            'uuid' => $category->uuid,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'posts_count' => $category->posts_count ?? 0,
            'can_edit' => $canEdit,
        ];
    }

    private function canManage($user): bool
    {
        return $user?->hasRole('super-admin')
            || $user?->hasAnyPermission(['create kms asset', 'upload kms assets', 'create learning articles', 'create discussion topics']);
    }
}
