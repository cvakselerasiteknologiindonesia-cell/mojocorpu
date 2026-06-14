// Lightweight, read-only certificate canvas — shared by CertificateBuilder and AsnEventLearn.

function tok(s = '', values = {}) {
  return String(s ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) => values[k] ?? '');
}

function canvasDims(paperSize = 'a4', orientation = 'landscape') {
  const BASE = { a4: [842, 595], a5: [595, 420], letter: [816, 630] };
  const [lw, lh] = BASE[paperSize] || BASE.a4;
  return orientation === 'landscape' ? { w: lw, h: lh } : { w: lh, h: lw };
}

function qrCells(value = '') {
  const text = String(value || 'verify');
  const cells = [];
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
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

function PreviewEl({ el, tokenValues }) {
  const base = {
    position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
    boxSizing: 'border-box', overflow: 'hidden',
  };

  if (el.type === 'image') {
    return el.src
      ? <img style={{ ...base, objectFit: el.objectFit || 'contain', borderRadius: el.borderRadius || 0, opacity: el.opacity ?? 1 }} src={el.src} alt="" />
      : <div style={{ ...base, background: '#f3f4f6', border: '1px dashed #ccc' }} />;
  }

  if (el.type === 'qr') {
    const url = tok(el.content || '{{verification_url}}', tokenValues);
    const cells = qrCells(url);
    const fg = el.color || '#111827';
    const bg = el.backgroundColor || '#ffffff';
    return (
      <div style={{ ...base, background: bg, padding: el.padding ?? 6 }}>
        <svg viewBox="0 0 21 21" width="100%" height="100%" role="img" aria-label="QR verifikasi">
          <rect width="21" height="21" fill={bg} />
          {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fg} />)}
        </svg>
      </div>
    );
  }

  if (el.type === 'table') {
    const sessions = tokenValues.sessions || [];
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
      <div style={{ ...base }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: el.fontSize || 11, fontFamily: `"${el.fontFamily || 'Inter'}", sans-serif`, tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {cols.map((col) => (
                <th key={col.key} style={{ width: col.width || 'auto', background: el.headerBg || '#1a1a1a', color: el.headerColor || '#ffffff', padding: '5px 8px', textAlign: col.key === 'order' ? 'center' : 'left', fontWeight: 600, border: `1px solid ${el.borderColor || '#d0d0d0'}`, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((row, idx) => (
              <tr key={idx}>
                {cols.map((col) => (
                  <td key={col.key} style={{ padding: '4px 8px', background: idx % 2 === 0 ? (el.rowBg || '#ffffff') : (el.altRowBg || '#f6f6f8'), color: el.rowColor || '#1a1a1a', border: `1px solid ${el.borderColor || '#d0d0d0'}`, textAlign: col.key === 'order' ? 'center' : 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: col.key === 'title' ? 'normal' : 'nowrap' }}>
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

  // Text
  return (
    <div style={{ ...base, fontSize: el.fontSize, fontFamily: `"${el.fontFamily}", serif`, fontWeight: el.fontWeight || 'normal', fontStyle: el.fontStyle || 'normal', textDecoration: el.textDecoration || 'none', color: el.color || '#000', textAlign: el.textAlign || 'left', lineHeight: el.lineHeight || 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: 2 }}>
      {tok(el.content, tokenValues)}
    </div>
  );
}

export function CertPreviewCanvas({ template, tokenValues = {}, maxWidth = 520, showBack = false }) {
  if (!template) return null;
  const orientation = template.orientation || 'landscape';
  const paperSize   = template.paper_size || 'a4';
  const { w, h }    = canvasDims(paperSize, orientation);
  const margin      = parseInt(template.layout?.margin ?? 0);
  const frontEls    = template.layout?.canvas_elements || [];
  const backEls     = template.layout?.back_canvas_elements || [];
  const elements    = showBack ? backEls : frontEls;
  const scale       = Math.min(1, maxWidth / w);

  return (
    <div style={{ overflow: 'auto', background: '#d4d4d4', padding: 16, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: w * scale, height: h * scale, flexShrink: 0 }}>
        <div style={{ position: 'relative', width: w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left', background: template.background_color || '#fff', boxShadow: '0 4px 18px rgba(0,0,0,0.16)', overflow: 'hidden' }}>
          {elements.map((el) => <PreviewEl key={el.id} el={el} tokenValues={tokenValues} />)}
          {margin > 0 && (
            <div style={{ position: 'absolute', left: margin, top: margin, width: Math.max(0, w - margin * 2), height: Math.max(0, h - margin * 2), border: '1px dashed rgba(59,130,246,0.45)', pointerEvents: 'none', boxSizing: 'border-box' }} />
          )}
        </div>
      </div>
    </div>
  );
}

export function CertPrintArea({ template, tokenValues = {} }) {
  if (!template) return null;
  const orientation = template.orientation || 'landscape';
  const paperSize   = template.paper_size || 'a4';
  const { w, h }    = canvasDims(paperSize, orientation);
  const margin      = parseInt(template.layout?.margin ?? 0);
  const frontEls    = template.layout?.canvas_elements || [];
  const backEls     = template.layout?.back_canvas_elements || [];

  function renderPage(elements, key) {
    return (
      <div key={key} style={{ width: w, height: h, position: 'relative', background: template.background_color || '#fff', overflow: 'hidden', pageBreakAfter: 'always' }}>
        {elements.map((el) => <PreviewEl key={el.id} el={el} tokenValues={tokenValues} />)}
        {margin > 0 && <div style={{ position: 'absolute', left: margin, top: margin, width: Math.max(0, w - margin * 2), height: Math.max(0, h - margin * 2), border: '1px dashed rgba(59,130,246,0.45)', pointerEvents: 'none', boxSizing: 'border-box' }} />}
      </div>
    );
  }

  return (
    <div className="cert-print-area">
      {renderPage(frontEls, 'front')}
      {backEls.length > 0 && renderPage(backEls, 'back')}
    </div>
  );
}
