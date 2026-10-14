<?php

namespace Database\Seeders;

use App\Models\LearningPath;
use App\Models\LearningPathEnrollment;
use App\Models\LearningPathStepProgress;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Modules\Certificate\Models\Certificate;
use Modules\Certificate\Models\CertificateTemplate;
use Modules\Facilitator\Models\Facilitator;
use Modules\OPD\Models\OPD;
use Modules\Quiz\Models\Quiz;
use Modules\Quiz\Models\QuizAttempt;
use Modules\Quiz\Models\QuizQuestion;
use Modules\TrainingEvent\Models\EventAssessment;
use Modules\TrainingEvent\Models\EventMaterial;
use Modules\TrainingEvent\Models\EventParticipant;
use Modules\TrainingEvent\Models\EventSession;
use Modules\TrainingEvent\Models\TrainingEvent;
use Modules\TrainingProposal\Models\TrainingProposal;

class DemoEndToEndSeeder extends Seeder
{
    private Carbon $baseDate;

    public function run(): void
    {
        $this->baseDate = Carbon::create(2026, 10, 13, 9, 0, 0);

        $opds = $this->seedOpds();
        $users = $this->seedUsers($opds);
        $facilitators = $this->seedFacilitators($users);
        $template = $this->seedCertificateTemplate($users['superAdmin']);
        $proposals = $this->seedTrainingProposals($opds, $users);
        $events = $this->seedTrainingEvents($proposals, $opds, $facilitators, $template);

        $this->seedEventContent($events);
        $this->seedParticipants($events, $users, $users['superAdmin']);
        $this->seedAttendance($events, $users);
        $this->seedQuizzes($events, $users);
        $this->seedCertificates($events, $users, $template);
        $this->seedLearningPathProgress($users, $template);
        $this->seedKnowledgeForumAndNotifications($events, $opds, $users);
        $this->seedGamification($users);
        $this->seedAuditAndSecurity($users, $events, $proposals);
    }

    private function seedOpds(): array
    {
        $items = [
            'bkpsdm' => ['code' => '08', 'name' => 'BADAN KEPEGAWAIAN DAN PENGEMBANGAN SUMBER DAYA MANUSIA', 'address' => 'Jl. A. Yani No. 16 Mojokerto'],
            'dindik' => ['code' => '10', 'name' => 'DINAS PENDIDIKAN KABUPATEN MOJOKERTO', 'address' => 'Jl. RA Basuni No. 33 Mojokerto'],
            'dinkes' => ['code' => '11', 'name' => 'DINAS KESEHATAN KABUPATEN MOJOKERTO', 'address' => 'Jl. RA Basuni No. 4 Mojokerto'],
            'diskominfo' => ['code' => '12', 'name' => 'DINAS KOMUNIKASI DAN INFORMATIKA KABUPATEN MOJOKERTO', 'address' => 'Jl. A. Yani No. 16 Mojokerto'],
        ];

        $opds = [];
        foreach ($items as $key => $item) {
            $opds[$key] = OPD::query()->updateOrCreate(
                ['code' => $item['code']],
                [
                    'name' => $item['name'],
                    'address' => $item['address'],
                    'phone' => '0321-321000',
                    'email' => strtolower($key) . '@mojokertokab.go.id',
                    'is_active' => true,
                ]
            );
        }

        return $opds;
    }

