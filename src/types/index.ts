export type UserRole = 'admin' | 'examiner' | 'applicant';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phoneNumber?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export type ApplicantStatus = 
  | 'registered'    // Terdaftar, berkas awal masuk
  | 'scheduled'     // Jadwal tes telah ditentukan
  | 'tested'        // Selesai seluruh rangkaian tes
  | 'reviewed'      // Dinilai oleh tim penguji & panitia
  | 'accepted'      // Diterima sebagai santri baru
  | 'rejected'      // Tidak lolos seleksi
  | 'archived';     // Data diarsipkan / dinonaktifkan

export type ApplicantTestStatus =
  | 'belum_tes'     // Belum mengikuti tes
  | 'terjadwal'     // Sudah terjadwal
  | 'sedang_tes'    // Sedang dalam proses tes
  | 'selesai_tes'   // Selesai tes
  | 'dinilai';      // Sudah dinilai penguji

export type EducationTier = 
  | 'Tsanawiyyah (MTs)'
  | 'Aliyah (MA)'
  | "Kulliyatul Mu'allimin (KMI)";

export interface Applicant {
  id: string;
  userId: string;
  registrationNumber: string; // e.g. PPDB-2026-0012
  fullName: string;
  nisn?: string;
  gender: 'Laki-laki' | 'Perempuan';
  birthPlace: string;
  birthDate: string;
  previousSchool: string;
  guardianName: string;
  guardianPhone: string;
  targetLevel: EducationTier;
  status: ApplicantStatus;
  testStatus?: ApplicantTestStatus;
  testScheduleId?: string;
  email?: string;
  notes?: string;
  isArchived?: boolean;
  registrationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type TestDeliveryType = 'computer_based' | 'oral_exam' | 'interview' | 'practical';

export interface TestCategory {
  id: string;
  name: string; // e.g. "Tes Akademik", "Tes Baca Al-Qur'an", "Tes Hafalan", "Tes Wawancara", "Tes Praktik"
  code: string;
  description: string;
  passingScore: number;
  testType: TestDeliveryType;
  weight: number; // Bobot persentase penilaian (e.g. 20%)
  orderIndex: number; // Urutan tampilan kategori tes
  active: boolean;
  type?: string; // e.g. 'cbt' | 'oral' | 'rubric'
  durationMinutes?: number;
  order?: number;
  isActive?: boolean;
  passingGrade?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface QuestionItem {
  id: string;
  categoryId: string;
  categoryName?: string;
  questionText: string;
  questionType: QuestionType;
  imageUrl?: string;
  options: string[]; // Options for multiple choice (A, B, C, D) or True/False
  correctAnswer: string; // The correct option string or key (strictly protected on server/rules)
  weight: number; // Score points awarded for correct answer (e.g. 5, 10)
  active: boolean;
  explanation?: string;
  createdAt: string;
  updatedAt: string;
}

// Sanitized question delivered to student (no answer key)
export interface SanitizedExamQuestion {
  id: string;
  categoryId: string;
  categoryName?: string;
  questionText: string;
  questionType: QuestionType;
  imageUrl?: string;
  options: string[];
  weight: number;
}

export interface QuestionBank {
  id: string;
  categoryId: string;
  title: string;
  durationMinutes: number;
  totalQuestions: number;
  instructions: string;
  active: boolean;
  sampleQuestions?: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex?: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export type ScheduleStatus = 'open' | 'closed' | 'cancelled' | 'completed';

export interface TestSchedule {
  id: string;
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  location: string;
  maxCapacity: number;
  currentCount: number;
  categoryIds?: string[];
  examinerId?: string;
  examinerName?: string;
  status: ScheduleStatus;
  targetTiers?: EducationTier[];
  active: boolean;
  instructions?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssessmentConfig {
  id: string;
  categoryWeights: Record<string, number>; // categoryId -> percentage weight (e.g. cat_akademik: 25)
  passingGrade: number; // Passing grade global (e.g. 70)
  questionsPerExam: number; // Soal yang diambil dari bank (e.g. 25)
  shuffleQuestions: boolean; // Acak soal
  shuffleOptions: boolean; // Acak pilihan jawaban
  defaultDurationMinutes: number; // Durasi tes CBT (e.g. 60 menit)
  correctScore: number; // Poin jawaban benar (e.g. +4)
  wrongScore: number; // Poin jawaban salah (e.g. 0 atau -1)
  emptyScore: number; // Poin jawaban kosong (e.g. 0)
  showInstantResult: boolean; // Apakah hasil tes langsung dilihat peserta
  updatedAt: string;
  updatedBy?: string;
}

export type TestSessionStatus = 'not_started' | 'in_progress' | 'submitted' | 'graded';

export interface TestSession {
  id: string;
  applicantId: string;
  applicantName?: string;
  registrationNumber?: string;
  userId: string;
  scheduleId?: string;
  categoryId: string;
  categoryName: string;
  status: TestSessionStatus;
  startedAt?: string;
  expiresAt?: string; // Validated deadline ISO timestamp
  submittedAt?: string;
  durationMinutes: number;
  totalQuestions: number;
  answeredCount: number;
  score?: number;
  correctCount?: number;
  wrongCount?: number;
  emptyCount?: number;
  summary?: {
    totalQuestions?: number;
    answeredCount?: number;
    correctCount?: number;
    wrongCount?: number;
    emptyCount?: number;
  };
  isLocked: boolean;
  syncStatus?: 'synced' | 'pending' | 'offline';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestAnswer {
  id: string; // Composite key: `${sessionId}_${questionId}` to avoid duplicate answers
  sessionId: string;
  applicantId: string;
  userId: string;
  questionId: string;
  selectedOption: string;
  isFlagged?: boolean; // Ditandai ragu-ragu
  isCorrect?: boolean;
  score?: number;
  savedAt: string;
  syncedToCloud: boolean;
}

export interface TestResult {
  id: string;
  applicantId: string;
  registrationNumber: string;
  applicantName?: string;
  targetLevel?: EducationTier;
  academicScore: number;
  bacaQuranScore?: number;
  tahfidzScore: number;
  wawancaraScore?: number;
  praktikScore?: number;
  interviewScore?: number;
  finalScore: number;
  status: 'passed' | 'failed' | 'conditional' | 'pending';
  categoryBreakdown?: Record<string, {
    score: number;
    weight: number;
    passingScore: number;
    isPassed: boolean;
    examinerName?: string;
    evaluatedAt?: string;
    notes?: string;
    status: 'graded' | 'pending' | 'draft';
  }>;
  decidedAt?: string;
  decidedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type AssessmentStatus = 'draft' | 'final';

export interface ExaminerAssessment {
  id: string;
  applicantId: string;
  applicantName: string;
  registrationNumber: string;
  examinerId: string;
  examinerName: string;
  categoryId: string;
  categoryName?: string;
  assessmentType: 'tahfidz' | 'quran_recitation' | 'interview' | 'attitude' | 'practical';
  score: number;
  tajweedScore?: number;
  memorizationScore?: number;
  adabScore?: number;
  rubricScores?: Record<string, number>;
  criteriaFeedback?: Record<string, string>;
  notes?: string;
  recommendation: 'Sangat Direkomendasikan' | 'Direkomendasikan' | 'Dipertimbangkan' | 'Tidak Direkomendasikan';
  status: AssessmentStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface TemporaryRecap {
  applicant: Applicant;
  cbtSession?: TestSession;
  manualAssessments: ExaminerAssessment[];
  categoryScores: Array<{
    category: TestCategory;
    score: number;
    weightedScore: number;
    status: 'final' | 'draft' | 'pending';
    examinerName?: string;
    notes?: string;
    correctCount?: number;
    wrongCount?: number;
    unansweredCount?: number;
  }>;
  totalWeightedScore: number;
  allMandatoryGraded: boolean;
  missingCategories: string[];
}

export interface AdmissionDecision {
  id: string;
  applicantId: string;
  applicantName?: string;
  registrationNumber: string;
  targetLevel?: EducationTier;
  decision: 'accepted' | 'rejected' | 'waitlist' | 'pending';
  finalScore: number;
  decreeNumber?: string;
  notes?: string;
  isAllCompleted: boolean;
  categoryBreakdownSummary?: Record<string, number>;
  decidedBy: string;
  decidedByName?: string;
  decidedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalApplicants: number;
  yetToTest: number;
  testedCount: number;
  incompleteAssessmentCount: number; // Penilaian belum lengkap
  acceptedCount: number;             // Peserta lulus
  rejectedCount: number;             // Peserta tidak lulus
  pendingDecision: number;           // Menunggu keputusan
}

export interface AnnouncementConfig {
  id: string;
  isPublished: boolean;
  publishDate: string;
  allowApplicantsViewDetailScores: boolean;
  allowApplicantsViewRankings: boolean;
  allowApplicantsDownloadLetter: boolean;
  announcementTitle: string;
  officialNotes?: string;
  signatoryName: string;
  signatoryTitle: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action:
    | 'decision_created'
    | 'decision_updated'
    | 'manual_score_modified'
    | 'announcement_config_changed'
    | 'applicant_created'
    | 'applicant_archived';
  entityType: 'applicant' | 'decision' | 'assessment' | 'announcement';
  entityId: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  details: string;
  timestamp: string;
  previousValue?: string;
  newValue?: string;
}

export interface ConsolidatedResultItem {
  applicant: Applicant;
  cbtScore?: number;
  categoryScores: Record<
    string,
    {
      score: number;
      weight: number;
      weightedScore: number;
      passingScore: number;
      isPassed: boolean;
      status: 'final' | 'draft' | 'pending';
      examinerName?: string;
      notes?: string;
    }
  >;
  totalWeightedScore: number;
  isAllCompleted: boolean;
  missingCategories: string[];
  autoRecommendation: 'Lulus' | 'Tidak Lulus' | 'Menunggu Penilaian Lengkap';
  decision?: AdmissionDecision;
}
