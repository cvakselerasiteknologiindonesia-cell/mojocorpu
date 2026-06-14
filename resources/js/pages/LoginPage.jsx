import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Award, BookOpen, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, User } from 'lucide-react';
import api from '../api.js';
import demoRoleAccounts from '../data/demoAccounts.js';

export default function LoginPage({ onLogin }) {
  const initialSsoUnavailable = useMemo(
    () => new URLSearchParams(window.location.search).get('sso_unavailable') === '1',
    [],
  );
  const [selectedDemoRole, setSelectedDemoRole] = useState('super_admin');
  const [form, setForm] = useState({ identifier: 'admin@mojokertokab.go.id', password: 'password' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [ssoUnavailable, setSsoUnavailable] = useState(initialSsoUnavailable);
  const [error, setError] = useState(
    initialSsoUnavailable ? 'Server SSO Jakarta sedang tidak tersedia. Silakan masuk menggunakan NIP/email BKPSDM.' : '',
  );

  useEffect(() => {
    if (!initialSsoUnavailable) return undefined;
    window.history.replaceState({}, '', window.location.pathname);
    const timeout = window.setTimeout(() => setSsoUnavailable(false), 3600);
    return () => window.clearTimeout(timeout);
  }, [initialSsoUnavailable]);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const selectDemoRole = (account) => {
    setSelectedDemoRole(account.role);
    setForm({ identifier: account.identifier, password: 'password' });
    setError('');
  };

  const submitCredential = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', {
        identifier: form.identifier,
        password: form.password,
        device_name: 'corporateuniversity-app',
      });
      onLogin(response.data.data);
    } catch (err) {
      setError(
        err.response?.data?.message
        || err.response?.data?.errors?.identifier?.[0]
        || 'Login gagal. Periksa kembali data Anda.',
      );
    } finally {
      setLoading(false);
    }
  };

  const startSso = () => {
    const redirectPath = window.location.pathname === '/login'
      ? (new URLSearchParams(window.location.search).get('redirect') || '/dashboard')
      : window.location.pathname;

    sessionStorage.setItem('corpu_post_login_path', redirectPath === '/' ? '/dashboard' : redirectPath);
    window.location.href = '/auth/sso/redirect';
  };

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="hero-grid-texture" />
        <div className="login-hero-top">
          <div className="brand-lockup">
            <div className="brand-mark brand-mark-light">CU</div>
            <div>
              <strong>Corporate University</strong>
              <span>BKPSDM Kab. Mojokerto</span>
            </div>
          </div>
          <span className="login-live-badge"><CheckCircle2 size={13} /> Online</span>
        </div>

        <div className="hero-copy">
          <p className="mono-kicker">ASN Learning Platform</p>
          <h1>Belajar, berkembang, tersertifikasi.</h1>
          <p>Satu pintu untuk pelatihan, materi, asesmen, sertifikat, dan rekam pengembangan kompetensi ASN.</p>
        </div>

        <div className="login-dashboard-preview" aria-hidden="true">
          <div className="login-preview-head">
            <span />
            <span />
            <span />
          </div>
          <div className="login-preview-body">
            <div className="login-preview-main">
              <div>
                <small>Learning Progress</small>
                <strong>78%</strong>
              </div>
              <div className="login-preview-bars">
                <span style={{ width: '82%' }} />
                <span style={{ width: '64%' }} />
                <span style={{ width: '48%' }} />
              </div>
            </div>
            <div className="login-preview-side">
              <span><BookOpen size={13} /> 124 Modul</span>
              <span><Award size={13} /> 8.950 Sertifikat</span>
              <span><Sparkles size={13} /> 47 OPD</span>
            </div>
          </div>
        </div>

        <div className="hero-stats">
          <div><strong>3.200+</strong><span>ASN Terdaftar</span></div>
          <div><strong>124</strong><span>Modul Aktif</span></div>
          <div><strong>8.950+</strong><span>Sertifikat</span></div>
        </div>
      </section>

      <section className="login-panel" aria-label="Login">
        <div className={`login-card ${ssoUnavailable ? 'login-card-attention' : ''}`}>
          <div className="login-card-head">
            <p className="mono-kicker text-muted">Secure Access</p>
            <h2>Masuk ke Akun</h2>
            <p className="login-subtitle">Gunakan SSO ASN atau akun internal untuk melanjutkan ke ruang belajar.</p>
          </div>

          <button className="sso-button" type="button" onClick={startSso}>
            <span className="sso-icon"><ShieldCheck size={19} /></span>
            <span>
              <strong>Masuk dengan SSO ASN</strong>
              <small>Autentikasi resmi dan aman</small>
            </span>
            <ArrowRight size={17} />
          </button>

          <div className="divider"><span>atau masuk manual</span></div>

          <form className={`login-form ${ssoUnavailable ? 'login-form-attention' : ''}`} onSubmit={submitCredential}>
            <div className="demo-role-panel" aria-label="Role login presets">
              <span>Pilih Role</span>
              <div className="demo-role-grid">
                {demoRoleAccounts.map((account) => (
                  <button
                    key={account.role}
                    className={`demo-role-button ${selectedDemoRole === account.role ? 'active' : ''}`}
                    type="button"
                    onClick={() => selectDemoRole(account)}
                  >
                    {account.label}
                  </button>
                ))}
              </div>
            </div>

            <label>
              <span>NIP atau Email</span>
              <div className="input-wrap">
                {form.identifier.includes('@') ? <Mail size={16} /> : <User size={16} />}
                <input name="identifier" value={form.identifier} onChange={update} placeholder="18 digit NIP atau email resmi" autoComplete="username" required />
              </div>
            </label>
            <label>
              <span>Kata Sandi</span>
              <div className="input-wrap password-wrap">
                <Lock size={16} />
                <input
                  name="password"
                  value={form.password}
                  onChange={update}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Kata sandi"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && <div className="form-error-visible">{error}</div>}

            <label className="remember-row">
              <input type="checkbox" /> Ingat saya selama 30 hari
            </label>

            <button className="primary-button full" disabled={loading}>
              {loading ? 'Masuk...' : 'Masuk dengan Email/NIP'} <ArrowRight size={16} />
            </button>
          </form>

          <div className="support-note">
            <ShieldCheck size={15} />
            <span>Dilindungi autentikasi internal BKPSDM. Hubungi Admin BKPSDM ext. 203 jika mengalami kendala akses.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
