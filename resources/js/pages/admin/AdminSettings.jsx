import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Building2,
  Check,
  ChevronDown,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Palette,
  Plus,
  Rocket,
  Save,
  ShieldCheck,
  Trash2,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';
import ThemeSettings from '../../components/ThemeSettings.jsx';

// ── Provider / model catalogue ─────────────────────────────────────────────────

const PROVIDERS = [
  { value: 'openai',    label: 'OpenAI',     defaultBase: 'https://api.openai.com' },
  { value: 'anthropic', label: 'Anthropic',  defaultBase: 'https://api.anthropic.com' },
  { value: 'deepseek',  label: 'DeepSeek',   defaultBase: 'https://api.deepseek.com' },
  { value: 'ollama',    label: 'Ollama (local)', defaultBase: 'http://localhost:11434' },
];

const MODEL_OPTIONS = {
  openai:    ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  deepseek:  ['deepseek-chat', 'deepseek-coder'],
  ollama:    ['llama3', 'mistral', 'phi3', 'gemma2'],
};

const FEATURES = [
  { key: 'ai_quiz_gen',        label: 'Quiz Generation', desc: 'Buat soal kuis otomatis dari materi pembelajaran.' },
  { key: 'ai_content_assist',  label: 'Content Assistant', desc: 'Bantu penyusunan materi, ringkasan, dan deskripsi.' },
  { key: 'ai_proposal_assist', label: 'Proposal Assistant', desc: 'Analisis dan saran untuk proposal pelatihan.' },
];

// ── Section label ──────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)' }}>
      {children}
    </p>
  );
}

// ── Field wrapper ──────────────────────────────────────────────────────────────

function Field({ label, hint, children }) {
  return (
    <div className="fm-field">
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 4, display: 'block' }}>{label}</label>
      {hint && <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--fg-3)' }}>{hint}</p>}
      {children}
    </div>
  );
}

// ── Secret input ───────────────────────────────────────────────────────────────

function SecretInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  const isMasked = value === '••••••••';

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isMasked ? '(sudah tersimpan — ketik untuk mengganti)' : placeholder}
        style={{ width: '100%', paddingRight: 40, boxSizing: 'border-box', fontFamily: show && !isMasked ? 'Space Mono, monospace' : 'inherit', fontSize: 13 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', padding: 0, display: 'flex' }}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ── Toggle switch ──────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', padding: 2,
        background: checked ? 'var(--accent)' : 'var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'block' }} />
    </button>
  );
}

// ── Status dot ────────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const map = {
    success: { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Terhubung' },
    warning: { bg: '#fef9c3', color: '#854d0e', border: '#fde047', label: 'Terhubung — kuota habis' },
    error:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', label: 'Koneksi gagal' },
    idle:    { bg: 'var(--surface)', color: 'var(--fg-3)', border: 'var(--border)', label: 'Belum diuji' },
  };
  const s = map[status] || map.idle;
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

// ── Wallet Settings ────────────────────────────────────────────────────────────

