(function () {
    const page = document.getElementById('unit-page');

    if (! page) {
        return;
    }

    const selectAllCheckbox = document.getElementById('select-all');
    const selectAllWrapper = document.querySelector('.select-all-wrapper');
    const unitsTable = document.getElementById('datatable_1');
    const bulkDeleteWrapper = document.getElementById('bulk-delete-wrapper');
    const bulkDeleteButton = document.getElementById('bulk-delete-button');
    const bulkDeleteLabel = document.getElementById('bulk-delete-label');
    const emptyUnitRow = document.getElementById('empty-unit-row');
    const emptyUnitMessage = document.getElementById('empty-unit-message');
    const filterActiveCheckbox = document.getElementById('filter-active');
    const filterInactiveCheckbox = document.getElementById('filter-inactive');
    const applyFilterButton = document.getElementById('apply-filter');
    const resetFilterButton = document.getElementById('reset-filter');
    const filterCountBadge = document.getElementById('filter-count-badge');
    const liveSearchInput = document.getElementById('unit-live-search');
    const createUnitModal = document.getElementById('createUnitModal');
    const createUnitForm = document.getElementById('create-unit-form');
    const saveUnitButton = document.getElementById('save-unit-button');
    const editUnitModal = document.getElementById('editUnitModal');
    const editUnitForm = document.getElementById('edit-unit-form');
    const updateUnitButton = document.getElementById('update-unit-button');
    const unitPanelOverlay = document.getElementById('unit-panel-overlay');
    const unitSidePanel = document.getElementById('unit-side-panel');
    const unitPanelClose = document.getElementById('unit-panel-close');
    const unitPanelCode = document.getElementById('unit-panel-code');
    const unitPanelTitle = document.getElementById('unit-panel-title');
    const unitPanelStatus = document.getElementById('unit-panel-status');
    const unitPanelItemsCount = document.getElementById('unit-panel-items-count');
    const unitPanelUpdatedAt = document.getElementById('unit-panel-updated-at');
    const unitPanelDescription = document.getElementById('unit-panel-description');
    const unitPanelCreatedAt = document.getElementById('unit-panel-created-at');
    const unitPanelItemsBadge = document.getElementById('unit-panel-items-badge');
    const unitPanelItems = document.getElementById('unit-panel-items');
    const unitPanelActivities = document.getElementById('unit-panel-activities');
    const unitPanelDeleteNote = document.getElementById('unit-panel-delete-note');
    const unitPanelEditButton = document.getElementById('unit-panel-edit-button');
    const unitPanelDetailLink = document.getElementById('unit-panel-detail-link');
    const unitPanelDeleteButton = document.getElementById('unit-panel-delete-button');
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const defaultEmptyUnitMessage = emptyUnitMessage?.textContent.trim() || 'Belum ada satuan.';
    const sidePanel = window.Simpera.createSidePanel(unitSidePanel, unitPanelOverlay);

    function unitCheckboxes() {
        return Array.from(document.querySelectorAll('#datatable_1 tbody input[name="check"]'));
    }

    function selectedUnitCheckboxes() {
        return visibleUnitCheckboxes().filter((checkbox) => checkbox.checked);
    }

    function unitRows() {
        return Array.from(document.querySelectorAll('#datatable_1 tbody tr:not(#empty-unit-row)'));
    }

    function visibleUnitRows() {
        return unitRows().filter((row) => ! row.classList.contains('d-none'));
    }

    function visibleUnitCheckboxes() {
        return visibleUnitRows()
            .map((row) => row.querySelector('input[name="check"]'))
            .filter(Boolean);
    }

    function syncEmptyUnitRow() {
        const rows = unitRows();
        const visibleRows = visibleUnitRows();

        if (! emptyUnitRow || ! emptyUnitMessage) {
            return;
        }

        if (rows.length === 0) {
            emptyUnitMessage.textContent = defaultEmptyUnitMessage;
            emptyUnitRow.classList.remove('d-none');

            return;
        }

        if (visibleRows.length === 0) {
            emptyUnitMessage.textContent = liveSearchInput?.value.trim()
                ? 'Tidak ada satuan yang cocok dengan pencarian.'
                : 'Tidak ada satuan yang sesuai dengan filter.';
            emptyUnitRow.classList.remove('d-none');

            return;
        }

        emptyUnitRow.classList.add('d-none');
    }

    function syncSelectAllCheckbox() {
        const checkboxes = visibleUnitCheckboxes();
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

    function setAllUnitCheckboxes(checked) {
        visibleUnitCheckboxes().forEach((checkbox) => {
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

    function applyUnitFilter() {
        const showActive = filterActiveCheckbox?.checked ?? true;
        const showInactive = filterInactiveCheckbox?.checked ?? true;
        const searchTerm = liveSearchInput?.value.trim().toLowerCase() ?? '';

        unitRows().forEach((row) => {
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
        syncEmptyUnitRow();
    }

    function resetUnitForm() {
        createUnitForm?.reset();
        window.Simpera.clearFormErrors(createUnitForm);

        const activeSwitch = document.getElementById('unit-is-active');

        if (activeSwitch) {
            activeSwitch.checked = true;
        }
    }

    function fillEditUnitForm(button) {
        editUnitForm.querySelector('[name="id"]').value = button.dataset.unitId ?? '';
        editUnitForm.querySelector('[name="update_url"]').value = button.dataset.updateUrl ?? '';
        editUnitForm.querySelector('[name="code"]').value = button.dataset.code ?? '';
        editUnitForm.querySelector('[name="name"]').value = button.dataset.name ?? '';
        editUnitForm.querySelector('[name="description"]').value = button.dataset.description ?? '';
        editUnitForm.querySelector('[name="is_active"]').checked = button.dataset.isActive === '1';
        window.Simpera.clearFormErrors(editUnitForm);
    }

    function removeUnitRows(rows) {
        rows.forEach((row) => {
            row.remove();
        });

        syncSelectAllCheckbox();
        syncEmptyUnitRow();
    }

    function actionLabel(action) {
        const labels = {
            created: 'Dibuat',
            updated: 'Diperbarui',
            deleted: 'Dihapus',
        };

        return labels[action] ?? action;
    }

    function setUnitPanelLoading() {
        unitPanelCode.textContent = 'Memuat...';
        unitPanelTitle.textContent = 'Detail Satuan';
        unitPanelStatus.textContent = '-';
        unitPanelStatus.className = 'badge bg-light text-dark';
        unitPanelItemsCount.textContent = '0';
        unitPanelUpdatedAt.textContent = '-';
        unitPanelDescription.textContent = '-';
        unitPanelCreatedAt.textContent = '-';
        unitPanelItemsBadge.textContent = '0';
        unitPanelItems.innerHTML = '<div class="text-muted py-2">Memuat barang terkait...</div>';
        unitPanelActivities.innerHTML = '<div class="text-muted py-2">Memuat aktivitas...</div>';
        unitPanelDeleteNote.classList.add('d-none');
        unitPanelEditButton.classList.add('d-none');
        unitPanelDeleteButton.classList.add('d-none');
    }

    function renderUnitPanel(data) {
        const unit = data.unit;
        const isActive = Boolean(unit.is_active);
        const escapeHtml = window.Simpera.escapeHtml;

        unitPanelCode.textContent = unit.code;
        unitPanelTitle.textContent = unit.name;
        unitPanelStatus.textContent = isActive ? 'Aktif' : 'Nonaktif';
        unitPanelStatus.className = `badge ${isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`;
        unitPanelItemsCount.textContent = unit.items_count;
        unitPanelUpdatedAt.textContent = unit.updated_at ?? '-';
        unitPanelDescription.textContent = unit.description ?? '-';
        unitPanelCreatedAt.textContent = unit.created_at ?? '-';
        unitPanelItemsBadge.textContent = unit.items_count;
        unitPanelDetailLink.href = data.urls.show;

        unitPanelItems.innerHTML = data.items.length > 0
            ? data.items.map((item) => `
                <div class="list-group-item px-0">
                    <div class="d-flex align-items-start justify-content-between gap-2">
                        <div>
                            <h6 class="mb-1">${escapeHtml(item.name)}</h6>
                            <span class="text-muted font-13">${escapeHtml(item.code)}${item.category ? ` - ${escapeHtml(item.category)}` : ''}</span>
                        </div>
                        <span class="badge ${item.is_active ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}">${item.is_active ? 'Aktif' : 'Nonaktif'}</span>
                    </div>
                </div>
            `).join('')
            : '<div class="text-muted py-2">Belum ada barang yang memakai satuan ini.</div>';

        unitPanelActivities.innerHTML = data.audit_logs.length > 0
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

        unitPanelEditButton.classList.toggle('d-none', ! data.permissions.update);
        unitPanelEditButton.dataset.unitId = unit.id;
        unitPanelEditButton.dataset.updateUrl = data.urls.update;
        unitPanelEditButton.dataset.code = unit.code;
        unitPanelEditButton.dataset.name = unit.name;
        unitPanelEditButton.dataset.description = unit.description ?? '';
        unitPanelEditButton.dataset.isActive = isActive ? '1' : '0';

        const canDelete = data.permissions.delete && Number(unit.items_count) === 0;

        unitPanelDeleteButton.classList.toggle('d-none', ! canDelete);
        unitPanelDeleteButton.dataset.destroyUrl = data.urls.destroy;
        unitPanelDeleteButton.dataset.unitId = unit.id;
        unitPanelDeleteButton.dataset.unitName = unit.name;
        unitPanelDeleteNote.classList.toggle('d-none', data.permissions.delete === false || Number(unit.items_count) === 0);
    }

    async function showUnitPanel(detailUrl) {
        sidePanel.open();
        setUnitPanelLoading();

        try {
            const response = await fetch(detailUrl, {
                headers: {
                    Accept: 'application/json',
                },
            });
            const data = await response.json();

            if (! response.ok) {
                throw new Error(data.message ?? 'Detail satuan tidak dapat dimuat.');
            }

            renderUnitPanel(data);
        } catch (error) {
            unitPanelItems.innerHTML = `<div class="text-danger py-2">${window.Simpera.escapeHtml(error.message)}</div>`;
            unitPanelActivities.innerHTML = '';
        }
    }

    async function deleteUnit(deleteButton) {
        const confirmed = await window.Simpera.confirmDelete({
            title: 'Hapus satuan?',
            text: `${deleteButton.dataset.unitName ?? 'Satuan ini'} akan dihapus dari basis data.`,
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
                throw new Error(data.message ?? 'Satuan tidak dapat dihapus.');
            }

            const unitRow = unitsTable?.querySelector(`tbody tr[data-unit-id="${deleteButton.dataset.unitId}"]`);

            if (unitRow) {
                removeUnitRows([unitRow]);
            }

            sidePanel.close();

            Swal.fire({
                title: 'Terhapus',
                text: data.message ?? 'Satuan berhasil dihapus.',
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
        setAllUnitCheckboxes(selectAllCheckbox.checked);
    });

    unitsTable?.addEventListener('change', (event) => {
        if (event.target.matches('tbody input[name="check"]')) {
            syncSelectAllCheckbox();
        }
    });

    applyFilterButton?.addEventListener('click', () => {
        applyUnitFilter();
    });

    resetFilterButton?.addEventListener('click', () => {
        if (filterActiveCheckbox) {
            filterActiveCheckbox.checked = true;
        }

        if (filterInactiveCheckbox) {
            filterInactiveCheckbox.checked = true;
        }

        applyUnitFilter();
    });

    window.Simpera.bindLiveTableSearch(liveSearchInput, () => {
        applyUnitFilter();
    });

    createUnitModal?.addEventListener('hidden.bs.modal', () => {
        resetUnitForm();
    });

    editUnitModal?.addEventListener('hidden.bs.modal', () => {
        window.Simpera.clearFormErrors(editUnitForm);
    });

    unitPanelClose?.addEventListener('click', () => {
        sidePanel.close();
    });

    unitPanelOverlay?.addEventListener('click', () => {
        sidePanel.close();
    });

    unitPanelEditButton?.addEventListener('click', () => {
        fillEditUnitForm(unitPanelEditButton);
        bootstrap.Modal.getOrCreateInstance(editUnitModal).show();
    });

    unitPanelDeleteButton?.addEventListener('click', () => {
        deleteUnit(unitPanelDeleteButton);
    });

    unitsTable?.addEventListener('click', (event) => {
        const detailButton = event.target.closest('.detail-unit-button');
        const editButton = event.target.closest('.edit-unit-button');
        const deleteButton = event.target.closest('.delete-unit-button');

        if (detailButton) {
            showUnitPanel(detailButton.dataset.detailUrl);

            return;
        }

        if (editButton && editUnitForm) {
            fillEditUnitForm(editButton);

            return;
        }

        if (! deleteButton) {
            return;
        }

        deleteUnit(deleteButton);
    });

    createUnitForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(createUnitForm);

        if (saveUnitButton) {
            saveUnitButton.disabled = true;
            saveUnitButton.textContent = 'Menyimpan...';
        }

        try {
            const formData = new FormData(createUnitForm);
            const { response, data } = await window.Simpera.submitJson(page.dataset.storeUrl, {
                csrfToken,
                payload: {
                    code: formData.get('code'),
                    name: formData.get('name'),
                    description: formData.get('description'),
                    is_active: formData.has('is_active'),
                },
            });

            if (response.status === 422) {
                window.Simpera.showFormErrors(createUnitForm, data.errors ?? {});

                return;
            }

            if (! response.ok) {
                throw new Error(data.message ?? 'Satuan tidak dapat disimpan.');
            }

            emptyUnitRow?.insertAdjacentHTML('beforebegin', data.row_html);
            applyUnitFilter();
            bootstrap.Modal.getInstance(createUnitModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message ?? 'Satuan berhasil ditambahkan.',
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
            if (saveUnitButton) {
                saveUnitButton.disabled = false;
                saveUnitButton.textContent = 'Simpan';
            }
        }
    });

    editUnitForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(editUnitForm);

        if (updateUnitButton) {
            updateUnitButton.disabled = true;
            updateUnitButton.textContent = 'Menyimpan...';
        }

        try {
            const formData = new FormData(editUnitForm);
            const updateUrl = formData.get('update_url');
            const unitId = formData.get('id');
            const { response, data } = await window.Simpera.submitJson(updateUrl, {
                method: 'PUT',
                csrfToken,
                payload: {
                    code: formData.get('code'),
                    name: formData.get('name'),
                    description: formData.get('description'),
                    is_active: formData.has('is_active'),
                },
            });

            if (response.status === 422) {
                window.Simpera.showFormErrors(editUnitForm, data.errors ?? {});

                return;
            }

            if (! response.ok) {
                throw new Error(data.message ?? 'Satuan tidak dapat diperbarui.');
            }

            const unitRow = unitsTable?.querySelector(`tbody tr[data-unit-id="${unitId}"]`);

            if (unitRow) {
                unitRow.outerHTML = data.row_html;
            }

            applyUnitFilter();
            bootstrap.Modal.getInstance(editUnitModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message ?? 'Satuan berhasil diperbarui.',
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
            if (updateUnitButton) {
                updateUnitButton.disabled = false;
                updateUnitButton.textContent = 'Simpan Perubahan';
            }
        }
    });

    bulkDeleteButton?.addEventListener('click', async () => {
        const selectedCheckboxes = selectedUnitCheckboxes();
        const selectedCount = selectedCheckboxes.length;
        const selectedIds = selectedCheckboxes.map((checkbox) => checkbox.value);

        if (selectedCount === 0) {
            return;
        }

        const confirmed = await window.Simpera.confirmDelete({
            title: 'Hapus satuan terpilih?',
            text: `${selectedCount} satuan terpilih akan dihapus dari basis data.`,
        });

        if (! confirmed) {
            return;
        }

        bulkDeleteButton.disabled = true;

        try {
            const { response, data } = await window.Simpera.submitJson(page.dataset.bulkDestroyUrl, {
                csrfToken,
                payload: {
                    ids: selectedIds,
                },
            });

            if (! response.ok) {
                throw new Error(data.message ?? 'Satuan terpilih tidak dapat dihapus.');
            }

            removeUnitRows(selectedCheckboxes.map((checkbox) => checkbox.closest('tr')).filter(Boolean));

            Swal.fire({
                title: 'Terhapus',
                text: data.message ?? `${selectedCount} satuan berhasil dihapus.`,
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

    syncFilterBadge();
    syncEmptyUnitRow();
})();
