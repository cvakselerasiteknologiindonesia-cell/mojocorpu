(function () {
    'use strict';

    const tour = window.SimperaTour;

    if (! tour || ! window.driver?.js?.driver) {
        return;
    }

    const driver = window.driver.js.driver;

    // ─── Step definitions per role ────────────────────────────────────────

    function ensureCollapseOpen(collapseId) {
        const el = document.getElementById(collapseId);

        if (el && ! el.classList.contains('show')) {
            bootstrap.Collapse.getOrCreateInstance(el, { toggle: false }).show();
        }
    }

    const stepsStaff = [
        {
            element: '#startbarCollapse',
            popover: {
                title: 'Selamat datang di Simpera 👋',
                description: 'Aplikasi ini membantu kamu mengelola inventori barang operasional cleaning service. Mari kenali menu utamanya.',
                side: 'right',
                align: 'start',
            },
        },
        {
            element: '#sidebarTransactions',
            popover: {
                title: 'Menu Operasional',
                description: 'Semua transaksi stok ada di sini — mulai dari Stok Awal, Penerimaan, Permintaan, Pengeluaran, Transfer, hingga Opname.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarTransactions'),
        },
        {
            element: 'a[href*="opening-stocks"]',
            popover: {
                title: '1. Stok Awal',
                description: 'Langkah pertama: input saldo awal barang di setiap lokasi. Lakukan ini sekali saat sistem pertama kali digunakan.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarTransactions'),
        },
        {
            element: 'a[href*="stock-receipts"]',
            popover: {
                title: '2. Penerimaan Barang',
                description: 'Catat setiap barang yang masuk dari supplier. Stok bertambah setelah dokumen diposting.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarTransactions'),
        },
        {
            element: 'a[href*="stock-requests"]',
            popover: {
                title: '3. Permintaan Stok',
                description: 'Ajukan kebutuhan barang dari lokasi operasional ke gudang. Harus disetujui sebelum barang dikeluarkan.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarTransactions'),
        },
        {
            element: 'a[href*="stock-issues"]',
            popover: {
                title: '4. Pengeluaran Barang',
                description: 'Barang dikeluarkan dari gudang ke lokasi pemohon. Stok berkurang setelah diposting.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarTransactions'),
        },
        {
            element: '#sidebarStock',
            popover: {
                title: 'Monitoring Stok',
                description: 'Pantau saldo stok real-time di Stok Saat Ini, dan telusuri riwayat pergerakan di Buku Stok.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarStock'),
        },
        {
            element: '#sidebarReports',
            popover: {
                title: 'Laporan',
                description: 'Semua laporan tersedia di sini — stok minimum, mutasi, penerimaan, pengeluaran, transfer, dan pemakaian bulanan. Bisa di-export ke Excel.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarReports'),
        },
    ];

    const stepsApprover = [
        {
            element: '#startbarCollapse',
            popover: {
                title: 'Selamat datang, Approver 👋',
                description: 'Peranmu adalah menyetujui atau menolak permintaan stok dari staff operasional.',
                side: 'right',
                align: 'start',
            },
        },
        {
            element: '.page-content',
            popover: {
                title: 'Dashboard',
                description: 'Dashboard menampilkan semua transaksi yang menunggu tindakanmu — termasuk banner merah jika ada yang urgent.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            element: 'a[href*="stock-requests"]',
            popover: {
                title: 'Permintaan Stok',
                description: 'Buka halaman ini untuk melihat semua permintaan. Filter status "Diajukan" untuk menemukan yang butuh persetujuan.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarTransactions'),
        },
        {
            element: '#sidebarTransactions',
            popover: {
                title: 'Fitur Partial Approval',
                description: 'Saat menyetujui permintaan, kamu bisa mengubah jumlah yang disetujui per baris — tidak harus sesuai jumlah yang diminta.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarTransactions'),
        },
        {
            element: '#sidebarReports',
            popover: {
                title: 'Laporan',
                description: 'Gunakan laporan untuk memantau tren penggunaan barang sebelum membuat keputusan persetujuan.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarReports'),
        },

        // ── Step khusus halaman show permintaan stok ──
        // Step ini hanya muncul jika elemen ada di halaman (skip jika tidak).
        {
            element: '.stock-request-approve-button, [data-bs-target="#approveStockRequestModal"]',
            popover: {
                title: 'Tombol Setujui',
                description: 'Klik tombol ini untuk membuka form persetujuan. Kamu bisa mengubah jumlah per baris sebelum konfirmasi.',
                side: 'bottom',
                align: 'start',
            },
            onBeforeHighlight: () => {
                return !! document.querySelector(
                    '.stock-request-approve-button, [data-bs-target="#approveStockRequestModal"]'
                );
            },
        },
        {
            element: '#approveStockRequestModal .approve-qty-input',
            popover: {
                title: 'Input Jumlah Disetujui',
                description: 'Setiap baris barang punya input Jumlah Disetujui. Default sama dengan yang diminta — ubah jika perlu menyesuaikan stok atau anggaran.',
                side: 'top',
                align: 'start',
            },
            onBeforeHighlight: () => {
                // Pastikan modal approval terbuka dulu
                const modal = document.getElementById('approveStockRequestModal');
                if (! modal) {
                    return false;
                }

                if (! modal.classList.contains('show')) {
                    bootstrap.Modal.getOrCreateInstance(modal).show();
                    // Tunggu modal terbuka
                    return new Promise((resolve) => {
                        modal.addEventListener('shown.bs.modal', () => resolve(true), { once: true });
                    });
                }

                return true;
            },
            onDeselected: () => {
                // Tutup modal setelah step ini selesai
                const modal = document.getElementById('approveStockRequestModal');
                if (modal?.classList.contains('show')) {
                    bootstrap.Modal.getOrCreateInstance(modal).hide();
                }
            },
        },
        {
            element: '.approve-fill-requested-btn',
            popover: {
                title: 'Tombol Reset ↺',
                description: 'Klik tombol ini untuk mengembalikan Jumlah Disetujui ke nilai yang diminta — berguna jika sudah terlanjur mengubah dan ingin reset.',
                side: 'left',
                align: 'start',
            },
            onBeforeHighlight: () => {
                return !! document.querySelector('.approve-fill-requested-btn');
            },
        },
    ];

    const stepsSuperAdmin = [
        {
            element: '#startbarCollapse',
            popover: {
                title: 'Selamat datang, Super Admin 👋',
                description: 'Kamu punya akses penuh ke seluruh fitur Simpera — dari transaksi, persetujuan, posting, hingga pengaturan sistem.',
                side: 'right',
                align: 'start',
            },
        },
        {
            element: '#sidebarSettings',
            popover: {
                title: 'Pengaturan — Mulai di Sini',
                description: 'Sebelum transaksi bisa berjalan, buka Tahun Buku Stok dan pastikan ada tahun yang aktif (OPEN).',
                side: 'right',
                align: 'start',
            },
        },
        {
            element: 'a[href*="stock-periods"]',
            popover: {
                title: 'Tahun Buku Stok',
                description: 'Buka tahun buku baru di sini. Tanpa tahun aktif, semua transaksi akan ditolak oleh sistem.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarSettings'),
        },
        {
            element: '#sidebarTransactions',
            popover: {
                title: 'Alur Transaksi',
                description: 'Urutan bisnis: Stok Awal → Penerimaan → Permintaan → Pengeluaran → Transfer → Opname. Stok baru berubah setelah dokumen diposting.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarTransactions'),
        },
        {
            element: '.page-content',
            popover: {
                title: 'Antrian Persetujuan & Posting',
                description: 'Dashboard menampilkan antrian dokumen yang butuh persetujuan atau siap diposting — langsung klik untuk tindak lanjut.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            element: '#sidebarMaster',
            popover: {
                title: 'Master Data',
                description: 'Setup master data sebelum transaksi: Kategori → Satuan → Barang → Pemasok → Lokasi.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarMaster'),
        },
        {
            element: '#sidebarReports',
            popover: {
                title: 'Laporan & Monitoring',
                description: 'Semua laporan tersedia dengan filter periode, lokasi, dan status. Bisa di-export ke Excel.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarReports'),
        },
    ];

    const stepsManagement = [
        {
            element: '#startbarCollapse',
            popover: {
                title: 'Selamat datang, Management 👋',
                description: 'Dashboard ini memberikan gambaran operasional inventori secara real-time — kondisi stok, tren, dan alert.',
                side: 'right',
                align: 'start',
            },
        },
        {
            element: '.page-content',
            popover: {
                title: 'Dashboard Ringkasan',
                description: 'Pantau kondisi stok, jumlah barang masuk/keluar periode ini, dan alert stok menipis langsung dari sini.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            element: '#sidebarStock',
            popover: {
                title: 'Monitoring Stok',
                description: 'Stok Saat Ini menampilkan saldo real-time per lokasi. Buku Stok mencatat seluruh riwayat pergerakan.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarStock'),
        },
        {
            element: '#sidebarReports',
            popover: {
                title: 'Laporan Lengkap',
                description: 'Laporan Stok Minimum untuk monitoring restock, Mutasi Stok untuk audit, dan Pemakaian Bulanan untuk analisis tren.',
                side: 'right',
                align: 'start',
            },
            onHighlightStarted: () => ensureCollapseOpen('sidebarReports'),
        },
    ];

    const roleSteps = {
        'super-admin':   stepsSuperAdmin,
        'admin-gudang':  stepsSuperAdmin,
        'petugas-gudang': stepsStaff,
        'approver':      stepsApprover,
        'staff':         stepsStaff,
        'management':    stepsManagement,
        'auditor':       stepsManagement,
    };

    // ─── Driver instance ──────────────────────────────────────────────────

    function markComplete() {
        fetch(tour.completeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': tour.csrfToken,
                'Accept': 'application/json',
            },
        }).catch(() => {});
    }

    // ─── Sidebar collapse helpers ─────────────────────────────────────────

    const sidebarCollapseIds = [
        'sidebarMaster',
        'sidebarTransactions',
        'sidebarStock',
        'sidebarReports',
        'sidebarSettings',
    ];

    function openSidebarCollapses() {
        sidebarCollapseIds.forEach((id) => {
            const el = document.getElementById(id);

            if (el && ! el.classList.contains('show')) {
                bootstrap.Collapse.getOrCreateInstance(el, { toggle: false }).show();
            }
        });
    }

    function closeSidebarCollapses() {
        sidebarCollapseIds.forEach((id) => {
            const el = document.getElementById(id);

            if (el && el.classList.contains('show')) {
                bootstrap.Collapse.getOrCreateInstance(el, { toggle: false }).hide();
            }
        });
    }

    function createDriver(steps) {
        return driver({
            showProgress: true,
            progressText: 'Langkah {{current}} dari {{total}}',
            nextBtnText: 'Berikutnya →',
            prevBtnText: '← Kembali',
            doneBtnText: 'Selesai',
            allowClose: true,
            overlayOpacity: 0.4,
            stagePadding: 6,
            stageRadius: 6,
            popoverClass: 'simpera-tour-popover',
            steps: steps,
            onDestroyStarted: () => {
                markComplete();
                closeSidebarCollapses();
                window.SimperaTour.completed = true;
                d.destroy();
            },
        });
    }

    // ─── Auto-start jika belum selesai ────────────────────────────────────

    const steps = roleSteps[tour.role] ?? stepsStaff;
    let d;

    if (! tour.completed) {
        setTimeout(() => {
            openSidebarCollapses();
            // Beri waktu animasi collapse selesai (~350ms) sebelum tour dimulai
            setTimeout(() => {
                d = createDriver(steps);
                d.drive();
            }, 400);
        }, 800);
    }

    // ─── API publik untuk restart tour dari tombol topbar ─────────────────

    window.SimperaTour.start = function () {
        openSidebarCollapses();
        setTimeout(() => {
            d = createDriver(steps);
            d.drive();
        }, 400);
    };

    window.SimperaTour.resetAndStart = function () {
        fetch(tour.resetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': tour.csrfToken,
                'Accept': 'application/json',
            },
        }).then(() => {
            window.SimperaTour.completed = false;
            window.SimperaTour.start();
        }).catch(() => {
            window.SimperaTour.start();
        });
    };
}());
