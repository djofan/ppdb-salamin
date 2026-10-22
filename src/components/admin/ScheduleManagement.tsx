import React, { useState } from 'react';
import { TestSchedule, ScheduleStatus, TestCategory, EducationTier } from '@/src/types';
import {
  createTestSchedule,
  updateTestSchedule,
  updateScheduleStatus,
  deleteTestSchedule,
} from '@/src/firebase/db';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Building2,
  Lock,
  Unlock,
  Ban,
  Check,
} from 'lucide-react';

interface ScheduleManagementProps {
  schedules: TestSchedule[];
  categories: TestCategory[];
  onReload: () => void;
  isLoading: boolean;
}

export const ScheduleManagement: React.FC<ScheduleManagementProps> = ({
  schedules,
  categories,
  onReload,
  isLoading,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<TestSchedule | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('2026-11-15');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('11:30');
  const [formDuration, setFormDuration] = useState<number>(180);
  const [formLocation, setFormLocation] = useState('Gedung Al-Hikmah & Laboratorium Komputer');
  const [formMaxCapacity, setFormMaxCapacity] = useState<number>(50);
  const [formCurrentCount, setFormCurrentCount] = useState<number>(0);
  const [formExaminerName, setFormExaminerName] = useState('');
  const [formStatus, setFormStatus] = useState<ScheduleStatus>('open');
  const [formInstructions, setFormInstructions] = useState('');
  const [formCategories, setFormCategories] = useState<string[]>([]);
  const [formTargetTiers, setFormTargetTiers] = useState<EducationTier[]>([
    'Tsanawiyyah (MTs)',
    'Aliyah (MA)',
  ]);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFormTitle('');
    setFormDate('2026-11-15');
    setFormStartTime('08:00');
    setFormEndTime('11:30');
    setFormDuration(180);
    setFormLocation('Gedung Al-Hikmah & Laboratorium Komputer');
    setFormMaxCapacity(50);
    setFormCurrentCount(0);
    setFormExaminerName('Ust. Ahmad Fauzan, Lc., M.Ag.');
    setFormStatus('open');
    setFormInstructions('');
    setFormCategories(categories.slice(0, 3).map((c) => c.id));
    setFormTargetTiers(['Tsanawiyyah (MTs)', 'Aliyah (MA)']);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (sched: TestSchedule) => {
    setSelectedSchedule(sched);
    setFormTitle(sched.title);
    setFormDate(sched.sessionDate);
    setFormStartTime(sched.startTime);
    setFormEndTime(sched.endTime);
    setFormDuration(sched.durationMinutes || 180);
    setFormLocation(sched.location);
    setFormMaxCapacity(sched.maxCapacity);
    setFormCurrentCount(sched.currentCount || 0);
    setFormExaminerName(sched.examinerName || '');
    setFormStatus(sched.status || 'open');
    setFormInstructions(sched.instructions || '');
    setFormCategories(sched.categoryIds || []);
    setFormTargetTiers(sched.targetTiers || ['Tsanawiyyah (MTs)']);
    setShowEditModal(true);
  };

  const handleToggleCategory = (catId: string) => {
    if (formCategories.includes(catId)) {
      setFormCategories(formCategories.filter((id) => id !== catId));
    } else {
      setFormCategories([...formCategories, catId]);
    }
  };

  const handleToggleTier = (tier: EducationTier) => {
    if (formTargetTiers.includes(tier)) {
      if (formTargetTiers.length > 1) {
        setFormTargetTiers(formTargetTiers.filter((t) => t !== tier));
      }
    } else {
      setFormTargetTiers([...formTargetTiers, tier]);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDate || !formStartTime || !formEndTime || !formLocation) return;

    setSubmitting(true);
    try {
      if (showAddModal) {
        await createTestSchedule({
          title: formTitle,
          sessionDate: formDate,
          startTime: formStartTime,
          endTime: formEndTime,
          durationMinutes: Number(formDuration),
          location: formLocation,
          maxCapacity: Number(formMaxCapacity),
          currentCount: Number(formCurrentCount),
          examinerName: formExaminerName,
          categoryIds: formCategories,
          targetTiers: formTargetTiers,
          status: formStatus,
          instructions: formInstructions,
          active: formStatus === 'open',
        });
        setShowAddModal(false);
      } else if (showEditModal && selectedSchedule) {
        await updateTestSchedule(selectedSchedule.id, {
          title: formTitle,
          sessionDate: formDate,
          startTime: formStartTime,
          endTime: formEndTime,
          durationMinutes: Number(formDuration),
          location: formLocation,
          maxCapacity: Number(formMaxCapacity),
          currentCount: Number(formCurrentCount),
          examinerName: formExaminerName,
          categoryIds: formCategories,
          targetTiers: formTargetTiers,
          status: formStatus,
          instructions: formInstructions,
          active: formStatus === 'open',
        });
        setShowEditModal(false);
        setSelectedSchedule(null);
      }
      resetForm();
      onReload();
    } catch (err: any) {
      alert('Gagal menyimpan jadwal tes: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeStatus = async (sched: TestSchedule, newStatus: ScheduleStatus) => {
    try {
      await updateScheduleStatus(sched.id, newStatus);
      onReload();
    } catch (err: any) {
      alert('Gagal mengubah status jadwal: ' + err.message);
    }
  };

  const handleDelete = async (sched: TestSchedule) => {
    if (confirm(`Hapus jadwal tes "${sched.title}"?`)) {
      try {
        await deleteTestSchedule(sched.id);
        onReload();
      } catch (err: any) {
        alert('Gagal menghapus jadwal: ' + err.message);
      }
    }
  };

  const statusBadges: Record<ScheduleStatus, { label: string; color: string; icon: any }> = {
    open: { label: 'Terbuka (Aktif)', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: Unlock },
    closed: { label: 'Ditutup (Penuh)', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: Lock },
    cancelled: { label: 'Dibatalkan', color: 'bg-rose-50 text-rose-800 border-rose-200', icon: Ban },
    completed: { label: 'Selesai', color: 'bg-blue-50 text-blue-800 border-blue-200', icon: CheckCircle2 },
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#0F2137]">
            Manajemen Jadwal Seleksi PPDB
          </h2>
          <p className="text-xs text-slate-500">
            Atur pembagian sesi gelombang, tanggal, ruang ujian, kapasitas peserta, serta buka/tutup/batalkan jadwal
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0F2137] hover:bg-[#162D4A] rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          <span>Buat Jadwal Baru</span>
        </button>
      </div>

      {/* Schedules Grid */}
      {schedules.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-semibold text-sm text-slate-700">Belum Ada Jadwal Seleksi</h4>
          <p className="text-xs text-slate-400">
            Klik tombol "Buat Jadwal Baru" untuk menjadwalkan sesi tes calon santri.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {schedules.map((s) => {
            const statusInfo = statusBadges[s.status || 'open'] || statusBadges.open;
            const StatusIcon = statusInfo.icon;
            const capacityRatio = Math.round(((s.currentCount || 0) / s.maxCapacity) * 100);

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#0F2137]/30 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top line status & actions */}
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusInfo.label}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit Jadwal"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Jadwal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-serif font-bold text-base text-[#0F2137] mt-2">
                    {s.title}
                  </h3>

                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{s.location}</span>
                  </p>

                  {/* Time & Date Box */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-medium">Tanggal Ujian</span>
                      <span className="font-semibold text-slate-800">{s.sessionDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-medium">Waktu & Durasi</span>
                      <span className="font-semibold text-slate-800">
                        {s.startTime} - {s.endTime} ({s.durationMinutes || 180} mnt)
                      </span>
                    </div>
                  </div>

                  {/* Quota Progress Bar */}
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Kuota Terisi:</span>
                      <span className="font-bold text-slate-800">
                        {s.currentCount || 0} / {s.maxCapacity} Santri ({capacityRatio}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          capacityRatio >= 90 ? 'bg-rose-500' : 'bg-[#0F2137]'
                        }`}
                        style={{ width: `${Math.min(capacityRatio, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Target Jenjang */}
                  {s.targetTiers && s.targetTiers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {s.targetTiers.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-medium bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {s.examinerName && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Penguji: <strong className="text-slate-700">{s.examinerName}</strong>
                    </p>
                  )}
                </div>

                {/* Status Quick Switch Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                  <span className="text-slate-400">Ubah Status:</span>
                  <div className="flex items-center gap-1">
                    {s.status !== 'open' && (
                      <button
                        onClick={() => handleChangeStatus(s, 'open')}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg"
                      >
                        Buka
                      </button>
                    )}
                    {s.status !== 'closed' && (
                      <button
                        onClick={() => handleChangeStatus(s, 'closed')}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg"
                      >
                        Tutup
                      </button>
                    )}
                    {s.status !== 'cancelled' && (
                      <button
                        onClick={() => handleChangeStatus(s, 'cancelled')}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold rounded-lg"
                      >
                        Batalkan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT SCHEDULE */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveSchedule}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif font-bold text-base text-[#0F2137]">
                {showAddModal ? 'Buat Jadwal Sesi Tes Seleksi' : 'Edit Jadwal Sesi Tes'}
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
                Nama / Judul Sesi Jadwal *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Contoh: Seleksi Gelombang 1 - Sesi Pagi MTs"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tanggal Ujian *
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jam Mulai *
                </label>
                <input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jam Selesai *
                </label>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kapasitas Maksimal *
                </label>
                <input
                  type="number"
                  value={formMaxCapacity}
                  onChange={(e) => setFormMaxCapacity(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Durasi Ujian (Menit)
                </label>
                <input
                  type="number"
                  value={formDuration}
                  onChange={(e) => setFormDuration(Number(e.target.value))}
                  min={10}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Status Jadwal
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as ScheduleStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                >
                  <option value="open">Terbuka (open)</option>
                  <option value="closed">Ditutup (closed)</option>
                  <option value="cancelled">Dibatalkan (cancelled)</option>
                  <option value="completed">Selesai (completed)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lokasi Ruang Ujian / Lab *
              </label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Contoh: Gedung Al-Hikmah Lantai 2"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Penguji yang Ditugaskan
              </label>
              <input
                type="text"
                value={formExaminerName}
                onChange={(e) => setFormExaminerName(e.target.value)}
                placeholder="Contoh: Ust. Ahmad Fauzan, Lc."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
              />
            </div>

            {/* Target Tiers selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kelompok Jenjang Peserta:
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    'Tsanawiyyah (MTs)',
                    'Aliyah (MA)',
                    "Kulliyatul Mu'allimin (KMI)",
                  ] as EducationTier[]
                ).map((tier) => (
                  <button
                    type="button"
                    key={tier}
                    onClick={() => handleToggleTier(tier)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      formTargetTiers.includes(tier)
                        ? 'bg-[#0F2137] text-white border-[#0F2137]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories tested */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Materi Tes yang Diujikan pada Sesi Ini:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formCategories.includes(cat.id)}
                      onChange={() => handleToggleCategory(cat.id)}
                      className="accent-[#0F2137]"
                    />
                    <span className="font-medium text-slate-700 truncate">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instruksi & Tata Tertib Peserta
              </label>
              <textarea
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                placeholder="Pakaian yang harus dikenakan, mushaf yang dibawa, toleransi keterlambatan..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
              />
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
                <span>{showAddModal ? 'Terbitkan Jadwal' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
