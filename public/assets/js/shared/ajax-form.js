(function () {
    window.Simpera = window.Simpera || {};

    window.Simpera.clearFormErrors = function clearFormErrors(form) {
        form?.querySelectorAll('.is-invalid').forEach((input) => {
            input.classList.remove('is-invalid');
        });

        form?.querySelectorAll('[data-error-for]').forEach((feedback) => {
            feedback.textContent = '';
        });
    };

    window.Simpera.showFormErrors = function showFormErrors(form, errors) {
        Object.entries(errors).forEach(([field, messages]) => {
            const input = form?.querySelector(`[name="${field}"]`);
            const feedback = form?.querySelector(`[data-error-for="${field}"]`);

            input?.classList.add('is-invalid');

            if (feedback) {
                feedback.textContent = messages[0] || 'Field tidak valid.';
            }
        });
    };

    window.Simpera.submitJson = async function submitJson(url, options) {
        const response = await fetch(url, {
            method: options.method || 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': options.csrfToken,
            },
            body: JSON.stringify(options.payload || {}),
        });
        const data = await response.json();

        return { response, data };
    };
})();
