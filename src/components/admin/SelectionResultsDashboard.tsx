import React, { useState, useEffect, useMemo } from 'react';
import {
  ConsolidatedResultItem,
  TestCategory,
  AnnouncementConfig,
  DashboardStats,
  EducationTier,
} from '@/src/types';
import {
  fetchConsolidatedSelectionResults,
  fetchTestCategories,
  fetchAnnouncementConfig,
  saveAnnouncementConfigWithAudit,
  fetchDashboardStats,
} from '@/src/firebase/db';
import { useAuth } from '@/src/context/AuthContext';
import { DecisionModal } from './DecisionModal';
import { ApplicantDetailResultModal } from './ApplicantDetailResultModal';
import { PrintReportModal } from './PrintReportModal';
import { AuditTrailModal } from './AuditTrailModal';
import {
  Award,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Download,
  Printer,
  History,
  Settings,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  RefreshCw,
  FileCheck,
  Sparkles,
} from 'lucide-react';

export const SelectionResultsDashboard: React.FC = () => {
  const { user, profile } = useAuth();

  // Data states
  const [results, setResults] = useState<ConsolidatedResultItem[]>([]);
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [announcementConfig, setAnnouncementConfig] = useState<AnnouncementConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [decisionFilter, setDecisionFilter] = useState<string>('all');
  const [completenessFilter, setCompletenessFilter] = useState<string>('all');
  const [scoreRangeFilter, setScoreRangeFilter] = useState<string>('all');

  // Modals
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ConsolidatedResultItem | null>(null);
  const [selectedItemForDecision, setSelectedItemForDecision] = useState<ConsolidatedResultItem | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Form state for announcement config
  const [savingConfig, setSavingConfig] = useState(false);
  const [configToast, setConfigToast] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Partial<AnnouncementConfig>>({
    isPublished: false,
    publishDate: new Date().toISOString().split('T')[0],
    allowApplicantsViewDetailScores: true,
    allowApplicantsViewRankings: false,
    allowApplicantsDownloadLetter: true,
    signatoryName: 'KH. M. Zainul Muttaqin, M.Ag.',
    signatoryTitle: 'Pengasuh & Pimpinan Pondok Pesantren Salamatul Insan',
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [resList, catList, st, annConfig] = await Promise.all([
        fetchConsolidatedSelectionResults(),
        fetchTestCategories(),
        fetchDashboardStats(),
        fetchAnnouncementConfig(),
      ]);

      setResults(resList);
      setCategories(catList);
      setStats(st);
      setAnnouncementConfig(annConfig);
      setConfigForm({
        isPublished: annConfig.isPublished,
        publishDate: annConfig.publishDate,
        allowApplicantsViewDetailScores: annConfig.allowApplicantsViewDetailScores,
        allowApplicantsViewRankings: annConfig.allowApplicantsViewRankings,
        allowApplicantsDownloadLetter: annConfig.allowApplicantsDownloadLetter,
        signatoryName: annConfig.signatoryName,
        signatoryTitle: annConfig.signatoryTitle,
      });
    } catch (err) {
      console.error('Failed to load selection results dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const actor = {
        uid: user?.uid || 'admin_sys',
        displayName: profile?.displayName || 'Panitia PPDB',
        role: profile?.role || 'admin',
      };
      await saveAnnouncementConfigWithAudit(configForm, actor);
      setConfigToast('Pengaturan publikasi pengumuman kelulusan berhasil disimpan!');
      const updated = await fetchAnnouncementConfig();
      setAnnouncementConfig(updated);
      setTimeout(() => setConfigToast(null), 4000);
    } catch (err: any) {
      alert('Gagal menyimpan pengaturan: ' + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // Filtered dataset
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.applicant.fullName.toLowerCase().includes(q) ||
        r.applicant.registrationNumber.toLowerCase().includes(q) ||
        (r.applicant.nisn && r.applicant.nisn.includes(q));

      // Tier
      const matchTier = tierFilter === 'all' || r.applicant.targetLevel === tierFilter;

      // Decision
      const dec = r.decision?.decision || 'pending';
      const matchDecision =
        decisionFilter === 'all' ||
        (decisionFilter === 'accepted' && dec === 'accepted') ||
        (decisionFilter === 'rejected' && dec === 'rejected') ||
        (decisionFilter === 'pending' && dec === 'pending');

      // Completeness
      const matchCompleteness =
        completenessFilter === 'all' ||
        (completenessFilter === 'complete' && r.isAllCompleted) ||
        (completenessFilter === 'incomplete' && !r.isAllCompleted);

      // Score range
      const score = r.totalWeightedScore;
      let matchScore = true;
      if (scoreRangeFilter === 'mumtaz') matchScore = score >= 90;
      else if (scoreRangeFilter === 'high') matchScore = score >= 80 && score < 90;
      else if (scoreRangeFilter === 'pass') matchScore = score >= 70 && score < 80;
      else if (scoreRangeFilter === 'fail') matchScore = score < 70;

      return matchSearch && matchTier && matchDecision && matchCompleteness && matchScore;
    });
  }, [results, searchQuery, tierFilter, decisionFilter, completenessFilter, scoreRangeFilter]);

  // Analytics Computation
  const analytics = useMemo(() => {
    // 1. Grade distribution (<60, 60-69, 70-79, 80-89, 90-100)
    const distribution = {
      under60: 0,
      sixtyTo69: 0,
      seventyTo79: 0,
      eightyTo89: 0,
      ninetyTo100: 0,
    };

    // 2. Tier breakdown
    const tierStats: Record<string, { total: number; passed: number; rejected: number; pending: number }> = {
      'Tsanawiyyah (MTs)': { total: 0, passed: 0, rejected: 0, pending: 0 },
      'Aliyah (MA)': { total: 0, passed: 0, rejected: 0, pending: 0 },
      "Kulliyatul Mu'allimin (KMI)": { total: 0, passed: 0, rejected: 0, pending: 0 },
    };

    results.forEach((r) => {
      const s = r.totalWeightedScore;
      if (s < 60) distribution.under60++;
      else if (s < 70) distribution.sixtyTo69++;
      else if (s < 80) distribution.seventyTo79++;
      else if (s < 90) distribution.eightyTo89++;
      else distribution.ninetyTo100++;

      const tierKey = r.applicant.targetLevel;
      if (tierStats[tierKey]) {
        tierStats[tierKey].total++;
        if (r.decision?.decision === 'accepted') tierStats[tierKey].passed++;
        else if (r.decision?.decision === 'rejected') tierStats[tierKey].rejected++;
        else tierStats[tierKey].pending++;
      }
    });

    return { distribution, tierStats };
  }, [results]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredResults.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    const headers = [
      'No Registrasi',
      'Nama Santri',
      'Jenjang',
      'Gender',
      'Asal Sekolah',
      'No HP Wali',
      'Nilai CBT',
      'Nilai Tilawah',
      'Nilai Hafalan',
      'Nilai Wawancara',
      'Nilai Praktik',
      'Skor Akhir (100%)',
      'Kelengkapan Penilaian',
      'Rekomendasi Sistem',
      'Keputusan Panitia',
      'No SK',
    ];

    const rows = filteredResults.map((r) => [
      `"${r.applicant.registrationNumber}"`,
      `"${r.applicant.fullName}"`,
      `"${r.applicant.targetLevel}"`,
      `"${r.applicant.gender}"`,
      `"${r.applicant.previousSchool || '-'}"`,
      `"${r.applicant.guardianPhone}"`,
      r.cbtScore !== undefined ? r.cbtScore : '',
      r.categoryScores['cat_baca_quran']?.score ?? '',
      r.categoryScores['cat_hafalan']?.score ?? '',
      r.categoryScores['cat_wawancara']?.score ?? '',
      r.categoryScores['cat_praktik']?.score ?? '',
      r.totalWeightedScore,
      r.isAllCompleted ? 'Lengkap' : `Kurang: ${r.missingCategories.join(', ')}`,
      r.autoRecommendation,
      r.decision?.decision === 'accepted'
        ? 'Lulus'
        : r.decision?.decision === 'rejected'
        ? 'Tidak Lulus'
        : 'Menunggu Keputusan',
      `"${r.decision?.decreeNumber || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Hasil_Seleksi_PPDB_Salamatul_Insan_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {configToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{configToast}</span>
          </div>
          <button onClick={() => setConfigToast(null)} className="text-emerald-700 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {/* HEADER SECTION WITH TITLE & ACTION BUTTONS */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-[#0F2137] text-xs font-bold border border-amber-500/20">
            <Award className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>Sidang Pleno & Rekonsiliasi Hasil Seleksi</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#0F2137]">
            Dashboard Hasil Seleksi & Pengesahan Kelulusan
          </h2>
          <p className="text-xs text-slate-500">
            Pantau distribusi nilai, verifikasi kelengkapan rubrik penguji, sahkan kelulusan, dan kelola publikasi santri
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Audit Trail Button */}
          <button
            onClick={() => setShowAuditModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Lihat Log Jejak Audit Perubahan Keputusan & Nilai"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Jejak Audit</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Unduh data komprehensif ke format CSV/Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>

          {/* Print Report */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F2137] bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>Cetak Dokumen Resmi</span>
          </button>

          {/* Announcement Settings Toggle */}
          <button
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              showSettingsPanel
                ? 'bg-[#0F2137] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Pengaturan Publikasi</span>
            {showSettingsPanel ? (
              <ChevronUp className="w-3 h-3 ml-1" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* ANNOUNCEMENT CONFIGURATION PANEL (EXPANDABLE) */}
      {showSettingsPanel && (
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-3xl border-2 border-[#D4AF37]/50 p-6 shadow-sm space-y-5 animate-in fade-in">
          <div className="flex items-start justify-between border-b border-amber-200/60 pb-3">
            <div>
              <h3 className="font-serif font-bold text-base text-[#0F2137] flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#B8860B]" />
                <span>Pengaturan Publikasi Pengumuman Kelulusan Resmi ke Portal Santri</span>
              </h3>
              <p className="text-xs text-slate-600">
                Tentukan apakah santri sudah dapat melihat Surat Keputusan Kelulusan dan atur visibilitas data
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                configForm.isPublished
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {configForm.isPublished ? '● STATUS: DIPUBLIKASIKAN' : '○ STATUS: DRAF / DITUTUP'}
            </span>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Publication Toggle */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Status Publikasi Portal</span>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={configForm.isPublished}
                    onChange={(e) => setConfigForm({ ...configForm, isPublished: e.target.checked })}
                    className="w-4 h-4 accent-[#0F2137] rounded"
                  />
                  <span className="font-semibold text-slate-700">
                    Buka Publikasi ke Santri
                  </span>
                </label>
                <p className="text-[10px] text-slate-400">
                  Jika tidak dicentang, santri hanya melihat status pra-pengumuman.
                </p>
              </div>

              {/* Publish Date */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800 block">Tanggal Pengumuman Resmi</label>
                <input
                  type="date"
                  value={configForm.publishDate}
                  onChange={(e) => setConfigForm({ ...configForm, publishDate: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              {/* Detail Scores Visibility */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Visibilitas Nilai Angka</span>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={configForm.allowApplicantsViewDetailScores}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        allowApplicantsViewDetailScores: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-[#0F2137] rounded"
                  />
                  <span className="font-semibold text-slate-700">Tampilkan Nilai Rinci</span>
                </label>
              </div>

              {/* Download Letter Permission */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Unduh Surat Keterangan</span>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={configForm.allowApplicantsDownloadLetter}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        allowApplicantsDownloadLetter: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-[#0F2137] rounded"
                  />
                  <span className="font-semibold text-slate-700">Izinkan Unduh SK Resmi</span>
                </label>
              </div>
            </div>

            {/* Signatory Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Penandatangan Surat Keputusan (SK)
                </label>
                <input
                  type="text"
                  value={configForm.signatoryName || ''}
                  onChange={(e) => setConfigForm({ ...configForm, signatoryName: e.target.value })}
                  placeholder="Contoh: KH. M. Zainul Muttaqin, M.Ag."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jabatan Penandatangan
                </label>
                <input
                  type="text"
                  value={configForm.signatoryTitle || ''}
                  onChange={(e) => setConfigForm({ ...configForm, signatoryTitle: e.target.value })}
                  placeholder="Contoh: Pengasuh & Pimpinan Pondok Pesantren Salamatul Insan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-[#0F2137] hover:bg-[#162D4A] flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {savingConfig && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Pengaturan Publikasi</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TOP METRICS ROW: 7 STATISTIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Total Calon Peserta */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Pendaftar
          </span>
          <p className="font-serif font-bold text-xl sm:text-2xl text-[#0F2137] mt-1">
            {stats?.totalApplicants || results.length}
          </p>
          <span className="text-[10px] text-slate-500">Santri terdata</span>
        </div>

        {/* 2. Belum Mengikuti Tes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Belum Tes
          </span>
          <p className="font-serif font-bold text-xl sm:text-2xl text-slate-600 mt-1">
            {stats?.yetToTest ?? 0}
          </p>
          <span className="text-[10px] text-slate-500">Menunggu jadwal</span>
        </div>

        {/* 3. Selesai Tes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Selesai Tes
          </span>
          <p className="font-serif font-bold text-xl sm:text-2xl text-blue-700 mt-1">
            {stats?.testedCount ?? 0}
          </p>
          <span className="text-[10px] text-blue-600">Telah ujian</span>
        </div>

        {/* 4. Penilaian Belum Lengkap */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            Belum Lengkap
          </span>
          <p className="font-serif font-bold text-xl sm:text-2xl text-amber-800 mt-1">
            {stats?.incompleteAssessmentCount ?? 0}
          </p>
          <span className="text-[10px] text-amber-700">Perlu dinilai</span>
        </div>

        {/* 5. Lulus */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Lulus Seleksi
          </span>
          <p className="font-serif font-bold text-xl sm:text-2xl text-emerald-800 mt-1">
            {stats?.acceptedCount ?? 0}
          </p>
          <span className="text-[10px] text-emerald-700">Diterima resmi</span>
        </div>

        {/* 6. Tidak Lulus */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
            Tidak Lulus
          </span>
          <p className="font-serif font-bold text-xl sm:text-2xl text-rose-800 mt-1">
            {stats?.rejectedCount ?? 0}
          </p>
          <span className="text-[10px] text-rose-700">Belum lolos</span>
        </div>

        {/* 7. Menunggu Keputusan */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Menunggu SK
          </span>
          <p className="font-serif font-bold text-xl sm:text-2xl text-amber-600 mt-1">
            {stats?.pendingDecision ?? 0}
          </p>
          <span className="text-[10px] text-slate-500">Siap disahkan</span>
        </div>
      </div>

      {/* ANALYTICS PANELS: GRADE DISTRIBUTION & TIER BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Score Distribution Histogram (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-[#0F2137] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#B8860B]" />
                <span>Distribusi Nilai Akhir Terbobot Santri</span>
              </h3>
              <p className="text-xs text-slate-500">
                Sebaran perolehan skor terakumulasi (Passing Grade Standar: 70)
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#0F2137]">
              {results.length} Santri
            </span>
          </div>

          {/* Histogram Bars */}
          <div className="space-y-3 pt-2">
            {[
              {
                label: '90 - 100 (Mumtaz / Istimewa)',
                count: analytics.distribution.ninetyTo100,
                color: 'bg-emerald-600',
                badge: 'Mumtaz',
              },
              {
                label: '80 - 89 (Jayyid Jiddan / Amat Baik)',
                count: analytics.distribution.eightyTo89,
                color: 'bg-emerald-500',
                badge: 'Sangat Baik',
              },
              {
                label: '70 - 79 (Jayyid / Lulus Standar)',
                count: analytics.distribution.seventyTo79,
                color: 'bg-blue-600',
                badge: 'Baik (Lulus)',
              },
              {
                label: '60 - 69 (Maqbul / Di Bawah Target)',
                count: analytics.distribution.sixtyTo69,
                color: 'bg-amber-500',
                badge: 'Kurang',
              },
              {
                label: '< 60 (Dhaif / Belum Memenuhi)',
                count: analytics.distribution.under60,
                color: 'bg-rose-500',
                badge: 'Tidak Lulus',
              },
            ].map((bucket, i) => {
              const total = results.length || 1;
              const pct = Math.round((bucket.count / total) * 100);
              return (
                <div key={i} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700">{bucket.label}</span>
                    <span className="font-mono text-slate-500">
                      <strong>{bucket.count}</strong> santri ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bucket.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Breakdown by Education Tier (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-[#0F2137] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#B8860B]" />
                <span>Statistik per Jenjang Pendidikan</span>
              </h3>
              <p className="text-xs text-slate-500">
                Ringkasan kuota dan tingkat kelulusan tiap program
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {Object.entries(analytics.tierStats).map(([tierName, tStat]) => {
              const passRate = tStat.total > 0 ? Math.round((tStat.passed / tStat.total) * 100) : 0;
              return (
                <div
                  key={tierName}
                  className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{tierName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      Total: {tStat.total} Santri
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-emerald-700 block font-semibold">Lulus</span>
                      <span className="font-bold text-emerald-800 font-mono">{tStat.passed}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-rose-700 block font-semibold">Tidak Lulus</span>
                      <span className="font-bold text-rose-800 font-mono">{tStat.rejected}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-amber-700 block font-semibold">Menunggu</span>
                      <span className="font-bold text-amber-800 font-mono">{tStat.pending}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Tingkat Kelulusan:</span>
                    <strong className="text-slate-800 font-mono">{passRate}%</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-serif font-bold text-base text-[#0F2137]">
            Tabel Rekapitulasi & Pengesahan Hasil Seleksi
          </h3>
          <span className="text-xs text-slate-400">
            Menampilkan <strong>{filteredResults.length}</strong> dari {results.length} santri
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, no. registrasi..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
            />
          </div>

          {/* Jenjang Filter */}
          <div>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137] bg-white text-slate-700"
            >
              <option value="all">Semua Jenjang</option>
              <option value="Tsanawiyyah (MTs)">Tsanawiyyah (MTs)</option>
              <option value="Aliyah (MA)">Aliyah (MA)</option>
              <option value="Kulliyatul Mu'allimin (KMI)">KMI (Mu'allimin)</option>
            </select>
          </div>

          {/* Status Kelulusan Filter */}
          <div>
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137] bg-white text-slate-700"
            >
              <option value="all">Semua Keputusan</option>
              <option value="accepted">Lulus (Diterima)</option>
              <option value="rejected">Tidak Lulus</option>
              <option value="pending">Menunggu Keputusan</option>
            </select>
          </div>

          {/* Kelengkapan Nilai Filter */}
          <div>
            <select
              value={completenessFilter}
              onChange={(e) => setCompletenessFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137] bg-white text-slate-700"
            >
              <option value="all">Semua Kelengkapan</option>
              <option value="complete">Nilai Lengkap (5 Kategori)</option>
              <option value="incomplete">Penilaian Belum Lengkap</option>
            </select>
          </div>

          {/* Rentang Nilai Filter */}
          <div>
            <select
              value={scoreRangeFilter}
              onChange={(e) => setScoreRangeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137] bg-white text-slate-700"
            >
              <option value="all">Semua Rentang Nilai</option>
              <option value="mumtaz">Mumtaz (&gt;= 90)</option>
              <option value="high">Sangat Baik (80 - 89)</option>
              <option value="pass">Lulus Standar (70 - 79)</option>
              <option value="fail">Di Bawah Passing Grade (&lt; 70)</option>
            </select>
          </div>
        </div>

        {/* RESULTS TABLE */}
        {filteredResults.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-10 h-10 mx-auto text-slate-300" />
            <h4 className="font-semibold text-sm text-slate-700">Tidak Ditemukan Data Santri</h4>
            <p className="text-xs text-slate-400">
              Tidak ada hasil yang cocok dengan kriteria filter dan pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">No. Registrasi</th>
                  <th className="py-3 px-3">Nama Santri</th>
                  <th className="py-3 px-3">Jenjang</th>
                  <th className="py-3 px-3 text-center">Nilai CBT</th>
                  <th className="py-3 px-3 text-center">Nilai Akhir (100%)</th>
                  <th className="py-3 px-3 text-center">Kelengkapan</th>
                  <th className="py-3 px-3 text-center">Rekomendasi</th>
                  <th className="py-3 px-3 text-center">Keputusan Resmi</th>
                  <th className="py-3 px-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((item) => {
                  const dec = item.decision?.decision;
                  return (
                    <tr key={item.applicant.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#0F2137]">
                        {item.applicant.registrationNumber}
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800">{item.applicant.fullName}</p>
                        <p className="text-[10px] text-slate-400">
                          {item.applicant.guardianName} ({item.applicant.guardianPhone})
                        </p>
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {item.applicant.targetLevel}
                      </td>

                      <td className="py-3 px-3 text-center font-mono">
                        {item.cbtScore !== undefined ? (
                          <span className="font-semibold text-slate-800">{item.cbtScore}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-sm text-[#0F2137]">
                          {item.totalWeightedScore}
                        </span>
                        <span className="text-[10px] text-slate-400">/100</span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {item.isAllCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Lengkap</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800"
                            title={`Belum: ${item.missingCategories.join(', ')}`}
                          >
                            <AlertCircle className="w-3 h-3" />
                            <span>Kurang ({item.missingCategories.length})</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.autoRecommendation === 'Lulus'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.autoRecommendation === 'Tidak Lulus'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.autoRecommendation}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            dec === 'accepted'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : dec === 'rejected'
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {dec === 'accepted'
                            ? 'LULUS'
                            : dec === 'rejected'
                            ? 'TIDAK LULUS'
                            : 'MENUNGGU'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Detail & Reconciliation */}
                          <button
                            onClick={() => setSelectedItemForDetail(item)}
                            className="p-1.5 text-slate-600 hover:text-[#0F2137] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Detail Hasil & Rekonsiliasi Nilai"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Ratify / Edit Decision */}
                          <button
                            onClick={() => setSelectedItemForDecision(item)}
                            className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Sahkan / Ubah Keputusan Kelulusan"
                          >
                            <Award className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedItemForDetail && (
        <ApplicantDetailResultModal
          item={selectedItemForDetail}
          isOpen={!!selectedItemForDetail}
          onClose={() => setSelectedItemForDetail(null)}
          onDecisionUpdated={loadAll}
          userRole={profile?.role || 'admin'}
        />
      )}

      {/* DECISION RATIFICATION MODAL */}
      {selectedItemForDecision && (
        <DecisionModal
          item={selectedItemForDecision}
          isOpen={!!selectedItemForDecision}
          onClose={() => setSelectedItemForDecision(null)}
          onSuccess={loadAll}
        />
      )}

      {/* PRINT-READY OFFICIAL REPORT MODAL */}
      {showPrintModal && (
        <PrintReportModal
          results={results}
          categories={categories}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* AUDIT TRAIL MODAL */}
      {showAuditModal && (
        <AuditTrailModal
          isOpen={showAuditModal}
          onClose={() => setShowAuditModal(false)}
        />
      )}
    </div>
  );
};
