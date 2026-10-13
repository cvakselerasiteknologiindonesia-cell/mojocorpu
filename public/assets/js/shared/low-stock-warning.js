/**
 * low-stock-warning.js
 *
 * Tampilkan notifikasi SweetAlert jika ada item stok di bawah minimum
 * setelah posting transaksi.
 *
 * Dipanggil setelah mendapat response dari endpoint /post:
 *   window.Simpera.showLowStockWarning(data.low_stock_warnings)
 *
 * Format low_stock_warnings:
 *   [{ id, code, name, total_stock, minimum_stock }, ...]
 */
(function () {
    'use strict';

    /**
     * Format angka stok ke format Indonesia (maks 3 desimal, tanpa trailing zero).
     * @param {number} value
     * @returns {string}
     */
    function formatQty(value) {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        }).format(value ?? 0);
    }

    /**
     * Tampilkan notifikasi stok menipis jika ada item di bawah minimum.
     *
     * @param {Array<{id: number, code: string, name: string, total_stock: number, minimum_stock: number}>} warnings
     */
    function showLowStockWarning(warnings) {
        if (! warnings || warnings.length === 0) {
            return;
        }

        const sa = window.Swal || window.Sweetalert2 || window.swal;

        if (! sa) {
            // Fallback: console warning jika SweetAlert tidak tersedia.
            console.warn('[Simpera] Stok menipis:', warnings.map((w) => w.code).join(', '));

            return;
        }

        const maxDisplay = 5;
        const shown      = warnings.slice(0, maxDisplay);
        const extra      = warnings.length - maxDisplay;

        const rows = shown.map((w) => {
            const isOut = w.total_stock <= 0;
            const icon  = isOut ? '🔴' : '🟡';
            const label = isOut ? 'Habis' : 'Menipis';

            return `<tr>
                <td style="padding:2px 8px 2px 0;font-weight:600">${icon} ${w.code}</td>
                <td style="padding:2px 8px">${w.name}</td>
                <td style="padding:2px 0;text-align:right;color:${isOut ? '#dc3545' : '#856404'}">
                    ${formatQty(w.total_stock)} / ${formatQty(w.minimum_stock)} — <em>${label}</em>
                </td>
            </tr>`;
        }).join('');

        const extraNote = extra > 0
            ? `<p style="margin:8px 0 0;font-size:0.85em;color:#6c757d;">dan ${extra} barang lainnya…</p>`
            : '';

        sa.fire({
            title: '⚠️ Stok Menipis',
            html: `
                <p style="margin:0 0 10px;text-align:left;font-size:0.9em;">
                    Stok barang berikut berada di bawah atau sama dengan batas minimum:
                </p>
                <div style="overflow-x:auto">
                    <table style="width:100%;font-size:0.85em;text-align:left;border-collapse:collapse">
                        <thead>
                            <tr style="border-bottom:1px solid #dee2e6">
                                <th style="padding:2px 8px 4px 0">Kode</th>
                                <th style="padding:2px 8px">Nama</th>
                                <th style="padding:2px 0;text-align:right">Stok / Min</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                ${extraNote}
                <p style="margin:10px 0 0;font-size:0.82em;color:#6c757d;text-align:left">
                    Segera buat <strong>Penerimaan Barang</strong> untuk mengisi stok.
                </p>
            `,
            icon: 'warning',
            confirmButtonText: 'Mengerti',
            confirmButtonColor: '#0d6efd',
            width: '520px',
        });
    }

    // Expose ke namespace global Simpera.
    window.Simpera = window.Simpera || {};
    window.Simpera.showLowStockWarning = showLowStockWarning;
})();
