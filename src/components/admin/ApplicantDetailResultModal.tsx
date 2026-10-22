import React, { useState } from 'react';
import { ConsolidatedResultItem } from '@/src/types';
import { DecisionModal } from './DecisionModal';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  X,
  Award,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  Percent,
  User,
  GraduationCap,
  Calendar,
  Sparkles,
  ChevronRight,
  Edit,
} from 'lucide-react';

interface ApplicantDetailResultModalProps {
  item: ConsolidatedResultItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDecisionUpdated: () => void;
  userRole?: string;
}

export const ApplicantDetailResultModal: React.FC<ApplicantDetailResultModalProps> = ({
  item,
  isOpen,
  onClose,
  onDecisionUpdated,
  userRole = 'admin',
}) => {
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  if (!isOpen || !item) return null;

  const { applicant, categoryScores, totalWeightedScore, isAllCompleted, missingCategories, decision } =
    item;

  const isAdmin = userRole === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 sm:p-7 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0F2137] text-[#D4AF37] flex items-center justify-center font-bold text-lg shadow-sm border border-[#D4AF37]/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0F2137] bg-slate-100 px-2 py-0.5 rounded">
                  {applicant.registrationNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    decision?.decision === 'accepted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : decision?.decision === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {decision?.decision === 'accepted'
                    ? 'LULUS (DITERIMA)'
                    : decision?.decision === 'rejected'
                    ? 'TIDAK LULUS'
                    : 'MENUNGGU KEPUTUSAN'}
                </span>
              </div>
              <h2 className="font-serif font-bold text-xl text-[#0F2137] mt-1">
                {applicant.fullName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Identity & Target Tier Grid */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Jenjang Tujuan</span>
            <span className="font-bold text-slate-800">{applicant.targetLevel}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Jenis Kelamin</span>
            <span className="font-semibold text-slate-800">{applicant.gender}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Asal Sekolah</span>
            <span className="font-semibold text-slate-800">{applicant.previousSchool || '-'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Wali & Kontak</span>
            <span className="font-semibold text-slate-800 truncate block">
              {applicant.guardianName} ({applicant.guardianPhone})
            </span>
          </div>
        </div>

        {/* Overall Weighted Score Banner */}
        <div className="bg-gradient-to-r from-[#0F2137] to-[#162D4A] rounded-2xl p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#D4AF37]/30">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider block">
              Nilai Akhir Terbobot (100%)
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-serif text-3xl font-bold text-white">{totalWeightedScore}</span>
              <span className="text-xs text-slate-300">/ 100</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-300 block">Status Penilaian:</span>
              <span
                className={`text-xs font-bold ${
                  isAllCompleted ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {isAllCompleted ? '✓ Lengkap Seluruh Kategori' : '⚠ Belum Lengkap'}
              </span>
            </div>
          </div>
        </div>

        {/* Completeness Warning */}
        {!isAllCompleted && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Kategori Wajib Belum Selesai Dinilai:</span>
              <p className="text-[11px] text-amber-800">
                Santri ini belum memiliki penilaian final untuk:{' '}
                <strong>{missingCategories.join(', ')}</strong>. Keputusan kelulusan final tidak
                dapat disahkan hingga seluruh penguji menyelesaikan rubrik.
              </p>
            </div>
          </div>
        )}

        {/* Category Breakdown Breakdown Cards */}
        <div className="space-y-3">
          <h4 className="font-serif font-bold text-sm text-[#0F2137] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#B8860B]" />
            <span>Rincian Nilai per Kategori Tes & Kontribusi Bobot</span>
          </h4>

          <div className="space-y-2.5">
            {Object.entries(categoryScores).map(([catId, cs]) => {
              const categoryNameMap: Record<string, string> = {
                cat_akademik: 'Tes Akademik (CBT Online)',
                cat_baca_quran: "Tes Baca Al-Qur'an (Tilawah & Tajwid)",
                cat_hafalan: 'Tes Hafalan (Tahfidz Juz Terpilih)',
                cat_wawancara: 'Tes Wawancara (Kepribadian & Komitmen)',
                cat_praktik: 'Tes Praktik (Wudhu & Shalat Fardhu)',
              };
              const catTitle = categoryNameMap[catId] || catId;

              return (
                <div
                  key={catId}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs space-y-2 hover:bg-white transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{catTitle}</span>
                      <span className="text-[10px] text-slate-400 ml-2 font-mono">
                        (Bobot: {cs.weight}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#0F2137]">
                        {cs.score} <span className="text-[10px] text-slate-400">pts</span>
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          cs.status === 'final'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {cs.status === 'final' ? 'Dinilai' : 'Draf/Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar showing weighted contribution */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cs.score >= cs.passingScore ? 'bg-[#0F2137]' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(100, Math.max(0, cs.score))}%` }}
                    />
                  </div>

                  {/* Detailed Examiner Notes (Hidden from non-admins if sensitive) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 gap-1">
                    <span>
                      Penguji: <strong>{cs.examinerName || '-'}</strong>
                    </span>
                    <span>
                      Kontribusi Bobot:{' '}
                      <strong className="text-[#0F2137] font-mono">+{cs.weightedScore} poin</strong>
                    </span>
                  </div>

                  {cs.notes && isAdmin && (
                    <div className="bg-amber-50/80 p-2 rounded-xl text-[11px] text-amber-900 border border-amber-200/60">
                      <span className="font-semibold">Catatan Penguji:</span> {cs.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Existing Decision Card if any */}
        {decision && (
          <div className="p-4 rounded-2xl border-2 border-[#D4AF37]/50 bg-amber-50/30 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-sm text-[#0F2137] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#B8860B]" />
                <span>Keputusan Panitia PPDB</span>
              </span>
              <span className="font-mono text-[11px] font-bold text-slate-700">
                {decision.decreeNumber || 'SK-PPDB/2026/RESMI'}
              </span>
            </div>
            <p className="text-slate-700">{decision.notes}</p>
            <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[10px] text-slate-500">
              <span>Oleh: {decision.decidedByName || 'Panitia Seleksi'}</span>
              <span>Ditetapkan: {new Date(decision.decidedAt).toLocaleString('id-ID')}</span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => window.print()}
            className="py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap</span>
          </button>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowDecisionModal(true)}
                className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#0F2137] hover:bg-[#162D4A] flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Award className="w-4 h-4 text-[#D4AF37]" />
                <span>{decision ? 'Perbarui Keputusan' : 'Sahkan Keputusan'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      {showDecisionModal && (
        <DecisionModal
          item={item}
          isOpen={showDecisionModal}
          onClose={() => setShowDecisionModal(false)}
          onSuccess={() => {
            onDecisionUpdated();
            setShowDecisionModal(false);
          }}
        />
      )}
    </div>
  );
};
