import React, { useState } from 'react';
import { QuestionItem, QuestionType, TestCategory } from '@/src/types';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  toggleQuestionStatus,
} from '@/src/firebase/db';
import {
  HelpCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image,
  Award,
  BookOpen,
  Check,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from 'lucide-react';

interface QuestionBankManagementProps {
  questions: QuestionItem[];
  categories: TestCategory[];
  onReload: () => void;
  isLoading: boolean;
}

export const QuestionBankManagement: React.FC<QuestionBankManagementProps> = ({
  questions,
  categories,
  onReload,
  isLoading,
}) => {
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);

  // Form states
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formText, setFormText] = useState('');
  const [formType, setFormType] = useState<QuestionType>('multiple_choice');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('');
  const [formWeight, setFormWeight] = useState<number>(5);
  const [formExplanation, setFormExplanation] = useState('');
  const [formActive, setFormActive] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  // Reset Form
  const resetForm = () => {
    setFormCategoryId(categories[0]?.id || '');
    setFormText('');
    setFormType('multiple_choice');
    setFormImageUrl('');
    setFormOptions(['', '', '', '']);
    setFormCorrectAnswer('');
    setFormWeight(5);
    setFormExplanation('');
    setFormActive(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    if (categories.length > 0) {
      setFormCategoryId(categories[0].id);
    }
    setShowAddModal(true);
  };

  const handleOpenEdit = (q: QuestionItem) => {
    setSelectedQuestion(q);
    setFormCategoryId(q.categoryId);
    setFormText(q.questionText);
    setFormType(q.questionType);
    setFormImageUrl(q.imageUrl || '');
    setFormOptions(q.options && q.options.length > 0 ? [...q.options] : ['', '', '', '']);
    setFormCorrectAnswer(q.correctAnswer);
    setFormWeight(q.weight || 5);
    setFormExplanation(q.explanation || '');
    setFormActive(q.active);
    setShowEditModal(true);
  };

  const handleOpenPreview = (q: QuestionItem) => {
    setSelectedQuestion(q);
    setShowPreviewModal(true);
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...formOptions];
    updated[idx] = val;
    setFormOptions(updated);
  };

  const handleAddOption = () => {
    setFormOptions([...formOptions, '']);
  };

  const handleRemoveOption = (idx: number) => {
    if (formOptions.length <= 2) return;
    const updated = formOptions.filter((_, i) => i !== idx);
    setFormOptions(updated);
    if (formCorrectAnswer === formOptions[idx]) {
      setFormCorrectAnswer('');
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText || !formCategoryId) return;

    // Validation based on type
    if (formType === 'multiple_choice') {
      const cleanOpts = formOptions.map((o) => o.trim()).filter((o) => o.length > 0);
      if (cleanOpts.length < 2) {
        alert('Soal pilihan ganda minimal membutuhkan 2 opsi pilihan jawaban.');
        return;
      }
      if (!formCorrectAnswer) {
        alert('Mohon tentukan kunci jawaban yang benar.');
        return;
      }
    } else if (formType === 'true_false') {
      if (!formCorrectAnswer) {
        alert('Mohon tentukan apakah pernyataan ini Benar atau Salah.');
        return;
      }
    } else if (formType === 'short_answer') {
      if (!formCorrectAnswer) {
        alert('Mohon isi kata kunci jawaban yang diharapkan.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const cat = categories.find((c) => c.id === formCategoryId);
      const catName = cat ? cat.name : 'Tes Seleksi';

      const optionsToSave =
        formType === 'multiple_choice'
          ? formOptions.map((o) => o.trim()).filter((o) => o.length > 0)
          : formType === 'true_false'
          ? ['Benar', 'Salah']
          : [];

      if (showAddModal) {
        await createQuestion({
          categoryId: formCategoryId,
          categoryName: catName,
          questionText: formText,
          questionType: formType,
          imageUrl: formImageUrl || undefined,
          options: optionsToSave,
          correctAnswer: formCorrectAnswer,
          weight: Number(formWeight),
          explanation: formExplanation,
          active: formActive,
        });
        setShowAddModal(false);
      } else if (showEditModal && selectedQuestion) {
        await updateQuestion(selectedQuestion.id, {
          categoryId: formCategoryId,
          categoryName: catName,
          questionText: formText,
          questionType: formType,
          imageUrl: formImageUrl || undefined,
          options: optionsToSave,
          correctAnswer: formCorrectAnswer,
          weight: Number(formWeight),
          explanation: formExplanation,
          active: formActive,
        });
        setShowEditModal(false);
        setSelectedQuestion(null);
      }
      resetForm();
      onReload();
    } catch (err: any) {
      alert('Gagal menyimpan soal: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (q: QuestionItem) => {
    try {
      await toggleQuestionStatus(q.id, !q.active);
      onReload();
    } catch (err: any) {
      alert('Gagal mengubah status soal: ' + err.message);
    }
  };

  const handleDelete = async (q: QuestionItem) => {
    if (confirm('Hapus butir soal ini dari bank soal?')) {
      try {
        await deleteQuestion(q.id);
        onReload();
      } catch (err: any) {
        alert('Gagal menghapus soal: ' + err.message);
      }
    }
  };

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.correctAnswer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategoryFilter === 'all' || q.categoryId === selectedCategoryFilter;

    const matchesType = selectedTypeFilter === 'all' || q.questionType === selectedTypeFilter;

    return matchesSearch && matchesCategory && matchesType;
  });

  const questionTypeLabels: Record<QuestionType, { label: string; badgeColor: string }> = {
    multiple_choice: { label: 'Pilihan Ganda (PG)', badgeColor: 'bg-blue-100 text-blue-800' },
    true_false: { label: 'Benar / Salah (B/S)', badgeColor: 'bg-purple-100 text-purple-800' },
    short_answer: { label: 'Isian Singkat', badgeColor: 'bg-amber-100 text-amber-800' },
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#0F2137]">
            Bank Soal & Rubrik Pengujian
          </h2>
          <p className="text-xs text-slate-500">
            Kelola butir soal pilihan ganda, benar/salah, isian singkat, gambar stimulus, kunci jawaban, dan bobot poin
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0F2137] hover:bg-[#162D4A] rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          <span>Tambah Soal Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari teks soal atau kunci jawaban..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
          />
        </div>

        {/* Filter Category */}
        <div>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
          >
            <option value="all">Semua Kategori Materi</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Type */}
        <div>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
          >
            <option value="all">Semua Jenis Soal</option>
            <option value="multiple_choice">Pilihan Ganda (PG)</option>
            <option value="true_false">Benar / Salah (B/S)</option>
            <option value="short_answer">Isian Singkat</option>
          </select>
        </div>
      </div>

      {/* Question List */}
      {filteredQuestions.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-semibold text-sm text-slate-700">Tidak Ada Soal yang Ditemukan</h4>
          <p className="text-xs text-slate-400">
            Tambahkan soal baru atau sesuaikan filter pencarian kategori dan jenis soal.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q, idx) => {
            const typeInfo = questionTypeLabels[q.questionType] || questionTypeLabels.multiple_choice;
            return (
              <div
                key={q.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  q.active
                    ? 'bg-white border-slate-200/90 shadow-2xs hover:border-[#0F2137]/30'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                {/* Content */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-xs text-[#0F2137] bg-[#0F2137]/5 px-2.5 py-0.5 rounded-full">
                      {q.categoryName || 'Materi Ujian'}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeInfo.badgeColor}`}>
                      {typeInfo.label}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      Bobot: {q.weight || 5} Poin
                    </span>
                    {q.imageUrl && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-sky-50 text-sky-700 flex items-center gap-1">
                        <Image className="w-3 h-3" /> Ada Gambar
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-800 font-medium leading-relaxed">
                    {q.questionText}
                  </p>

                  {/* Options summary or key */}
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      Kunci Jawaban:{' '}
                      <strong className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {q.correctAnswer}
                      </strong>
                    </span>
                    {q.options && q.options.length > 0 && (
                      <span>({q.options.length} Pilihan Jawaban)</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                  {/* Preview */}
                  <button
                    onClick={() => handleOpenPreview(q)}
                    className="p-1.5 text-slate-500 hover:text-[#0F2137] hover:bg-slate-100 rounded-lg transition-colors"
                    title="Pratinjau Tampilan Santri"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Toggle Active */}
                  <button
                    onClick={() => handleToggleActive(q)}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                    title={q.active ? 'Nonaktifkan Soal' : 'Aktifkan Soal'}
                  >
                    {q.active ? (
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleOpenEdit(q)}
                    className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Edit Soal"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(q)}
                    className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Hapus Soal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT QUESTION */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveQuestion}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif font-bold text-base text-[#0F2137]">
                {showAddModal ? 'Tambah Butir Soal Baru' : 'Edit Butir Soal'}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Category */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kategori Materi *
                </label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jenis Soal *
                </label>
                <select
                  value={formType}
                  onChange={(e) => {
                    const newType = e.target.value as QuestionType;
                    setFormType(newType);
                    if (newType === 'true_false') {
                      setFormOptions(['Benar', 'Salah']);
                      setFormCorrectAnswer('Benar');
                    } else if (newType === 'short_answer') {
                      setFormOptions([]);
                      setFormCorrectAnswer('');
                    } else {
                      setFormOptions(['', '', '', '']);
                      setFormCorrectAnswer('');
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                >
                  <option value="multiple_choice">Pilihan Ganda</option>
                  <option value="true_false">Benar / Salah</option>
                  <option value="short_answer">Isian Singkat</option>
                </select>
              </div>

              {/* Weight */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bobot Poin Soal *
                </label>
                <input
                  type="number"
                  value={formWeight}
                  onChange={(e) => setFormWeight(Number(e.target.value))}
                  min={1}
                  max={100}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pertanyaan / Teks Soal *
              </label>
              <textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="Tuliskan pertanyaan soal ujian di sini..."
                rows={3}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
              />
            </div>

            {/* Optional Image URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-slate-400" />
                <span>URL Gambar / Stimulus Soal (Opsional)</span>
              </label>
              <input
                type="url"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder="https://example.com/gambar-soal.png"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
              />
              {formImageUrl && (
                <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-xl max-w-xs">
                  <p className="text-[10px] text-slate-400 mb-1">Pratinjau Gambar:</p>
                  <img
                    src={formImageUrl}
                    alt="Stimulus Soal"
                    className="max-h-28 rounded object-contain"
                    onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                  />
                </div>
              )}
            </div>

            {/* Options according to question type */}
            {formType === 'multiple_choice' && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Pilihan Jawaban & Tentukan Kunci Jawaban Benar:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-[11px] font-semibold text-[#0F2137] hover:underline"
                  >
                    + Tambah Opsi
                  </button>
                </div>

                <div className="space-y-2">
                  {formOptions.map((opt, i) => {
                    const labelChar = String.fromCharCode(65 + i); // A, B, C, D
                    const isKey = formCorrectAnswer === opt && opt.length > 0;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormCorrectAnswer(opt)}
                          title="Klik untuk jadikan kunci jawaban benar"
                          className={`w-7 h-7 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center shrink-0 ${
                            isKey
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-300 hover:border-emerald-500'
                          }`}
                        >
                          {labelChar}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            handleOptionChange(i, e.target.value);
                            if (isKey) setFormCorrectAnswer(e.target.value);
                          }}
                          placeholder={`Teks pilihan ${labelChar}`}
                          required
                          className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                        />
                        {formOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(i)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400">
                  * Klik huruf (A, B, C...) di samping pilihan untuk menetapkannya sebagai kunci jawaban yang benar.
                </p>
              </div>
            )}

            {formType === 'true_false' && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Kunci Jawaban Pernyataan Ini:
                </label>
                <div className="flex gap-4">
                  {['Benar', 'Salah'].map((val) => (
                    <label key={val} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="tf_answer"
                        value={val}
                        checked={formCorrectAnswer === val}
                        onChange={(e) => setFormCorrectAnswer(e.target.value)}
                        className="accent-[#0F2137]"
                      />
                      <span className="font-semibold text-slate-800">{val}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formType === 'short_answer' && (
              <div className="space-y-1 pt-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Kata Kunci Jawaban Benar (Isian Singkat):
                </label>
                <input
                  type="text"
                  value={formCorrectAnswer}
                  onChange={(e) => setFormCorrectAnswer(e.target.value)}
                  placeholder="Contoh: Jakarta"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>
            )}

            {/* Explanation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Penjelasan & Pembahasan Jawaban (Opsional)
              </label>
              <textarea
                value={formExplanation}
                onChange={(e) => setFormExplanation(e.target.value)}
                placeholder="Rasional atau referensi dalil/rumus dari jawaban..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
              />
            </div>

            {/* Toggle Active */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="q-active-toggle"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="w-4 h-4 accent-[#0F2137]"
              />
              <label htmlFor="q-active-toggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                Aktifkan soal ini untuk ujian seleksi
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
                <span>{showAddModal ? 'Simpan ke Bank Soal' : 'Perbarui Soal'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: PREVIEW QUESTION */}
      {showPreviewModal && selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#B8860B]" />
                <h3 className="font-serif font-bold text-sm text-[#0F2137]">
                  Pratinjau Tampilan Ujian Santri
                </h3>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase">
                <span>{selectedQuestion.categoryName || 'Materi Ujian'}</span>
                <span>Bobot: {selectedQuestion.weight} Poin</span>
              </div>

              <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                {selectedQuestion.questionText}
              </p>

              {selectedQuestion.imageUrl && (
                <div className="my-2">
                  <img
                    src={selectedQuestion.imageUrl}
                    alt="Stimulus Soal"
                    className="max-h-48 rounded-xl border border-slate-200 object-contain mx-auto"
                  />
                </div>
              )}

              {/* Options */}
              {selectedQuestion.questionType === 'multiple_choice' && (
                <div className="space-y-1.5 pt-2">
                  {selectedQuestion.options.map((opt, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 flex items-center gap-2 hover:border-[#0F2137] cursor-pointer"
                    >
                      <span className="w-5 h-5 rounded-md bg-slate-100 font-bold text-[11px] flex items-center justify-center">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedQuestion.questionType === 'true_false' && (
                <div className="flex gap-3 pt-2">
                  {['Benar', 'Salah'].map((val) => (
                    <div
                      key={val}
                      className="flex-1 p-2.5 text-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer hover:border-[#0F2137]"
                    >
                      {val}
                    </div>
                  ))}
                </div>
              )}

              {selectedQuestion.questionType === 'short_answer' && (
                <div className="pt-2">
                  <input
                    type="text"
                    disabled
                    placeholder="Ketik jawaban santri di sini..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              )}
            </div>

            {/* Answer Key Box (Admin Only View) */}
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs space-y-1">
              <span className="font-semibold text-emerald-900 block text-[11px] uppercase tracking-wider">
                Kunci Jawaban Resmi (Admin/Penguji):
              </span>
              <p className="font-bold text-emerald-800">{selectedQuestion.correctAnswer}</p>
              {selectedQuestion.explanation && (
                <p className="text-[11px] text-emerald-700 italic pt-1">
                  Pembahasan: {selectedQuestion.explanation}
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
