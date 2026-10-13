@extends('layouts.public-template')

@php
    $publishedAt = $post->published_at ?: $post->created_at;
    $categoryName = $post->blogCategory?->name ?? $post->category ?? 'Artikel CorpU';
    $coverImage = $post->featured_image;
    $shareUrl = urlencode(request()->fullUrl());
    $shareTitle = urlencode($post->title);
@endphp

@section('title', ($post->seo_title ?: $post->title) . ' | Corporate University BKPSDM Kabupaten Mojokerto')
@section('meta_description', $post->seo_description ?: $post->excerpt ?: 'Artikel dan berita Corporate University BKPSDM Kabupaten Mojokerto.')
@section('active_nav', 'blog')

@push('styles')
<style>
    .news-block-two .image img { width: 100%; height: 460px; object-fit: cover; }
    .news-block-two .lower-box h1 { font-size: 34px; line-height: 1.35; font-weight: 700; margin-bottom: 18px; color: #222; }
    .article-body { color: #666; font-size: 16px; line-height: 1.9; }
    .article-body > * + * { margin-top: 18px; }
    .article-body h2, .article-body h3, .article-body h4 { color: #222; font-weight: 700; line-height: 1.4; margin-top: 32px; }
    .article-body h2 { font-size: 28px; }
    .article-body h3 { font-size: 23px; }
    .article-body ul, .article-body ol { padding-left: 24px; }
    .article-body li + li { margin-top: 8px; }
    .article-body blockquote { margin: 28px 0; padding: 24px 28px; background: #f7f7f7; border-left: 4px solid #c42007; color: #333; font-size: 18px; font-weight: 600; }
    .article-body img { max-width: 100%; height: auto; }
    .article-placeholder { height: 460px; display: grid; place-items: center; background: #f3f3f3; color: #c42007; font-size: 56px; }
    .sidebar-widget .post-thumb img { width: 80px; height: 70px; object-fit: cover; }
    .category-widget li a span.article-category-count { float: right; color: inherit; }
    .tag-widget .tag-empty { color: #777; font-size: 14px; }
    @media (max-width: 767px) {
        .news-block-two .image img, .article-placeholder { height: 260px; }
        .news-block-two .lower-box h1 { font-size: 26px; }
    }
</style>
@endpush

@section('content')
<!--Page Title-->
<section class="page-title" style="background-image:url(/template/images/background/3.jpg);">
    <div class="container">
        <h1>Detail Artikel</h1>
    </div>
</section>
<!--End Page Title-->

<!--Page Info-->
<section class="page-info">
    <div class="container">
        <div class="flex-box-five">
            <ul class="bread-crumb">
                <li><a href="{{ route('landing') }}">Beranda</a></li>
                <li><a href="{{ route('landing') }}#blog">Artikel & Berita</a></li>
                <li>{{ \Illuminate\Support\Str::limit($post->title, 42) }}</li>
            </ul>
            <div class="share-link"><a href="https://wa.me/?text={{ $shareTitle }}%20{{ $shareUrl }}" target="_blank" rel="noopener noreferrer"><i class="fa fa-share-alt"></i>Bagikan</a></div>
        </div>
    </div>
</section>
<!-- End Page Info -->

<!-- sidebar page -->
<section class="sidebar-page sp-two">
    <div class="container">
        <div class="row">
            <div class="col-lg-8">
                <article class="news-block-two">
                    <div class="inner-box">
                        <div class="image">
                            @if ($coverImage)
                                <img src="{{ $coverImage }}" alt="{{ $post->title }}">
                            @else
                                <div class="article-placeholder"><span class="fa fa-newspaper-o"></span></div>
                            @endif
                            <div class="post-date">{{ $publishedAt->translatedFormat('d M, Y') }}</div>
                        </div>
                        <div class="lower-box">
                            <ul class="post-meta">
                                <li><span class="icon fa fa-user"></span>{{ $post->author?->name ?? 'Tim Corporate University' }}</li>
                                <li><span class="icon fa fa-folder-open"></span>{{ $categoryName }}</li>
                                <li><span class="icon fa fa-clock-o"></span>{{ $readingMinutes }} menit baca</li>
                            </ul>
                            <h1>{{ $post->title }}</h1>
                            @if ($post->excerpt)
                                <div class="text">{{ $post->excerpt }}</div>
                            @endif
                        </div>
                    </div>
                </article>

                <div class="article-body">
                    {!! $post->body !!}
                </div>

                <div class="share-option">
                    <div class="clearfix">
                        <div class="float-left"><strong>Bagikan Artikel</strong></div>
                        <div class="float-right">
                            <ul class="social-icon-one">
                                <li><a href="https://www.facebook.com/sharer/sharer.php?u={{ $shareUrl }}" target="_blank" rel="noopener noreferrer"><span class="fa fa-facebook-f"></span></a></li>
                                <li><a href="https://twitter.com/intent/tweet?url={{ $shareUrl }}&amp;text={{ $shareTitle }}" target="_blank" rel="noopener noreferrer"><span class="fa fa-twitter"></span></a></li>
                                <li><a href="https://wa.me/?text={{ $shareTitle }}%20{{ $shareUrl }}" target="_blank" rel="noopener noreferrer"><span class="fa fa-whatsapp"></span></a></li>
                                <li><a href="https://www.linkedin.com/sharing/share-offsite/?url={{ $shareUrl }}" target="_blank" rel="noopener noreferrer"><span class="fa fa-linkedin"></span></a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                @include('partials.blog-sidebar')
            </div>
        </div>
    </div>
</section>
@endsection
