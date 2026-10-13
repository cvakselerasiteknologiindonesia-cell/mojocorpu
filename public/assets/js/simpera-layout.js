(function () {
    const sidebarVisibilitySwitch = document.getElementById('sidebar-visibility-switch');
    const sidebarSizeSetting = document.getElementById('sidebar-size-setting');
    const sidebarSizeInputs = document.querySelectorAll('input[name="sidebar-size"]');
    const sidebarToggle = document.querySelector('.mobile-menu-btn');
    const visibilityStorageKey = 'simpera.sidebar.visible';
    const sizeStorageKey = 'simpera.sidebar.size';

    const sidebarIsVisible = function () {
        return localStorage.getItem(visibilityStorageKey) !== 'false';
    };

    const sidebarSize = function () {
        return localStorage.getItem(sizeStorageKey) === 'collapsed' ? 'collapsed' : 'default';
    };

    const syncSidebarControls = function () {
        if (sidebarVisibilitySwitch) {
            sidebarVisibilitySwitch.checked = sidebarIsVisible();
        }

        if (sidebarSizeSetting) {
            sidebarSizeSetting.classList.toggle('opacity-50', ! sidebarIsVisible());
        }

        sidebarSizeInputs.forEach(function (input) {
            input.checked = input.value === sidebarSize();
            input.disabled = ! sidebarIsVisible();
        });
    };

    const applySidebarPreference = function () {
        if (! sidebarIsVisible()) {
            document.body.setAttribute('data-sidebar-size', 'hidden');
        } else {
            document.body.setAttribute('data-sidebar-size', sidebarSize());
        }

        syncSidebarControls();
    };

    if (sidebarVisibilitySwitch) {
        sidebarVisibilitySwitch.addEventListener('change', function () {
            localStorage.setItem(visibilityStorageKey, sidebarVisibilitySwitch.checked ? 'true' : 'false');
            applySidebarPreference();
        });
    }

    sidebarSizeInputs.forEach(function (input) {
        input.addEventListener('change', function () {
            if (! input.checked) {
                return;
            }

            localStorage.setItem(sizeStorageKey, input.value);
            localStorage.setItem(visibilityStorageKey, 'true');
            applySidebarPreference();
        });
    });

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function () {
            requestAnimationFrame(function () {
                const currentSidebarSize = document.body.getAttribute('data-sidebar-size') === 'collapsed' ? 'collapsed' : 'default';

                localStorage.setItem(visibilityStorageKey, 'true');
                localStorage.setItem(sizeStorageKey, currentSidebarSize);
                syncSidebarControls();
            });
        });
    }

    window.addEventListener('resize', applySidebarPreference);
    applySidebarPreference();
})();
