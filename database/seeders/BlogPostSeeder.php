<?php

namespace Database\Seeders;

use App\Models\BlogCategory;
use App\Models\BlogPost;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class BlogPostSeeder extends Seeder
{
    public function run(): void
    {
        $author = User::query()->whereIn('email', ['admin@mojokertokab.go.id', 'superadmin@demo.test'])->first()
            ?? User::query()->first()
            ?? User::query()->create([
                'name' => 'CorpU BKPSDM Editor',
                'email' => 'corpu.editor@mojokertokab.go.id',
                'password' => Hash::make('password'),
                'user_type' => 'super_admin',
                'is_active' => true,
            ]);

        $categories = collect([
            ['name' => 'Strategi Pembelajaran', 'description' => 'Arah, desain, dan tata kelola pembelajaran ASN.'],
            ['name' => 'Transformasi Digital', 'description' => 'Pemanfaatan teknologi untuk layanan publik dan pembelajaran.'],
            ['name' => 'Kepemimpinan ASN', 'description' => 'Praktik kepemimpinan, kolaborasi, dan budaya kinerja.'],
            ['name' => 'Knowledge Sharing', 'description' => 'Cerita praktik baik dan pengetahuan antar-OPD.'],
        ])->mapWithKeys(function (array $category) {
            $model = BlogCategory::query()->updateOrCreate(
                ['slug' => Str::slug($category['name'])],
                [
                    'name' => $category['name'],
                    'description' => $category['description'],
                ]
            );

            return [$model->slug => $model];
        });

        $posts = [
            [
                'category' => 'strategi-pembelajaran',
                'title' => 'Corporate University sebagai Ruang Tumbuh Kompetensi ASN Mojokerto',
                'slug' => 'corporate-university-ruang-tumbuh-kompetensi-asn-mojokerto',
                'excerpt' => 'CorpU BKPSDM Mojokerto dirancang sebagai ekosistem pembelajaran yang menghubungkan kebutuhan organisasi, kelas, pengetahuan, dan capaian kompetensi ASN.',
                'tags' => ['corpu', 'kompetensi-asn', 'bkpsdm', 'learning-culture'],
                'published_at' => now()->subMinutes(5),
                'body' => <<<HTML
<p>Corporate University BKPSDM Kabupaten Mojokerto hadir sebagai ruang kerja pembelajaran yang menyatukan perencanaan, pelaksanaan, evaluasi, dan dokumentasi pengetahuan ASN.</p>
<h2>Belajar yang terhubung dengan kebutuhan organisasi</h2>
<p>Setiap program pembelajaran tidak berhenti pada kelas. Usulan OPD, kurasi kebutuhan kompetensi, LMS, KMS, asesmen, sertifikat, dan laporan dibaca sebagai satu siklus pengembangan kapasitas.</p>
<p>Dengan pendekatan ini, pembelajaran menjadi lebih terarah: peserta memahami tujuan, fasilitator memiliki data kelas yang rapi, dan pimpinan dapat membaca dampak program secara lebih jelas.</p>
<blockquote>CorpU bukan hanya platform, tetapi cara kerja bersama untuk memastikan kompetensi ASN tumbuh mengikuti prioritas layanan publik.</blockquote>
<h3>Fokus awal ekosistem CorpU</h3>
<ul>
<li>Menghubungkan proposal pelatihan dengan kebutuhan kompetensi OPD.</li>
<li>Menyediakan ruang belajar digital yang terdokumentasi.</li>
<li>Mendorong berbagi pengetahuan lintas perangkat daerah.</li>
<li>Menguatkan bukti capaian melalui sertifikat dan riwayat belajar.</li>
</ul>
HTML,
            ],
            [
                'category' => 'transformasi-digital',
                'title' => 'Membangun Kebiasaan Belajar Digital di Lingkungan Pemerintah Daerah',
                'slug' => 'membangun-kebiasaan-belajar-digital-pemerintah-daerah',
                'excerpt' => 'Pembelajaran digital membantu ASN mengakses materi, berdiskusi, mengerjakan asesmen, dan melacak capaian tanpa menunggu seluruh proses berlangsung secara tatap muka.',
                'tags' => ['digital-learning', 'lms', 'asn-digital', 'transformasi'],
                'published_at' => now()->subMinutes(15),
                'body' => <<<HTML
<p>Transformasi digital dalam pengembangan kompetensi tidak dimulai dari alat, melainkan dari kebiasaan belajar yang lebih terbuka, terukur, dan mudah diakses.</p>
<h2>Dari kelas satu kali menjadi perjalanan belajar</h2>
<p>Melalui LMS, peserta dapat membaca materi sebelum kelas, mengikuti aktivitas belajar, mengerjakan asesmen, dan kembali membuka bahan ajar setelah pelatihan selesai.</p>
<p>Fasilitator juga terbantu karena materi, presensi, asesmen, dan umpan balik berada dalam alur yang sama. Data kelas menjadi lebih mudah ditinjau dan digunakan untuk perbaikan program berikutnya.</p>
<h3>Praktik sederhana yang bisa dimulai</h3>
<ol>
<li>Membuka materi pengantar sebelum sesi sinkron.</li>
<li>Menggunakan forum diskusi untuk pertanyaan lanjutan.</li>
<li>Mengunggah bahan ajar yang ringkas dan mudah dicari.</li>
<li>Membaca hasil asesmen sebagai bahan coaching peserta.</li>
</ol>
HTML,
            ],
            [
                'category' => 'kepemimpinan-asn',
                'title' => 'Kepemimpinan Adaptif untuk Layanan Publik yang Lebih Responsif',
                'slug' => 'kepemimpinan-adaptif-layanan-publik-responsif',
                'excerpt' => 'Kepemimpinan adaptif menuntut ASN mampu membaca perubahan, mengelola kolaborasi, dan menjaga kualitas keputusan di tengah kebutuhan warga yang terus bergerak.',
                'tags' => ['leadership', 'pelayanan-publik', 'kolaborasi', 'asn'],
                'published_at' => now()->subMinutes(25),
                'body' => <<<HTML
<p>Pelayanan publik yang responsif membutuhkan pemimpin yang mampu menghubungkan data, empati, dan keberanian mengambil keputusan.</p>
<h2>Adaptif bukan berarti reaktif</h2>
<p>Pemimpin adaptif tidak sekadar bergerak cepat. Ia membangun ruang belajar di dalam tim, memberi konteks, dan memastikan perubahan layanan tetap berpijak pada kebutuhan masyarakat.</p>
<p>Dalam CorpU, tema kepemimpinan dapat dikembangkan melalui kelas, studi kasus, forum praktik baik, dan dokumentasi pengalaman OPD.</p>
<h3>Kompetensi yang perlu diperkuat</h3>
<ul>
<li>Komunikasi lintas fungsi.</li>
<li>Pengambilan keputusan berbasis data.</li>
<li>Manajemen perubahan dan risiko.</li>
<li>Coaching untuk peningkatan kinerja tim.</li>
</ul>
HTML,
            ],
            [
                'category' => 'knowledge-sharing',
                'title' => 'Knowledge Sharing: Mengubah Praktik Baik OPD Menjadi Aset Pembelajaran',
                'slug' => 'knowledge-sharing-praktik-baik-opd-aset-pembelajaran',
                'excerpt' => 'Praktik baik yang terdokumentasi membuat pengetahuan organisasi tidak hilang bersama pergantian tim, mutasi pegawai, atau selesainya sebuah program.',
                'tags' => ['kms', 'praktik-baik', 'opd', 'knowledge-management'],
                'published_at' => now()->subMinutes(35),
                'body' => <<<HTML
<p>Setiap OPD memiliki pengalaman berharga: cara memperbaiki proses, menangani kendala lapangan, atau menyederhanakan layanan. Tantangannya adalah menjadikannya pengetahuan yang dapat dipelajari ulang.</p>
<h2>Dari pengalaman menjadi aset</h2>
<p>KMS membantu praktik baik dikumpulkan, dikurasi, dan dibagikan. Artikel, dokumen, video singkat, dan bahan ajar dapat menjadi referensi bagi OPD lain yang menghadapi tantangan serupa.</p>
<blockquote>Pengetahuan organisasi menjadi kuat ketika pengalaman tidak hanya diceritakan, tetapi juga ditulis, dikurasi, dan digunakan kembali.</blockquote>
<h3>Format knowledge sharing yang berguna</h3>
<ul>
<li>Catatan pembelajaran dari program OPD.</li>
<li>Panduan ringkas proses layanan.</li>
<li>Template dokumen atau instrumen kerja.</li>
<li>Refleksi fasilitator setelah pelaksanaan kelas.</li>
</ul>
HTML,
            ],
        ];

        foreach ($posts as $post) {
            $category = $categories[$post['category']];

            BlogPost::query()->updateOrCreate(
                ['slug' => $post['slug']],
                [
                    'author_id' => $author->id,
                    'blog_category_id' => $category->id,
                    'title' => $post['title'],
                    'category' => $category->name,
                    'excerpt' => $post['excerpt'],
                    'featured_image' => '/images/landing-learning-room.png',
                    'tags' => $post['tags'],
                    'seo_title' => $post['title'],
                    'seo_description' => $post['excerpt'],
                    'seo_canonical_url' => url('/artikel/' . $post['slug']),
                    'seo_image' => '/images/landing-learning-room.png',
                    'body' => $post['body'],
                    'status' => 'published',
                    'published_at' => $post['published_at'],
                ]
            );
        }
    }
}
