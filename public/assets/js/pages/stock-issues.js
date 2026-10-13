(function () {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const page = document.getElementById('issue-page');

    function sweetAlert() {
        return window.Swal || window.Sweetalert2 || window.swal;
    }

    function formatQuantity(value) {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        }).format(value || 0);
    }

    async function confirmAction(options) {
        const alert = sweetAlert();

        if (! alert) {
            return window.confirm(options.text || options.title || 'Lanjutkan proses ini?');
        }

        const result = await alert.fire({
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
                throw new Error(data.message || 'Status pengeluaran tidak dapat diperbarui.');
            }

            const row = button.closest('tr');

            if (row && data.row_html) {
                row.outerHTML = data.row_html;
            } else {
                const alert = sweetAlert();

                if (alert) {
                    await alert.fire('Berhasil', data.message || 'Status berhasil diperbarui.', 'success');
                } else {
                    window.alert(data.message || 'Status berhasil diperbarui.');
                }

                // Redirect jika ada (mis. setelah delete dari halaman show)
                if (button.dataset.redirect) {
                    window.location.href = button.dataset.redirect;
                } else {
                    window.location.reload();
                }

                return;
            }

            const alert = sweetAlert();

            if (alert) {
                alert.fire({
                    title: 'Berhasil',
                    text: data.message || 'Status berhasil diperbarui.',
                    icon: 'success',
                    timer: 1700,
                    showConfirmButton: false,
                });
            }

            // Tampilkan notifikasi stok menipis jika ada (setelah posting).
            if (data.low_stock_warnings?.length) {
                window.Simpera?.showLowStockWarning(data.low_stock_warnings);
            }
        } catch (error) {
            const alert = sweetAlert();

            if (alert) {
                alert.fire({
                    title: options.errorTitle || 'Gagal',
                    text: error.message,
                    icon: 'error',
                });
            } else {
                window.alert(`${options.errorTitle || 'Gagal'}: ${error.message}`);
            }
        } finally {
            button.disabled = false;
        }
    }

    document.addEventListener('click', (event) => {
        const submitButton = event.target.closest('.issue-submit-button');
        const approveButton = event.target.closest('.issue-approve-button');
        const postButton = event.target.closest('.issue-post-button');
        const detailTransitionButton = event.target.closest('.action-transition-btn');

        if (submitButton) {
            event.preventDefault();

            postTransition(submitButton, {
                title: 'Ajukan pengeluaran?',
                text: `${submitButton.dataset.number} akan diajukan untuk disetujui.`,
            });

            return;
        }

        if (approveButton) {
            event.preventDefault();

            postTransition(approveButton, {
                title: 'Setujui pengeluaran?',
                text: `${approveButton.dataset.number} akan masuk ke tahap siap posting.`,
            });

            return;
        }

        if (postButton) {
            event.preventDefault();

            postTransition(postButton, {
                title: 'Posting pengeluaran?',
                text: postButton.dataset.confirm || `${postButton.dataset.number} akan mengurangi saldo stok. Sistem akan menolak jika stok tidak cukup.`,
                icon: 'warning',
                confirmButtonText: 'Ya, posting',
                confirmButtonColor: '#198754',
                errorTitle: 'Stok tidak cukup',
            });

            return;
        }

        const reverseButton = event.target.closest('.issue-reverse-button');

        if (reverseButton) {
            event.preventDefault();

            postTransition(reverseButton, {
                title: 'Reverse pengeluaran?',
                text: `Pengeluaran ${reverseButton.dataset.number} akan dibatalkan. Stok akan dikembalikan ke lokasi asal.`,
                icon: 'warning',
                confirmButtonText: 'Ya, reverse',
                confirmButtonColor: '#dc3545',
                errorTitle: 'Gagal reverse',
            });

            return;
        }

        if (detailTransitionButton) {
            event.preventDefault();

            const isPosting = detailTransitionButton.dataset.confirm?.includes('Posting');

            postTransition(detailTransitionButton, {
                title: 'Konfirmasi',
                text: detailTransitionButton.dataset.confirm || 'Lanjutkan proses ini?',
                icon: isPosting ? 'warning' : 'question',
                confirmButtonText: isPosting ? 'Ya, posting' : 'Ya, lanjutkan',
                confirmButtonColor: isPosting ? '#198754' : '#0d6efd',
                errorTitle: isPosting ? 'Stok tidak cukup' : 'Gagal',
            });
        }
    }, true);

    if (! page) {
        return;
    }

    const createIssueModal = document.getElementById('createIssueModal');
    const createIssueForm = document.getElementById('create-issue-form');
    const saveIssueButton = document.getElementById('save-issue-button');
    const detailBody = document.getElementById('issue-detail-body');
    const detailRowTemplate = document.getElementById('issue-detail-row-template');
    const addDetailRowButton = document.getElementById('add-issue-detail-row');
    const detailsError = document.getElementById('issue-details-error');
    const issueTable = document.getElementById('issue-table');
    const totalQuantity = document.getElementById('issue-total-quantity');
    const sourceLocation = document.getElementById('issue-location-id');
    const stockWarning = document.getElementById('issue-stock-warning');
    const stockWarningText = document.getElementById('issue-stock-warning-text');
    const availabilityScript = document.getElementById('stock-issue-availability-data');
    let stockAvailability = {};

    try {
        stockAvailability = JSON.parse(availabilityScript?.textContent || '{}');
    } catch (error) {
        stockAvailability = {};
    }

    function detailRows() {
        return Array.from(detailBody.querySelectorAll('.issue-detail-row'));
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

    function selectedItemIds(excludeRow = null) {
        return detailRows()
            .filter((row) => row !== excludeRow)
            .map((row) => row.querySelector('.issue-item-select')?.value)
            .filter((v) => v && v !== '');
    }

    function markDuplicates() {
        detailRows().forEach((row) => {
            const select = row.querySelector('.issue-item-select');

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
            .map((row) => row.querySelector('.issue-item-select')?.value)
            .filter((v) => v && v !== '');

        return new Set(ids).size !== ids.length;
    }

    function updateTotals() {
        const total = detailRows().reduce((sum, row) => {
            return sum + Number(row.querySelector('.issue-qty')?.value || 0);
        }, 0);

        if (totalQuantity) {
            totalQuantity.textContent = formatQuantity(total);
        }

        updateStockAvailabilitySummary();
    }

    function selectedLocationId() {
        return sourceLocation?.value || '';
    }

    function availableStock(itemId) {
        const locationId = selectedLocationId();

        return Number(stockAvailability?.[locationId]?.[itemId] || 0);
    }

    function itemText(row) {
        const select = row.querySelector('.issue-item-select');
        const selectedOption = select?.selectedOptions?.[0];

        return selectedOption?.textContent?.replace(/\s+/g, ' ').trim() || 'Barang';
    }

    function requestedByItem() {
        return detailRows().reduce((items, row) => {
            const itemId = row.querySelector('.issue-item-select')?.value;
            const quantity = Number(row.querySelector('.issue-qty')?.value || 0);

            if (! itemId) {
                return items;
            }

            items[itemId] ??= {
                label: itemText(row),
                quantity: 0,
            };
            items[itemId].quantity += quantity;

            return items;
        }, {});
    }

    function setStockBadge(badge, tone, label) {
        badge.className = `badge issue-stock-status bg-${tone}-subtle text-${tone}`;
        badge.textContent = label;
    }

    function updateStockAvailabilitySummary() {
        const locationId = selectedLocationId();
        const requestedItems = requestedByItem();
        const shortages = [];

        Object.entries(requestedItems).forEach(([itemId, request]) => {
            const available = availableStock(itemId);

            if (request.quantity > available) {
                shortages.push({
                    label: request.label,
                    shortage: request.quantity - available,
                });
            }
        });

        detailRows().forEach((row) => {
            const itemId = row.querySelector('.issue-item-select')?.value;
            const quantityInput = row.querySelector('.issue-qty');
            const availableQty = row.querySelector('.issue-available-qty');
            const statusBadge = row.querySelector('.issue-stock-status');

            quantityInput?.classList.remove('is-invalid');

            if (! availableQty || ! statusBadge) {
                return;
            }

            if (! locationId) {
                availableQty.textContent = '-';
                setStockBadge(statusBadge, 'secondary', 'Pilih lokasi');

                return;
            }

            if (! itemId) {
                availableQty.textContent = '-';
                setStockBadge(statusBadge, 'secondary', 'Pilih barang');

                return;
            }

            const available = availableStock(itemId);
            const requested = requestedItems[itemId]?.quantity || 0;
            const shortage = requested - available;

            availableQty.textContent = formatQuantity(available);

            if (shortage > 0) {
                quantityInput?.classList.add('is-invalid');
                setStockBadge(statusBadge, 'danger', `Kurang ${formatQuantity(shortage)}`);

                return;
            }

            setStockBadge(statusBadge, 'success', 'Cukup');
        });

        if (! stockWarning || ! stockWarningText) {
            return;
        }

        if (shortages.length === 0) {
            stockWarning.classList.add('d-none');
            stockWarningText.textContent = 'Ada barang yang melebihi stok tersedia.';

            return;
        }

        const shortageLabels = shortages
            .slice(0, 2)
            .map((item) => `${item.label} kurang ${formatQuantity(item.shortage)}`);
        const suffix = shortages.length > 2 ? ` dan ${shortages.length - 2} barang lain` : '';

        stockWarningText.textContent = `${shortageLabels.join(', ')}${suffix}. Draft tetap bisa disimpan, tetapi posting akan ditolak sampai stok mencukupi.`;
        stockWarning.classList.remove('d-none');
    }

    function addDetailRow() {
        const index = detailRows().length;
        const html = detailRowTemplate.innerHTML.replaceAll('__IDX__', String(index));

        detailBody.insertAdjacentHTML('beforeend', html);

        const newRow = detailBody.lastElementChild;
        window.Simpera.initSelectrOnRow(newRow, '.issue-item-select');

        updateTotals();
    }

    function resetForm() {
        createIssueForm?.reset();
        window.Simpera.destroySelectrsIn(detailBody, '.issue-item-select');
        detailBody.innerHTML = '';
        detailsError.textContent = '';
        window.Simpera.clearFormErrors(createIssueForm);
        addDetailRow();
        markDuplicates();
    }

    function payloadFromForm() {
        const formData = new FormData(createIssueForm);

        return {
            issue_date: formData.get('issue_date'),
            location_id: formData.get('location_id'),
            purpose: formData.get('purpose'),
            destination: formData.get('destination'),
            notes: formData.get('notes'),
            details: detailRows().map((row) => ({
                item_id: row.querySelector('.issue-item-select')?.value,
                quantity: row.querySelector('.issue-qty')?.value,
                notes: row.querySelector('.issue-line-notes')?.value || null,
            })),
        };
    }

    function showValidationErrors(errors) {
        window.Simpera.showFormErrors(createIssueForm, errors);
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
        if (event.target.matches('.issue-qty')) {
            updateTotals();

            const row = event.target.closest('tr');
            const select = row?.querySelector('.issue-item-select');
            const isIntegerQty = select?.selectedOptions[0]?.dataset.integerQty === '1';

            if (isIntegerQty && Number.isInteger(Number(event.target.value))) {
                event.target.classList.remove('is-invalid');
            }
        }
    });

    detailBody?.addEventListener('change', (event) => {
        if (event.target.matches('.issue-item-select')) {
            const selectedOption = event.target.selectedOptions[0];
            const qtyInput = event.target.closest('tr')?.querySelector('.issue-qty');
            const unitSuffix = event.target.closest('tr')?.querySelector('.issue-unit-suffix');

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
                }
            }

            updateTotals();
            markDuplicates();
        }
    });

    sourceLocation?.addEventListener('change', () => {
        updateTotals();
    });

    detailBody?.addEventListener('click', (event) => {
        const removeButton = event.target.closest('.remove-issue-detail-row');

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

    createIssueModal?.addEventListener('shown.bs.modal', () => {
        if (detailRows().length === 0) {
            addDetailRow();
        }
    });

    createIssueModal?.addEventListener('hidden.bs.modal', () => {
        resetForm();
    });

    createIssueForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(createIssueForm);
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
            const select = row.querySelector('.issue-item-select');
            const qtyInput = row.querySelector('.issue-qty');
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

        detailRows().forEach((row) => row.classList.remove('table-danger'));

        if (saveIssueButton) {
            saveIssueButton.disabled = true;
            saveIssueButton.textContent = 'Menyimpan...';
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
                throw new Error(data.message ?? 'Pengeluaran tidak dapat disimpan.');
            }

            const tbody = issueTable?.querySelector('tbody');
            const emptyRow = document.getElementById('empty-issue-row');

            if (tbody && data.row_html) {
                emptyRow?.remove();
                tbody.insertAdjacentHTML('afterbegin', data.row_html);
            }

            bootstrap.Modal.getInstance(createIssueModal)?.hide();

            const alert = sweetAlert();

            if (alert) {
                alert.fire({
                    title: 'Berhasil',
                    text: data.message ?? 'Pengeluaran berhasil dibuat.',
                    icon: 'success',
                    timer: 1800,
                    showConfirmButton: false,
                });
            } else {
                window.alert(data.message ?? 'Pengeluaran berhasil dibuat.');
            }
        } catch (error) {
            const alert = sweetAlert();

            if (alert) {
                alert.fire({
                    title: 'Gagal menyimpan',
                    text: error.message,
                    icon: 'error',
                });
            } else {
                window.alert(`Gagal menyimpan: ${error.message}`);
            }
        } finally {
            if (saveIssueButton) {
                saveIssueButton.disabled = false;
                saveIssueButton.textContent = 'Simpan Draft';
            }
        }
    });

    issueTable?.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('.delete-issue-button');

        if (! deleteButton) {
            return;
        }

        const confirmed = await window.Simpera.confirmDelete({
            title: 'Hapus pengeluaran?',
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
                throw new Error(data.message || 'Pengeluaran tidak dapat dihapus.');
            }

            deleteButton.closest('tr')?.remove();

            const alert = sweetAlert();

            if (alert) {
                alert.fire({
                    title: 'Berhasil',
                    text: data.message || 'Pengeluaran berhasil dihapus.',
                    icon: 'success',
                    timer: 1600,
                    showConfirmButton: false,
                });
            } else {
                window.alert(data.message || 'Pengeluaran berhasil dihapus.');
            }
        } catch (error) {
            const alert = sweetAlert();

            if (alert) {
                alert.fire({
                    title: 'Gagal menghapus',
                    text: error.message,
                    icon: 'error',
                });
            } else {
                window.alert(`Gagal menghapus: ${error.message}`);
            }
        } finally {
            deleteButton.disabled = false;
        }
    });

    addDetailRow();
})();
