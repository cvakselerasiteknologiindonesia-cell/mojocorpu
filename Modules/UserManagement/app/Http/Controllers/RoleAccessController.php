<?php

namespace Modules\UserManagement\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleAccessController extends Controller
{
    public function index()
    {
        $this->ensureCatalogPermissions();

        $userCounts = DB::table(config('permission.table_names.model_has_roles', 'model_has_roles'))
            ->select('role_id', DB::raw('count(*) as aggregate'))
            ->where('model_type', User::class)
            ->groupBy('role_id')
            ->pluck('aggregate', 'role_id');

        $roles = Role::query()
            ->with('permissions:id,name')
            ->orderByRaw("CASE WHEN name = 'super-admin' THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'guard_name' => $role->guard_name,
                'users_count' => (int) ($userCounts[$role->id] ?? 0),
                'locked' => $role->name === 'super-admin',
                'permissions' => $role->permissions->pluck('name')->sort()->values(),
            ]);

        $knownCatalogPermissions = collect($this->catalog())
            ->flatMap(fn (array $group) => collect($group['items'])->pluck('name'))
            ->unique()
            ->values();

        $uncategorized = Permission::query()
            ->whereNotIn('name', $knownCatalogPermissions)
            ->orderBy('name')
            ->pluck('name')
            ->map(fn (string $name) => [
                'name' => $name,
                'label' => $this->permissionLabel($name),
                'description' => 'Permission teknis dari modul aplikasi.',
            ])
            ->values();

        $catalog = $this->catalog();
        if ($uncategorized->isNotEmpty()) {
            $catalog[] = [
                'key' => 'other',
                'label' => 'Permission Lain',
                'description' => 'Akses tambahan yang belum dikaitkan ke menu atau tombol utama.',
                'items' => $uncategorized,
            ];
        }

