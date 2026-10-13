<?php

use App\Http\Controllers\BlogPostController;
use App\Http\Controllers\SsoWebController;
use App\Models\BlogPost;
use Illuminate\Support\Facades\Route;

Route::get('/auth/sso/redirect', [SsoWebController::class, 'redirect'])->name('sso.redirect');
Route::get('/auth/sso/callback', [SsoWebController::class, 'callback'])->name('sso.callback');
Route::view('/login', 'app')->name('login');
Route::get('/artikel/{slug}', [BlogPostController::class, 'show'])->name('articles.show');
Route::get('/', function () {
    if (request()->boolean('sso_unavailable')) {
        return redirect('/login?sso_unavailable=1');
    }

    $latestPosts = BlogPost::query()
        ->where('status', 'published')
        ->latest('published_at')
        ->latest()
        ->limit(3)
        ->get(['title', 'slug', 'featured_image', 'published_at', 'created_at']);

    return view('landing', compact('latestPosts'));
})->name('landing');
Route::get('/{templateAssetDirectory}/{templateAssetPath}', function (string $templateAssetDirectory, string $templateAssetPath) {
    $basePath = realpath(public_path("template/{$templateAssetDirectory}"));
    $filePath = $basePath ? realpath($basePath.DIRECTORY_SEPARATOR.$templateAssetPath) : false;

    abort_unless(
        $basePath
        && $filePath
        && str_starts_with($filePath, $basePath.DIRECTORY_SEPARATOR)
        && is_file($filePath),
        404
    );

    return response()->file($filePath);
})->whereIn('templateAssetDirectory', ['css', 'js', 'plugins', 'images', 'fonts'])->where('templateAssetPath', '.*');
Route::view('/{path?}', 'app')->where('path', '^(?!api(/|$)).*');
