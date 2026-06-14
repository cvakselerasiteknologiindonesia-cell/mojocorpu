import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, UserRound } from 'lucide-react';
import api from '../api.js';

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function PublicBlogPost() {
  const { slug } = useParams();
  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['public-blog-post', slug],
    queryFn: async () => (await api.get(`/public/blog-posts/${slug}`)).data.data,
  });

  useEffect(() => {
    if (!post) return;

    document.title = post.seo_title || post.title || 'CorpU BKPSDM Blog';

    const description = post.seo_description || post.excerpt || '';
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);
  }, [post]);

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
          <ArrowLeft size={15} /> Kembali
        </Link>
      </header>

      {isLoading && <div className="blog-public-state">Memuat artikel...</div>}
      {isError && <div className="blog-public-state">Artikel tidak ditemukan atau belum dipublikasikan.</div>}

      {post && (
        <article className="blog-public-article">
          {post.featured_image && <img className="blog-public-cover" src={post.featured_image} alt="" />}
          <div className="blog-public-meta">
            <span>{post.category || 'General'}</span>
            <span><Calendar size={13} /> {formatDate(post.published_at)}</span>
            <span><Clock size={13} /> {post.reading_minutes} min read</span>
          </div>
          <h1>{post.title}</h1>
          {post.excerpt && <p className="blog-public-excerpt">{post.excerpt}</p>}
          <div className="blog-public-author">
            <UserRound size={15} />
            <span>{post.author?.name || 'CorpU Author'}</span>
          </div>
          {post.tags?.length > 0 && (
            <div className="blog-tag-row">
              {post.tags.map((tag) => <span key={tag}>#{tag}</span>)}
            </div>
          )}
          <div className="blog-body" dangerouslySetInnerHTML={{ __html: post.body }} />
        </article>
      )}
    </main>
  );
}
