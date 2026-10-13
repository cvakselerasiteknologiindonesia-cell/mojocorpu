(function () {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const page = document.getElementById('stock-request-page');

    function sweetAlert() {
        return window.Swal || window.Sweetalert2 || window.swal;
    }

    async function confirmAction(options) {
        const alert = sweetAlert();

        if (! alert) {
            return window.confirm(options.text || options.title || 'Lanjutkan proses ini?');
        }

        const result = await alert.fire({
            title: options.title || 'Konfirmasi',
            text: options.html ? undefined : (options.text || 'Lanjutkan proses ini?'),
            html: options.html,
            icon: options.icon || 'question',
            showCancelButton: true,
            confirmButtonText: options.confirmButtonText || 'Ya, lanjutkan',
            cancelButtonText: 'Batal',
            confirmButtonColor: options.confirmButtonColor || '#0d6efd',
            cancelButtonColor: '#6c757d',
        });

        return result.isConfirmed;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function createIssueConfirmationHtml(button) {
        const number = escapeHtml(button.dataset.number);
        const location = escapeHtml(button.dataset.location || '-');
        const totalItems = escapeHtml(button.dataset.totalItems || '-');
        const totalApproved = escapeHtml(button.dataset.totalApproved || '-');

        return `
            <div class="text-start">
                <p class="mb-3">Permintaan <strong>${number}</strong> akan disalin menjadi draft Pengeluaran Stok. Stok belum berkurang sampai draft diposting.</p>
                <div class="border rounded p-2 bg-light">
                    <div class="d-flex justify-content-between gap-3 py-1">
                        <span class="text-muted">Lokasi tujuan</span>
                        <strong class="text-end">${location}</strong>
                    </div>
                    <div class="d-flex justify-content-between gap-3 py-1">
                        <span class="text-muted">Jumlah item</span>
                        <strong>${totalItems}</strong>
                    </div>
                    <div class="d-flex justify-content-between gap-3 py-1">
                        <span class="text-muted">Qty disetujui</span>
                        <strong>${totalApproved}</strong>
                    </div>
                </div>
            </div>
        `;
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
                throw new Error(data.message || 'Status permintaan tidak dapat diperbarui.');
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

                window.location.reload();

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
        } catch (error) {
            const alert = sweetAlert();

            if (alert) {
                alert.fire({
                    title: 'Gagal',
                    text: error.message,
                    icon: 'error',
                });
            } else {
                window.alert(`Gagal: ${error.message}`);
            }
        } finally {
            button.disabled = false;
        }
    }

    async function createIssue(button) {
        const confirmed = await confirmAction({
            title: 'Buat pengeluaran?',
            html: createIssueConfirmationHtml(button),
            confirmButtonText: 'Buat Draft Pengeluaran',
        });

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
                throw new Error(data.message || 'Pengeluaran tidak dapat dibuat.');
            }

            const alert = sweetAlert();

            if (alert) {
                await alert.fire({
                    title: 'Berhasil',
                    text: data.message || 'Draft pengeluaran berhasil dibuat.',
                    icon: 'success',
                    timer: 1200,
                    showConfirmButton: false,
                });
            }

            window.location.href = data.redirect_url;
        } catch (error) {
            const alert = sweetAlert();

            if (alert) {
                alert.fire({
                    title: 'Gagal membuat pengeluaran',
                    text: error.message,
                    icon: 'error',
                });
            } else {
                window.alert(`Gagal membuat pengeluaran: ${error.message}`);
            }
        } finally {
            button.disabled = false;
        }
    }

    function showUnavailableCreateIssue(button) {
        const alert = sweetAlert();

        if (! alert) {
            window.alert(`Permintaan ${button.dataset.number} belum bisa dibuatkan Pengeluaran Stok.`);

            return;
        }

        alert.fire({
            title: 'Belum bisa dibuat',
            html: `
                <div class="text-start">
                    <p class="mb-2">Permintaan <strong>${escapeHtml(button.dataset.number)}</strong> belum bisa dibuatkan Pengeluaran Stok.</p>
                    <div class="border rounded p-2 bg-light">
                        <div class="d-flex justify-content-between gap-3 py-1">
                            <span class="text-muted">Status saat ini</span>
                            <strong>${escapeHtml(button.dataset.status)}</strong>
                        </div>
                        <div class="d-flex justify-content-between gap-3 py-1">
                            <span class="text-muted">Syarat</span>
                            <strong>Disetujui</strong>
                        </div>
                    </div>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Mengerti',
            confirmButtonColor: '#0d6efd',
        });
    }

    document.addEventListener('click', (event) => {
        const submitButton = event.target.closest('.stock-request-submit-button');
        const approveButton = event.target.closest('.stock-request-approve-button');
        const rejectButton = event.target.closest('.stock-request-reject-button');
        const createIssueButton = event.target.closest('.stock-request-create-issue-button');
        const unavailableCreateIssueButton = event.target.closest('.stock-request-create-issue-unavailable-button');
        const detailTransitionButton = event.target.closest('.action-transition-btn');

        if (submitButton) {
            postTransition(submitButton, {
                title: 'Ajukan permintaan?',
                text: `${submitButton.dataset.number} akan diajukan untuk disetujui.`,
            });

            return;
        }

        if (approveButton) {
            postTransition(approveButton, {
                title: 'Setujui permintaan?',
                text: `${approveButton.dataset.number} akan disetujui sesuai jumlah yang diminta.`,
                confirmButtonColor: '#198754',
            });

            return;
        }

        if (rejectButton) {
            postTransition(rejectButton, {
                title: 'Tolak permintaan?',
                text: `${rejectButton.dataset.number} akan ditandai ditolak.`,
                icon: 'warning',
                confirmButtonText: 'Ya, tolak',
                confirmButtonColor: '#dc3545',
            });

            return;
        }

        if (createIssueButton) {
            createIssue(createIssueButton);

            return;
        }

        if (unavailableCreateIssueButton) {
            showUnavailableCreateIssue(unavailableCreateIssueButton);

            return;
        }

        if (detailTransitionButton) {
            const isReject = detailTransitionButton.dataset.confirm?.includes('Tolak');

            postTransition(detailTransitionButton, {
                title: 'Konfirmasi',
                text: detailTransitionButton.dataset.confirm || 'Lanjutkan proses ini?',
                icon: isReject ? 'warning' : 'question',
                confirmButtonText: isReject ? 'Ya, tolak' : 'Ya, lanjutkan',
                confirmButtonColor: isReject ? '#dc3545' : '#0d6efd',
            });
        }
    });

    // -------------------------------------------------------------------------
    // Approve modal — halaman show stock-request
    // -------------------------------------------------------------------------
    (function initApproveModal() {
        const showPage = document.getElementById('stock-request-show-page');
        const approveModal = document.getElementById('approveStockRequestModal');
        const approveForm = document.getElementById('approve-stock-request-form');
        const confirmButton = document.getElementById('confirm-approve-button');
        const approveError = document.getElementById('approve-modal-error');
        const approveTotal = document.getElementById('approve-modal-total');

        if (! showPage || ! approveModal || ! approveForm) {
            return;
        }

        const approveUrl = showPage.dataset.approveUrl;

        function formatNumber(value) {
            return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(value || 0);
        }

        function recalcTotal() {
            let total = 0;

            approveForm.querySelectorAll('.approve-qty-input').forEach((input) => {
                total += Number(input.value) || 0;
            });

            if (approveTotal) {
                approveTotal.textContent = formatNumber(total);
            }
        }

        function clearApproveErrors() {
            approveForm.querySelectorAll('.approve-qty-input').forEach((input) => {
                input.classList.remove('is-invalid');
            });
            approveForm.querySelectorAll('[data-error-for]').forEach((el) => {
                el.textContent = '';
            });

            if (approveError) {
                approveError.textContent = '';
            }
        }

        function showApproveErrors(errors) {
            Object.entries(errors).forEach(([field, messages]) => {
                const match = field.match(/^approvals\.(\d+)\.quantity_approved$/);

                if (match) {
                    const input = approveForm.querySelectorAll('.approve-qty-input')[Number(match[1])];
                    input?.classList.add('is-invalid');
                    const feedback = approveForm.querySelector(`[data-error-for="${field}"]`);

                    if (feedback) {
                        feedback.textContent = messages[0] ?? '';
                    }
                }
            });

            if (approveError && Object.keys(errors).length) {
                approveError.textContent = errors['approvals']?.[0] ?? 'Periksa kembali isian persetujuan.';
            }
        }

        function payloadFromApproveForm() {
            const rows = approveForm.querySelectorAll('tbody tr');
            const approvals = [];

            rows.forEach((row, index) => {
                const detailId = row.querySelector(`[name="approvals[${index}][detail_id]"]`)?.value;
                const qty = row.querySelector(`[name="approvals[${index}][quantity_approved]"]`)?.value;
                approvals.push({ detail_id: detailId, quantity_approved: qty });
            });

            return { approvals };
        }

        approveForm.addEventListener('input', (event) => {
            if (event.target.matches('.approve-qty-input')) {
                recalcTotal();
                event.target.classList.remove('is-invalid');
            }
        });

        approveModal.addEventListener('click', (event) => {
            const resetBtn = event.target.closest('.approve-fill-requested-btn');

            if (! resetBtn) {
                return;
            }

            const index = resetBtn.dataset.index;
            const input = approveForm.querySelector(`[name="approvals[${index}][quantity_approved]"]`);

            if (input) {
                input.value = resetBtn.dataset.requested;
                input.classList.remove('is-invalid');
                recalcTotal();
            }
        });

        approveModal.addEventListener('shown.bs.modal', () => {
            clearApproveErrors();
            recalcTotal();
        });

        approveForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            clearApproveErrors();

            if (confirmButton) {
                confirmButton.disabled = true;
                confirmButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...';
            }

            try {
                const { response, data } = await window.Simpera.submitJson(approveUrl, {
                    csrfToken,
                    payload: payloadFromApproveForm(),
                });

                if (response.status === 422) {
                    showApproveErrors(data.errors ?? {});

                    return;
                }

                if (! response.ok) {
                    throw new Error(data.message ?? 'Persetujuan tidak dapat disimpan.');
                }

                bootstrap.Modal.getInstance(approveModal)?.hide();

                await Swal.fire({
                    title: 'Berhasil',
                    text: data.message ?? 'Permintaan berhasil disetujui.',
                    icon: 'success',
                    timer: 1800,
                    showConfirmButton: false,
                });

                window.location.reload();
            } catch (error) {
                Swal.fire({
                    title: 'Gagal menyimpan',
                    text: error.message,
                    icon: 'error',
                });
            } finally {
                if (confirmButton) {
                    confirmButton.disabled = false;
                    confirmButton.innerHTML = '<i class="las la-check-circle me-1"></i> Konfirmasi Persetujuan';
                }
            }
        });

        recalcTotal();
    }());

    // -------------------------------------------------------------------------
    // Reject modal — halaman show stock-request
    // -------------------------------------------------------------------------
    (function initRejectModal() {
        const showPage = document.getElementById('stock-request-show-page');
        const rejectModal = document.getElementById('rejectStockRequestModal');
        const rejectForm = document.getElementById('reject-stock-request-form');
        const confirmButton = document.getElementById('confirm-reject-button');
        const reasonError = document.getElementById('reject-reason-error');

        if (! showPage || ! rejectModal || ! rejectForm) {
            return;
        }

        const rejectUrl = showPage.dataset.rejectUrl;

        rejectModal.addEventListener('hidden.bs.modal', () => {
            rejectForm.reset();

            if (reasonError) {
                reasonError.textContent = '';
            }

            const textarea = rejectForm.querySelector('#reject-reason');
            textarea?.classList.remove('is-invalid');
        });

        rejectForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (confirmButton) {
                confirmButton.disabled = true;
                confirmButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...';
            }

            const reason = rejectForm.querySelector('#reject-reason')?.value ?? '';

            try {
                const { response, data } = await window.Simpera.submitJson(rejectUrl, {
                    csrfToken,
                    payload: { rejection_reason: reason },
                });

                if (! response.ok) {
                    throw new Error(data.message ?? 'Penolakan tidak dapat disimpan.');
                }

                bootstrap.Modal.getInstance(rejectModal)?.hide();

                await Swal.fire({
                    title: 'Ditolak',
                    text: data.message ?? 'Permintaan berhasil ditolak.',
                    icon: 'warning',
                    timer: 1800,
                    showConfirmButton: false,
                });

                window.location.reload();
            } catch (error) {
                Swal.fire({
                    title: 'Gagal',
                    text: error.message,
                    icon: 'error',
                });
            } finally {
                if (confirmButton) {
                    confirmButton.disabled = false;
                    confirmButton.innerHTML = '<i class="las la-times-circle me-1"></i> Konfirmasi Penolakan';
                }
            }
        });
    }());

    if (! page) {
        return;
    }

    const createModal = document.getElementById('createStockRequestModal');
    const createForm = document.getElementById('create-stock-request-form');
    const saveButton = document.getElementById('save-stock-request-button');
    const detailBody = document.getElementById('stock-request-detail-body');
    const rowTemplate = document.getElementById('stock-request-detail-row-template');
    const addRowButton = document.getElementById('add-stock-request-detail-row');
    const detailsError = document.getElementById('stock-request-details-error');
    const table = document.getElementById('stock-request-table');
    const sourceLocation = document.getElementById('stock-request-location-id');
    const stockWarning = document.getElementById('stock-request-stock-warning');
    const stockWarningText = document.getElementById('stock-request-stock-warning-text');
    const availabilityScript = document.getElementById('stock-request-availability-data');
    let stockAvailability = {};

    try {
        stockAvailability = JSON.parse(availabilityScript?.textContent || '{}');
    } catch (error) {
        stockAvailability = {};
    }

    function detailRows() {
        return Array.from(detailBody.querySelectorAll('.stock-request-detail-row'));
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
            .map((row) => row.querySelector('.stock-request-item-select')?.value)
            .filter((v) => v && v !== '');
    }

    function markDuplicates() {
        detailRows().forEach((row) => {
            const select = row.querySelector('.stock-request-item-select');

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
            .map((row) => row.querySelector('.stock-request-item-select')?.value)
            .filter((v) => v && v !== '');

        return new Set(ids).size !== ids.length;
    }

    function addDetailRow() {
        const index = detailRows().length;
        const html = rowTemplate.innerHTML.replaceAll('__IDX__', String(index));

        detailBody.insertAdjacentHTML('beforeend', html);

        const newRow = detailBody.lastElementChild;
        window.Simpera.initSelectrOnRow(newRow, '.stock-request-item-select');

        updateStockAvailabilitySummary();
    }

    function formatQuantity(value) {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        }).format(value || 0);
    }

    function selectedLocationId() {
        return sourceLocation?.value || '';
    }

    function availableStock(itemId) {
        const locationId = selectedLocationId();

        return Number(stockAvailability?.[locationId]?.[itemId] || 0);
    }

    function itemText(row) {
        const select = row.querySelector('.stock-request-item-select');
        const selectedOption = select?.selectedOptions?.[0];

        return selectedOption?.textContent?.replace(/\s+/g, ' ').trim() || 'Barang';
    }

    function requestedByItem() {
        return detailRows().reduce((items, row) => {
            const itemId = row.querySelector('.stock-request-item-select')?.value;
            const quantity = Number(row.querySelector('.stock-request-qty')?.value || 0);

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
        badge.className = `badge stock-request-stock-status bg-${tone}-subtle text-${tone}`;
        badge.textContent = label;
    }

    function updateStockAvailabilitySummary() {
        const locationId = selectedLocationId();
        const requestedItems = requestedByItem();
        const shortages = [];

        if (locationId) {
            Object.entries(requestedItems).forEach(([itemId, request]) => {
                const available = availableStock(itemId);

                if (request.quantity > available) {
                    shortages.push({
                        label: request.label,
                        shortage: request.quantity - available,
                        available,
                    });
                }
            });
        }

        detailRows().forEach((row) => {
            const itemId = row.querySelector('.stock-request-item-select')?.value;
            const quantityInput = row.querySelector('.stock-request-qty');
            const availableQty = row.querySelector('.stock-request-available-qty');
            const statusBadge = row.querySelector('.stock-request-stock-status');

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

            if (available <= 0) {
                quantityInput?.classList.add('is-invalid');
                setStockBadge(statusBadge, 'danger', 'Kosong');

                return;
            }

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

        stockWarningText.textContent = `${shortageLabels.join(', ')}${suffix}. Jumlah permintaan tidak boleh melebihi stok tersedia di lokasi sumber.`;
        stockWarning.classList.remove('d-none');
    }

    function applyPrefillFromCurrentStock() {
        const itemId = page.dataset.prefillItemId;
        const locationId = page.dataset.prefillLocationId;

        if (locationId) {
            const locationSelect = document.getElementById('stock-request-location-id');

            if (locationSelect) {
                locationSelect.value = locationId;
            }
        }

        if (itemId) {
            if (detailRows().length === 0) {
                addDetailRow();
            }

            const firstItemSelect = detailRows()[0]?.querySelector('.stock-request-item-select');

            if (firstItemSelect) {
                firstItemSelect.value = itemId;
            }
        }

        updateStockAvailabilitySummary();
    }

    function resetForm() {
        createForm?.reset();
        detailBody.innerHTML = '';
        detailsError.textContent = '';
        window.Simpera.clearFormErrors(createForm);
        addDetailRow();
        markDuplicates();
    }

    function payloadFromForm() {
        const formData = new FormData(createForm);
        const locationId = formData.get('location_id');

        return {
            request_date: formData.get('request_date'),
            location_id: locationId === '' ? null : locationId,
            notes: formData.get('notes'),
            details: detailRows().map((row) => ({
                item_id: row.querySelector('.stock-request-item-select')?.value,
                quantity_requested: row.querySelector('.stock-request-qty')?.value,
                notes: row.querySelector('.stock-request-line-notes')?.value || null,
            })),
        };
    }

    function showValidationErrors(errors) {
        window.Simpera.showFormErrors(createForm, errors);
        detailsError.textContent = errors.details?.[0] ?? '';

        let errorCount = 0;

        Object.entries(errors).forEach(([field, messages]) => {
            const detailMatch = field.match(/^details\.(\d+)\.(.+)$/);

            if (! detailMatch) {
                // Count non-detail field errors too
                errorCount += 1;

                return;
            }

            const row = detailRows()[Number(detailMatch[1])];
            const input = row?.querySelector(`[name="details[${detailMatch[1]}][${detailMatch[2]}]"]`);

            if (input) {
                input.classList.add('is-invalid');
                errorCount += 1;
            }

            // Highlight baris yang bermasalah
            row?.classList.add('table-danger');

            if (! detailsError.textContent) {
                detailsError.textContent = messages[0] || 'Baris barang tidak valid.';
            }
        });

        // Pesan ringkasan
        if (errorCount > 0 && ! detailsError.textContent) {
            detailsError.textContent = `${errorCount} field belum diisi dengan benar.`;
        } else if (errorCount > 1) {
            detailsError.textContent = `${errorCount} field belum diisi dengan benar. ${detailsError.textContent}`;
        }

        // Scroll ke error pertama
        requestAnimationFrame(() => {
            const firstError = createForm?.querySelector('.is-invalid, .invalid-feedback:not(:empty)');
            firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    addRowButton?.addEventListener('click', () => {
        addDetailRow();
    });

    detailBody?.addEventListener('input', (event) => {
        if (event.target.matches('.stock-request-qty')) {
            updateStockAvailabilitySummary();

            const row = event.target.closest('tr');
            const select = row?.querySelector('.stock-request-item-select');
            const isIntegerQty = select?.selectedOptions[0]?.dataset.integerQty === '1';

            if (isIntegerQty && Number.isInteger(Number(event.target.value))) {
                event.target.classList.remove('is-invalid');
            }
        }
    });

    detailBody?.addEventListener('change', (event) => {
        if (event.target.matches('.stock-request-item-select')) {
            const selectedOption = event.target.selectedOptions[0];
            const qtyInput = event.target.closest('tr')?.querySelector('.stock-request-qty');
            const unitSuffix = event.target.closest('tr')?.querySelector('.stock-request-unit-suffix');

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

            updateStockAvailabilitySummary();
            markDuplicates();
        }
    });

    sourceLocation?.addEventListener('change', () => {
        updateStockAvailabilitySummary();
    });

    detailBody?.addEventListener('click', (event) => {
        const removeButton = event.target.closest('.remove-stock-request-detail-row');

        if (! removeButton) {
            return;
        }

        removeButton.closest('tr')?.remove();

        if (detailRows().length === 0) {
            addDetailRow();
        }

        reindexRows();
        updateStockAvailabilitySummary();
        markDuplicates();
    });

    createModal?.addEventListener('shown.bs.modal', () => {
        if (detailRows().length === 0) {
            addDetailRow();
        }
    });

    createModal?.addEventListener('hidden.bs.modal', () => {
        resetForm();
    });

    createForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(createForm);
        detailsError.textContent = '';

        // Blokir submit jika ada duplikat barang
        if (hasDuplicateItems()) {
            markDuplicates();
            detailsError.textContent = 'Terdapat barang yang sama dalam daftar. Hapus duplikat sebelum menyimpan.';
            detailsError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        // Hapus highlight error baris sebelumnya
        detailRows().forEach((row) => row.classList.remove('table-danger'));

        // Validasi integer qty
        let hasIntegerQtyError = false;
        detailRows().forEach((row) => {
            const select = row.querySelector('.stock-request-item-select');
            const qtyInput = row.querySelector('.stock-request-qty');
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

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Menyimpan...';
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
                throw new Error(data.message || 'Permintaan stok tidak dapat disimpan.');
            }

            const tbody = table?.querySelector('tbody');
            const emptyRow = document.getElementById('empty-stock-request-row');

            if (tbody && data.row_html) {
                emptyRow?.remove();
                tbody.insertAdjacentHTML('afterbegin', data.row_html);
            }

            bootstrap.Modal.getInstance(createModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message || 'Permintaan stok berhasil dibuat.',
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
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = 'Simpan Draft';
            }
        }
    });

    table?.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('.delete-stock-request-button');

        if (! deleteButton) {
            return;
        }

        const confirmed = await window.Simpera.confirmDelete({
            title: 'Hapus permintaan?',
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
                throw new Error(data.message || 'Permintaan stok tidak dapat dihapus.');
            }

            deleteButton.closest('tr')?.remove();

            Swal.fire({
                title: 'Berhasil',
                text: data.message || 'Permintaan stok berhasil dihapus.',
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
    applyPrefillFromCurrentStock();

    if (page.dataset.autoOpenCreate === '1' && createModal && window.bootstrap?.Modal) {
        window.bootstrap.Modal.getOrCreateInstance(createModal).show();
    }
})();
