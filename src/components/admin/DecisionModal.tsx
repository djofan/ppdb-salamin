import React, { useState } from 'react';
import { ConsolidatedResultItem } from '@/src/types';
import { submitAdmissionDecisionWithAudit } from '@/src/firebase/db';
import { useAuth } from '@/src/context/AuthContext';
import {
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Loader2,
  FileCheck,
  X,
} from 'lucide-react';

interface DecisionModalProps {
  item: ConsolidatedResultItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  item,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const [decision, setDecision] = useState<'accepted' | 'rejected' | 'pending'>(
    item.decision?.decision === 'accepted'
      ? 'accepted'
      : item.decision?.decision === 'rejected'
      ? 'rejected'
      : item.autoRecommendation === 'Lulus'
      ? 'accepted'
      : item.autoRecommendation === 'Tidak Lulus'
      ? 'rejected'
      : 'pending'
  );
  const [decreeNumber, setDecreeNumber] = useState<string>(
    item.decision?.decreeNumber || `SK-PPDB/2026/${item.applicant.registrationNumber.slice(-4)}`
  );
  const [notes, setNotes] = useState<string>(
    item.decision?.notes ||
      (decision === 'accepted'
        ? 'Dinyatakan Lulus Seleksi Masuk Santri Baru Pondok Pesantren Salamatul Insan TA 2026/2027.'
        : 'Mohon maaf, belum memenuhi syarat minimal kelulusan seleksi PPDB tahun ini.')
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Strict validation: Do not allow accepted decision if mandatory evaluations are incomplete!
    if (decision === 'accepted' && !item.isAllCompleted) {
      setErrorMessage(
        `Penilaian santri belum lengkap! Kategori yang belum dinilai: ${item.missingCategories.join(
          ', '
        )}. Pengesahan kelulusan hanya dapat dilakukan setelah seluruh kategori wajib selesai dinilai.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const actor = {
        uid: user?.uid || 'admin_sys',
        displayName: profile?.displayName || 'Panitia PPDB Salamatul Insan',
        role: profile?.role || 'admin',
      };

      await submitAdmissionDecisionWithAudit(
        {
          applicantId: item.applicant.id,
          applicantName: item.applicant.fullName,
          registrationNumber: item.applicant.registrationNumber,
          targetLevel: item.applicant.targetLevel,
          decision,
          finalScore: item.totalWeightedScore,
          decreeNumber: decreeNumber.trim(),
          notes: notes.trim(),
          isAllCompleted: item.isAllCompleted,
        },
        actor
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit decision:', err);
      setErrorMessage(err.message || 'Gagal menyimpan keputusan kelulusan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-200">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#0F2137]">
                Penetapan Keputusan Kelulusan
              </h3>
              <p className="text-xs text-slate-500">
                Pengesahan hasil akhir seleksi penerimaan santri baru
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Applicant Summary */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-[#0F2137]">{item.applicant.fullName}</span>
            <span className="font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
              {item.applicant.registrationNumber}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-200/60">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Jenjang</span>
              <span className="font-semibold">{item.applicant.targetLevel}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Skor Terbobot</span>
              <span className="font-bold text-sm text-[#0F2137]">{item.totalWeightedScore} / 100</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
            <span className="text-slate-500">Rekomendasi Otomatis:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                item.autoRecommendation === 'Lulus'
                  ? 'bg-emerald-100 text-emerald-800'
                  : item.autoRecommendation === 'Tidak Lulus'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {item.autoRecommendation}
            </span>
          </div>
        </div>

        {/* Completeness Warning if not completed */}
        {!item.isAllCompleted && (
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Perhatian: Penilaian Belum Lengkap!</span>
              <p className="text-[11px]">
                Kategori wajib berikut belum selesai dinilai:{' '}
                <strong>{item.missingCategories.join(', ')}</strong>. Keputusan 'Lulus' tidak
                dapat disahkan hingga tim penguji menuntaskan penilaian.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Decision Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">
              Status Keputusan Resmi *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecision('accepted')}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  decision === 'accepted'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Lulus</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('rejected')}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  decision === 'rejected'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 font-bold ring-2 ring-rose-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Tidak Lulus</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('pending')}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  decision === 'pending'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Menunggu</span>
              </button>
            </div>
          </div>

          {/* Decree Number */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nomor Surat Keputusan (SK) Panitia *
            </label>
            <input
              type="text"
              value={decreeNumber}
              onChange={(e) => setDecreeNumber(e.target.value)}
              placeholder="Contoh: SK-PPDB/2026/001"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137] font-mono"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Catatan / Pernyataan Resmi Keputusan *
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              required
              placeholder="Tuliskan keterangan resmi yang akan tertera pada surat keputusan santri..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="py-2 px-4 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="py-2 px-5 rounded-xl text-white bg-[#0F2137] hover:bg-[#162D4A] font-bold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileCheck className="w-4 h-4 text-[#D4AF37]" />
              )}
              <span>Sahkan Keputusan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
