(function () {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const page = document.getElementById('opname-page');

    function formatQuantity(value) {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        }).format(value || 0);
    }

    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value || '';

        return div.innerHTML;
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
                throw new Error(data.message || 'Status stok opname tidak dapat diperbarui.');
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
        const submitButton = event.target.closest('.opname-submit-button');
        const approveButton = event.target.closest('.opname-approve-button');
        const postButton = event.target.closest('.opname-post-button');
        const detailTransitionButton = event.target.closest('.action-transition-btn');

        if (submitButton) {
            postTransition(submitButton, {
                title: 'Ajukan stok opname?',
                text: `${submitButton.dataset.number} akan diajukan untuk disetujui.`,
            });

            return;
        }

        if (approveButton) {
            postTransition(approveButton, {
                title: 'Setujui stok opname?',
                text: `${approveButton.dataset.number} akan masuk ke tahap siap posting.`,
            });

            return;
        }

        if (postButton) {
            postTransition(postButton, {
                title: 'Posting stok opname?',
                text: `${postButton.dataset.number} akan menyesuaikan saldo stok sesuai hitungan fisik.`,
                icon: 'warning',
                confirmButtonText: 'Ya, posting',
                confirmButtonColor: '#198754',
            });

            return;
        }

        if (detailTransitionButton) {
            const isPosting = detailTransitionButton.dataset.confirm?.includes('Posting');

            postTransition(detailTransitionButton, {
                title: 'Konfirmasi',
                text: detailTransitionButton.dataset.confirm || 'Lanjutkan proses ini?',
                icon: isPosting ? 'warning' : 'question',
                confirmButtonText: isPosting ? 'Ya, posting' : 'Ya, lanjutkan',
                confirmButtonColor: isPosting ? '#198754' : '#0d6efd',
            });
        }
    });

    if (! page) {
        return;
    }

    const createOpnameModal = document.getElementById('createOpnameModal');
    const createOpnameForm = document.getElementById('create-opname-form');
    const saveOpnameButton = document.getElementById('save-opname-button');
    const populateButton = document.getElementById('populate-opname-button');
    const locationSelect = document.getElementById('opname-location-id');
    const detailBody = document.getElementById('opname-detail-body');
    const detailsError = document.getElementById('opname-details-error');
    const totalDifference = document.getElementById('opname-total-difference');
    const adjustmentCount = document.getElementById('opname-adjustment-count');
    const opnameTable = document.querySelector('table');

    function detailRows() {
        return Array.from(detailBody.querySelectorAll('.opname-detail-row'));
    }

    function updateTotals() {
        let total = 0;
        let changedRows = 0;

        detailRows().forEach((row) => {
            const systemQty = Number(row.dataset.systemQuantity || 0);
            const actualQty = Number(row.querySelector('.opname-actual-qty')?.value || 0);
            const diff = actualQty - systemQty;
            const diffCell = row.querySelector('.opname-difference');

            total += diff;

            if (diff !== 0) {
                changedRows += 1;
            }

            diffCell.textContent = `${diff > 0 ? '+' : ''}${formatQuantity(diff)}`;
            diffCell.classList.toggle('text-success', diff > 0);
            diffCell.classList.toggle('text-danger', diff < 0);
            diffCell.classList.toggle('text-muted', diff === 0);
            row.classList.toggle('table-warning', diff !== 0);
        });

        totalDifference.textContent = `${total > 0 ? '+' : ''}${formatQuantity(total)}`;
        totalDifference.classList.toggle('text-success', total > 0);
        totalDifference.classList.toggle('text-danger', total < 0);
        totalDifference.classList.toggle('text-muted', total === 0);
        adjustmentCount.textContent = `${changedRows} item disesuaikan`;
    }

    function rowHtml(row, index) {
        const isIntegerQty = Boolean(row.is_integer_qty);
        const step = isIntegerQty ? '1' : '0.001';
        const min  = isIntegerQty ? '0' : '0';
        const actualValue = isIntegerQty
            ? Math.round(Number(row.actual_quantity ?? row.system_quantity ?? 0))
            : Number(row.actual_quantity ?? row.system_quantity ?? 0);

        return `
            <tr class="opname-detail-row" data-system-quantity="${Number(row.system_quantity || 0)}" data-item-id="${row.item_id}" data-integer-qty="${isIntegerQty ? '1' : '0'}">
                <td>
                    <input type="hidden" class="opname-item-id" name="details[${index}][item_id]" value="${row.item_id}">
                    <span class="fw-semibold">${escapeHtml(row.item_name)}</span><br>
                    <span class="text-muted font-13">${escapeHtml(row.item_code)} / ${escapeHtml(row.unit || '-')}</span>
                </td>
                <td class="text-end align-middle">
                    ${formatQuantity(Number(row.system_quantity || 0))}
                    <input type="hidden" name="details[${index}][system_quantity]" value="${Number(row.system_quantity || 0)}">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm text-end opname-actual-qty"
                           name="details[${index}][actual_quantity]" min="${min}" step="${step}"
                           value="${actualValue}"
                           placeholder="${isIntegerQty ? 'Contoh: 5' : 'Contoh: 1.5'}" required>
                </td>
                <td class="text-end align-middle fw-semibold opname-difference text-muted">0</td>
                <td>
                    <input type="text" class="form-control form-control-sm opname-line-notes"
                           name="details[${index}][notes]" placeholder="Catatan">
                </td>
                <td class="text-center align-middle">
                    <button type="button" class="btn btn-link p-0 remove-opname-detail-row" title="Hapus Barang">
                        <i class="fas fa-times text-danger"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    function markDuplicates() {
        const seen = {};

        detailRows().forEach((row) => {
            const itemId = row.dataset.itemId;

            if (! itemId) {
                return;
            }

            const isDuplicate = seen[itemId] !== undefined;
            seen[itemId] = true;

            const qtyInput = row.querySelector('.opname-actual-qty');
            const nameCell = row.querySelector('td:first-child');

            if (isDuplicate) {
                qtyInput?.classList.add('is-invalid');

                if (nameCell && ! nameCell.querySelector('.detail-item-duplicate-msg')) {
                    const msg = document.createElement('div');
                    msg.className = 'invalid-feedback detail-item-duplicate-msg d-block';
                    msg.textContent = 'Barang ini sudah ada dalam daftar.';
                    nameCell.appendChild(msg);
                }
            } else {
                qtyInput?.classList.remove('is-invalid');
                nameCell?.querySelector('.detail-item-duplicate-msg')?.remove();
            }
        });
    }

    function hasDuplicateItems() {
        const ids = detailRows()
            .map((row) => row.dataset.itemId)
            .filter((v) => v && v !== '');

        return new Set(ids).size !== ids.length;
    }

    function resetForm() {
        createOpnameForm?.reset();
        detailBody.innerHTML = '';
        detailsError.textContent = '';
        window.Simpera.clearFormErrors(createOpnameForm);
        updateTotals();
    }

    function payloadFromForm() {
        const formData = new FormData(createOpnameForm);

        return {
            opname_date: formData.get('opname_date'),
            location_id: formData.get('location_id'),
            notes: formData.get('notes'),
            details: detailRows().map((row) => ({
                item_id: row.querySelector('.opname-item-id')?.value,
                system_quantity: row.dataset.systemQuantity || 0,
                actual_quantity: row.querySelector('.opname-actual-qty')?.value,
                notes: row.querySelector('.opname-line-notes')?.value || null,
            })),
        };
    }

    function showValidationErrors(errors) {
        window.Simpera.showFormErrors(createOpnameForm, errors);
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

    populateButton?.addEventListener('click', async () => {
        const locationId = locationSelect?.value;

        if (! locationId) {
            detailsError.textContent = 'Pilih lokasi terlebih dahulu.';
            locationSelect?.classList.add('is-invalid');

            return;
        }

        populateButton.disabled = true;
        populateButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Mengambil...';
        detailsError.textContent = '';
        locationSelect?.classList.remove('is-invalid');

        try {
            const response = await fetch(`${page.dataset.populateUrl}?location_id=${encodeURIComponent(locationId)}`, {
                headers: {
                    Accept: 'application/json',
                },
            });
            const data = await response.json();

            if (! response.ok) {
                throw new Error(data.message || 'Data stok sistem tidak dapat diambil.');
            }

            detailBody.innerHTML = data.data.map((row, index) => rowHtml(row, index)).join('');
            updateTotals();
            markDuplicates();
        } catch (error) {
            Swal.fire({
                title: 'Gagal mengambil stok',
                text: error.message,
                icon: 'error',
            });
        } finally {
            populateButton.disabled = false;
            populateButton.innerHTML = '<i class="las la-sync me-1"></i> Ambil Stok Sistem';
        }
    });

    locationSelect?.addEventListener('change', () => {
        detailBody.innerHTML = '';
        detailsError.textContent = '';
        updateTotals();
    });

    detailBody?.addEventListener('input', (event) => {
        if (event.target.matches('.opname-actual-qty')) {
            updateTotals();

            const row = event.target.closest('tr');
            const isIntegerQty = row?.dataset.integerQty === '1';

            if (isIntegerQty && Number.isInteger(Number(event.target.value))) {
                event.target.classList.remove('is-invalid');
            }
        }
    });

    detailBody?.addEventListener('click', (event) => {
        const removeButton = event.target.closest('.remove-opname-detail-row');

        if (! removeButton) {
            return;
        }

        removeButton.closest('tr')?.remove();
        updateTotals();
        markDuplicates();
    });

    createOpnameModal?.addEventListener('hidden.bs.modal', () => {
        resetForm();
    });

    createOpnameForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(createOpnameForm);
        detailsError.textContent = '';

        // Blokir submit jika ada duplikat
        if (hasDuplicateItems()) {
            markDuplicates();
            detailsError.textContent = 'Terdapat barang yang sama dalam daftar. Hapus duplikat sebelum menyimpan.';
            detailsError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        // Validasi integer qty
        let hasIntegerQtyError = false;
        detailRows().forEach((row) => {
            const isIntegerQty = row.dataset.integerQty === '1';
            const qtyInput = row.querySelector('.opname-actual-qty');

            if (isIntegerQty && qtyInput && ! Number.isInteger(Number(qtyInput.value))) {
                qtyInput.classList.add('is-invalid');
                hasIntegerQtyError = true;
            }
        });

        if (hasIntegerQtyError) {
            detailsError.textContent = 'Jumlah aktual untuk beberapa barang harus berupa bilangan bulat (tidak boleh pecahan).';
            detailsError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        if (saveOpnameButton) {
            saveOpnameButton.disabled = true;
            saveOpnameButton.textContent = 'Menyimpan...';
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
                throw new Error(data.message ?? 'Stok opname tidak dapat disimpan.');
            }

            const tbody = opnameTable?.querySelector('tbody');
            const emptyRow = document.getElementById('empty-opname-row');

            if (tbody && data.row_html) {
                emptyRow?.remove();
                tbody.insertAdjacentHTML('afterbegin', data.row_html);
            }

            bootstrap.Modal.getInstance(createOpnameModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message ?? 'Stok opname berhasil dibuat.',
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
            if (saveOpnameButton) {
                saveOpnameButton.disabled = false;
                saveOpnameButton.textContent = 'Simpan Draft';
            }
        }
    });

    opnameTable?.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('.delete-opname-button');

        if (! deleteButton) {
            return;
        }

        const confirmed = await window.Simpera.confirmDelete({
            title: 'Hapus stok opname?',
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
                throw new Error(data.message || 'Stok opname tidak dapat dihapus.');
            }

            deleteButton.closest('tr')?.remove();

            Swal.fire({
                title: 'Berhasil',
                text: data.message || 'Stok opname berhasil dihapus.',
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
})();
