import api from '../api.js';

export async function openProtectedFile(url, fallbackName = 'dokumen') {
  if (!url) return;

  const parsed = new URL(url, window.location.origin);
  const isProtectedApi = parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/');

  if (!isProtectedApi) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  const apiPath = parsed.pathname.replace(/^\/api\/?/, '/');
  const response = await api.get(`${apiPath}${parsed.search}`, {
    responseType: 'blob',
    headers: { Accept: 'application/json, application/octet-stream' },
  });

  const contentType = response.headers?.['content-type'] ?? '';
  if (contentType.includes('application/json')) {
    const payload = JSON.parse(await response.data.text());
    if (payload?.url) {
      window.open(payload.url, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  const blobUrl = URL.createObjectURL(response.data);
  const contentDisposition = response.headers?.['content-disposition'] ?? '';
  const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  const filename = match ? decodeURIComponent(match[1]) : fallbackName;

  const link = document.createElement('a');
  link.href = blobUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
}
