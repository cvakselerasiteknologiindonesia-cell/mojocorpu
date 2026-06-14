<?php

namespace Database\Seeders;

use App\Models\LearningPath;
use App\Models\User;
use Illuminate\Database\Seeder;

class LearningPathSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@mojokertokab.go.id')->first();
        $createdBy = $admin?->id ?? User::first()->id;

        $paths = [
            [
                'title'           => 'Orientasi ASN Digital',
                'description'     => 'Program orientasi komprehensif untuk ASN yang baru bergabung atau ingin meningkatkan kompetensi digital. Membekali peserta dengan pemahaman tata kelola digital pemerintah, penggunaan sistem informasi, dan etika digital ASN.',
                'status'          => 'published',
                'target_role'     => 'asn',
                'estimated_hours' => 12,
                'is_sequential'   => true,
                'steps' => [
                    [
                        'title'              => 'Pengenalan Tata Kelola Digital Pemerintah',
                        'description'        => 'Memahami kerangka kerja transformasi digital pemerintah Indonesia, regulasi yang berlaku, dan peran ASN dalam ekosistem digital pelayanan publik.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 90,
                    ],
                    [
                        'title'              => 'Penggunaan Sistem Informasi Kepegawaian (SIASN)',
                        'description'        => 'Panduan praktis penggunaan SIASN untuk pengelolaan data pegawai, riwayat jabatan, dan pengajuan layanan kepegawaian secara mandiri.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 120,
                    ],
                    [
                        'title'              => 'Keamanan Informasi dan Etika Digital',
                        'description'        => 'Prinsip keamanan informasi di lingkungan pemerintahan, penanganan data pribadi, serta etika penggunaan media sosial bagi ASN.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 90,
                    ],
                    [
                        'title'              => 'Kolaborasi Digital: Microsoft 365 untuk Pemerintahan',
                        'description'        => 'Pemanfaatan Microsoft 365 (Teams, SharePoint, OneDrive) untuk rapat daring, manajemen dokumen, dan kerja kolaboratif antar OPD.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 120,
                    ],
                    [
                        'title'              => 'Simulasi dan Evaluasi Kompetensi Digital',
                        'description'        => 'Simulasi kasus nyata penggunaan sistem digital pemerintah dan evaluasi akhir untuk mengukur capaian kompetensi digital peserta.',
                        'type'               => 'training_event',
                        'is_required'        => true,
                        'estimated_minutes'  => 180,
                    ],
                ],
            ],

            [
                'title'           => 'Kepemimpinan Lapis Pertama (Pejabat Pengawas)',
                'description'     => 'Kurikulum pengembangan kompetensi kepemimpinan bagi pejabat pengawas eselon IV dan setingkat. Mencakup manajemen tim, pengambilan keputusan, komunikasi efektif, dan perencanaan kinerja berbasis hasil.',
                'status'          => 'published',
                'target_role'     => null,
                'estimated_hours' => 20,
                'is_sequential'   => true,
                'steps' => [
                    [
                        'title'              => 'Peran dan Tanggung Jawab Pejabat Pengawas',
                        'description'        => 'Memahami fungsi strategis pejabat pengawas dalam birokrasi, hubungan dengan atasan dan bawahan, serta ekspektasi kinerja jabatan.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 90,
                    ],
                    [
                        'title'              => 'Manajemen Kinerja dan SKP Berbasis Hasil',
                        'description'        => 'Penyusunan Sasaran Kinerja Pegawai (SKP) yang SMART, coaching kinerja bawahan, dan penilaian kinerja berbasis output dan outcome.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 150,
                    ],
                    [
                        'title'              => 'Komunikasi Efektif dan Pemberian Umpan Balik',
                        'description'        => 'Teknik komunikasi asertif, seni memberikan umpan balik konstruktif, dan strategi membangun kepercayaan dalam tim.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 120,
                    ],
                    [
                        'title'              => 'Pengambilan Keputusan dalam Kondisi Ketidakpastian',
                        'description'        => 'Kerangka pengambilan keputusan berbasis data, analisis risiko, dan manajemen perubahan di unit kerja.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 120,
                    ],
                    [
                        'title'              => 'Perencanaan dan Penganggaran Berbasis Kinerja',
                        'description'        => 'Praktik penyusunan rencana kerja tahunan (RKT), penyelarasan dengan RPJMD, dan pengelolaan anggaran unit kerja secara efisien.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 150,
                    ],
                    [
                        'title'              => 'Workshop: Studi Kasus Kepemimpinan Birokrasi',
                        'description'        => 'Sesi workshop interaktif membahas studi kasus kepemimpinan dari unit pemerintahan daerah, diikuti dengan presentasi dan diskusi kelompok.',
                        'type'               => 'training_event',
                        'is_required'        => true,
                        'estimated_minutes'  => 240,
                    ],
                ],
            ],

            [
                'title'           => 'Kompetensi Fasilitator Pembelajaran Orang Dewasa',
                'description'     => 'Program sertifikasi internal bagi fasilitator yang ingin meningkatkan kualitas fasilitasi pelatihan ASN. Berbasis prinsip andragogi, desain instruksional, dan evaluasi pembelajaran.',
                'status'          => 'published',
                'target_role'     => 'fasilitator-internal',
                'estimated_hours' => 16,
                'is_sequential'   => true,
                'steps' => [
                    [
                        'title'              => 'Prinsip Andragogi: Belajar Orang Dewasa',
                        'description'        => 'Teori andragogi Malcolm Knowles, perbedaan belajar orang dewasa vs anak-anak, dan implikasinya pada desain program pelatihan ASN.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 90,
                    ],
                    [
                        'title'              => 'Desain Instruksional: Model ADDIE',
                        'description'        => 'Penerapan model ADDIE (Analysis, Design, Development, Implementation, Evaluation) dalam merancang program pelatihan yang efektif dan terukur.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 120,
                    ],
                    [
                        'title'              => 'Teknik Fasilitasi Interaktif',
                        'description'        => 'Metode fasilitasi partisipatif: brainstorming, world café, fishbowl, role-play, dan cara menjaga keterlibatan peserta sepanjang sesi.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 120,
                    ],
                    [
                        'title'              => 'Penyusunan Materi Ajar Berbasis Kompetensi',
                        'description'        => 'Cara menyusun modul ajar, bahan tayang, lembar kerja peserta, dan e-learning yang selaras dengan standar kompetensi jabatan ASN.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 150,
                    ],
                    [
                        'title'              => 'Evaluasi Pembelajaran: Kirkpatrick Level 1–4',
                        'description'        => 'Merancang instrumen evaluasi reaksi, pembelajaran, perilaku, dan dampak menggunakan model Kirkpatrick untuk mengukur efektivitas pelatihan.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 120,
                    ],
                    [
                        'title'              => 'Pemanfaatan LMS dalam Pembelajaran Blended',
                        'description'        => 'Praktik penggunaan Learning Management System Corporate University: upload materi, kelola kelas, pantau progres peserta, dan analisis hasil belajar.',
                        'type'               => 'material',
                        'is_required'        => true,
                        'estimated_minutes'  => 90,
                    ],
                    [
                        'title'              => 'Micro-teaching dan Penilaian Sejawat',
                        'description'        => 'Praktik mengajar selama 15 menit di depan panel penilai, dilanjutkan umpan balik terstruktur dari sesama fasilitator dan mentor.',
                        'type'               => 'training_event',
                        'is_required'        => true,
                        'estimated_minutes'  => 180,
                    ],
                ],
            ],

            [
                'title'           => 'Manajemen Kinerja dan Budaya Pelayanan Prima',
                'description'     => 'Penguatan budaya kinerja tinggi dan pelayanan prima di lingkungan pemerintah daerah. Program ini menggabungkan teori manajemen kinerja modern dengan praktik inovasi pelayanan publik.',
                'status'          => 'published',
                'target_role'     => null,
                'estimated_hours' => 10,
                'is_sequential'   => false,
                'steps' => [
                    [
                        'title'              => 'Membangun Budaya Kinerja Tinggi',
                        'description'        => 'Elemen-elemen budaya organisasi berkinerja tinggi, peran pemimpin dalam membentuk budaya, dan cara mengukur kesehatan budaya kerja.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 120,
                    ],
                    [
                        'title'              => 'Standar Pelayanan Publik: PP 96/2012',
                        'description'        => 'Kajian mendalam Peraturan Pemerintah tentang standar pelayanan, pengelolaan pengaduan, dan mekanisme evaluasi kepuasan masyarakat.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 90,
                    ],
                    [
                        'title'              => 'Inovasi Pelayanan: Desain Berbasis Pengguna',
                        'description'        => 'Metode human-centered design untuk merancang inovasi layanan publik: empathy mapping, journey mapping, dan rapid prototyping.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 150,
                    ],
                    [
                        'title'              => 'Pengukuran Kinerja dengan Balanced Scorecard',
                        'description'        => 'Penerapan BSC dalam konteks pemerintah daerah: perspektif pelanggan, proses internal, pembelajaran, dan keuangan untuk OPD.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 120,
                    ],
                    [
                        'title'              => 'Referensi: Panduan Inovasi Pelayanan Kemenpan-RB',
                        'description'        => 'Dokumen panduan dan toolkit inovasi pelayanan publik dari Kementerian PANRB sebagai bahan referensi mandiri.',
                        'type'               => 'material',
                        'is_required'        => false,
                        'estimated_minutes'  => 60,
                    ],
                ],
            ],

            [
                'title'           => 'Literasi Data untuk Pengambilan Keputusan Berbasis Bukti',
                'description'     => 'Program pengembangan kemampuan analisis data bagi ASN non-teknis. Peserta akan mampu membaca, menginterpretasi, dan menggunakan data untuk mendukung kebijakan dan program kerja.',
                'status'          => 'draft',
                'target_role'     => null,
                'estimated_hours' => 8,
                'is_sequential'   => true,
                'steps' => [
                    [
                        'title'              => 'Pengantar Literasi Data: Mengapa Data Penting?',
                        'description'        => 'Konsep dasar data, perbedaan data, informasi, dan pengetahuan, serta contoh penggunaan data dalam kebijakan pemerintah daerah.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 60,
                    ],
                    [
                        'title'              => 'Membaca dan Menginterpretasi Grafik dan Tabel',
                        'description'        => 'Latihan praktis membaca berbagai jenis visualisasi data (bar chart, line chart, pie chart, peta) dan menghindari kesalahan interpretasi umum.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 90,
                    ],
                    [
                        'title'              => 'Open Data Pemerintah: Satu Data Indonesia',
                        'description'        => 'Navigasi portal data.go.id dan satu data daerah, cara mengakses, mengunduh, dan memvalidasi dataset publik untuk kebutuhan analisis.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 90,
                    ],
                    [
                        'title'              => 'Analisis Data Sederhana dengan Spreadsheet',
                        'description'        => 'Praktik pengolahan data menggunakan Google Sheets / Excel: pivot table, grafik dinamis, dan fungsi dasar analisis statistik deskriptif.',
                        'type'               => 'module',
                        'is_required'        => true,
                        'estimated_minutes'  => 120,
                    ],
                ],
            ],
        ];

        foreach ($paths as $pathData) {
            $steps = $pathData['steps'];
            unset($pathData['steps']);

            $path = LearningPath::updateOrCreate(
                ['title' => $pathData['title']],
                [...$pathData, 'created_by' => $createdBy]
            );

            // Replace steps each time seeder runs
            $path->steps()->delete();
            foreach ($steps as $i => $step) {
                $path->steps()->create([...$step, 'order' => $i + 1]);
            }
        }
    }
}
