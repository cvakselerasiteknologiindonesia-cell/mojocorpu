import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlignCenter, AlignLeft, AlignRight,
  AlertTriangle, Award, Bold, CheckSquare, Copy, Eye, FileBadge, Image,
  Italic, Loader2, Minus, PanelLeft, PanelRight, Plus, Printer, QrCode,
  RotateCcw, Save, Send, Square, Trash2, Type,
  Underline, Upload, X,
} from 'lucide-react';

function IconLandscape({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 13H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M8.2 4H8.16146C7.63431 3.99998 7.17955 3.99997 6.80497 4.03057C6.40963 4.06287 6.01641 4.13419 5.63803 4.32698C5.07354 4.6146 4.6146 5.07354 4.32698 5.63803C4.13419 6.01641 4.06287 6.40963 4.03057 6.80497C3.99997 7.17954 3.99998 7.63431 4 8.16146V8.2V10H6V8.2C6 7.62345 6.00078 7.25117 6.02393 6.96784C6.04612 6.69617 6.0838 6.59545 6.10899 6.54601C6.20487 6.35785 6.35785 6.20487 6.54601 6.10899C6.59545 6.0838 6.69617 6.04612 6.96784 6.02393C7.25117 6.00078 7.62345 6 8.2 6H15.8C16.3766 6 16.7488 6.00078 17.0322 6.02393C17.3038 6.04612 17.4045 6.0838 17.454 6.10899C17.6422 6.20487 17.7951 6.35785 17.891 6.54601C17.9162 6.59545 17.9539 6.69617 17.9761 6.96784C17.9992 7.25117 18 7.62345 18 8.2V10H20V8.2V8.16148C20 7.63432 20 7.17955 19.9694 6.80497C19.9371 6.40963 19.8658 6.01641 19.673 5.63803C19.3854 5.07354 18.9265 4.6146 18.362 4.32698C17.9836 4.13419 17.5904 4.06287 17.195 4.03057C16.8205 3.99997 16.3657 3.99998 15.8385 4H15.8H8.2ZM20 12H18V15.8C18 16.3766 17.9992 16.7488 17.9761 17.0322C17.9539 17.3038 17.9162 17.4045 17.891 17.454C17.7951 17.6422 17.6422 17.7951 17.454 17.891C17.4045 17.9162 17.3038 17.9539 17.0322 17.9761C16.7488 17.9992 16.3766 18 15.8 18H8.2C7.62345 18 7.25117 17.9992 6.96784 17.9761C6.69617 17.9539 6.59545 17.9162 6.54601 17.891C6.35785 17.7951 6.20487 17.6422 6.10899 17.454C6.0838 17.4045 6.04612 17.3038 6.02393 17.0322C6.00078 16.7488 6 16.3766 6 15.8V12H4V15.8V15.8385C3.99998 16.3657 3.99997 16.8205 4.03057 17.195C4.06287 17.5904 4.13419 17.9836 4.32698 18.362C4.6146 18.9265 5.07354 19.3854 5.63803 19.673C6.01641 19.8658 6.40963 19.9371 6.80497 19.9694C7.17955 20 7.63432 20 8.16148 20H8.2H15.8H15.8385C16.3657 20 16.8205 20 17.195 19.9694C17.5904 19.9371 17.9836 19.8658 18.362 19.673C18.9265 19.3854 19.3854 18.9265 19.673 18.362C19.8658 17.9836 19.9371 17.5904 19.9694 17.195C20 16.8205 20 16.3657 20 15.8385V15.8V12Z" fill={color}/>
    </svg>
  );
}

function IconPortrait({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 3L11 21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M20 8.2L20 8.16146C20 7.63431 20 7.17955 19.9694 6.80497C19.9371 6.40963 19.8658 6.01641 19.673 5.63803C19.3854 5.07354 18.9265 4.6146 18.362 4.32698C17.9836 4.13419 17.5904 4.06287 17.195 4.03057C16.8205 3.99997 16.3657 3.99998 15.8385 4L15.8 4L14 4L14 6L15.8 6C16.3766 6 16.7488 6.00078 17.0322 6.02393C17.3038 6.04612 17.4045 6.0838 17.454 6.10899C17.6422 6.20487 17.7951 6.35785 17.891 6.54601C17.9162 6.59545 17.9539 6.69617 17.9761 6.96784C17.9992 7.25117 18 7.62345 18 8.2L18 15.8C18 16.3766 17.9992 16.7488 17.9761 17.0322C17.9539 17.3038 17.9162 17.4045 17.891 17.454C17.7951 17.6422 17.6422 17.7951 17.454 17.891C17.4045 17.9162 17.3038 17.9539 17.0322 17.9761C16.7488 17.9992 16.3766 18 15.8 18L14 18L14 20L15.8 20L15.8385 20C16.3657 20 16.8204 20 17.195 19.9694C17.5904 19.9371 17.9836 19.8658 18.362 19.673C18.9265 19.3854 19.3854 18.9265 19.673 18.362C19.8658 17.9836 19.9371 17.5904 19.9694 17.195C20 16.8205 20 16.3657 20 15.8385L20 15.8L20 8.2ZM12 20L12 18L8.2 18C7.62344 18 7.25117 17.9992 6.96783 17.9761C6.69617 17.9539 6.59545 17.9162 6.54601 17.891C6.35785 17.7951 6.20486 17.6422 6.10899 17.454C6.0838 17.4045 6.04612 17.3038 6.02393 17.0322C6.00078 16.7488 6 16.3766 6 15.8L6 8.2C6 7.62345 6.00078 7.25117 6.02393 6.96784C6.04612 6.69617 6.0838 6.59545 6.10899 6.54601C6.20487 6.35785 6.35785 6.20487 6.54601 6.10899C6.59545 6.0838 6.69617 6.04612 6.96783 6.02393C7.25117 6.00078 7.62345 6 8.2 6L12 6L12 4L8.2 4L8.16146 4C7.63431 3.99998 7.17954 3.99997 6.80497 4.03057C6.40963 4.06287 6.01641 4.13419 5.63803 4.32698C5.07354 4.6146 4.6146 5.07354 4.32698 5.63803C4.13419 6.01641 4.06287 6.40963 4.03057 6.80497C3.99997 7.17955 3.99998 7.63432 4 8.16148L4 8.2L4 15.8L4 15.8385C3.99998 16.3657 3.99997 16.8205 4.03057 17.195C4.06287 17.5904 4.13419 17.9836 4.32698 18.362C4.6146 18.9265 5.07354 19.3854 5.63803 19.673C6.01641 19.8658 6.40963 19.9371 6.80497 19.9694C7.17955 20 7.63432 20 8.16148 20L8.2 20L12 20Z" fill={color}/>
    </svg>
  );
}
import { toast } from 'sonner';
import api from '../api.js';
import { getRoleNames, hasAnyPermission } from '../utils/permissions.js';
import { CertPreviewCanvas as SharedCertPreview, CertPrintArea } from '../components/CertPreview.jsx';
import { safe } from '../utils/sanitize.js';

// ── Canvas dimensions ──────────────────────────────────────────────────────────

const PAPER_SIZES = {
  a4: {
    label: 'A4',
    landscape: { w: 840, h: 595 },
    portrait: { w: 595, h: 840 },
  },
  letter: {
    label: 'Letter',
    landscape: { w: 792, h: 612 },
    portrait: { w: 612, h: 792 },
  },
};

function canvasDims(paperSize = 'a4', orientation = 'landscape') {
  return PAPER_SIZES[paperSize]?.[orientation] || PAPER_SIZES.a4[orientation] || PAPER_SIZES.a4.landscape;
}

const FONTS = [
  'Inter', 'Georgia', 'Arial', 'Brawler',
  'Cookie', 'Alex Brush', 'Old English Text MT',
];

const SAMPLE = {
  participant_name: 'Budi Santoso, S.Kom.',
  nip: '198705142010011012',
  opd_name: 'Dinas Komunikasi dan Informatika',
  organization_unit_name: 'Bidang Infrastruktur TIK',
  event_title: 'KEPEMIMPINAN DIGITAL ASN',
  issued_date: '14 Mei 2026',
  certificate_number: 'CERT-CORPU-2026-001',
  verification_url: 'https://app.corpu.test/certificates/verify/CERT-CORPU-2026-001',
  official_name: 'Nama Pejabat',
  official_title: 'Kepala BKPSDM',
  predicate: 'Sangat Baik',
  final_score: '95',
  sessions: [
    { order: 1, title: 'Kepemimpinan dan Manajemen Organisasi', duration_minutes: 120, status: 'completed' },
    { order: 2, title: 'Komunikasi Efektif dan Presentasi', duration_minutes: 90, status: 'completed' },
    { order: 3, title: 'Teknologi Digital untuk ASN', duration_minutes: 60, status: 'completed' },
    { order: 4, title: 'Manajemen Risiko dan Pengambilan Keputusan', duration_minutes: 90, status: 'completed' },
  ],
  materials: [
    { order: 1, title: 'Modul Kepemimpinan Digital', type: 'document', description: 'Modul utama pembelajaran', duration_minutes: 90, learning_hours: 2 },
    { order: 2, title: 'Video Transformasi Digital ASN', type: 'video', description: 'Video pembelajaran mandiri', duration_minutes: 45, learning_hours: 1 },
    { order: 3, title: 'Studi Kasus Pelayanan Publik', type: 'presentation', description: 'Bahan diskusi kelompok', duration_minutes: 90, learning_hours: 2 },
  ],
};

const TABLE_COLUMN_OPTIONS = {
  materials: [
    { key: 'order', header: 'No.', width: 44 },
    { key: 'title', header: 'Learning Materials', width: null },
    { key: 'type', header: 'Jenis', width: 100 },
    { key: 'learning_hours', header: 'JP', width: 60 },
    { key: 'description', header: 'Deskripsi', width: 220 },
  ],
  sessions: [
    { key: 'order', header: 'No.', width: 44 },
    { key: 'title', header: 'Mata Pelajaran', width: null },
    { key: 'duration_minutes', header: 'Durasi (mnt)', width: 90 },
    { key: 'status', header: 'Status', width: 80 },
  ],
};

const CERTIFICATE_DRAFT_VERSION = 1;

function certificateDraftSnapshot({
  editing, tplName, paperSize, orientation, margin, bgColor,
  signatureName, signatureTitle, elements, backElements, activePage,
}) {
  return {
    version: CERTIFICATE_DRAFT_VERSION,
    templateId: editing?.id || null,
    tplName,
    paperSize,
    orientation,
    margin,
    bgColor,
    signatureName,
    signatureTitle,
    elements,
    backElements,
    activePage,
  };
}

function tok(s = '', values = SAMPLE) {
  return Object.entries({ ...SAMPLE, ...values }).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v ?? ''), s);
}

function totalLearningHours(materials = []) {
  return materials.reduce((total, material) => total + (Number(material.learning_hours) || (material.duration_minutes ? Math.ceil(Number(material.duration_minutes) / 45) : 0)), 0);
}

const uid = () => Math.random().toString(36).slice(2, 10);

// ── Default canvas elements ────────────────────────────────────────────────────

