/**
 * item-search.js
 *
 * Inisialisasi Selectr (mobius1-selectr) pada <select> barang di baris detail.
 * Mengikuti pola implementasi dari proyek sipkp.
 *
 * Cara pakai:
 *   window.Simpera.initSelectrOnRow(row, selectSelector, onChangeFn)
 *   window.Simpera.destroySelectrsIn(container, selectSelector)
 */
(function () {
    'use strict';

    // Simpan instance Selectr per elemen.
    const instances = new WeakMap();

    /**
     * Inisialisasi Selectr pada semua <select> yang cocok dalam baris.
     *
     * @param {HTMLElement}  row         Baris detail yang baru ditambahkan
     * @param {string}       selectSel   CSS selector untuk <select> barang
     * @param {Function}     [onChange]  Dipanggil saat nilai berubah: (selectEl) => void
     */
    function initSelectrOnRow(row, selectSel, onChange) {
        if (typeof Selectr === 'undefined') {
            // Selectr tidak tersedia — select tetap berfungsi secara native.
            return;
        }

        const selects = row.querySelectorAll(selectSel);

        selects.forEach((select) => {
            if (instances.has(select)) { return; }

            const instance = new Selectr(select, {
                searchable: true,
                placeholder: 'Pilih barang...',
                width: '100%',
                searchPlaceholder: 'Ketik kode / nama barang...',
            });

            instances.set(select, instance);

            // Selectr dispatch "selectr.change" — bridge ke native change
            // agar handler change yang sudah ada tetap berjalan.
            select.addEventListener('selectr.change', () => {
                select.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Panggil callback onChange jika disediakan.
            if (typeof onChange === 'function') {
                select.addEventListener('selectr.change', () => {
                    onChange(select);
                });
            }
        });
    }

    /**
     * Hancurkan semua instance Selectr dalam container (saat reset form).
     *
     * @param {HTMLElement} container
     * @param {string}      selectSel
     */
    function destroySelectrsIn(container, selectSel) {
        if (! container) { return; }

        container.querySelectorAll(selectSel).forEach((select) => {
            const instance = instances.get(select);
            if (instance) {
                try { instance.destroy(); } catch (_) {}
                instances.delete(select);
            }
        });
    }

    // ── Expose ───────────────────────────────────────────────────────────────
    window.Simpera = window.Simpera || {};
    window.Simpera.initSelectrOnRow  = initSelectrOnRow;
    window.Simpera.destroySelectrsIn = destroySelectrsIn;
    window.Simpera.bindItemSearch    = function () {};
    window.Simpera.filterItemOptions = function () {};
})();
