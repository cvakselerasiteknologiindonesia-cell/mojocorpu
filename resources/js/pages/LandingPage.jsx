import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Layers3,
  LibraryBig,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import api from '../api.js';

const modules = [
  { icon: CalendarCheck2, label: 'Training Event', value: '124', note: 'kelas aktif dan terjadwal' },
  { icon: LibraryBig, label: 'KMS', value: '418', note: 'aset pengetahuan OPD' },
  { icon: FileCheck2, label: 'Sertifikat', value: '8.950+', note: 'bukti kompetensi terbit' },
  { icon: UsersRound, label: 'ASN', value: '3.200+', note: 'peserta terhubung' },
];

const workflows = [
  { icon: ClipboardList, title: 'Usulan OPD', body: 'Rencana pelatihan masuk lewat alur pengajuan dan review yang jelas.' },
  { icon: BookOpenCheck, title: 'Kelas Berjalan', body: 'Sesi, materi, peserta, presensi, asesmen, dan kelulusan dikelola bersama.' },
  { icon: Award, title: 'Dampak Tercatat', body: 'Sertifikat, badge, token, laporan, dan riwayat belajar tersimpan rapi.' },
];

const slides = [
  {
    title: 'Admin OPD melihat kebutuhan belajar dan progres peserta dalam satu layar.',
    label: 'Admin OPD',
    metric: '47 OPD',
    body: 'Kelola pengguna, fasilitator, event, proposal, laporan, dan aset pengetahuan tanpa berpindah sistem.',
  },
  {
    title: 'Fasilitator punya ruang kerja untuk menjalankan kelas sampai evaluasi.',
    label: 'Fasilitator',
    metric: '6 alur',
    body: 'Materi, peserta, asesmen, presensi, completion, dan laporan kelas berada dalam workflow yang sama.',
  },
  {
    title: 'ASN masuk, belajar, check-in, mengerjakan asesmen, lalu menerima bukti capaian.',
    label: 'ASN',
    metric: '1 akses',
    body: 'Learning journey dibuat ringkas agar peserta fokus pada kelas, diskusi, leaderboard, wallet, dan sertifikat.',
  },
];

const timeline = ['Proposal', 'Kurasi', 'Pelaksanaan', 'Evaluasi', 'Sertifikasi'];

