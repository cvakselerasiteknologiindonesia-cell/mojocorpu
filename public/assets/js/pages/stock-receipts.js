(function () {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const page = document.getElementById('receipt-page');

    function formatCurrency(value) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(value || 0);
    }

    async function confirmAction(options) {
        const result = await Swal.fire({
            title: options.title || 'Konfirmasi',
            text: options.text || 'Lanjutkan proses ini?',
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
                throw new Error(data.message || 'Status penerimaan barang tidak dapat diperbarui.');
            }

            const row = button.closest('tr');

            if (row && data.row_html) {
                row.outerHTML = data.row_html;
            } else {
                await Swal.fire('Berhasil', data.message || 'Status berhasil diperbarui.', 'success');
                window.location.reload();

                return;
            }

            Swal.fire({
                title: 'Berhasil',
                text: data.message || 'Status berhasil diperbarui.',
                icon: 'success',
                timer: 1700,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire({
                title: 'Gagal',
                text: error.message,
                icon: 'error',
            });
        } finally {
            button.disabled = false;
        }
    }

    document.addEventListener('click', (event) => {
        const submitButton = event.target.closest('.receipt-submit-button');
        const approveButton = event.target.closest('.receipt-approve-button');
        const postButton = event.target.closest('.receipt-post-button');
        const detailTransitionButton = event.target.closest('.action-transition-btn');

        if (submitButton) {
            postTransition(submitButton, {
                title: 'Ajukan penerimaan?',
                text: `${submitButton.dataset.number} akan diajukan untuk disetujui.`,
            });

            return;
        }

        if (approveButton) {
            postTransition(approveButton, {
                title: 'Setujui penerimaan?',
                text: `${approveButton.dataset.number} akan masuk ke tahap siap posting.`,
            });

            return;
        }

        if (postButton) {
            postTransition(postButton, {
                title: 'Posting penerimaan?',
                text: `${postButton.dataset.number} akan memperbarui saldo stok dan tidak bisa diubah lagi.`,
                icon: 'warning',
                confirmButtonText: 'Ya, posting',
                confirmButtonColor: '#198754',
            });

            return;
        }

        const reverseButton = event.target.closest('.receipt-reverse-button');

        if (reverseButton) {
            postTransition(reverseButton, {
                title: 'Reverse penerimaan?',
                text: `Penerimaan ${reverseButton.dataset.number} akan dibatalkan. Stok akan dikurangi kembali.`,
                icon: 'warning',
                confirmButtonText: 'Ya, reverse',
                confirmButtonColor: '#dc3545',
                errorTitle: 'Gagal reverse',
            });

            return;
        }

        if (detailTransitionButton) {
            postTransition(detailTransitionButton, {
                title: 'Konfirmasi',
                text: detailTransitionButton.dataset.confirm || 'Lanjutkan proses ini?',
                icon: detailTransitionButton.dataset.confirm?.includes('Posting') ? 'warning' : 'question',
                confirmButtonText: detailTransitionButton.dataset.confirm?.includes('Posting') ? 'Ya, posting' : 'Ya, lanjutkan',
            });
        }
    });

    if (! page) {
        return;
    }

    const createReceiptModal = document.getElementById('createReceiptModal');
    const createReceiptForm = document.getElementById('create-receipt-form');
    const saveReceiptButton = document.getElementById('save-receipt-button');
    const detailBody = document.getElementById('receipt-detail-body');
    const detailRowTemplate = document.getElementById('detail-row-template');
    const addDetailRowButton = document.getElementById('add-detail-row');
    const grandTotal = document.getElementById('receipt-grand-total');
    const detailsError = document.getElementById('details-error');
    const receiptTable = document.getElementById('receipt-table');
    const locationSelect = document.getElementById('receipt-location-id');
    const availabilityScript = document.getElementById('receipt-stock-availability-data');
    let stockAvailability = {};

    try {
        stockAvailability = JSON.parse(availabilityScript?.textContent || '{}');
    } catch (_) {
        stockAvailability = {};
    }

    function currentLocationId() {
        return locationSelect?.value || '';
    }

    function currentStock(itemId) {
        const locId = currentLocationId();

        if (! locId || ! itemId) {
            return null;
        }

        return stockAvailability?.[locId]?.[itemId] ?? null;
    }

    function formatQty(value) {
        return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(value ?? 0);
    }

    function detailRows() {
        return Array.from(detailBody.querySelectorAll('.detail-row'));
    }

    function updateStockBadges() {
        detailRows().forEach((row) => {
            const itemId   = row.querySelector('.detail-item-select')?.value;
            const badge    = row.querySelector('.detail-current-stock');

            if (! badge) {
                return;
            }

            const stock = currentStock(itemId);

            if (stock === null) {
                badge.className = 'badge bg-light text-muted border detail-current-stock font-12';
                badge.textContent = '—';
                return;
            }

            // Untuk penerimaan, stok yang sudah ada di gudang bersifat informatif.
            // Warna hijau jika stok normal, kuning jika nol (perlu restock).
            const tone = stock > 0 ? 'success' : 'warning';
            badge.className = `badge bg-${tone}-subtle text-${tone} detail-current-stock font-12`;
            badge.textContent = formatQty(stock);
        });
    }

    // Ikat live-search barang ke baris detail.
    // Selectr diinisialisasi per baris saat baris ditambahkan.

    function reindexRows() {
        detailRows().forEach((row, index) => {
            row.querySelectorAll('[name]').forEach((input) => {
                input.name = input.name.replace(/details\[\d+]/, `details[${index}]`);
            });
        });
    }

    function updateTotals() {
        let total = 0;

        detailRows().forEach((row) => {
            const quantity = Number(row.querySelector('.detail-qty')?.value || 0);
            const price = Number(row.querySelector('.detail-price')?.value || 0);
            const subtotal = quantity * price;

            total += subtotal;

            const subtotalCell = row.querySelector('.detail-subtotal');

            if (subtotalCell) {
                subtotalCell.textContent = formatCurrency(subtotal);
            }
        });

        grandTotal.textContent = formatCurrency(total);
    }
    function selectedItemIds(excludeRow = null) {
        return detailRows()
            .filter((row) => row !== excludeRow)
            .map((row) => row.querySelector('.detail-item-select')?.value)
            .filter((v) => v && v !== '');
    }

    function markDuplicates() {
        detailRows().forEach((row) => {
            const select = row.querySelector('.detail-item-select');

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
            .map((row) => row.querySelector('.detail-item-select')?.value)
            .filter((v) => v && v !== '');

        return new Set(ids).size !== ids.length;
    }

    function addDetailRow() {
        const index = detailRows().length;
        const html = detailRowTemplate.innerHTML.replaceAll('__IDX__', String(index));

        detailBody.insertAdjacentHTML('beforeend', html);

        const newRow = detailBody.lastElementChild;
        // Select barang menggunakan <select> native dengan optgroup per kategori.
        // Auto-fill harga dan badge stok ditangani oleh event 'change' di bawah.

        updateTotals();
        updateStockBadges();
    }

    function resetForm() {
        createReceiptForm?.reset();
        detailBody.innerHTML = '';
        detailsError.textContent = '';
        window.Simpera.clearFormErrors(createReceiptForm);
        addDetailRow();
        markDuplicates();
    }

    function payloadFromForm() {
        const formData = new FormData(createReceiptForm);
        const supplierId = formData.get('supplier_id');

        return {
            receipt_date: formData.get('receipt_date'),
            source_type: formData.get('source_type'),
            location_id: formData.get('location_id'),
            supplier_id: supplierId === '' ? null : supplierId,
            external_reference: formData.get('external_reference'),
            notes: formData.get('notes'),
            details: detailRows().map((row) => ({
                item_id:    row.querySelector('.detail-item-select')?.value,
                quantity:   row.querySelector('.detail-qty')?.value,
                unit_price: row.querySelector('.detail-price')?.value || 0,
            })),
        };
    }

    function showValidationErrors(errors) {
        window.Simpera.showFormErrors(createReceiptForm, errors);
        detailsError.textContent = errors.details?.[0] ?? '';

        Object.entries(errors).forEach(([field, messages]) => {
            const detailMatch = field.match(/^details\.(\d+)\.(.+)$/);

            if (! detailMatch) {
                return;
            }

            const row = detailRows()[Number(detailMatch[1])];
            const input = row?.querySelector(`[name="details[${detailMatch[1]}][${detailMatch[2]}]"]`);

            input?.classList.add('is-invalid');

            if (! detailsError.textContent) {
                detailsError.textContent = messages[0] || 'Daftar barang tidak valid.';
            }
        });
    }

    addDetailRowButton?.addEventListener('click', () => {
        addDetailRow();
        updateStockBadges();
    });

    detailBody?.addEventListener('input', (event) => {
        if (event.target.matches('.detail-qty, .detail-price')) {
            updateTotals();
        }

        if (event.target.matches('.detail-qty')) {
            const row = event.target.closest('tr');
            const select = row?.querySelector('.detail-item-select');
            const isIntegerQty = select?.selectedOptions[0]?.dataset.integerQty === '1';

            if (isIntegerQty && Number.isInteger(Number(event.target.value))) {
                event.target.classList.remove('is-invalid');
            }
        }
    });

    detailBody?.addEventListener('change', (event) => {
        if (! event.target.matches('.detail-item-select')) {
            return;
        }

        const priceInput    = event.target.closest('tr')?.querySelector('.detail-price');
        const selectedOption = event.target.selectedOptions[0];

        // Selalu update harga saat barang dipilih (bukan hanya saat 0).
        if (priceInput) {
            priceInput.value = selectedOption?.dataset.lastPrice || 0;
            updateTotals();
        }

        // Update satuan di suffix input group
        const unitSuffix = event.target.closest('tr')?.querySelector('.detail-unit-suffix');
        if (unitSuffix) {
            unitSuffix.textContent = selectedOption?.dataset.unit || '—';
        }

        // Enforce integer qty jika barang bertanda is_integer_qty
        const qtyInput = event.target.closest('tr')?.querySelector('.detail-qty');
        if (qtyInput) {
            const isIntegerQty = selectedOption?.dataset.integerQty === '1';
            qtyInput.step = isIntegerQty ? '1' : '0.001';
            qtyInput.min  = isIntegerQty ? '1' : '0.001';
            qtyInput.placeholder = isIntegerQty ? 'Contoh: 5' : 'Contoh: 1.5';

            // Koreksi nilai yang sudah ada jika perlu
            if (isIntegerQty && qtyInput.value && ! Number.isInteger(Number(qtyInput.value))) {
                qtyInput.value = Math.ceil(Number(qtyInput.value));
                updateTotals();
            }

        }

        updateStockBadges();
        markDuplicates();
    });

    // Update semua badge stok saat lokasi tujuan berubah.
    locationSelect?.addEventListener('change', updateStockBadges);

    detailBody?.addEventListener('click', (event) => {
        const removeButton = event.target.closest('.remove-detail-row');

        if (! removeButton) {
            return;
        }

        removeButton.closest('tr')?.remove();

        if (detailRows().length === 0) {
            addDetailRow();
        }

        reindexRows();
        updateTotals();
        markDuplicates();
    });

    createReceiptModal?.addEventListener('shown.bs.modal', () => {
        if (detailRows().length === 0) {
            addDetailRow();
        }

        updateStockBadges();
    });

    createReceiptModal?.addEventListener('hidden.bs.modal', () => {
        resetForm();
    });

    createReceiptForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(createReceiptForm);
        detailsError.textContent = '';

        if (hasDuplicateItems()) {
            markDuplicates();
            detailsError.textContent = 'Terdapat barang yang sama dalam daftar. Hapus duplikat sebelum menyimpan.';
            detailsError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        // Validasi integer qty
        let hasIntegerQtyError = false;
        detailRows().forEach((row) => {
            const select = row.querySelector('.detail-item-select');
            const qtyInput = row.querySelector('.detail-qty');
            const isIntegerQty = select?.selectedOptions[0]?.dataset.integerQty === '1';

            if (isIntegerQty && qtyInput && ! Number.isInteger(Number(qtyInput.value))) {
                qtyInput.classList.add('is-invalid');
                hasIntegerQtyError = true;
            }
        });

        if (hasIntegerQtyError) {
            detailsError.textContent = 'Jumlah untuk beberapa barang harus berupa bilangan bulat (tidak boleh pecahan).';
            detailsError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        if (saveReceiptButton) {
            saveReceiptButton.disabled = true;
            saveReceiptButton.textContent = 'Menyimpan...';
        }

        try {
            const { response, data } = await window.Simpera.submitJson(page.dataset.storeUrl, {
                csrfToken,
                payload: payloadFromForm(),
            });

            if (response.status === 422) {
                showValidationErrors(data.errors ?? { details: [data.message] });

                return;
            }

            if (! response.ok) {
                throw new Error(data.message ?? 'Penerimaan barang tidak dapat disimpan.');
            }

            const tbody = receiptTable?.querySelector('tbody');
            const emptyRow = document.getElementById('empty-receipt-row');

            if (tbody && data.row_html) {
                emptyRow?.remove();

                tbody.insertAdjacentHTML('afterbegin', data.row_html);
            }

            bootstrap.Modal.getInstance(createReceiptModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message ?? 'Penerimaan barang berhasil dibuat.',
                icon: 'success',
                timer: 1800,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire({
                title: 'Gagal menyimpan',
                text: error.message,
                icon: 'error',
            });
        } finally {
            if (saveReceiptButton) {
                saveReceiptButton.disabled = false;
                saveReceiptButton.textContent = 'Simpan Draft';
            }
        }
    });

    receiptTable?.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('.delete-receipt-button');

        if (! deleteButton) {
            return;
        }

        const confirmed = await window.Simpera.confirmDelete({
            title: 'Hapus penerimaan?',
            text: `${deleteButton.dataset.number} akan dihapus dari database.`,
        });

        if (! confirmed) {
            return;
        }

        deleteButton.disabled = true;

        try {
            const { response, data } = await window.Simpera.submitJson(deleteButton.dataset.destroyUrl, {
                method: 'DELETE',
                csrfToken,
                payload: {},
            });

            if (! response.ok) {
                throw new Error(data.message || 'Penerimaan tidak dapat dihapus.');
            }

            deleteButton.closest('tr')?.remove();

            Swal.fire({
                title: 'Berhasil',
                text: data.message || 'Penerimaan berhasil dihapus.',
                icon: 'success',
                timer: 1600,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire({
                title: 'Gagal menghapus',
                text: error.message,
                icon: 'error',
            });
        } finally {
            deleteButton.disabled = false;
        }
    });

    addDetailRow();
})();
