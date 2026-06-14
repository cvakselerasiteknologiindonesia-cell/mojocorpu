import React, { createContext, useContext, useEffect, useState } from 'react';

// ── Preset color themes ──────────────────────────────────────────────────────────

export const THEMES = {
  corporate: {
    id: 'corporate',
    name: 'Corporate Purple',
    description: 'Elegan & profesional — tema bawaan sistem',
    preview: ['#8a05ff', '#009e7a', '#33acff'],
    vars: {
      '--grape':   '#8a05ff',
      '--sky':     '#33acff',
      '--emerald': '#009e7a',
      '--crimson': '#e96770',
      '--bg':      '#ffffff',
      '--surface': '#fafafa',
      '--border':  '#e3e3e3',
      '--fg':      '#0d0d0d',
      '--fg-2':    '#4d4d4d',
      '--fg-3':    '#6b6b6b',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Tenang & terpercaya — cocok untuk institusi pemerintah',
    preview: ['#0055d4', '#0891b2', '#00875a'],
    vars: {
      '--grape':   '#0055d4',
      '--sky':     '#0891b2',
      '--emerald': '#00875a',
      '--crimson': '#dc2626',
      '--bg':      '#f8faff',
      '--surface': '#eef2ff',
      '--border':  '#d0d9f0',
      '--fg':      '#0d1833',
      '--fg-2':    '#3b4a6b',
      '--fg-3':    '#5a6b90',
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest Green',
    description: 'Segar & natural — mencerminkan pertumbuhan & pembelajaran',
    preview: ['#15803d', '#0e7490', '#ca8a04'],
    vars: {
      '--grape':   '#15803d',
      '--sky':     '#0e7490',
      '--emerald': '#ca8a04',
      '--crimson': '#dc2626',
      '--bg':      '#f7fdf9',
      '--surface': '#ecfdf5',
      '--border':  '#bbf7d0',
      '--fg':      '#052e16',
      '--fg-2':    '#14532d',
      '--fg-3':    '#166534',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Dark',
    description: 'Mode gelap elegan — mengurangi kelelahan mata di malam hari',
    preview: ['#a78bfa', '#34d399', '#60a5fa'],
    vars: {
      '--grape':   '#a78bfa',
      '--sky':     '#60a5fa',
      '--emerald': '#34d399',
      '--crimson': '#f87171',
      '--bg':      '#0f0f14',
      '--surface': '#18181f',
      '--border':  '#2a2a35',
      '--fg':      '#f0f0f4',
      '--fg-2':    '#b0b0c0',
      '--fg-3':    '#7a7a90',
    },
  },
  'purple-gold': {
    id: 'purple-gold',
    name: 'Purple Gold',
    description: 'Gradien ungu & emas — identitas visual LMS BKPSDM Mojokerto',
    preview: ['#8a05ff', '#d67f2e', '#009e7a'],
    vars: {
      '--grape':   '#8a05ff',
      '--sky':     '#d67f2e',
      '--emerald': '#009e7a',
      '--crimson': '#e96770',
      '--bg':      '#fffef9',
      '--surface': '#fdf8f0',
      '--border':  '#e6d9c4',
      '--fg':      '#0d0d0d',
      '--fg-2':    '#3d2d20',
      '--fg-3':    '#7a6a5a',
    },
  },
};

// ── UI preference defaults ───────────────────────────────────────────────────────

export const DEFAULT_UI = {
  cardRadius:  'square',   // square | rounded | pill
  btnRadius:   'square',   // square | rounded | pill
  sidebar:     'full',     // full | compact | flush
  sidebarPos:  'left',     // left | right
  header:      true,       // show topbar
  density:     'normal',   // compact | normal | spacious
  shadow:      'flat',     // flat | soft | elevated
  motion:      true,       // enable transitions & animations
  tableStyle:  'plain',    // plain | striped
  formStyle:   'outlined', // outlined | filled | underline
  progressStyle: 'solid',  // solid | striped | thin
  toastStyle:  'solid',    // solid | soft | minimal
  toastPosition: 'top-right', // top-right | top-center | bottom-right | bottom-center
  fontScale:   'normal',   // compact | normal | large
  headingWeight: 'medium', // light | medium | bold
  badgeStyle:  'soft',     // soft | outline | solid
  modalStyle:  'centered', // centered | calm | sharp
};

const RADIUS_MAP    = { square: '0px',  rounded: '12px', pill: '22px' };
const DENSITY_MAP   = {
  compact:  { gap: '14px', pad: '16px 20px' },
  normal:   { gap: '20px', pad: '28px 32px' },
  spacious: { gap: '28px', pad: '44px 52px' },
};
const SHADOW_MAP    = {
  flat:     'none',
  soft:     '0 2px 10px rgba(0,0,0,0.07)',
  elevated: '0 8px 28px rgba(0,0,0,0.13)',
};
const FONT_SCALE_MAP = {
  compact: '13px',
  normal: '14px',
  large: '15px',
};
const HEADING_WEIGHT_MAP = {
  light: '400',
  medium: '500',
  bold: '700',
};

const STORAGE_KEY = 'corpu_theme';

// ── Apply color vars to document ─────────────────────────────────────────────────

function applyColorVars(vars) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.setProperty('--accent', vars['--grape']);
}

// ── Apply UI preference vars + data attributes ───────────────────────────────────

function applyUiPrefs(ui) {
  const root = document.documentElement;

  root.style.setProperty('--radius-card', RADIUS_MAP[ui.cardRadius] ?? '0px');
  root.style.setProperty('--radius-btn',  RADIUS_MAP[ui.btnRadius]  ?? '0px');

  const d = DENSITY_MAP[ui.density] ?? DENSITY_MAP.normal;
  root.style.setProperty('--density-gap', d.gap);
  root.style.setProperty('--density-pad', d.pad);

  root.style.setProperty('--card-shadow', SHADOW_MAP[ui.shadow] ?? 'none');
  root.style.setProperty('--app-font-size', FONT_SCALE_MAP[ui.fontScale] ?? FONT_SCALE_MAP.normal);
  root.style.setProperty('--heading-weight', HEADING_WEIGHT_MAP[ui.headingWeight] ?? HEADING_WEIGHT_MAP.medium);

  root.dataset.sidebar    = ui.sidebar;
  root.dataset.sidebarPos = ui.sidebarPos;
  root.dataset.header     = ui.header ? 'show' : 'hidden';
  root.dataset.motion     = ui.motion ? 'on' : 'off';
  root.dataset.table      = ui.tableStyle;
  root.dataset.form       = ui.formStyle;
  root.dataset.progress   = ui.progressStyle;
  root.dataset.toast      = ui.toastStyle;
  root.dataset.badge      = ui.badgeStyle;
  root.dataset.modal      = ui.modalStyle;
}

// ── Persistence ──────────────────────────────────────────────────────────────────

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function persist(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ── Context ──────────────────────────────────────────────────────────────────────

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [current, setCurrent] = useState(() => {
    const saved = loadSaved();
    return saved || { preset: 'corporate', custom: null, ui: DEFAULT_UI };
  });

  useEffect(() => {
    const base = THEMES[current.preset]?.vars || THEMES.corporate.vars;
    const colorVars = current.custom
      ? { ...base, '--grape': current.custom.primary, '--accent': current.custom.primary }
      : base;
    applyColorVars(colorVars);

    const ui = { ...DEFAULT_UI, ...(current.ui || {}) };
    applyUiPrefs(ui);
  }, [current]);

  const setPreset = (presetId) => {
    const next = { ...current, preset: presetId, custom: null };
    setCurrent(next);
    persist(next);
  };

  const setCustom = (primary) => {
    const next = { ...current, custom: { primary } };
    setCurrent(next);
    persist(next);
  };

  const resetCustom = () => {
    const next = { ...current, custom: null };
    setCurrent(next);
    persist(next);
  };

  const setUiPref = (key, value) => {
    const next = { ...current, ui: { ...DEFAULT_UI, ...(current.ui || {}), [key]: value } };
    setCurrent(next);
    persist(next);
  };

  const resetUi = () => {
    const next = { ...current, ui: DEFAULT_UI };
    setCurrent(next);
    persist(next);
  };

  const ui = { ...DEFAULT_UI, ...(current.ui || {}) };

  return (
    <ThemeContext.Provider value={{ current, ui, setPreset, setCustom, resetCustom, setUiPref, resetUi, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
