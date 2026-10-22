import React, { useState, useEffect } from 'react';
import { AssessmentConfig, TestCategory } from '@/src/types';
import {
  fetchAssessmentConfig,
  saveAssessmentConfig,
  updateTestCategory,
  DEFAULT_ASSESSMENT_CONFIG,
} from '@/src/firebase/db';
import {
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Percent,
  Clock,
  Shuffle,
  Eye,
  Check,
  Save,
  Loader2,
  Award,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface AssessmentConfigViewProps {
  categories: TestCategory[];
  onReload: () => void;
}

export const AssessmentConfigView: React.FC<AssessmentConfigViewProps> = ({
  categories,
  onReload,
}) => {
  const [config, setConfig] = useState<AssessmentConfig>(DEFAULT_ASSESSMENT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Local weights map
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const cfg = await fetchAssessmentConfig();
        setConfig(cfg);

        // Initialize category weights from categories or config
        const initialWeights: Record<string, number> = {};
        categories.forEach((cat) => {
          if (cfg.categoryWeights && cfg.categoryWeights[cat.id] !== undefined) {
            initialWeights[cat.id] = cfg.categoryWeights[cat.id];
          } else {
            initialWeights[cat.id] = cat.weight || 20;
          }
        });
        setWeights(initialWeights);
      } catch (err) {
        console.error('Failed to load assessment config:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [categories]);

  const activeCategories = categories.filter((c) => c.active);

  // Calculate sum of active weights
  const currentTotalWeight = activeCategories.reduce(
    (sum, c) => sum + (weights[c.id] || 0),
    0
  );

  const isWeightValid = currentTotalWeight === 100;

  const handleWeightChange = (catId: string, val: number) => {
    setWeights((prev) => ({
      ...prev,
      [catId]: Math.max(0, Math.min(100, val)),
    }));
  };

  const handleAutoBalance = () => {
    if (activeCategories.length === 0) return;
    const base = Math.floor(100 / activeCategories.length);
    const remainder = 100 % activeCategories.length;

    const newWeights: Record<string, number> = { ...weights };
    activeCategories.forEach((cat, idx) => {
      newWeights[cat.id] = base + (idx < remainder ? 1 : 0);
    });
    setWeights(newWeights);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWeightValid) {
      alert(`Total bobot kategori saat ini ${currentTotalWeight}%. Harus bernilai tepat 100% untuk disimpan.`);
      return;
    }

    setSaving(true);
    try {
      // 1. Save global config
      await saveAssessmentConfig({
        categoryWeights: weights,
        passingGrade: Number(config.passingGrade),
        questionsPerExam: Number(config.questionsPerExam),
        shuffleQuestions: config.shuffleQuestions,
        shuffleOptions: config.shuffleOptions,
        defaultDurationMinutes: Number(config.defaultDurationMinutes),
        correctScore: Number(config.correctScore),
        wrongScore: Number(config.wrongScore),
        emptyScore: Number(config.emptyScore),
        showInstantResult: config.showInstantResult,
      });

      // 2. Also sync individual categories weights for consistency
      for (const cat of activeCategories) {
        if (weights[cat.id] !== undefined && weights[cat.id] !== cat.weight) {
          await updateTestCategory(cat.id, { weight: weights[cat.id] });
        }
      }

      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 4000);
      onReload();
    } catch (err: any) {
      alert('Gagal menyimpan konfigurasi penilaian: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0F2137]" />
        <span>Memuat parameter konfigurasi penilaian...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-2 text-xs text-emerald-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Konfigurasi penilaian dan bobot 100% berhasil disimpan ke Cloud Firestore.</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#0F2137]">
            Konfigurasi Formula Penilaian & Sistem Ujian
          </h2>
          <p className="text-xs text-slate-500">
            Tentukan bobot persentase kategori tes, passing grade, acak soal, sistem poin CBT, dan visibilitas hasil
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || !isWeightValid}
          className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#0F2137] hover:bg-[#162D4A] rounded-xl transition-all shadow-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-[#D4AF37]" />}
          <span>Simpan Konfigurasi Penilaian</span>
        </button>
      </div>

      {/* 1. Category Weights Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-serif font-bold text-sm text-[#0F2137] flex items-center gap-2">
              <Percent className="w-4 h-4 text-[#B8860B]" />
              <span>1. Bobot Persentase Materi Ujian (Wajib Total 100%)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Setiap kategori aktif berkontribusi terhadap nilai akhir akumulatif calon santri
            </p>
          </div>

          <button
            type="button"
            onClick={handleAutoBalance}
            className="self-start sm:self-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>Bagi Rata Otomatis</span>
          </button>
        </div>

        {/* Total Weight Verification Box */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
            isWeightValid
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
              : 'bg-rose-50/70 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isWeightValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <p className="font-bold">
                Total Akumulasi Bobot: {currentTotalWeight}%{' '}
                {isWeightValid ? '(Valid)' : '(Tidak Valid - Harus 100%)'}
              </p>
              <p className="text-[11px] opacity-80">
                {isWeightValid
                  ? 'Kombinasi bobot telah proporsional dan siap digunakan.'
                  : `Selisih: ${100 - currentTotalWeight > 0 ? '+' : ''}${100 - currentTotalWeight}%. Mohon atur bobot hingga pas 100%.`}
              </p>
            </div>
          </div>

          <span className="font-serif font-bold text-lg">
            {currentTotalWeight} / 100%
          </span>
        </div>

        {/* Weights Sliders/Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {activeCategories.map((cat) => {
            const currentVal = weights[cat.id] || 0;
            return (
              <div
                key={cat.id}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2"
              >
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{cat.name}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">Kode: {cat.code}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={currentVal}
                      onChange={(e) => handleWeightChange(cat.id, Number(e.target.value))}
                      min={0}
                      max={100}
                      className="w-16 px-2 py-1 text-right text-xs font-bold font-mono border border-slate-300 rounded-lg bg-white"
                    />
                    <span className="text-xs font-semibold text-slate-500">%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentVal}
                  onChange={(e) => handleWeightChange(cat.id, Number(e.target.value))}
                  className="w-full accent-[#0F2137] cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 2. Passing Grade & CBT Rules */}
      <div className="space-y-4">
        <h3 className="font-serif font-bold text-sm text-[#0F2137] flex items-center gap-2">
          <Award className="w-4 h-4 text-[#B8860B]" />
          <span>2. Standar Kelulusan (Passing Grade) & Ujian CBT</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Passing Grade */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="block font-semibold text-slate-700 mb-1">
              Passing Grade Minimum (0-100)
            </label>
            <p className="text-[11px] text-slate-400 mb-2">Nilai terbobot minimal untuk lulus seleksi</p>
            <input
              type="number"
              value={config.passingGrade}
              onChange={(e) => setConfig({ ...config, passingGrade: Number(e.target.value) })}
              min={0}
              max={100}
              required
              className="w-full px-3 py-2 text-sm font-bold text-[#0F2137] border border-slate-300 rounded-xl bg-white"
            />
          </div>

          {/* Questions Taken per Exam */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="block font-semibold text-slate-700 mb-1">
              Jumlah Soal CBT per Sesi
            </label>
            <p className="text-[11px] text-slate-400 mb-2">Jumlah butir soal yang diundi dari bank soal</p>
            <input
              type="number"
              value={config.questionsPerExam}
              onChange={(e) => setConfig({ ...config, questionsPerExam: Number(e.target.value) })}
              min={5}
              max={100}
              required
              className="w-full px-3 py-2 text-sm font-bold text-[#0F2137] border border-slate-300 rounded-xl bg-white"
            />
          </div>

          {/* Default Duration */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="block font-semibold text-slate-700 mb-1">
              Durasi Default Ujian (Menit)
            </label>
            <p className="text-[11px] text-slate-400 mb-2">Alokasi waktu pengerjaan soal CBT</p>
            <input
              type="number"
              value={config.defaultDurationMinutes}
              onChange={(e) => setConfig({ ...config, defaultDurationMinutes: Number(e.target.value) })}
              min={10}
              max={300}
              required
              className="w-full px-3 py-2 text-sm font-bold text-[#0F2137] border border-slate-300 rounded-xl bg-white"
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 3. Scoring System (Benar, Salah, Kosong) */}
      <div className="space-y-4">
        <h3 className="font-serif font-bold text-sm text-[#0F2137] flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#B8860B]" />
          <span>3. Kebijakan Penilaian Jawaban (Sistem Skor & Minus)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
            <span className="font-semibold text-emerald-900 block mb-1">Jawaban Benar</span>
            <p className="text-[11px] text-emerald-700 mb-2">Poin yang diperoleh tiap butir benar</p>
            <input
              type="number"
              value={config.correctScore}
              onChange={(e) => setConfig({ ...config, correctScore: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-emerald-300 rounded-xl bg-white text-xs font-bold"
            />
          </div>

          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl">
            <span className="font-semibold text-rose-900 block mb-1">Jawaban Salah</span>
            <p className="text-[11px] text-rose-700 mb-2">0 untuk tanpa penalti, -1 untuk sistem minus</p>
            <input
              type="number"
              value={config.wrongScore}
              onChange={(e) => setConfig({ ...config, wrongScore: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-rose-300 rounded-xl bg-white text-xs font-bold"
            />
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="font-semibold text-slate-800 block mb-1">Jawaban Dikosongkan</span>
            <p className="text-[11px] text-slate-500 mb-2">Poin bila tidak menjawab soal</p>
            <input
              type="number"
              value={config.emptyScore}
              onChange={(e) => setConfig({ ...config, emptyScore: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-bold"
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 4. Randomization & Visibility */}
      <div className="space-y-4">
        <h3 className="font-serif font-bold text-sm text-[#0F2137] flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-[#B8860B]" />
          <span>4. Pengacakan Soal & Visibilitas Hasil Santri</span>
        </h3>

        <div className="space-y-3 text-xs">
          <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100/70">
            <input
              type="checkbox"
              checked={config.shuffleQuestions}
              onChange={(e) => setConfig({ ...config, shuffleQuestions: e.target.checked })}
              className="w-4 h-4 accent-[#0F2137]"
            />
            <div>
              <span className="font-bold text-slate-800">Acak Urutan Butir Soal (Shuffle Questions)</span>
              <p className="text-[11px] text-slate-500">Mencegah contek-mencontek dengan urutan soal berbeda untuk setiap santri</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100/70">
            <input
              type="checkbox"
              checked={config.shuffleOptions}
              onChange={(e) => setConfig({ ...config, shuffleOptions: e.target.checked })}
              className="w-4 h-4 accent-[#0F2137]"
            />
            <div>
              <span className="font-bold text-slate-800">Acak Pilihan Jawaban (Shuffle Answer Options)</span>
              <p className="text-[11px] text-slate-500">Urutan opsi A, B, C, D diacak secara dinamis saat pengerjaan</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100/70">
            <input
              type="checkbox"
              checked={config.showInstantResult}
              onChange={(e) => setConfig({ ...config, showInstantResult: e.target.checked })}
              className="w-4 h-4 accent-[#0F2137]"
            />
            <div>
              <span className="font-bold text-slate-800">Izinkan Santri Langsung Melihat Nilai CBT</span>
              <p className="text-[11px] text-slate-500">
                Bila dinonaktifkan, nilai hanya akan dirapatkan dan diumumkan melalui SK resmi Panitia PPDB
              </p>
            </div>
          </label>
        </div>
      </div>
    </form>
  );
};
