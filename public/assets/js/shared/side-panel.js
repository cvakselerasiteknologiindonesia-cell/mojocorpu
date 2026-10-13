(function () {
    window.Simpera = window.Simpera || {};

    window.Simpera.escapeHtml = function escapeHtml(value) {
        const wrapper = document.createElement('div');

        wrapper.textContent = value || '';

        return wrapper.innerHTML;
    };

    window.Simpera.createSidePanel = function createSidePanel(panel, overlay) {
        return {
            open() {
                overlay.hidden = false;
                panel.classList.add('is-open');
                panel.setAttribute('aria-hidden', 'false');
            },
            close() {
                panel.classList.remove('is-open');
                panel.setAttribute('aria-hidden', 'true');
                overlay.hidden = true;
            },
        };
    };
})();
