(function () {
    const page = document.getElementById('location-page');

    if (! page) {
        return;
    }

    const selectAllCheckbox = document.getElementById('select-all');
    const selectAllWrapper = document.querySelector('.select-all-wrapper');
    const locationsTable = document.getElementById('datatable_1');
    const bulkDeleteWrapper = document.getElementById('bulk-delete-wrapper');
    const bulkDeleteButton = document.getElementById('bulk-delete-button');
    const bulkDeleteLabel = document.getElementById('bulk-delete-label');
    const emptyLocationRow = document.getElementById('empty-location-row');
    const emptyLocationMessage = document.getElementById('empty-location-message');
    const filterActiveCheckbox = document.getElementById('filter-active');
    const filterInactiveCheckbox = document.getElementById('filter-inactive');
    const applyFilterButton = document.getElementById('apply-filter');
    const resetFilterButton = document.getElementById('reset-filter');
    const filterCountBadge = document.getElementById('filter-count-badge');
    const liveSearchInput = document.getElementById('location-live-search');
    const createLocationModal = document.getElementById('createLocationModal');
    const createLocationForm = document.getElementById('create-location-form');
    const saveLocationButton = document.getElementById('save-location-button');
    const editLocationModal = document.getElementById('editLocationModal');
    const editLocationForm = document.getElementById('edit-location-form');
    const updateLocationButton = document.getElementById('update-location-button');
    const locationPanelOverlay = document.getElementById('location-panel-overlay');
    const locationSidePanel = document.getElementById('location-side-panel');
    const locationPanelClose = document.getElementById('location-panel-close');
    const locationPanelCode = document.getElementById('location-panel-code');
    const locationPanelTitle = document.getElementById('location-panel-title');
    const locationPanelStatus = document.getElementById('location-panel-status');
    const locationPanelStocksCount = document.getElementById('location-panel-stocks-count');
    const locationPanelReceiptsCount = document.getElementById('location-panel-receipts-count');
    const locationPanelIssuesCount = document.getElementById('location-panel-issues-count');
    const locationPanelOpnamesCount = document.getElementById('location-panel-opnames-count');
    const locationPanelUpdatedAt = document.getElementById('location-panel-updated-at');
    const locationPanelDescription = document.getElementById('location-panel-description');
    const locationPanelType = document.getElementById('location-panel-type');
    const locationPanelCreatedAt = document.getElementById('location-panel-created-at');
    const locationPanelStocksBadge = document.getElementById('location-panel-stocks-badge');
    const locationPanelStocks = document.getElementById('location-panel-stocks');
    const locationPanelActivities = document.getElementById('location-panel-activities');
    const locationPanelDeleteNote = document.getElementById('location-panel-delete-note');
    const locationPanelEditButton = document.getElementById('location-panel-edit-button');
    const locationPanelDetailLink = document.getElementById('location-panel-detail-link');
    const locationPanelDeleteButton = document.getElementById('location-panel-delete-button');
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const defaultEmptyLocationMessage = emptyLocationMessage?.textContent.trim() || 'Belum ada lokasi.';
    const sidePanel = window.Simpera.createSidePanel(locationSidePanel, locationPanelOverlay);

    function selectedLocationCheckboxes() {
        return visibleLocationCheckboxes().filter((checkbox) => checkbox.checked);
    }

    function locationRows() {
        return Array.from(document.querySelectorAll('#datatable_1 tbody tr:not(#empty-location-row)'));
    }

    function visibleLocationRows() {
        return locationRows().filter((row) => ! row.classList.contains('d-none'));
    }

    function visibleLocationCheckboxes() {
        return visibleLocationRows()
            .map((row) => row.querySelector('input[name="check"]'))
            .filter(Boolean);
    }

    function syncEmptyLocationRow() {
        const rows = locationRows();
        const visibleRows = visibleLocationRows();

        if (! emptyLocationRow || ! emptyLocationMessage) {
            return;
        }

        if (rows.length === 0) {
            emptyLocationMessage.textContent = defaultEmptyLocationMessage;
            emptyLocationRow.classList.remove('d-none');

            return;
        }

        if (visibleRows.length === 0) {
            emptyLocationMessage.textContent = liveSearchInput?.value.trim()
                ? 'Tidak ada lokasi yang cocok dengan pencarian.'
                : 'Tidak ada lokasi yang sesuai dengan filter.';
            emptyLocationRow.classList.remove('d-none');

            return;
        }

        emptyLocationRow.classList.add('d-none');
    }

    function syncSelectAllCheckbox() {
        const checkboxes = visibleLocationCheckboxes();
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

    function setAllLocationCheckboxes(checked) {
        visibleLocationCheckboxes().forEach((checkbox) => {
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

    function applyLocationFilter() {
        const showActive = filterActiveCheckbox?.checked ?? true;
        const showInactive = filterInactiveCheckbox?.checked ?? true;
        const searchTerm = liveSearchInput?.value.trim().toLowerCase() ?? '';

        locationRows().forEach((row) => {
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
        syncEmptyLocationRow();
    }

    function resetLocationForm() {
        createLocationForm?.reset();
        window.Simpera.clearFormErrors(createLocationForm);

        const activeSwitch = document.getElementById('location-is-active');

        if (activeSwitch) {
            activeSwitch.checked = true;
        }
    }

    function fillEditLocationForm(button) {
        editLocationForm.querySelector('[name="id"]').value = button.dataset.locationId ?? '';
        editLocationForm.querySelector('[name="update_url"]').value = button.dataset.updateUrl ?? '';
        editLocationForm.querySelector('[name="code"]').value = button.dataset.code ?? '';
        editLocationForm.querySelector('[name="type"]').value = button.dataset.type ?? '';
        editLocationForm.querySelector('[name="name"]').value = button.dataset.name ?? '';
        editLocationForm.querySelector('[name="description"]').value = button.dataset.description ?? '';
        editLocationForm.querySelector('[name="is_active"]').checked = button.dataset.isActive === '1';
        window.Simpera.clearFormErrors(editLocationForm);
    }

    function removeLocationRows(rows) {
        rows.forEach((row) => {
            row.remove();
        });

        syncSelectAllCheckbox();
        syncEmptyLocationRow();
    }

    function actionLabel(action) {
        const labels = {
            created: 'Dibuat',
            updated: 'Diperbarui',
            deleted: 'Dihapus',
        };

        return labels[action] ?? action;
    }

    function setLocationPanelLoading() {
        locationPanelCode.textContent = 'Memuat...';
        locationPanelTitle.textContent = 'Detail Lokasi';
        locationPanelStatus.textContent = '-';
        locationPanelStatus.className = 'badge bg-light text-dark';
        locationPanelStocksCount.textContent = '0';
        locationPanelReceiptsCount.textContent = '0';
        locationPanelIssuesCount.textContent = '0';
        locationPanelOpnamesCount.textContent = '0';
        locationPanelUpdatedAt.textContent = '-';
        locationPanelType.textContent = '-';
        locationPanelDescription.textContent = '-';
        locationPanelCreatedAt.textContent = '-';
        locationPanelStocksBadge.textContent = '0';
        locationPanelStocks.innerHTML = '<div class="text-muted py-2">Memuat stok barang...</div>';
        locationPanelActivities.innerHTML = '<div class="text-muted py-2">Memuat aktivitas...</div>';
        locationPanelDeleteNote.classList.add('d-none');
        locationPanelEditButton.classList.add('d-none');
        locationPanelDeleteButton.classList.add('d-none');
    }

    function renderLocationPanel(data) {
        const location = data.location;
        const isActive = Boolean(location.is_active);
        const escapeHtml = window.Simpera.escapeHtml;

        locationPanelCode.textContent = location.code;
        locationPanelTitle.textContent = location.name;
        locationPanelStatus.textContent = isActive ? 'Aktif' : 'Nonaktif';
        locationPanelStatus.className = `badge ${isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`;
        locationPanelStocksCount.textContent = location.stocks_count;
        locationPanelReceiptsCount.textContent = location.stock_receipts_count;
        locationPanelIssuesCount.textContent = location.stock_issues_count;
        locationPanelOpnamesCount.textContent = location.stock_opnames_count;
        locationPanelUpdatedAt.textContent = location.updated_at ?? '-';
        locationPanelType.textContent = location.type_label ?? '-';
        locationPanelDescription.textContent = location.description ?? '-';
        locationPanelCreatedAt.textContent = location.created_at ?? '-';
        locationPanelStocksBadge.textContent = location.stocks_count;
        locationPanelDetailLink.href = data.urls.show;

        locationPanelStocks.innerHTML = data.stocks.length > 0
            ? data.stocks.map((stock) => `
                <div class="list-group-item px-0">
                    <div class="d-flex align-items-start justify-content-between gap-2">
                        <div>
                            <h6 class="mb-1">${escapeHtml(stock.item_name ?? '-')}</h6>
                            <span class="text-muted font-13">${escapeHtml(stock.item_code ?? '-')}${stock.category ? ` - ${escapeHtml(stock.category)}` : ''}${stock.unit ? ` - ${escapeHtml(stock.unit)}` : ''}</span>
                        </div>
                        <span class="badge bg-primary-subtle text-primary">${escapeHtml(stock.quantity)}</span>
                    </div>
                </div>
            `).join('')
            : '<div class="text-muted py-2">Belum ada stok barang di lokasi ini.</div>';

        locationPanelActivities.innerHTML = data.audit_logs.length > 0
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

        locationPanelEditButton.classList.toggle('d-none', ! data.permissions.update);
        locationPanelEditButton.dataset.locationId = location.id;
        locationPanelEditButton.dataset.updateUrl = data.urls.update;
        locationPanelEditButton.dataset.code = location.code;
        locationPanelEditButton.dataset.type = location.type;
        locationPanelEditButton.dataset.name = location.name;
        locationPanelEditButton.dataset.description = location.description ?? '';
        locationPanelEditButton.dataset.isActive = isActive ? '1' : '0';

        locationPanelDeleteButton.classList.toggle('d-none', ! data.permissions.delete);
        locationPanelDeleteButton.dataset.destroyUrl = data.urls.destroy;
        locationPanelDeleteButton.dataset.locationId = location.id;
        locationPanelDeleteButton.dataset.locationName = location.name;
        locationPanelDeleteNote.classList.toggle('d-none', data.permissions.delete);
    }

    async function showLocationPanel(detailUrl) {
        sidePanel.open();
        setLocationPanelLoading();

        try {
            const response = await fetch(detailUrl, {
                headers: {
                    Accept: 'application/json',
                },
            });
            const data = await response.json();

            if (! response.ok) {
                throw new Error(data.message ?? 'Detail lokasi tidak dapat dimuat.');
            }

            renderLocationPanel(data);
        } catch (error) {
            locationPanelStocks.innerHTML = `<div class="text-danger py-2">${window.Simpera.escapeHtml(error.message)}</div>`;
            locationPanelActivities.innerHTML = '';
        }
    }

    async function deleteLocation(deleteButton) {
        const confirmed = await window.Simpera.confirmDelete({
            title: 'Hapus lokasi?',
            text: `${deleteButton.dataset.locationName ?? 'Lokasi ini'} akan dihapus dari database.`,
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
                throw new Error(data.message ?? 'Lokasi tidak dapat dihapus.');
            }

            const locationRow = locationsTable?.querySelector(`tbody tr[data-location-id="${deleteButton.dataset.locationId}"]`);

            if (locationRow) {
                removeLocationRows([locationRow]);
            }

            sidePanel.close();

            Swal.fire({
                title: 'Terhapus',
                text: data.message ?? 'Lokasi berhasil dihapus.',
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
        setAllLocationCheckboxes(selectAllCheckbox.checked);
    });

    locationsTable?.addEventListener('change', (event) => {
        if (event.target.matches('tbody input[name="check"]')) {
            syncSelectAllCheckbox();
        }
    });

    applyFilterButton?.addEventListener('click', () => {
        applyLocationFilter();
    });

    resetFilterButton?.addEventListener('click', () => {
        if (filterActiveCheckbox) {
            filterActiveCheckbox.checked = true;
        }

        if (filterInactiveCheckbox) {
            filterInactiveCheckbox.checked = true;
        }

        applyLocationFilter();
    });

    window.Simpera.bindLiveTableSearch(liveSearchInput, () => {
        applyLocationFilter();
    });

    createLocationModal?.addEventListener('hidden.bs.modal', () => {
        resetLocationForm();
    });

    editLocationModal?.addEventListener('hidden.bs.modal', () => {
        window.Simpera.clearFormErrors(editLocationForm);
    });

    locationPanelClose?.addEventListener('click', () => {
        sidePanel.close();
    });

    locationPanelOverlay?.addEventListener('click', () => {
        sidePanel.close();
    });

    locationPanelEditButton?.addEventListener('click', () => {
        fillEditLocationForm(locationPanelEditButton);
        bootstrap.Modal.getOrCreateInstance(editLocationModal).show();
    });

    locationPanelDeleteButton?.addEventListener('click', () => {
        deleteLocation(locationPanelDeleteButton);
    });

    locationsTable?.addEventListener('click', (event) => {
        const detailButton = event.target.closest('.detail-location-button');
        const editButton = event.target.closest('.edit-location-button');
        const deleteButton = event.target.closest('.delete-location-button');

        if (detailButton) {
            showLocationPanel(detailButton.dataset.detailUrl);

            return;
        }

        if (editButton && editLocationForm) {
            fillEditLocationForm(editButton);

            return;
        }

        if (! deleteButton) {
            return;
        }

        deleteLocation(deleteButton);
    });

    createLocationForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(createLocationForm);

        if (saveLocationButton) {
            saveLocationButton.disabled = true;
            saveLocationButton.textContent = 'Menyimpan...';
        }

        try {
            const formData = new FormData(createLocationForm);
            const { response, data } = await window.Simpera.submitJson(page.dataset.storeUrl, {
                csrfToken,
                payload: {
                    code: formData.get('code'),
                    type: formData.get('type'),
                    name: formData.get('name'),
                    description: formData.get('description'),
                    is_active: formData.has('is_active'),
                },
            });

            if (response.status === 422) {
                window.Simpera.showFormErrors(createLocationForm, data.errors ?? {});

                return;
            }

            if (! response.ok) {
                throw new Error(data.message ?? 'Lokasi tidak dapat disimpan.');
            }

            emptyLocationRow?.insertAdjacentHTML('beforebegin', data.row_html);
            applyLocationFilter();
            bootstrap.Modal.getInstance(createLocationModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message ?? 'Lokasi berhasil ditambahkan.',
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
            if (saveLocationButton) {
                saveLocationButton.disabled = false;
                saveLocationButton.textContent = 'Simpan';
            }
        }
    });

    editLocationForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(editLocationForm);

        if (updateLocationButton) {
            updateLocationButton.disabled = true;
            updateLocationButton.textContent = 'Menyimpan...';
        }

        try {
            const formData = new FormData(editLocationForm);
            const updateUrl = formData.get('update_url');
            const locationId = formData.get('id');
            const { response, data } = await window.Simpera.submitJson(updateUrl, {
                method: 'PUT',
                csrfToken,
                payload: {
                    code: formData.get('code'),
                    type: formData.get('type'),
                    name: formData.get('name'),
                    description: formData.get('description'),
                    is_active: formData.has('is_active'),
                },
            });

            if (response.status === 422) {
                window.Simpera.showFormErrors(editLocationForm, data.errors ?? {});

                return;
            }

            if (! response.ok) {
                throw new Error(data.message ?? 'Lokasi tidak dapat diperbarui.');
            }

            const locationRow = locationsTable?.querySelector(`tbody tr[data-location-id="${locationId}"]`);

            if (locationRow) {
                locationRow.outerHTML = data.row_html;
            }

            applyLocationFilter();
            bootstrap.Modal.getInstance(editLocationModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message ?? 'Lokasi berhasil diperbarui.',
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
            if (updateLocationButton) {
                updateLocationButton.disabled = false;
                updateLocationButton.textContent = 'Simpan Perubahan';
            }
        }
    });

    bulkDeleteButton?.addEventListener('click', async () => {
        const selectedCheckboxes = selectedLocationCheckboxes();
        const selectedCount = selectedCheckboxes.length;
        const selectedIds = selectedCheckboxes.map((checkbox) => checkbox.value);

        if (selectedCount === 0) {
            return;
        }

        const confirmed = await window.Simpera.confirmDelete({
            title: 'Hapus lokasi terpilih?',
            text: `${selectedCount} lokasi terpilih akan dihapus dari database.`,
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
                throw new Error(data.message ?? 'Lokasi terpilih tidak dapat dihapus.');
            }

            removeLocationRows(selectedCheckboxes.map((checkbox) => checkbox.closest('tr')).filter(Boolean));

            Swal.fire({
                title: 'Terhapus',
                text: data.message ?? `${selectedCount} lokasi berhasil dihapus.`,
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
    syncEmptyLocationRow();
})();