    private function seedUsers(array $opds): array
    {
        $definitions = [
            'superAdmin' => [
                'role' => 'super-admin',
                'email' => 'superadmin@demo.test',
                'nip' => null,
                'name' => 'Demo Super Admin Corporate University',
                'opd' => 'bkpsdm',
                'position' => 'Administrator Sistem Corporate University',
                'user_type' => 'super_admin',
            ],
            'adminBkpsdm' => [
                'role' => 'admin-opd',
                'email' => 'admin.bkpsdm@demo.test',
                'nip' => '197701012001121001',
                'name' => 'Demo Admin OPD BKPSDM',
                'opd' => 'bkpsdm',
                'position' => 'Analis Pengembangan Kompetensi',
                'user_type' => 'asn',
            ],
            'adminDinkes' => [
                'role' => 'admin-opd',
                'email' => 'admin.dinkes@demo.test',
                'nip' => '197902022003121002',
                'name' => 'Demo Admin OPD Dinas Kesehatan',
                'opd' => 'dinkes',
                'position' => 'Analis SDM Aparatur',
                'user_type' => 'asn',
            ],
            'asnLulus' => [
                'role' => 'asn',
                'email' => 'asn.lulus@demo.test',
                'nip' => '198909102020121001',
                'name' => 'Demo ASN Lulus Sertifikat',
                'opd' => 'dindik',
                'position' => 'Analis Kebijakan Pendidikan',
                'user_type' => 'asn',
            ],
            'asnProgres' => [
                'role' => 'asn',
                'email' => 'asn.progres@demo.test',
                'nip' => '199105112019031002',
                'name' => 'Demo ASN Sedang Belajar',
                'opd' => 'diskominfo',
                'position' => 'Pranata Komputer Pertama',
                'user_type' => 'asn',
            ],
            'asnTidakLulus' => [
                'role' => 'asn',
                'email' => 'asn.tidaklulus@demo.test',
                'nip' => '198604032014021003',
                'name' => 'Demo ASN Tidak Lulus',
                'opd' => 'dinkes',
                'position' => 'Pranata Kesehatan Masyarakat',
                'user_type' => 'asn',
            ],
            'asnBelumMulai' => [
                'role' => 'asn',
                'email' => 'asn.belummulai@demo.test',
                'nip' => '199407172022012010',
                'name' => 'Demo ASN Belum Mulai',
                'opd' => 'dindik',
                'position' => 'Pengelola Data Pendidikan',
                'user_type' => 'asn',
            ],
            'fasilitatorInternal' => [
                'role' => 'fasilitator-internal',
                'email' => 'fasilitator.internal@demo.test',
                'nip' => '198201012010011001',
                'name' => 'Demo Fasilitator Internal',
                'opd' => 'bkpsdm',
                'position' => 'Widyaiswara Ahli Muda',
                'user_type' => 'asn',
            ],
            'fasilitatorEksternal' => [
                'role' => 'fasilitator-eksternal',
                'email' => 'fasilitator.eksternal@demo.test',
                'nip' => null,
                'name' => 'Demo Fasilitator Eksternal',
                'opd' => null,
                'position' => 'Konsultan Komunikasi Publik',
                'user_type' => 'external',
            ],
        ];

        $users = [];
        foreach ($definitions as $key => $definition) {
            $opd = $definition['opd'] ? $opds[$definition['opd']] : null;
            $lookup = $definition['nip'] ? ['nip' => $definition['nip']] : ['email' => $definition['email']];

            $user = User::query()->updateOrCreate($lookup, [
                'sso_user_id' => $definition['nip'] ? 'SSO-DEMO-' . $definition['nip'] : null,
                'name' => $definition['name'],
                'email' => $definition['email'],
                'password' => Hash::make('password'),
                'opd_id' => $opd?->id,
                'opd_name' => $opd?->name,
                'organization_unit_name' => $opd ? 'Unit Pengembangan Kompetensi' : null,
                'position_name' => $definition['position'],
                'employee_status' => $definition['user_type'] === 'external' ? 'Non ASN' : 'PNS',
                'user_type' => $definition['user_type'],
                'is_active' => true,
                'last_login_at' => $this->baseDate->copy()->subHours(rand(2, 72)),
            ]);

            $user->syncRoles([$definition['role']]);
            $users[$key] = $user;
        }

        return $users;
    }

    private function seedFacilitators(array $users): array
    {
        $internal = Facilitator::query()->updateOrCreate(
            ['user_id' => $users['fasilitatorInternal']->id],
            [
                'facilitator_type' => 'internal',
                'institution' => 'BKPSDM Kabupaten Mojokerto',
                'expertise' => 'Desain Pembelajaran, LMS, Evaluasi Kompetensi',
                'bio' => 'Fasilitator internal untuk demo kelas Corporate University dari perencanaan sampai kelulusan.',
                'status' => 'active',
            ]
        );

        $external = Facilitator::query()->updateOrCreate(
            ['user_id' => $users['fasilitatorEksternal']->id],
            [
                'facilitator_type' => 'external',
                'institution' => 'Mitra Profesional Indonesia',
                'expertise' => 'Komunikasi Publik, Kolaborasi Digital',
                'bio' => 'Fasilitator eksternal untuk demo kelas tematik dan laporan kelas.',
                'status' => 'active',
            ]
        );

        $users['fasilitatorInternal']->syncRoles(['fasilitator-internal']);
        $users['fasilitatorEksternal']->syncRoles(['fasilitator-eksternal']);

        return ['internal' => $internal, 'external' => $external];
    }

    private function seedCertificateTemplate(User $admin): CertificateTemplate
    {
        return CertificateTemplate::query()->updateOrCreate(
            ['name' => 'Template Demo Sertifikat Corporate University'],
            [
                'created_by' => $admin->id,
                'description' => 'Template demo untuk penerbitan sertifikat pelatihan dan learning path.',
                'paper_size' => 'a4',
                'orientation' => 'landscape',
                'background_color' => '#ffffff',
                'accent_color' => '#0f766e',
                'text_color' => '#111827',
                'font_family' => 'Inter',
                'signature_name' => 'Kepala BKPSDM Kabupaten Mojokerto',
                'signature_title' => 'Corporate University',
                'body_template' => 'Diberikan kepada {{ participant_name }} atas penyelesaian program {{ program_title }}.',
                'footer_text' => 'Sertifikat ini dapat diverifikasi melalui token verifikasi sistem.',
                'layout' => [
                    'title' => ['x' => 50, 'y' => 80],
                    'participant' => ['x' => 50, 'y' => 160],
                    'signature' => ['x' => 650, 'y' => 420],
                ],
                'is_default' => true,
                'is_active' => true,
            ]
        );
    }

