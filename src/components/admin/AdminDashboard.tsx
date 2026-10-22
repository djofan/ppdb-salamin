import React, { useState, useEffect } from 'react';
import {
  fetchDashboardStats,
  fetchApplicants,
  fetchTestCategories,
  fetchTestSchedules,
  fetchQuestions,
  fetchAdmissionDecisions,
  seedDemoPesantrenData,
} from '@/src/firebase/db';
import {
  Applicant,
  DashboardStats,
  TestCategory,
  TestSchedule,
  QuestionItem,
  AdmissionDecision,
} from '@/src/types';
import { StatCard } from '@/src/components/common/StatCard';
import { ApplicantManagement } from './ApplicantManagement';
import { CategoryManagement } from './CategoryManagement';
import { QuestionBankManagement } from './QuestionBankManagement';
import { ScheduleManagement } from './ScheduleManagement';
import { AssessmentConfigView } from './AssessmentConfigView';
import { SelectionResultsDashboard } from './SelectionResultsDashboard';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  HelpCircle,
  Award,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Building2,
  BookOpen,
  RefreshCw,
  Sparkles,
  Percent,
  XCircle,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'applicants' | 'categories' | 'questions' | 'schedules' | 'config' | 'decisions'
  >('overview');

  const [stats, setStats] = useState<DashboardStats>({
    totalApplicants: 0,
    yetToTest: 0,
    testedCount: 0,
    incompleteAssessmentCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    pendingDecision: 0,
  });

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [schedules, setSchedules] = useState<TestSchedule[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [decisions, setDecisions] = useState<AdmissionDecision[]>([]);

  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [st, apps, cats, scheds, qList, decs] = await Promise.all([
        fetchDashboardStats(),
        fetchApplicants(true), // load both active and archived
        fetchTestCategories(),
        fetchTestSchedules(),
        fetchQuestions(),
        fetchAdmissionDecisions(),
      ]);
      setStats(st);
      setApplicants(apps);
      setCategories(cats);
      setSchedules(scheds);
      setQuestions(qList);
      setDecisions(decs);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSeedData = async () => {
    if (confirm('Muat data komprehensif Pondok Pesantren Salamatul Insan? Mencakup 5 Kategori Tes, Bank Soal lengkap, Jadwal Sesi Ujian, Formula Bobot 100%, dan Santri Pendaftar.')) {
      setSeeding(true);
      try {
        await seedDemoPesantrenData();
        await loadAllData();
      } catch (err) {
        console.error(err);
        alert('Gagal memuat data demo: ' + (err as Error).message);
      } finally {
        setSeeding(false);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-[#F8FAFC] flex flex-col md:flex-row">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 shrink-0 p-4 space-y-6">
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Menu Utama PPDB
          </p>
          <nav className="space-y-1">
            {/* Overview */}
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#0F2137] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Ringkasan Statistik</span>
            </button>

            {/* Applicants */}
            <button
              onClick={() => setActiveTab('applicants')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'applicants'
                  ? 'bg-[#0F2137] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Calon Santri</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'applicants' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {applicants.filter((a) => !a.isArchived).length}
              </span>
            </button>

            {/* Categories */}
            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'categories'
                  ? 'bg-[#0F2137] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4" />
                <span>Kategori Tes</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'categories' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {categories.length}
              </span>
            </button>

            {/* Question Banks */}
            <button
              onClick={() => setActiveTab('questions')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'questions'
                  ? 'bg-[#0F2137] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4" />
                <span>Bank Soal</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'questions' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {questions.length}
              </span>
            </button>

            {/* Schedules */}
            <button
              onClick={() => setActiveTab('schedules')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'schedules'
                  ? 'bg-[#0F2137] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4" />
                <span>Jadwal Ujian</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'schedules' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {schedules.length}
              </span>
            </button>

            {/* Assessment Config */}
            <button
              onClick={() => setActiveTab('config')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'config'
                  ? 'bg-[#0F2137] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Konfigurasi Penilaian</span>
            </button>

            {/* Decisions */}
            <button
              onClick={() => setActiveTab('decisions')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'decisions'
                  ? 'bg-[#0F2137] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>SK & Hasil Kelulusan</span>
            </button>
          </nav>
        </div>

        {/* Database Quick Seeder */}
        <div className="p-4 bg-gradient-to-br from-[#0F2137]/5 to-[#D4AF37]/10 rounded-2xl border border-[#D4AF37]/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F2137]">
            <Sparkles className="w-4 h-4 text-[#B8860B]" />
            <span>Data Pesantren Lengkap</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Muat 5 kategori tes, bank butir soal, jadwal, dan formula bobot 100% ke Firestore.
          </p>
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="w-full mt-1 py-2 px-3 bg-[#0F2137] hover:bg-[#162D4A] text-white text-[11px] font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Menyinkronkan...' : 'Muat Data Lengkap Modul 2'}</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
        {/* Top Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#0F2137] tracking-tight">
              Dashboard Panitia PPDB
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pondok Pesantren Salamatul Insan • Tahun Ajaran 2026/2027
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sinkronkan Firestore</span>
            </button>
          </div>
        </div>

        {/* 7 STATS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard
            title="Total Pendaftar"
            value={stats.totalApplicants}
            subtitle="Pendaftar aktif"
            icon={Users}
            colorScheme="navy"
            isLoading={loading}
          />
          <StatCard
            title="Belum Tes"
            value={stats.yetToTest}
            subtitle="Menunggu tes"
            icon={Clock}
            colorScheme="amber"
            isLoading={loading}
          />
          <StatCard
            title="Sudah Tes"
            value={stats.testedCount}
            subtitle="Telah ujian"
            icon={CheckCircle2}
            colorScheme="blue"
            isLoading={loading}
          />
          <StatCard
            title="Belum Lengkap"
            value={stats.incompleteAssessmentCount}
            subtitle="Perlu dinilai"
            icon={AlertCircle}
            colorScheme="amber"
            isLoading={loading}
          />
          <StatCard
            title="Lulus"
            value={stats.acceptedCount}
            subtitle="Diterima resmi"
            icon={CheckCircle2}
            colorScheme="emerald"
            isLoading={loading}
          />
          <StatCard
            title="Tidak Lulus"
            value={stats.rejectedCount}
            subtitle="Belum lolos"
            icon={XCircle}
            colorScheme="rose"
            isLoading={loading}
          />
          <StatCard
            title="Menunggu SK"
            value={stats.pendingDecision}
            subtitle="Siap disahkan"
            icon={Award}
            colorScheme="purple"
            isLoading={loading}
          />
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab('applicants')}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#0F2137]/40 cursor-pointer transition-all shadow-2xs group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Manajemen Santri</span>
                  <Users className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                </div>
                <p className="font-serif font-bold text-2xl text-[#0F2137] mt-2">
                  {applicants.filter((a) => !a.isArchived).length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>Kelola, impor CSV, dan filter pendaftar</span>
                  <ChevronRight className="w-3 h-3 ml-auto" />
                </p>
              </div>

              <div
                onClick={() => setActiveTab('questions')}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#0F2137]/40 cursor-pointer transition-all shadow-2xs group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Bank Soal Ujian</span>
                  <HelpCircle className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                </div>
                <p className="font-serif font-bold text-2xl text-[#0F2137] mt-2">
                  {questions.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>Butir soal PG, Benar/Salah & Isian Singkat</span>
                  <ChevronRight className="w-3 h-3 ml-auto" />
                </p>
              </div>

              <div
                onClick={() => setActiveTab('config')}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#0F2137]/40 cursor-pointer transition-all shadow-2xs group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Formula Penilaian</span>
                  <SlidersHorizontal className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                </div>
                <p className="font-serif font-bold text-2xl text-[#0F2137] mt-2">
                  100%
                </p>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>Bobot 5 kategori, passing grade & CBT</span>
                  <ChevronRight className="w-3 h-3 ml-auto" />
                </p>
              </div>
            </div>

            {/* Recent Applicants Preview */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#0F2137]">
                    Santri Pendaftar Terkini
                  </h3>
                  <p className="text-xs text-slate-500">
                    5 calon santri yang baru mendaftar atau diperbarui datanya
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('applicants')}
                  className="text-xs font-semibold text-[#0F2137] hover:text-[#B8860B] flex items-center gap-1"
                >
                  <span>Buka Semua Santri</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {applicants.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <Users className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs text-slate-500">Belum ada pendaftar di database.</p>
                  <button
                    onClick={handleSeedData}
                    disabled={seeding}
                    className="px-4 py-2 bg-[#0F2137] text-white text-xs font-semibold rounded-xl hover:bg-[#162D4A]"
                  >
                    Muat Data Lengkap Modul 2
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">No. Registrasi</th>
                        <th className="py-2.5 px-3">Nama Santri</th>
                        <th className="py-2.5 px-3">Jenjang</th>
                        <th className="py-2.5 px-3">Gender</th>
                        <th className="py-2.5 px-3">Asal Sekolah</th>
                        <th className="py-2.5 px-3">Wali Santri</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {applicants.slice(0, 5).map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#0F2137]">
                            {app.registrationNumber}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {app.fullName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{app.targetLevel}</td>
                          <td className="py-2.5 px-3 text-slate-600">{app.gender}</td>
                          <td className="py-2.5 px-3 text-slate-600">{app.previousSchool || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-600">{app.guardianName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: APPLICANTS MANAGEMENT */}
        {activeTab === 'applicants' && (
          <ApplicantManagement
            applicants={applicants}
            onReload={loadAllData}
            isLoading={loading}
          />
        )}

        {/* TAB 3: CATEGORIES MANAGEMENT */}
        {activeTab === 'categories' && (
          <CategoryManagement
            categories={categories}
            onReload={loadAllData}
            isLoading={loading}
          />
        )}

        {/* TAB 4: QUESTIONS BANK MANAGEMENT */}
        {activeTab === 'questions' && (
          <QuestionBankManagement
            questions={questions}
            categories={categories}
            onReload={loadAllData}
            isLoading={loading}
          />
        )}

        {/* TAB 5: SCHEDULES MANAGEMENT */}
        {activeTab === 'schedules' && (
          <ScheduleManagement
            schedules={schedules}
            categories={categories}
            onReload={loadAllData}
            isLoading={loading}
          />
        )}

        {/* TAB 6: ASSESSMENT CONFIGURATION */}
        {activeTab === 'config' && (
          <AssessmentConfigView
            categories={categories}
            onReload={loadAllData}
          />
        )}

        {/* TAB 7: DECISIONS & SK KELULUSAN (MODUL 4 COMPREHENSIVE DASHBOARD) */}
        {activeTab === 'decisions' && (
          <SelectionResultsDashboard />
        )}
      </main>
    </div>
  );
};
