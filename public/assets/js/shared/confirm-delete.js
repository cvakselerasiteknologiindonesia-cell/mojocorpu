(function () {
    window.Simpera = window.Simpera || {};

    window.Simpera.confirmDelete = async function confirmDelete(options) {
        const result = await Swal.fire({
            title: options.title || 'Hapus data?',
            text: options.text || 'Data akan dihapus dari database.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: options.confirmButtonText || 'Ya, hapus',
            cancelButtonText: options.cancelButtonText || 'Batal',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            showClass: {
                popup: 'animate__animated animate__fadeInDown animate__faster',
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp animate__faster',
            },
        });

        return result.isConfirmed;
    };
})();