    private function seedTrainingProposals(array $opds, array $users): array
    {
        $items = [
            'approvedDigital' => [
                'opd' => 'bkpsdm',
                'title' => 'Program Penguatan Kompetensi ASN Digital',
                'description' => 'Usulan utama untuk demo alur pelatihan ASN digital dari proposal, kelas, presensi, asesmen, sampai sertifikat.',
                'recommendation' => 'Disetujui untuk pelaksanaan blended learning lintas OPD.',
                'proposed_by' => 'adminBkpsdm',
                'status' => 'approved',
            ],
            'submittedLiteracy' => [
                'opd' => 'dindik',
                'title' => 'Pelatihan Literasi Data untuk Perencana OPD',
                'description' => 'Usulan baru yang masih menunggu review Super Admin.',
                'recommendation' => null,
                'proposed_by' => 'adminBkpsdm',
                'status' => 'submitted',
            ],
            'revisionRisk' => [
                'opd' => 'dinkes',
                'title' => 'Pelatihan Manajemen Risiko Layanan Kesehatan',
                'description' => 'Usulan perlu perbaikan karena sasaran peserta dan indikator keberhasilan belum spesifik.',
                'recommendation' => 'Mohon lengkapi sasaran peserta, indikator keberhasilan, dan kebutuhan fasilitator.',
                'proposed_by' => 'adminDinkes',
                'status' => 'revision',
            ],
            'rejectedProtocol' => [
                'opd' => 'diskominfo',
                'title' => 'Pelatihan Protokoler Non Prioritas',
                'description' => 'Contoh usulan yang ditolak karena tidak selaras dengan prioritas kompetensi tahun berjalan.',
                'recommendation' => 'Ditolak. Topik belum masuk prioritas kompetensi Corporate University 2026.',
                'proposed_by' => 'adminBkpsdm',
                'status' => 'rejected',
            ],
        ];

        $proposals = [];
        foreach ($items as $key => $item) {
            $proposals[$key] = TrainingProposal::query()->updateOrCreate(
                ['title' => $item['title']],
                [
                    'opd_id' => $opds[$item['opd']]->id,
                    'description' => $item['description'],
                    'recommendation' => $item['recommendation'],
                    'proposed_by' => $users[$item['proposed_by']]->id,
                    'status' => $item['status'],
                ]
            );
        }

        return $proposals;
    }

    private function seedTrainingEvents(array $proposals, array $opds, array $facilitators, CertificateTemplate $template): array
    {
        $items = [
            'completed' => [
                'title' => 'Kelas Selesai: ASN Digital Dasar',
                'description' => 'Kelas demo yang sudah selesai untuk menampilkan presensi lengkap, nilai akhir, kelulusan, sertifikat, token, dan laporan.',
                'facilitator' => 'internal',
                'start' => $this->baseDate->copy()->subDays(21)->setTime(8, 30),
                'end' => $this->baseDate->copy()->subDays(19)->setTime(15, 30),
                'quota' => 32,
                'status' => 'completed',
                'location' => 'Ruang Belajar BKPSDM dan LMS Corporate University',
                'is_paid' => false,
                'price' => null,
                'target_all_opds' => true,
            ],
            'active' => [
                'title' => 'Kelas Berjalan: Desain Pembelajaran ASN Digital',
                'description' => 'Kelas demo yang sedang berjalan untuk fasilitator internal: materi, forum, presensi hari ini, dan asesmen yang belum seluruhnya selesai.',
                'facilitator' => 'internal',
                'start' => $this->baseDate->copy()->subDay()->setTime(9, 0),
                'end' => $this->baseDate->copy()->addDay()->setTime(15, 0),
                'quota' => 28,
                'status' => 'active',
                'location' => 'Blended - BKPSDM dan Zoom',
                'is_paid' => false,
                'price' => null,
                'target_all_opds' => false,
            ],
            'scheduled' => [
                'title' => 'Kelas Mendatang: Komunikasi Publik Digital',
                'description' => 'Kelas fasilitator eksternal untuk menampilkan jadwal mendatang, pendaftaran peserta, dan target OPD tertentu.',
                'facilitator' => 'external',
                'start' => $this->baseDate->copy()->addDays(7)->setTime(9, 0),
                'end' => $this->baseDate->copy()->addDays(8)->setTime(15, 30),
                'quota' => 24,
                'status' => 'scheduled',
                'location' => 'Ruang Command Center Diskominfo',
                'is_paid' => true,
                'price' => 250000,
                'target_all_opds' => false,
            ],
        ];

        $events = [];
        foreach ($items as $key => $item) {
            $events[$key] = TrainingEvent::query()->updateOrCreate(
                ['title' => $item['title']],
                [
                    'training_proposal_id' => $proposals['approvedDigital']->id,
                    'description' => $item['description'],
                    'location' => $item['location'],
                    'facilitator_id' => $facilitators[$item['facilitator']]->id,
                    'start_date' => $item['start'],
                    'end_date' => $item['end'],
                    'quota' => $item['quota'],
                    'is_paid' => $item['is_paid'],
                    'price' => $item['price'],
                    'status' => $item['status'],
                    'banner_image' => 'demo/training-events/' . $key . '.jpg',
                    'certificate_template_id' => $template->id,
                    'target_all_opds' => $item['target_all_opds'],
                ]
            );

            $events[$key]->facilitators()->syncWithoutDetaching([$facilitators[$item['facilitator']]->id]);
        }

        $events['active']->targetOpds()->sync([$opds['bkpsdm']->id, $opds['dindik']->id, $opds['diskominfo']->id]);
        $events['scheduled']->targetOpds()->sync([$opds['diskominfo']->id, $opds['dinkes']->id]);

        return $events;
    }

