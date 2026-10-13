import { useEffect, useMemo, useState } from 'react';
import api from '../api.js';

const DEMO_ACCOUNTS = [
  {
    role: 'Super Admin',
    identifier: 'admin@mojokertokab.go.id',
    password: 'password',
  },
  {
    role: 'Admin OPD',
    identifier: 'admin.opd@mojokertokab.go.id',
    password: 'password',
  },
  {
    role: 'ASN',
    identifier: 'budi@mojokertokab.go.id',
    password: 'password',
  },
  {
    role: 'Fasilitator Internal',
    identifier: 'siti.fasilitator@mojokertokab.go.id',
    password: 'password',
  },
  {
    role: 'Fasilitator Eksternal',
    identifier: 'external.fasilitator@example.com',
    password: 'password',
  },
];

export default function LoginPage({ onLogin }) {
  const initialSsoUnavailable = useMemo(
    () => new URLSearchParams(window.location.search).get('sso_unavailable') === '1',
    [],
  );
  const [form, setForm] = useState({ identifier: 'admin@mojokertokab.go.id', password: 'password' });
  const [loading, setLoading] = useState(false);
  const [ssoUnavailable, setSsoUnavailable] = useState(initialSsoUnavailable);
  const [error, setError] = useState(
    initialSsoUnavailable ? 'Server SSO Jakarta sedang tidak tersedia. Silakan masuk menggunakan NIP/email BKPSDM.' : '',
  );

  useEffect(() => {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('data-startbar', 'light');
    document.documentElement.setAttribute('data-bs-theme', 'light');

    const stylesheets = [
      '/assets/css/bootstrap.min.css',
      '/assets/css/icons.min.css',
      '/assets/css/app.min.css',
    ];

    const links = stylesheets.map((href) => {
      const existing = document.querySelector(`link[href="${href}"]`);
      if (existing) return null;

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = href;
      link.dataset.loginTemplate = 'true';
      document.head.appendChild(link);

      return link;
    });

    const brandButtonStyle = document.createElement('style');
    brandButtonStyle.dataset.loginTemplate = 'true';
    brandButtonStyle.textContent = `
      .auth-header-box.bg-black {
        background-color: #221816 !important;
      }

      .btn-primary {
        --bs-btn-bg: #c42007;
        --bs-btn-border-color: #c42007;
        --bs-btn-hover-bg: #8b1200;
        --bs-btn-hover-border-color: #8b1200;
        --bs-btn-active-bg: #8b1200;
        --bs-btn-active-border-color: #8b1200;
        --bs-btn-disabled-bg: #c42007;
        --bs-btn-disabled-border-color: #c42007;
        --bs-btn-color: #ffffff;
        --bs-btn-hover-color: #ffffff;
        --bs-btn-active-color: #ffffff;
        box-shadow: 0 8px 18px rgba(196, 32, 7, .22);
      }

      .btn-primary:focus-visible,
      .btn-outline-primary:focus-visible,
      .form-control:focus,
      .form-select:focus {
        border-color: #c42007;
        box-shadow: 0 0 0 .2rem rgba(196, 32, 7, .22);
      }

      .btn-outline-primary {
        --bs-btn-color: #c42007;
        --bs-btn-border-color: #c42007;
        --bs-btn-hover-bg: #c42007;
        --bs-btn-hover-border-color: #c42007;
        --bs-btn-hover-color: #ffffff;
        --bs-btn-active-bg: #8b1200;
        --bs-btn-active-border-color: #8b1200;
        --bs-btn-active-color: #ffffff;
      }

      .text-primary {
        color: #c42007 !important;
      }
    `;
    document.head.appendChild(brandButtonStyle);

    return () => {
      links.forEach((link) => link?.remove());
      brandButtonStyle.remove();
      document.documentElement.removeAttribute('data-startbar');
      document.documentElement.removeAttribute('data-bs-theme');
    };
  }, []);

  useEffect(() => {
    if (!initialSsoUnavailable) return undefined;
    window.history.replaceState({}, '', window.location.pathname);
    const timeout = window.setTimeout(() => setSsoUnavailable(false), 3600);
    return () => window.clearTimeout(timeout);
  }, [initialSsoUnavailable]);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const useDemoAccount = (account) => {
    setError('');
    setSsoUnavailable(false);
    setForm({
      identifier: account.identifier,
      password: account.password,
    });
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
    <div className="container-xxl">
      <div className="row vh-100 d-flex justify-content-center">
        <div className="col-12 align-self-center">
          <div className="card-body">
            <div className="row">
              <div className="col-lg-4 mx-auto">
                <div className="card">
                  <div className="card-body p-0 bg-black auth-header-box rounded-top">
                    <div className="text-center p-3">
                      <a href="/" className="logo logo-admin">
                        <img src="/images/corpu-topbar-logo.png" height="50" alt="MAJA CORPU" className="auth-logo" />
                      </a>
                      <h4 className="mt-3 mb-1 fw-semibold text-white fs-18">Masuk ke MAJA CORPU</h4>
                      <p className="text-muted fw-medium mb-0">Gunakan akun resmi untuk melanjutkan.</p>
                    </div>
                  </div>
                  <div className="card-body pt-0">
                    <form className="my-3" onSubmit={submitCredential}>
                      <div className="form-group mb-2">
                        <label className="form-label" htmlFor="username">NIP atau Email</label>
                        <input
                          type="text"
                          className="form-control"
                          id="username"
                          name="identifier"
                          value={form.identifier}
                          onChange={update}
                          placeholder="Masukkan NIP atau email"
                          autoComplete="username"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="userpassword">Password</label>
                        <input
                          type="password"
                          className="form-control"
                          name="password"
                          id="userpassword"
                          value={form.password}
                          onChange={update}
                          placeholder="Masukkan password"
                          autoComplete="current-password"
                          required
                        />
                      </div>

                      <div className="form-group row mt-3">
                        <div className="col-sm-6">
                          <div className="form-check form-switch form-switch-success">
                            <input className="form-check-input" type="checkbox" id="customSwitchSuccess" />
                            <label className="form-check-label" htmlFor="customSwitchSuccess">Remember me</label>
                          </div>
                        </div>
                        <div className="col-sm-6 text-end">
                          <a href="/login" className="text-muted font-13"><i className="dripicons-lock" /> Lupa password?</a>
                        </div>
                      </div>

                      {error && (
                        <div className="alert alert-danger py-2 mt-3 mb-0 font-13" role="alert">
                          {error}
                        </div>
                      )}

                      <div className="form-group mb-0 row">
                        <div className="col-12">
                          <div className="d-grid mt-3">
                            <button className="btn btn-primary" type="submit" disabled={loading}>
                              {loading ? 'Memproses...' : 'Log In'} <i className="fas fa-sign-in-alt ms-1" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>

                    <div className="form-group mb-3">
                      <label className="form-label" htmlFor="demoAccount">Demo akun sesuai role</label>
                      <select
                        id="demoAccount"
                        className="form-select form-select-sm"
                        value={form.identifier}
                        onChange={(event) => {
                          const account = DEMO_ACCOUNTS.find((item) => item.identifier === event.target.value);
                          if (account) useDemoAccount(account);
                        }}
                      >
                        {DEMO_ACCOUNTS.map((account) => (
                          <option key={account.identifier} value={account.identifier}>
                            {account.role} - {account.identifier}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="d-grid">
                      <button type="button" onClick={startSso} className="btn btn-outline-primary btn-sm">
                        <i className="fas fa-user-shield me-1" /> Masuk dengan SSO ASN
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
