(function () {
    const page = document.getElementById('supplier-page');

    if (! page) {
        return;
    }

    const selectAllCheckbox = document.getElementById('select-all');
    const selectAllWrapper = document.querySelector('.select-all-wrapper');
    const suppliersTable = document.getElementById('datatable_1');
    const bulkDeleteWrapper = document.getElementById('bulk-delete-wrapper');
    const bulkDeleteButton = document.getElementById('bulk-delete-button');
    const bulkDeleteLabel = document.getElementById('bulk-delete-label');
    const emptySupplierRow = document.getElementById('empty-supplier-row');
    const emptySupplierMessage = document.getElementById('empty-supplier-message');
    const filterActiveCheckbox = document.getElementById('filter-active');
    const filterInactiveCheckbox = document.getElementById('filter-inactive');
    const applyFilterButton = document.getElementById('apply-filter');
    const resetFilterButton = document.getElementById('reset-filter');
    const filterCountBadge = document.getElementById('filter-count-badge');
    const liveSearchInput = document.getElementById('supplier-live-search');
    const createSupplierModal = document.getElementById('createSupplierModal');
    const createSupplierForm = document.getElementById('create-supplier-form');
    const saveSupplierButton = document.getElementById('save-supplier-button');
    const editSupplierModal = document.getElementById('editSupplierModal');
    const editSupplierForm = document.getElementById('edit-supplier-form');
    const updateSupplierButton = document.getElementById('update-supplier-button');
    const supplierPanelOverlay = document.getElementById('supplier-panel-overlay');
    const supplierSidePanel = document.getElementById('supplier-side-panel');
    const supplierPanelClose = document.getElementById('supplier-panel-close');
    const supplierPanelCode = document.getElementById('supplier-panel-code');
    const supplierPanelTitle = document.getElementById('supplier-panel-title');
    const supplierPanelStatus = document.getElementById('supplier-panel-status');
    const supplierPanelItemsCount = document.getElementById('supplier-panel-items-count');
    const supplierPanelReceiptsCount = document.getElementById('supplier-panel-receipts-count');
    const supplierPanelContactPerson = document.getElementById('supplier-panel-contact-person');
    const supplierPanelPhone = document.getElementById('supplier-panel-phone');
    const supplierPanelEmail = document.getElementById('supplier-panel-email');
    const supplierPanelAddress = document.getElementById('supplier-panel-address');
    const supplierPanelItemsBadge = document.getElementById('supplier-panel-items-badge');
    const supplierPanelItems = document.getElementById('supplier-panel-items');
    const supplierPanelCreatedAt = document.getElementById('supplier-panel-created-at');
    const supplierPanelUpdatedAt = document.getElementById('supplier-panel-updated-at');
    const supplierPanelActivities = document.getElementById('supplier-panel-activities');
    const supplierPanelDeleteNote = document.getElementById('supplier-panel-delete-note');
    const supplierPanelEditButton = document.getElementById('supplier-panel-edit-button');
    const supplierPanelDetailLink = document.getElementById('supplier-panel-detail-link');
    const supplierPanelDeleteButton = document.getElementById('supplier-panel-delete-button');
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const defaultEmptySupplierMessage = emptySupplierMessage?.textContent.trim() || 'Belum ada pemasok.';
    const sidePanel = window.Simpera.createSidePanel(supplierSidePanel, supplierPanelOverlay);

    function supplierRows() {
        return Array.from(document.querySelectorAll('#datatable_1 tbody tr:not(#empty-supplier-row)'));
    }

    function visibleSupplierRows() {
        return supplierRows().filter((row) => ! row.classList.contains('d-none'));
    }

    function visibleSupplierCheckboxes() {
        return visibleSupplierRows()
            .map((row) => row.querySelector('input[name="check"]'))
            .filter(Boolean);
    }

    function selectedSupplierCheckboxes() {
        return visibleSupplierCheckboxes().filter((checkbox) => checkbox.checked);
    }

    function syncEmptySupplierRow() {
        const rows = supplierRows();
        const visibleRows = visibleSupplierRows();

        if (! emptySupplierRow || ! emptySupplierMessage) {
            return;
        }

        if (rows.length === 0) {
            emptySupplierMessage.textContent = defaultEmptySupplierMessage;
            emptySupplierRow.classList.remove('d-none');

            return;
        }

        if (visibleRows.length === 0) {
            emptySupplierMessage.textContent = liveSearchInput?.value.trim()
                ? 'Tidak ada pemasok yang cocok dengan pencarian.'
                : 'Tidak ada pemasok yang sesuai dengan filter.';
            emptySupplierRow.classList.remove('d-none');

            return;
        }

        emptySupplierRow.classList.add('d-none');
    }

    function syncSelectAllCheckbox() {
        const checkboxes = visibleSupplierCheckboxes();
        const checkedCount = checkboxes.filter((checkbox) => checkbox.checked).length;

        if (! selectAllCheckbox) {
            return;
        }

        selectAllCheckbox.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
        syncBulkDeleteButton(checkedCount);
    }

    function syncBulkDeleteButton(checkedCount) {
        bulkDeleteWrapper?.classList.toggle('d-none', checkedCount === 0);

        if (bulkDeleteLabel) {
            bulkDeleteLabel.textContent = checkedCount > 0 ? `Hapus ${checkedCount} Dipilih` : 'Hapus Dipilih';
        }
    }

    function setAllSupplierCheckboxes(checked) {
        visibleSupplierCheckboxes().forEach((checkbox) => {
            checkbox.checked = checked;
        });

        syncSelectAllCheckbox();
    }

    function syncFilterBadge() {
        const activeChecked = filterActiveCheckbox?.checked ?? true;
        const inactiveChecked = filterInactiveCheckbox?.checked ?? true;
        const filterCount = activeChecked && inactiveChecked ? 0 : [activeChecked, inactiveChecked].filter(Boolean).length || 2;

        if (! filterCountBadge) {
            return;
        }

        filterCountBadge.textContent = filterCount;
        filterCountBadge.classList.toggle('d-none', filterCount === 0);
    }

    function applySupplierFilter() {
        const showActive = filterActiveCheckbox?.checked ?? true;
        const showInactive = filterInactiveCheckbox?.checked ?? true;
        const searchTerm = liveSearchInput?.value.trim().toLowerCase() ?? '';

        supplierRows().forEach((row) => {
            const matchesStatus = (row.dataset.status === 'active' && showActive) || (row.dataset.status === 'inactive' && showInactive);
            const matchesSearch = searchTerm === '' || row.textContent.toLowerCase().includes(searchTerm);
            const isVisible = matchesStatus && matchesSearch;
            const checkbox = row.querySelector('input[name="check"]');

            row.classList.toggle('d-none', ! isVisible);

            if (! isVisible && checkbox) {
                checkbox.checked = false;
            }
        });

        syncFilterBadge();
        syncSelectAllCheckbox();
        syncEmptySupplierRow();
    }

    function resetSupplierForm() {
        createSupplierForm?.reset();
        window.Simpera.clearFormErrors(createSupplierForm);

        const activeSwitch = document.getElementById('supplier-is-active');

        if (activeSwitch) {
            activeSwitch.checked = true;
        }
    }

    function payloadFromForm(form) {
        const formData = new FormData(form);

        return {
            code: formData.get('code'),
            name: formData.get('name'),
            address: formData.get('address'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            contact_person: formData.get('contact_person'),
            is_active: formData.has('is_active'),
        };
    }

    function fillEditSupplierForm(button) {
        editSupplierForm.querySelector('[name="id"]').value = button.dataset.supplierId ?? '';
        editSupplierForm.querySelector('[name="update_url"]').value = button.dataset.updateUrl ?? '';
        editSupplierForm.querySelector('[name="code"]').value = button.dataset.code ?? '';
        editSupplierForm.querySelector('[name="name"]').value = button.dataset.name ?? '';
        editSupplierForm.querySelector('[name="address"]').value = button.dataset.address ?? '';
        editSupplierForm.querySelector('[name="phone"]').value = button.dataset.phone ?? '';
        editSupplierForm.querySelector('[name="email"]').value = button.dataset.email ?? '';
        editSupplierForm.querySelector('[name="contact_person"]').value = button.dataset.contactPerson ?? '';
        editSupplierForm.querySelector('[name="is_active"]').checked = button.dataset.isActive === '1';
        window.Simpera.clearFormErrors(editSupplierForm);
    }

    function removeSupplierRows(rows) {
        rows.forEach((row) => {
            row.remove();
        });

        syncSelectAllCheckbox();
        syncEmptySupplierRow();
    }

    function actionLabel(action) {
        const labels = {
            created: 'Dibuat',
            updated: 'Diperbarui',
            deleted: 'Dihapus',
        };

        return labels[action] ?? action;
    }

    function setSupplierPanelLoading() {
        supplierPanelCode.textContent = 'Memuat...';
        supplierPanelTitle.textContent = 'Detail Pemasok';
        supplierPanelStatus.textContent = '-';
        supplierPanelStatus.className = 'badge bg-light text-dark';
        supplierPanelItemsCount.textContent = '0';
        supplierPanelReceiptsCount.textContent = '0';
        supplierPanelContactPerson.textContent = '-';
        supplierPanelPhone.textContent = '-';
        supplierPanelEmail.textContent = '-';
        supplierPanelAddress.textContent = '-';
        supplierPanelItemsBadge.textContent = '0';
        supplierPanelItems.innerHTML = '<div class="text-muted py-2">Memuat barang terkait...</div>';
        supplierPanelCreatedAt.textContent = '-';
        supplierPanelUpdatedAt.textContent = '-';
        supplierPanelActivities.innerHTML = '<div class="text-muted py-2">Memuat aktivitas...</div>';
        supplierPanelDeleteNote.classList.add('d-none');
        supplierPanelEditButton.classList.add('d-none');
        supplierPanelDeleteButton.classList.add('d-none');
    }

    function renderSupplierPanel(data) {
        const supplier = data.supplier;
        const isActive = Boolean(supplier.is_active);
        const escapeHtml = window.Simpera.escapeHtml;

        supplierPanelCode.textContent = supplier.code;
        supplierPanelTitle.textContent = supplier.name;
        supplierPanelStatus.textContent = isActive ? 'Aktif' : 'Nonaktif';
        supplierPanelStatus.className = `badge ${isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`;
        supplierPanelItemsCount.textContent = supplier.items_count;
        supplierPanelReceiptsCount.textContent = supplier.stock_receipts_count;
        supplierPanelContactPerson.textContent = supplier.contact_person ?? '-';
        supplierPanelPhone.textContent = supplier.phone ?? '-';
        supplierPanelEmail.textContent = supplier.email ?? '-';
        supplierPanelAddress.textContent = supplier.address ?? '-';
        supplierPanelItemsBadge.textContent = supplier.items_count;
        supplierPanelCreatedAt.textContent = supplier.created_at ?? '-';
        supplierPanelUpdatedAt.textContent = supplier.updated_at ?? '-';
        supplierPanelDetailLink.href = data.urls.show;

        supplierPanelItems.innerHTML = data.items.length > 0
            ? data.items.map((item) => `
                <div class="list-group-item px-0">
                    <div class="d-flex align-items-start justify-content-between gap-2">
                        <div>
                            <h6 class="mb-1">${escapeHtml(item.name)}</h6>
                            <span class="text-muted font-13">${escapeHtml(item.code)}${item.category ? ` - ${escapeHtml(item.category)}` : ''}${item.unit ? ` - ${escapeHtml(item.unit)}` : ''}</span>
                        </div>
                        <div class="text-end">
                            <span class="badge ${item.is_primary ? 'bg-primary-subtle text-primary' : 'bg-light text-dark'}">${item.is_primary ? 'Utama' : 'Alternatif'}</span>
                            <div class="text-muted font-13">${escapeHtml(item.last_price)}</div>
                        </div>
                    </div>
                </div>
            `).join('')
            : '<div class="text-muted py-2">Belum ada barang terkait.</div>';

        supplierPanelActivities.innerHTML = data.audit_logs.length > 0
            ? data.audit_logs.map((auditLog) => `
                <div class="list-group-item px-0">
                    <div class="d-flex align-items-start justify-content-between gap-2">
                        <div>
                            <h6 class="mb-1">${escapeHtml(actionLabel(auditLog.action))}</h6>
                            <span class="text-muted font-13">${escapeHtml(auditLog.user ?? 'Sistem')}</span>
                        </div>
                        <span class="text-muted font-13">${escapeHtml(auditLog.created_at ?? '-')}</span>
                    </div>
                </div>
            `).join('')
            : '<div class="text-muted py-2">Belum ada aktivitas.</div>';

        supplierPanelEditButton.classList.toggle('d-none', ! data.permissions.update);
        supplierPanelEditButton.dataset.supplierId = supplier.id;
        supplierPanelEditButton.dataset.updateUrl = data.urls.update;
        supplierPanelEditButton.dataset.code = supplier.code;
        supplierPanelEditButton.dataset.name = supplier.name;
        supplierPanelEditButton.dataset.address = supplier.address ?? '';
        supplierPanelEditButton.dataset.phone = supplier.phone ?? '';
        supplierPanelEditButton.dataset.email = supplier.email ?? '';
        supplierPanelEditButton.dataset.contactPerson = supplier.contact_person ?? '';
        supplierPanelEditButton.dataset.isActive = isActive ? '1' : '0';

        supplierPanelDeleteButton.classList.toggle('d-none', ! data.permissions.delete);
        supplierPanelDeleteButton.dataset.destroyUrl = data.urls.destroy;
        supplierPanelDeleteButton.dataset.supplierId = supplier.id;
        supplierPanelDeleteButton.dataset.supplierName = supplier.name;
        supplierPanelDeleteNote.classList.toggle('d-none', data.permissions.delete);
    }

    async function showSupplierPanel(detailUrl) {
        sidePanel.open();
        setSupplierPanelLoading();

        try {
            const response = await fetch(detailUrl, {
                headers: {
                    Accept: 'application/json',
                },
            });
            const data = await response.json();

            if (! response.ok) {
                throw new Error(data.message ?? 'Detail pemasok tidak dapat dimuat.');
            }

            renderSupplierPanel(data);
        } catch (error) {
            supplierPanelItems.innerHTML = `<div class="text-danger py-2">${window.Simpera.escapeHtml(error.message)}</div>`;
            supplierPanelActivities.innerHTML = '';
        }
    }

    async function deleteSupplier(deleteButton) {
        const confirmed = await window.Simpera.confirmDelete({
            title: 'Hapus pemasok?',
            text: `${deleteButton.dataset.supplierName ?? 'Pemasok ini'} akan dihapus dari database.`,
        });

        if (! confirmed) {
            return;
        }

        deleteButton.disabled = true;

        try {
            const response = await fetch(deleteButton.dataset.destroyUrl, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });
            const data = await response.json();

            if (! response.ok) {
                throw new Error(data.message ?? 'Pemasok tidak dapat dihapus.');
            }

            const supplierRow = suppliersTable?.querySelector(`tbody tr[data-supplier-id="${deleteButton.dataset.supplierId}"]`);

            if (supplierRow) {
                removeSupplierRows([supplierRow]);
            }

            sidePanel.close();

            Swal.fire({
                title: 'Terhapus',
                text: data.message ?? 'Pemasok berhasil dihapus.',
                icon: 'success',
                timer: 1800,
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
    }

    selectAllWrapper?.addEventListener('click', (event) => {
        if (! selectAllCheckbox || event.target === selectAllCheckbox) {
            return;
        }

        selectAllCheckbox.checked = ! selectAllCheckbox.checked;
        selectAllCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    });

    selectAllCheckbox?.addEventListener('change', () => {
        setAllSupplierCheckboxes(selectAllCheckbox.checked);
    });

    suppliersTable?.addEventListener('change', (event) => {
        if (event.target.matches('tbody input[name="check"]')) {
            syncSelectAllCheckbox();
        }
    });

    applyFilterButton?.addEventListener('click', () => {
        applySupplierFilter();
    });

    resetFilterButton?.addEventListener('click', () => {
        if (filterActiveCheckbox) {
            filterActiveCheckbox.checked = true;
        }

        if (filterInactiveCheckbox) {
            filterInactiveCheckbox.checked = true;
        }

        applySupplierFilter();
    });

    window.Simpera.bindLiveTableSearch(liveSearchInput, () => {
        applySupplierFilter();
    });

    createSupplierModal?.addEventListener('hidden.bs.modal', () => {
        resetSupplierForm();
    });

    editSupplierModal?.addEventListener('hidden.bs.modal', () => {
        window.Simpera.clearFormErrors(editSupplierForm);
    });

    supplierPanelClose?.addEventListener('click', () => {
        sidePanel.close();
    });

    supplierPanelOverlay?.addEventListener('click', () => {
        sidePanel.close();
    });

    supplierPanelEditButton?.addEventListener('click', () => {
        fillEditSupplierForm(supplierPanelEditButton);
        bootstrap.Modal.getOrCreateInstance(editSupplierModal).show();
    });

    supplierPanelDeleteButton?.addEventListener('click', () => {
        deleteSupplier(supplierPanelDeleteButton);
    });

    suppliersTable?.addEventListener('click', (event) => {
        const detailButton = event.target.closest('.detail-supplier-button');
        const editButton = event.target.closest('.edit-supplier-button');
        const deleteButton = event.target.closest('.delete-supplier-button');

        if (detailButton) {
            event.preventDefault();
            showSupplierPanel(detailButton.dataset.detailUrl);

            return;
        }

        if (editButton && editSupplierForm) {
            fillEditSupplierForm(editButton);

            return;
        }

        if (! deleteButton) {
            return;
        }

        deleteSupplier(deleteButton);
    });

    createSupplierForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(createSupplierForm);

        if (saveSupplierButton) {
            saveSupplierButton.disabled = true;
            saveSupplierButton.textContent = 'Menyimpan...';
        }

        try {
            const { response, data } = await window.Simpera.submitJson(page.dataset.storeUrl, {
                csrfToken,
                payload: payloadFromForm(createSupplierForm),
            });

            if (response.status === 422) {
                window.Simpera.showFormErrors(createSupplierForm, data.errors ?? {});

                return;
            }

            if (! response.ok) {
                throw new Error(data.message ?? 'Pemasok tidak dapat disimpan.');
            }

            emptySupplierRow?.insertAdjacentHTML('beforebegin', data.row_html);
            applySupplierFilter();
            bootstrap.Modal.getInstance(createSupplierModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message ?? 'Pemasok berhasil ditambahkan.',
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
            if (saveSupplierButton) {
                saveSupplierButton.disabled = false;
                saveSupplierButton.textContent = 'Simpan';
            }
        }
    });

    editSupplierForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(editSupplierForm);

        if (updateSupplierButton) {
            updateSupplierButton.disabled = true;
            updateSupplierButton.textContent = 'Menyimpan...';
        }

        try {
            const formData = new FormData(editSupplierForm);
            const updateUrl = formData.get('update_url');
            const supplierId = formData.get('id');
            const { response, data } = await window.Simpera.submitJson(updateUrl, {
                method: 'PUT',
                csrfToken,
                payload: payloadFromForm(editSupplierForm),
            });

            if (response.status === 422) {
                window.Simpera.showFormErrors(editSupplierForm, data.errors ?? {});

                return;
            }

            if (! response.ok) {
                throw new Error(data.message ?? 'Pemasok tidak dapat diperbarui.');
            }

            const row = suppliersTable?.querySelector(`tbody tr[data-supplier-id="${supplierId}"]`);

            if (row) {
                row.insertAdjacentHTML('afterend', data.row_html);
                row.remove();
            }

            applySupplierFilter();
            bootstrap.Modal.getInstance(editSupplierModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message ?? 'Pemasok berhasil diperbarui.',
                icon: 'success',
                timer: 1800,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire({
                title: 'Gagal memperbarui',
                text: error.message,
                icon: 'error',
            });
        } finally {
            if (updateSupplierButton) {
                updateSupplierButton.disabled = false;
                updateSupplierButton.textContent = 'Simpan Perubahan';
            }
        }
    });

    bulkDeleteButton?.addEventListener('click', async () => {
        const selectedCheckboxes = selectedSupplierCheckboxes();
        const ids = selectedCheckboxes.map((checkbox) => checkbox.value);

        if (ids.length === 0) {
            return;
        }

        const confirmed = await window.Simpera.confirmDelete({
            title: `Hapus ${ids.length} pemasok?`,
            text: 'Semua pemasok yang dipilih akan dihapus dari database.',
        });

        if (! confirmed) {
            return;
        }

        bulkDeleteButton.disabled = true;

        try {
            const { response, data } = await window.Simpera.submitJson(page.dataset.bulkDestroyUrl, {
                csrfToken,
                payload: { ids },
            });

            if (! response.ok) {
                throw new Error(data.message ?? 'Pemasok terpilih tidak dapat dihapus.');
            }

            removeSupplierRows(selectedCheckboxes.map((checkbox) => checkbox.closest('tr')).filter(Boolean));

            Swal.fire({
                title: 'Terhapus',
                text: data.message ?? 'Pemasok terpilih berhasil dihapus.',
                icon: 'success',
                timer: 1800,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire({
                title: 'Gagal menghapus',
                text: error.message,
                icon: 'error',
            });
        } finally {
            bulkDeleteButton.disabled = false;
        }
    });

    applySupplierFilter();
})();
