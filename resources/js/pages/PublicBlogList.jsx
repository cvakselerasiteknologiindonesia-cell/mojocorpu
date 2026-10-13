import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpenCheck, Calendar, Clock, Search } from 'lucide-react';
import api from '../api.js';

function formatDate(date) {
  if (!date) return 'Terbaru';
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function PublicBlogSkeleton() {
  return (
    <div className="public-blog-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="public-blog-card" style={{ pointerEvents: 'none', opacity: Math.max(0.2, 1 - i * 0.08) }}>
          <Skel w="100%" h={220} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 22 }}>
            <Skel w={100} h={10} />
            <Skel w="75%" h={22} />
            <Skel w="100%" h={13} />
            <Skel w="88%" h={13} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PublicBlogList() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['public-blog-list', page, search],
    queryFn: async () => (await api.get('/public/blog-posts', { params: { page, per_page: 9, search } })).data.data,
    placeholderData: (previous) => previous,
  });

  const posts = data?.data || [];

  return (
    <main className="blog-public-page">
      <header className="blog-public-nav">
        <Link to="/" className="landing-brand" aria-label="CorpU BKPSDM Mojokerto">
          <span className="brand-mark">CU</span>
          <span>
            <strong>CorpU BKPSDM</strong>
            <em>Kabupaten Mojokerto</em>
          </span>
        </Link>
        <Link className="landing-blog-link" to="/">
          <ArrowLeft size={15} /> Frontpage
        </Link>
      </header>

      <section className="public-blog-index">
        <div className="public-blog-index-head">
          <div>
            <p className="mono-kicker text-muted">Artikel CorpU</p>
            <h1>Ruang belajar dan berbagi pengetahuan ASN</h1>
            <p>Artikel yang sudah dipublikasikan dari database blog CorpU tampil di halaman ini.</p>
          </div>
          <label className="public-blog-search">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari artikel..."
            />
          </label>
        </div>

        {isLoading && <PublicBlogSkeleton />}
        {!isLoading && posts.length === 0 && <div className="blog-public-state">Belum ada artikel yang dipublikasikan.</div>}

        {posts.length > 0 && (
          <div className="public-blog-grid">
            {posts.map((post) => (
              <Link className="public-blog-card" to={`/artikel/${post.slug}`} key={post.uuid}>
                {post.featured_image ? (
                  <img src={post.featured_image} alt="" loading="lazy" />
                ) : (
                  <div className="public-blog-card-fallback">
                    <BookOpenCheck size={28} />
                  </div>
                )}
                <div>
                  <span className="public-blog-card-meta">
                    {post.category || 'General'} · <Calendar size={12} /> {formatDate(post.published_at)}
                  </span>
                  <h2>{post.title}</h2>
                  <p>{post.excerpt || stripHtml(post.body).slice(0, 180)}</p>
                  {post.tags?.length > 0 && (
                    <div className="blog-tag-row">
                      {post.tags.slice(0, 4).map((tag) => <span key={tag}>#{tag}</span>)}
                    </div>
                  )}
                  <em><Clock size={12} /> {post.reading_minutes} min read <ArrowRight size={13} /></em>
                </div>
              </Link>
            ))}
          </div>
        )}

        {data?.last_page > 1 && (
          <div className="public-blog-pagination">
            <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Prev
            </button>
            <span>Hal. {page} / {data.last_page}{isFetching ? ' · refreshing' : ''}</span>
            <button className="outline-button compact" disabled={page >= data.last_page} onClick={() => setPage((current) => current + 1)}>
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
