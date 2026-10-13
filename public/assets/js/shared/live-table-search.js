(function () {
    window.Simpera = window.Simpera || {};

    window.Simpera.bindLiveTableSearch = function bindLiveTableSearch(input, callback) {
        input?.addEventListener('input', () => {
            callback(input.value.trim().toLowerCase());
        });
    };
})();
