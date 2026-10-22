import React, { useState } from 'react';
import { ConsolidatedResultItem, TestCategory } from '@/src/types';
import { Printer, Download, X, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface PrintReportModalProps {
  results: ConsolidatedResultItem[];
  categories: TestCategory[];
  isOpen: boolean;
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  results,
  categories,
  isOpen,
  onClose,
}) => {
  const [reportType, setReportType] = useState<'recap' | 'decisions' | 'incomplete'>('recap');

  if (!isOpen) return null;

  // Filtered dataset according to selected report
  const filteredResults = results.filter((r) => {
    if (reportType === 'recap') return true;
    if (reportType === 'decisions') {
      return (
        r.decision?.decision === 'accepted' ||
        r.decision?.decision === 'rejected' ||
        r.autoRecommendation === 'Lulus' ||
        r.autoRecommendation === 'Tidak Lulus'
      );
    }
    if (reportType === 'incomplete') {
      return !r.isAllCompleted || !r.decision;
    }
    return true;
  });

  const passedCount = results.filter((r) => r.decision?.decision === 'accepted').length;
  const rejectedCount = results.filter((r) => r.decision?.decision === 'rejected').length;
  const pendingCount = results.filter((r) => !r.decision || r.decision.decision === 'pending').length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl p-6 space-y-6 max-h-[92vh] overflow-y-auto print:max-w-none print:p-0 print:border-none print:shadow-none print:overflow-visible">
        {/* Modal Controls - Hidden when Printing */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
          <div>
            <h3 className="font-serif font-bold text-lg text-[#0F2137]">
              Cetak Laporan Resmi PPDB Salamatul Insan
            </h3>
            <p className="text-xs text-slate-500">
              Pilih format dokumen resmi ber-Kop Surat untuk dicetak atau disimpan sebagai PDF
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#0F2137] hover:bg-[#162D4A] flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#D4AF37]" />
              <span>Cetak / Cetak PDF</span>
            </button>
            <button
              onClick={onClose}
              className="py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Report Type Selector - Hidden when Printing */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 print:hidden text-xs">
          <button
            type="button"
            onClick={() => setReportType('recap')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              reportType === 'recap'
                ? 'bg-[#0F2137] text-white border-[#0F2137] shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="font-bold block">1. Rekapitulasi Nilai</span>
            <span className="text-[10px] opacity-80">Rincian 5 kategori & nilai akhir 100%</span>
          </button>

          <button
            type="button"
            onClick={() => setReportType('decisions')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              reportType === 'decisions'
                ? 'bg-[#0F2137] text-white border-[#0F2137] shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="font-bold block">2. Daftar Kelulusan Santri</span>
            <span className="text-[10px] opacity-80">Peserta lulus & tidak lulus resmi</span>
          </button>

          <button
            type="button"
            onClick={() => setReportType('incomplete')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              reportType === 'incomplete'
                ? 'bg-[#0F2137] text-white border-[#0F2137] shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="font-bold block">3. Penilaian Belum Lengkap</span>
            <span className="text-[10px] opacity-80">Daftar santri butuh tindakan penguji</span>
          </button>
        </div>

        {/* ================= PRINT AREA ================= */}
        <div className="p-4 sm:p-8 bg-white border border-slate-100 rounded-2xl print:border-none print:p-0 space-y-6 text-[#0F2137]">
          {/* PESANTREN OFFICIAL LETTERHEAD (KOP SURAT RESMI) */}
          <div className="border-b-4 border-double border-[#0F2137] pb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0F2137] flex items-center justify-center text-[#D4AF37] font-serif font-black text-2xl border-2 border-[#D4AF37]">
                SI
              </div>
              <div>
                <h1 className="font-serif font-black text-lg sm:text-xl tracking-wide text-[#0F2137]">
                  PONDOK PESANTREN SALAMATUL INSAN
                </h1>
                <p className="text-xs font-bold text-[#B8860B] uppercase tracking-wider">
                  PANITIA PENERIMAAN PESERTA DIDIK BARU (PPDB) TAHUN AJARAN 2026/2027
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Jl. Pesantren Salamatul Insan No. 12, Jawa Barat • Telp: (0231) 889922 • Email: ppdb@salamatulin-san.sch.id
                </p>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-400 font-mono hidden sm:block">
              <p>Dokumen Resmi</p>
              <p>PPDB-SI-2026</p>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center space-y-1">
            <h2 className="font-serif font-bold text-base sm:text-lg uppercase tracking-wide underline underline-offset-4 decoration-[#B8860B]">
              {reportType === 'recap' && 'LAPORAN REKAPITULASI HASIL PENILAIAN SELEKSI'}
              {reportType === 'decisions' && 'LAPORAN KEPUTUSAN HASIL KELULUSAN SANTRI BARU'}
              {reportType === 'incomplete' && 'LAPORAN PESERTA DENGAN PENILAIAN BELUM LENGKAP'}
            </h2>
            <p className="text-xs text-slate-500">
              Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
            </p>
          </div>

          {/* Summary Badges */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Total Data</span>
              <span className="font-bold text-[#0F2137]">{filteredResults.length} Santri</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Lulus</span>
              <span className="font-bold text-emerald-700">{passedCount} Santri</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Tidak Lulus</span>
              <span className="font-bold text-rose-700">{rejectedCount} Santri</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Menunggu/Draf</span>
              <span className="font-bold text-amber-700">{pendingCount} Santri</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-300">
                <tr>
                  <th className="py-2 px-2 border-r border-slate-200 text-center w-8">No</th>
                  <th className="py-2 px-2 border-r border-slate-200">No. Registrasi</th>
                  <th className="py-2 px-2 border-r border-slate-200">Nama Lengkap Santri</th>
                  <th className="py-2 px-2 border-r border-slate-200">Jenjang</th>

                  {reportType === 'recap' && (
                    <>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">CBT</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">Tilawah</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">Hafalan</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">Wwcr</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">Praktik</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">Total (100%)</th>
                    </>
                  )}

                  {reportType === 'decisions' && (
                    <>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">Nilai Akhir</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">Keputusan</th>
                      <th className="py-2 px-2 border-r border-slate-200">No. Surat Keputusan</th>
                    </>
                  )}

                  {reportType === 'incomplete' && (
                    <>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">Status Tes</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-rose-700">Kategori Belum Dinilai</th>
                    </>
                  )}

                  <th className="py-2 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredResults.map((r, idx) => {
                  return (
                    <tr key={r.applicant.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2 border-r border-slate-200 text-center">{idx + 1}</td>
                      <td className="py-2 px-2 border-r border-slate-200 font-mono font-bold">
                        {r.applicant.registrationNumber}
                      </td>
                      <td className="py-2 px-2 border-r border-slate-200 font-semibold">
                        {r.applicant.fullName}
                      </td>
                      <td className="py-2 px-2 border-r border-slate-200">{r.applicant.targetLevel}</td>

                      {reportType === 'recap' && (
                        <>
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-mono">
                            {r.cbtScore !== undefined ? r.cbtScore : '-'}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-mono">
                            {r.categoryScores['cat_baca_quran']?.score ?? '-'}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-mono">
                            {r.categoryScores['cat_hafalan']?.score ?? '-'}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-mono">
                            {r.categoryScores['cat_wawancara']?.score ?? '-'}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-mono">
                            {r.categoryScores['cat_praktik']?.score ?? '-'}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-bold font-mono text-[#0F2137]">
                            {r.totalWeightedScore}
                          </td>
                        </>
                      )}

                      {reportType === 'decisions' && (
                        <>
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-mono font-bold">
                            {r.decision?.finalScore ?? r.totalWeightedScore}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                (r.decision?.decision || r.autoRecommendation) === 'accepted' ||
                                (r.decision?.decision || r.autoRecommendation) === 'Lulus'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {(r.decision?.decision || r.autoRecommendation) === 'accepted' ||
                              (r.decision?.decision || r.autoRecommendation) === 'Lulus'
                                ? 'LULUS'
                                : 'TIDAK LULUS'}
                            </span>
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 font-mono text-[11px]">
                            {r.decision?.decreeNumber || '-'}
                          </td>
                        </>
                      )}

                      {reportType === 'incomplete' && (
                        <>
                          <td className="py-2 px-2 border-r border-slate-200 text-center">
                            {r.applicant.testStatus || 'Belum Tes'}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-rose-700 font-medium">
                            {r.missingCategories.length > 0
                              ? r.missingCategories.join(', ')
                              : 'Menunggu Pengesahan Keputusan'}
                          </td>
                        </>
                      )}

                      <td className="py-2 px-2 text-center">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            r.isAllCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.isAllCompleted ? 'Lengkap' : 'Belum Lengkap'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SIGNATURE SECTION (TANDA TANGAN RESMI PIMPINAN) */}
          <div className="pt-8 flex items-end justify-between text-xs">
            <div className="space-y-1 text-slate-500">
              <p>Mengetahui,</p>
              <p className="font-bold text-slate-800">Sekretaris Panitia PPDB</p>
              <div className="h-16" />
              <p className="font-bold text-slate-900 underline">Ust. Ahmad Fauzan, Lc., M.Ag.</p>
              <p className="text-[10px]">NIP. 201809.112</p>
            </div>

            <div className="text-right space-y-1 text-slate-500">
              <p>Ditetapkan di Cirebon, {new Date().toLocaleDateString('id-ID')}</p>
              <p className="font-bold text-slate-800">Pengasuh & Pimpinan Pondok Pesantren</p>
              <div className="h-16" />
              <p className="font-bold text-slate-900 underline">KH. M. Zainul Muttaqin, M.Ag.</p>
              <p className="text-[10px]">Pimpinan Pondok Pesantren Salamatul Insan</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