function formatBlogDate(date) {
  if (!date) return 'Terbaru';
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function extractCover(body) {
  const match = (body || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
}

export default function LandingPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const { data: blogData, isLoading: blogsLoading } = useQuery({
    queryKey: ['landing-blog-posts'],
    queryFn: async () => (await api.get('/public/blog-posts', { params: { per_page: 3 } })).data.data,
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 5200);

    return () => window.clearInterval(interval);
  }, []);

  const goToSlide = (index) => {
    setActiveSlide((index + slides.length) % slides.length);
  };

  const slide = slides[activeSlide];
  const blogPosts = blogData?.data || [];

  return (
    <main className="landing-page">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="landing-hero" aria-label="Corporate University BKPSDM Mojokerto">
        <header className="landing-nav">
          <a className="landing-brand" href="/" aria-label="CorpU BKPSDM Mojokerto">
            <span className="brand-mark brand-mark-column">CU</span>
            <span>
              <strong>CorpU BKPSDM</strong>
              <em>Kabupaten Mojokerto</em>
            </span>
          </a>
          <nav aria-label="Akses platform">
            <a className="landing-nav-link" href="/auth/sso/redirect">
              <ShieldCheck size={15} /> SSO ASN
            </a>
            <a className="landing-nav-primary" href="/login">
              Masuk <ArrowRight size={15} />
            </a>
          </nav>
        </header>

        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <span className="landing-live"><CheckCircle2 size={14} /> Platform aktif untuk ASN Mojokerto</span>
            <p className="landing-mono-kicker">Corporate University Platform</p>
            <h1>CorpU BKPSDM<br />Mojokerto</h1>
            <p>
              Satu ruang kerja untuk merancang pelatihan, menjalankan kelas, mengelola pengetahuan, menerbitkan
              sertifikat, dan membaca capaian kompetensi ASN.
            </p>
            <div className="landing-actions">
              <a className="landing-action-primary" href="/auth/sso/redirect">
                <ShieldCheck size={17} /> Masuk dengan SSO
              </a>
              <a className="landing-action-secondary" href="/login">
                Login internal <ArrowRight size={17} />
              </a>
            </div>
          </div>

          <aside className="landing-command-panel" aria-label="Ringkasan platform">
            <div className="command-head">
              <span><Sparkles size={15} /> Live Overview</span>
              <strong>2026</strong>
            </div>
            <div className="command-grid">
              {modules.map(({ icon: Icon, label, value, note }) => (
                <article key={label}>
                  <Icon size={18} />
                  <strong>{value}</strong>
                  <span>{label}</span>
                  <p>{note}</p>
                </article>
              ))}
            </div>
            <div className="command-timeline" aria-label="Alur pelatihan">
              {timeline.map((item, index) => (
                <span className={index <= 2 ? 'active' : ''} key={item}>{item}</span>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {/* ── Workflow Cards ────────────────────────────────────────── */}
      <section className="landing-workflows-section" aria-label="Alur utama">
        <div className="landing-section-inner">
          <div className="landing-workflows">
            {workflows.map(({ icon: Icon, title, body }) => (
              <article key={title}>
                <span><Icon size={19} /></span>
                <h2>{title}</h2>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Blog ─────────────────────────────────────────────────── */}
      {(blogsLoading || blogPosts.length > 0) && (
        <section className="landing-blog" aria-label="Artikel terbaru">
          <div className="landing-section-inner">
            <div className="landing-blog-head">
              <div>
                <p className="landing-mono-kicker landing-mono-kicker--muted">Artikel CorpU</p>
                <h2>Terbaru dari ruang belajar</h2>
              </div>
              <a href="/login" className="landing-blog-link">
                Masuk untuk membaca <ArrowRight size={15} />
              </a>
            </div>

            <div className="landing-blog-grid">
              {blogsLoading && [1, 2, 3].map((item) => (
                <article className="landing-blog-card loading" key={item}>
                  <span />
                  <div />
                </article>
              ))}

              {!blogsLoading && blogPosts.map((post) => {
                const cover = post.featured_image || extractCover(post.body);

                return (
                  <a className="landing-blog-card" href={`/artikel/${post.slug}`} key={post.uuid}>
                    {cover ? (
                      <img src={cover} alt="" loading="lazy" />
                    ) : (
                      <div className="landing-blog-fallback">
                        <BookOpenCheck size={28} />
                      </div>
                    )}
                    <div className="landing-blog-card-body">
                      <span>{post.category || 'General'} · {formatBlogDate(post.published_at)}</span>
                      <h3>{post.title}</h3>
                      <p>{post.excerpt}</p>
                      <em>{post.reading_minutes} min read</em>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Spotlight ────────────────────────────────────────────── */}
      <section className="landing-spotlight" aria-label="Sorotan peran">
        <div className="landing-section-inner">
          <div className="landing-spotlight-inner">
            <div className="spotlight-copy">
              <p className="landing-mono-kicker landing-mono-kicker--muted">Role-based Workspace</p>
              <h2>{slide.title}</h2>
              <p>{slide.body}</p>
              <div className="spotlight-controls">
                <button className="icon-button" type="button" aria-label="Sorotan sebelumnya" onClick={() => goToSlide(activeSlide - 1)}>
                  <ChevronLeft size={18} />
                </button>
                <button className="icon-button" type="button" aria-label="Sorotan berikutnya" onClick={() => goToSlide(activeSlide + 1)}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="spotlight-card">
              <div>
                <GraduationCap size={26} />
                <span>{slide.label}</span>
              </div>
              <strong>{slide.metric}</strong>
              <div className="spotlight-bars">
                <span />
                <span />
                <span />
              </div>
              <div className="landing-slider-dots" role="tablist" aria-label="Pilih sorotan">
                {slides.map((item, index) => (
                  <button
                    aria-label={`Tampilkan ${item.label}`}
                    className={activeSlide === index ? 'active' : ''}
                    key={item.label}
                    onClick={() => goToSlide(index)}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-section-inner landing-footer-inner">
          <span><Building2 size={15} /> BKPSDM Kabupaten Mojokerto</span>
          <span><Layers3 size={15} /> LMS, KMS, Event, Sertifikat, Wallet, Achievement</span>
        </div>
      </footer>
    </main>
  );
}
