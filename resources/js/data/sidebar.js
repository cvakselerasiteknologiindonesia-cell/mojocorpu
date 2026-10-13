import {
  Award,
  BookMarked,
  BookOpen,
  Building2,
  CalendarDays,
  CircleUser,
  ClipboardCheck,
  Coins,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  MessageSquare,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Trophy,
  Users,
} from 'lucide-react';

const sidebarItems = [
  { section: 'Beranda', to: '/dashboard', label: 'Dasbor', icon: LayoutDashboard, permissions: ['view dashboard', 'view facilitator dashboard'] },
  { section: 'Beranda', to: '/profile', label: 'Profil Saya', icon: CircleUser, permission: 'view profile' },

  { section: 'Master Data', to: '/users', label: 'Pengguna', icon: Users, permission: 'view user', roles: ['super-admin'] },
  { section: 'Master Data', to: '/roles', label: 'Peran & Hak Akses', icon: ShieldCheck, permission: 'view role', roles: ['super-admin'] },
  { section: 'Master Data', to: '/opds', label: 'OPD', icon: Building2, permission: 'view opd', roles: ['super-admin'] },
  { section: 'Master Data', to: '/facilitators', label: 'Fasilitator', icon: Users, permission: 'view facilitator', roles: ['super-admin'] },

  { section: 'Unit Kerja', to: '/users', label: 'Pengguna', icon: Users, permission: 'view user', roles: ['admin-opd'] },
  { section: 'Unit Kerja', to: '/opds', label: 'OPD', icon: Building2, permission: 'view opd', roles: ['admin-opd'] },
  { section: 'Unit Kerja', to: '/facilitators', label: 'Fasilitator', icon: Users, permission: 'view facilitator', roles: ['admin-opd'] },

  { section: 'Pelatihan', to: '/training-proposals', label: 'Usulan & Kegiatan Pelatihan', icon: BookOpen, permission: 'view training proposal', roles: ['super-admin', 'admin-opd'] },
  { section: 'Pelatihan', to: '/lms', label: 'LMS', icon: GraduationCap, permission: 'view lms', roles: ['super-admin', 'admin-opd'] },
  { section: 'Pelatihan', to: '/curriculum', label: 'Kurikulum', icon: BookMarked, permission: 'view curriculum', roles: ['super-admin'] },
  { section: 'Pelatihan', to: '/quizzes', label: 'Kuis', icon: ClipboardCheck, permission: 'view quiz', roles: ['super-admin'] },
  { section: 'Pelatihan', to: '/certificates', label: 'Sertifikat', icon: Award, permission: 'view certificate', roles: ['super-admin'] },

  { section: 'Belajar', to: '/training-events', label: 'Kegiatan Pelatihan', icon: CalendarDays, permission: 'view training event', roles: ['asn'] },
  { section: 'Belajar', to: '/lms', label: 'Pembelajaran Saya', icon: GraduationCap, permission: 'view lms', roles: ['asn'] },
  { section: 'Belajar', to: '/learning-paths', label: 'Alur Belajar', icon: BookMarked, permission: 'view learning path', roles: ['asn'] },
  { section: 'Belajar', to: '/certificates', label: 'Sertifikat', icon: Award, permission: 'view certificate', roles: ['asn'] },
  { section: 'Belajar', to: '/attendance', label: 'Presensi Saya', icon: ClipboardCheck, permission: 'view attendance', roles: ['asn'] },

  { section: 'Kelas Saya', to: '/training-events', label: 'Kegiatan Saya', icon: BookOpen, permissions: ['view own training events', 'view assigned training events'], roles: ['fasilitator-internal', 'fasilitator-eksternal'] },
  { section: 'Kelas Saya', to: '/facilitator/materials', label: 'Materi Ajar', icon: GraduationCap, permission: 'upload learning materials', roles: ['fasilitator-internal', 'fasilitator-eksternal'] },
  { section: 'Kelas Saya', to: '/facilitator/assessments', label: 'Asesmen', icon: ClipboardCheck, permissions: ['create quiz', 'manage assessments', 'evaluate participants'], roles: ['fasilitator-internal', 'fasilitator-eksternal'] },
  { section: 'Kelas Saya', to: '/facilitator/participants', label: 'Peserta', icon: Users, permissions: ['view participant list', 'view assigned class participants'], roles: ['fasilitator-internal', 'fasilitator-eksternal'] },
  { section: 'Kelas Saya', to: '/attendance', label: 'Presensi', icon: ClipboardCheck, permissions: ['monitor attendance', 'monitor participant attendance'], roles: ['fasilitator-internal', 'fasilitator-eksternal'] },

  { section: 'Evaluasi', to: '/certificates', label: 'Sertifikat', icon: Award, permissions: ['view certificate', 'create certificate', 'view facilitator dashboard'], roles: ['fasilitator-internal', 'fasilitator-eksternal'] },
  { section: 'Evaluasi', to: '/facilitator/completion', label: 'Persetujuan Lulus', icon: Award, permission: 'approve training completion', roles: ['fasilitator-internal'] },
  { section: 'Evaluasi', to: '/facilitator/reports', label: 'Laporan Kelas', icon: FileText, permission: 'export reports', roles: ['fasilitator-internal', 'fasilitator-eksternal'] },

  { section: 'Pengetahuan', to: '/kms-assets', label: 'Aset Pengetahuan', icon: Library, permission: 'view kms asset', roles: ['super-admin', 'admin-opd', 'asn'] },
  { section: 'Pengetahuan', to: '/blog', label: 'Artikel', icon: FileText, permission: 'view blog', roles: ['super-admin', 'admin-opd', 'asn'] },

  { section: 'Kolaborasi', to: '/discussion-forum', label: 'Diskusi', icon: MessageSquare, permissions: ['create discussion topics', 'reply to discussions', 'create assigned class announcements'], roles: ['fasilitator-internal', 'fasilitator-eksternal'] },
  { section: 'Kolaborasi', to: '/blog', label: 'Artikel', icon: FileText, permission: 'view blog', roles: ['fasilitator-internal', 'fasilitator-eksternal'] },
  { section: 'Kolaborasi', to: '/facilitator/kms-contribution', label: 'Kontribusi Pengetahuan', icon: Library, permission: 'upload kms assets', roles: ['fasilitator-internal'] },

  { section: 'Komunitas', to: '/discussion-forum', label: 'Forum Diskusi', icon: MessageSquare, permission: 'view discussion forum', roles: ['super-admin', 'admin-opd', 'asn'] },

  { section: 'Apresiasi', to: '/leaderboard', label: 'Peringkat', icon: Trophy, permission: 'view leaderboard', roles: ['asn', 'fasilitator-internal', 'fasilitator-eksternal'] },
  { section: 'Apresiasi', to: '/achievements', label: 'Pencapaian', icon: Award, permission: 'view achievement', roles: ['asn', 'fasilitator-internal', 'fasilitator-eksternal'] },
  { section: 'Apresiasi', to: '/wallet', label: 'Dompet Token', icon: Coins, permission: 'view wallet', roles: ['asn', 'fasilitator-internal', 'fasilitator-eksternal'] },
  { section: 'Apresiasi', to: '/store', label: 'Toko Token', icon: ShoppingBag, permission: 'view store', roles: ['asn', 'fasilitator-internal', 'fasilitator-eksternal'] },

  { section: 'Monitoring', to: '/reports', label: 'Laporan', icon: FileText, permission: 'view report', roles: ['super-admin', 'admin-opd'] },
  { section: 'Monitoring', to: '/attendance', label: 'Presensi', icon: ClipboardCheck, permission: 'view attendance', roles: ['super-admin'] },
  { section: 'Monitoring', to: '/audit-logs', label: 'Log Aktivitas', icon: ShieldCheck, permission: 'view audit log', roles: ['super-admin'] },
  { section: 'Monitoring', to: '/security', label: 'Keamanan', icon: ShieldAlert, permission: 'view audit log', roles: ['super-admin'] },

  { section: 'Sistem', to: '/settings', label: 'Pengaturan', icon: Settings, permission: 'manage settings', roles: ['super-admin'] },
];

export default sidebarItems;
