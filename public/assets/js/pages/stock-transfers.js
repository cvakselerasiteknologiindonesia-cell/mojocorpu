(function () {
    'use strict';

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const page = document.getElementById('transfer-page');

    function sweetAlert() {
        return window.Swal || window.Sweetalert2 || window.swal;
    }

    function formatQty(value) {
        return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(value || 0);
    }

    async function confirmAction(options) {
        const alert = sweetAlert();

        if (! alert) {
            return window.confirm(options.text || options.title || 'Lanjutkan?');
        }

        const result = await alert.fire({
            title: options.title || 'Konfirmasi',
            text: options.text || 'Lanjutkan?',
            icon: options.icon || 'question',
            showCancelButton: true,
            confirmButtonText: options.confirmButtonText || 'Ya, lanjutkan',
            cancelButtonText: 'Batal',
            confirmButtonColor: options.confirmButtonColor || '#0d6efd',
            cancelButtonColor: '#6c757d',
        });

        return result.isConfirmed;
    }

    async function postTransition(button, options) {
        const confirmed = await confirmAction(options);

        if (! confirmed) {
            return;
        }

        button.disabled = true;

        try {
            const { response, data } = await window.Simpera.submitJson(button.dataset.url, {
                csrfToken,
                payload: {},
            });

            if (! response.ok) {
                throw new Error(data.message || 'Gagal memperbarui status transfer.');
            }

            const row = button.closest('tr');

            if (row && data.row_html) {
                row.outerHTML = data.row_html;
            } else {
                const sa = sweetAlert();

                if (sa) {
                    await sa.fire('Berhasil', data.message || 'Status berhasil diperbarui.', 'success');
                }

                // Redirect jika ada (mis. setelah delete dari halaman show)
                if (button.dataset.redirect) {
                    window.location.href = button.dataset.redirect;
                } else {
                    window.location.reload();
                }

                return;
            }

            const sa = sweetAlert();

            if (sa) {
                sa.fire({ title: 'Berhasil', text: data.message || 'Status berhasil diperbarui.', icon: 'success', timer: 1700, showConfirmButton: false });
            }

            // Tampilkan notifikasi stok menipis jika ada (setelah posting transfer).
            if (data.low_stock_warnings?.length) {
                window.Simpera?.showLowStockWarning(data.low_stock_warnings);
            }
        } catch (error) {
            const sa = sweetAlert();

            if (sa) {
                sa.fire({ title: options.errorTitle || 'Gagal', text: error.message, icon: 'error' });
            } else {
                window.alert(`${options.errorTitle || 'Gagal'}: ${error.message}`);
            }
        } finally {
            button.disabled = false;
        }
    }

    // ── Global event delegation (index + show page) ──────────────────────────

    document.addEventListener('click', (event) => {
        const submitBtn  = event.target.closest('.transfer-submit-button');
        const approveBtn = event.target.closest('.transfer-approve-button');
        const postBtn    = event.target.closest('.transfer-post-button');
        const deleteBtn  = event.target.closest('.transfer-delete-button');

        if (submitBtn) {
            event.preventDefault();
            postTransition(submitBtn, { title: 'Ajukan transfer?', text: `${submitBtn.dataset.number} akan diajukan untuk disetujui.` });
            return;
        }

        if (approveBtn) {
            event.preventDefault();
            postTransition(approveBtn, { title: 'Setujui transfer?', text: `${approveBtn.dataset.number} akan masuk ke tahap siap posting.` });
            return;
        }

        if (postBtn) {
            event.preventDefault();
            postTransition(postBtn, {
                title: 'Posting transfer?',
                text: postBtn.dataset.confirm || `${postBtn.dataset.number} akan memindahkan stok. Sistem akan menolak jika stok tidak cukup.`,
                icon: 'warning',
                confirmButtonText: 'Ya, posting',
                confirmButtonColor: '#198754',
                errorTitle: 'Stok tidak cukup',
            });
            return;
        }

        const reverseBtn = event.target.closest('.transfer-reverse-button');

        if (reverseBtn) {
            event.preventDefault();
            postTransition(reverseBtn, {
                title: 'Reverse transfer?',
                text: `Transfer ${reverseBtn.dataset.number} akan dibatalkan. Stok akan dikembalikan ke posisi semula.`,
                icon: 'warning',
                confirmButtonText: 'Ya, reverse',
                confirmButtonColor: '#dc3545',
                errorTitle: 'Gagal reverse',
            });
            return;
        }

        if (deleteBtn) {
            event.preventDefault();
            postTransition(deleteBtn, {
                title: 'Hapus transfer?',
                text: `Transfer ${deleteBtn.dataset.number} akan dihapus.`,
                icon: 'warning',
                confirmButtonText: 'Ya, hapus',
                confirmButtonColor: '#dc3545',
                errorTitle: 'Gagal menghapus',
            });
        }
    }, true);

    // ── Index page only ──────────────────────────────────────────────────────

    if (! page) {
        return;
    }

    const storeUrl         = page.dataset.storeUrl;
    const createModal      = document.getElementById('createTransferModal');
    const createForm       = document.getElementById('create-transfer-form');
    const saveButton       = document.getElementById('save-transfer-button');
    const detailBody       = document.getElementById('transfer-detail-body');
    const rowTemplate      = document.getElementById('transfer-detail-row-template');
    const addRowButton     = document.getElementById('add-transfer-detail-row');
    const detailsError     = document.getElementById('transfer-details-error');
    const totalQuantityEl  = document.getElementById('transfer-total-quantity');
    const fromLocationEl   = document.getElementById('transfer-from-location');
    const toLocationEl     = document.getElementById('transfer-to-location');
    const stockWarning     = document.getElementById('transfer-stock-warning');
    const stockWarningText = document.getElementById('transfer-stock-warning-text');
    const availabilityEl   = document.getElementById('transfer-stock-availability-data');
    let stockAvailability  = {};

    try {
        stockAvailability = JSON.parse(availabilityEl?.textContent || '{}');
    } catch (_) {
        stockAvailability = {};
    }

    function detailRows() {
        return Array.from(detailBody.querySelectorAll('.transfer-detail-row'));
    }

    function reindex() {
        detailRows().forEach((row, idx) => {
            row.querySelectorAll('[name]').forEach((el) => {
                el.name = el.name.replace(/details\[\d+]/, `details[${idx}]`);
            });
        });
    }

    function selectedItemIds(excludeRow = null) {
        return detailRows()
            .filter((row) => row !== excludeRow)
            .map((row) => row.querySelector('.transfer-item-select')?.value)
            .filter((v) => v && v !== '');
    }

    function markDuplicates() {
        detailRows().forEach((row) => {
            const select = row.querySelector('.transfer-item-select');

            if (! select) {
                return;
            }

            const itemId = select.value;
            const isDuplicate = itemId && selectedItemIds(row).includes(itemId);

            select.classList.toggle('is-invalid', !! isDuplicate);

            let feedback = row.querySelector('.detail-item-duplicate-msg');

            if (isDuplicate) {
                if (! feedback) {
                    feedback = document.createElement('div');
                    feedback.className = 'invalid-feedback detail-item-duplicate-msg';
                    feedback.textContent = 'Barang ini sudah ada dalam daftar.';
                    select.after(feedback);
                }
            } else {
                feedback?.remove();
            }
        });
    }

    function hasDuplicateItems() {
        const ids = detailRows()
            .map((row) => row.querySelector('.transfer-item-select')?.value)
            .filter((v) => v && v !== '');

        return new Set(ids).size !== ids.length;
    }

    function fromLocationId() {
        return fromLocationEl?.value || '';
    }

    function availableFor(itemId) {
        const locId = fromLocationId();
        return Number(stockAvailability?.[locId]?.[itemId] || 0);
    }

    function updateTotals() {
        const total = detailRows().reduce((sum, row) => sum + Number(row.querySelector('.transfer-qty')?.value || 0), 0);

        if (totalQuantityEl) {
            totalQuantityEl.textContent = formatQty(total);
        }

        updateStockWarnings();
    }

    function updateStockWarnings() {
        const locId = fromLocationId();
        const requested = {};

        detailRows().forEach((row) => {
            const itemId = row.querySelector('.transfer-item-select')?.value;
            const qty = Number(row.querySelector('.transfer-qty')?.value || 0);

            if (itemId) {
                requested[itemId] = (requested[itemId] || 0) + qty;
            }
        });

        const shortages = [];

        detailRows().forEach((row) => {
            const itemId  = row.querySelector('.transfer-item-select')?.value;
            const badge   = row.querySelector('.transfer-stock-status');

            if (! badge) {
                return;
            }

            if (! locId || ! itemId) {
                badge.className = 'badge bg-light text-muted border transfer-stock-status';
                badge.textContent = 'Pilih barang & lokasi';
                return;
            }

            const avail    = availableFor(itemId);
            const needed   = requested[itemId] || 0;
            const isEnough = needed <= avail;

            badge.className = `badge transfer-stock-status bg-${isEnough ? 'success' : 'danger'}-subtle text-${isEnough ? 'success' : 'danger'}`;
            badge.textContent = isEnough
                ? `Tersedia: ${formatQty(avail)}`
                : `Kurang ${formatQty(needed - avail)}`;

            if (! isEnough) {
                const select = row.querySelector('.transfer-item-select');
                const label  = select?.selectedOptions?.[0]?.textContent?.trim() || 'Barang';
                shortages.push(label);
            }
        });

        if (stockWarning && stockWarningText) {
            if (shortages.length > 0) {
                stockWarning.classList.remove('d-none');
                stockWarningText.textContent = `Stok tidak cukup: ${shortages.join(', ')}.`;
            } else {
                stockWarning.classList.add('d-none');
            }
        }
    }

    function addRow() {
        if (! rowTemplate || ! detailBody) {
            return;
        }

        const idx = detailRows().length;
        const html = rowTemplate.innerHTML.replace(/__IDX__/g, String(idx));
        const tmp  = document.createElement('tbody');
        tmp.innerHTML = html;
        const row = tmp.firstElementChild;

        if (row) {
            detailBody.appendChild(row);
        }

        updateTotals();
    }

    function resetForm() {
        createForm?.reset();
        window.Simpera?.clearFormErrors(createForm);

        if (detailBody) {
            detailBody.innerHTML = '';
        }

        if (detailsError) {
            detailsError.textContent = '';
        }

        if (stockWarning) {
            stockWarning.classList.add('d-none');
        }

        if (totalQuantityEl) {
            totalQuantityEl.textContent = '0';
        }

        addRow();
        markDuplicates();
    }

    // ── Event listeners ──────────────────────────────────────────────────────

    addRowButton?.addEventListener('click', addRow);

    detailBody?.addEventListener('click', (event) => {
        if (event.target.closest('.remove-transfer-detail-row')) {
            event.target.closest('.transfer-detail-row')?.remove();
            reindex();
            updateTotals();
            markDuplicates();
        }
    });

    detailBody?.addEventListener('change', (event) => {
        if (event.target.matches('.transfer-item-select')) {
            const selectedOption = event.target.selectedOptions[0];
            const qtyInput = event.target.closest('tr')?.querySelector('.transfer-qty');
            const unitSuffix = event.target.closest('tr')?.querySelector('.transfer-unit-suffix');

            if (unitSuffix) {
                unitSuffix.textContent = selectedOption?.dataset.unit || '—';
            }

            if (qtyInput) {
                const isIntegerQty = selectedOption?.dataset.integerQty === '1';
                qtyInput.step = isIntegerQty ? '1' : '0.001';
                qtyInput.min  = isIntegerQty ? '1' : '0.001';
                qtyInput.placeholder = isIntegerQty ? 'Contoh: 5' : 'Contoh: 1.5';

                if (isIntegerQty && qtyInput.value && ! Number.isInteger(Number(qtyInput.value))) {
                    qtyInput.value = Math.ceil(Number(qtyInput.value));
                }
            }

            updateTotals();
            markDuplicates();
        }

        if (event.target.matches('.transfer-qty')) {
            updateTotals();

            const row = event.target.closest('tr');
            const select = row?.querySelector('.transfer-item-select');
            const isIntegerQty = select?.selectedOptions[0]?.dataset.integerQty === '1';

            if (isIntegerQty && Number.isInteger(Number(event.target.value))) {
                event.target.classList.remove('is-invalid');
            }
        }
    });

    fromLocationEl?.addEventListener('change', updateStockWarnings);
    toLocationEl?.addEventListener('change', () => {}); // placeholder, bisnis rule di backend

    createModal?.addEventListener('show.bs.modal', () => {
        if (detailRows().length === 0) {
            addRow();
        }
    });

    createModal?.addEventListener('hidden.bs.modal', resetForm);

    createForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera?.clearFormErrors(createForm);

        if (detailsError) {
            detailsError.textContent = '';
        }

        // Blokir submit jika ada duplikat
        if (hasDuplicateItems()) {
            markDuplicates();

            if (detailsError) {
                detailsError.textContent = 'Terdapat barang yang sama dalam daftar. Hapus duplikat sebelum menyimpan.';
                detailsError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            return;
        }

        // Validasi integer qty
        let hasIntegerQtyError = false;
        detailRows().forEach((row) => {
            const select = row.querySelector('.transfer-item-select');
            const qtyInput = row.querySelector('.transfer-qty');
            const isIntegerQty = select?.selectedOptions[0]?.dataset.integerQty === '1';

            if (isIntegerQty && qtyInput && ! Number.isInteger(Number(qtyInput.value))) {
                qtyInput.classList.add('is-invalid');
                hasIntegerQtyError = true;
            }
        });

        if (hasIntegerQtyError) {
            if (detailsError) {
                detailsError.textContent = 'Jumlah untuk beberapa barang harus berupa bilangan bulat (tidak boleh pecahan).';
                detailsError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            return;
        }

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Menyimpan...';
        }

        try {
            const fd = new FormData(createForm);
            const details = detailRows().map((row, idx) => ({
                item_id:  row.querySelector('.transfer-item-select')?.value,
                quantity: row.querySelector('.transfer-qty')?.value,
                notes:    row.querySelector('input[name$="[notes]"]')?.value || '',
            }));

            const { response, data } = await window.Simpera.submitJson(storeUrl, {
                csrfToken,
                payload: {
                    transfer_date:      fd.get('transfer_date'),
                    from_location_id:   fd.get('from_location_id'),
                    to_location_id:     fd.get('to_location_id'),
                    notes:              fd.get('notes') || null,
                    details,
                },
            });

            if (response.status === 422) {
                window.Simpera?.showFormErrors(createForm, data.errors ?? {});

                if (data.errors?.details || data.errors?.['details.0.item_id']) {
                    if (detailsError) {
                        detailsError.textContent = 'Periksa baris barang — ada yang tidak valid.';
                    }
                }

                return;
            }

            if (! response.ok) {
                throw new Error(data.message || 'Transfer tidak dapat disimpan.');
            }

            const transferTable = document.getElementById('transfer-table');

            if (transferTable) {
                const emptyRow = transferTable.querySelector('tr:not([data-transfer-id])');

                if (emptyRow) {
                    emptyRow.insertAdjacentHTML('beforebegin', data.row_html);
                } else {
                    transferTable.querySelector('tbody')?.insertAdjacentHTML('beforeend', data.row_html);
                }
            }

            bootstrap.Modal.getInstance(createModal)?.hide();

            const sa = sweetAlert();

            if (sa) {
                sa.fire({ title: 'Berhasil', text: data.message || 'Transfer berhasil dibuat.', icon: 'success', timer: 1700, showConfirmButton: false });
            }
        } catch (error) {
            const sa = sweetAlert();

            if (sa) {
                sa.fire({ title: 'Gagal menyimpan', text: error.message, icon: 'error' });
            }
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = 'Simpan Draft';
            }
        }
    });

    // Init: tambah satu baris kosong saat halaman load
    if (detailBody && detailRows().length === 0) {
        addRow();
    }
})();
