import React, { useState } from 'react';
import {
  AlignLeft, Check, Columns2, Maximize2, Minimize2, Moon,
  Palette, RotateCcw, Square, SquareCode, Sun, Table2,
  LayoutDashboard, LayoutTemplate, PanelLeft, PanelRight,
  Layers, Layers2, Layers3,
  Eye, EyeOff,
  Move, Zap, ZapOff,
  SlidersHorizontal,
} from 'lucide-react';
import { DEFAULT_UI, THEMES, useTheme } from '../contexts/ThemeContext.jsx';

// ── Option tile ──────────────────────────────────────────────────────────────────

function OptionTile({ label, isActive, onClick, preview, small }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        border: `2px solid ${isActive ? 'var(--grape)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: small ? '8px 10px' : '12px 14px',
        cursor: 'pointer',
        background: isActive ? 'var(--grape-light)' : 'var(--surface)',
        transition: 'all .12s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        flex: 1,
        minWidth: 0,
      }}
    >
      {preview}
      <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? 'var(--grape)' : 'var(--fg-2)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {isActive && (
        <span style={{
          position: 'absolute', top: 5, right: 5,
          width: 16, height: 16, borderRadius: '50%', background: 'var(--grape)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={9} color="#fff" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

// ── Toggle row ───────────────────────────────────────────────────────────────────

function ToggleRow({ label, desc, checked, onChange, icon: Icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {Icon && <Icon size={15} color="var(--fg-3)" />}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{label}</div>
          {desc && <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 1 }}>{desc}</div>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 38, height: 21, borderRadius: 11, border: 'none', cursor: 'pointer',
          padding: 2, background: checked ? 'var(--grape)' : 'var(--border)',
          display: 'flex', alignItems: 'center',
          justifyContent: checked ? 'flex-end' : 'flex-start',
          transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <span style={{ width: 17, height: 17, borderRadius: '50%', background: '#fff' }} />
      </button>
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────────

function PrefSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--fg-3)' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Corner preview SVGs ──────────────────────────────────────────────────────────

const CornerPreview = ({ radius, size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect x="3" y="3" width="26" height="26" rx={radius === 'square' ? 0 : radius === 'rounded' ? 6 : 13}
      fill="color-mix(in srgb, var(--grape) 14%, transparent)"
      stroke="var(--grape)" strokeWidth="1.5" />
  </svg>
);

const ShadowPreview = ({ type }) => {
  const shadows = { flat: 'none', soft: '0 2px 6px rgba(0,0,0,0.12)', elevated: '0 6px 16px rgba(0,0,0,0.2)' };
  return (
    <div style={{
      width: 36, height: 24, borderRadius: 4, background: 'var(--bg)',
      border: '1px solid var(--border)', boxShadow: shadows[type],
    }} />
  );
};

const DensityPreview = ({ type }) => {
  const pads = { compact: 3, normal: 6, spacious: 10 };
  const p = pads[type];
  return (
    <div style={{ width: 36, height: 26, border: '1px solid var(--border)', borderRadius: 3, padding: p, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[100, 75, 85].map((w, i) => (
        <div key={i} style={{ height: 2, borderRadius: 1, background: 'var(--border)', width: `${w}%` }} />
      ))}
    </div>
  );
};

const FormPreview = ({ type }) => (
  <div style={{ width: 42, display: 'grid', gap: 4 }}>
    {[0, 1].map((i) => (
      <div
        key={i}
        style={{
          height: 9,
          borderRadius: type === 'filled' ? 4 : 0,
          border: type === 'underline' ? 'none' : '1px solid var(--border)',
          borderBottom: type === 'underline' ? '2px solid var(--grape)' : undefined,
          background: type === 'filled' ? 'var(--surface)' : 'var(--bg)',
        }}
      />
    ))}
  </div>
);

const ProgressPreview = ({ type }) => (
  <div style={{ width: 46, display: 'grid', gap: 5 }}>
    <div style={{ height: type === 'thin' ? 4 : 8, background: 'var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div
        style={{
          width: '68%',
          height: '100%',
          background: type === 'striped'
            ? 'repeating-linear-gradient(45deg, var(--grape), var(--grape) 5px, color-mix(in srgb, var(--grape) 78%, #fff) 5px, color-mix(in srgb, var(--grape) 78%, #fff) 10px)'
            : 'var(--grape)',
        }}
      />
    </div>
    <div style={{ height: type === 'thin' ? 4 : 8, background: 'var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ width: '42%', height: '100%', background: 'var(--emerald)' }} />
    </div>
  </div>
);

const ToastPreview = ({ type }) => (
  <div
    style={{
      width: 48,
      height: 26,
      borderRadius: type === 'minimal' ? 0 : 7,
      border: type === 'minimal' ? 'none' : '1px solid var(--border)',
      borderLeft: type === 'minimal' ? '3px solid var(--grape)' : undefined,
      background: type === 'solid' ? 'var(--grape)' : type === 'soft' ? 'var(--grape-light)' : 'var(--bg)',
      boxShadow: type === 'solid' ? '0 4px 10px rgba(0,0,0,.14)' : 'none',
      display: 'grid',
      alignContent: 'center',
      gap: 3,
      padding: 5,
    }}
  >
    <span style={{ width: 28, height: 3, background: type === 'solid' ? '#fff' : 'var(--fg)', opacity: .9 }} />
    <span style={{ width: 20, height: 3, background: type === 'solid' ? '#fff' : 'var(--fg-3)', opacity: .7 }} />
  </div>
);

const TypographyPreview = ({ scale, weight }) => {
  const size = { compact: 10, normal: 12, large: 14 }[scale] || 12;
  const fontWeight = { light: 400, medium: 600, bold: 800 }[weight] || 600;
  return (
    <div style={{ width: 48, display: 'grid', gap: 4 }}>
      <span style={{ width: 34, height: size / 2, background: 'var(--fg)', opacity: .86, borderRadius: 2 }} />
      <span style={{ width: 44, height: 3, background: 'var(--border)', borderRadius: 2 }} />
      <span style={{ width: 26, height: 3, background: 'var(--border)', borderRadius: 2 }} />
      <strong style={{ fontSize: 10, fontWeight, color: 'var(--grape)', lineHeight: 1 }}>Aa</strong>
    </div>
  );
};

const BadgePreview = ({ type }) => (
  <div
    style={{
      minWidth: 46,
      padding: '3px 8px',
      borderRadius: type === 'soft' ? 12 : type === 'outline' ? 3 : 0,
      border: type === 'outline' ? '1px solid var(--grape)' : 'none',
      background: type === 'solid' ? 'var(--grape)' : type === 'soft' ? 'var(--grape-light)' : 'transparent',
      color: type === 'solid' ? '#fff' : 'var(--grape)',
      fontSize: 9,
      fontWeight: 800,
      textAlign: 'center',
    }}
  >
    LIVE
  </div>
);

const ModalPreview = ({ type }) => (
  <div style={{ width: 48, height: 34, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.12)', borderRadius: 4 }}>
    <div
      style={{
        width: type === 'calm' ? 34 : 38,
        height: type === 'calm' ? 24 : 26,
        borderRadius: type === 'sharp' ? 0 : type === 'calm' ? 10 : 4,
        border: '1px solid var(--border)',
        background: 'var(--bg)',
        boxShadow: type === 'calm' ? '0 6px 14px rgba(0,0,0,.14)' : 'none',
      }}
    />
  </div>
);

// ── Preset card ──────────────────────────────────────────────────────────────────

function PresetCard({ theme, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        border: `2px solid ${isActive ? theme.preview[0] : 'var(--border)'}`,
        borderRadius: 10, padding: 14, cursor: 'pointer', textAlign: 'left',
        background: isActive ? `color-mix(in srgb, ${theme.preview[0]} 6%, var(--bg))` : 'var(--bg)',
        transition: 'all .15s', width: '100%',
      }}
    >
      <div style={{ display: 'flex', gap: 5, marginBottom: 9 }}>
        {theme.preview.map((c, i) => (
          <div key={i} style={{ width: i === 0 ? 28 : 18, height: 18, borderRadius: 4, background: c, flexShrink: 0 }} />
        ))}
        <div style={{
          marginLeft: 'auto', display: 'flex', gap: 2, alignItems: 'center',
          padding: '2px 5px', borderRadius: 4,
          background: theme.vars['--surface'], border: `1px solid ${theme.vars['--border']}`,
        }}>
          <div style={{ width: 3, height: 12, borderRadius: 2, background: theme.preview[0] }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[20, 14, 17].map((w, i) => (
              <div key={i} style={{ width: w, height: 2, borderRadius: 1, background: theme.vars['--border'] }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)', marginBottom: 2 }}>{theme.name}</div>
      <div style={{ fontSize: 10, color: 'var(--fg-3)', lineHeight: 1.4 }}>{theme.description}</div>
      {isActive && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 20, height: 20, borderRadius: '50%', background: theme.preview[0],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={11} color="#fff" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────────

export default function ThemeSettings() {
  const { current, ui, setPreset, setCustom, resetCustom, setUiPref, resetUi } = useTheme();

  const [pickerVal, setPickerVal] = useState(
    current.custom?.primary || THEMES[current.preset]?.preview[0] || '#c42007'
  );

  const isCustomActive = !!current.custom;
  const hasUiChanges   = JSON.stringify(ui) !== JSON.stringify(DEFAULT_UI);

  return (
    <section className="enterprise-card" style={{ padding: 24 }}>

      {/* ── Header ── */}
      <div className="section-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SlidersHorizontal size={18} color="var(--grape)" />
          <div>
            <p className="mono-kicker text-muted" style={{ margin: 0 }}>Tampilan</p>
            <h2 style={{ margin: 0 }}>Tema & Preferensi UI</h2>
          </div>
        </div>
        {hasUiChanges && (
          <button onClick={resetUi} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--fg-3)',
          }}>
            <RotateCcw size={12} /> Reset UI
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>

        {/* ── Left column: color ── */}
        <div>
          {/* Color presets */}
          <PrefSection title="Warna Tema">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {Object.values(THEMES).map((theme) => (
                <PresetCard
                  key={theme.id}
                  theme={theme}
                  isActive={current.preset === theme.id && !isCustomActive}
                  onClick={() => setPreset(theme.id)}
                />
              ))}
            </div>
          </PrefSection>

          {/* Custom color */}
          <PrefSection title="Warna Kustom">
            <div style={{
              border: `1.5px solid ${isCustomActive ? 'var(--grape)' : 'var(--border)'}`,
              borderRadius: 8, padding: 12,
              background: isCustomActive ? 'var(--grape-light)' : 'var(--surface)',
              transition: 'all .15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Palette size={13} color="var(--grape)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>Pilih Warna Utama</span>
                {isCustomActive && (
                  <button onClick={resetCustom} style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--fg-3)',
                  }}>
                    <RotateCcw size={11} /> Reset
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="color"
                  value={pickerVal}
                  onChange={(e) => setPickerVal(e.target.value)}
                  style={{ width: 40, height: 32, border: '1.5px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2 }}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1.0, 0.65, 0.35, 0.12].map((a) => (
                    <div key={a} style={{
                      width: 20, height: 20, borderRadius: 4,
                      background: `${pickerVal}${Math.round(a * 255).toString(16).padStart(2, '0')}`,
                      border: '1px solid var(--border)',
                    }} />
                  ))}
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--fg-2)' }}>{pickerVal}</span>
                <button
                  onClick={() => setCustom(pickerVal)}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 6, border: 'none',
                    background: pickerVal, color: '#fff', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                  }}
                >
                  <Check size={12} /> Terapkan
                </button>
              </div>
            </div>
          </PrefSection>

          {/* Card corners */}
          <PrefSection title="Sudut Kartu">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'square',  label: 'Kotak' },
                { value: 'rounded', label: 'Bulat' },
                { value: 'pill',    label: 'Pil' },
              ].map(({ value, label }) => (
                <OptionTile
                  key={value}
                  label={label}
                  isActive={ui.cardRadius === value}
                  onClick={() => setUiPref('cardRadius', value)}
                  preview={<CornerPreview radius={value} />}
                />
              ))}
            </div>
          </PrefSection>

          {/* Button corners */}
          <PrefSection title="Sudut Tombol">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'square',  label: 'Kotak',
                  preview: <div style={{ width: 48, height: 20, background: 'var(--grape)', borderRadius: 0 }} /> },
                { value: 'rounded', label: 'Bulat',
                  preview: <div style={{ width: 48, height: 20, background: 'var(--grape)', borderRadius: 6 }} /> },
                { value: 'pill',    label: 'Pil',
                  preview: <div style={{ width: 48, height: 20, background: 'var(--grape)', borderRadius: 12 }} /> },
              ].map(({ value, label, preview }) => (
                <OptionTile
                  key={value}
                  label={label}
                  isActive={ui.btnRadius === value}
                  onClick={() => setUiPref('btnRadius', value)}
                  preview={preview}
                />
              ))}
            </div>
          </PrefSection>

          {/* Typography */}
          <PrefSection title="Typography">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[
                { value: 'compact', label: 'Kecil' },
                { value: 'normal', label: 'Normal' },
                { value: 'large', label: 'Besar' },
              ].map(({ value, label }) => (
                <OptionTile
                  key={value}
                  label={label}
                  isActive={ui.fontScale === value}
                  onClick={() => setUiPref('fontScale', value)}
                  preview={<TypographyPreview scale={value} weight={ui.headingWeight} />}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'light', label: 'Light' },
                { value: 'medium', label: 'Medium' },
                { value: 'bold', label: 'Bold' },
              ].map(({ value, label }) => (
                <OptionTile
                  key={value}
                  label={label}
                  small
                  isActive={ui.headingWeight === value}
                  onClick={() => setUiPref('headingWeight', value)}
                  preview={<TypographyPreview scale={ui.fontScale} weight={value} />}
                />
              ))}
            </div>
          </PrefSection>
        </div>

        {/* ── Right column: layout ── */}
        <div>
          {/* Sidebar mode */}
          <PrefSection title="Tampilan Sidebar">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[
                { value: 'full',    label: 'Lengkap',
                  preview: (
                    <div style={{ display: 'flex', gap: 3, height: 28 }}>
                      <div style={{ width: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 2, padding: 3 }}>
                        {[1,2,3].map(i => <div key={i} style={{ height: 2, background: 'var(--border)', borderRadius: 1 }} />)}
                      </div>
                      <div style={{ flex: 1, background: 'var(--grape)', opacity: .15, borderRadius: 2 }} />
                    </div>
                  ),
                },
                { value: 'compact', label: 'Kompak',
                  preview: (
                    <div style={{ display: 'flex', gap: 3, height: 28 }}>
                      <div style={{ width: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 3, padding: 2, alignItems: 'center' }}>
                        {[1,2,3].map(i => <div key={i} style={{ width: 6, height: 2, background: 'var(--border)', borderRadius: 1 }} />)}
                      </div>
                      <div style={{ flex: 1, background: 'var(--grape)', opacity: .15, borderRadius: 2 }} />
                    </div>
                  ),
                },
                { value: 'flush',   label: 'Minimalis',
                  preview: (
                    <div style={{ display: 'flex', gap: 3, height: 28 }}>
                      <div style={{ width: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 2, padding: '3px 2px' }}>
                        <div style={{ height: 1, background: 'var(--border)' }} />
                        {[1,2].map(i => <div key={i} style={{ height: 3, background: 'color-mix(in srgb, var(--grape) 30%, transparent)', borderRadius: 1 }} />)}
                      </div>
                      <div style={{ flex: 1, background: 'var(--grape)', opacity: .15, borderRadius: 2 }} />
                    </div>
                  ),
                },
              ].map(({ value, label, preview }) => (
                <OptionTile
                  key={value}
                  label={label}
                  isActive={ui.sidebar === value}
                  onClick={() => setUiPref('sidebar', value)}
                  preview={preview}
                />
              ))}
            </div>

            {/* Sidebar position */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'left',  label: 'Kiri',
                  preview: (
                    <div style={{ display: 'flex', gap: 2, height: 22 }}>
                      <div style={{ width: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2 }} />
                      <div style={{ flex: 1, background: 'var(--grape)', opacity: .15, borderRadius: 2 }} />
                    </div>
                  ),
                },
                { value: 'right', label: 'Kanan',
                  preview: (
                    <div style={{ display: 'flex', gap: 2, height: 22 }}>
                      <div style={{ flex: 1, background: 'var(--grape)', opacity: .15, borderRadius: 2 }} />
                      <div style={{ width: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2 }} />
                    </div>
                  ),
                },
              ].map(({ value, label, preview }) => (
                <OptionTile
                  key={value}
                  label={label}
                  isActive={ui.sidebarPos === value}
                  onClick={() => setUiPref('sidebarPos', value)}
                  preview={preview}
                />
              ))}
            </div>
          </PrefSection>

          {/* Density */}
          <PrefSection title="Kepadatan Konten">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'compact',  label: 'Padat' },
                { value: 'normal',   label: 'Normal' },
                { value: 'spacious', label: 'Lega' },
              ].map(({ value, label }) => (
                <OptionTile
                  key={value}
                  label={label}
                  isActive={ui.density === value}
                  onClick={() => setUiPref('density', value)}
                  preview={<DensityPreview type={value} />}
                />
              ))}
            </div>
          </PrefSection>

          {/* Shadow */}
          <PrefSection title="Bayangan Kartu">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'flat',     label: 'Datar' },
                { value: 'soft',     label: 'Lembut' },
                { value: 'elevated', label: 'Terangkat' },
              ].map(({ value, label }) => (
                <OptionTile
                  key={value}
                  label={label}
                  isActive={ui.shadow === value}
                  onClick={() => setUiPref('shadow', value)}
                  preview={<ShadowPreview type={value} />}
                />
              ))}
            </div>
          </PrefSection>

          {/* Table style */}
          <PrefSection title="Gaya Tabel">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'plain',   label: 'Polos',
                  preview: (
                    <div style={{ width: 40, height: 24, border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      {[0,1,2].map(i => <div key={i} style={{ height: 8, background: 'var(--bg)', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }} />)}
                    </div>
                  ),
                },
                { value: 'striped', label: 'Bergaris',
                  preview: (
                    <div style={{ width: 40, height: 24, border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      {[0,1,2].map(i => <div key={i} style={{ height: 8, background: i % 2 === 0 ? 'var(--bg)' : 'var(--surface)', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }} />)}
                    </div>
                  ),
                },
              ].map(({ value, label, preview }) => (
                <OptionTile
                  key={value}
                  label={label}
                  isActive={ui.tableStyle === value}
                  onClick={() => setUiPref('tableStyle', value)}
                  preview={preview}
                />
              ))}
            </div>
          </PrefSection>

          {/* Form style */}
          <PrefSection title="Gaya Form">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'outlined', label: 'Outline' },
                { value: 'filled', label: 'Filled' },
                { value: 'underline', label: 'Underline' },
              ].map(({ value, label }) => (
                <OptionTile
                  key={value}
                  label={label}
                  isActive={ui.formStyle === value}
                  onClick={() => setUiPref('formStyle', value)}
                  preview={<FormPreview type={value} />}
                />
              ))}
            </div>
          </PrefSection>

          {/* Progress style */}
          <PrefSection title="Gaya Progress">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'solid', label: 'Solid' },
                { value: 'striped', label: 'Stripe' },
                { value: 'thin', label: 'Tipis' },
              ].map(({ value, label }) => (
                <OptionTile
                  key={value}
                  label={label}
                  isActive={ui.progressStyle === value}
                  onClick={() => setUiPref('progressStyle', value)}
                  preview={<ProgressPreview type={value} />}
                />
              ))}
            </div>
          </PrefSection>

          {/* Toast style */}
          <PrefSection title="Gaya Toast">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[
                { value: 'solid', label: 'Solid' },
                { value: 'soft', label: 'Soft' },
                { value: 'minimal', label: 'Minimal' },
              ].map(({ value, label }) => (
                <OptionTile
                  key={value}
                  label={label}
                  isActive={ui.toastStyle === value}
                  onClick={() => setUiPref('toastStyle', value)}
                  preview={<ToastPreview type={value} />}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'top-right', label: 'Atas Kanan' },
                { value: 'top-center', label: 'Atas Tengah' },
                { value: 'bottom-right', label: 'Bawah Kanan' },
                { value: 'bottom-center', label: 'Bawah Tengah' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setUiPref('toastPosition', value)}
                  style={{
                    flex: 1,
                    border: `1.5px solid ${ui.toastPosition === value ? 'var(--grape)' : 'var(--border)'}`,
                    background: ui.toastPosition === value ? 'var(--grape-light)' : 'var(--surface)',
                    color: ui.toastPosition === value ? 'var(--grape)' : 'var(--fg-2)',
                    cursor: 'pointer',
                    padding: '7px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: 1.25,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </PrefSection>

          {/* Badge style */}
          <PrefSection title="Gaya Status Badge">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'soft', label: 'Soft' },
                { value: 'outline', label: 'Outline' },
                { value: 'solid', label: 'Solid' },
              ].map(({ value, label }) => (
                <OptionTile
                  key={value}
                  label={label}
                  isActive={ui.badgeStyle === value}
                  onClick={() => setUiPref('badgeStyle', value)}
                  preview={<BadgePreview type={value} />}
                />
              ))}
            </div>
          </PrefSection>

          {/* Modal style */}
          <PrefSection title="Gaya Modal">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'centered', label: 'Default' },
                { value: 'calm', label: 'Calm' },
                { value: 'sharp', label: 'Sharp' },
              ].map(({ value, label }) => (
                <OptionTile
                  key={value}
                  label={label}
                  isActive={ui.modalStyle === value}
                  onClick={() => setUiPref('modalStyle', value)}
                  preview={<ModalPreview type={value} />}
                />
              ))}
            </div>
          </PrefSection>

          {/* Toggle rows */}
          <div>
            <ToggleRow
              label="Tampilkan Header"
              desc="Sembunyikan topbar untuk tampilan lebih luas"
              icon={Eye}
              checked={ui.header}
              onChange={(v) => setUiPref('header', v)}
            />
            <ToggleRow
              label="Animasi & Transisi"
              desc="Matikan untuk aksesibilitas atau performa"
              icon={Zap}
              checked={ui.motion}
              onChange={(v) => setUiPref('motion', v)}
            />
          </div>
        </div>
      </div>

      <p style={{ margin: '16px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>
        Semua preferensi disimpan di perangkat ini dan berlaku instan tanpa login ulang.
      </p>
    </section>
  );
}
