<aside class="sidebar blog-sidebar">
    <div class="sidebar-widget search-widget">
        <div class="sidebar-title">
            <h4>Cari Artikel</h4>
        </div>
        <form method="get" action="/blog">
            <div class="form-group">
                <input type="search" name="search" value="{{ request('search') }}" placeholder="Kata kunci...">
                <button type="submit"><span class="fa fa-search"></span></button>
            </div>
        </form>
    </div>

    @if ($categories->isNotEmpty())
        <div class="sidebar-widget category-widget">
            <div class="sidebar-title">
                <h4>Kategori</h4>
            </div>
            <ul>
                @foreach ($categories as $category)
                    <li>
                        <a href="/blog?category={{ urlencode($category->slug ?? $category->name) }}">
                            {{ $category->name }}
                            <span class="article-category-count">({{ $category->published_posts_count }})</span>
                        </a>
                    </li>
                @endforeach
            </ul>
        </div>
    @endif

    @if ($recentPosts->isNotEmpty())
        <div class="sidebar-widget news-widget">
            <div class="sidebar-title">
                <h4>Artikel Terbaru</h4>
            </div>

            @foreach ($recentPosts as $recentPost)
                <div class="post">
                    <figure class="post-thumb">
                        <a href="{{ route('articles.show', $recentPost->slug) }}">
                            <img src="{{ $recentPost->featured_image ?: '/template/images/resource/post-thumb-' . (($loop->index % 3) + 1) . '.jpg' }}" alt="{{ $recentPost->title }}">
                        </a>
                    </figure>
                    <div class="text"><a href="{{ route('articles.show', $recentPost->slug) }}">{{ $recentPost->title }}</a></div>
                    <div class="post-info">{{ optional($recentPost->published_at)->translatedFormat('d M, Y') }}</div>
                </div>
            @endforeach
        </div>
    @endif

    <div class="sidebar-widget tag-widget">
        <div class="sidebar-title">
            <h4>Tag</h4>
        </div>
        @forelse (($post->tags ?? []) as $tag)
            <a href="/blog?search={{ urlencode($tag) }}">{{ $tag }}</a>
        @empty
            <span class="tag-empty">Belum ada tag.</span>
        @endforelse
    </div>
</aside>
