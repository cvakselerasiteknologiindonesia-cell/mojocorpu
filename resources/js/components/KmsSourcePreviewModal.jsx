import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileText, Film, Image as ImageIcon, Loader2, X } from 'lucide-react';
import api from '../api.js';
import { openProtectedFile } from '../utils/openProtectedFile.js';

function sourceUrl(source) {
  return source?.file_url || source?.url || source?.file_path || '';
}

function sourceName(source, index = 0) {
  return source?.original_name || source?.name || source?.file_path?.split('/').pop() || `Sumber ${index + 1}`;
}

function protectedApiPath(url) {
  const parsed = new URL(url, window.location.origin);
  if (parsed.origin !== window.location.origin || !parsed.pathname.startsWith('/api/')) return null;
  return `${parsed.pathname.replace(/^\/api\/?/, '/')}${parsed.search}`;
}

function inferKind(contentType = '', name = '', url = '') {
  const lower = `${name} ${url}`.toLowerCase().split('?')[0];
  if (contentType.includes('pdf') || lower.endsWith('.pdf')) return 'pdf';
  if (contentType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(lower)) return 'image';
  if (contentType.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(lower)) return 'video';
  return 'other';
}

export default function KmsSourcePreviewModal({ asset, source, index = 0, onClose }) {
  const [state, setState] = useState({ status: 'idle', kind: null, url: null, error: null });
  const url = sourceUrl(source);
  const name = sourceName(source, index);

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    async function load() {
      if (!url) {
        setState({ status: 'error', kind: null, url: null, error: 'Tautan sumber tidak tersedia.' });
        return;
      }

      const apiPath = protectedApiPath(url);
      if (!apiPath) {
        setState({ status: 'ready', kind: 'external', url, error: null });
        return;
      }

      setState({ status: 'loading', kind: null, url: null, error: null });

      try {
        const response = await api.get(apiPath, {
          responseType: 'blob',
          headers: { Accept: 'application/json, application/octet-stream' },
        });
        const contentType = response.headers?.['content-type'] ?? '';

        if (contentType.includes('application/json')) {
          const payload = JSON.parse(await response.data.text());
          if (payload?.url && active) {
            setState({ status: 'ready', kind: 'external', url: payload.url, error: null });
            return;
          }
        }

        objectUrl = URL.createObjectURL(response.data);
        if (active) {
          setState({
            status: 'ready',
            kind: inferKind(contentType, name, url),
            url: objectUrl,
            error: null,
          });
        }
      } catch {
        if (active) {
          setState({ status: 'error', kind: null, url: null, error: 'Pratinjau tidak tersedia.' });
        }
      }
    }

    load();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, name]);

  const openOriginal = () => openProtectedFile(url, name);

  return (
    <div className="modal-backdrop kms-preview-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-box kms-preview-modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div style={{ minWidth: 0 }}>
            <h2>Pratinjau Sumber Dokumen</h2>
            <p className="kms-preview-subtitle">
              {asset?.title ? `${asset.title} · ` : ''}{name}
            </p>
          </div>
          <button className="icon-action" type="button" onClick={onClose} aria-label="Tutup">
            <X size={16} />
          </button>
        </div>

        <div className="kms-preview-body">
          {state.status === 'loading' && (
            <div className="kms-preview-state">
              <Loader2 size={18} className="spin" />
              Memuat pratinjau...
            </div>
          )}

          {state.status === 'error' && (
            <div className="kms-preview-state">
              <FileText size={22} />
              <div>
                <strong>{state.error}</strong>
                <p>Silakan gunakan tombol unduh atau buka sumber.</p>
              </div>
            </div>
          )}

          {state.status === 'ready' && state.kind === 'pdf' && (
            <iframe className="kms-preview-frame" src={state.url} title={name} />
          )}

          {state.status === 'ready' && state.kind === 'image' && (
            <div className="kms-preview-media">
              <img src={state.url} alt={name} />
            </div>
          )}

          {state.status === 'ready' && state.kind === 'video' && (
            <div className="kms-preview-media">
              <video src={state.url} controls />
            </div>
          )}

          {state.status === 'ready' && state.kind === 'external' && (
            <div className="kms-preview-state">
              <ExternalLink size={22} />
              <div>
                <strong>Pratinjau tautan eksternal</strong>
                <p>{state.url}</p>
              </div>
            </div>
          )}

          {state.status === 'ready' && state.kind === 'other' && (
            <div className="kms-preview-state">
              <FileText size={22} />
              <div>
                <strong>Pratinjau belum didukung</strong>
                <p>Format dokumen ini dapat dibuka melalui tombol unduh atau buka sumber.</p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-foot kms-preview-foot">
          <button type="button" className="outline-button compact" onClick={onClose}>Tutup</button>
          <button type="button" className="primary-button compact" onClick={openOriginal}>
            {state.kind === 'external' ? <ExternalLink size={13} /> : <Download size={13} />}
            {state.kind === 'external' ? 'Buka Tautan' : 'Unduh / Buka'}
          </button>
        </div>
      </div>
    </div>
  );
}
