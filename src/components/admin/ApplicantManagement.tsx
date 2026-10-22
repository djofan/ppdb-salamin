import React, { useState } from 'react';
import {
  Applicant,
  ApplicantStatus,
  ApplicantTestStatus,
  EducationTier,
} from '@/src/types';
import { StatusBadge } from '@/src/components/common/StatusBadge';
import { TemporaryRecapModal } from '@/src/components/common/TemporaryRecapModal';
import {
  createApplicant,
  updateApplicant,
  archiveApplicant,
  deleteApplicant,
  importApplicantsBatch,
} from '@/src/firebase/db';
import {
  Users,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Download,
  Eye,
  Edit,
  Archive,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  FileText,
  Clock,
  Sparkles,
  BarChart3,
} from 'lucide-react';

interface ApplicantManagementProps {
  applicants: Applicant[];
  onReload: () => void;
  isLoading: boolean;
}

export const ApplicantManagement: React.FC<ApplicantManagementProps> = ({
  applicants,
  onReload,
  isLoading,
}) => {
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [testStatusFilter, setTestStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showRecapModal, setShowRecapModal] = useState<boolean>(false);
  const [recapApplicantId, setRecapApplicantId] = useState<string>('');
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);

  // Form states for Add/Edit
  const [formFullName, setFormFullName] = useState('');
  const [formNisn, setFormNisn] = useState('');
  const [formGender, setFormGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [formBirthPlace, setFormBirthPlace] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('2012-05-15');
  const [formSchool, setFormSchool] = useState('');
  const [formGuardian, setFormGuardian] = useState('');
  const [formGuardianPhone, setFormGuardianPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTier, setFormTier] = useState<EducationTier>('Tsanawiyyah (MTs)');
  const [formStatus, setFormStatus] = useState<ApplicantStatus>('registered');
  const [formTestStatus, setFormTestStatus] = useState<ApplicantTestStatus>('belum_tes');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // CSV Import States
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Array<Omit<Applicant, 'id' | 'createdAt' | 'updatedAt'>>>([]);
  const [importing, setImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Open Edit Modal
  const handleOpenEdit = (app: Applicant) => {
    setSelectedApplicant(app);
    setFormFullName(app.fullName);
    setFormNisn(app.nisn || '');
    setFormGender(app.gender);
    setFormBirthPlace(app.birthPlace);
    setFormBirthDate(app.birthDate);
    setFormSchool(app.previousSchool || '');
    setFormGuardian(app.guardianName);
    setFormGuardianPhone(app.guardianPhone);
    setFormEmail(app.email || '');
    setFormTier(app.targetLevel);
    setFormStatus(app.status);
    setFormTestStatus(app.testStatus || 'belum_tes');
    setFormNotes(app.notes || '');
    setShowEditModal(true);
  };

  // Handle Submit Create
  const handleCreateApplicant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName || !formGuardian || !formGuardianPhone) return;

    setSubmitting(true);
    try {
      const year = new Date().getFullYear();
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const registrationNumber = `PPDB-${year}-${randomCode}`;

      await createApplicant({
        userId: `user_manual_${Date.now()}`,
        registrationNumber,
        fullName: formFullName,
        nisn: formNisn,
        gender: formGender,
        birthPlace: formBirthPlace || 'Indonesia',
        birthDate: formBirthDate,
        previousSchool: formSchool,
        guardianName: formGuardian,
        guardianPhone: formGuardianPhone,
        targetLevel: formTier,
        status: formStatus,
        testStatus: formTestStatus,
        email: formEmail,
        notes: formNotes,
        isArchived: false,
        registrationDate: new Date().toISOString().split('T')[0],
      });

      showToast(`Santri baru ${formFullName} berhasil ditambahkan (${registrationNumber}).`);
      setShowAddModal(false);
      resetForm();
      onReload();
    } catch (err: any) {
      alert('Gagal menambah santri: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant) return;

    setSubmitting(true);
    try {
      await updateApplicant(selectedApplicant.id, {
        fullName: formFullName,
        nisn: formNisn,
        gender: formGender,
        birthPlace: formBirthPlace,
        birthDate: formBirthDate,
        previousSchool: formSchool,
        guardianName: formGuardian,
        guardianPhone: formGuardianPhone,
        targetLevel: formTier,
        status: formStatus,
        testStatus: formTestStatus,
        email: formEmail,
        notes: formNotes,
      });

      showToast(`Data santri ${formFullName} berhasil diperbarui.`);
      setShowEditModal(false);
      setSelectedApplicant(null);
      resetForm();
      onReload();
    } catch (err: any) {
      alert('Gagal menyimpan perubahan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleArchive = async (app: Applicant) => {
    const isNowArchived = !app.isArchived;
    const confirmMsg = isNowArchived
      ? `Arsipkan/nonaktifkan santri "${app.fullName}"? Data tidak akan dihitung di statistik aktif.`
      : `Pulihkan santri "${app.fullName}" dari arsip?`;

    if (confirm(confirmMsg)) {
      try {
        await archiveApplicant(app.id, isNowArchived);
        showToast(isNowArchived ? 'Data berhasil diarsipkan.' : 'Data berhasil dipulihkan.');
        onReload();
      } catch (err: any) {
        alert('Gagal mengubah status arsip: ' + err.message);
      }
    }
  };

  const handleDelete = async (app: Applicant) => {
    if (confirm(`HAPUS PERMANEN santri "${app.fullName}" (${app.registrationNumber}) dari database Firestore? Tindakan ini tidak dapat dibatalkan.`)) {
      try {
        await deleteApplicant(app.id);
        showToast(`Santri ${app.fullName} berhasil dihapus.`);
        onReload();
      } catch (err: any) {
        alert('Gagal menghapus santri: ' + err.message);
      }
    }
  };

  const resetForm = () => {
    setFormFullName('');
    setFormNisn('');
    setFormGender('Laki-laki');
    setFormBirthPlace('');
    setFormBirthDate('2012-05-15');
    setFormSchool('');
    setFormGuardian('');
    setFormGuardianPhone('');
    setFormEmail('');
    setFormTier('Tsanawiyyah (MTs)');
    setFormStatus('registered');
    setFormTestStatus('belum_tes');
    setFormNotes('');
  };

  // CSV Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
          setImportError('File CSV harus memiliki baris header dan minimal 1 baris data.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        const parsed: Array<Omit<Applicant, 'id' | 'createdAt' | 'updatedAt'>> = [];
        const year = new Date().getFullYear();

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length < 2) continue;

          const randomCode = Math.floor(1000 + Math.random() * 9000);
          const fullName = cols[0] || `Santri Baru ${i}`;
          const gender = cols[1]?.toLowerCase().startsWith('p') ? 'Perempuan' : 'Laki-laki';
          const targetLevel = (cols[2] as EducationTier) || 'Tsanawiyyah (MTs)';
          const school = cols[3] || 'SD/MI Asal';
          const guardian = cols[4] || 'Wali Santri';
          const phone = cols[5] || '08123456789';
          const email = cols[6] || '';

          parsed.push({
            userId: `user_csv_${Date.now()}_${i}`,
            registrationNumber: `PPDB-${year}-${randomCode}`,
            fullName,
            gender,
            targetLevel,
            previousSchool: school,
            guardianName: guardian,
            guardianPhone: phone,
            email,
            birthPlace: 'Indonesia',
            birthDate: '2012-01-01',
            status: 'registered',
            testStatus: 'belum_tes',
            isArchived: false,
            registrationDate: new Date().toISOString().split('T')[0],
          });
        }

        setCsvPreview(parsed);
      } catch (err: any) {
        setImportError('Gagal memproses file CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (csvPreview.length === 0) return;
    setImporting(true);
    try {
      const count = await importApplicantsBatch(csvPreview);
      showToast(`Alhamdulillah! Berhasil mengimpor ${count} calon santri ke database.`);
      setShowImportModal(false);
      setCsvPreview([]);
      setCsvFile(null);
      onReload();
    } catch (err: any) {
      setImportError('Gagal menyimpan batch import: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (applicants.length === 0) {
      alert('Tidak ada data pendaftar untuk diekspor.');
      return;
    }

    const headers = [
      'No. Registrasi',
      'Nama Lengkap',
      'Jenis Kelamin',
      'Jenjang',
      'NISN',
      'Asal Sekolah',
      'Nama Wali',
      'No. HP Wali',
      'Email',
      'Status Pendaftaran',
      'Status Tes',
      'Tgl Daftar',
    ];

    const rows = applicants.map(a => [
      `"${a.registrationNumber}"`,
      `"${a.fullName}"`,
      `"${a.gender}"`,
      `"${a.targetLevel}"`,
      `"${a.nisn || ''}"`,
      `"${a.previousSchool || ''}"`,
      `"${a.guardianName}"`,
      `"${a.guardianPhone}"`,
      `"${a.email || ''}"`,
      `"${a.status}"`,
      `"${a.testStatus || 'belum_tes'}"`,
      `"${a.registrationDate || a.createdAt.split('T')[0]}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PPDB_Santri_Salamatul_Insan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered list
  const filtered = applicants.filter((app) => {
    if (!showArchived && app.isArchived) return false;
    if (showArchived && !app.isArchived) return false;

    const matchesSearch =
      app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.guardianName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesTest = testStatusFilter === 'all' || app.testStatus === testStatusFilter;
    const matchesTier = tierFilter === 'all' || app.targetLevel === tierFilter;

    return matchesSearch && matchesStatus && matchesTest && matchesTier;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedList = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const testStatusLabels: Record<ApplicantTestStatus, { label: string; color: string }> = {
    belum_tes: { label: 'Belum Tes', color: 'bg-slate-100 text-slate-700' },
    terjadwal: { label: 'Terjadwal', color: 'bg-amber-100 text-amber-800' },
    sedang_tes: { label: 'Sedang Tes', color: 'bg-blue-100 text-blue-800' },
    selesai_tes: { label: 'Selesai Tes', color: 'bg-indigo-100 text-indigo-800' },
    dinilai: { label: 'Dinilai', color: 'bg-emerald-100 text-emerald-800' },
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-2 text-xs text-emerald-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#0F2137]">
            Manajemen Calon Santri Baru (PPDB)
          </h2>
          <p className="text-xs text-slate-500">
            Kelola data pendaftaran, verifikasi berkas, filter status seleksi, dan impor/ekspor data santri
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            title="Ekspor seluruh data pendaftar ke spreadsheet CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>

          {/* Import CSV */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F2137] bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>Impor CSV</span>
          </button>

          {/* Add Applicant Button */}
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0F2137] hover:bg-[#162D4A] rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Tambah Santri Baru</span>
          </button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="relative sm:col-span-2">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari nama, no. registrasi, wali..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2137]/20 focus:border-[#0F2137]"
          />
        </div>

        {/* Filter Status Seleksi */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
          >
            <option value="all">Semua Status Seleksi</option>
            <option value="registered">Terdaftar (Berkas Masuk)</option>
            <option value="scheduled">Jadwal Ditentukan</option>
            <option value="tested">Selesai Tes</option>
            <option value="reviewed">Menunggu Keputusan</option>
            <option value="accepted">Diterima (Lulus)</option>
            <option value="rejected">Tidak Lolos</option>
          </select>
        </div>

        {/* Filter Status Tes */}
        <div>
          <select
            value={testStatusFilter}
            onChange={(e) => {
              setTestStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
          >
            <option value="all">Semua Status Tes</option>
            <option value="belum_tes">Belum Tes</option>
            <option value="terjadwal">Sudah Terjadwal</option>
            <option value="sedang_tes">Sedang Ujian</option>
            <option value="selesai_tes">Selesai Ujian</option>
            <option value="dinilai">Sudah Dinilai</option>
          </select>
        </div>

        {/* Filter Jenjang */}
        <div>
          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
          >
            <option value="all">Semua Jenjang</option>
            <option value="Tsanawiyyah (MTs)">MTs (Tsanawiyyah)</option>
            <option value="Aliyah (MA)">MA (Aliyah)</option>
            <option value="Kulliyatul Mu'allimin (KMI)">KMI (Mu'allimin)</option>
          </select>
        </div>
      </div>

      {/* Tabs: Active vs Archived View */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-4 text-xs font-semibold">
          <button
            onClick={() => {
              setShowArchived(false);
              setCurrentPage(1);
            }}
            className={`pb-2 transition-colors border-b-2 ${
              !showArchived
                ? 'border-[#0F2137] text-[#0F2137]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Data Santri Aktif ({applicants.filter(a => !a.isArchived).length})
          </button>
          <button
            onClick={() => {
              setShowArchived(true);
              setCurrentPage(1);
            }}
            className={`pb-2 transition-colors border-b-2 ${
              showArchived
                ? 'border-[#0F2137] text-[#0F2137]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Data Diarsipkan ({applicants.filter(a => a.isArchived).length})
          </button>
        </div>

        <span className="text-[11px] text-slate-400">
          Menampilkan {filtered.length} santri
        </span>
      </div>

      {/* Table */}
      {paginatedList.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <Users className="w-10 h-10 mx-auto text-slate-300" />
          <h4 className="font-semibold text-sm text-slate-700">Tidak Ada Data Santri</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Tidak ditemukan data santri dengan kriteria pencarian dan filter saat ini.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">No. Registrasi</th>
                <th className="py-3 px-3">Nama Santri</th>
                <th className="py-3 px-3">Jenjang</th>
                <th className="py-3 px-3">Gender</th>
                <th className="py-3 px-3">Wali & No. HP</th>
                <th className="py-3 px-3">Status Seleksi</th>
                <th className="py-3 px-3">Status Tes</th>
                <th className="py-3 px-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.map((app) => {
                const testMeta = testStatusLabels[app.testStatus || 'belum_tes'] || testStatusLabels.belum_tes;
                return (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F2137]">
                      {app.registrationNumber}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800">{app.fullName}</p>
                      <p className="text-[10px] text-slate-400">NISN: {app.nisn || '-'}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {app.targetLevel}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{app.gender}</td>
                    <td className="py-3 px-3 text-slate-600">
                      <p className="font-medium text-slate-700">{app.guardianName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{app.guardianPhone}</p>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${testMeta.color}`}>
                        {testMeta.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Temporary Recap */}
                        <button
                          onClick={() => {
                            setRecapApplicantId(app.id);
                            setShowRecapModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Lihat Rekap Nilai Sementara"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                        </button>

                        {/* View Detail */}
                        <button
                          onClick={() => {
                            setSelectedApplicant(app);
                            setShowDetailModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-[#0F2137] hover:bg-slate-100 rounded-lg transition-colors"
                          title="Lihat Detail Santri"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEdit(app)}
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit Data Santri"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Archive / Restore */}
                        <button
                          onClick={() => handleToggleArchive(app)}
                          className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                          title={app.isArchived ? 'Pulihkan dari Arsip' : 'Arsipkan Data'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(app)}
                          className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Data Santri"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
          <p className="text-slate-500 text-[11px]">
            Halaman {currentPage} dari {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-7 h-7 rounded-lg font-semibold text-xs transition-colors ${
                  currentPage === i + 1
                    ? 'bg-[#0F2137] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW APPLICANT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleCreateApplicant}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#B8860B]" />
                <h3 className="font-serif font-bold text-base text-[#0F2137]">
                  Tambah Calon Santri Baru (Manual)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Santri *
                </label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="Contoh: Muhammad Yusuf Al-Qurthubi"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jenis Kelamin *
                </label>
                <select
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                >
                  <option value="Laki-laki">Laki-laki (Santriwan)</option>
                  <option value="Perempuan">Perempuan (Santriwati)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jenjang / Program *
                </label>
                <select
                  value={formTier}
                  onChange={(e) => setFormTier(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                >
                  <option value="Tsanawiyyah (MTs)">MTs (Tsanawiyyah)</option>
                  <option value="Aliyah (MA)">MA (Aliyah)</option>
                  <option value="Kulliyatul Mu'allimin (KMI)">KMI (Mu'allimin)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  NISN (Opsional)
                </label>
                <input
                  type="text"
                  value={formNisn}
                  onChange={(e) => setFormNisn(e.target.value)}
                  placeholder="Nomor Induk Siswa Nasional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Asal Sekolah Sebelumnya
                </label>
                <input
                  type="text"
                  value={formSchool}
                  onChange={(e) => setFormSchool(e.target.value)}
                  placeholder="Contoh: SDIT Al-Bina"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tempat Lahir
                </label>
                <input
                  type="text"
                  value={formBirthPlace}
                  onChange={(e) => setFormBirthPlace(e.target.value)}
                  placeholder="Kota Lahir"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Orang Tua / Wali *
                </label>
                <input
                  type="text"
                  value={formGuardian}
                  onChange={(e) => setFormGuardian(e.target.value)}
                  placeholder="Nama Ayah/Ibu/Wali"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  No. WhatsApp / Kontak Wali *
                </label>
                <input
                  type="tel"
                  value={formGuardianPhone}
                  onChange={(e) => setFormGuardianPhone(e.target.value)}
                  placeholder="08123456789"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alamat Email (Opsional)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="santri@gmail.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Status Tes
                </label>
                <select
                  value={formTestStatus}
                  onChange={(e) => setFormTestStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                >
                  <option value="belum_tes">Belum Tes</option>
                  <option value="terjadwal">Terjadwal</option>
                  <option value="sedang_tes">Sedang Tes</option>
                  <option value="selesai_tes">Selesai Tes</option>
                  <option value="dinilai">Dinilai</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Khusus Pendaftaran
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Catatan tambahan prestasi, kesehatan, dll..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="py-2 px-3 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-4 text-xs font-semibold text-white bg-[#0F2137] hover:bg-[#162D4A] rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Santri Baru</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: EDIT APPLICANT */}
      {showEditModal && selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-[10px] text-slate-400 font-bold">
                  {selectedApplicant.registrationNumber}
                </span>
                <h3 className="font-serif font-bold text-base text-[#0F2137]">
                  Edit Data Calon Santri: {selectedApplicant.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Santri
                </label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jenis Kelamin
                </label>
                <select
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                >
                  <option value="Laki-laki">Laki-laki (Santriwan)</option>
                  <option value="Perempuan">Perempuan (Santriwati)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jenjang / Program
                </label>
                <select
                  value={formTier}
                  onChange={(e) => setFormTier(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                >
                  <option value="Tsanawiyyah (MTs)">MTs (Tsanawiyyah)</option>
                  <option value="Aliyah (MA)">MA (Aliyah)</option>
                  <option value="Kulliyatul Mu'allimin (KMI)">KMI (Mu'allimin)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Status Seleksi
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                >
                  <option value="registered">Terdaftar (registered)</option>
                  <option value="scheduled">Terjadwal (scheduled)</option>
                  <option value="tested">Selesai Tes (tested)</option>
                  <option value="reviewed">Menunggu Keputusan (reviewed)</option>
                  <option value="accepted">Diterima / Lolos (accepted)</option>
                  <option value="rejected">Tidak Lolos (rejected)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Status Pelaksanaan Tes
                </label>
                <select
                  value={formTestStatus}
                  onChange={(e) => setFormTestStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                >
                  <option value="belum_tes">Belum Tes</option>
                  <option value="terjadwal">Terjadwal</option>
                  <option value="sedang_tes">Sedang Tes</option>
                  <option value="selesai_tes">Selesai Tes</option>
                  <option value="dinilai">Dinilai</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Orang Tua / Wali
                </label>
                <input
                  type="text"
                  value={formGuardian}
                  onChange={(e) => setFormGuardian(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  No. WhatsApp Wali
                </label>
                <input
                  type="tel"
                  value={formGuardianPhone}
                  onChange={(e) => setFormGuardianPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Asal Sekolah
                </label>
                <input
                  type="text"
                  value={formSchool}
                  onChange={(e) => setFormSchool(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  NISN
                </label>
                <input
                  type="text"
                  value={formNisn}
                  onChange={(e) => setFormNisn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Panitia
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F2137]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
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
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: VIEW DETAIL */}
      {showDetailModal && selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#0F2137] bg-slate-100 px-2.5 py-1 rounded">
                  {selectedApplicant.registrationNumber}
                </span>
                <h3 className="font-serif font-bold text-lg text-[#0F2137] mt-1.5">
                  {selectedApplicant.fullName}
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-2">
              <StatusBadge status={selectedApplicant.status} size="md" />
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                Tes: {selectedApplicant.testStatus || 'Belum Tes'}
              </span>
              {selectedApplicant.isArchived && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-bold">
                  DIARSIPKAN
                </span>
              )}
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Jenjang Tujuan</span>
                <span className="font-semibold text-slate-800">{selectedApplicant.targetLevel}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Jenis Kelamin</span>
                <span className="font-semibold text-slate-800">{selectedApplicant.gender}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">NISN</span>
                <span className="font-semibold text-slate-800">{selectedApplicant.nisn || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Asal Sekolah</span>
                <span className="font-semibold text-slate-800">{selectedApplicant.previousSchool || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Tempat, Tanggal Lahir</span>
                <span className="font-semibold text-slate-800">
                  {selectedApplicant.birthPlace}, {selectedApplicant.birthDate}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Tanggal Mendaftar</span>
                <span className="font-semibold text-slate-800">
                  {selectedApplicant.registrationDate || selectedApplicant.createdAt.split('T')[0]}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Nama Wali</span>
                <span className="font-semibold text-slate-800">{selectedApplicant.guardianName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">WhatsApp Wali</span>
                <span className="font-semibold text-slate-800 font-mono">{selectedApplicant.guardianPhone}</span>
              </div>
            </div>

            {selectedApplicant.notes && (
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 text-xs text-amber-900">
                <span className="font-semibold block mb-0.5">Catatan:</span>
                <p>{selectedApplicant.notes}</p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRecapApplicantId(selectedApplicant.id);
                    setShowRecapModal(true);
                  }}
                  className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Rekap Nilai Sementara</span>
                </button>

                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleOpenEdit(selectedApplicant);
                  }}
                  className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold rounded-xl flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Santri</span>
                </button>
              </div>

              <button
                onClick={() => setShowDetailModal(false)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CSV IMPORT */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#B8860B]" />
                <h3 className="font-serif font-bold text-base text-[#0F2137]">
                  Impor Data Calon Santri via File CSV
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Unggah file spreadsheet CSV dengan urutan kolom: <br />
              <code className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-[#0F2137]">
                Nama, Gender, Jenjang, Asal Sekolah, Nama Wali, No HP Wali, Email
              </code>
            </p>

            {importError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {/* File dropzone */}
            <div className="border-2 border-dashed border-slate-300 hover:border-[#0F2137] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer">
                <span className="font-semibold text-xs text-[#0F2137] hover:underline">
                  Klik untuk memilih file CSV
                </span>
                <span className="text-xs text-slate-500 block mt-1">
                  {csvFile ? csvFile.name : 'atau seret file CSV ke sini'}
                </span>
              </label>
            </div>

            {/* Preview */}
            {csvPreview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Pratinjau Data Impor ({csvPreview.length} Calon Santri):</span>
                  <span className="text-emerald-600 font-medium">✓ Siap diimpor</span>
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                      <tr>
                        <th className="p-2">Nama</th>
                        <th className="p-2">Gender</th>
                        <th className="p-2">Jenjang</th>
                        <th className="p-2">Asal Sekolah</th>
                        <th className="p-2">Wali & HP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {csvPreview.slice(0, 10).map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-semibold text-slate-800">{p.fullName}</td>
                          <td className="p-2 text-slate-600">{p.gender}</td>
                          <td className="p-2 text-slate-600">{p.targetLevel}</td>
                          <td className="p-2 text-slate-600">{p.previousSchool}</td>
                          <td className="p-2 text-slate-600">{p.guardianName} ({p.guardianPhone})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvPreview.length > 10 && (
                  <p className="text-[10px] text-slate-400 italic">
                    ...dan {csvPreview.length - 10} santri lainnya.
                  </p>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setCsvPreview([]);
                  setCsvFile(null);
                }}
                className="py-2 px-3 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={csvPreview.length === 0 || importing}
                className="py-2.5 px-4 text-xs font-semibold text-white bg-[#0F2137] hover:bg-[#162D4A] rounded-xl flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
              >
                {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan {csvPreview.length} Santri ke Firestore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: TEMPORARY RECAP MODAL */}
      <TemporaryRecapModal
        applicantId={recapApplicantId}
        isOpen={showRecapModal}
        onClose={() => setShowRecapModal(false)}
      />
    </div>
  );
};