    private function seedEventContent(array $events): void
    {
        foreach ($events as $key => $event) {
            $sessionDates = [
                $event->start_date->copy(),
                $event->start_date->copy()->addDay(),
                $event->end_date->copy()->setTime(9, 0),
            ];

            foreach ($sessionDates as $index => $date) {
                EventSession::query()->updateOrCreate(
                    ['training_event_id' => $event->id, 'order' => $index + 1],
                    [
                        'title' => ['Orientasi dan Pre-Test', 'Praktik Terbimbing', 'Post-Test dan Rencana Tindak Lanjut'][$index],
                        'description' => 'Sesi demo ' . ($index + 1) . ' untuk ' . $event->title,
                        'start_date' => $date,
                        'end_date' => $date->copy()->addHours($index === 2 ? 4 : 6),
                        'duration_minutes' => $index === 2 ? 240 : 360,
                        'status' => $event->status === 'completed' ? 'completed' : ($index === 0 ? 'active' : 'draft'),
                    ]
                );
            }

            foreach ([
                ['order' => 1, 'title' => 'Modul Pengantar Kompetensi ASN Digital', 'type' => 'document', 'duration' => 45],
                ['order' => 2, 'title' => 'Video Studi Kasus Transformasi Layanan', 'type' => 'video', 'duration' => 30],
                ['order' => 3, 'title' => 'Template Rencana Tindak Lanjut', 'type' => 'presentation', 'duration' => 60],
            ] as $material) {
                EventMaterial::query()->updateOrCreate(
                    ['training_event_id' => $event->id, 'order' => $material['order']],
                    [
                        'title' => $material['title'],
                        'type' => $material['type'],
                        'url' => 'https://example.test/corpu/' . Str::slug($event->title) . '/' . $material['order'],
                        'file_path' => 'demo/materials/' . $key . '-' . $material['order'] . '.pdf',
                        'description' => 'Materi demo untuk mendukung proses pembelajaran peserta.',
                        'duration_minutes' => $material['duration'],
                    ]
                );
            }

            foreach ([
                ['type' => 'pre_test', 'title' => 'Pre-Test Kompetensi Awal', 'passing' => 60],
                ['type' => 'post_test', 'title' => 'Post-Test Kompetensi Akhir', 'passing' => 75],
                ['type' => 'assignment', 'title' => 'Tugas Praktik Rencana Aksi', 'passing' => 70],
            ] as $assessmentItem) {
                $assessment = EventAssessment::query()->updateOrCreate(
                    ['training_event_id' => $event->id, 'type' => $assessmentItem['type']],
                    [
                        'title' => $assessmentItem['title'],
                        'instructions' => 'Kerjakan asesmen demo sesuai instruksi fasilitator.',
                        'passing_score' => $assessmentItem['passing'],
                        'time_limit_minutes' => $assessmentItem['type'] === 'assignment' ? null : 45,
                        'status' => $event->status === 'scheduled' ? 'draft' : 'published',
                        'bank_draw_count' => 3,
                    ]
                );

                $this->seedAssessmentQuestions($assessment);
            }
        }
    }