function defaultElements(orientation, paperSize = 'a4') {
  const { w, h } = canvasDims(paperSize, orientation);
  return [
    { id: uid(), type: 'text', label: 'heading',
      content: 'Certificate of Completion',
      x: 60, y: Math.round(h * 0.22), w: w - 120, h: 80,
      fontSize: 52, fontFamily: 'Old English Text MT', fontWeight: 'normal',
      fontStyle: 'normal', textDecoration: 'none', color: '#1a1a1a', textAlign: 'center', lineHeight: 1.15 },
    { id: uid(), type: 'text', label: 'subheading',
      content: 'This Certificate is Provided for',
      x: 60, y: Math.round(h * 0.42), w: w - 120, h: 50,
      fontSize: 28, fontFamily: 'Cookie', fontWeight: 'normal',
      fontStyle: 'normal', textDecoration: 'none', color: '#333', textAlign: 'center', lineHeight: 1.2 },
    { id: uid(), type: 'text', label: 'participant',
      content: '{{participant_name}}',
      x: 60, y: Math.round(h * 0.53), w: w - 120, h: 58,
      fontSize: 36, fontFamily: 'Alex Brush', fontWeight: 'normal',
      fontStyle: 'normal', textDecoration: 'none', color: '#1a56db', textAlign: 'center', lineHeight: 1.2 },
    { id: uid(), type: 'text', label: 'body',
      content: 'has successfully completed a training course of\n{{event_title}}',
      x: 60, y: Math.round(h * 0.65), w: w - 120, h: 68,
      fontSize: 15, fontFamily: 'Brawler', fontWeight: 'normal',
      fontStyle: 'normal', textDecoration: 'none', color: '#333', textAlign: 'center', lineHeight: 1.55 },
    { id: uid(), type: 'text', label: 'date',
      content: '{{issued_date}}',
      x: w - 270, y: Math.round(h * 0.82), w: 210, h: 26,
      fontSize: 13, fontFamily: 'Brawler', fontWeight: 'normal',
      fontStyle: 'normal', textDecoration: 'none', color: '#555', textAlign: 'right', lineHeight: 1.2 },
    { id: uid(), type: 'text', label: 'signature',
      content: '{{official_name}}\n{{official_title}}',
      x: w - 270, y: Math.round(h * 0.87), w: 210, h: 48,
      fontSize: 13, fontFamily: 'Brawler', fontWeight: 'bold',
      fontStyle: 'normal', textDecoration: 'none', color: '#1a1a1a', textAlign: 'center', lineHeight: 1.4 },
  ];
}

// ── Default back-page canvas elements ─────────────────────────────────────────

function defaultBackElements(orientation, paperSize = 'a4') {
  const { w, h } = canvasDims(paperSize, orientation);
  const pad = 40;
  return [
    {
      id: uid(), type: 'text', label: 'back-title',
      content: 'Learning Path',
      x: pad, y: 28, w: w - pad * 2, h: 50,
      fontSize: 26, fontFamily: 'Brawler', fontWeight: 'bold',
      fontStyle: 'normal', textDecoration: 'none', color: '#1a1a1a', textAlign: 'center', lineHeight: 1.2,
    },
    {
      id: uid(), type: 'text', label: 'back-event',
      content: '{{event_title}}',
      x: pad, y: 80, w: w - pad * 2, h: 28,
      fontSize: 13, fontFamily: 'Brawler', fontWeight: 'normal',
      fontStyle: 'normal', textDecoration: 'none', color: '#555', textAlign: 'center', lineHeight: 1.3,
    },
    {
      id: uid(), type: 'table', label: 'materials_table', dataSource: 'materials',
      x: pad, y: 122, w: w - pad * 2, h: h - 178,
      fontSize: 11, fontFamily: 'Inter',
      headerColor: '#ffffff', headerBg: '#1a1a1a',
      rowColor: '#1a1a1a', rowBg: '#ffffff', altRowBg: '#f6f6f8',
      borderColor: '#d0d0d0',
      columns: [
        { key: 'order', header: 'No.', width: 44 },
        { key: 'title', header: 'Learning Materials', width: null },
        { key: 'type', header: 'Jenis', width: 100 },
        { key: 'learning_hours', header: 'JP', width: 60 },
        { key: 'description', header: 'Deskripsi', width: 220 },
      ],
    },
    {
      id: uid(), type: 'text', label: 'back-total-jp',
      content: 'Total Jam Pelajaran: {{total_learning_hours}} JP',
      x: pad, y: h - 62, w: w - pad * 2, h: 24,
      fontSize: 12, fontFamily: 'Inter', fontWeight: 'bold',
      fontStyle: 'normal', textDecoration: 'none', color: '#1a1a1a', textAlign: 'right', lineHeight: 1.2,
    },
    {
      id: uid(), type: 'text', label: 'back-cert-number',
      content: '{{certificate_number}}',
      x: pad, y: h - 34, w: w - pad * 2, h: 22,
      fontSize: 10, fontFamily: 'Inter', fontWeight: 'normal',
      fontStyle: 'normal', textDecoration: 'none', color: '#888', textAlign: 'center', lineHeight: 1.2,
    },
  ];
}

// ── Resize handles ─────────────────────────────────────────────────────────────

const HANDLES = [
  { d: 'nw', cx: 0, cy: 0 }, { d: 'n', cx: 0.5, cy: 0 }, { d: 'ne', cx: 1, cy: 0 },
  { d: 'e', cx: 1, cy: 0.5 },
  { d: 'se', cx: 1, cy: 1 }, { d: 's', cx: 0.5, cy: 1 }, { d: 'sw', cx: 0, cy: 1 },
  { d: 'w', cx: 0, cy: 0.5 },
];
const CURSOR = { n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize', nw: 'nw-resize', ne: 'ne-resize', se: 'se-resize', sw: 'sw-resize' };

function qrCells(value = '') {
  const text = String(value || 'verify');
  const cells = [];
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const finder =
        (x < 7 && y < 7) ||
        (x > 13 && y < 7) ||
        (x < 7 && y > 13);
      if (finder) {
        const lx = x < 7 ? x : x - 14;
        const ly = y < 7 ? y : y - 14;
        if (lx === 0 || ly === 0 || lx === 6 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4)) cells.push([x, y]);
        continue;
      }
      const code = text.charCodeAt((x * 7 + y * 11) % text.length) || 37;
      if (((code + x * 13 + y * 17 + x * y) % 5) < 2) cells.push([x, y]);
    }
  }
  return cells;
}

function VerificationQr({ value, fg = '#111827', bg = '#ffffff' }) {
  const cells = qrCells(value);
  return (
    <svg viewBox="0 0 21 21" width="100%" height="100%" role="img" aria-label="Verification code">
      <rect width="21" height="21" fill={bg} />
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fg} />)}
    </svg>
  );
}

// ── Canvas element ─────────────────────────────────────────────────────────────

