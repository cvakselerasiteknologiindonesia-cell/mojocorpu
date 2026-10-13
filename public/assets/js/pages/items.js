(function () {
    const page = document.getElementById('item-page');

    if (! page) {
        return;
    }

    const selectAllCheckbox = document.getElementById('select-all');
    const selectAllWrapper = document.querySelector('.select-all-wrapper');
    const itemsTable = document.getElementById('datatable_1');
    const bulkDeleteWrapper = document.getElementById('bulk-delete-wrapper');
    const bulkDeleteButton = document.getElementById('bulk-delete-button');
    const bulkDeleteLabel = document.getElementById('bulk-delete-label');
    const emptyItemRow = document.getElementById('empty-item-row');
    const emptyItemMessage = document.getElementById('empty-item-message');
    const filterActiveCheckbox = document.getElementById('filter-active');
    const filterInactiveCheckbox = document.getElementById('filter-inactive');
    const filterCategorySelect = document.getElementById('filter-category');
    const filterUnitSelect = document.getElementById('filter-unit');
    const filterStockStatusSelect = document.getElementById('filter-stock-status');
    const applyFilterButton = document.getElementById('apply-filter');
    const resetFilterButton = document.getElementById('reset-filter');
    const filterCountBadge = document.getElementById('filter-count-badge');
    const liveSearchInput = document.getElementById('item-live-search');
    const createItemModal = document.getElementById('createItemModal');
    const createItemForm = document.getElementById('create-item-form');
    const saveItemButton = document.getElementById('save-item-button');
    const editItemModal = document.getElementById('editItemModal');
    const editItemForm = document.getElementById('edit-item-form');
    const updateItemButton = document.getElementById('update-item-button');
    const itemPanelOverlay = document.getElementById('item-panel-overlay');
    const itemSidePanel = document.getElementById('item-side-panel');
    const itemPanelClose = document.getElementById('item-panel-close');
    const itemPanelCode = document.getElementById('item-panel-code');
    const itemPanelTitle = document.getElementById('item-panel-title');
    const itemPanelStatus = document.getElementById('item-panel-status');
    const itemPanelTotalStock = document.getElementById('item-panel-total-stock');
    const itemPanelStockStatus = document.getElementById('item-panel-stock-status');
    const itemPanelCategory = document.getElementById('item-panel-category');
    const itemPanelUnit = document.getElementById('item-panel-unit');
    const itemPanelMinimumStock = document.getElementById('item-panel-minimum-stock');
    const itemPanelMaximumStock = document.getElementById('item-panel-maximum-stock');
    const itemPanelSafetyStock = document.getElementById('item-panel-safety-stock');
    const itemPanelLeadTimeDays = document.getElementById('item-panel-lead-time-days');
    const itemPanelLastPrice = document.getElementById('item-panel-last-price');
    const itemPanelIntegerQty = document.getElementById('item-panel-integer-qty');
    const itemPanelDescription = document.getElementById('item-panel-description');
    const itemPanelStocksBadge = document.getElementById('item-panel-stocks-badge');
    const itemPanelStocks = document.getElementById('item-panel-stocks');
    const itemPanelSuppliersBadge = document.getElementById('item-panel-suppliers-badge');
    const itemPanelSuppliers = document.getElementById('item-panel-suppliers');
    const itemPanelCreatedAt = document.getElementById('item-panel-created-at');
    const itemPanelUpdatedAt = document.getElementById('item-panel-updated-at');
    const itemPanelActivities = document.getElementById('item-panel-activities');
    const itemPanelDeleteNote = document.getElementById('item-panel-delete-note');
    const itemPanelEditButton = document.getElementById('item-panel-edit-button');
    const itemPanelDetailLink = document.getElementById('item-panel-detail-link');
    const itemPanelDeleteButton = document.getElementById('item-panel-delete-button');
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const defaultEmptyItemMessage = emptyItemMessage?.textContent.trim() || 'Belum ada barang.';
    const sidePanel = window.Simpera.createSidePanel(itemSidePanel, itemPanelOverlay);

    function itemRows() {
        return Array.from(document.querySelectorAll('#datatable_1 tbody tr:not(#empty-item-row)'));
    }

    function visibleItemRows() {
        return itemRows().filter((row) => ! row.classList.contains('d-none'));
    }

    function visibleItemCheckboxes() {
        return visibleItemRows()
            .map((row) => row.querySelector('input[name="check"]'))
            .filter(Boolean);
    }

    function selectedItemCheckboxes() {
        return visibleItemCheckboxes().filter((checkbox) => checkbox.checked);
    }

    function syncEmptyItemRow() {
        const rows = itemRows();
        const visibleRows = visibleItemRows();

        if (! emptyItemRow || ! emptyItemMessage) {
            return;
        }

        if (rows.length === 0) {
            emptyItemMessage.textContent = defaultEmptyItemMessage;
            emptyItemRow.classList.remove('d-none');

            return;
        }

        if (visibleRows.length === 0) {
            emptyItemMessage.textContent = liveSearchInput?.value.trim()
                ? 'Tidak ada barang yang cocok dengan pencarian.'
                : 'Tidak ada barang yang sesuai dengan filter.';
            emptyItemRow.classList.remove('d-none');

            return;
        }

        emptyItemRow.classList.add('d-none');
    }

    function syncSelectAllCheckbox() {
        const checkboxes = visibleItemCheckboxes();
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

    function setAllItemCheckboxes(checked) {
        visibleItemCheckboxes().forEach((checkbox) => {
            checkbox.checked = checked;
        });

        syncSelectAllCheckbox();
    }

    function syncFilterBadge() {
        let filterCount = 0;

        if (filterActiveCheckbox && ! filterActiveCheckbox.checked) {
            filterCount += 1;
        }

        if (filterInactiveCheckbox && ! filterInactiveCheckbox.checked) {
            filterCount += 1;
        }

        if (filterCategorySelect?.value) {
            filterCount += 1;
        }

        if (filterUnitSelect?.value) {
            filterCount += 1;
        }

        if (filterStockStatusSelect?.value) {
            filterCount += 1;
        }

        if (! filterCountBadge) {
            return;
        }

        filterCountBadge.textContent = filterCount;
        filterCountBadge.classList.toggle('d-none', filterCount === 0);
    }

    function applyItemFilter() {
        const showActive = filterActiveCheckbox?.checked ?? true;
        const showInactive = filterInactiveCheckbox?.checked ?? true;
        const categoryId = filterCategorySelect?.value ?? '';
        const unitId = filterUnitSelect?.value ?? '';
        const stockStatus = filterStockStatusSelect?.value ?? '';
        const searchTerm = liveSearchInput?.value.trim().toLowerCase() ?? '';

        itemRows().forEach((row) => {
            const matchesStatus = (row.dataset.status === 'active' && showActive) || (row.dataset.status === 'inactive' && showInactive);
            const matchesCategory = categoryId === '' || row.dataset.categoryId === categoryId;
            const matchesUnit = unitId === '' || row.dataset.unitId === unitId;
            const matchesStockStatus = stockStatus === '' || row.dataset.stockStatus === stockStatus;
            const matchesSearch = searchTerm === '' || row.textContent.toLowerCase().includes(searchTerm);
            const isVisible = matchesStatus && matchesCategory && matchesUnit && matchesStockStatus && matchesSearch;
            const checkbox = row.querySelector('input[name="check"]');

            row.classList.toggle('d-none', ! isVisible);

            if (! isVisible && checkbox) {
                checkbox.checked = false;
            }
        });

        syncFilterBadge();
        syncSelectAllCheckbox();
        syncEmptyItemRow();
    }

    function resetCreateItemForm() {
        createItemForm?.reset();
        window.Simpera.clearFormErrors(createItemForm);

        const activeSwitch = document.getElementById('item-is-active');

        if (activeSwitch) {
            activeSwitch.checked = true;
        }

        const integerQtySwitch = document.getElementById('item-is-integer-qty');

        if (integerQtySwitch) {
            integerQtySwitch.checked = false;
        }
    }

    function payloadFromForm(form) {
        const formData = new FormData(form);
        const maximumStock = formData.get('maximum_stock');

        return {
            code: formData.get('code'),
            name: formData.get('name'),
            category_id: formData.get('category_id'),
            unit_id: formData.get('unit_id'),
            minimum_stock: formData.get('minimum_stock'),
            maximum_stock: maximumStock === '' ? null : maximumStock,
            safety_stock: formData.get('safety_stock'),
            lead_time_days: formData.get('lead_time_days'),
            last_price: formData.get('last_price'),
            description: formData.get('description'),
            is_active: formData.has('is_active'),
            is_integer_qty: formData.has('is_integer_qty'),
        };
    }

    function fillEditItemForm(button) {
        editItemForm.querySelector('[name="id"]').value = button.dataset.itemId ?? '';
        editItemForm.querySelector('[name="update_url"]').value = button.dataset.updateUrl ?? '';
        editItemForm.querySelector('[name="code"]').value = button.dataset.code ?? '';
        editItemForm.querySelector('[name="name"]').value = button.dataset.name ?? '';
        editItemForm.querySelector('[name="category_id"]').value = button.dataset.categoryId ?? '';
        editItemForm.querySelector('[name="unit_id"]').value = button.dataset.unitId ?? '';
        editItemForm.querySelector('[name="minimum_stock"]').value = button.dataset.minimumStock ?? '0';
        editItemForm.querySelector('[name="maximum_stock"]').value = button.dataset.maximumStock ?? '';
        editItemForm.querySelector('[name="safety_stock"]').value = button.dataset.safetyStock ?? '0';
        editItemForm.querySelector('[name="lead_time_days"]').value = button.dataset.leadTimeDays ?? '0';
        editItemForm.querySelector('[name="last_price"]').value = button.dataset.lastPrice ?? '0';
        editItemForm.querySelector('[name="description"]').value = button.dataset.description ?? '';
        editItemForm.querySelector('[name="is_active"]').checked = button.dataset.isActive === '1';
        editItemForm.querySelector('[name="is_integer_qty"]').checked = button.dataset.isIntegerQty === '1';
        window.Simpera.clearFormErrors(editItemForm);
    }

    function removeItemRows(rows) {
        rows.forEach((row) => {
            row.remove();
        });

        syncSelectAllCheckbox();
        syncEmptyItemRow();
    }

    function actionLabel(action) {
        const labels = {
            created: 'Dibuat',
            updated: 'Diperbarui',
            deleted: 'Dihapus',
        };

        return labels[action] ?? action;
    }

    function setItemPanelLoading() {
        itemPanelCode.textContent = 'Memuat...';
        itemPanelTitle.textContent = 'Detail Barang';
        itemPanelStatus.textContent = '-';
        itemPanelStatus.className = 'badge bg-light text-dark';
        itemPanelTotalStock.textContent = '0,000';
        itemPanelStockStatus.textContent = '-';
        itemPanelCategory.textContent = '-';
        itemPanelUnit.textContent = '-';
        itemPanelMinimumStock.textContent = '-';
        itemPanelMaximumStock.textContent = '-';
        itemPanelSafetyStock.textContent = '-';
        itemPanelLeadTimeDays.textContent = '0';
        itemPanelLastPrice.textContent = '-';
        itemPanelIntegerQty.textContent = '-';
        itemPanelDescription.textContent = '-';
        itemPanelStocksBadge.textContent = '0';
        itemPanelStocks.innerHTML = '<div class="text-muted py-2">Memuat stok lokasi...</div>';
        itemPanelSuppliersBadge.textContent = '0';
        itemPanelSuppliers.innerHTML = '<div class="text-muted py-2">Memuat supplier...</div>';
        itemPanelCreatedAt.textContent = '-';
        itemPanelUpdatedAt.textContent = '-';
        itemPanelActivities.innerHTML = '<div class="text-muted py-2">Memuat aktivitas...</div>';
        itemPanelDeleteNote.classList.add('d-none');
        itemPanelEditButton.classList.add('d-none');
        itemPanelDeleteButton.classList.add('d-none');
    }

    function renderItemPanel(data) {
        const item = data.item;
        const isActive = Boolean(item.is_active);
        const escapeHtml = window.Simpera.escapeHtml;

        itemPanelCode.textContent = item.code;
        itemPanelTitle.textContent = item.name;
        itemPanelStatus.textContent = isActive ? 'Aktif' : 'Nonaktif';
        itemPanelStatus.className = `badge ${isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`;
        itemPanelTotalStock.textContent = item.total_stock;
        itemPanelStockStatus.textContent = item.stock_status;
        itemPanelCategory.textContent = item.category ?? '-';
        itemPanelUnit.textContent = item.unit ?? '-';
        itemPanelMinimumStock.textContent = item.minimum_stock;
        itemPanelMaximumStock.textContent = item.maximum_stock ?? '-';
        itemPanelSafetyStock.textContent = item.safety_stock;
        itemPanelLeadTimeDays.textContent = item.lead_time_days;
        itemPanelLastPrice.textContent = item.last_price;
        itemPanelDescription.textContent = item.description ?? '-';

        if (itemPanelIntegerQty) {
            if (item.is_integer_qty) {
                itemPanelIntegerQty.innerHTML = '<span class="badge bg-warning-subtle text-warning">Harus bilangan bulat</span>';
            } else {
                itemPanelIntegerQty.innerHTML = '<span class="badge bg-light text-muted border">Boleh desimal</span>';
            }
        }
        itemPanelStocksBadge.textContent = data.stocks.length;
        itemPanelSuppliersBadge.textContent = data.suppliers.length;
        itemPanelCreatedAt.textContent = item.created_at ?? '-';
        itemPanelUpdatedAt.textContent = item.updated_at ?? '-';
        itemPanelDetailLink.href = data.urls.show;

        itemPanelStocks.innerHTML = data.stocks.length > 0
            ? data.stocks.map((stock) => `
                <div class="list-group-item px-0">
                    <div class="d-flex align-items-start justify-content-between gap-2">
                        <div>
                            <h6 class="mb-1">${escapeHtml(stock.location_name ?? '-')}</h6>
                            <span class="text-muted font-13">${escapeHtml(stock.location_code ?? '-')}</span>
                        </div>
                        <span class="fw-semibold">${escapeHtml(stock.quantity)}</span>
                    </div>
                </div>
            `).join('')
            : '<div class="text-muted py-2">Belum ada stok lokasi.</div>';

        itemPanelSuppliers.innerHTML = data.suppliers.length > 0
            ? data.suppliers.map((supplier) => `
                <div class="list-group-item px-0">
                    <div class="d-flex align-items-start justify-content-between gap-2">
                        <div>
                            <h6 class="mb-1">${escapeHtml(supplier.name)}</h6>
                            <span class="text-muted font-13">${escapeHtml(supplier.code)}${supplier.is_primary ? ' - Utama' : ''}</span>
                        </div>
                        <span class="text-muted font-13">${escapeHtml(supplier.last_price)}</span>
                    </div>
                </div>
            `).join('')
            : '<div class="text-muted py-2">Belum ada supplier terkait.</div>';

        itemPanelActivities.innerHTML = data.audit_logs.length > 0
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

        itemPanelEditButton.classList.toggle('d-none', ! data.permissions.update);
        itemPanelEditButton.dataset.itemId = item.id;
        itemPanelEditButton.dataset.updateUrl = data.urls.update;
        itemPanelEditButton.dataset.code = item.code;
        itemPanelEditButton.dataset.name = item.name;
        itemPanelEditButton.dataset.categoryId = item.category_id;
        itemPanelEditButton.dataset.unitId = item.unit_id;
        itemPanelEditButton.dataset.minimumStock = item.minimum_stock.replace(',', '.');
        itemPanelEditButton.dataset.maximumStock = item.maximum_stock ? item.maximum_stock.replace(',', '.') : '';
        itemPanelEditButton.dataset.safetyStock = item.safety_stock.replace(',', '.');
        itemPanelEditButton.dataset.leadTimeDays = item.lead_time_days;
        itemPanelEditButton.dataset.lastPrice = item.last_price.replace(/[^\d]/g, '');
        itemPanelEditButton.dataset.description = item.description ?? '';
        itemPanelEditButton.dataset.isActive = isActive ? '1' : '0';

        itemPanelDeleteButton.classList.toggle('d-none', ! data.permissions.delete);
        itemPanelDeleteButton.dataset.destroyUrl = data.urls.destroy;
        itemPanelDeleteButton.dataset.itemId = item.id;
        itemPanelDeleteButton.dataset.itemName = item.name;
        itemPanelDeleteNote.classList.toggle('d-none', data.permissions.delete);
    }

    async function showItemPanel(detailUrl) {
        sidePanel.open();
        setItemPanelLoading();

        try {
            const response = await fetch(detailUrl, {
                headers: {
                    Accept: 'application/json',
                },
            });
            const data = await response.json();

            if (! response.ok) {
                throw new Error(data.message ?? 'Detail barang tidak dapat dimuat.');
            }

            renderItemPanel(data);
        } catch (error) {
            itemPanelStocks.innerHTML = `<div class="text-danger py-2">${window.Simpera.escapeHtml(error.message)}</div>`;
            itemPanelSuppliers.innerHTML = '';
            itemPanelActivities.innerHTML = '';
        }
    }

    async function deleteItem(deleteButton) {
        const confirmed = await window.Simpera.confirmDelete({
            title: 'Hapus barang?',
            text: `${deleteButton.dataset.itemName ?? 'Barang ini'} akan dihapus dari database.`,
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
                throw new Error(data.message ?? 'Barang tidak dapat dihapus.');
            }

            const itemRow = itemsTable?.querySelector(`tbody tr[data-item-id="${deleteButton.dataset.itemId}"]`);

            if (itemRow) {
                removeItemRows([itemRow]);
            }

            sidePanel.close();

            Swal.fire({
                title: 'Terhapus',
                text: data.message ?? 'Barang berhasil dihapus.',
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
        setAllItemCheckboxes(selectAllCheckbox.checked);
    });

    itemsTable?.addEventListener('change', (event) => {
        if (event.target.matches('tbody input[name="check"]')) {
            syncSelectAllCheckbox();
        }
    });

    applyFilterButton?.addEventListener('click', () => {
        applyItemFilter();
    });

    resetFilterButton?.addEventListener('click', () => {
        if (filterActiveCheckbox) {
            filterActiveCheckbox.checked = true;
        }

        if (filterInactiveCheckbox) {
            filterInactiveCheckbox.checked = true;
        }

        if (filterCategorySelect) {
            filterCategorySelect.value = '';
        }

        if (filterUnitSelect) {
            filterUnitSelect.value = '';
        }

        if (filterStockStatusSelect) {
            filterStockStatusSelect.value = '';
        }

        applyItemFilter();
    });

    window.Simpera.bindLiveTableSearch(liveSearchInput, () => {
        applyItemFilter();
    });

    createItemModal?.addEventListener('hidden.bs.modal', () => {
        resetCreateItemForm();
    });

    editItemModal?.addEventListener('hidden.bs.modal', () => {
        window.Simpera.clearFormErrors(editItemForm);
    });

    itemPanelClose?.addEventListener('click', () => {
        sidePanel.close();
    });

    itemPanelOverlay?.addEventListener('click', () => {
        sidePanel.close();
    });

    itemPanelEditButton?.addEventListener('click', () => {
        fillEditItemForm(itemPanelEditButton);
        bootstrap.Modal.getOrCreateInstance(editItemModal).show();
    });

    itemPanelDeleteButton?.addEventListener('click', () => {
        deleteItem(itemPanelDeleteButton);
    });

    itemsTable?.addEventListener('click', (event) => {
        const detailButton = event.target.closest('.detail-item-button');
        const editButton = event.target.closest('.edit-item-button');
        const deleteButton = event.target.closest('.delete-item-button');

        if (detailButton) {
            event.preventDefault();
            showItemPanel(detailButton.dataset.detailUrl);

            return;
        }

        if (editButton && editItemForm) {
            fillEditItemForm(editButton);

            return;
        }

        if (! deleteButton) {
            return;
        }

        deleteItem(deleteButton);
    });

    createItemForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(createItemForm);

        if (saveItemButton) {
            saveItemButton.disabled = true;
            saveItemButton.textContent = 'Menyimpan...';
        }

        try {
            const { response, data } = await window.Simpera.submitJson(page.dataset.storeUrl, {
                csrfToken,
                payload: payloadFromForm(createItemForm),
            });

            if (response.status === 422) {
                window.Simpera.showFormErrors(createItemForm, data.errors ?? {});

                return;
            }

            if (! response.ok) {
                throw new Error(data.message ?? 'Barang tidak dapat disimpan.');
            }

            emptyItemRow?.insertAdjacentHTML('beforebegin', data.row_html);
            applyItemFilter();
            bootstrap.Modal.getInstance(createItemModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message ?? 'Barang berhasil ditambahkan.',
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
            if (saveItemButton) {
                saveItemButton.disabled = false;
                saveItemButton.textContent = 'Simpan';
            }
        }
    });

    editItemForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(editItemForm);

        if (updateItemButton) {
            updateItemButton.disabled = true;
            updateItemButton.textContent = 'Menyimpan...';
        }

        try {
            const formData = new FormData(editItemForm);
            const updateUrl = formData.get('update_url');
            const itemId = formData.get('id');
            const { response, data } = await window.Simpera.submitJson(updateUrl, {
                method: 'PUT',
                csrfToken,
                payload: payloadFromForm(editItemForm),
            });

            if (response.status === 422) {
                window.Simpera.showFormErrors(editItemForm, data.errors ?? {});

                return;
            }

            if (! response.ok) {
                throw new Error(data.message ?? 'Barang tidak dapat diperbarui.');
            }

            const row = itemsTable?.querySelector(`tbody tr[data-item-id="${itemId}"]`);

            if (row) {
                row.insertAdjacentHTML('afterend', data.row_html);
                row.remove();
            }

            applyItemFilter();
            bootstrap.Modal.getInstance(editItemModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message ?? 'Barang berhasil diperbarui.',
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
            if (updateItemButton) {
                updateItemButton.disabled = false;
                updateItemButton.textContent = 'Simpan Perubahan';
            }
        }
    });

    bulkDeleteButton?.addEventListener('click', async () => {
        const selectedCheckboxes = selectedItemCheckboxes();
        const ids = selectedCheckboxes.map((checkbox) => checkbox.value);

        if (ids.length === 0) {
            return;
        }

        const confirmed = await window.Simpera.confirmDelete({
            title: `Hapus ${ids.length} barang?`,
            text: 'Semua barang yang dipilih akan dihapus dari database.',
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
                throw new Error(data.message ?? 'Barang terpilih tidak dapat dihapus.');
            }

            removeItemRows(selectedCheckboxes.map((checkbox) => checkbox.closest('tr')).filter(Boolean));

            Swal.fire({
                title: 'Terhapus',
                text: data.message ?? 'Barang terpilih berhasil dihapus.',
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

    applyItemFilter();
})();