    private function seedAssessmentQuestions(EventAssessment $assessment): void
    {
        $questions = [
            ['order' => 1, 'question' => 'Apa tujuan utama Corporate University?', 'answer' => 'Menghubungkan kebutuhan organisasi dengan pengembangan kompetensi ASN'],
            ['order' => 2, 'question' => 'Data apa yang dapat digunakan untuk menilai kelulusan?', 'answer' => 'Presensi, progres materi, nilai asesmen, dan evaluasi fasilitator'],
            ['order' => 3, 'question' => 'Apa manfaat KMS dalam proses pembelajaran?', 'answer' => 'Menyimpan dan membagikan aset pengetahuan yang dapat digunakan ulang'],
        ];

        foreach ($questions as $question) {
            DB::table('assessment_questions')->updateOrInsert(
                ['event_assessment_id' => $assessment->id, 'order' => $question['order']],
                [
                    'question' => $question['question'],
                    'type' => 'multiple_choice',
                    'options' => json_encode([
                        $question['answer'],
                        'Menghapus seluruh proses manual tanpa review',
                        'Membatasi peserta hanya dari satu jabatan',
                        'Mengganti seluruh laporan dengan forum diskusi',
                    ]),
                    'correct_answer' => $question['answer'],
                    'points' => 1,
                    'in_bank' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    private function seedParticipants(array $events, array $users, User $approver): void
    {
        $participants = [
            'completed' => [
                'asnLulus' => ['status' => 'completed', 'completion_status' => 'approved', 'completed_at' => $events['completed']->end_date, 'approved_by' => $approver->id, 'approved_at' => $events['completed']->end_date->copy()->addHours(2), 'rejection_reason' => null],
                'asnTidakLulus' => ['status' => 'completed', 'completion_status' => 'rejected', 'completed_at' => $events['completed']->end_date, 'approved_by' => $approver->id, 'approved_at' => $events['completed']->end_date->copy()->addHours(2), 'rejection_reason' => 'Nilai post-test dan kehadiran belum memenuhi syarat kelulusan.'],
                'asnProgres' => ['status' => 'completed', 'completion_status' => 'approved', 'completed_at' => $events['completed']->end_date, 'approved_by' => $approver->id, 'approved_at' => $events['completed']->end_date->copy()->addHours(2), 'rejection_reason' => null],
            ],
            'active' => [
                'asnLulus' => ['status' => 'enrolled', 'completion_status' => 'pending', 'completed_at' => null, 'approved_by' => null, 'approved_at' => null, 'rejection_reason' => null],
                'asnProgres' => ['status' => 'enrolled', 'completion_status' => 'pending', 'completed_at' => null, 'approved_by' => null, 'approved_at' => null, 'rejection_reason' => null],
                'asnBelumMulai' => ['status' => 'enrolled', 'completion_status' => 'pending', 'completed_at' => null, 'approved_by' => null, 'approved_at' => null, 'rejection_reason' => null],
            ],
            'scheduled' => [
                'asnProgres' => ['status' => 'enrolled', 'completion_status' => 'pending', 'completed_at' => null, 'approved_by' => null, 'approved_at' => null, 'rejection_reason' => null],
                'asnTidakLulus' => ['status' => 'enrolled', 'completion_status' => 'pending', 'completed_at' => null, 'approved_by' => null, 'approved_at' => null, 'rejection_reason' => null],
            ],
        ];

        foreach ($participants as $eventKey => $eventParticipants) {
            foreach ($eventParticipants as $userKey => $data) {
                EventParticipant::query()->updateOrCreate(
                    ['training_event_id' => $events[$eventKey]->id, 'user_id' => $users[$userKey]->id],
                    array_merge($data, [
                        'enrolled_at' => $events[$eventKey]->start_date->copy()->subDays(3),
                    ])
                );
            }
        }
    }

    private function seedAttendance(array $events, array $users): void
    {
        foreach (['completed', 'active'] as $eventKey) {
            $event = $events[$eventKey]->load('sessions');
            foreach ($event->sessions as $index => $session) {
                foreach (['asnLulus', 'asnProgres', 'asnTidakLulus'] as $userKey) {
                    if ($eventKey === 'active' && $index > 0) {
                        continue;
                    }

                    if ($userKey === 'asnTidakLulus' && $index === 2) {
                        continue;
                    }

                    DB::table('session_attendances')->updateOrInsert(
                        ['event_session_id' => $session->id, 'user_id' => $users[$userKey]->id],
                        [
                            'checked_in_at' => $session->start_date?->copy()->addMinutes($userKey === 'asnProgres' ? 15 : 0) ?? now(),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]
                    );

                    if ($index === 0) {
                        DB::table('attendance_records')->updateOrInsert(
                            ['training_event_id' => $event->id, 'user_id' => $users[$userKey]->id],
                            [
                                'uuid' => (string) Str::uuid(),
                                'checked_in_at' => $session->start_date?->copy()->addMinutes($userKey === 'asnProgres' ? 15 : 0),
                                'status' => $userKey === 'asnProgres' ? 'late' : 'present',
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]
                        );
                    }
                }
            }
        }

        DB::table('attendance_records')->updateOrInsert(
            ['training_event_id' => $events['completed']->id, 'user_id' => $users['asnTidakLulus']->id],
            [
                'uuid' => (string) Str::uuid(),
                'checked_in_at' => $events['completed']->end_date->copy(),
                'status' => 'absent',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    private function seedQuizzes(array $events, array $users): void
    {
        foreach (['completed', 'active'] as $eventKey) {
            foreach (['pre-test' => 60, 'post-test' => 75] as $type => $passingScore) {
                $quiz = Quiz::query()->updateOrCreate(
                    ['training_event_id' => $events[$eventKey]->id, 'quiz_type' => $type],
                    [
                        'title' => Str::headline($type) . ' - ' . $events[$eventKey]->title,
                        'passing_score' => $passingScore,
                    ]
                );

                $questions = [
                    ['question' => 'Apa singkatan LMS?', 'correct_answer' => 'Learning Management System'],
                    ['question' => 'Siapa yang dapat memantau kelas?', 'correct_answer' => 'Fasilitator dan pengelola berwenang'],
                    ['question' => 'Kapan sertifikat diterbitkan?', 'correct_answer' => 'Setelah peserta memenuhi syarat kelulusan'],
                ];

                foreach ($questions as $index => $question) {
                    QuizQuestion::query()->updateOrCreate(
                        ['quiz_id' => $quiz->id, 'question' => $question['question']],
                        [
                            'options' => [$question['correct_answer'], 'Sebelum login', 'Tanpa presensi', 'Tanpa asesmen'],
                            'correct_answer' => $question['correct_answer'],
                            'score' => 1,
                        ]
                    );
                }

                $scores = $eventKey === 'completed'
                    ? ['asnLulus' => 92, 'asnProgres' => 80, 'asnTidakLulus' => 48]
                    : ['asnLulus' => 88, 'asnProgres' => 65];

                foreach ($scores as $userKey => $score) {
                    QuizAttempt::query()->updateOrCreate(
                        ['quiz_id' => $quiz->id, 'user_id' => $users[$userKey]->id],
                        [
                            'score' => $score,
                            'answers' => ['q1' => 'Learning Management System', 'q2' => 'Fasilitator dan pengelola berwenang'],
                            'submitted_at' => $events[$eventKey]->start_date->copy()->addHours($type === 'pre-test' ? 1 : 48),
                        ]
                    );
                }
            }

            foreach ($events[$eventKey]->assessments as $assessment) {
                $scores = $eventKey === 'completed'
                    ? ['asnLulus' => 90, 'asnProgres' => 78, 'asnTidakLulus' => 45]
                    : ['asnLulus' => 82, 'asnProgres' => 62];

                foreach ($scores as $userKey => $score) {
                    DB::table('assessment_submissions')->updateOrInsert(
                        ['event_assessment_id' => $assessment->id, 'user_id' => $users[$userKey]->id],
                        [
                            'answers' => json_encode(['demo' => 'Jawaban asesmen demo']),
                            'score' => $score,
                            'is_passed' => $score >= $assessment->passing_score,
                            'submitted_at' => $events[$eventKey]->start_date->copy()->addHours(2),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]
                    );
                }
            }
        }
    }

    private function seedCertificates(array $events, array $users, CertificateTemplate $template): void
    {
        foreach (['asnLulus', 'asnProgres'] as $index => $userKey) {
            Certificate::query()->updateOrCreate(
                [
                    'user_id' => $users[$userKey]->id,
                    'training_event_id' => $events['completed']->id,
                ],
                [
                    'certificate_template_id' => $template->id,
                    'certificate_number' => 'CERT-CU-2026-' . str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT),
                    'verification_token' => hash('sha256', 'demo-event-certificate-' . $userKey),
                    'file_path' => 'certificates/demo/' . $userKey . '.pdf',
                    'issued_at' => $events['completed']->end_date->copy()->addDay(),
                ]
            );
        }
    }

    private function seedLearningPathProgress(array $users, CertificateTemplate $template): void
    {
        $path = LearningPath::query()->where('title', 'Orientasi ASN Digital')->first();
        if (! $path) {
            return;
        }

        $path->update(['certificate_template_id' => $template->id]);
        $steps = $path->steps()->orderBy('order')->get();

        $progress = [
            'asnLulus' => $steps->count(),
            'asnProgres' => max(1, (int) floor($steps->count() / 2)),
            'asnBelumMulai' => 0,
        ];

        foreach ($progress as $userKey => $completedSteps) {
            $enrollment = LearningPathEnrollment::query()->updateOrCreate(
                ['learning_path_id' => $path->id, 'user_id' => $users[$userKey]->id],
                [
                    'enrolled_at' => $this->baseDate->copy()->subDays(14),
                    'completed_at' => $completedSteps === $steps->count() ? $this->baseDate->copy()->subDays(1) : null,
                ]
            );

            foreach ($steps->take($completedSteps) as $step) {
                LearningPathStepProgress::query()->updateOrCreate(
                    ['enrollment_id' => $enrollment->id, 'step_id' => $step->id],
                    ['completed_at' => $this->baseDate->copy()->subDays(max(1, $steps->count() - $step->order))]
                );
            }

            if ($completedSteps === $steps->count()) {
                Certificate::query()->updateOrCreate(
                    ['user_id' => $users[$userKey]->id, 'learning_path_id' => $path->id],
                    [
                        'training_event_id' => null,
                        'certificate_template_id' => $template->id,
                        'certificate_number' => 'CERT-LP-2026-0001',
                        'verification_token' => hash('sha256', 'demo-learning-path-certificate-' . $userKey),
                        'file_path' => 'certificates/demo/learning-path-' . $userKey . '.pdf',
                        'issued_at' => $this->baseDate->copy()->subDay(),
                    ]
                );
            }
        }
    }

    private function seedKnowledgeForumAndNotifications(array $events, array $opds, array $users): void
    {
        $categoryId = DB::table('kms_categories')->where('slug', 'teknologi-informasi')->value('id')
            ?? DB::table('kms_categories')->value('id');

        $assets = [
            ['title' => 'Panduan Penyusunan Rencana Tindak Lanjut Pelatihan', 'visibility' => 'internal', 'scope' => 'all', 'user' => 'fasilitatorInternal'],
            ['title' => 'Praktik Baik Layanan Digital OPD', 'visibility' => 'internal', 'scope' => 'selected', 'user' => 'adminBkpsdm'],
            ['title' => 'Draft Modul Literasi Data OPD', 'visibility' => 'private', 'scope' => 'selected', 'user' => 'adminDinkes'],
        ];

        foreach ($assets as $asset) {
            DB::table('kms_assets')->updateOrInsert(
                ['title' => $asset['title']],
                [
                    'uuid' => (string) Str::uuid(),
                    'opd_id' => $users[$asset['user']]->opd_id,
                    'category_id' => $categoryId,
                    'description' => 'Aset pengetahuan demo untuk memperlihatkan KMS dan kontribusi antar role.',
                    'file_path' => 'kms/demo/' . Str::slug($asset['title']) . '.pdf',
                    'uploaded_by' => $users[$asset['user']]->id,
                    'visibility' => $asset['visibility'],
                    'internal_scope' => $asset['scope'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            $assetId = DB::table('kms_assets')->where('title', $asset['title'])->value('id');
            DB::table('kms_asset_sources')->updateOrInsert(
                ['kms_asset_id' => $assetId, 'sort_order' => 1],
                [
                    'file_path' => 'https://example.test/kms/' . Str::slug($asset['title']),
                    'source_type' => 'url',
                    'original_name' => $asset['title'] . '.pdf',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            if ($asset['scope'] === 'selected') {
                DB::table('kms_asset_opd')->updateOrInsert(
                    ['kms_asset_id' => $assetId, 'opd_id' => $opds['dinkes']->id],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        $threadId = $this->upsertReturningId('discussion_threads', ['title' => 'Tanya Jawab Kelas ASN Digital Dasar'], [
            'uuid' => (string) Str::uuid(),
            'training_event_id' => $events['completed']->id,
            'created_by' => $users['fasilitatorInternal']->id,
            'body' => 'Silakan tuliskan pertanyaan dan refleksi setelah menyelesaikan materi ASN Digital Dasar.',
            'status' => 'open',
        ]);

        foreach ([
            ['user' => 'asnLulus', 'body' => 'Materi rencana tindak lanjut membantu saya menyusun aksi pascapelatihan.'],
            ['user' => 'asnProgres', 'body' => 'Apakah template RTL bisa digunakan untuk laporan OPD?'],
            ['user' => 'fasilitatorInternal', 'body' => 'Bisa. Silakan sesuaikan indikator dan target layanan OPD masing-masing.'],
        ] as $comment) {
            DB::table('discussion_comments')->updateOrInsert(
                ['thread_id' => $threadId, 'user_id' => $users[$comment['user']]->id, 'body' => $comment['body']],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }

        foreach ([
            ['user' => 'adminBkpsdm', 'title' => 'Proposal disetujui', 'message' => 'Program Penguatan Kompetensi ASN Digital sudah disetujui.'],
            ['user' => 'fasilitatorInternal', 'title' => 'Kelas aktif', 'message' => 'Kelas Berjalan: Desain Pembelajaran ASN Digital memiliki peserta baru.'],
            ['user' => 'asnLulus', 'title' => 'Sertifikat terbit', 'message' => 'Sertifikat Kelas ASN Digital Dasar sudah tersedia.'],
            ['user' => 'asnProgres', 'title' => 'Kelas mendatang', 'message' => 'Anda terdaftar pada Kelas Mendatang: Komunikasi Publik Digital.'],
        ] as $notification) {
            DB::table('app_notifications')->updateOrInsert(
                ['user_id' => $users[$notification['user']]->id, 'title' => $notification['title']],
                [
                    'uuid' => (string) Str::uuid(),
                    'message' => $notification['message'],
                    'channel' => 'in-app',
                    'read_at' => $notification['user'] === 'asnLulus' ? now()->subHours(2) : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    private function seedGamification(array $users): void
    {
        $badgeIds = DB::table('badges')
            ->whereIn('slug', ['first-submission', 'score-90', 'tokens-100'])
            ->pluck('id', 'slug');

        foreach (['asnLulus', 'asnProgres'] as $userKey) {
            $balance = $userKey === 'asnLulus' ? 180 : 75;
            $walletId = $this->upsertReturningId('wallets', ['user_id' => $users[$userKey]->id], ['balance' => $balance]);

            DB::table('wallet_transactions')->updateOrInsert(
                ['wallet_id' => $walletId, 'description' => 'Reward penyelesaian aktivitas demo Corporate University'],
                [
                    'type' => 'credit',
                    'amount' => $balance,
                    'balance_after' => $balance,
                    'reference_type' => 'demo_seed',
                    'reference_id' => $users[$userKey]->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            foreach ($badgeIds as $badgeId) {
                DB::table('user_badges')->updateOrInsert(
                    ['user_id' => $users[$userKey]->id, 'badge_id' => $badgeId],
                    ['awarded_at' => now()->subDays($userKey === 'asnLulus' ? 2 : 1), 'created_at' => now(), 'updated_at' => now()]
                );
            }

            DB::table('user_streaks')->updateOrInsert(
                ['user_id' => $users[$userKey]->id],
                [
                    'current_streak' => $userKey === 'asnLulus' ? 7 : 3,
                    'longest_streak' => $userKey === 'asnLulus' ? 12 : 4,
                    'last_activity_date' => $this->baseDate->toDateString(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $itemId = $this->upsertReturningId('store_items', ['name' => 'Voucher E-Book Kepemimpinan ASN'], [
            'uuid' => (string) Str::uuid(),
            'description' => 'Item demo store yang dapat ditukar menggunakan token pembelajaran.',
            'type' => 'content',
            'price' => 100,
            'stock' => 25,
            'image_path' => 'store/demo/ebook-kepemimpinan.png',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        DB::table('store_purchases')->updateOrInsert(
            ['user_id' => $users['asnLulus']->id, 'store_item_id' => $itemId],
            [
                'uuid' => (string) Str::uuid(),
                'tokens_spent' => 100,
                'status' => 'fulfilled',
                'note' => 'Demo penukaran token berhasil.',
                'fulfilled_at' => now()->subDay(),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    private function seedAuditAndSecurity(array $users, array $events, array $proposals): void
    {
        foreach ([
            ['description' => 'Demo Super Admin menyetujui proposal pelatihan', 'subject' => $proposals['approvedDigital'], 'event' => 'approved'],
            ['description' => 'Demo Fasilitator memperbarui materi kelas', 'subject' => $events['active'], 'event' => 'updated'],
            ['description' => 'Demo sertifikat peserta diterbitkan', 'subject' => $events['completed'], 'event' => 'certificate_issued'],
        ] as $log) {
            DB::table('activity_log')->updateOrInsert(
                ['description' => $log['description'], 'event' => $log['event']],
                [
                    'log_name' => 'demo',
                    'subject_type' => get_class($log['subject']),
                    'subject_id' => $log['subject']->id,
                    'causer_type' => User::class,
                    'causer_id' => $users['superAdmin']->id,
                    'properties' => json_encode(['source' => 'DemoEndToEndSeeder']),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        foreach ([
            ['user' => 'superAdmin', 'ip' => '103.10.20.10', 'success' => true, 'reason' => null],
            ['user' => null, 'ip' => '198.51.100.23', 'success' => false, 'reason' => 'Invalid password'],
            ['user' => null, 'ip' => '198.51.100.23', 'success' => false, 'reason' => 'Too many attempts'],
        ] as $attempt) {
            DB::table('login_attempts')->updateOrInsert(
                ['ip_address' => $attempt['ip'], 'identifier' => $attempt['user'] ? $users[$attempt['user']]->email : 'unknown@demo.test', 'failure_reason' => $attempt['reason']],
                [
                    'user_id' => $attempt['user'] ? $users[$attempt['user']]->id : null,
                    'user_agent' => 'Demo Browser',
                    'success' => $attempt['success'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        DB::table('suspicious_requests')->updateOrInsert(
            ['ip_address' => '198.51.100.23', 'path' => '/admin/users?id=1 OR 1=1'],
            [
                'method' => 'GET',
                'user_agent' => 'Demo Scanner',
                'attack_type' => 'sql_injection',
                'severity' => 'high',
                'pattern_matched' => 'OR 1=1',
                'payload_snippet' => 'id=1 OR 1=1',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::table('security_events')->updateOrInsert(
            ['type' => 'brute_force_login', 'ip_address' => '198.51.100.23'],
            [
                'severity' => 'high',
                'user_id' => null,
                'description' => 'Demo event: beberapa percobaan login gagal dari IP yang sama.',
                'metadata' => json_encode(['attempts' => 5, 'window_minutes' => 10]),
                'resolved' => false,
                'resolved_at' => null,
                'resolved_by' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::table('blocked_ips')->updateOrInsert(
            ['ip_address' => '198.51.100.23'],
            [
                'reason' => 'Demo blocking karena percobaan login berulang.',
                'source' => 'auto',
                'blocked_by' => $users['superAdmin']->id,
                'expires_at' => now()->addDays(7),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    private function upsertReturningId(string $table, array $unique, array $values): int
    {
        $payload = array_merge($values, ['created_at' => now(), 'updated_at' => now()]);

        if (Schema::hasColumn($table, 'uuid') && ! array_key_exists('uuid', $payload)) {
            $payload['uuid'] = (string) Str::uuid();
        }

        DB::table($table)->updateOrInsert($unique, $payload);

        return (int) DB::table($table)->where($unique)->value('id');
    }
}