function CanvasEl({ el, selected, editingId, onSelect, onStartEdit, onContentChange, tokenValues = SAMPLE }) {
  const isEditing = editingId === el.id;
  const textRef = useRef(null);

  const baseStyle = {
    position: 'absolute',
    left: el.x, top: el.y, width: el.w, height: el.h,
    boxSizing: 'border-box',
    outline: selected ? '2px solid #3b82f6' : 'none',
    cursor: isEditing ? 'text' : 'move',
    userSelect: isEditing ? 'text' : 'none',
    overflow: 'hidden',
  };

  if (el.type === 'image') {
    return (
      <div
        data-el={el.id}
        style={baseStyle}
        onMouseDown={() => { if (!isEditing) onSelect(); }}
      >
        {el.src
          ? <img src={el.src} alt="" style={{ width: '100%', height: '100%', objectFit: el.objectFit || 'contain', borderRadius: el.borderRadius || 0, opacity: el.opacity ?? 1 }} />
          : <div style={{ width: '100%', height: '100%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #9ca3af', borderRadius: el.borderRadius || 0 }}>
              <Image size={24} color="#9ca3af" />
            </div>
        }
      </div>
    );
  }

  if (el.type === 'qr') {
    const verificationUrl = tok(el.content || '{{verification_url}}', tokenValues);
    return (
      <div
        data-el={el.id}
        style={{ ...baseStyle, background: el.backgroundColor || '#ffffff', padding: el.padding ?? 6 }}
        onMouseDown={() => { if (!isEditing) onSelect?.(); }}
        title={verificationUrl}
      >
        <VerificationQr value={verificationUrl} fg={el.color || '#111827'} bg={el.backgroundColor || '#ffffff'} />
      </div>
    );
  }

  if (el.type === 'table') {
    const rows = el.dataSource === 'materials'
      ? (tokenValues.materials || SAMPLE.materials)
      : (tokenValues.sessions || SAMPLE.sessions);
    const cols = el.columns || [
      { key: 'order', header: 'No.', width: 44 },
      { key: 'title', header: 'Mata Pelajaran', width: null },
      { key: 'duration_minutes', header: 'Durasi (mnt)', width: 90 },
      { key: 'status', header: 'Status', width: 80 },
    ];
    const statusLabel = (s) => {
      if (!s || s === 'completed') return 'Selesai';
      if (s === 'ongoing') return 'Berlangsung';
      if (s === 'draft') return 'Draft';
      return s;
    };
    return (
      <div
        data-el={el.id}
        style={{ ...baseStyle, overflow: 'hidden' }}
        onMouseDown={() => onSelect?.()}
      >
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: el.fontSize || 11,
          fontFamily: `"${el.fontFamily || 'Inter'}", sans-serif`,
          tableLayout: 'fixed',
        }}>
          <thead>
            <tr>
              {cols.map((col) => (
                <th key={col.key} style={{
                  width: col.width ? col.width : 'auto',
                  background: el.headerBg || '#1a1a1a',
                  color: el.headerColor || '#ffffff',
                  padding: '5px 8px',
                  textAlign: col.key === 'order' ? 'center' : 'left',
                  fontWeight: 600,
                  border: `1px solid ${el.borderColor || '#d0d0d0'}`,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                {cols.map((col) => (
                  <td key={col.key} style={{
                    padding: '4px 8px',
                    background: idx % 2 === 0 ? (el.rowBg || '#ffffff') : (el.altRowBg || '#f6f6f8'),
                    color: el.rowColor || '#1a1a1a',
                    border: `1px solid ${el.borderColor || '#d0d0d0'}`,
                    textAlign: col.key === 'order' ? 'center' : 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: col.key === 'title' ? 'normal' : 'nowrap',
                  }}>
                    {col.key === 'status' ? statusLabel(row[col.key]) : (row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Text element
  const textStyle = {
    width: '100%', height: '100%',
    fontSize: el.fontSize,
    fontFamily: `"${el.fontFamily}", serif`,
    fontWeight: el.fontWeight || 'normal',
    fontStyle: el.fontStyle || 'normal',
    textDecoration: el.textDecoration || 'none',
    color: el.color || '#000',
    textAlign: el.textAlign || 'left',
    lineHeight: el.lineHeight || 1.4,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    outline: 'none',
    padding: 2,
    boxSizing: 'border-box',
    cursor: isEditing ? 'text' : 'inherit',
    overflow: 'hidden',
  };

  return (
    <div
      data-el={el.id}
      style={baseStyle}
      onMouseDown={() => { if (!isEditing) onSelect(); }}
      onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(); setTimeout(() => textRef.current?.focus(), 0); }}
    >
      {isEditing
        ? <div
            ref={textRef}
            contentEditable
            suppressContentEditableWarning
            style={textStyle}
            onBlur={(e) => onContentChange(e.currentTarget.innerText)}
            dangerouslySetInnerHTML={{ __html: safe(tok(el.content, tokenValues).replace(/\n/g, '<br>')) }}
          />
        : <div style={textStyle}>{tok(el.content, tokenValues)}</div>
      }
    </div>
  );
}

// ── Image upload helper ────────────────────────────────────────────────────────

async function uploadImage(file, onSuccess, onError) {
  const fd = new FormData();
  fd.append('image', file);
  try {
    const res = await api.post('/certificate-templates/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    onSuccess(res.data.data);
  } catch (err) {
    onError(err.response?.data?.message || 'Gagal mengunggah.');
  }
}

// ── Canvas editor ──────────────────────────────────────────────────────────────

function CanvasEditor({ paperSize, orientation, margin, bgColor, elements, selected, editingId, setSelected, setEditingId, setElements, tokenValues = SAMPLE }) {
  const canvasRef  = useRef(null);
  const dragRef    = useRef(null);     // { mode:'move'|'resize', id, dir?, startMX, startMY, startEl }
  const { w, h }   = canvasDims(paperSize, orientation);

  function findEl(id) { return elements.find((el) => el.id === id); }

  function updateEl(id, patch) {
    setElements((prev) => prev.map((el) => el.id === id ? { ...el, ...patch } : el));
  }

  function onDrop(e) {
    e.preventDefault();
    const raw = e.dataTransfer.getData('new-element');
    if (!raw) return;
    const config = JSON.parse(raw);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left - config.w / 2);
    const y = Math.round(e.clientY - rect.top - config.h / 2);
    setElements((prev) => [...prev, { ...config, id: uid(), x, y }]);
    setSelected(null);
  }

  function onCanvasMouseDown(e) {
    // Check for handle
    const handleEl = e.target.closest('[data-handle]');
    if (handleEl) {
      const id = handleEl.dataset.elementId;
      const dir = handleEl.dataset.handle;
      const el = findEl(id);
      dragRef.current = { mode: 'resize', id, dir, startMX: e.clientX, startMY: e.clientY, startEl: { x: el.x, y: el.y, w: el.w, h: el.h } };
      e.preventDefault();
      return;
    }
    // Check for element
    const elDiv = e.target.closest('[data-el]');
    if (elDiv) {
      const id = elDiv.dataset.el;
      if (editingId === id) return; // allow text editing
      setSelected(id);
      const el = findEl(id);
      dragRef.current = { mode: 'move', id, startMX: e.clientX, startMY: e.clientY, startEl: { x: el.x, y: el.y } };
      e.preventDefault();
      return;
    }
    // Click on empty canvas
    if (editingId) setEditingId(null);
    setSelected(null);
  }

  function onCanvasMouseMove(e) {
    const dr = dragRef.current;
    if (!dr) return;
    const dx = e.clientX - dr.startMX;
    const dy = e.clientY - dr.startMY;

    if (dr.mode === 'move') {
      const el = dr.startEl;
      updateEl(dr.id, {
        x: Math.round(el.x + dx),
        y: Math.round(el.y + dy),
      });
    } else if (dr.mode === 'resize') {
      const s = dr.startEl;
      let { x, y, w: ew, h: eh } = s;
      const dir = dr.dir;
      const MIN_W = 40, MIN_H = 20;
      if (dir.includes('e')) ew = Math.max(MIN_W, s.w + dx);
      if (dir.includes('s')) eh = Math.max(MIN_H, s.h + dy);
      if (dir.includes('w')) { x = Math.min(s.x + s.w - MIN_W, s.x + dx); ew = Math.max(MIN_W, s.w - dx); }
      if (dir.includes('n')) { y = Math.min(s.y + s.h - MIN_H, s.y + dy); eh = Math.max(MIN_H, s.h - dy); }
      updateEl(dr.id, { x: Math.round(x), y: Math.round(y), w: Math.round(ew), h: Math.round(eh) });
    }
  }

  function onCanvasMouseUp() { dragRef.current = null; }

  useEffect(() => {
    window.addEventListener('mousemove', onCanvasMouseMove);
    window.addEventListener('mouseup', onCanvasMouseUp);
    return () => {
      window.removeEventListener('mousemove', onCanvasMouseMove);
      window.removeEventListener('mouseup', onCanvasMouseUp);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: w, height: h, flexShrink: 0 }}
      ref={canvasRef}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      style={{
        position: 'relative', width: w, height: h, flexShrink: 0,
        background: bgColor,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}
    >
      {/* Drop hint */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: elements.length === 0 ? 0.2 : 0 }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <Type size={40} style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: 14 }}>Seret elemen dari panel kiri ke sini</p>
        </div>
      </div>

      {/* Elements */}
      {elements.map((el) => (
        <CanvasEl
          key={el.id}
          el={el}
          selected={selected === el.id}
          editingId={editingId}
          onSelect={() => setSelected(el.id)}
          onStartEdit={() => setEditingId(el.id)}
          onContentChange={(content) => updateEl(el.id, { content })}
          tokenValues={tokenValues}
        />
      ))}

      {margin > 0 && (
        <div
          style={{
            position: 'absolute',
            left: margin,
            top: margin,
            width: Math.max(0, w - margin * 2),
            height: Math.max(0, h - margin * 2),
            border: '1px dashed rgba(59,130,246,0.55)',
            pointerEvents: 'none',
            boxSizing: 'border-box',
            zIndex: 90,
          }}
        />
      )}

      {/* Resize handles for selected element */}
      {selected && editingId !== selected && (() => {
        const el = findEl(selected);
        if (!el) return null;
        return HANDLES.map(({ d, cx, cy }) => (
          <div
            key={d}
            data-handle={d}
            data-element-id={selected}
            style={{
              position: 'absolute',
              left: el.x + cx * el.w - 5,
              top:  el.y + cy * el.h - 5,
              width: 10, height: 10,
              background: '#fff',
              border: '2px solid #3b82f6',
              borderRadius: 2,
              cursor: CURSOR[d],
              zIndex: 100,
            }}
          />
        ));
      })()}
    </div>
  );
}

// ── Palette panel ──────────────────────────────────────────────────────────────

const PALETTE_ITEMS = [
  { group: 'Teks',
    items: [
      { label: 'Heading', icon: 'H', config: { type: 'text', label: 'heading', content: 'Heading', fontSize: 48, fontFamily: 'Old English Text MT', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#1a1a1a', textAlign: 'center', lineHeight: 1.2, w: 600, h: 70 } },
      { label: 'Subheading', icon: 'S', config: { type: 'text', label: 'subheading', content: 'Subheading', fontSize: 28, fontFamily: 'Cookie', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#333', textAlign: 'center', lineHeight: 1.2, w: 500, h: 48 } },
      { label: 'Teks Biasa', icon: 'T', config: { type: 'text', label: 'body', content: 'Teks konten sertifikat', fontSize: 15, fontFamily: 'Brawler', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#333', textAlign: 'center', lineHeight: 1.5, w: 500, h: 50 } },
    ] },
  { group: 'Variabel',
    items: [
      { label: 'Nama Peserta', icon: '👤', config: { type: 'text', label: 'participant', content: '{{participant_name}}', fontSize: 34, fontFamily: 'Alex Brush', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#1a56db', textAlign: 'center', lineHeight: 1.2, w: 500, h: 55 } },
      { label: 'NIP', icon: '🪪', config: { type: 'text', label: 'nip', content: '{{nip}}', fontSize: 13, fontFamily: 'Inter', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#333', textAlign: 'center', lineHeight: 1.2, w: 260, h: 24 } },
      { label: 'OPD', icon: '🏛', config: { type: 'text', label: 'opd', content: '{{opd_name}}', fontSize: 13, fontFamily: 'Brawler', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#333', textAlign: 'center', lineHeight: 1.3, w: 400, h: 28 } },
      { label: 'Unit Kerja', icon: '🏢', config: { type: 'text', label: 'unit', content: '{{organization_unit_name}}', fontSize: 12, fontFamily: 'Inter', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#555', textAlign: 'center', lineHeight: 1.2, w: 360, h: 24 } },
      { label: 'Nama Pelatihan', icon: '📚', config: { type: 'text', label: 'event', content: '{{event_title}}', fontSize: 16, fontFamily: 'Brawler', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'underline', color: '#1a1a1a', textAlign: 'center', lineHeight: 1.4, w: 500, h: 40 } },
      { label: 'Tanggal', icon: '📅', config: { type: 'text', label: 'date', content: '{{issued_date}}', fontSize: 13, fontFamily: 'Brawler', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#555', textAlign: 'right', lineHeight: 1.2, w: 200, h: 28 } },
      { label: 'No. Sertifikat', icon: '#', config: { type: 'text', label: 'certno', content: '{{certificate_number}}', fontSize: 12, fontFamily: 'Inter', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#888', textAlign: 'right', lineHeight: 1.2, w: 240, h: 24 } },
      { label: 'Predikat', icon: '⭐', config: { type: 'text', label: 'predicate', content: '{{predicate}}', fontSize: 18, fontFamily: 'Brawler', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', color: '#1a56db', textAlign: 'center', lineHeight: 1.2, w: 240, h: 32 } },
      { label: 'Nilai Akhir', icon: '💯', config: { type: 'text', label: 'final_score', content: '{{final_score}}', fontSize: 14, fontFamily: 'Inter', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', color: '#333', textAlign: 'center', lineHeight: 1.2, w: 120, h: 26 } },
      { label: 'QR Verifikasi', icon: '▦', config: { type: 'qr', label: 'verification_qr', content: '{{verification_url}}', color: '#111827', backgroundColor: '#ffffff', padding: 6, w: 86, h: 86 } },
    ] },
  { group: 'Gambar',
    items: [
      { label: 'Logo', icon: '🏷', config: { type: 'image', label: 'logo', src: '', objectFit: 'contain', borderRadius: 0, opacity: 1, w: 100, h: 100 } },
      { label: 'Stempel', icon: '⭕', config: { type: 'image', label: 'stamp', src: '', objectFit: 'contain', borderRadius: '50%', opacity: 1, w: 90, h: 90 } },
    ] },
  { group: 'Tabel',
    items: [
      { label: 'Tabel Materi', icon: '📋', config: { type: 'table', label: 'materials_table', dataSource: 'materials', fontSize: 11, fontFamily: 'Inter', headerColor: '#ffffff', headerBg: '#1a1a1a', rowColor: '#1a1a1a', rowBg: '#ffffff', altRowBg: '#f6f6f8', borderColor: '#d0d0d0', columns: [{ key: 'order', header: 'No.', width: 44 }, { key: 'title', header: 'Learning Materials', width: null }, { key: 'type', header: 'Jenis', width: 100 }, { key: 'learning_hours', header: 'JP', width: 60 }, { key: 'description', header: 'Deskripsi', width: 220 }], w: 500, h: 160 } },
    ] },
];

function PaletteItem({ item, onAdd }) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('new-element', JSON.stringify({ ...item.config, x: 50, y: 50 })); }}
      onClick={() => onAdd({ ...item.config, id: uid(), x: 50, y: 50 })}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
        cursor: 'grab', border: '1px solid var(--border)', fontSize: 12,
        background: 'var(--surface)', userSelect: 'none',
        transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'color-mix(in srgb,var(--accent) 6%,transparent)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
    >
      <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
      <span style={{ fontWeight: 500, color: 'var(--fg-2)' }}>{item.label}</span>
    </div>
  );
}

function PalettePanel({ onAdd }) {
  return (
    <div style={{ padding: 12, borderBottom: '1px solid var(--border)', overflowY: 'auto' }}>
      {PALETTE_ITEMS.map(({ group, items }) => (
        <div key={group} style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)' }}>{group}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map((item) => <PaletteItem key={item.label} item={item} onAdd={onAdd} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Properties panel ───────────────────────────────────────────────────────────

function PropSection({ label, children }) {
  return (
    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
      <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)' }}>{label}</p>
      {children}
    </div>
  );
}

function AssetGallery({ assets = [], onPick, emptyText = 'Belum ada gambar.' }) {
  if (!assets.length) {
    return <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>{emptyText}</p>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
      {assets.map((asset) => (
        <button
          key={asset.id}
          type="button"
          title={asset.name}
          onClick={() => onPick(asset)}
          style={{
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: 0,
            aspectRatio: '1 / 1',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          <img src={asset.url} alt={asset.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </button>
      ))}
    </div>
  );
}

function PropertiesPanel({ element, onUpdate, paperSize, setPaperSize, orientation, margin, setMargin, bgColor, setBgColor, onAddBg, imageAssets = [], onImageUploaded }) {
  const imgRef    = useRef(null);   // bg image upload
  const imgUpRef  = useRef(null);   // element image upload
  const [uploading, setUploading] = useState(false);
  const [upImg, setUpImg]         = useState(false);

  if (!element) {
    return (
      <div>
        <PropSection label="Canvas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Ukuran Kertas</label>
              <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)} style={{ width: '100%', fontSize: 12 }}>
                {Object.entries(PAPER_SIZES).map(([key, size]) => <option key={key} value={key}>{size.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Margin: {margin}px</label>
              <input type="range" min={0} max={80} step={2} value={margin} onChange={(e) => setMargin(parseInt(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Warna Latar</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: 32, height: 28, padding: 2, border: '1px solid var(--border)', cursor: 'pointer' }} />
                <span style={{ fontSize: 11, fontFamily: 'Space Mono, monospace' }}>{bgColor}</span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Gambar Latar</label>
              <button
                className="outline-button compact"
                style={{ width: '100%', fontSize: 11 }}
                disabled={uploading}
                onClick={() => imgRef.current?.click()}
              >
                {uploading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={12} />}
                {uploading ? 'Mengunggah…' : 'Upload Gambar Latar'}
              </button>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--fg-3)' }}>Gambar akan menjadi elemen canvas — klik untuk pilih, seret untuk pindah, tarik sudut untuk resize.</p>
              <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                const f = e.target.files[0];
                if (!f) return;
                setUploading(true);
                await uploadImage(f, (asset) => {
                  onAddBg(asset.url);
                  onImageUploaded?.();
                  toast.success('Gambar latar ditambahkan dan tersimpan.');
                }, toast.error);
                setUploading(false);
                e.target.value = '';
              }} />
            </div>
          </div>
        </PropSection>
        <PropSection label="Galeri Gambar">
          <AssetGallery
            assets={imageAssets}
            onPick={(asset) => {
              onAddBg(asset.url);
              toast.success('Gambar dari galeri ditambahkan.');
            }}
          />
        </PropSection>
        <div style={{ padding: 12, fontSize: 12, color: 'var(--fg-3)', textAlign: 'center' }}>
          Klik elemen pada canvas untuk mengedit propertinya.
        </div>
      </div>
    );
  }

  const el = element;
  const up = (k, v) => onUpdate(el.id, { [k]: v });

  if (el.type === 'image') {
    return (
      <div>
        <PropSection label="Gambar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {el.src
              ? <div style={{ position: 'relative' }}>
                  <img src={el.src} alt="" style={{ width: '100%', height: 80, objectFit: 'contain', display: 'block', background: '#f9f9f9' }} />
                  <button onClick={() => up('src', '')} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 2, color: '#fff', cursor: 'pointer', padding: '2px 5px', display: 'flex' }}><X size={11} /></button>
                </div>
              : <button className="outline-button compact" style={{ fontSize: 11 }} disabled={upImg} onClick={() => imgUpRef.current?.click()}>
                  {upImg ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={12} />}
                  {upImg ? 'Mengunggah…' : 'Upload Gambar'}
                </button>
            }
            <input ref={imgUpRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
              const f = e.target.files[0];
              if (!f) return;
              setUpImg(true);
              await uploadImage(f, (asset) => {
                up('src', asset.url);
                onImageUploaded?.();
                toast.success('Gambar tersimpan dan diterapkan.');
              }, toast.error);
              setUpImg(false);
              e.target.value = '';
            }} />
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--fg-3)' }}>Pilih dari Galeri</label>
              <AssetGallery assets={imageAssets} onPick={(asset) => up('src', asset.url)} />
            </div>
          </div>
        </PropSection>
        <PropSection label="Tampilan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Fit Gambar</label>
              <select value={el.objectFit || 'contain'} onChange={(e) => up('objectFit', e.target.value)} style={{ width: '100%', fontSize: 12 }}>
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
                <option value="fill">Fill</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Radius Sudut: {el.borderRadius ?? 0}px</label>
              <input type="range" min={0} max={50} value={el.borderRadius ?? 0} onChange={(e) => up('borderRadius', parseInt(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Opasitas: {Math.round((el.opacity ?? 1) * 100)}%</label>
              <input type="range" min={0} max={1} step={0.05} value={el.opacity ?? 1} onChange={(e) => up('opacity', parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
          </div>
        </PropSection>
        <PropSection label="Posisi & Ukuran">
          <SizePositionControls el={el} onUpdate={onUpdate} maxW={canvasDims(paperSize, orientation).w} maxH={canvasDims(paperSize, orientation).h} />
        </PropSection>
      </div>
    );
  }

  if (el.type === 'qr') {
    return (
      <div>
        <PropSection label="Verifikasi">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ width: 92, height: 92, padding: 8, border: '1px solid var(--border)', background: el.backgroundColor || '#fff' }}>
              <VerificationQr value={SAMPLE.verification_url} fg={el.color || '#111827'} bg={el.backgroundColor || '#ffffff'} />
            </div>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--fg-3)' }}>Gunakan token verifikasi agar setiap sertifikat memiliki URL validasi unik.</p>
          </div>
        </PropSection>
        <PropSection label="Tampilan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Warna QR</label>
              <input type="color" value={el.color || '#111827'} onChange={(e) => up('color', e.target.value)} style={{ width: 32, height: 28, padding: 2, border: '1px solid var(--border)', cursor: 'pointer' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Warna Latar</label>
              <input type="color" value={el.backgroundColor || '#ffffff'} onChange={(e) => up('backgroundColor', e.target.value)} style={{ width: 32, height: 28, padding: 2, border: '1px solid var(--border)', cursor: 'pointer' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Padding: {el.padding ?? 6}px</label>
              <input type="range" min={0} max={16} value={el.padding ?? 6} onChange={(e) => up('padding', parseInt(e.target.value))} style={{ width: '100%' }} />
            </div>
          </div>
        </PropSection>
        <PropSection label="Posisi & Ukuran">
          <SizePositionControls el={el} onUpdate={onUpdate} maxW={canvasDims(paperSize, orientation).w} maxH={canvasDims(paperSize, orientation).h} />
        </PropSection>
      </div>
    );
  }

  if (el.type === 'table') {
    const dataSource = el.dataSource || 'sessions';
    const availableColumns = TABLE_COLUMN_OPTIONS[dataSource];
    const columns = el.columns || availableColumns;
    return (
      <div>
        <PropSection label="Data Tabel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Sumber Data</label>
              <select
                value={dataSource}
                onChange={(e) => {
                  const next = e.target.value;
                  onUpdate(el.id, { dataSource: next, columns: TABLE_COLUMN_OPTIONS[next] });
                }}
                style={{ width: '100%', fontSize: 12 }}
              >
                <option value="materials">Learning Materials</option>
                <option value="sessions">Sesi Pembelajaran</option>
              </select>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>Kolom dan Judul</span>
              {availableColumns.map((option) => {
                const activeColumn = columns.find((column) => column.key === option.key);
                return (
                  <div key={option.key} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 5, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!activeColumn}
                      onChange={(e) => {
                        const nextColumns = e.target.checked
                          ? availableColumns.filter((candidate) => candidate.key === option.key || columns.some((column) => column.key === candidate.key)).map((candidate) => columns.find((column) => column.key === candidate.key) || candidate)
                          : columns.filter((column) => column.key !== option.key);
                        up('columns', nextColumns);
                      }}
                    />
                    <input
                      value={activeColumn?.header || option.header}
                      disabled={!activeColumn}
                      onChange={(e) => up('columns', columns.map((column) => column.key === option.key ? { ...column, header: e.target.value } : column))}
                      style={{ width: '100%', fontSize: 11 }}
                    />
                  </div>
                );
              })}
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Ukuran Font</label>
              <input type="number" min={8} max={20} value={el.fontSize || 11} onChange={(e) => up('fontSize', parseInt(e.target.value))} style={{ width: '100%', fontSize: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Latar Header</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="color" value={el.headerBg || '#1a1a1a'} onChange={(e) => up('headerBg', e.target.value)} style={{ width: 32, height: 28, padding: 2, border: '1px solid var(--border)', cursor: 'pointer' }} />
                <input type="color" value={el.headerColor || '#ffffff'} onChange={(e) => up('headerColor', e.target.value)} style={{ width: 32, height: 28, padding: 2, border: '1px solid var(--border)', cursor: 'pointer' }} title="Warna teks header" />
                <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>Latar · Teks</span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Baris Genap (alt)</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="color" value={el.altRowBg || '#f6f6f8'} onChange={(e) => up('altRowBg', e.target.value)} style={{ width: 32, height: 28, padding: 2, border: '1px solid var(--border)', cursor: 'pointer' }} />
                <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>Warna baris alt</span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Warna Border</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="color" value={el.borderColor || '#d0d0d0'} onChange={(e) => up('borderColor', e.target.value)} style={{ width: 32, height: 28, padding: 2, border: '1px solid var(--border)', cursor: 'pointer' }} />
                <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>Garis tabel</span>
              </div>
            </div>
          </div>
        </PropSection>
        <PropSection label="Posisi & Ukuran">
          <SizePositionControls el={el} onUpdate={onUpdate} maxW={canvasDims(paperSize, orientation).w} maxH={canvasDims(paperSize, orientation).h} />
        </PropSection>
      </div>
    );
  }

  // Text element
  return (
    <div>
      <PropSection label="Font">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Font Family</label>
            <select value={el.fontFamily || 'Inter'} onChange={(e) => up('fontFamily', e.target.value)} style={{ width: '100%', fontSize: 12 }}>
              {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Ukuran (px)</label>
              <input type="number" min={6} max={200} value={el.fontSize || 16} onChange={(e) => up('fontSize', parseInt(e.target.value))} style={{ width: '100%', fontSize: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Tinggi Baris</label>
              <input type="number" min={0.8} max={3} step={0.1} value={el.lineHeight || 1.4} onChange={(e) => up('lineHeight', parseFloat(e.target.value))} style={{ width: 60, fontSize: 12 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { icon: <Bold size={13} />, key: 'fontWeight', on: 'bold', off: 'normal' },
              { icon: <Italic size={13} />, key: 'fontStyle', on: 'italic', off: 'normal' },
              { icon: <Underline size={13} />, key: 'textDecoration', on: 'underline', off: 'none' },
            ].map(({ icon, key, on, off }) => (
              <button key={key} type="button"
                onClick={() => up(key, el[key] === on ? off : on)}
                style={{ flex: 1, padding: '5px 4px', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: el[key] === on ? 'var(--accent)' : 'var(--surface)', color: el[key] === on ? '#fff' : 'var(--fg)' }}>
                {icon}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { icon: <AlignLeft size={13} />, val: 'left' },
              { icon: <AlignCenter size={13} />, val: 'center' },
              { icon: <AlignRight size={13} />, val: 'right' },
            ].map(({ icon, val }) => (
              <button key={val} type="button"
                onClick={() => up('textAlign', val)}
                style={{ flex: 1, padding: '5px 4px', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: el.textAlign === val ? 'var(--accent)' : 'var(--surface)', color: el.textAlign === val ? '#fff' : 'var(--fg)' }}>
                {icon}
              </button>
            ))}
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 3 }}>Warna Teks</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="color" value={el.color || '#000000'} onChange={(e) => up('color', e.target.value)} style={{ width: 32, height: 28, padding: 2, border: '1px solid var(--border)', cursor: 'pointer' }} />
              <input type="text" value={el.color || '#000000'} onChange={(e) => up('color', e.target.value)} style={{ flex: 1, fontSize: 11, fontFamily: 'Space Mono, monospace' }} />
            </div>
          </div>
        </div>
      </PropSection>
      <PropSection label="Konten">
        <textarea
          value={el.content}
          onChange={(e) => onUpdate(el.id, { content: e.target.value })}
          rows={3}
          style={{ width: '100%', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
          placeholder="Token: {{participant_name}}, {{event_title}}, {{issued_date}}, {{certificate_number}}, {{predicate}}, {{final_score}}"
        />
        <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--fg-3)' }}>Gunakan Enter untuk baris baru. Token diganti dengan data sertifikat saat diterbitkan.</p>
      </PropSection>
      <PropSection label="Posisi & Ukuran">
        <SizePositionControls el={el} onUpdate={onUpdate} maxW={canvasDims(paperSize, orientation).w} maxH={canvasDims(paperSize, orientation).h} />
      </PropSection>
    </div>
  );
}

function SizePositionControls({ el, onUpdate, maxW, maxH }) {
  const up = (k, v) => onUpdate(el.id, { [k]: v });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {[
        { label: 'X', key: 'x', min: -maxW, max: maxW * 2 },
        { label: 'Y', key: 'y', min: -maxH, max: maxH * 2 },
        { label: 'W', key: 'w', min: 20, max: maxW },
        { label: 'H', key: 'h', min: 10, max: maxH },
      ].map(({ label, key, min, max }) => (
        <div key={key}>
          <label style={{ fontSize: 10, color: 'var(--fg-3)', display: 'block', marginBottom: 2 }}>{label} (px)</label>
          <input type="number" min={min} max={max} value={el[key] ?? 0} onChange={(e) => up(key, parseInt(e.target.value))}
            style={{ width: '100%', fontSize: 11 }} />
        </div>
      ))}
    </div>
  );
}

function PreviewCanvas({ template, participant }) {
  const tpl = template?.layout?.canvas_elements?.length ? template : {
    ...template,
    layout: { ...template?.layout, canvas_elements: defaultElements(template?.orientation || 'landscape', template?.paper_size || 'a4') },
  };
  const tokenValues = {
    participant_name:        participant?.name                    || SAMPLE.participant_name,
    nip:                     participant?.nip                     || SAMPLE.nip,
    opd_name:                participant?.opd_name                || SAMPLE.opd_name,
    organization_unit_name:  participant?.organization_unit_name  || SAMPLE.organization_unit_name,
    event_title:             participant?.event_title             || SAMPLE.event_title,
    issued_date:             participant?.issued_date             || SAMPLE.issued_date,
    certificate_number:      participant?.certificate_number      || SAMPLE.certificate_number,
    verification_url:        participant?.verification_url        || SAMPLE.verification_url,
    official_name:           template?.signature_name             || SAMPLE.official_name,
    official_title:          template?.signature_title            || SAMPLE.official_title,
    predicate:               participant?.predicate               || SAMPLE.predicate,
    final_score:             participant?.final_score != null ? String(participant.final_score) : SAMPLE.final_score,
    sessions:                SAMPLE.sessions,
    materials:               participant?.materials               || SAMPLE.materials,
    total_learning_hours:    totalLearningHours(participant?.materials || SAMPLE.materials),
  };
  return <SharedCertPreview template={tpl} tokenValues={tokenValues} maxWidth={520} />;
}

function getTemplateWarnings(template) {
  const elements = template?.layout?.canvas_elements || [];
  const warnings = [];
  if (!elements.some((el) => el.type === 'qr' || String(el.content || '').includes('{{verification_url}}'))) {
    warnings.push('Tambahkan elemen QR Verifikasi agar peserta bisa memvalidasi sertifikat.');
  }
  if (!elements.some((el) => ['signature', 'stamp'].includes(el.label) || String(el.content || '').toLowerCase().includes('kepala'))) {
    warnings.push('Signature atau pejabat penandatangan belum terlihat pada template.');
  }
  if (!elements.some((el) => String(el.content || '').includes('{{certificate_number}}'))) {
    warnings.push('Nomor sertifikat belum ditampilkan pada template.');
  }
  const dims = canvasDims(template?.paper_size || 'a4', template?.orientation || 'landscape');
  if (elements.some((el) => el.x < 0 || el.y < 0 || el.x + el.w > dims.w || el.y + el.h > dims.h)) {
    warnings.push('Ada elemen yang keluar dari area canvas.');
  }
  return warnings;
}

// ── Template sidebar list ──────────────────────────────────────────────────────

function TplList({ templates, activeId, onSelect, onNew, onRename, isLoading, sidebarHidden = false, onToggleSidebar }) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal]   = useState('');
  const renameRef = useRef(null);

  function startRename(e, t) {
    e.stopPropagation();
    setRenamingId(t.id);
    setRenameVal(t.name);
    setTimeout(() => { renameRef.current?.select(); }, 0);
  }

  function commitRename(t) {
    const name = renameVal.trim();
    if (name && name !== t.name) onRename(t, name);
    setRenamingId(null);
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
      <div style={{ padding: '8px 10px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3)' }}>Template ({templates.length})</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onToggleSidebar && (
            <button
              type="button"
              className="outline-button compact"
              title={sidebarHidden ? 'Tampilkan sidebar utama' : 'Sembunyikan sidebar utama'}
              onClick={onToggleSidebar}
              style={{
                padding: '3px 8px',
                fontSize: 11,
                borderColor: sidebarHidden ? '#3b82f6' : undefined,
                background: sidebarHidden ? '#eff6ff' : undefined,
                color: sidebarHidden ? '#2563eb' : undefined,
              }}
            >
              <PanelLeft size={11} />
            </button>
          )}
          <button type="button" className="outline-button compact" style={{ padding: '3px 8px', fontSize: 11 }} onClick={onNew}><Plus size={11} /></button>
        </div>
      </div>
      {isLoading && <div style={{ padding: '10px', fontSize: 12, color: 'var(--fg-3)' }}>Memuat…</div>}
      {!isLoading && templates.length === 0 && (
        <div style={{ padding: '10px', fontSize: 12, color: 'var(--fg-3)', textAlign: 'center' }}>
          <FileBadge size={20} style={{ margin: '0 auto 4px' }} />
          <p style={{ margin: 0 }}>Belum ada template</p>
        </div>
      )}
      {templates.map((t) => (
        <div key={t.id}
          onClick={() => renamingId !== t.id && onSelect(t)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer', borderLeft: `3px solid ${activeId === t.id ? 'var(--accent)' : 'transparent'}`, background: activeId === t.id ? 'color-mix(in srgb,var(--accent) 8%,transparent)' : 'transparent', transition: 'all 0.12s' }}>
          {t.background_image_path
            ? <img src={t.background_image_path} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
            : <span style={{ width: 24, height: 24, background: t.accent_color || '#c42007', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Award size={11} color="#fff" /></span>
          }
          <div style={{ minWidth: 0, flex: 1 }}>
            {renamingId === t.id
              ? <input
                  ref={renameRef}
                  value={renameVal}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onBlur={() => commitRename(t)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(t); if (e.key === 'Escape') setRenamingId(null); }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: '100%', fontSize: 12, fontWeight: 600, border: '1px solid var(--accent)', borderRadius: 3, padding: '1px 4px', background: 'var(--surface)', color: 'var(--fg)', outline: 'none', boxSizing: 'border-box' }}
                />
              : <div
                  style={{ fontSize: 12, fontWeight: 600, color: activeId === t.id ? 'var(--accent)' : 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  onDoubleClick={(e) => startRename(e, t)}
                  title="Klik dua kali untuk mengganti nama"
                >
                  {t.name}
                </div>
            }
            <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>{PAPER_SIZES[t.paper_size || 'a4']?.label || 'A4'} · {t.orientation}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Issue certificates panel ───────────────────────────────────────────────────

function IssueCertificate({ templates }) {
  const qc = useQueryClient();
  const [eventUuid, setEventUuid]   = useState('');
  const [templateId, setTemplateId] = useState('');
  const [selected, setSelected]     = useState(new Set());
  const [previewUserId, setPreviewUserId] = useState('');

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['cert-issue-events'],
    queryFn: () => api.get('/certificates/issue/events').then((r) => r.data.data),
  });

  const { data: participants = [], isLoading: loadingPax } = useQuery({
    queryKey: ['cert-issue-pax', eventUuid],
    queryFn: () => api.get(`/certificates/issue/events/${eventUuid}/participants`).then((r) => r.data.data),
    enabled: !!eventUuid,
  });

  // Pre-select template from saved event setting when event changes
  useEffect(() => {
    if (!eventUuid || !events.length) return;
    const ev = events.find((e) => e.uuid === eventUuid);
    if (ev?.certificate_template_id) {
      setTemplateId(String(ev.certificate_template_id));
    } else {
      setTemplateId('');
    }
  }, [eventUuid, events]);

  const assignTemplateMut = useMutation({
    mutationFn: ({ uuid, id }) => api.patch(`/training-events/${uuid}/certificate-template`, {
      certificate_template_id: id ? parseInt(id) : null,
    }),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Template ditetapkan.');
      qc.invalidateQueries({ queryKey: ['cert-issue-events'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menyimpan template.'),
  });

  const issueMut = useMutation({
    mutationFn: (payload) => api.post('/certificates/issue', payload),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Sertifikat diterbitkan.');
      setSelected(new Set());
      setPreviewUserId('');
      qc.invalidateQueries({ queryKey: ['cert-issue-events'] });
      qc.invalidateQueries({ queryKey: ['cert-issue-pax', eventUuid] });
      qc.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menerbitkan.'),
  });

  const previewPayload = {
    event_uuid: eventUuid,
    template_id: templateId ? parseInt(templateId) : null,
    participant_ids: [...selected],
  };

  const { data: previewData, isFetching: loadingPreview } = useQuery({
    queryKey: ['cert-issue-preview', eventUuid, templateId, [...selected].sort((a, b) => a - b).join(',')],
    queryFn: () => api.post('/certificates/issue/preview', previewPayload).then((r) => r.data.data),
    enabled: !!eventUuid && !!templateId && selected.size > 0,
  });

  function toggleAll() {
    if (selected.size === participants.length) setSelected(new Set());
    else setSelected(new Set(participants.map((p) => p.user_id)));
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function submit() {
    if (!eventUuid) return toast.error('Pilih event terlebih dahulu.');
    if (!templateId) return toast.error('Pilih template terlebih dahulu.');
    if (!selected.size) return toast.error('Pilih minimal satu peserta.');
    issueMut.mutate({ event_uuid: eventUuid, template_id: parseInt(templateId), participant_ids: [...selected] });
  }

  const allChecked = participants.length > 0 && selected.size === participants.length;
  const selectedTemplate = templates.find((t) => String(t.id) === String(templateId));
  const previewParticipants = (previewData?.participants || []).map((p) => ({
    ...p,
    event_title: previewData?.event?.title,
    materials: previewData?.event?.materials || [],
  }));
  const previewParticipant = previewParticipants.find((p) => String(p.user_id) === String(previewUserId)) || previewParticipants[0];
  const warnings = selectedTemplate ? getTemplateWarnings(selectedTemplate) : [];

  return (
    <div className="page-stack" style={{ paddingBottom: 0 }}>
      <div className="page-head">
        <p className="mono-kicker text-muted">Certificate Builder</p>
        <h1>Terbitkan Sertifikat</h1>
      </div>

      {/* Step 1: select event + template */}
      <section className="enterprise-card">
        <div className="section-title"><h2>Pilih Event & Template</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '4px 0' }}>
          <div className="fm-field">
            <label>Kegiatan Pelatihan</label>
            {loadingEvents
              ? <div style={{ fontSize: 12, color: 'var(--fg-3)' }}><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Memuat…</div>
              : <select value={eventUuid} onChange={(e) => { setEventUuid(e.target.value); setSelected(new Set()); }}>
                  <option value="">— Pilih event —</option>
                  {events.map((ev) => (
                    <option key={ev.uuid} value={ev.uuid}>
                      {ev.title} ({ev.pending_count} peserta menunggu)
                    </option>
                  ))}
                </select>
            }
          </div>
          <div className="fm-field">
            <label>Template Sertifikat</label>
            <select
              value={templateId}
              onChange={(e) => {
                const val = e.target.value;
                setTemplateId(val);
                if (eventUuid) assignTemplateMut.mutate({ uuid: eventUuid, id: val });
              }}
            >
              <option value="">— Pilih template —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Step 2: participant list */}
      {eventUuid && (
        <section className="enterprise-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="section-title" style={{ padding: '14px 18px' }}>
            <div>
              <p className="mono-kicker text-muted">Peserta Lulus</p>
              <h2>Belum memiliki sertifikat</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {participants.length > 0 && (
                <button type="button" className="outline-button compact" onClick={toggleAll}>
                  {allChecked ? <CheckSquare size={13} /> : <Square size={13} />}
                  {allChecked ? 'Batal semua' : 'Pilih semua'}
                </button>
              )}
              <button
                type="button"
                className="primary-button compact"
                onClick={submit}
                disabled={issueMut.isPending || !selected.size || !templateId}
              >
                {issueMut.isPending
                  ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={13} />}
                Terbitkan ({selected.size})
              </button>
            </div>
          </div>

          {loadingPax && <div className="resource-note"><Loader2 size={13} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} /> Memuat peserta…</div>}

          {!loadingPax && participants.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Award size={32} style={{ color: 'var(--fg-3)', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, color: 'var(--fg-3)', fontSize: 14 }}>Semua peserta sudah memiliki sertifikat.</p>
            </div>
          )}

          {!loadingPax && participants.length > 0 && (
            <div className="work-list">
              {participants.map((p) => (
                <div
                  key={p.user_id}
                  className="work-row"
                  style={{ cursor: 'pointer', background: selected.has(p.user_id) ? 'color-mix(in srgb,var(--accent) 6%,transparent)' : 'transparent' }}
                  onClick={() => toggle(p.user_id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ color: selected.has(p.user_id) ? 'var(--accent)' : 'var(--fg-3)', flexShrink: 0 }}>
                      {selected.has(p.user_id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: 13 }}>{p.name}</strong>
                      <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{p.nip} · {p.opd_name}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {p.predicate && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: p.predicate === 'Sangat Baik' ? '#dcfce7' : p.predicate === 'Baik' ? '#dbeafe' : p.predicate === 'Cukup' ? '#fef9c3' : '#fee2e2', color: p.predicate === 'Sangat Baik' ? '#166534' : p.predicate === 'Baik' ? '#1e40af' : p.predicate === 'Cukup' ? '#854d0e' : '#991b1b' }}>
                        {p.predicate} {p.final_score != null ? `(${p.final_score})` : ''}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                      {p.completed_at ? new Date(p.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {eventUuid && templateId && selected.size > 0 && (
        <section className="enterprise-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="section-title" style={{ padding: '14px 18px' }}>
            <div>
              <p className="mono-kicker text-muted">Review</p>
              <h2>Preview & Verifikasi</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {loadingPreview && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg-3)' }}><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Memuat preview</span>}
              {previewParticipants.length > 0 && (
                <select value={previewParticipant?.user_id || ''} onChange={(e) => setPreviewUserId(e.target.value)} style={{ fontSize: 12, minWidth: 220 }}>
                  {previewParticipants.map((p) => (
                    <option key={p.user_id} value={p.user_id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {warnings.length > 0 && (
            <div style={{ display: 'grid', gap: 6, padding: '0 18px 14px' }}>
              {warnings.map((warning) => (
                <div key={warning} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', border: '1px solid #f59e0b55', background: '#fffbeb', color: '#92400e', fontSize: 12 }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {previewParticipant && selectedTemplate && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 0, borderTop: '1px solid var(--border)' }}>
              <PreviewCanvas template={selectedTemplate} participant={previewParticipant} />
              <div style={{ borderLeft: '1px solid var(--border)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <p className="mono-kicker text-muted" style={{ margin: '0 0 4px' }}>Nomor</p>
                  <strong style={{ display: 'block', fontSize: 13 }}>{previewParticipant.certificate_number}</strong>
                </div>
                <div>
                  <p className="mono-kicker text-muted" style={{ margin: '0 0 4px' }}>Peserta</p>
                  <strong style={{ display: 'block', fontSize: 13 }}>{previewParticipant.name}</strong>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)' }}>{previewParticipant.nip || previewParticipant.email}</span>
                </div>
                {previewParticipant.predicate && (
                  <div>
                    <p className="mono-kicker text-muted" style={{ margin: '0 0 4px' }}>Predikat</p>
                    <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 4, background: previewParticipant.predicate === 'Sangat Baik' ? '#dcfce7' : previewParticipant.predicate === 'Baik' ? '#dbeafe' : previewParticipant.predicate === 'Cukup' ? '#fef9c3' : '#fee2e2', color: previewParticipant.predicate === 'Sangat Baik' ? '#166534' : previewParticipant.predicate === 'Baik' ? '#1e40af' : previewParticipant.predicate === 'Cukup' ? '#854d0e' : '#991b1b' }}>
                      {previewParticipant.predicate}{previewParticipant.final_score != null ? ` — ${previewParticipant.final_score}` : ''}
                    </span>
                  </div>
                )}
                <div>
                  <p className="mono-kicker text-muted" style={{ margin: '0 0 4px' }}>URL Verifikasi</p>
                  <a href={previewParticipant.verification_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--accent)' }}>{previewParticipant.verification_url}</a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <QrCode size={16} />
                  <span style={{ fontSize: 11, color: 'var(--fg-2)' }}>QR Verifikasi mengikuti token unik saat sertifikat diterbitkan.</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ── ASN view ───────────────────────────────────────────────────────────────────

function CertPrintTarget({ certData }) {
  if (!certData?.template) return null;
  const { template, participant: p, event, certificate_number, issued_date, verification_url } = certData;
  const tokenValues = {
    participant_name:        p?.name                    || '',
    nip:                     p?.nip                     || '',
    opd_name:                p?.opd_name                || '',
    organization_unit_name:  p?.organization_unit_name  || '',
    event_title:             event?.title               || '',
    issued_date:             issued_date                || '',
    certificate_number:      certificate_number         || '',
    verification_url:        verification_url           || '',
    official_name:           template.signature_name    || '',
    official_title:          template.signature_title   || '',
    predicate:               p?.predicate               || '',
    final_score:             p?.final_score != null ? String(p.final_score) : '',
    materials:               event?.materials           || [],
    total_learning_hours:    totalLearningHours(event?.materials || []),
  };
  return <CertPrintArea template={template} tokenValues={tokenValues} />;
}

function CertificateList() {
  const [previewUuid, setPreviewUuid] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => api.get('/certificates').then((r) => r.data.data),
  });
  const records = data?.data ?? [];

  const { data: certDetail, isLoading: detailLoading, isError: detailError } = useQuery({
    queryKey: ['certificate-detail', previewUuid],
    queryFn: () => api.get(`/certificates/${previewUuid}`).then((r) => r.data.data),
    enabled: !!previewUuid,
    retry: false,
  });

  function handlePrint() {
    document.body.classList.add('cert-printing');
    window.print();
    setTimeout(() => document.body.classList.remove('cert-printing'), 1200);
  }

  const tokenValues = certDetail ? {
    participant_name:        certDetail.participant?.name                    || '',
    nip:                     certDetail.participant?.nip                     || '',
    opd_name:                certDetail.participant?.opd_name                || '',
    organization_unit_name:  certDetail.participant?.organization_unit_name  || '',
    event_title:             certDetail.event?.title                        || '',
    issued_date:             certDetail.issued_date                         || '',
    certificate_number:      certDetail.certificate_number                  || '',
    verification_url:        certDetail.verification_url                    || '',
    official_name:           certDetail.template?.signature_name            || '',
    official_title:          certDetail.template?.signature_title           || '',
    predicate:               certDetail.participant?.predicate              || '',
    final_score:             certDetail.participant?.final_score != null ? String(certDetail.participant.final_score) : '',
    sessions:                certDetail.event?.sessions                     || [],
    materials:               certDetail.event?.materials                    || [],
    total_learning_hours:    totalLearningHours(certDetail.event?.materials || []),
  } : {};

  const hasBack = !!(certDetail?.template?.layout?.back_canvas_elements?.length);

  return (
    <div className="page-stack">
      <div className="page-head"><p className="mono-kicker text-muted">Pembelajaran</p><h1>Sertifikat Saya</h1></div>
      <section className="enterprise-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="section-title" style={{ padding: '14px 18px' }}><h2>Riwayat Sertifikat</h2><span className="badge-active">{records.length} sertifikat</span></div>
        {isLoading && <div className="resource-note">Memuat…</div>}
        {!isLoading && records.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <Award size={32} style={{ color: 'var(--fg-3)', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, color: 'var(--fg-3)', fontSize: 14 }}>Belum ada sertifikat.</p>
          </div>
        )}
        <div className="work-list">
          {records.map((c) => (
            <div className="work-row" key={c.uuid || c.id}>
              <div>
                <strong>{c.certificate_number}</strong>
                <span>{c.issued_at || '—'}</span>
                {c.event?.title && <em style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)', fontStyle: 'normal', marginTop: 2 }}>{c.event.title}</em>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {c.verification_token && (
                  <a href={`/api/certificates/verify/${c.verification_token}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--accent)', fontStyle: 'normal' }}>
                    <Eye size={13} /> Verifikasi
                  </a>
                )}
                <button type="button" className="outline-button compact" onClick={() => setPreviewUuid(c.uuid)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                  <Eye size={13} /> Lihat
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {previewUuid && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div>
              <strong style={{ fontSize: 14 }}>{certDetail?.certificate_number || '—'}</strong>
              {certDetail?.event?.title && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--fg-3)' }}>{certDetail.event.title}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="primary-button compact" onClick={handlePrint} disabled={detailLoading || !certDetail}>
                <Printer size={14} /> Cetak / Unduh PDF
              </button>
              <button type="button" className="outline-button compact" onClick={() => setPreviewUuid(null)}>
                <X size={14} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 16px' }}>
            {detailLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 64 }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--fg-3)' }} />
              </div>
            )}
            {detailError && (
              <div style={{ textAlign: 'center', paddingTop: 64, color: '#f87171' }}>
                <AlertTriangle size={28} style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontSize: 14 }}>Gagal memuat sertifikat. Pastikan sertifikat ini milik Anda.</p>
              </div>
            )}
            {!detailLoading && !detailError && certDetail && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
                <div style={{ width: '100%' }}>
                  <p style={{ textAlign: 'center', margin: '0 0 8px', fontSize: 11, color: '#e5e7eb', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Halaman Depan</p>
                  <SharedCertPreview template={certDetail.template} tokenValues={tokenValues} maxWidth={520} />
                </div>
                {hasBack && (
                  <div style={{ width: '100%' }}>
                    <p style={{ textAlign: 'center', margin: '0 0 8px', fontSize: 11, color: '#e5e7eb', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Halaman Belakang</p>
                    <SharedCertPreview template={certDetail.template} tokenValues={tokenValues} maxWidth={520} showBack />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {certDetail && <CertPrintTarget certData={certDetail} />}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

function emptyTemplate(orientation = 'landscape') {
  const paperSize = 'a4';
  return {
    name: 'Template Baru',
    description: '',
    paper_size: paperSize,
    orientation,
    background_color: '#ffffff',
    background_image_path: '',
    accent_color: '#2d6a2d',
    text_color: '#1a1a1a',
    font_family: 'Brawler',
    logo_path: '',
    signature_name: '',
    signature_title: '',
    body_template: '{{participant_name}}',
    description_text: '',
    footer_text: 'Corporate University BKPSDM',
    org_info: [],
    is_default: false,
    is_active: true,
    layout: { canvas_elements: defaultElements(orientation, paperSize), margin: 32 },
  };
}

export default function CertificateBuilder({ session, sidebarHidden = false, onToggleSidebar }) {
  const roles     = getRoleNames(session?.user);
  const canManage = roles.includes('super-admin') || roles.includes('fasilitator-internal') || roles.includes('fasilitator-eksternal');
  const canCreate = canManage && (
    hasAnyPermission(session, 'create certificate') ||
    roles.some((r) => ['super-admin', 'fasilitator-internal', 'fasilitator-eksternal'].includes(r))
  );

  const qc = useQueryClient();

  // Template meta
  const [editing, setEditing]       = useState(null); // saved template object or null
  const [tplName, setTplName]       = useState('Template Baru');
  const [paperSize, setPaperSize]   = useState('a4');
  const [orientation, setOrientation] = useState('landscape');
  const [margin, setMargin]         = useState(32);
  const [bgColor, setBgColor]       = useState('#ffffff');
  const [signatureName, setSignatureName] = useState('');
  const [signatureTitle, setSignatureTitle] = useState('');

  // Panel visibility
  const [showLeft, setShowLeft]   = useState(true);
  const [showRight, setShowRight] = useState(true);

  // Canvas elements
  const [elements, setElements]     = useState(() => defaultElements('landscape', 'a4'));
  const [backElements, setBackElements] = useState(() => defaultBackElements('landscape', 'a4'));
  const [activePage, setActivePage] = useState('front'); // 'front' | 'back'
  const [selected, setSelected]     = useState(null);
  const [editingId, setEditingId]   = useState(null);

  const activeElements    = activePage === 'front' ? elements : backElements;
  const setActiveElements = activePage === 'front' ? setElements : setBackElements;

  const { data, isLoading } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: () => api.get('/certificate-templates?per_page=50').then((r) => r.data.data),
    enabled: canManage,
  });
  const templates = data?.data ?? [];

  const { data: imageAssetData } = useQuery({
    queryKey: ['certificate-template-images'],
    queryFn: () => api.get('/certificate-templates/images?per_page=90').then((r) => r.data.data),
    enabled: canManage,
  });
  const imageAssets = imageAssetData?.data ?? [];

  const { data: officials = [], isLoading: officialsLoading } = useQuery({
    queryKey: ['certificate-officials'],
    queryFn: () => api.get('/certificate-templates/officials').then((r) => r.data.data),
    enabled: canCreate,
  });
  const defaultOfficial = officials.find((official) => official.is_default) || officials[0];
  const draftKey = `certificate-builder-draft-${session?.user?.id || 'anonymous'}`;
  const draftReadyRef = useRef(false);
  const baselineRef = useRef('');
  const [draftStatus, setDraftStatus] = useState('');
  const [hasBrowserDraft, setHasBrowserDraft] = useState(false);

  useEffect(() => {
    if (editing || signatureName || !defaultOfficial) return;
    setSignatureName(defaultOfficial.name);
    setSignatureTitle(defaultOfficial.position_name || '');
  }, [defaultOfficial, editing, signatureName]);

  useEffect(() => {
    if (draftReadyRef.current || officialsLoading) return;

    const current = certificateDraftSnapshot({
      editing, tplName, paperSize, orientation, margin, bgColor,
      signatureName: signatureName || defaultOfficial?.name || '',
      signatureTitle: signatureTitle || defaultOfficial?.position_name || '',
      elements, backElements, activePage,
    });
    const raw = window.localStorage.getItem(draftKey);

    if (raw) {
      try {
        const draft = JSON.parse(raw);
        if (draft?.version === CERTIFICATE_DRAFT_VERSION && window.confirm('Ada draft perubahan sertifikat yang belum disimpan. Pulihkan draft dari browser?')) {
          const draftSnapshot = { ...draft };
          delete draftSnapshot.savedAt;
          const draftTemplate = draft.templateId
            ? templates.find((template) => template.id === draft.templateId) || { id: draft.templateId, name: draft.tplName }
            : null;
          setEditing(draftTemplate);
          setTplName(draft.tplName || 'Template Baru');
          setPaperSize(draft.paperSize || 'a4');
          setOrientation(draft.orientation || 'landscape');
          setMargin(Number(draft.margin) || 32);
          setBgColor(draft.bgColor || '#ffffff');
          setSignatureName(draft.signatureName || defaultOfficial?.name || '');
          setSignatureTitle(draft.signatureTitle || defaultOfficial?.position_name || '');
          setElements(Array.isArray(draft.elements) ? draft.elements : defaultElements(draft.orientation || 'landscape', draft.paperSize || 'a4'));
          setBackElements(Array.isArray(draft.backElements) ? draft.backElements : defaultBackElements(draft.orientation || 'landscape', draft.paperSize || 'a4'));
          setActivePage(draft.activePage === 'back' ? 'back' : 'front');
          baselineRef.current = JSON.stringify(draftSnapshot);
          setHasBrowserDraft(true);
          setDraftStatus('Draft browser dipulihkan.');
        } else {
          window.localStorage.removeItem(draftKey);
          baselineRef.current = JSON.stringify(current);
          setHasBrowserDraft(false);
        }
      } catch {
        window.localStorage.removeItem(draftKey);
        baselineRef.current = JSON.stringify(current);
        setHasBrowserDraft(false);
      }
    } else {
      baselineRef.current = JSON.stringify(current);
      setHasBrowserDraft(false);
    }

    draftReadyRef.current = true;
  }, [activePage, backElements, bgColor, defaultOfficial, draftKey, editing, elements, officialsLoading, margin, orientation, paperSize, signatureName, signatureTitle, templates, tplName]);

  useEffect(() => {
    if (!draftReadyRef.current) return undefined;

    const draft = certificateDraftSnapshot({
      editing, tplName, paperSize, orientation, margin, bgColor,
      signatureName, signatureTitle, elements, backElements, activePage,
    });
    const serialized = JSON.stringify(draft);
    if (serialized === baselineRef.current) return undefined;

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
      setHasBrowserDraft(true);
      setDraftStatus(`Draft browser tersimpan ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [activePage, backElements, bgColor, draftKey, editing, elements, margin, orientation, paperSize, signatureName, signatureTitle, tplName]);

  useEffect(() => {
    const saveBeforeUnload = () => {
      if (!draftReadyRef.current) return;
      const draft = certificateDraftSnapshot({
        editing, tplName, paperSize, orientation, margin, bgColor,
        signatureName, signatureTitle, elements, backElements, activePage,
      });
      const serialized = JSON.stringify(draft);
      if (serialized !== baselineRef.current) {
        window.localStorage.setItem(draftKey, JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
      }
    };

    window.addEventListener('beforeunload', saveBeforeUnload);
    return () => window.removeEventListener('beforeunload', saveBeforeUnload);
  }, [activePage, backElements, bgColor, draftKey, editing, elements, margin, orientation, paperSize, signatureName, signatureTitle, tplName]);

  function loadTemplate(t) {
    setEditing(t);
    setTplName(t.name);
    const nextPaperSize = t.paper_size || 'a4';
    const nextOrientation = t.orientation || 'landscape';
    setPaperSize(nextPaperSize);
    setOrientation(nextOrientation);
    setMargin(parseInt(t.layout?.margin ?? 32));
    setBgColor(t.background_color || '#ffffff');
    setSignatureName(t.signature_name || defaultOfficial?.name || '');
    setSignatureTitle(t.signature_title || defaultOfficial?.position_name || '');
    const elems = t.layout?.canvas_elements;
    let loaded = Array.isArray(elems) && elems.length > 0 ? elems : defaultElements(nextOrientation, nextPaperSize);
    loaded = loaded.map((element) => (
      element.label === 'signature' && String(element.content || '').includes('Nama Pejabat')
        ? { ...element, content: '{{official_name}}\n{{official_title}}' }
        : element
    ));
    // backward compat: promote background_image_path to a canvas element
    if (t.background_image_path && !loaded.some((e) => e.label === 'background')) {
      const { w, h } = canvasDims(nextPaperSize, nextOrientation);
      loaded = [{ id: uid(), type: 'image', label: 'background', src: t.background_image_path, x: 0, y: 0, w, h, objectFit: 'cover', borderRadius: 0, opacity: 1 }, ...loaded];
    }
    setElements(loaded);
    const backElems = t.layout?.back_canvas_elements;
    setBackElements(Array.isArray(backElems) && backElems.length > 0 ? backElems : defaultBackElements(nextOrientation, nextPaperSize));
    setActivePage('front');
    setSelected(null);
    setEditingId(null);
  }

  function newTemplate() {
    const o = 'landscape';
    const p = 'a4';
    setEditing(null);
    setTplName('Template Baru');
    setPaperSize(p);
    setOrientation(o);
    setMargin(32);
    setBgColor('#ffffff');
    setSignatureName(defaultOfficial?.name || '');
    setSignatureTitle(defaultOfficial?.position_name || '');
    setElements(defaultElements(o, p));
    setBackElements(defaultBackElements(o, p));
    setActivePage('front');
    setSelected(null);
    setEditingId(null);
  }

  function addBackgroundElement(url) {
    const { w, h } = canvasDims(paperSize, orientation);
    const bgEl = { id: uid(), type: 'image', label: 'background', src: url, x: 0, y: 0, w, h, objectFit: 'cover', borderRadius: 0, opacity: 1 };
    setActiveElements((prev) => [bgEl, ...prev.filter((e) => e.label !== 'background')]);
    setSelected(bgEl.id);
  }

  function addElement(config) {
    const { w: cw, h: ch } = canvasDims(paperSize, orientation);
    setActiveElements((prev) => [...prev, {
      ...config,
      id: uid(),
      x: Math.round((cw - config.w) / 2),
      y: Math.round((ch - config.h) / 2),
    }]);
  }

  function updateElement(id, patch) {
    setActiveElements((prev) => prev.map((el) => el.id === id ? { ...el, ...patch } : el));
  }

  function deleteSelected() {
    if (!selected) return;
    setActiveElements((prev) => prev.filter((el) => el.id !== selected));
    setSelected(null);
  }

  function duplicateSelected() {
    if (!selected) return;
    const el = activeElements.find((e) => e.id === selected);
    if (!el) return;
    const newEl = { ...el, id: uid(), x: el.x + 12, y: el.y + 12 };
    setActiveElements((prev) => [...prev, newEl]);
    setSelected(newEl.id);
  }

  const saveMut = useMutation({
    mutationFn: (payload) => editing?.id
      ? api.put(`/certificate-templates/${editing.id}`, payload).then((r) => r.data.data)
      : api.post('/certificate-templates', payload).then((r) => r.data.data),
    onSuccess: (saved) => {
      const savedSnapshot = certificateDraftSnapshot({
        editing: saved, tplName, paperSize, orientation, margin, bgColor,
        signatureName, signatureTitle, elements, backElements, activePage,
      });
      baselineRef.current = JSON.stringify(savedSnapshot);
      window.localStorage.removeItem(draftKey);
      setHasBrowserDraft(false);
      setDraftStatus('Semua perubahan tersimpan.');
      toast.success(editing ? 'Template diperbarui.' : 'Template disimpan.');
      qc.invalidateQueries({ queryKey: ['certificate-templates'] });
      setEditing(saved);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menyimpan.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/certificate-templates/${id}`),
    onSuccess: () => { toast.success('Template dihapus.'); qc.invalidateQueries({ queryKey: ['certificate-templates'] }); newTemplate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menghapus.'),
  });

  const renameMut = useMutation({
    mutationFn: ({ t, name }) => api.put(`/certificate-templates/${t.id}`, {
      name,
      description: t.description || '',
      paper_size: t.paper_size || 'a4',
      orientation: t.orientation || 'landscape',
      background_color: t.background_color || '#ffffff',
      background_image_path: t.background_image_path || '',
      accent_color: t.accent_color || '#2d6a2d',
      text_color: t.text_color || '#1a1a1a',
      font_family: t.font_family || 'Brawler',
      logo_path: t.logo_path || '',
      signature_name: t.signature_name || '',
      signature_title: t.signature_title || '',
      body_template: t.body_template || '{{participant_name}}',
      description_text: t.description_text || '',
      footer_text: t.footer_text || '',
      org_info: t.org_info || [],
      is_default: t.is_default ?? false,
      is_active: t.is_active ?? true,
      layout: { ...(t.layout || {}), margin: parseInt(t.layout?.margin ?? 32) },
    }),
    onSuccess: (_, { t, name }) => {
      toast.success(`Diubah menjadi "${name}".`);
      qc.invalidateQueries({ queryKey: ['certificate-templates'] });
      if (editing?.id === t.id) setTplName(name);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal mengubah nama.'),
  });

  function save() {
    const bgEl = elements.find((e) => e.label === 'background');
    saveMut.mutate({
      name: tplName,
      description: '',
      paper_size: paperSize,
      orientation,
      background_color: bgColor,
      background_image_path: bgEl?.src || '',
      accent_color: '#2d6a2d',
      text_color: '#1a1a1a',
      font_family: 'Brawler',
      logo_path: '',
      signature_name: signatureName,
      signature_title: signatureTitle,
      body_template: '{{participant_name}}',
      description_text: '',
      footer_text: 'Corporate University BKPSDM',
      org_info: [],
      is_default: false,
      is_active: true,
      layout: { canvas_elements: elements, back_canvas_elements: backElements, margin },
    });
  }

  if (!canManage) return <CertificateList />;

  const [mode, setMode] = useState('builder'); // 'builder' | 'issue'
  const selectedEl = selected ? activeElements.find((e) => e.id === selected) : null;

  if (mode === 'issue') {
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, padding: '0 0 10px', alignItems: 'center' }}>
          {[
            { key: 'builder', label: 'Builder' },
            { key: 'issue',   label: 'Terbitkan Sertifikat' },
          ].map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setMode(key)}
              style={{ padding: '6px 14px', fontSize: 12, fontWeight: mode === key ? 700 : 400, cursor: 'pointer', border: `1px solid ${mode === key ? '#3b82f6' : 'var(--border)'}`, borderRadius: 4, background: mode === key ? '#eff6ff' : 'var(--surface)', color: mode === key ? '#2563eb' : '#9ca3af', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>
        <IssueCertificate templates={templates} />
      </div>
    );
  }

  return (
    <div className="page-stack" style={{ paddingBottom: 0 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 0 10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <p className="mono-kicker text-muted" style={{ margin: '0 0 2px' }}>Certificate Builder</p>
          <input
            value={tplName}
            onChange={(e) => setTplName(e.target.value)}
            style={{ fontSize: 18, fontWeight: 700, border: 'none', background: 'transparent', outline: 'none', padding: 0, color: 'var(--fg)', width: '100%', maxWidth: 360 }}
            placeholder="Nama Template…"
          />
          {draftStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>{draftStatus}</span>
              {hasBrowserDraft && (
                <button
                  type="button"
                  onClick={() => {
                    window.localStorage.removeItem(draftKey);
                    baselineRef.current = JSON.stringify(certificateDraftSnapshot({
                      editing, tplName, paperSize, orientation, margin, bgColor,
                      signatureName, signatureTitle, elements, backElements, activePage,
                    }));
                    setHasBrowserDraft(false);
                    setDraftStatus('Draft browser dihapus.');
                  }}
                  style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--crimson)', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Hapus draft
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 2 }}>
            {[
              { key: 'builder', label: 'Builder' },
              { key: 'issue',   label: 'Terbitkan' },
            ].map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setMode(key)}
                style={{ padding: '6px 12px', fontSize: 11, fontWeight: mode === key ? 700 : 400, cursor: 'pointer', border: `1px solid ${mode === key ? '#3b82f6' : 'var(--border)'}`, borderRadius: 4, background: mode === key ? '#eff6ff' : 'var(--surface)', color: mode === key ? '#2563eb' : '#9ca3af', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Panel toggles */}
          <div style={{ display: 'flex', gap: 2 }}>
            {[
              { show: showLeft,  toggle: () => setShowLeft((v) => !v),  Icon: PanelLeft,  title: ['Sembunyikan panel kiri', 'Tampilkan panel kiri'] },
              { show: showRight, toggle: () => setShowRight((v) => !v), Icon: PanelRight, title: ['Sembunyikan panel kanan', 'Tampilkan panel kanan'] },
            ].map(({ show, toggle, Icon, title }) => (
              <button key={title[0]} type="button" title={show ? title[0] : title[1]}
                onClick={toggle}
                style={{
                  padding: '6px 10px',
                  border: `1px solid ${show ? '#3b82f6' : 'var(--border)'}`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: show ? '#eff6ff' : 'var(--surface)',
                  display: 'flex', alignItems: 'center',
                  transition: 'all 0.15s',
                }}>
                <Icon size={16} strokeWidth={2} color={show ? '#2563eb' : '#9ca3af'} />
              </button>
            ))}
          </div>

          {/* Orientation toggle */}
          <select
            value={paperSize}
            onChange={(e) => {
              const next = e.target.value;
              setPaperSize(next);
              if (!editing) { setElements(defaultElements(orientation, next)); setBackElements(defaultBackElements(orientation, next)); }
            }}
            title="Ukuran kertas"
            style={{ height: 30, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 11, padding: '0 8px' }}
          >
            {Object.entries(PAPER_SIZES).map(([key, size]) => <option key={key} value={key}>{size.label}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 2 }}>
            {[
              { o: 'landscape', Icon: IconLandscape, label: 'Landscape' },
              { o: 'portrait',  Icon: IconPortrait,  label: 'Portrait'  },
            ].map(({ o, Icon, label }) => (
              <button key={o} type="button"
                onClick={() => { setOrientation(o); if (!editing) { setElements(defaultElements(o, paperSize)); setBackElements(defaultBackElements(o, paperSize)); } }}
                title={label}
                style={{
                  padding: '6px 10px', fontSize: 11, cursor: 'pointer',
                  border: `1px solid ${orientation === o ? '#3b82f6' : 'var(--border)'}`,
                  borderRadius: 4,
                  background: orientation === o ? '#eff6ff' : 'var(--surface)',
                  color: orientation === o ? '#2563eb' : '#9ca3af',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontWeight: orientation === o ? 700 : 400,
                  transition: 'all 0.15s',
                }}>
                <Icon size={15} strokeWidth={2} color={orientation === o ? '#2563eb' : '#9ca3af'} />
              </button>
            ))}
          </div>

          {/* Element actions */}
          {selectedEl && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" className="outline-button compact" onClick={duplicateSelected} title="Duplikat"><Copy size={13} /></button>
              <button type="button" className="outline-button compact danger-lite" onClick={deleteSelected} title="Hapus elemen"><Trash2 size={13} /></button>
            </div>
          )}

          <button type="button" className="outline-button compact" onClick={newTemplate} title="Template baru"><RotateCcw size={13} /> Baru</button>

          {editing && (
            <button type="button" className="outline-button compact danger-lite"
              onClick={() => { if (confirm(`Hapus "${editing.name}"?`)) deleteMut.mutate(editing.id); }}
              disabled={deleteMut.isPending}>
              {deleteMut.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
            </button>
          )}

          <button type="button" className="primary-button compact" onClick={save} disabled={saveMut.isPending}>
            {saveMut.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {saveMut.isPending ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Simpan Template'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-2)' }}>Nama Pejabat Penandatangan</span>
          <select
            value={officials.find((official) => official.name === signatureName && official.position_name === signatureTitle)?.id || ''}
            onChange={(e) => {
              const official = officials.find((item) => String(item.id) === e.target.value);
              if (official) {
                setSignatureName(official.name);
                setSignatureTitle(official.position_name || '');
              }
            }}
            style={{ minHeight: 36, border: '1px solid var(--border)', background: '#fff', padding: '7px 10px', color: 'var(--fg)' }}
          >
            <option value="">Pilih pejabat dari database</option>
            {officials.map((official) => (
              <option key={official.id} value={official.id}>{official.name} - {official.position_name}{official.is_default ? ' (Default)' : ''}</option>
            ))}
          </select>
          <input
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            placeholder="Nama lengkap pejabat"
            style={{ minHeight: 36, border: '1px solid var(--border)', background: '#fff', padding: '7px 10px', color: 'var(--fg)' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-2)' }}>Jabatan Pejabat</span>
          <input
            value={signatureTitle}
            onChange={(e) => setSignatureTitle(e.target.value)}
            placeholder="Contoh: Kepala BKPSDM"
            style={{ minHeight: 36, border: '1px solid var(--border)', background: '#fff', padding: '7px 10px', color: 'var(--fg)' }}
          />
        </label>
      </div>

      {/* Editor grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `${showLeft ? '190px' : '0'} 1fr ${showRight ? '210px' : '0'}`,
        border: '1px solid var(--border)',
        height: 'calc(100vh - 180px)',
        overflow: 'hidden',
        transition: 'grid-template-columns 0.2s ease',
      }}>

        {/* Left: palette + template list */}
        <div style={{ borderRight: showLeft ? '1px solid var(--border)' : 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'border 0.2s' }}>
          {showLeft && <>
            <div style={{ overflowY: 'auto', flex: '0 0 auto', maxHeight: '55%' }}>
              <PalettePanel onAdd={addElement} />
            </div>
            <TplList
              templates={templates}
              activeId={editing?.id}
              onSelect={loadTemplate}
              onNew={newTemplate}
              onRename={(t, name) => renameMut.mutate({ t, name })}
              isLoading={isLoading}
              sidebarHidden={sidebarHidden}
              onToggleSidebar={onToggleSidebar}
            />
          </>}
        </div>

        {/* Center: canvas */}
        <div style={{ overflow: 'hidden', background: '#d4d4d4', display: 'flex', flexDirection: 'column' }}>
          {/* Page tabs */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderBottom: '1px solid var(--border)', padding: '0 12px', flexShrink: 0 }}>
            {[
              { key: 'front', label: 'Halaman Depan' },
              { key: 'back',  label: 'Halaman Belakang' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setActivePage(key); setSelected(null); setEditingId(null); }}
                style={{
                  padding: '7px 14px',
                  border: 'none',
                  borderBottom: `2px solid ${activePage === key ? '#3b82f6' : 'transparent'}`,
                  background: 'transparent',
                  fontSize: 11,
                  fontWeight: activePage === key ? 700 : 400,
                  color: activePage === key ? '#2563eb' : 'var(--fg-3)',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Canvas scroll area */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24 }}>
            <CanvasEditor
              paperSize={paperSize}
              orientation={orientation}
              margin={margin}
              bgColor={bgColor}
              elements={activeElements}
              selected={selected}
              editingId={editingId}
              setSelected={(id) => { setSelected(id); if (id !== editingId) setEditingId(null); }}
              setEditingId={setEditingId}
              setElements={setActiveElements}
              tokenValues={{
                ...SAMPLE,
                official_name: signatureName || SAMPLE.official_name,
                official_title: signatureTitle || SAMPLE.official_title,
                total_learning_hours: totalLearningHours(SAMPLE.materials),
              }}
            />
          </div>
        </div>

        {/* Right: properties */}
        <div style={{ borderLeft: showRight ? '1px solid var(--border)' : 'none', overflowY: 'auto', transition: 'border 0.2s' }}>
          {showRight && <PropertiesPanel
            element={selectedEl}
            onUpdate={updateElement}
            paperSize={paperSize}
            setPaperSize={(next) => {
              setPaperSize(next);
              if (!editing) { setElements(defaultElements(orientation, next)); setBackElements(defaultBackElements(orientation, next)); }
            }}
            orientation={orientation}
            margin={margin}
            setMargin={setMargin}
            bgColor={bgColor}
            setBgColor={setBgColor}
            onAddBg={addBackgroundElement}
            imageAssets={imageAssets}
            onImageUploaded={() => qc.invalidateQueries({ queryKey: ['certificate-template-images'] })}
          />}
        </div>
      </div>
    </div>
  );
}
