(function () {
    const page = document.getElementById('category-page');

    if (! page) {
        return;
    }

    const selectAllCheckbox = document.getElementById('select-all');
    const selectAllWrapper = document.querySelector('.select-all-wrapper');
    const categoriesTable = document.getElementById('datatable_1');
    const bulkDeleteWrapper = document.getElementById('bulk-delete-wrapper');
    const bulkDeleteButton = document.getElementById('bulk-delete-button');
    const bulkDeleteLabel = document.getElementById('bulk-delete-label');
    const emptyCategoryRow = document.getElementById('empty-category-row');
    const emptyCategoryMessage = document.getElementById('empty-category-message');
    const filterActiveCheckbox = document.getElementById('filter-active');
    const filterInactiveCheckbox = document.getElementById('filter-inactive');
    const applyFilterButton = document.getElementById('apply-filter');
    const resetFilterButton = document.getElementById('reset-filter');
    const filterCountBadge = document.getElementById('filter-count-badge');
    const liveSearchInput = document.getElementById('category-live-search');
    const createCategoryModal = document.getElementById('createCategoryModal');
    const createCategoryForm = document.getElementById('create-category-form');
    const saveCategoryButton = document.getElementById('save-category-button');
    const editCategoryModal = document.getElementById('editCategoryModal');
    const editCategoryForm = document.getElementById('edit-category-form');
    const updateCategoryButton = document.getElementById('update-category-button');
    const categoryPanelOverlay = document.getElementById('category-panel-overlay');
    const categorySidePanel = document.getElementById('category-side-panel');
    const categoryPanelClose = document.getElementById('category-panel-close');
    const categoryPanelCode = document.getElementById('category-panel-code');
    const categoryPanelTitle = document.getElementById('category-panel-title');
    const categoryPanelStatus = document.getElementById('category-panel-status');
    const categoryPanelItemsCount = document.getElementById('category-panel-items-count');
    const categoryPanelUpdatedAt = document.getElementById('category-panel-updated-at');
    const categoryPanelDescription = document.getElementById('category-panel-description');
    const categoryPanelCreatedAt = document.getElementById('category-panel-created-at');
    const categoryPanelItemsBadge = document.getElementById('category-panel-items-badge');
    const categoryPanelItems = document.getElementById('category-panel-items');
    const categoryPanelActivities = document.getElementById('category-panel-activities');
    const categoryPanelDeleteNote = document.getElementById('category-panel-delete-note');
    const categoryPanelEditButton = document.getElementById('category-panel-edit-button');
    const categoryPanelDetailLink = document.getElementById('category-panel-detail-link');
    const categoryPanelDeleteButton = document.getElementById('category-panel-delete-button');
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const defaultEmptyCategoryMessage = emptyCategoryMessage?.textContent.trim() || 'Belum ada kategori.';
    const sidePanel = window.Simpera.createSidePanel(categorySidePanel, categoryPanelOverlay);

    function categoryCheckboxes() {
        return Array.from(document.querySelectorAll('#datatable_1 tbody input[name="check"]'));
    }

    function selectedCategoryCheckboxes() {
        return visibleCategoryCheckboxes().filter((checkbox) => checkbox.checked);
    }

    function categoryRows() {
        return Array.from(document.querySelectorAll('#datatable_1 tbody tr:not(#empty-category-row)'));
    }

    function visibleCategoryRows() {
        return categoryRows().filter((row) => ! row.classList.contains('d-none'));
    }

    function visibleCategoryCheckboxes() {
        return visibleCategoryRows()
            .map((row) => row.querySelector('input[name="check"]'))
            .filter(Boolean);
    }

    function syncEmptyCategoryRow() {
        const rows = categoryRows();
        const visibleRows = visibleCategoryRows();

        if (! emptyCategoryRow || ! emptyCategoryMessage) {
            return;
        }

        if (rows.length === 0) {
            emptyCategoryMessage.textContent = defaultEmptyCategoryMessage;
            emptyCategoryRow.classList.remove('d-none');

            return;
        }

        if (visibleRows.length === 0) {
            emptyCategoryMessage.textContent = liveSearchInput?.value.trim()
                ? 'Tidak ada kategori yang cocok dengan pencarian.'
                : 'Tidak ada kategori yang sesuai dengan filter.';
            emptyCategoryRow.classList.remove('d-none');

            return;
        }

        emptyCategoryRow.classList.add('d-none');
    }

    function syncSelectAllCheckbox() {
        const checkboxes = visibleCategoryCheckboxes();
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

    function setAllCategoryCheckboxes(checked) {
        visibleCategoryCheckboxes().forEach((checkbox) => {
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

    function applyCategoryFilter() {
        const showActive = filterActiveCheckbox?.checked ?? true;
        const showInactive = filterInactiveCheckbox?.checked ?? true;
        const searchTerm = liveSearchInput?.value.trim().toLowerCase() ?? '';

        categoryRows().forEach((row) => {
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
        syncEmptyCategoryRow();
    }

    function resetCategoryForm() {
        createCategoryForm?.reset();
        window.Simpera.clearFormErrors(createCategoryForm);

        const activeSwitch = document.getElementById('category-is-active');

        if (activeSwitch) {
            activeSwitch.checked = true;
        }
    }

    function fillEditCategoryForm(button) {
        editCategoryForm.querySelector('[name="id"]').value = button.dataset.categoryId ?? '';
        editCategoryForm.querySelector('[name="update_url"]').value = button.dataset.updateUrl ?? '';
        editCategoryForm.querySelector('[name="code"]').value = button.dataset.code ?? '';
        editCategoryForm.querySelector('[name="name"]').value = button.dataset.name ?? '';
        editCategoryForm.querySelector('[name="description"]').value = button.dataset.description ?? '';
        editCategoryForm.querySelector('[name="is_active"]').checked = button.dataset.isActive === '1';
        window.Simpera.clearFormErrors(editCategoryForm);
    }

    function removeCategoryRows(rows) {
        rows.forEach((row) => {
            row.remove();
        });

        syncSelectAllCheckbox();
        syncEmptyCategoryRow();
    }

    function actionLabel(action) {
        const labels = {
            created: 'Dibuat',
            updated: 'Diperbarui',
            deleted: 'Dihapus',
        };

        return labels[action] ?? action;
    }

    function setCategoryPanelLoading() {
        categoryPanelCode.textContent = 'Memuat...';
        categoryPanelTitle.textContent = 'Detail Kategori';
        categoryPanelStatus.textContent = '-';
        categoryPanelStatus.className = 'badge bg-light text-dark';
        categoryPanelItemsCount.textContent = '0';
        categoryPanelUpdatedAt.textContent = '-';
        categoryPanelDescription.textContent = '-';
        categoryPanelCreatedAt.textContent = '-';
        categoryPanelItemsBadge.textContent = '0';
        categoryPanelItems.innerHTML = '<div class="text-muted py-2">Memuat barang terkait...</div>';
        categoryPanelActivities.innerHTML = '<div class="text-muted py-2">Memuat aktivitas...</div>';
        categoryPanelDeleteNote.classList.add('d-none');
        categoryPanelEditButton.classList.add('d-none');
        categoryPanelDeleteButton.classList.add('d-none');
    }

    function renderCategoryPanel(data) {
        const category = data.category;
        const isActive = Boolean(category.is_active);
        const escapeHtml = window.Simpera.escapeHtml;

        categoryPanelCode.textContent = category.code;
        categoryPanelTitle.textContent = category.name;
        categoryPanelStatus.textContent = isActive ? 'Aktif' : 'Nonaktif';
        categoryPanelStatus.className = `badge ${isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`;
        categoryPanelItemsCount.textContent = category.items_count;
        categoryPanelUpdatedAt.textContent = category.updated_at ?? '-';
        categoryPanelDescription.textContent = category.description ?? '-';
        categoryPanelCreatedAt.textContent = category.created_at ?? '-';
        categoryPanelItemsBadge.textContent = category.items_count;
        categoryPanelDetailLink.href = data.urls.show;

        categoryPanelItems.innerHTML = data.items.length > 0
            ? data.items.map((item) => `
                <div class="list-group-item px-0">
                    <div class="d-flex align-items-start justify-content-between gap-2">
                        <div>
                            <h6 class="mb-1">${escapeHtml(item.name)}</h6>
                            <span class="text-muted font-13">${escapeHtml(item.code)}${item.unit ? ` - ${escapeHtml(item.unit)}` : ''}</span>
                        </div>
                        <span class="badge ${item.is_active ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}">${item.is_active ? 'Aktif' : 'Nonaktif'}</span>
                    </div>
                </div>
            `).join('')
            : '<div class="text-muted py-2">Belum ada barang dalam kategori ini.</div>';

        categoryPanelActivities.innerHTML = data.audit_logs.length > 0
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

        categoryPanelEditButton.classList.toggle('d-none', ! data.permissions.update);
        categoryPanelEditButton.dataset.categoryId = category.id;
        categoryPanelEditButton.dataset.updateUrl = data.urls.update;
        categoryPanelEditButton.dataset.code = category.code;
        categoryPanelEditButton.dataset.name = category.name;
        categoryPanelEditButton.dataset.description = category.description ?? '';
        categoryPanelEditButton.dataset.isActive = isActive ? '1' : '0';

        const canDelete = data.permissions.delete && Number(category.items_count) === 0;

        categoryPanelDeleteButton.classList.toggle('d-none', ! canDelete);
        categoryPanelDeleteButton.dataset.destroyUrl = data.urls.destroy;
        categoryPanelDeleteButton.dataset.categoryId = category.id;
        categoryPanelDeleteButton.dataset.categoryName = category.name;
        categoryPanelDeleteNote.classList.toggle('d-none', data.permissions.delete === false || Number(category.items_count) === 0);
    }

    async function showCategoryPanel(detailUrl) {
        sidePanel.open();
        setCategoryPanelLoading();

        try {
            const response = await fetch(detailUrl, {
                headers: {
                    Accept: 'application/json',
                },
            });
            const data = await response.json();

            if (! response.ok) {
                throw new Error(data.message ?? 'Detail kategori tidak dapat dimuat.');
            }

            renderCategoryPanel(data);
        } catch (error) {
            categoryPanelItems.innerHTML = `<div class="text-danger py-2">${window.Simpera.escapeHtml(error.message)}</div>`;
            categoryPanelActivities.innerHTML = '';
        }
    }

    async function deleteCategory(deleteButton) {
        const confirmed = await window.Simpera.confirmDelete({
            title: 'Hapus kategori?',
            text: `${deleteButton.dataset.categoryName ?? 'Kategori ini'} akan dihapus dari database.`,
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
                throw new Error(data.message ?? 'Kategori tidak dapat dihapus.');
            }

            const categoryRow = categoriesTable?.querySelector(`tbody tr[data-category-id="${deleteButton.dataset.categoryId}"]`);

            if (categoryRow) {
                removeCategoryRows([categoryRow]);
            }

            sidePanel.close();

            Swal.fire({
                title: 'Terhapus',
                text: data.message ?? 'Kategori berhasil dihapus.',
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
        setAllCategoryCheckboxes(selectAllCheckbox.checked);
    });

    categoriesTable?.addEventListener('change', (event) => {
        if (event.target.matches('tbody input[name="check"]')) {
            syncSelectAllCheckbox();
        }
    });

    applyFilterButton?.addEventListener('click', () => {
        applyCategoryFilter();
    });

    resetFilterButton?.addEventListener('click', () => {
        if (filterActiveCheckbox) {
            filterActiveCheckbox.checked = true;
        }

        if (filterInactiveCheckbox) {
            filterInactiveCheckbox.checked = true;
        }

        applyCategoryFilter();
    });

    window.Simpera.bindLiveTableSearch(liveSearchInput, () => {
        applyCategoryFilter();
    });

    createCategoryModal?.addEventListener('hidden.bs.modal', () => {
        resetCategoryForm();
    });

    editCategoryModal?.addEventListener('hidden.bs.modal', () => {
        window.Simpera.clearFormErrors(editCategoryForm);
    });

    categoryPanelClose?.addEventListener('click', () => {
        sidePanel.close();
    });

    categoryPanelOverlay?.addEventListener('click', () => {
        sidePanel.close();
    });

    categoryPanelEditButton?.addEventListener('click', () => {
        fillEditCategoryForm(categoryPanelEditButton);
        bootstrap.Modal.getOrCreateInstance(editCategoryModal).show();
    });

    categoryPanelDeleteButton?.addEventListener('click', () => {
        deleteCategory(categoryPanelDeleteButton);
    });

    categoriesTable?.addEventListener('click', (event) => {
        const detailButton = event.target.closest('.detail-category-button');
        const editButton = event.target.closest('.edit-category-button');
        const deleteButton = event.target.closest('.delete-category-button');

        if (detailButton) {
            showCategoryPanel(detailButton.dataset.detailUrl);

            return;
        }

        if (editButton && editCategoryForm) {
            fillEditCategoryForm(editButton);

            return;
        }

        if (! deleteButton) {
            return;
        }

        deleteCategory(deleteButton);
    });

    createCategoryForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(createCategoryForm);

        if (saveCategoryButton) {
            saveCategoryButton.disabled = true;
            saveCategoryButton.textContent = 'Menyimpan...';
        }

        try {
            const formData = new FormData(createCategoryForm);
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
                window.Simpera.showFormErrors(createCategoryForm, data.errors ?? {});

                return;
            }

            if (! response.ok) {
                throw new Error(data.message ?? 'Kategori tidak dapat disimpan.');
            }

            emptyCategoryRow?.insertAdjacentHTML('beforebegin', data.row_html);
            applyCategoryFilter();
            bootstrap.Modal.getInstance(createCategoryModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message ?? 'Kategori berhasil ditambahkan.',
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
            if (saveCategoryButton) {
                saveCategoryButton.disabled = false;
                saveCategoryButton.textContent = 'Simpan';
            }
        }
    });

    editCategoryForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        window.Simpera.clearFormErrors(editCategoryForm);

        if (updateCategoryButton) {
            updateCategoryButton.disabled = true;
            updateCategoryButton.textContent = 'Menyimpan...';
        }

        try {
            const formData = new FormData(editCategoryForm);
            const updateUrl = formData.get('update_url');
            const categoryId = formData.get('id');
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
                window.Simpera.showFormErrors(editCategoryForm, data.errors ?? {});

                return;
            }

            if (! response.ok) {
                throw new Error(data.message ?? 'Kategori tidak dapat diperbarui.');
            }

            const categoryRow = categoriesTable?.querySelector(`tbody tr[data-category-id="${categoryId}"]`);

            if (categoryRow) {
                categoryRow.outerHTML = data.row_html;
            }

            applyCategoryFilter();
            bootstrap.Modal.getInstance(editCategoryModal)?.hide();

            Swal.fire({
                title: 'Berhasil',
                text: data.message ?? 'Kategori berhasil diperbarui.',
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
            if (updateCategoryButton) {
                updateCategoryButton.disabled = false;
                updateCategoryButton.textContent = 'Simpan Perubahan';
            }
        }
    });

    bulkDeleteButton?.addEventListener('click', async () => {
        const selectedCheckboxes = selectedCategoryCheckboxes();
        const selectedCount = selectedCheckboxes.length;
        const selectedIds = selectedCheckboxes.map((checkbox) => checkbox.value);

        if (selectedCount === 0) {
            return;
        }

        const confirmed = await window.Simpera.confirmDelete({
            title: 'Hapus kategori terpilih?',
            text: `${selectedCount} kategori terpilih akan dihapus dari database.`,
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
                throw new Error(data.message ?? 'Kategori terpilih tidak dapat dihapus.');
            }

            removeCategoryRows(selectedCheckboxes.map((checkbox) => checkbox.closest('tr')).filter(Boolean));

            Swal.fire({
                title: 'Terhapus',
                text: data.message ?? `${selectedCount} kategori berhasil dihapus.`,
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
    syncEmptyCategoryRow();
})();