function WalletSettings() {
  const qc = useQueryClient();

  const { data: raw, isLoading } = useQuery({
    queryKey: ['settings-wallet'],
    queryFn: () => api.get('/settings/wallet').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const [form, setForm] = useState(null);
  const cfg = form ?? raw ?? null;

  function setField(key, value) {
    setForm((prev) => ({ ...(prev ?? raw ?? {}), [key]: value }));
  }

  function setTier(i, key, value) {
    setForm((prev) => {
      const tiers = [...((prev ?? raw ?? {}).wallet_score_tiers ?? [])];
      tiers[i] = { ...tiers[i], [key]: value };
      return { ...(prev ?? raw ?? {}), wallet_score_tiers: tiers };
    });
  }

  function addTier() {
    setForm((prev) => {
      const base = prev ?? raw ?? {};
      return {
        ...base,
        wallet_score_tiers: [...(base.wallet_score_tiers ?? []), { min_score: 0, multiplier: 0, label: 'New Tier' }],
      };
    });
  }

  function removeTier(i) {
    setForm((prev) => {
      const base = prev ?? raw ?? {};
      const tiers = (base.wallet_score_tiers ?? []).filter((_, idx) => idx !== i);
      return { ...base, wallet_score_tiers: tiers };
    });
  }

  const saveMut = useMutation({
    mutationFn: (payload) => api.put('/settings/wallet', payload),
    onSuccess: () => {
      toast.success('Wallet settings berhasil disimpan.');
      qc.invalidateQueries({ queryKey: ['settings-wallet'] });
      qc.invalidateQueries({ queryKey: ['wallet-token-info'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menyimpan.'),
  });

  function handleSave() {
    if (!cfg) return;
    saveMut.mutate({
      wallet_enabled:          cfg.wallet_enabled,
      wallet_auto_credit:      cfg.wallet_auto_credit,
      wallet_max_balance:      parseInt(cfg.wallet_max_balance, 10),
      wallet_max_single_credit:parseInt(cfg.wallet_max_single_credit, 10),
      wallet_score_tiers:      (cfg.wallet_score_tiers ?? []).map((t) => ({
        min_score:  parseInt(t.min_score, 10),
        multiplier: parseFloat(t.multiplier),
        label:      t.label,
      })),
    });
  }

  if (isLoading) return <div className="resource-note">Memuat wallet settings…</div>;
  if (!cfg) return null;

  const tierColors = ['var(--gold)', 'var(--sky)', 'var(--emerald)', 'var(--grape)', 'var(--crimson)', 'var(--gold)'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>

      {/* Left — toggles + limits */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <section className="enterprise-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in srgb, var(--grape) 12%, var(--bg))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Coins size={16} color="var(--grape)" />
            </div>
            <div>
              <strong style={{ fontSize: 14 }}>Sistem Wallet</strong>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>Aktifkan dan konfigurasi token wallet</p>
            </div>
          </div>

          {[
            { key: 'wallet_enabled',     label: 'Wallet aktif',               desc: 'Matikan untuk menonaktifkan seluruh sistem token.' },
            { key: 'wallet_auto_credit', label: 'Auto-credit dari asesmen',   desc: 'Otomatis tambah token saat peserta menyelesaikan asesmen.' },
          ].map((f, i) => (
            <div key={f.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
              padding: '14px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none',
            }}>
              <div>
                <strong style={{ fontSize: 13, display: 'block' }}>{f.label}</strong>
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{f.desc}</span>
              </div>
              <Toggle checked={!!cfg[f.key]} onChange={(v) => setField(f.key, v)} />
            </div>
          ))}
        </section>

        <section className="enterprise-card" style={{ padding: 20 }}>
          <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: 14 }}>Batas Token</p>

          <Field label={`Saldo maksimum: ${Number(cfg.wallet_max_balance).toLocaleString()} T`} hint="Saldo maksimum yang dapat dimiliki satu pengguna.">
            <input
              type="range" min={1000} max={10000000} step={1000}
              value={cfg.wallet_max_balance}
              onChange={(e) => setField('wallet_max_balance', parseInt(e.target.value, 10))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>
              <span>1.000</span><span>10.000.000</span>
            </div>
          </Field>

          <Field label={`Maksimum per transaksi: ${Number(cfg.wallet_max_single_credit).toLocaleString()} T`} hint="Batas token dalam satu kali kredit atau debit.">
            <input
              type="range" min={1} max={100000} step={100}
              value={cfg.wallet_max_single_credit}
              onChange={(e) => setField('wallet_max_single_credit', parseInt(e.target.value, 10))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>
              <span>1</span><span>100.000</span>
            </div>
          </Field>
        </section>
      </div>

      {/* Right — score tiers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <section className="enterprise-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14 }}>Tier Konversi Skor</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>Token = skor × multiplier. Tier dievaluasi dari skor tertinggi.</p>
            </div>
            <button type="button" className="outline-button compact" onClick={addTier}>
              <Plus size={13} /> Tambah
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(cfg.wallet_score_tiers ?? []).map((tier, i) => (
              <div key={i} style={{
                padding: '12px 14px', borderRadius: 8,
                border: `1px solid var(--border)`,
                borderLeft: `3px solid ${tierColors[i % tierColors.length]}`,
                background: 'var(--surface)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <input
                    value={tier.label}
                    onChange={(e) => setTier(i, 'label', e.target.value)}
                    placeholder="Label tier"
                    style={{ flex: 1, fontSize: 13, fontWeight: 600 }}
                  />
                  <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--crimson)', padding: 4, display: 'flex' }} onClick={() => removeTier(i)}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--fg-3)', fontWeight: 600 }}>Skor minimum</p>
                    <input
                      type="number" min={0} max={100}
                      value={tier.min_score}
                      onChange={(e) => setTier(i, 'min_score', e.target.value)}
                      style={{ width: '100%', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--fg-3)', fontWeight: 600 }}>
                      Multiplier: <strong style={{ color: tierColors[i % tierColors.length] }}>×{parseFloat(tier.multiplier || 0).toFixed(1)}</strong>
                    </p>
                    <input
                      type="number" min={0} max={10} step={0.1}
                      value={tier.multiplier}
                      onChange={(e) => setTier(i, 'multiplier', e.target.value)}
                      style={{ width: '100%', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>
                  Skor ≥ {tier.min_score} → <strong>{parseFloat(tier.min_score * (tier.multiplier || 0)).toFixed(0)}–{parseFloat(100 * (tier.multiplier || 0)).toFixed(0)}</strong> token
                </p>
              </div>
            ))}
            {(cfg.wallet_score_tiers ?? []).length === 0 && (
              <div className="resource-note">Belum ada tier. Klik "Tambah" untuk menambahkan.</div>
            )}
          </div>
        </section>

        <section className="enterprise-card" style={{ padding: 20 }}>
          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>Ringkasan</p>
          {[
            { label: 'Status wallet',     value: cfg.wallet_enabled ? '✓ Aktif' : '✗ Nonaktif' },
            { label: 'Auto-credit',       value: cfg.wallet_auto_credit ? '✓ Aktif' : '✗ Nonaktif' },
            { label: 'Saldo maks.',       value: Number(cfg.wallet_max_balance).toLocaleString() + ' T' },
            { label: 'Maks. per transaksi', value: Number(cfg.wallet_max_single_credit).toLocaleString() + ' T' },
            { label: 'Jumlah tier',       value: (cfg.wallet_score_tiers ?? []).length + ' tier' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--fg-3)' }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}

          <button
            className="primary-button compact"
            style={{ width: '100%', marginTop: 16 }}
            disabled={saveMut.isPending}
            onClick={handleSave}
          >
            {saveMut.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {saveMut.isPending ? 'Menyimpan…' : 'Simpan Wallet Settings'}
          </button>
        </section>
      </div>
    </div>
  );
}

// ── Payment Settings (Midtrans) ────────────────────────────────────────────────

const MIDTRANS_IPS = ['103.208.23.0/24', '103.208.23.12', '103.208.23.13'];

const MIDTRANS_LINKS = [
  { label: 'Dashboard Midtrans',  href: 'https://dashboard.midtrans.com' },
  { label: 'Sandbox Dashboard',   href: 'https://dashboard.sandbox.midtrans.com' },
  { label: 'Dokumentasi API',     href: 'https://docs.midtrans.com' },
  { label: 'Status Layanan',      href: 'https://status.midtrans.com' },
];

function PaymentSettings() {
  const qc = useQueryClient();

  const { data: raw, isLoading } = useQuery({
    queryKey: ['settings-payment'],
    queryFn: () => api.get('/settings/payment').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const [form, setForm]           = useState(null);
  const [testStatus, setTestStatus] = useState('idle');
  const [testMsg, setTestMsg]       = useState('');

  const cfg = form ?? raw ?? null;

  function set(key, value) {
    setForm((prev) => ({ ...(prev ?? raw ?? {}), [key]: value }));
    setTestStatus('idle');
  }

  const saveMut = useMutation({
    mutationFn: (payload) => api.put('/settings/payment', payload),
    onSuccess: () => {
      toast.success('Pengaturan pembayaran berhasil disimpan.');
      qc.invalidateQueries({ queryKey: ['settings-payment'] });
      setForm(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menyimpan.'),
  });

  const testMut = useMutation({
    mutationFn: () => api.post('/settings/test-payment'),
    onSuccess: (res) => {
      setTestStatus('success');
      setTestMsg(res.data.message || 'Terhubung.');
      toast.success(res.data.message);
    },
    onError: (err) => {
      setTestStatus('error');
      setTestMsg(err.response?.data?.message || 'Koneksi gagal.');
      toast.error(err.response?.data?.message || 'Koneksi gagal.');
    },
  });

  function handleSave() {
    if (!cfg) return;
    saveMut.mutate({
      midtrans_merchant_id:           cfg.midtrans_merchant_id           ?? '',
      midtrans_client_key:            cfg.midtrans_client_key            ?? '',
      midtrans_server_key:            cfg.midtrans_server_key            ?? '',
      midtrans_mode:                  cfg.midtrans_mode                  ?? 'sandbox',
      midtrans_webhook_url:           cfg.midtrans_webhook_url           ?? '',
      midtrans_webhook_verify_amount: cfg.midtrans_webhook_verify_amount ?? true,
      midtrans_ip_whitelist:          cfg.midtrans_ip_whitelist          ?? false,
      midtrans_idempotency_guard:     cfg.midtrans_idempotency_guard     ?? true,
    });
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    toast.success('Disalin ke clipboard.');
  }

  function resetWebhookUrl() {
    set('midtrans_webhook_url', `${window.location.origin}/api/payment/webhook/midtrans`);
  }

  if (isLoading) return <div className="resource-note">Memuat pengaturan pembayaran…</div>;
  if (!cfg) return null;

  const webhookUrl = cfg.midtrans_webhook_url ?? `${window.location.origin}/api/payment/webhook/midtrans`;

  const statusDot = { success: '#22c55e', error: '#ef4444', idle: 'var(--border)' };
  const statusLabel = { success: 'Terhubung', error: 'Gagal', idle: 'Belum diuji' };

  const SECURITY_FEATURES = [
    {
      key: 'midtrans_webhook_verify_signature',
      label: 'Verifikasi Signature',
      desc: 'SHA-512: order_id + status_code + gross_amount + server_key — selalu aktif, tidak dapat dimatikan',
      icon: ShieldCheck,
      badgeText: 'Wajib',
      badgeColor: '#dcfce7',
      badgeFg: '#166534',
      noToggle: true,
      alwaysOn: true,
    },
    {
      key: 'midtrans_webhook_verify_amount',
      label: 'Verifikasi Nominal',
      desc: 'gross_amount dari webhook dibandingkan dengan nominal di database',
      icon: Coins,
      badgeText: cfg.midtrans_webhook_verify_amount ? 'Aktif' : 'Nonaktif',
      badgeColor: cfg.midtrans_webhook_verify_amount ? '#dcfce7' : '#fee2e2',
      badgeFg:    cfg.midtrans_webhook_verify_amount ? '#166534' : '#991b1b',
    },
    {
      key: 'midtrans_ip_whitelist',
      label: 'IP Whitelist',
      desc: 'Tolak request dari IP selain 103.208.23.0/24 (konfigurasi di firewall)',
      icon: ShieldCheck,
      badgeText: 'Info',
      badgeColor: '#eff6ff',
      badgeFg: '#1d4ed8',
    },
    {
      key: 'midtrans_idempotency_guard',
      label: 'Idempotency Guard',
      desc: 'Notifikasi duplikat diabaikan otomatis jika payment sudah paid',
      icon: Check,
      badgeText: cfg.midtrans_idempotency_guard ? 'Terpasang' : 'Nonaktif',
      badgeColor: cfg.midtrans_idempotency_guard ? '#dcfce7' : '#f3f4f6',
      badgeFg:    cfg.midtrans_idempotency_guard ? '#166534' : '#6b7280',
      noToggle: true,
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 20, alignItems: 'start' }}>

      {/* ── Left: main config ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Credentials */}
        <section className="enterprise-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={18} color="#fff" />
            </div>
            <div>
              <strong style={{ fontSize: 14 }}>Kredensial Midtrans</strong>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>API keys dari dashboard.midtrans.com</p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--fg-3)', fontFamily: 'Space Mono, monospace' }}>.env</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Field label="MERCHANT ID">
              <input
                value={cfg.midtrans_merchant_id ?? ''}
                onChange={(e) => set('midtrans_merchant_id', e.target.value)}
                placeholder="G950789150"
                style={{ fontFamily: 'Space Mono, monospace', fontSize: 13 }}
              />
            </Field>

            <Field label="MODE">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { value: 'sandbox',    label: '🧪 Sandbox' },
                  { value: 'production', label: '🚀 Production' },
                ].map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => set('midtrans_mode', m.value)}
                    style={{
                      padding: '9px 0', border: `2px solid ${cfg.midtrans_mode === m.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: cfg.midtrans_mode === m.value ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--surface)',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      color: cfg.midtrans_mode === m.value ? 'var(--accent)' : 'var(--fg)',
                      borderRadius: 6, transition: 'all 0.15s',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="CLIENT KEY">
            <SecretInput
              value={cfg.midtrans_client_key ?? ''}
              onChange={(v) => set('midtrans_client_key', v)}
              placeholder="SB-Mid-client-..."
            />
          </Field>

          <Field label="SERVER KEY">
            <SecretInput
              value={cfg.midtrans_server_key ?? ''}
              onChange={(v) => set('midtrans_server_key', v)}
              placeholder="SB-Mid-server-..."
            />
          </Field>

          {/* Warning */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 6, padding: '10px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>
            <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 12, color: '#9a3412' }}>
              API keys <strong>tidak ditampilkan ulang</strong> setelah disimpan. Biarkan kosong jika tidak ingin mengubah key yang tersimpan.
            </p>
          </div>
        </section>

        {/* Webhook Security */}
        <section className="enterprise-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'color-mix(in srgb, var(--accent) 10%, var(--bg))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={16} color="var(--accent)" />
            </div>
            <div>
              <strong style={{ fontSize: 14 }}>Keamanan Webhook</strong>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>Lapisan validasi pada setiap notifikasi Midtrans</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {SECURITY_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.key} style={{
                  padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10,
                  background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} color="var(--fg-2)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <strong style={{ fontSize: 13 }}>{f.label}</strong>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', background: f.badgeColor, color: f.badgeFg, borderRadius: 4 }}>
                          {f.badgeText}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.4 }}>{f.desc}</p>
                    </div>
                    {!f.noToggle && (
                      <Toggle checked={!!cfg[f.key]} onChange={(v) => set(f.key, v)} />
                    )}
                    {f.noToggle && f.alwaysOn && (
                      <ShieldCheck size={16} color="#166534" />
                    )}
                    {f.noToggle && !f.alwaysOn && cfg[f.key] && (
                      <Check size={16} color="#22c55e" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Save */}
        <button
          className="primary-button"
          style={{ alignSelf: 'flex-start' }}
          disabled={saveMut.isPending}
          onClick={handleSave}
        >
          {saveMut.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
          {saveMut.isPending ? 'Menyimpan…' : 'Simpan Pengaturan'}
        </button>
      </div>

      {/* ── Right sidebar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Connection status */}
        <section className="enterprise-card" style={{ padding: 18 }}>
          <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)' }}>Status Koneksi</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusDot[testStatus], display: 'inline-block', flexShrink: 0 }} />
            <strong style={{ fontSize: 14 }}>{statusLabel[testStatus]}</strong>
          </div>
          {testMsg && (
            <p style={{ margin: '0 0 10px', fontSize: 12, color: testStatus === 'error' ? '#991b1b' : '#166534' }}>{testMsg}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Mode aktif:</span>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: cfg.midtrans_mode === 'production' ? '#fef9c3' : '#eff6ff',
              color: cfg.midtrans_mode === 'production' ? '#854d0e' : '#1d4ed8',
            }}>
              {cfg.midtrans_mode === 'production' ? 'Production' : 'Sandbox'}
            </span>
          </div>
          <button
            className="primary-button"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={testMut.isPending}
            onClick={() => testMut.mutate()}
          >
            {testMut.isPending
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Wifi size={14} />}
            {testMut.isPending ? 'Menguji…' : 'Test API Key'}
          </button>
        </section>

        {/* Webhook URL */}
        <section className="enterprise-card" style={{ padding: 18 }}>
          <strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>Webhook URL</strong>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--fg-3)' }}>Daftarkan di Midtrans → Settings → Configuration</p>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input
              value={webhookUrl}
              onChange={(e) => set('midtrans_webhook_url', e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: 'Space Mono, monospace', fontSize: 11,
                paddingRight: 36,
              }}
              placeholder="https://yourdomain.com/api/payment/webhook/midtrans"
            />
            <button
              type="button"
              title="Salin"
              onClick={() => copyToClipboard(webhookUrl)}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', padding: 0, display: 'flex' }}
            >
              <Copy size={13} />
            </button>
          </div>
          <button
            type="button"
            className="outline-button compact"
            onClick={resetWebhookUrl}
            style={{ fontSize: 11, color: 'var(--fg-3)' }}
          >
            Reset ke default
          </button>
        </section>

        {/* Midtrans IPs */}
        <section className="enterprise-card" style={{ padding: 18 }}>
          <strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>IP Midtrans</strong>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--fg-3)' }}>Untuk whitelist firewall/server</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MIDTRANS_IPS.map((ip) => (
              <div key={ip} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <code style={{
                  flex: 1, fontSize: 12, padding: '7px 10px', background: 'var(--surface)',
                  border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'Space Mono, monospace',
                }}>
                  {ip}
                </code>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', padding: 4, display: 'flex', flexShrink: 0 }}
                  onClick={() => copyToClipboard(ip)}
                >
                  <Copy size={13} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Links */}
        <section className="enterprise-card" style={{ padding: 18 }}>
          <strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>Link Midtrans</strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {MIDTRANS_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0', fontSize: 13, color: 'var(--fg)',
                  textDecoration: 'none', borderBottom: '1px solid var(--border)',
                }}
              >
                {label}
                <ExternalLink size={13} color="var(--fg-3)" />
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── App Identity Settings ──────────────────────────────────────────────────────

function AppIdentitySettings() {
  const qc = useQueryClient();

  const { data: raw, isLoading } = useQuery({
    queryKey: ['settings-app'],
    queryFn: () => api.get('/settings/app').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const [form, setForm]         = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const cfg = form ?? raw ?? null;

  function setField(key, value) {
    setForm((prev) => ({ ...(prev ?? raw ?? {}), [key]: value }));
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function clearLogo() {
    setLogoFile(null);
    setLogoPreview(null);
  }

  const saveMut = useMutation({
    mutationFn: (fd) => api.post('/settings/app', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: (res) => {
      toast.success('Identitas aplikasi berhasil disimpan.');
      qc.invalidateQueries({ queryKey: ['settings-app'] });
      setLogoFile(null);
      setLogoPreview(null);
      setForm(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menyimpan.'),
  });

  function handleSave() {
    if (!cfg) return;
    const fd = new FormData();
    fd.append('app_name',    cfg.app_name    ?? '');
    fd.append('app_tagline', cfg.app_tagline ?? '');
    if (logoFile) fd.append('app_logo', logoFile);
    saveMut.mutate(fd);
  }

  if (isLoading) return <div className="resource-note">Memuat identitas aplikasi…</div>;
  if (!cfg) return null;

  const currentLogo = logoPreview ?? cfg.app_logo ?? null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,340px)', gap: 20, alignItems: 'start' }}>

      {/* Left — fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <section className="enterprise-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in srgb, var(--accent) 12%, var(--bg))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={16} color="var(--accent)" />
            </div>
            <div>
              <strong style={{ fontSize: 14 }}>Identitas Aplikasi</strong>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>Nama, tagline, dan logo yang tampil di seluruh platform</p>
            </div>
          </div>

          <Field label="Nama Aplikasi" hint="Nama singkat yang tampil di topbar, halaman login, dan footer.">
            <input
              value={cfg.app_name ?? ''}
              onChange={(e) => setField('app_name', e.target.value)}
              placeholder="Contoh: MojoCorpu"
              style={{ fontSize: 14, fontWeight: 600 }}
            />
          </Field>

          <Field label="Tagline" hint="Deskripsi singkat di bawah nama aplikasi (opsional).">
            <input
              value={cfg.app_tagline ?? ''}
              onChange={(e) => setField('app_tagline', e.target.value)}
              placeholder="Contoh: Platform Pembelajaran ASN Kabupaten Mojokerto"
            />
          </Field>
        </section>

        {/* Logo upload */}
        <section className="enterprise-card" style={{ padding: 20 }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14 }}>Logo Aplikasi</p>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--fg-3)' }}>Format: PNG, JPG, SVG, WebP. Maksimum 2 MB.</p>

          {/* Dimension recommendation notice */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
            background: 'color-mix(in srgb, var(--gold) 10%, var(--bg))',
            border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
            borderRadius: 8, marginBottom: 16,
          }}>
            <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1 }}>💡</span>
            <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}>
              <strong>Rekomendasi ukuran logo:</strong> <span style={{ fontFamily: 'Space Mono, monospace', background: 'color-mix(in srgb, var(--gold) 15%, transparent)', padding: '1px 6px', borderRadius: 4 }}>133 × 50 px</span>
              <br />
              Rasio lebar:tinggi <strong>±2.7:1</strong> (landscape). Logo berbentuk kotak atau portrait akan dipotong/di-letterbox di topbar.
              Gunakan latar transparan (PNG) agar tampil optimal di semua tema.
            </div>
          </div>

          {currentLogo ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
              <div style={{
                width: 133, height: 50, borderRadius: 8, border: '2px solid var(--border)',
                background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                <img
                  src={currentLogo}
                  alt="Logo preview"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'Space Mono, monospace' }}>133 × 50 px (referensi)</span>
                {logoFile && (
                  <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{logoFile.name} · {(logoFile.size / 1024).toFixed(0)} KB</span>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                  <label style={{ cursor: 'pointer' }}>
                    <span className="outline-button compact" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ImagePlus size={13} /> Ganti Logo
                    </span>
                    <input type="file" accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp" onChange={handleLogoChange} style={{ display: 'none' }} />
                  </label>
                  {logoFile && (
                    <button type="button" className="outline-button compact" onClick={clearLogo} style={{ color: 'var(--crimson)' }}>
                      <X size={13} /> Batal
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <label style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{
                border: '2px dashed var(--border)', borderRadius: 10, padding: '28px 20px',
                textAlign: 'center', background: 'var(--surface)',
                transition: 'border-color 0.15s',
              }}>
                <ImagePlus size={28} style={{ color: 'var(--fg-3)', marginBottom: 10 }} />
                <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 13 }}>Klik untuk upload logo</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>PNG, JPG, SVG, WebP — maks. 2 MB · rekomendasi 133×50px</p>
              </div>
              <input type="file" accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp" onChange={handleLogoChange} style={{ display: 'none' }} />
            </label>
          )}
        </section>

        <button
          className="primary-button"
          disabled={saveMut.isPending}
          onClick={handleSave}
          style={{ alignSelf: 'flex-start' }}
        >
          {saveMut.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
          {saveMut.isPending ? 'Menyimpan…' : 'Simpan Identitas Aplikasi'}
        </button>
      </div>

      {/* Right — live preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section className="enterprise-card" style={{ padding: 20 }}>
          <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 13 }}>Preview</p>

          {/* Topbar preview */}
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 12 }}>
            <div style={{ background: 'var(--accent)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              {currentLogo
                ? <img src={currentLogo} alt="" style={{ height: 28, width: 28, objectFit: 'contain', borderRadius: 4 }} />
                : <div style={{ width: 28, height: 28, borderRadius: 4, background: 'rgba(255,255,255,0.25)' }} />}
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {cfg.app_name || 'MojoCorpu'}
              </span>
            </div>
            <div style={{ background: 'var(--surface)', padding: '8px 14px' }}>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>Topbar preview</p>
            </div>
          </div>

          {/* Login card preview */}
          <div style={{ borderRadius: 8, border: '1px solid var(--border)', padding: 16, background: 'var(--bg)', textAlign: 'center' }}>
            {currentLogo
              ? <img src={currentLogo} alt="" style={{ height: 48, objectFit: 'contain', marginBottom: 10 }} />
              : <div style={{ width: 48, height: 48, borderRadius: 10, background: 'color-mix(in srgb, var(--accent) 15%, var(--bg))', margin: '0 auto 10px' }} />}
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15 }}>{cfg.app_name || 'MojoCorpu'}</p>
            {(cfg.app_tagline || '') && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>{cfg.app_tagline}</p>
            )}
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>Login page preview</p>
          </div>
        </section>

        <section className="enterprise-card" style={{ padding: 16 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13 }}>Data Tersimpan</p>
          {[
            { label: 'Nama', value: raw?.app_name || '—' },
            { label: 'Tagline', value: raw?.app_tagline || '—' },
            { label: 'Logo', value: raw?.app_logo ? 'Terpasang' : 'Belum ada' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--fg-3)' }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('app');
  const qc = useQueryClient();

  const { data: raw, isLoading } = useQuery({
    queryKey: ['settings-ai'],
    queryFn: () => api.get('/settings').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const [form, setForm] = useState(null);
  const [testStatus, setTestStatus] = useState('idle');
  const [testMsg, setTestMsg]       = useState('');

  // Sync form from server data (one-way, only when data arrives for first time)
  const settings = form ?? (raw ? initForm(raw) : null);

  function initForm(data) {
    return {
      ai_provider:        data.ai_provider        ?? 'openai',
      ai_model:           data.ai_model           ?? 'gpt-4o-mini',
      ai_api_key:         data.ai_api_key         ?? '',
      ai_base_url:        data.ai_base_url        ?? '',
      ai_quiz_gen:        data.ai_quiz_gen        === '1',
      ai_content_assist:  data.ai_content_assist  === '1',
      ai_proposal_assist: data.ai_proposal_assist === '1',
      ai_max_tokens:      parseInt(data.ai_max_tokens  ?? '2048', 10),
      ai_temperature:     parseFloat(data.ai_temperature ?? '0.7'),
    };
  }

  function set(key, value) {
    setForm((prev) => ({ ...(prev ?? initForm(raw ?? {})), [key]: value }));
    if (key === 'ai_provider') {
      // auto-fill first model for selected provider
      setForm((prev) => ({
        ...(prev ?? initForm(raw ?? {})),
        ai_provider: value,
        ai_model: MODEL_OPTIONS[value]?.[0] ?? '',
      }));
    }
    setTestStatus('idle');
  }

  const saveMut = useMutation({
    mutationFn: (payload) => api.put('/settings', payload),
    onSuccess: () => {
      toast.success('Settings berhasil disimpan.');
      qc.invalidateQueries({ queryKey: ['settings-ai'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menyimpan.'),
  });

  const testMut = useMutation({
    mutationFn: () => api.post('/settings/test-ai'),
    onSuccess: (res) => {
      const isWarning = res.data.data?.warning === true;
      setTestStatus(isWarning ? 'warning' : 'success');
      setTestMsg(res.data.message || 'Koneksi berhasil.');
      if (isWarning) toast.warning(res.data.message);
      else toast.success(res.data.message || 'Koneksi berhasil!');
    },
    onError: (err) => {
      setTestStatus('error');
      setTestMsg(err.response?.data?.message || 'Koneksi gagal.');
      toast.error(err.response?.data?.message || 'Koneksi gagal.');
    },
  });

  function handleSave() {
    if (!settings) return;
    saveMut.mutate({
      ai_provider:        settings.ai_provider,
      ai_model:           settings.ai_model,
      ai_api_key:         settings.ai_api_key,
      ai_base_url:        settings.ai_base_url || null,
      ai_quiz_gen:        settings.ai_quiz_gen,
      ai_content_assist:  settings.ai_content_assist,
      ai_proposal_assist: settings.ai_proposal_assist,
      ai_max_tokens:      settings.ai_max_tokens,
      ai_temperature:     settings.ai_temperature,
    });
  }

  const providerInfo = PROVIDERS.find((p) => p.value === settings?.ai_provider);

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="mono-kicker text-muted">System</p>
          <h1>Settings</h1>
        </div>
        {activeTab === 'ai' && (
          <button
            className="primary-button compact"
            disabled={saveMut.isPending || !settings}
            onClick={handleSave}
          >
            {saveMut.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {saveMut.isPending ? 'Menyimpan…' : 'Simpan Settings'}
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)', marginBottom: 4 }}>
        {[
          { key: 'app',     label: 'Aplikasi',   icon: Building2 },
          { key: 'payment', label: 'Pembayaran', icon: CreditCard },
          { key: 'ai',      label: 'AI',         icon: Bot },
          { key: 'wallet',  label: 'Wallet',     icon: Coins },
          { key: 'theme',   label: 'Tampilan',   icon: Palette },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: 'none',
              color: activeTab === key ? 'var(--accent)' : 'var(--fg-3)',
              borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'app'     && <AppIdentitySettings />}
      {activeTab === 'payment' && <PaymentSettings />}
      {activeTab === 'wallet'  && <WalletSettings />}
      {activeTab === 'theme'  && <ThemeSettings />}

      {activeTab === 'ai' && isLoading && <div className="resource-note">Memuat settings…</div>}

      {activeTab === 'ai' && settings && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Provider card */}
            <section className="enterprise-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Bot size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: 14 }}>AI Provider</strong>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>Pilih layanan AI yang digunakan</p>
                </div>
              </div>

              <SectionLabel>Provider</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => set('ai_provider', p.value)}
                    style={{
                      padding: '10px 12px', border: `2px solid ${settings.ai_provider === p.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: settings.ai_provider === p.value ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--surface)',
                      cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600,
                      color: settings.ai_provider === p.value ? 'var(--accent)' : 'var(--fg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all 0.15s',
                    }}
                  >
                    {p.label}
                    {settings.ai_provider === p.value && <Check size={14} />}
                  </button>
                ))}
              </div>

              <Field label="Model" hint="Model yang digunakan untuk semua fitur AI.">
                <div style={{ position: 'relative' }}>
                  <select
                    value={settings.ai_model}
                    onChange={(e) => set('ai_model', e.target.value)}
                    style={{ width: '100%', appearance: 'none', paddingRight: 32, fontSize: 13 }}
                  >
                    {MODEL_OPTIONS[settings.ai_provider]?.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {!MODEL_OPTIONS[settings.ai_provider]?.includes(settings.ai_model) && settings.ai_model && (
                      <option value={settings.ai_model}>{settings.ai_model} (custom)</option>
                    )}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--fg-3)' }} />
                </div>
                <input
                  value={settings.ai_model}
                  onChange={(e) => set('ai_model', e.target.value)}
                  placeholder="Atau ketik model secara manual…"
                  style={{ marginTop: 6, fontSize: 13 }}
                />
              </Field>
            </section>

            {/* Credentials card */}
            <section className="enterprise-card" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: 14 }}>Credentials</p>

              <Field label="API Key" hint="Disimpan terenkripsi — tidak ditampilkan dalam bentuk asli.">
                <SecretInput
                  value={settings.ai_api_key}
                  onChange={(v) => set('ai_api_key', v)}
                  placeholder="sk-..."
                />
              </Field>

              <Field label="Base URL" hint={`Default: ${providerInfo?.defaultBase ?? 'otomatis'}. Kosongkan untuk menggunakan default.`}>
                <input
                  value={settings.ai_base_url}
                  onChange={(e) => set('ai_base_url', e.target.value)}
                  placeholder={providerInfo?.defaultBase ?? 'https://api.openai.com'}
                  style={{ fontSize: 13 }}
                />
              </Field>

              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="outline-button compact"
                  disabled={testMut.isPending}
                  onClick={() => testMut.mutate()}
                >
                  {testMut.isPending
                    ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Wifi size={13} />}
                  {testMut.isPending ? 'Menguji…' : 'Test Koneksi'}
                </button>
                <StatusPill status={testStatus} />
              </div>
              {testMsg && testStatus !== 'idle' && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: testStatus === 'success' ? '#166534' : testStatus === 'warning' ? '#854d0e' : '#991b1b' }}>
                  {testMsg}
                </p>
              )}
            </section>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Feature toggles */}
            <section className="enterprise-card" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14 }}>Fitur AI</p>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--fg-3)' }}>Aktifkan fitur AI yang ingin digunakan dalam platform.</p>

              {FEATURES.map((f, i) => (
                <div
                  key={f.key}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                    padding: '14px 0',
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: 13, display: 'block' }}>{f.label}</strong>
                    <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{f.desc}</span>
                  </div>
                  <Toggle
                    checked={!!settings[f.key]}
                    onChange={(v) => set(f.key, v)}
                  />
                </div>
              ))}
            </section>

            {/* Advanced parameters */}
            <section className="enterprise-card" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14 }}>Parameter Lanjutan</p>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--fg-3)' }}>Sesuaikan perilaku model AI.</p>

              <Field label={`Max Tokens: ${settings.ai_max_tokens}`} hint="Panjang maksimum output AI per permintaan (256–16384).">
                <input
                  type="range"
                  min={256} max={16384} step={256}
                  value={settings.ai_max_tokens}
                  onChange={(e) => set('ai_max_tokens', parseInt(e.target.value, 10))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>
                  <span>256</span><span>16384</span>
                </div>
              </Field>

              <Field label={`Temperature: ${settings.ai_temperature.toFixed(1)}`} hint="Kreativitas respons (0 = deterministik, 2 = sangat kreatif).">
                <input
                  type="range"
                  min={0} max={2} step={0.1}
                  value={settings.ai_temperature}
                  onChange={(e) => set('ai_temperature', parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>
                  <span>0 — Deterministik</span><span>2 — Kreatif</span>
                </div>
              </Field>
            </section>

            {/* Status summary */}
            <section className="enterprise-card" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>Ringkasan Konfigurasi</p>
              {[
                { label: 'Provider',    value: providerInfo?.label ?? settings.ai_provider },
                { label: 'Model',       value: settings.ai_model },
                { label: 'API Key',     value: settings.ai_api_key ? '✓ Dikonfigurasi' : '✗ Belum diisi' },
                { label: 'Base URL',    value: settings.ai_base_url || providerInfo?.defaultBase || '(default)' },
                { label: 'Fitur aktif', value: FEATURES.filter((f) => settings[f.key]).map((f) => f.label).join(', ') || 'Tidak ada' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--fg-3)', flexShrink: 0 }}>{label}</span>
                  <span style={{ fontWeight: 500, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                </div>
              ))}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