        return ApiResponse::success('Role access retrieved', [
            'roles' => $roles,
            'catalog' => $catalog,
        ]);
    }

    public function update(Request $request, string $roleName)
    {
        if ($roleName === 'super-admin') {
            return ApiResponse::error('Permission super-admin dikunci agar selalu memiliki akses penuh.', 422);
        }

        $role = Role::query()->where('name', $roleName)->firstOrFail();
        $availablePermissions = Permission::query()->pluck('name')->all();

        $data = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', Rule::in($availablePermissions)],
        ]);

        try {
            $permissions = collect($data['permissions'])
                ->unique()
                ->sort()
                ->values()
                ->all();

            DB::transaction(function () use ($request, $role, $permissions): void {
                $role->syncPermissions($permissions);

                activity('role')
                    ->event('permissions_updated')
                    ->causedBy($request->user())
                    ->log("Permission role {$role->name} diperbarui");
            });

            app(PermissionRegistrar::class)->forgetCachedPermissions();

            return ApiResponse::success('Permission role berhasil diperbarui.', [
                'name' => $role->name,
                'permissions' => $role->fresh('permissions')->permissions->pluck('name')->sort()->values(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed updating role permissions', [
                'role' => $role->name,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return ApiResponse::error('Gagal memperbarui permission role.');
        }
    }

    private function ensureCatalogPermissions(): void
    {
        collect($this->catalog())
            ->flatMap(fn (array $group) => collect($group['items'])->pluck('name'))
            ->unique()
            ->each(fn (string $name) => Permission::findOrCreate($name, 'web'));
    }

    private function catalog(): array
    {
        return [
            [
                'key' => 'menus',
                'label' => 'Tampilan Menu',
                'description' => 'Permission yang menentukan menu sidebar apa saja yang muncul untuk role.',
                'items' => [
                    $this->item('view dashboard', 'Dashboard', 'Menampilkan ringkasan sesuai role pengguna.'),
                    $this->item('view user', 'Pengguna', 'Menampilkan menu dan daftar pengguna.'),
                    $this->item('view role', 'Roles', 'Menampilkan menu pengaturan role dan permission.'),
                    $this->item('view opd', 'OPD', 'Menampilkan master OPD dan sinkronisasi satker.'),
                    $this->item('view facilitator', 'Fasilitator', 'Menampilkan data fasilitator internal dan eksternal.'),
                    $this->item('view training proposal', 'Usulan Pelatihan', 'Menampilkan proposal atau usulan kebutuhan pelatihan.'),
                    $this->item('approve training proposal', 'Review Proposal', 'Menampilkan menu review proposal untuk super-admin.'),
                    $this->item('view training event', 'Event Pelatihan', 'Menampilkan daftar event dan kelas pelatihan.'),
                    $this->item('view lms', 'LMS', 'Menampilkan materi dan ruang belajar.'),
                    $this->item('view curriculum', 'Kurikulum', 'Menampilkan menu kurikulum dan alur pembelajaran admin.'),
                    $this->item('view learning path', 'Alur Belajar', 'Menampilkan learning path untuk peserta ASN.'),
                    $this->item('view kms asset', 'Aset Pengetahuan', 'Menampilkan knowledge management system.'),
                    $this->item('view blog', 'Artikel', 'Menampilkan menu artikel dan berita pembelajaran.'),
                    $this->item('view quiz', 'Kuis', 'Menampilkan pengelolaan kuis dan asesmen.'),
                    $this->item('view certificate', 'Sertifikat', 'Menampilkan menu sertifikat.'),
                    $this->item('view discussion forum', 'Forum Diskusi', 'Menampilkan ruang diskusi komunitas belajar.'),
                    $this->item('view attendance', 'Presensi', 'Menampilkan menu presensi.'),
                    $this->item('view leaderboard', 'Peringkat', 'Menampilkan menu peringkat peserta.'),
                    $this->item('view achievement', 'Pencapaian', 'Menampilkan menu pencapaian dan badge.'),
                    $this->item('view wallet', 'Dompet Token', 'Menampilkan dompet token pengguna.'),
                    $this->item('view store', 'Toko Token', 'Menampilkan toko penukaran token.'),
                    $this->item('view audit log', 'Log Aktivitas & Keamanan', 'Menampilkan audit log dan dashboard keamanan.'),
                    $this->item('view report', 'Laporan', 'Menampilkan laporan dan rekap.'),
                    $this->item('manage settings', 'Pengaturan', 'Menampilkan konfigurasi aplikasi.'),
                    $this->item('view facilitator dashboard', 'Dashboard Fasilitator', 'Menampilkan area kerja fasilitator.'),
                    $this->item('see assigned classes', 'Kelas Saya', 'Menampilkan kelas yang ditugaskan ke fasilitator.'),
                    $this->item('view profile', 'Profil Saya', 'Menampilkan halaman profil pengguna.'),
                    $this->item('view notification', 'Notifikasi', 'Menampilkan notifikasi aplikasi.'),
                ],
            ],
            [
                'key' => 'buttons',
                'label' => 'Tombol & Aksi',
                'description' => 'Permission yang mengaktifkan tombol tambah, ubah, hapus, approval, upload, ekspor, dan aksi operasional.',
                'items' => [
                    $this->item('create user', 'Tambah Pengguna', 'Mengaktifkan tombol tambah pengguna.'),
                    $this->item('update user', 'Ubah Pengguna / Role', 'Mengaktifkan perubahan profil pengguna dan role.'),
                    $this->item('delete user', 'Hapus Pengguna', 'Mengaktifkan tombol hapus pengguna.'),
                    $this->item('create opd', 'Tambah OPD', 'Mengaktifkan tombol tambah OPD.'),
                    $this->item('update opd', 'Ubah OPD', 'Mengaktifkan tombol edit OPD.'),
                    $this->item('delete opd', 'Hapus OPD', 'Mengaktifkan tombol hapus OPD.'),
                    $this->item('create facilitator', 'Tambah Fasilitator', 'Mengaktifkan tombol tambah fasilitator.'),
                    $this->item('update facilitator', 'Ubah Fasilitator', 'Mengaktifkan tombol edit fasilitator.'),
                    $this->item('delete facilitator', 'Hapus Fasilitator', 'Mengaktifkan tombol hapus fasilitator.'),
                    $this->item('create training proposal', 'Buat Proposal', 'Mengaktifkan tombol pengajuan proposal.'),
                    $this->item('delete training proposal', 'Hapus Proposal', 'Mengaktifkan penghapusan proposal.'),
                    $this->item('create training event', 'Tambah Event', 'Mengaktifkan tombol tambah event.'),
                    $this->item('update training event', 'Ubah Event', 'Mengaktifkan tombol edit event.'),
                    $this->item('delete training event', 'Hapus Event', 'Mengaktifkan tombol hapus event.'),
                    $this->item('approve training event', 'Setujui Event', 'Mengaktifkan tombol approval event.'),
                    $this->item('create lms material', 'Tambah Materi LMS', 'Mengaktifkan unggah materi LMS.'),
                    $this->item('create kms asset', 'Tambah Aset KMS', 'Mengaktifkan tombol tambah aset pengetahuan.'),
                    $this->item('upload kms assets', 'Upload Aset KMS', 'Mengaktifkan unggah aset KMS.'),
                    $this->item('review kms asset', 'Review Aset KMS', 'Mengaktifkan tombol review aset KMS.'),
                    $this->item('delete kms asset', 'Hapus Aset KMS', 'Mengaktifkan tombol hapus aset KMS.'),
                    $this->item('create quiz', 'Buat Kuis', 'Mengaktifkan tombol buat kuis.'),
                    $this->item('create certificate', 'Buat Sertifikat', 'Mengaktifkan penerbitan sertifikat.'),
                    $this->item('create discussion forum', 'Buat Forum', 'Mengaktifkan pembuatan forum diskusi.'),
                    $this->item('create attendance', 'Buat Presensi', 'Mengaktifkan pembuatan presensi.'),
                    $this->item('export reports', 'Ekspor Laporan', 'Mengaktifkan tombol ekspor laporan.'),
                    $this->item('export attendance reports', 'Ekspor Presensi', 'Mengaktifkan ekspor laporan presensi.'),
                    $this->item('export participant grades', 'Ekspor Nilai', 'Mengaktifkan ekspor nilai peserta.'),
                    $this->item('approve training completion', 'Setujui Kelulusan', 'Mengaktifkan approval kelulusan peserta.'),
                ],
            ],
            [
                'key' => 'learning-operations',
                'label' => 'Operasional Pembelajaran',
                'description' => 'Permission rinci untuk fasilitator, kelas, materi, asesmen, peserta, dan komunikasi.',
                'items' => [
                    $this->item('see participant statistics', 'Statistik Peserta', 'Melihat statistik peserta.'),
                    $this->item('see training schedules', 'Jadwal Pelatihan', 'Melihat jadwal pelatihan.'),
                    $this->item('see learning analytics', 'Analitik Pembelajaran', 'Melihat analitik pembelajaran.'),
                    $this->item('view own training events', 'Event Milik Sendiri', 'Melihat event yang dikelola sendiri.'),
                    $this->item('view assigned training events', 'Event Ditugaskan', 'Melihat event yang ditugaskan.'),
                    $this->item('create learning sessions', 'Buat Sesi', 'Membuat sesi pembelajaran.'),
                    $this->item('update own learning sessions', 'Ubah Sesi Sendiri', 'Mengubah sesi milik sendiri.'),
                    $this->item('manage own class sessions', 'Kelola Sesi Kelas', 'Mengelola sesi kelas sendiri.'),
                    $this->item('manage own class modules', 'Kelola Modul Kelas', 'Mengelola modul kelas sendiri.'),
                    $this->item('manage learning schedules', 'Kelola Jadwal', 'Mengelola jadwal pembelajaran.'),
                    $this->item('manage own teaching materials', 'Kelola Materi Ajar', 'Mengelola materi ajar sendiri.'),
                    $this->item('upload learning materials', 'Upload Materi', 'Mengunggah materi pembelajaran.'),
                    $this->item('upload pdf modules', 'Upload PDF', 'Mengunggah modul PDF.'),
                    $this->item('upload videos', 'Upload Video', 'Mengunggah video pembelajaran.'),
                    $this->item('upload ppt files', 'Upload PPT', 'Mengunggah file presentasi.'),
                    $this->item('upload presentations', 'Upload Presentasi', 'Mengunggah bahan presentasi.'),
                    $this->item('create learning articles', 'Buat Artikel', 'Membuat artikel pembelajaran.'),
                    $this->item('create assignments', 'Buat Tugas', 'Membuat tugas kelas.'),
                    $this->item('manage downloadable resources', 'Kelola Lampiran', 'Mengelola sumber daya unduhan.'),
                    $this->item('create pre-test', 'Buat Pre-test', 'Membuat pre-test.'),
                    $this->item('create post-test', 'Buat Post-test', 'Membuat post-test.'),
                    $this->item('manage question banks', 'Bank Soal', 'Mengelola bank soal.'),
                    $this->item('set passing grade', 'Atur Nilai Lulus', 'Mengatur passing grade.'),
                    $this->item('grade assignments', 'Nilai Tugas', 'Menilai tugas peserta.'),
                    $this->item('review participant answers', 'Review Jawaban', 'Memeriksa jawaban peserta.'),
                    $this->item('review assignments', 'Review Tugas', 'Memeriksa tugas peserta.'),
                    $this->item('input participant grades', 'Input Nilai', 'Menginput nilai peserta.'),
                    $this->item('export participant scores', 'Ekspor Skor', 'Mengekspor skor peserta.'),
                    $this->item('manage assessments', 'Kelola Asesmen', 'Mengelola asesmen kelas.'),
                    $this->item('evaluate participants', 'Evaluasi Peserta', 'Mengevaluasi peserta.'),
                    $this->item('view participant list', 'Daftar Peserta', 'Melihat daftar peserta.'),
                    $this->item('view assigned class participants', 'Peserta Kelas', 'Melihat peserta pada kelas ditugaskan.'),
                    $this->item('monitor participant progress', 'Pantau Progres', 'Memantau progres peserta.'),
                    $this->item('monitor attendance', 'Pantau Presensi', 'Memantau presensi.'),
                    $this->item('monitor participant attendance', 'Pantau Presensi Peserta', 'Memantau presensi peserta.'),
                    $this->item('provide participant feedback', 'Umpan Balik', 'Memberikan umpan balik peserta.'),
                    $this->item('create discussion topics', 'Buat Topik Diskusi', 'Membuat topik diskusi.'),
                    $this->item('reply to discussions', 'Balas Diskusi', 'Membalas diskusi.'),
                    $this->item('create announcements', 'Buat Pengumuman', 'Membuat pengumuman.'),
                    $this->item('create assigned class announcements', 'Pengumuman Kelas', 'Membuat pengumuman kelas ditugaskan.'),
                    $this->item('communicate with participants', 'Komunikasi Peserta', 'Mengirim komunikasi ke peserta.'),
                    $this->item('recommend participant graduation', 'Rekomendasi Lulus', 'Merekomendasikan kelulusan peserta.'),
                    $this->item('export class reports', 'Ekspor Laporan Kelas', 'Mengekspor laporan kelas.'),
                    $this->item('share best practices', 'Berbagi Praktik Baik', 'Membagikan praktik baik.'),
                    $this->item('contribute institutional knowledge', 'Kontribusi Pengetahuan', 'Kontribusi pengetahuan institusi.'),
                ],
            ],
        ];
    }

    private function item(string $name, string $label, string $description): array
    {
        return compact('name', 'label', 'description');
    }

    private function permissionLabel(string $permission): string
    {
        return str($permission)
            ->replace('-', ' ')
            ->replace('_', ' ')
            ->title()
            ->toString();
    }
}
