(function () {
    const page = document.getElementById('opening-stock-page');

    if (! page) {
        return;
    }

    const createOpeningStockModal = document.getElementById('createOpeningStockModal');
    const createOpeningStockForm = document.getElementById('create-opening-stock-form');
    const saveOpeningStockButton = document.getElementById('save-opening-stock-button');
    const detailBody = document.getElementById('opening-detail-body');
    const detailRowTemplate = document.getElementById('opening-detail-row-template');
    const addDetailRowButton = document.getElementById('add-opening-detail-row');
    const grandTotal = document.getElementById('opening-grand-total');
    const detailsError = document.getElementById('details-error');
    const openingStockTable = document.getElementById('opening-stock-table');
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

    function formatCurrency(value) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(value || 0);
    }

    function detailRows() {
        return Array.from(detailBody.querySelectorAll('.opening-detail-row'));
    }

    function reindexRows() {
        detailRows().forEach((row, index) => {
            row.querySelectorAll('[name]').forEach((input) => {
                input.name = input.name.replace(/details\[\d+]/, `details[${index}]`);
            });
        });
    }

    function selectedItemIds(excludeRow = null) {
        return detailRows()
            .filter((row) => row !== excludeRow)
            .map((row) => row.querySelector('.opening-item-select')?.value)
            .filter((v) => v && v !== '');
    }

    function markDuplicates() {
        detailRows().forEach((row) => {
            const select = row.querySelector('.opening-item-select');

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
            .map((row) => row.querySelector('.opening-item-select')?.value)
            .filter((v) => v && v !== '');

        return new Set(ids).size !== ids.length;
    }

    function updateTotals() {
        let total = 0;

        detailRows().forEach((row) => {
            const quantity = Number(row.querySelector('.opening-qty')?.value || 0);
            const price = Number(row.querySelector('.opening-price')?.value || 0);
            const subtotal = quantity * price;

            total += subtotal;

            const subtotalCell = row.querySelector('.opening-subtotal');

            if (subtotalCell) {
                subtotalCell.textContent = formatCurrency(subtotal);
            }
        });

        grandTotal.textContent = formatCurrency(total);
    }

    function addDetailRow() {
        const index = detailRows().length;
        const html = detailRowTemplate.innerHTML.replaceAll('__IDX__', String(index));

        detailBody.insertAdjacentHTML('beforeend', html);
        updateTotals();
    }

    function resetForm() {
        createOpeningStockForm?.reset();
        detailBody.innerHTML = '';
        detailsError.textContent = '';
        window.Simpera.clearFormErrors(createOpeningStockForm);
        addDetailRow();
        markDuplicates();
    }

    function payloadFromForm() {
        const formData = new FormData(createOpeningStockForm);
        const details = detailRows().map((row) => ({
            item_id: row.querySelector('.opening-item-select')?.value,
            quantity: row.querySelector('.opening-qty')?.value,
            unit_price: row.querySelector('.opening-price')?.value || 0,
            notes: row.querySelector('.opening-line-notes')?.value,
        }));

        return {
            opening_date: formData.get('opening_date'),
            location_id: formData.get('location_id'),
            external_reference: formData.get('external_reference'),
            notes: formData.get('notes'),
            details,
        };
    }

    function showValidationErrors(errors) {
        window.Simpera.showFormErrors(createOpeningStockForm, errors);
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
                detailsError.textContent = messages[0] || 'Baris barang tidak valid.';
            }
        });
    }

    addDetailRowButton?.addEventListener('click', () => {
        addDetailRow();
    });

    detailBody?.addEventListener('input', (event) => {
        if (event.target.matches('.opening-qty, .opening-price')) {
            updateTotals();
        }

        if (event.target.matches('.opening-qty')) {
            const row = event.target.closest('tr');
            const select = row?.querySelector('.opening-item-select');
            const isIntegerQty = select?.selectedOptions[0]?.dataset.integerQty === '1';

            if (isIntegerQty && Number.isInteger(Number(event.target.value))) {
                event.target.classList.remove('is-invalid');
            }
        }
    });

    detailBody?.addEventListener('change', (event) => {
        if (! event.target.matches('.opening-item-select')) {
            return;
        }

        const priceInput = event.target.closest('tr')?.querySelector('.opening-price');
        const qtyInput = event.target.closest('tr')?.querySelector('.opening-qty');
        const unitSuffix = event.target.closest('tr')?.querySelector('.opening-unit-suffix');
        const selectedOption = event.target.selectedOptions[0];

        // Auto-fill harga
        if (priceInput && Number(priceInput.value || 0) === 0) {
            priceInput.value = selectedOption?.dataset.lastPrice || 0;
            updateTotals();
        }

        // Suffix satuan
        if (unitSuffix) {
            unitSuffix.textContent = selectedOption?.dataset.unit || '—';
        }

        // Enforce integer qty
        if (qtyInput) {
            const isIntegerQty = selectedOption?.dataset.integerQty === '1';
            qtyInput.step = isIntegerQty ? '1' : '0.001';
            qtyInput.min  = isIntegerQty ? '1' : '0.001';
            qtyInput.placeholder = isIntegerQty ? 'Contoh: 5' : 'Contoh: 1.5';

            if (isIntegerQty && qtyInput.value && ! Number.isInteger(Number(qtyInput.value))) {
                qtyInput.value = Math.ceil(Number(qtyInput.value));
                updateTotals();
            }
        }

        markDuplicates();
    });

    detailBody?.addEventListener('click', (event) => {
        const removeButton = event.target.closest('.remove-opening-detail-row');

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

    createOpeningStockModal?.addEventListener('shown.bs.modal', () => {
        if (detailRows().length === 0) {
            addDetailRow();
        }
    });

    createOpeningStockModal?.addEventListener('hidden.bs.modal', () => {
        resetForm();
    });

    createOpeningStockForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(createOpeningStockForm);
        detailsError.textContent = '';

        // Blokir jika ada duplikat
        if (hasDuplicateItems()) {
            markDuplicates();
            detailsError.textContent = 'Terdapat barang yang sama dalam daftar. Hapus duplikat sebelum menyimpan.';
            detailsError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        // Validasi integer qty
        let hasIntegerQtyError = false;
        detailRows().forEach((row) => {
            const select = row.querySelector('.opening-item-select');
            const qtyInput = row.querySelector('.opening-qty');
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

        const confirmed = await Swal.fire({
            title: 'Posting stok awal?',
            text: 'Stok awal langsung memperbarui saldo dan tidak bisa diedit.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, posting',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#6c757d',
        });

        if (! confirmed.isConfirmed) {
            return;
        }

        if (saveOpeningStockButton) {
            saveOpeningStockButton.disabled = true;
            saveOpeningStockButton.textContent = 'Memposting...';
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
                throw new Error(data.message ?? 'Stok awal tidak dapat diposting.');
            }

            const tbody = openingStockTable?.querySelector('tbody');
            const emptyRow = document.getElementById('empty-opening-stock-row');

            if (emptyRow) {
                emptyRow.remove();
            }

            tbody?.insertAdjacentHTML('afterbegin', data.row_html);
            bootstrap.Modal.getInstance(createOpeningStockModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message ?? 'Stok awal berhasil diposting.',
                icon: 'success',
                timer: 1800,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire({
                title: 'Gagal memposting',
                text: error.message,
                icon: 'error',
            });
        } finally {
            if (saveOpeningStockButton) {
                saveOpeningStockButton.disabled = false;
                saveOpeningStockButton.textContent = 'Simpan dan Posting';
            }
        }
    });

    addDetailRow();
})();
