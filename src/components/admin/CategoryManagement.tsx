import React, { useState } from 'react';
import { TestCategory, TestDeliveryType } from '@/src/types';
import {
  createTestCategory,
  updateTestCategory,
  deleteTestCategory,
  reorderTestCategories,
} from '@/src/firebase/db';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Percent,
  Award,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface CategoryManagementProps {
  categories: TestCategory[];
  onReload: () => void;
  isLoading: boolean;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({
  categories,
  onReload,
  isLoading,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TestCategory | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPassingScore, setFormPassingScore] = useState<number>(70);
  const [formWeight, setFormWeight] = useState<number>(20);
  const [formTestType, setFormTestType] = useState<TestDeliveryType>('oral_exam');
  const [formActive, setFormActive] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  // Reordering state
  const [reordering, setReordering] = useState(false);

  const resetForm = () => {
    setFormName('');
    setFormCode('');
    setFormDesc('');
    setFormPassingScore(70);
    setFormWeight(20);
    setFormTestType('oral_exam');
    setFormActive(true);
  };

  const handleOpenEdit = (cat: TestCategory) => {
    setSelectedCategory(cat);
    setFormName(cat.name);
    setFormCode(cat.code);
    setFormDesc(cat.description);
    setFormPassingScore(cat.passingScore);
    setFormWeight(cat.weight || 20);
    setFormTestType(cat.testType);
    setFormActive(cat.active);
    setShowEditModal(true);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCode) return;

    setSubmitting(true);
    try {
      await createTestCategory({
        name: formName,
        code: formCode.toUpperCase().replace(/\s+/g, '_'),
        description: formDesc,
        passingScore: Number(formPassingScore),
        weight: Number(formWeight),
        testType: formTestType,
        orderIndex: categories.length + 1,
        active: formActive,
      });
      setShowAddModal(false);
      resetForm();
      onReload();
    } catch (err: any) {
      alert('Gagal menambah kategori tes: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    setSubmitting(true);
    try {
      await updateTestCategory(selectedCategory.id, {
        name: formName,
        code: formCode.toUpperCase().replace(/\s+/g, '_'),
        description: formDesc,
        passingScore: Number(formPassingScore),
        weight: Number(formWeight),
        testType: formTestType,
        active: formActive,
      });
      setShowEditModal(false);
      setSelectedCategory(null);
      resetForm();
      onReload();
    } catch (err: any) {
      alert('Gagal menyimpan perubahan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cat: TestCategory) => {
    try {
      await updateTestCategory(cat.id, { active: !cat.active });
      onReload();
    } catch (err: any) {
      alert('Gagal mengubah status kategori: ' + err.message);
    }
  };

  const handleDelete = async (cat: TestCategory) => {
    if (confirm(`Hapus kategori tes "${cat.name}"? Bank soal yang terkait mungkin terpengaruh.`)) {
      try {
        await deleteTestCategory(cat.id);
        onReload();
      } catch (err: any) {
        alert('Gagal menghapus kategori: ' + err.message);
      }
    }
  };

  // Reorder Handler (Move up or down)
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (reordering) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setReordering(true);
    try {
      const orderedIds = reordered.map((c) => c.id);
      await reorderTestCategories(orderedIds);
      onReload();
    } catch (err: any) {
      console.error(err);
    } finally {
      setReordering(false);
    }
  };

  // Calculate total weight of active categories
  const totalWeight = categories
    .filter((c) => c.active)
    .reduce((sum, c) => sum + (c.weight || 0), 0);

  const testTypeLabels: Record<TestDeliveryType, { label: string; color: string }> = {
    computer_based: { label: 'Ujian Komputer (CBT)', color: 'bg-blue-100 text-blue-800' },
    oral_exam: { label: 'Ujian Lisan / Praktik', color: 'bg-emerald-100 text-emerald-800' },
    interview: { label: 'Wawancara (Interview)', color: 'bg-amber-100 text-amber-800' },
    practical: { label: 'Tes Praktik Ibadah', color: 'bg-purple-100 text-purple-800' },
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#0F2137]">
            Manajemen Kategori & Materi Tes Seleksi
          </h2>
          <p className="text-xs text-slate-500">
            Atur parameter materi ujian, jenis pengujian, passing grade, bobot persentase, dan urutan tes
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0F2137] hover:bg-[#162D4A] rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          <span>Tambah Kategori Tes</span>
        </button>
      </div>

      {/* Total Weight Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
          totalWeight === 100
            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
            : 'bg-amber-50/70 border-amber-300 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-2">
          {totalWeight === 100 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <div>
            <span className="font-semibold">
              Total Bobot Kategori Aktif: {totalWeight}%
            </span>
            <p className="text-[11px] opacity-80">
              {totalWeight === 100
                ? 'Formula penilaian telah tepat dan konsisten 100%.'
                : `Total bobot saat ini ${totalWeight}%. Sesuaikan bobot masing-masing kategori agar tepat 100%.`}
            </p>
          </div>
        </div>
        <span className="font-serif font-bold text-sm">
          {categories.filter((c) => c.active).length} Kategori Aktif
        </span>
      </div>

      {/* Category List with Reordering */}
      {categories.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Belum ada kategori tes yang ditambahkan
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat, idx) => {
            const typeMeta = testTypeLabels[cat.testType] || testTypeLabels.oral_exam;
            return (
              <div
                key={cat.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  cat.active
                    ? 'bg-white border-slate-200/90 shadow-2xs hover:border-[#0F2137]/30'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                {/* Left: Reorder buttons & Content */}
                <div className="flex items-start sm:items-center gap-3">
                  {/* Order controls */}
                  <div className="flex flex-col gap-1 text-slate-400">
                    <button
                      onClick={() => handleMoveOrder(idx, 'up')}
                      disabled={idx === 0 || reordering}
                      className="p-1 hover:text-[#0F2137] hover:bg-slate-100 rounded disabled:opacity-20 transition-colors"
                      title="Geser urutan ke atas"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveOrder(idx, 'down')}
                      disabled={idx === categories.length - 1 || reordering}
                      className="p-1 hover:text-[#0F2137] hover:bg-slate-100 rounded disabled:opacity-20 transition-colors"
                      title="Geser urutan ke bawah"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-7 h-7 rounded-xl bg-[#0F2137]/5 text-[#0F2137] flex items-center justify-center font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-serif font-bold text-sm text-[#0F2137]">{cat.name}</h4>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                        {cat.code}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeMeta.color}`}>
                        {typeMeta.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                      {cat.description}
                    </p>
                  </div>
                </div>

                {/* Right: Metrics & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Bobot</span>
                      <span className="font-bold text-[#0F2137] font-serif text-sm">
                        {cat.weight || 0}%
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Passing Grade</span>
                      <span className="font-bold text-emerald-700 font-serif text-sm">
                        {cat.passingScore}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {/* Toggle Active */}
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className={`p-1.5 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 ${
                        cat.active ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title={cat.active ? 'Nonaktifkan Kategori' : 'Aktifkan Kategori'}
                    >
                      {cat.active ? (
                        <ToggleRight className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Edit Kategori"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT CATEGORY */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={showAddModal ? handleCreateCategory : handleSaveEdit}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif font-bold text-base text-[#0F2137]">
                {showAddModal ? 'Tambah Kategori Tes Seleksi' : 'Edit Kategori Tes'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kategori Tes *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Tes Baca Al-Qur'an"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Singkat *
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="BACA_QURAN"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Pengujian
                </label>
                <select
                  value={formTestType}
                  onChange={(e) => setFormTestType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                >
                  <option value="oral_exam">Ujian Lisan</option>
                  <option value="interview">Wawancara</option>
                  <option value="computer_based">CBT (Komputer)</option>
                  <option value="practical">Praktik Ibadah</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bobot Penilaian (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formWeight}
                    onChange={(e) => setFormWeight(Number(e.target.value))}
                    min={1}
                    max={100}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                  />
                  <Percent className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Passing Score (0-100) *
                </label>
                <input
                  type="number"
                  value={formPassingScore}
                  onChange={(e) => setFormPassingScore(Number(e.target.value))}
                  min={0}
                  max={100}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deskripsi & Indikator Penilaian
              </label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Rincian aspek yang dinilai pada tes ini..."
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="active-toggle"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="w-4 h-4 accent-[#0F2137]"
              />
              <label htmlFor="active-toggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                Aktifkan kategori ini dalam rangkaian PPDB 2026/2027
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="py-2 px-3 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-4 text-xs font-semibold text-white bg-[#0F2137] hover:bg-[#162D4A] rounded-xl flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{showAddModal ? 'Simpan Kategori' : 'Perbarui Kategori'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
