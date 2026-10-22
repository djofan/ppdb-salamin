import React, { useState, useEffect } from 'react';
import { TemporaryRecap } from '@/src/types';
import { fetchTemporaryRecap } from '@/src/firebase/db';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  X,
  Loader2,
  Award,
  BookOpen,
  ShieldAlert,
  Percent,
} from 'lucide-react';

interface TemporaryRecapModalProps {
  applicantId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TemporaryRecapModal: React.FC<TemporaryRecapModalProps> = ({
  applicantId,
  isOpen,
  onClose,
}) => {
  const [recap, setRecap] = useState<TemporaryRecap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !applicantId) return;

    const loadRecap = async () => {
      setLoading(true);
      try {
        const data = await fetchTemporaryRecap(applicantId);
        setRecap(data);
      } catch (err) {
        console.error('Failed to load temporary recap:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRecap();
  }, [applicantId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              PANITIA PPDB SALAMATUL INSAN
            </span>
            <h3 className="font-serif font-bold text-lg text-[#0F2137] mt-0.5">
              Lembar Rekapitulasi Nilai Sementara
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0F2137]" />
            <span>Menghitung rekapitulasi nilai seluruh materi seleksi...</span>
          </div>
        ) : !recap ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Data santri tidak ditemukan.
          </div>
        ) : (
          <div className="space-y-5 text-xs">
            {/* Applicant Identity Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Nama Santri</span>
                <span className="font-bold text-slate-800">{recap.applicant.fullName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">No. Registrasi</span>
                <span className="font-mono font-bold text-[#0F2137]">{recap.applicant.registrationNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Jenjang</span>
                <span className="font-semibold text-slate-800">{recap.applicant.targetLevel}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Gender</span>
                <span className="font-semibold text-slate-800">{recap.applicant.gender}</span>
              </div>
            </div>

            {/* Completeness Status Warning */}
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                recap.allMandatoryGraded
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50/70 border-amber-300 text-amber-950'
              }`}
            >
              {recap.allMandatoryGraded ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="font-bold">
                  {recap.allMandatoryGraded
                    ? 'Penilaian Lengkap - Siap Dirapatkan'
                    : 'Penilaian Belum Lengkap (Masih Bersifat Sementara)'}
                </p>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {recap.allMandatoryGraded
                    ? 'Seluruh kategori materi wajib telah dinilai dan disahkan. Nilai akhir siap diproses untuk penetapan Surat Keputusan Kelulusan.'
                    : `Terdapat kategori materi yang belum selesai dinilai: ${recap.missingCategories.join(
                        ', '
                      )}. Keputusan kelulusan tidak dapat disahkan sebelum seluruh kategori wajib lengkap.`}
                </p>
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div>
              <h4 className="font-serif font-bold text-sm text-[#0F2137] mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#B8860B]" />
                <span>Rincian Nilai per Kategori Materi Seleksi:</span>
              </h4>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <tr>
                      <th className="p-3">Materi Tes</th>
                      <th className="p-3">Bobot</th>
                      <th className="p-3">Rincian CBT / Rubrik</th>
                      <th className="p-3">Nilai</th>
                      <th className="p-3">Terbobot</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recap.categoryScores.map((item) => (
                      <tr key={item.category.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">
                          {item.category.name}
                          {item.examinerName && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              Penguji: {item.examinerName}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">{item.category.weight}%</td>
                        <td className="p-3 text-slate-600 text-[11px]">
                          {item.category.testType === 'computer_based' ? (
                            item.correctCount !== undefined ? (
                              <span>
                                ✓ {item.correctCount} benar, ✗ {item.wrongCount} salah
                              </span>
                            ) : (
                              <span className="text-slate-400">Belum mengerjakan CBT</span>
                            )
                          ) : (
                            <span className="italic text-slate-500">
                              {item.notes ? `"${item.notes}"` : 'Ujian Praktik / Lisan'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold font-mono text-[#0F2137]">
                          {item.status !== 'pending' ? item.score : '-'}
                        </td>
                        <td className="p-3 font-bold font-mono text-emerald-700">
                          {item.status !== 'pending' ? item.weightedScore : '-'}
                        </td>
                        <td className="p-3">
                          {item.status === 'final' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Selesai
                            </span>
                          )}
                          {item.status === 'draft' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Draft
                            </span>
                          )}
                          {item.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                              Belum Dinilai
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Weighted Score Box */}
            <div className="p-4 bg-[#0F2137] text-white rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#D4AF37] block">
                  Nilai Akhir Terbobot Akumulatif
                </span>
                <p className="text-xs text-slate-300">
                  {recap.allMandatoryGraded
                    ? 'Total dari seluruh bobot 100% materi ujian'
                    : 'Nilai sementara dari kategori yang telah disahkan'}
                </p>
              </div>
              <div className="text-right">
                <span className="font-serif text-3xl font-bold text-[#E5C05B]">
                  {recap.totalWeightedScore}
                </span>
                <span className="text-xs text-slate-300 block">/ 100</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Rekap</span>
              </button>

              <button
                onClick={onClose}
                className="py-2 px-4 bg-[#0F2137] hover:bg-[#162D4A] text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
