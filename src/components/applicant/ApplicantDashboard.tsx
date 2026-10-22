import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import {
  fetchApplicantByUserId,
  fetchTestSchedules,
  fetchTestCategories,
  fetchAdmissionDecisions,
  fetchAnnouncementConfig,
} from '@/src/firebase/db';
import { Applicant, TestSchedule, TestCategory, AdmissionDecision, AnnouncementConfig } from '@/src/types';
import { StatusBadge } from '@/src/components/common/StatusBadge';
import { ExamTakingView } from '@/src/components/exam/ExamTakingView';
import { TemporaryRecapModal } from '@/src/components/common/TemporaryRecapModal';
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  FileCheck,
  AlertCircle,
  BookOpen,
  Printer,
  Sparkles,
  QrCode,
  ShieldCheck,
  Award,
  PlayCircle,
  BarChart3,
  FileSpreadsheet,
  Download,
  Info,
} from 'lucide-react';

export const ApplicantDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [schedules, setSchedules] = useState<TestSchedule[]>([]);
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [decision, setDecision] = useState<AdmissionDecision | null>(null);
  const [announcementConfig, setAnnouncementConfig] = useState<AnnouncementConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // CBT Exam taking & Recap states
  const [activeExamCategory, setActiveExamCategory] = useState<TestCategory | null>(null);
  const [showRecapModal, setShowRecapModal] = useState<boolean>(false);

  // Practice modal state
  const [showPractice, setShowPractice] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadApplicantData = async () => {
      setLoading(true);
      try {
        let appData: Applicant | null = null;
        if (user) {
          appData = await fetchApplicantByUserId(user.uid);
        }

        // If not found in real DB (e.g. testing in demo mode), create rich sample for candidate
        if (!appData) {
          appData = {
            id: 'app_sample_user',
            userId: user?.uid || 'user_demo_01',
            registrationNumber: 'PPDB-2026-0012',
            fullName: profile?.displayName || 'Muhammad Zaid Al-Fatih',
            gender: 'Laki-laki',
            birthPlace: 'Cirebon',
            birthDate: '2012-04-10',
            previousSchool: 'SDIT Nurul Fikri',
            guardianName: 'H. Bambang Irawan',
            guardianPhone: '081234567890',
            targetLevel: 'Tsanawiyyah (MTs)',
            status: 'scheduled',
            testScheduleId: 'sch_gelombang1_01',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        setApplicant(appData);

        const [scheds, cats, decs, annCfg] = await Promise.all([
          fetchTestSchedules(),
          fetchTestCategories(),
          fetchAdmissionDecisions(),
          fetchAnnouncementConfig(),
        ]);
        setSchedules(scheds);
        setCategories(cats);
        setAnnouncementConfig(annCfg);

        if (appData) {
          const matchDec = decs.find(
            (d) => d.applicantId === appData?.id || d.registrationNumber === appData?.registrationNumber
          );
          if (matchDec) setDecision(matchDec);
        }
      } catch (err) {
        console.error('Error loading applicant details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadApplicantData();
  }, [user, profile]);

  const assignedSchedule = schedules.find((s) => s.id === applicant?.testScheduleId) || schedules[0];

  // If applicant enters exam mode, render the CBT ExamTakingView full interface
  if (activeExamCategory && applicant) {
    return (
      <ExamTakingView
        applicant={applicant}
        category={activeExamCategory}
        scheduleId={applicant.testScheduleId || assignedSchedule?.id}
        onExit={() => setActiveExamCategory(null)}
        onFinished={(finalSession) => {
          setApplicant((prev) =>
            prev ? { ...prev, testStatus: 'selesai_tes', status: 'tested' } : null
          );
          setActiveExamCategory(null);
          setShowRecapModal(true);
        }}
      />
    );
  }

  const cbtCategories = categories.filter(
    (c) => c.type === 'cbt' || c.code === 'tpa' || c.name.toLowerCase().includes('akademik')
  );
  const primaryCbtCategory =
    cbtCategories[0] ||
    categories[0] || {
      id: 'cat_tpa_demo',
      name: 'Tes Potensi Akademik & Dasar Bahasa Arab',
      code: 'tpa',
      type: 'cbt',
      weight: 30,
      passingGrade: 70,
      durationMinutes: 45,
      order: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

  const steps = [
    { key: 'registered', label: '1. Pendaftaran Berkas', done: true },
    {
      key: 'scheduled',
      label: '2. Penetapan Jadwal',
      done: applicant?.status !== 'registered',
    },
    {
      key: 'tested',
      label: '3. Pelaksanaan Ujian',
      done: ['tested', 'reviewed', 'accepted', 'rejected'].includes(applicant?.status || ''),
    },
    {
      key: 'reviewed',
      label: '4. Verifikasi Nilai',
      done: ['reviewed', 'accepted', 'rejected'].includes(applicant?.status || ''),
    },
    {
      key: 'decision',
      label: '5. Pengumuman Kelulusan',
      done: ['accepted', 'rejected'].includes(applicant?.status || ''),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0F2137] via-[#162D4A] to-[#0A1626] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-[#D4AF37]/30">
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#D4AF37] text-xs font-semibold border border-white/10">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Portal Calon Santri Baru PPDB</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Ahlan wa Sahlan, {applicant?.fullName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Selamat datang di portal seleksi masuk Pondok Pesantren Salamatul Insan Tahun Ajaran 2026/2027. Simpan kartu tanda peserta dan perhatikan jadwal ujian Anda.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center min-w-[200px]">
            <span className="text-[10px] text-slate-300 uppercase font-semibold tracking-wider block">
              Nomor Registrasi Resmi
            </span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-[#E5C05B] block mt-1 tracking-wider">
              {applicant?.registrationNumber || 'PPDB-2026-0000'}
            </span>
            <div className="mt-2 inline-block">
              {applicant && <StatusBadge status={applicant.status} size="sm" />}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Timeline Tracker */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <h3 className="font-serif font-bold text-base text-[#0F2137] mb-4">
          Tahapan Alur Seleksi Penerimaan Santri
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {steps.map((step, idx) => (
            <div
              key={step.key}
              className={`p-3 rounded-2xl border text-center transition-all ${
                step.done
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs mb-1.5 ${
                  step.done ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {step.done ? <CheckCircle className="w-4 h-4" /> : idx + 1}
              </div>
              <p className="text-xs">{step.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CBT Online Exam Portal & Live Recap Action Banner */}
      <div className="bg-gradient-to-br from-[#0F2137] via-[#162D4A] to-[#1E3A5F] rounded-3xl p-6 sm:p-7 text-white shadow-lg border border-[#D4AF37]/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#D4AF37] text-xs font-semibold border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Sistem Ujian Berbasis Komputer (CBT Online)</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
              Pelaksanaan Tes & Penilaian Seleksi Masuk
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Kerjakan materi ujian online secara mandiri dengan perlindungan waktu real-time, auto-save berkala, dan penilaian otomatis. Pantau juga hasil rekonsiliasi nilai sementara Anda.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Start CBT Exam Button */}
            <button
              onClick={() => setActiveExamCategory(primaryCbtCategory)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E5C05B] hover:from-[#c29f2e] hover:to-[#d6b048] text-[#0F2137] font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <PlayCircle className="w-5 h-5 text-[#0F2137]" />
              <div className="text-left">
                <span className="block font-bold">Mulai Ujian Online (CBT)</span>
                <span className="block text-[10px] text-[#0F2137]/80 font-medium">
                  {primaryCbtCategory.name} ({primaryCbtCategory.durationMinutes || 45} Menit)
                </span>
              </div>
            </button>

            {/* View Temporary Recap Button */}
            <button
              onClick={() => setShowRecapModal(true)}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
            >
              <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
              <div className="text-left">
                <span className="block font-bold">Rekap Nilai Sementara</span>
                <span className="block text-[10px] text-slate-300 font-medium">
                  Rincian 5 Kategori & Bobot 100%
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Participant Card & Schedule Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Official ID Card (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg text-[#0F2137] flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#B8860B]" />
              <span>Kartu Tanda Peserta Seleksi (KTP-PPDB)</span>
            </h3>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kartu</span>
            </button>
          </div>

          {/* THE CARD */}
          <div className="bg-white rounded-3xl border-2 border-[#D4AF37]/50 shadow-md p-6 relative overflow-hidden space-y-6">
            {/* Header of the card */}
            <div className="flex items-center justify-between border-b-2 border-[#0F2137]/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F2137] flex items-center justify-center text-[#D4AF37] font-serif font-bold text-lg border border-[#D4AF37]">
                  SI
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm sm:text-base text-[#0F2137] leading-tight">
                    PONDOK PESANTREN SALAMATUL INSAN
                  </h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                    PANITIA PENERIMAAN PESERTA DIDIK BARU 2026/2027
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">KARTU RESMI</span>
                <span className="font-mono text-xs font-bold text-[#0F2137]">
                  {applicant?.registrationNumber}
                </span>
              </div>
            </div>

            {/* Candidate Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Photo & Barcode */}
              <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center">
                <div className="w-24 h-28 bg-[#0F2137]/10 rounded-xl border border-slate-300 flex items-center justify-center text-slate-400 font-medium text-xs mb-3">
                  <div className="flex flex-col items-center">
                    <GraduationCap className="w-8 h-8 text-[#0F2137]/40 mb-1" />
                    <span className="text-[10px]">FOTO SANTRI</span>
                    <span className="text-[9px] text-slate-400">3x4 Resmi</span>
                  </div>
                </div>
                {/* Simulated Barcode */}
                <div className="font-mono text-[9px] text-slate-400 tracking-widest">
                  ||||| | |||| || ||| | |||
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-600 mt-0.5">
                  {applicant?.registrationNumber}
                </span>
              </div>

              {/* Data Fields */}
              <div className="sm:col-span-2 space-y-2.5 text-xs">
                <div className="border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">
                    Nama Calon Santri
                  </span>
                  <span className="font-bold text-sm text-[#0F2137]">
                    {applicant?.fullName}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-1.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">
                      Jenjang Tujuan
                    </span>
                    <span className="font-semibold text-slate-800">
                      {applicant?.targetLevel}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">
                      Jenis Kelamin
                    </span>
                    <span className="font-semibold text-slate-800">
                      {applicant?.gender}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-1.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">
                      Tempat, Tgl Lahir
                    </span>
                    <span className="font-semibold text-slate-800">
                      {applicant?.birthPlace}, {applicant?.birthDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">
                      Asal Sekolah
                    </span>
                    <span className="font-semibold text-slate-800">
                      {applicant?.previousSchool || '-'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">
                    Nama Wali & Kontak
                  </span>
                  <span className="font-semibold text-slate-800">
                    {applicant?.guardianName} ({applicant?.guardianPhone})
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Kartu ini wajib dibawa saat pelaksanaan ujian seleksi luring di kampus Pondok Pesantren Salamatul Insan beserta mushaf Al-Qur'an dan perlengkapan tulis.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Exam Schedule & Readiness (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Exam Schedule Box */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-base text-[#0F2137] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#B8860B]" />
              <span>Jadwal & Lokasi Ujian Anda</span>
            </h3>

            {assignedSchedule ? (
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-[#0F2137]">
                      {assignedSchedule.title}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Terjadwal
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Hari & Tanggal: <strong>{assignedSchedule.sessionDate}</strong></span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Waktu: <strong>{assignedSchedule.startTime} - {assignedSchedule.endTime} WIB</strong></span>
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Lokasi: <strong>{assignedSchedule.location}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">Materi Seleksi Yang Diujikan:</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-slate-600 text-[11px]">
                    <li>Tahfidz & Tilawah Al-Qur'an (Makharijul huruf & kelancaran)</li>
                    <li>Wawancara Kepribadian & Komitmen Kesantrian</li>
                    <li>Tes Potensi Akademik & Dasar Bahasa Arab</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Jadwal belum ditentukan oleh panitia.
              </div>
            )}
          </div>

          {/* Test Preparation / Practice Room */}
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-3xl border border-[#D4AF37]/40 p-6 space-y-3">
            <div className="flex items-center gap-2 text-[#0F2137]">
              <BookOpen className="w-5 h-5 text-[#B8860B]" />
              <h4 className="font-serif font-bold text-base">Ruang Simulasi & Kisi-Kisi Tes</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Persiapkan diri santri dengan mencoba simulasi contoh soal tes potensi akademik dan pemahaman keislaman dasar.
            </p>
            <button
              onClick={() => setShowPractice(!showPractice)}
              className="w-full py-2.5 px-4 bg-[#0F2137] hover:bg-[#162D4A] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{showPractice ? 'Tutup Ruang Simulasi' : 'Buka Contoh Soal Simulasi'}</span>
            </button>

            {/* Practice Questions toggle */}
            {showPractice && (
              <div className="mt-4 pt-4 border-t border-amber-200/60 space-y-4 animate-in fade-in">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                  <p className="font-semibold text-slate-800">
                    1. Huruf hijaiyah berikut yang termasuk dalam huruf Qalqalah adalah...
                  </p>
                  <div className="space-y-1 text-slate-600 pl-2">
                    {['Alif, Ba, Ta, Tsa', 'Qaf, Tha, Ba, Jim, Dal (ق، ط، ب، ج، د)', 'Kaf, Lam, Mim, Nun', 'Fa, Qaf, Kaf, Lam'].map((opt, i) => (
                      <label key={i} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="q1"
                          checked={practiceAnswer['q1'] === i}
                          onChange={() => setPracticeAnswer({ ...practiceAnswer, q1: i })}
                          className="accent-[#0F2137]"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                  {practiceAnswer['q1'] !== undefined && (
                    <p className={`text-[11px] font-semibold ${practiceAnswer['q1'] === 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {practiceAnswer['q1'] === 1 ? '✓ Tepat! Baju Di Toko (ق ط ب ج د).' : '✗ Kurang tepat. Jawaban yang benar adalah Qaf, Tha, Ba, Jim, Dal.'}
                    </p>
                  )}
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                  <p className="font-semibold text-slate-800">
                    2. Apa arti dari semboyan pesantren "Berbudi Luhur, Berbadan Sehat, Berpengetahuan Luas, Berpikiran Bebas"?
                  </p>
                  <div className="space-y-1 text-slate-600 pl-2">
                    {['Panca Jiwa Pesantren', 'Motto Santri Pondok', 'Syarat Masuk Asrama', 'Tata Tertib Khusus'].map((opt, i) => (
                      <label key={i} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="q2"
                          checked={practiceAnswer['q2'] === i}
                          onChange={() => setPracticeAnswer({ ...practiceAnswer, q2: i })}
                          className="accent-[#0F2137]"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                  {practiceAnswer['q2'] !== undefined && (
                    <p className={`text-[11px] font-semibold ${practiceAnswer['q2'] === 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {practiceAnswer['q2'] === 1 ? '✓ Tepat! Merupakan 4 Moto Pondok.' : '✗ Pilihan ini adalah 4 Moto Pondok Pesantren.'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* OFFICIAL ADMISSION ANNOUNCEMENT SECTION */}
          {/* CASE 1: NOT YET PUBLISHED (Pra-Pengumuman) */}
          {!announcementConfig?.isPublished ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-5 h-5 text-amber-600" />
                <h4 className="font-serif font-bold text-base text-[#0F2137]">
                  Pengumuman Kelulusan Seleksi Masuk
                </h4>
              </div>
              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] uppercase">
                    Tahap Sidang Pleno
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Jadwal Rilis: {announcementConfig?.publishDate || 'Segera'}
                  </span>
                </div>
                <p className="leading-relaxed">
                  Hasil akhir seleksi santri baru saat ini sedang dalam proses rekonsiliasi dan verifikasi sidang pleno panitia seleksi serta pengasuh pondok pesantren. Seluruh pengumuman resmi akan dipublikasikan secara serentak melalui portal ini.
                </p>
                <p className="text-[11px] text-amber-800 italic">
                  💡 Selalu jaga hafalan Al-Qur'an dan adab kesantrian ananda selama masa penantian pengumuman resmi.
                </p>
              </div>
            </div>
          ) : (
            /* CASE 2: PUBLISHED ANNOUNCEMENT */
            <div className="bg-white rounded-3xl border-2 border-[#D4AF37]/50 p-6 shadow-md space-y-4">
              <div className="border-b-2 border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-[#B8860B]" />
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#0F2137]">
                      Surat Keputusan Kelulusan Santri Baru
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Pondok Pesantren Salamatul Insan TA 2026/2027
                    </p>
                  </div>
                </div>
                {decision?.decreeNumber && (
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                    {decision.decreeNumber}
                  </span>
                )}
              </div>

              {/* Status Banner */}
              {decision?.decision === 'accepted' ? (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 text-xs text-emerald-950 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-sm text-emerald-900 block">
                        SELAMAT! ANDA DINYATAKAN LULUS SELEKSI MASUK
                      </span>
                      <span className="text-[11px] text-emerald-800">
                        Jenjang: {applicant?.targetLevel} • Pondok Pesantren Salamatul Insan
                      </span>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-emerald-900">
                    {decision.notes ||
                      'Alhamdulillah, berdasarkan akumulasi penilaian tes akademik, baca Qur\'an, hafalan, wawancara, dan praktik ibadah, calon santri dinyatakan memenuhi seluruh kriteria kelulusan penerimaan santri baru.'}
                  </p>

                  {/* Re-registration guidelines */}
                  <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 text-[11px] space-y-1.5 text-slate-700">
                    <span className="font-bold text-emerald-900 block">
                      📌 Petunjuk Daftar Ulang Santri Baru:
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                      <li>Pengambilan perlengkapan & seragam santri: 1-5 Desember 2026 di sekretariat PPDB.</li>
                      <li>Penyerahan berkas fisik asli (Ijazah, Akta Kelahiran, Kartu Keluarga).</li>
                      <li>Kedatangan santri ke asrama dan masa ta'aruf: 10 Januari 2027.</li>
                    </ul>
                  </div>
                </div>
              ) : decision?.decision === 'rejected' ? (
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-300 text-xs text-rose-950 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span className="font-bold text-sm text-rose-900">
                      BELUM MEMENUHI KRITERIA KELULUSAN
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    {decision.notes ||
                      'Mohon maaf, perolehan nilai akumulasi ananda belum mencapai passing grade minimal kuota penerimaan tahun ini. Terima kasih atas partisipasi dan ikhtiar yang telah dilakukan.'}
                  </p>
                  <p className="text-[11px] text-rose-800 italic">
                    Semoga Allah SWT senantiasa membuka pintu kemudahan bagi ananda dalam menuntut ilmu di tempat terbaik lainnya.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-950 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    <span className="font-bold text-sm text-amber-900">
                      STATUS: MENUNGGU PENETAPAN RESMI
                    </span>
                  </div>
                  <p>
                    Data penilaian ananda telah lengkap dan sedang menunggu proses tanda tangan Surat Keputusan dari Pengasuh Pondok Pesantren.
                  </p>
                </div>
              )}

              {/* Score Breakdown if allowed by admin */}
              {announcementConfig?.allowApplicantsViewDetailScores && decision?.finalScore !== undefined && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Nilai Akhir Terakumulasi
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-[#0F2137]">
                      {decision.finalScore}
                    </span>
                    <span className="text-slate-400 text-xs">/ 100</span>
                  </div>
                </div>
              )}

              {/* Signatory Block & Print Button */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-[11px] text-slate-500">
                  <span>Tertanda:</span>{' '}
                  <strong className="text-slate-800 font-serif">
                    {announcementConfig?.signatoryName || 'Pimpinan Pesantren'}
                  </strong>
                </div>

                {announcementConfig?.allowApplicantsDownloadLetter && decision?.decision === 'accepted' && (
                  <button
                    onClick={() => window.print()}
                    className="py-2 px-3 bg-[#0F2137] hover:bg-[#162D4A] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Cetak Surat Kelulusan</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Temporary Recap Modal */}
      {applicant && (
        <TemporaryRecapModal
          applicantId={applicant.id}
          isOpen={showRecapModal}
          onClose={() => setShowRecapModal(false)}
        />
      )}
    </div>
  );
};
