import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import {
  fetchApplicants,
  fetchExaminerAssessments,
  fetchTestCategories,
} from '@/src/firebase/db';
import { Applicant, ExaminerAssessment, TestCategory } from '@/src/types';
import { StatusBadge } from '@/src/components/common/StatusBadge';
import { ManualEvaluationView } from './ManualEvaluationView';
import { TemporaryRecapModal } from '@/src/components/common/TemporaryRecapModal';
import {
  BookOpenCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  Award,
  Search,
  PenTool,
  Loader2,
  Sparkles,
  FileText,
  Filter,
  Eye,
} from 'lucide-react';

export const ExaminerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [assessments, setAssessments] = useState<ExaminerAssessment[]>([]);
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Evaluating State
  const [evaluatingApplicant, setEvaluatingApplicant] = useState<Applicant | null>(null);
  const [evaluatingCategory, setEvaluatingCategory] = useState<TestCategory | null>(null);

  // Recap Modal State
  const [recapApplicantId, setRecapApplicantId] = useState<string | null>(null);

  // Filter for Queue
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [apps, asms, cats] = await Promise.all([
        fetchApplicants(),
        fetchExaminerAssessments(),
        fetchTestCategories(),
      ]);
      setApplicants(apps);
      setAssessments(asms);
      setCategories(cats);
    } catch (err) {
      console.error('Error loading examiner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter manual categories only (exclude computer_based)
  const manualCategories = categories.filter((c) => c.testType !== 'computer_based');

  const handleStartEvaluation = (app: Applicant, targetCat?: TestCategory) => {
    setEvaluatingApplicant(app);
    setEvaluatingCategory(targetCat || manualCategories[0] || categories[0]);
  };

  const handleEvaluationSaved = async () => {
    setEvaluatingApplicant(null);
    setEvaluatingCategory(null);
    await loadData();
  };

  // Filtered queue of applicants
  const queueApplicants = applicants.filter((a) => {
    const matchesSearch =
      a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && !a.isArchived;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#0F2137] via-[#162D4A] to-[#0A1626] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-[#D4AF37]/30">
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#D4AF37] text-xs font-semibold mb-3 border border-white/10">
            <BookOpenCheck className="w-3.5 h-3.5" />
            <span>Portal Dewan Penguji & Musyrif</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Lembar Tugas & Penilaian Seleksi Santri
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Ahlan wa sahlan, <span className="text-white font-semibold">{profile?.displayName}</span>. 
            Lakukan pengujian lisan (Baca Al-Qur'an, Hafalan), wawancara santri/wali, serta praktik ibadah dengan rubrik terstandar.
          </p>
        </div>
      </div>

      {/* Evaluating View Modal / Screen */}
      {evaluatingApplicant && evaluatingCategory && (
        <div className="space-y-4">
          {/* Category Selector Tabs during evaluation */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-500 px-3">Pilih Materi Uji:</span>
            {manualCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setEvaluatingCategory(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  evaluatingCategory.id === c.id
                    ? 'bg-[#0F2137] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <ManualEvaluationView
            applicant={evaluatingApplicant}
            category={evaluatingCategory}
            examinerId={profile?.uid || 'examiner_wildan'}
            examinerName={profile?.displayName || 'Ust. Ahmad Fauzan, Lc.'}
            onSaved={handleEvaluationSaved}
            onCancel={() => {
              setEvaluatingApplicant(null);
              setEvaluatingCategory(null);
            }}
          />
        </div>
      )}

      {/* Main Dashboard Grid */}
      {!evaluatingApplicant && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Queue of Santri to Test (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-serif font-bold text-base text-[#0F2137]">
                  Daftar Antrean Ujian Santri
                </h3>
                <p className="text-xs text-slate-500">
                  Calon santri yang dijadwalkan untuk pengujian lisan & wawancara
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari santri..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137] w-44"
                />
              </div>
            </div>

            {queueApplicants.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-semibold text-slate-700 text-sm">Tidak Ada Antrean Santri</p>
                <p className="text-xs text-slate-400">Seluruh santri telah dievaluasi atau kriteria tidak cocok.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {queueApplicants.map((app) => (
                  <div
                    key={app.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-3 rounded-2xl transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#0F2137] bg-slate-100 px-2 py-0.5 rounded">
                          {app.registrationNumber}
                        </span>
                        <StatusBadge status={app.status} size="sm" />
                      </div>
                      <h4 className="font-semibold text-slate-800 text-sm">{app.fullName}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-3">
                        <span>Jenjang: <strong className="text-slate-700">{app.targetLevel}</strong></span>
                        <span>•</span>
                        <span>Gender: {app.gender}</span>
                        <span>•</span>
                        <span>Wali: {app.guardianName}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Recap Modal button */}
                      <button
                        onClick={() => setRecapApplicantId(app.id)}
                        className="p-2 text-slate-500 hover:text-[#0F2137] hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                        title="Lihat Rekap Nilai Sementara"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Evaluate button */}
                      <button
                        onClick={() => handleStartEvaluation(app)}
                        className="px-4 py-2 bg-[#0F2137] hover:bg-[#162D4A] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <PenTool className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Buka Lembar Uji</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Finished Assessments (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-serif font-bold text-base text-[#0F2137]">
                Riwayat Penilaian Disimpan
              </h3>
              <p className="text-xs text-slate-500">Nilai yang telah Anda masukkan ke sistem</p>
            </div>

            {assessments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada penilaian yang tersimpan
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {assessments.map((asm) => (
                  <div
                    key={asm.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-xs text-slate-800">{asm.applicantName}</p>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              asm.status === 'final'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {asm.status || 'final'}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {asm.registrationNumber} • {asm.categoryName || 'Materi Lisan'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[#0F2137] font-serif">
                          {asm.score}
                        </span>
                        <span className="text-[10px] text-slate-400 block">/ 100</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                      <p className="font-semibold text-emerald-700">★ {asm.recommendation}</p>
                      {asm.notes && (
                        <p className="text-slate-500 mt-1 italic text-[10px] line-clamp-2">
                          "{asm.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Temporary Recap Modal */}
      {recapApplicantId && (
        <TemporaryRecapModal
          applicantId={recapApplicantId}
          isOpen={true}
          onClose={() => setRecapApplicantId(null)}
        />
      )}
    </div>
  );
};
