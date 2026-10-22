import React, { useState, useEffect } from 'react';
import {
  Applicant,
  TestCategory,
  ExaminerAssessment,
  AssessmentStatus,
} from '@/src/types';
import {
  submitExaminerManualAssessment,
  fetchExaminerAssessments,
} from '@/src/firebase/db';
import {
  BookOpen,
  Award,
  CheckCircle2,
  Save,
  PenTool,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
  FileText,
  User,
  Check,
} from 'lucide-react';

interface ManualEvaluationViewProps {
  applicant: Applicant;
  category: TestCategory;
  examinerId: string;
  examinerName: string;
  onSaved: (assessmentId: string) => void;
  onCancel: () => void;
}

interface RubricCriterion {
  id: string;
  title: string;
  weight: number; // percentage in this category e.g. 35
  description: string;
}

export const ManualEvaluationView: React.FC<ManualEvaluationViewProps> = ({
  applicant,
  category,
  examinerId,
  examinerName,
  onSaved,
  onCancel,
}) => {
  // Define standardized rubrics based on category code
  const getRubricCriteria = (code: string): RubricCriterion[] => {
    switch (code) {
      case 'BACA_QURAN':
        return [
          {
            id: 'makhraj',
            title: 'Makharijul Huruf (Tempat Keluarnya Huruf)',
            weight: 35,
            description: 'Ketepatan pelafalan huruf halqiyyah, lisan, syafawi, dan jauf.',
          },
          {
            id: 'tajwid',
            title: 'Hukum-Hukum Tajwid',
            weight: 35,
            description: 'Penerapan ghunnah, mad, qalqalah, idzhar, idgham, dan waqaf-ibtida.',
          },
          {
            id: 'fashahah',
            title: 'Fashahah & Kelancaran Tilawah',
            weight: 20,
            description: 'Irama bacaan tartil, kestabilan nafas, dan keindahan suara.',
          },
          {
            id: 'adab',
            title: 'Adab Tilawah Al-Qur\'an',
            weight: 10,
            description: 'Kesopanan posisi duduk, penghormatan terhadap mushaf, dan khusyuk.',
          },
        ];

      case 'HAFALAN':
        return [
          {
            id: 'kelancaran',
            title: 'Kelancaran & Ketepatan Sambung Ayat',
            weight: 40,
            description: 'Mampu menyambung ayat tanpa pengulangan fatal (tanpa syak/lupa).',
          },
          {
            id: 'tajwid_hafalan',
            title: 'Ketepatan Tajwid dalam Hafalan',
            weight: 35,
            description: 'Konsistensi panjang pendek mad dan kesempurnaan makhraj saat menghafal.',
          },
          {
            id: 'daya_ingat',
            title: 'Daya Tangkap & Kecepatan Respon Ayat',
            weight: 15,
            description: 'Ketepatan mengidentifikasi surah dan kelanjutan potongan ayat.',
          },
          {
            id: 'adab_hafalan',
            title: 'Adab & Kesiapan Mental Santri',
            weight: 10,
            description: 'Ketenangan saat diuji dan sopan santun di hadapan dewan penguji.',
          },
        ];

      case 'WAWANCARA':
        return [
          {
            id: 'motivasi',
            title: 'Motivasi & Keikhlasan Masuk Pesantren',
            weight: 35,
            description: 'Keinginan kuat dari santri sendiri (bukan paksaan orang tua).',
          },
          {
            id: 'kemandirian',
            title: 'Kemandirian & Kesiapan Hidup Berasrama',
            weight: 30,
            description: 'Kemampuan mengurus diri sendiri, adaptasi, dan disiplin waktu santri.',
          },
          {
            id: 'komitmen_wali',
            title: 'Komitmen & Sinergi Orang Tua/Wali Santri',
            weight: 25,
            description: 'Dukungan orang tua terhadap tata tertib, pembiayaan, dan pembinaan.',
          },
          {
            id: 'adab_santri',
            title: 'Tata Krama, Bahasa & Kesopanan',
            weight: 10,
            description: 'Sikap santun dalam bertutur kata dan merespons pertanyaan penguji.',
          },
        ];

      case 'PRAKTIK':
        return [
          {
            id: 'shalat',
            title: 'Praktik Bacaan & Gerakan Shalat Fardhu',
            weight: 45,
            description: 'Ketepatan tumaninah rukun fi\'li dan kefasihan rukun qauli shalat.',
          },
          {
            id: 'thaharah',
            title: 'Praktik Thaharah (Wudhu & Tayamum)',
            weight: 35,
            description: 'Urutan rukun wudhu yang benar, doa sesudah wudhu, dan syarat tayamum.',
          },
          {
            id: 'doa_harian',
            title: 'Hafalan Doa & Dzikir Harian',
            weight: 20,
            description: 'Hafalan doa sehari-hari (makan, tidur, keluar rumah, kedua orang tua).',
          },
        ];

      default:
        return [
          {
            id: 'kriteria_1',
            title: 'Kemampuan Substansi Materi',
            weight: 50,
            description: 'Penguasaan materi ujian yang diujikan.',
          },
          {
            id: 'kriteria_2',
            title: 'Penerapan Praktik & Metodologi',
            weight: 35,
            description: 'Ketepatan pelaksanaan tugas ujian.',
          },
          {
            id: 'kriteria_3',
            title: 'Adab & Sikap',
            weight: 15,
            description: 'Sopan santun dan kepatuhan terhadap arahan penguji.',
          },
        ];
    }
  };

  const criteria = getRubricCriteria(category.code);

  // Scores map: criterionId -> score (0-100)
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<string>('');
  const [recommendation, setRecommendation] = useState<
    'Sangat Direkomendasikan' | 'Direkomendasikan' | 'Dipertimbangkan' | 'Tidak Direkomendasikan'
  >('Direkomendasikan');
  const [assessmentStatus, setAssessmentStatus] = useState<AssessmentStatus>('final');
  const [existingId, setExistingId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing assessment if available
  useEffect(() => {
    const loadExisting = async () => {
      setLoading(true);
      try {
        const list = await fetchExaminerAssessments(applicant.id);
        const match = list.find((a) => a.categoryId === category.id);
        if (match) {
          setExistingId(match.id);
          setScores(match.rubricScores || {});
          setNotes(match.notes || '');
          setRecommendation(match.recommendation);
          setAssessmentStatus(match.status || 'final');
        } else {
          // Initialize default scores (80 on all criteria)
          const initial: Record<string, number> = {};
          criteria.forEach((c) => {
            initial[c.id] = 80;
          });
          setScores(initial);
        }
      } catch (err) {
        console.error('Error loading existing assessment:', err);
      } finally {
        setLoading(false);
      }
    };

    loadExisting();
  }, [applicant, category]);

  // Calculate weighted final category score
  const computedCategoryScore = Math.round(
    criteria.reduce((sum, c) => {
      const s = scores[c.id] !== undefined ? scores[c.id] : 80;
      return sum + (s * c.weight) / 100;
    }, 0)
  );

  const handleScoreChange = (id: string, val: number) => {
    setScores((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(100, val)),
    }));
  };

  const handleSave = async (statusToSave: AssessmentStatus) => {
    setSubmitting(true);
    try {
      const id = await submitExaminerManualAssessment({
        id: existingId,
        applicantId: applicant.id,
        applicantName: applicant.fullName,
        registrationNumber: applicant.registrationNumber,
        examinerId,
        examinerName,
        categoryId: category.id,
        categoryName: category.name,
        assessmentType:
          category.code === 'BACA_QURAN'
            ? 'quran_recitation'
            : category.code === 'HAFALAN'
            ? 'tahfidz'
            : category.code === 'WAWANCARA'
            ? 'interview'
            : 'practical',
        score: computedCategoryScore,
        rubricScores: scores,
        notes,
        recommendation,
        status: statusToSave,
      });

      alert(
        statusToSave === 'final'
          ? `Alhamdulillah! Penilaian FINAL untuk ${applicant.fullName} berhasil disahkan.`
          : `Penilaian DRAFT untuk ${applicant.fullName} berhasil disimpan.`
      );
      onSaved(id);
    } catch (err: any) {
      alert('Gagal menyimpan penilaian: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0F2137]" />
        <span>Memuat rubrik penilaian penguji...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <span className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            LEMBAR PENGUJI RESMI
          </span>
          <h2 className="font-serif text-xl font-bold text-[#0F2137]">
            {category.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Penguji: <strong className="text-slate-800">{examinerName}</strong> • Passing Grade: {category.passingScore}
          </p>
        </div>

        <button
          onClick={onCancel}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto"
        >
          Kembali ke Antrean
        </button>
      </div>

      {/* Santri Info Banner */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-medium">Nama Calon Santri</span>
          <span className="font-bold text-slate-800">{applicant.fullName}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-medium">No. Registrasi</span>
          <span className="font-mono font-bold text-[#0F2137]">{applicant.registrationNumber}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-medium">Jenjang Target</span>
          <span className="font-semibold text-slate-800">{applicant.targetLevel}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-medium">Asal Sekolah</span>
          <span className="font-semibold text-slate-800">{applicant.previousSchool || '-'}</span>
        </div>
      </div>

      {/* Rubrics Form */}
      <div className="space-y-4">
        <h3 className="font-serif font-bold text-sm text-[#0F2137] flex items-center gap-2">
          <Award className="w-4 h-4 text-[#B8860B]" />
          <span>Kriteria & Rentang Skor Penilaian</span>
        </h3>

        <div className="space-y-3">
          {criteria.map((c) => {
            const currentScore = scores[c.id] !== undefined ? scores[c.id] : 80;
            return (
              <div
                key={c.id}
                className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/90 space-y-2 hover:border-[#0F2137]/30 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-semibold text-xs text-slate-800">
                      {c.title} <span className="text-[#B8860B] font-normal">(Bobot {c.weight}%)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{c.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={currentScore}
                      onChange={(e) => handleScoreChange(c.id, Number(e.target.value))}
                      className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-white border border-slate-300 rounded-lg text-[#0F2137]"
                    />
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                </div>

                {/* Score Slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentScore}
                  onChange={(e) => handleScoreChange(c.id, Number(e.target.value))}
                  className="w-full accent-[#0F2137] cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Kurang (&lt;60)</span>
                  <span>Cukup (60-74)</span>
                  <span>Jayyid (75-89)</span>
                  <span>Mumtaz (90-100)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calculated Weighted Score */}
      <div className="p-4 bg-gradient-to-r from-[#0F2137] via-[#162D4A] to-[#0A1626] text-white rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#D4AF37] block">
            Nilai Akhir Kategori (Otomatis Terbobot)
          </span>
          <p className="text-xs text-slate-300">
            Dihitung dari seluruh kriteria rubrik materi {category.name}
          </p>
        </div>
        <div className="text-right">
          <span className="font-serif text-3xl font-bold text-[#E5C05B]">
            {computedCategoryScore}
          </span>
          <span className="text-xs text-slate-300 block">/ 100</span>
        </div>
      </div>

      {/* Recommendation & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Rekomendasi Dewan Penguji *
          </label>
          <select
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
          >
            <option value="Sangat Direkomendasikan">Sangat Direkomendasikan (Mumtaz)</option>
            <option value="Direkomendasikan">Direkomendasikan (Jayyid Jiddan)</option>
            <option value="Dipertimbangkan">Dipertimbangkan (Perlu Pembinaan Tambahan)</option>
            <option value="Tidak Direkomendasikan">Tidak Direkomendasikan</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Catatan Kualitatif Penguji
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan mengenai kefasihan, adab, atau masukan untuk pembina asrama..."
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
          />
        </div>
      </div>

      {/* Actions: Save Draft vs Save Final */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500">
          * Status <strong>Final</strong> akan mengunci nilai dan mencatatkannya pada rekap nilai sementara santri.
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={submitting}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Simpan Sebagai Draft
          </button>

          <button
            type="button"
            onClick={() => handleSave('final')}
            disabled={submitting}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Sahkan Penilaian Final</span>
          </button>
        </div>
      </div>
    </div>
  );
};
