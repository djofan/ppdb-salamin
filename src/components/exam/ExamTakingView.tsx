import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Applicant,
  SanitizedExamQuestion,
  TestSession,
  TestAnswer,
  TestCategory,
} from '@/src/types';
import {
  fetchExamQuestions,
  startOrResumeTestSession,
  saveTestAnswer,
  fetchTestAnswers,
  submitAndGradeTestSession,
} from '@/src/firebase/db';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Flag,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CloudCheck,
  CloudOff,
  RefreshCw,
  HelpCircle,
  FileText,
  User,
  GraduationCap,
  ArrowRight,
  Check,
  AlertCircle,
  Award,
} from 'lucide-react';

interface ExamTakingViewProps {
  applicant: Applicant;
  category: TestCategory;
  scheduleId?: string;
  onExit: () => void;
  onFinished: (session: TestSession) => void;
}

export const ExamTakingView: React.FC<ExamTakingViewProps> = ({
  applicant,
  category,
  scheduleId,
  onExit,
  onFinished,
}) => {
  // Phase: 'briefing' -> 'taking' -> 'submitted'
  const [phase, setPhase] = useState<'briefing' | 'taking' | 'submitted'>('briefing');
  const [agreementChecked, setAgreementChecked] = useState(false);

  // Data states
  const [questions, setQuestions] = useState<SanitizedExamQuestion[]>([]);
  const [session, setSession] = useState<TestSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, { option: string; flagged: boolean }>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Timing states
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const timerRef = useRef<any>(null);

  // Sync / Cloud state
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [gradedResult, setGradedResult] = useState<TestSession | null>(null);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1. Initial Load: Fetch questions & session
  useEffect(() => {
    const initExam = async () => {
      setLoading(true);
      try {
        const qList = await fetchExamQuestions(category.id);
        setQuestions(qList);

        const sess = await startOrResumeTestSession({
          applicantId: applicant.id,
          applicantName: applicant.fullName,
          registrationNumber: applicant.registrationNumber,
          userId: applicant.userId,
          scheduleId,
          categoryId: category.id,
          categoryName: category.name,
          durationMinutes: 45, // Default 45 minutes
          totalQuestions: qList.length,
        });

        setSession(sess);

        // If already submitted or graded
        if (sess.status === 'submitted' || sess.status === 'graded' || sess.isLocked) {
          setGradedResult(sess);
          setPhase('submitted');
          setLoading(false);
          return;
        }

        // Fetch existing answers from Firestore or LocalStorage
        const existingAnswers = await fetchTestAnswers(sess.id);
        const map: Record<string, { option: string; flagged: boolean }> = {};

        existingAnswers.forEach((a) => {
          map[a.questionId] = {
            option: a.selectedOption,
            flagged: a.isFlagged || false,
          };
        });

        // Also check LocalStorage for any offline unsynced answers
        qList.forEach((q) => {
          if (!map[q.id]) {
            const cached = localStorage.getItem(`psi_ans_${sess.id}_${q.id}`);
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                map[q.id] = {
                  option: parsed.selectedOption || '',
                  flagged: parsed.isFlagged || false,
                };
              } catch (e) {
                // ignore
              }
            }
          }
        });

        setAnswers(map);

        // Calculate initial time left from server deadline
        if (sess.expiresAt) {
          const deadline = new Date(sess.expiresAt).getTime();
          const now = Date.now();
          const rem = Math.max(0, Math.floor((deadline - now) / 1000));
          setTimeLeftSeconds(rem);
          if (rem <= 0) {
            handleTimeUp(sess.id);
          }
        }
      } catch (err: any) {
        console.error('Error initializing exam:', err);
        alert('Gagal memuat ujian: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    initExam();
  }, [applicant, category, scheduleId]);

  // 2. Countdown Timer
  useEffect(() => {
    if (phase !== 'taking' || timeLeftSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (session) {
            handleTimeUp(session.id);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase, session]);

  // Handle time up
  const handleTimeUp = async (sessionId: string) => {
    setSubmitting(true);
    try {
      const res = await submitAndGradeTestSession(sessionId);
      setGradedResult(res);
      setPhase('submitted');
      onFinished(res);
    } catch (err) {
      console.error('Error on time up submit:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Start exam from briefing
  const handleStartExam = () => {
    if (!agreementChecked) {
      alert('Mohon centang konfirmasi kesiapan dan kejujuran pengerjaan ujian.');
      return;
    }
    setPhase('taking');
  };

  // Save answer handler with debounced auto-save
  const handleSelectOption = async (optionValue: string) => {
    if (!session || session.isLocked || phase !== 'taking') return;

    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const isFlagged = answers[currentQ.id]?.flagged || false;

    // Optimistic UI update
    const updatedAnswers = {
      ...answers,
      [currentQ.id]: { option: optionValue, flagged: isFlagged },
    };
    setAnswers(updatedAnswers);
    setSyncStatus('saving');

    try {
      await saveTestAnswer({
        sessionId: session.id,
        applicantId: applicant.id,
        userId: applicant.userId,
        questionId: currentQ.id,
        selectedOption: optionValue,
        isFlagged,
      });
      setSyncStatus('synced');
    } catch (err: any) {
      console.warn('Auto-save network glitch, saved locally:', err);
      setSyncStatus('offline');
    }
  };

  // Toggle flag / ragu-ragu
  const handleToggleFlag = async () => {
    if (!session || session.isLocked || phase !== 'taking') return;
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const currentAns = answers[currentQ.id]?.option || '';
    const newFlagged = !answers[currentQ.id]?.flagged;

    setAnswers({
      ...answers,
      [currentQ.id]: { option: currentAns, flagged: newFlagged },
    });

    try {
      await saveTestAnswer({
        sessionId: session.id,
        applicantId: applicant.id,
        userId: applicant.userId,
        questionId: currentQ.id,
        selectedOption: currentAns,
        isFlagged: newFlagged,
      });
    } catch (e) {
      // ignore
    }
  };

  // Final Submit handler
  const handleFinalSubmit = async () => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await submitAndGradeTestSession(session.id);
      setGradedResult(res);
      setPhase('submitted');
      setShowSubmitConfirm(false);
      onFinished(res);
    } catch (err: any) {
      alert('Gagal mengirimkan ujian: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Format time MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3 text-slate-600">
        <RefreshCw className="w-8 h-8 animate-spin text-[#0F2137]" />
        <p className="text-xs font-semibold">Mempersiapkan Lembar Ujian CBT Pesantren...</p>
      </div>
    );
  }

  // ================= 1. BRIEFING / ATURAN UJIAN ================= //
  if (phase === 'briefing') {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-mono px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full font-bold">
                CBT SELEKSI PPDB 2026/2027
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0F2137] mt-2">
                {category.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pondok Pesantren Salamatul Insan • Jenjang {applicant.targetLevel}
              </p>
            </div>
            <button
              onClick={onExit}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200"
            >
              Kembali
            </button>
          </div>

          {/* Participant Info Banner */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Nama Peserta</span>
              <span className="font-bold text-slate-800">{applicant.fullName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">No. Registrasi</span>
              <span className="font-mono font-bold text-[#0F2137]">{applicant.registrationNumber}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Jumlah Soal</span>
              <span className="font-bold text-slate-800">{questions.length} Butir Soal</span>
            </div>
          </div>

          {/* Rules & Instructions */}
          <div className="space-y-3 text-xs text-slate-700">
            <h4 className="font-serif font-bold text-sm text-[#0F2137] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#B8860B]" />
              <span>Petunjuk & Tata Tertib Pengerjaan Tes:</span>
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 leading-relaxed text-slate-600">
              <li>Ujian memiliki batas waktu pengerjaan <strong>45 menit</strong> sejak Anda menekan tombol Mulai.</li>
              <li>Jawaban Anda akan <strong>tersimpan secara otomatis</strong> ke Cloud Firestore setiap kali Anda memilih atau mengubah opsi.</li>
              <li>Gunakan tombol <strong>Tandai Ragu-ragu</strong> jika Anda ingin meninjau kembali butir soal tersebut sebelum mengirimkan jawaban.</li>
              <li>Jika koneksi internet terputus di tengah tes, jawaban Anda tetap tersimpan aman di peramban dan akan disinkronkan saat koneksi kembali.</li>
              <li>Ketika waktu hitung mundur habis, sesi ujian akan <strong>otomatis terkunci</strong> dan dinilai oleh sistem secara adil.</li>
              <li>Dilarang membuka tab lain, berkomunikasi dengan peserta lain, atau melakukan kecurangan demi menjaga keberkahan ilmu santri.</li>
            </ul>
          </div>

          {/* Agreement Checkbox */}
          <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreementChecked}
                onChange={(e) => setAgreementChecked(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-[#0F2137]"
              />
              <span className="text-xs font-semibold text-amber-950 leading-relaxed">
                Saya menyatakan siap mengerjakan ujian ini secara mandiri, jujur, dan mematuhi seluruh tata tertib Pondok Pesantren Salamatul Insan.
              </span>
            </label>
          </div>

          {/* Start Action */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onExit}
              className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Nanti Saja
            </button>
            <button
              onClick={handleStartExam}
              disabled={!agreementChecked}
              className="py-2.5 px-6 text-xs font-bold text-white bg-[#0F2137] hover:bg-[#162D4A] rounded-xl transition-all shadow-md disabled:opacity-40 flex items-center gap-2"
            >
              <span>Mulai Ujian Sekarang</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= 3. SUBMITTED / HASIL TAMPILAN ================= //
  if (phase === 'submitted' && gradedResult) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="font-serif text-2xl font-bold text-[#0F2137]">
              Alhamdulillah, Ujian Telah Selesai!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Jawaban Anda untuk kategori <strong>{category.name}</strong> telah berhasil dikirim dan dinilai oleh sistem.
            </p>
          </div>

          {/* Metric Box */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Nilai CBT</span>
              <span className="font-serif font-bold text-2xl text-[#0F2137]">
                {gradedResult.score !== undefined ? gradedResult.score : '-'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Soal Benar</span>
              <span className="font-bold text-emerald-600 text-lg">
                {gradedResult.correctCount || 0}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Soal Salah</span>
              <span className="font-bold text-rose-600 text-lg">
                {gradedResult.wrongCount || 0}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Tidak Dijawab</span>
              <span className="font-bold text-slate-500 text-lg">
                {gradedResult.emptyCount || 0}
              </span>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 leading-relaxed text-left">
            <p className="font-semibold mb-1">ℹ️ Catatan Dewan Penguji:</p>
            <p>
              Nilai di atas merupakan nilai awal tes akademik berbasis komputer. Keputusan kelulusan santri baru akan diakumulasikan bersama hasil tes lisan (Baca Al-Qur'an, Hafalan, dan Wawancara).
            </p>
          </div>

          <button
            onClick={onExit}
            className="w-full py-3 px-4 bg-[#0F2137] hover:bg-[#162D4A] text-white text-xs font-bold rounded-xl transition-all shadow-md"
          >
            Kembali ke Beranda Santri
          </button>
        </div>
      </div>
    );
  }

  // ================= 2. ACTIVE EXAM TAKING INTERFACE ================= //
  const currentQ = questions[currentIndex];
  const currentAnswer = currentQ ? answers[currentQ.id]?.option || '' : '';
  const isCurrentFlagged = currentQ ? answers[currentQ.id]?.flagged || false : false;

  const answeredCount = Object.values(answers).filter((a) => a.option && a.option.trim().length > 0).length;
  const flaggedCount = Object.values(answers).filter((a) => a.flagged).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Test Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Candidate Profile Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F2137] text-[#D4AF37] flex items-center justify-center font-bold text-sm shrink-0 font-serif">
            SI
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#0F2137] bg-slate-100 px-2 py-0.5 rounded">
                {applicant.registrationNumber}
              </span>
              <span className="font-semibold text-xs text-slate-800">{applicant.fullName}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {category.name} • {applicant.targetLevel}
            </p>
          </div>
        </div>

        {/* Sync Status & Countdown Timer */}
        <div className="flex items-center gap-4">
          {/* Storage / Sync indicator */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            {syncStatus === 'synced' && (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tersimpan ke Cloud</span>
              </span>
            )}
            {syncStatus === 'saving' && (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Menyimpan...</span>
              </span>
            )}
            {syncStatus === 'offline' && (
              <span className="flex items-center gap-1 text-rose-600 font-medium">
                <CloudOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cadangan Lokal (Offline)</span>
              </span>
            )}
          </div>

          {/* Timer Clock */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold ${
              timeLeftSeconds < 300
                ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                : 'bg-slate-50 text-[#0F2137] border-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 text-[#B8860B]" />
            <span>Sisa Waktu: {formatTime(timeLeftSeconds)}</span>
          </div>

          {/* Quick Submit Trigger */}
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="py-1.5 px-3 bg-[#0F2137] hover:bg-[#162D4A] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Kirim Jawaban</span>
          </button>
        </div>
      </div>

      {/* Main Exam Grid: 8 cols Question, 4 cols Navigation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Question Panel (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6 min-h-[500px]">
          {currentQ ? (
            <div className="space-y-4">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-[#0F2137] text-white font-bold text-xs flex items-center justify-center">
                    {currentIndex + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Soal No. {currentIndex + 1} dari {questions.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Bobot: {currentQ.weight} Poin
                  </span>
                  <button
                    onClick={handleToggleFlag}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                      isCurrentFlagged
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Flag className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-amber-600 text-amber-600' : ''}`} />
                    <span>{isCurrentFlagged ? 'Ragu-ragu' : 'Tandai'}</span>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-sm font-semibold text-slate-900 leading-relaxed pt-1">
                {currentQ.questionText}
              </div>

              {/* Image if available */}
              {currentQ.imageUrl && (
                <div className="my-3 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  <img
                    src={currentQ.imageUrl}
                    alt="Stimulus Soal"
                    className="max-h-56 rounded-xl object-contain mx-auto"
                  />
                </div>
              )}

              {/* Answer Choices */}
              <div className="pt-2 space-y-2.5">
                {/* 1. Multiple Choice */}
                {currentQ.questionType === 'multiple_choice' && (
                  <div className="space-y-2">
                    {currentQ.options.map((opt, i) => {
                      const labelChar = String.fromCharCode(65 + i);
                      const isSelected = currentAnswer === opt;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectOption(opt)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                            isSelected
                              ? 'bg-[#0F2137]/5 border-[#0F2137] text-[#0F2137] shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? 'bg-[#0F2137] text-white border-[#0F2137]'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {labelChar}
                          </span>
                          <span className="text-xs font-medium leading-relaxed">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. True / False */}
                {currentQ.questionType === 'true_false' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['Benar', 'Salah'].map((val) => {
                      const isSelected = currentAnswer === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleSelectOption(val)}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            isSelected
                              ? 'bg-[#0F2137] text-white border-[#0F2137] shadow-sm font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold'
                          }`}
                        >
                          <span className="text-sm">{val}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3. Short Answer */}
                {currentQ.questionType === 'short_answer' && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 font-medium">
                      Ketikkan jawaban santri di bawah ini:
                    </label>
                    <input
                      type="text"
                      value={currentAnswer}
                      onChange={(e) => handleSelectOption(e.target.value)}
                      placeholder="Tuliskan jawaban singkat Anda di sini..."
                      className="w-full px-4 py-3 text-xs border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0F2137]/20 focus:border-[#0F2137]"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Tidak ada soal pada nomor ini.
            </div>
          )}

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((idx) => Math.min(questions.length - 1, idx + 1))}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0F2137] hover:bg-[#162D4A] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Jawaban Akhir</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Navigation Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-serif font-bold text-sm text-[#0F2137]">
              Navigasi Butir Soal
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Klik nomor untuk langsung berpindah ke soal yang dituju
            </p>
          </div>

          {/* Status Legend */}
          <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-600" />
              <span>Terjawab ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400" />
              <span>Ragu ({flaggedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
              <span>Kosong ({questions.length - answeredCount})</span>
            </div>
          </div>

          {/* Number Grid */}
          <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
            {questions.map((q, idx) => {
              const ans = answers[q.id];
              const isAnswered = ans && ans.option && ans.option.trim().length > 0;
              const isFlagged = ans?.flagged;
              const isCurrent = idx === currentIndex;

              let btnBg = 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400';
              if (isFlagged) {
                btnBg = 'bg-amber-400 text-amber-950 border-amber-500 font-bold';
              } else if (isAnswered) {
                btnBg = 'bg-emerald-600 text-white border-emerald-600 font-bold';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center relative ${btnBg} ${
                    isCurrent ? 'ring-2 ring-[#0F2137] ring-offset-2' : ''
                  }`}
                >
                  {idx + 1}
                  {isFlagged && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-900 absolute top-1 right-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Final Submit Block */}
          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="w-full py-2.5 px-4 bg-[#0F2137] hover:bg-[#162D4A] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 text-[#D4AF37]" />
              <span>Selesaikan Ujian ({answeredCount}/{questions.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL BEFORE SUBMIT */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#0F2137] border-b border-slate-100 pb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="font-serif font-bold text-base">Konfirmasi Pengiriman Ujian</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda telah menjawab <strong>{answeredCount}</strong> dari total <strong>{questions.length}</strong> butir soal.{' '}
              {questions.length - answeredCount > 0 && (
                <span className="text-rose-600 font-semibold block mt-1">
                  Masih ada {questions.length - answeredCount} butir soal yang belum Anda jawab.
                </span>
              )}
            </p>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              Setelah dikirim, sesi ujian akan langsung dikunci dan Anda tidak dapat lagi mengubah jawaban.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="py-2 px-3 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Lanjutkan Mengerjakan
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="py-2.5 px-5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Kirim Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
