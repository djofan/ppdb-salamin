import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { handleFirestoreError, OperationType } from './errors';
import {
  Applicant,
  ApplicantStatus,
  ApplicantTestStatus,
  DashboardStats,
  TestCategory,
  TestSchedule,
  ScheduleStatus,
  TestSession,
  TestAnswer,
  SanitizedExamQuestion,
  ExaminerAssessment,
  AdmissionDecision,
  QuestionBank,
  QuestionItem,
  AssessmentConfig,
  TemporaryRecap,
  AnnouncementConfig,
  AuditLog,
  ConsolidatedResultItem,
} from '@/src/types';

// ================= APPLICANTS & STATS ================= //

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const path = 'applicants';
  try {
    const [appSnap, decSnap, asmSnap, catSnap] = await Promise.all([
      getDocs(collection(db, 'applicants')),
      getDocs(collection(db, 'admissionDecisions')),
      getDocs(collection(db, 'examinerAssessments')),
      getDocs(collection(db, 'testCategories')),
    ]);

    const applicants = appSnap.docs
      .map((d) => ({ ...d.data(), id: d.id } as Applicant))
      .filter((a) => !a.isArchived);

    const decisions = decSnap.docs.map((d) => d.data() as AdmissionDecision);
    const assessments = asmSnap.docs.map((d) => d.data() as ExaminerAssessment);
    const categories = catSnap.docs
      .map((d) => d.data() as TestCategory)
      .filter((c) => c.active !== false);

    const manualCategories = categories.filter((c) => c.testType !== 'computer_based' && c.type !== 'cbt');

    const totalApplicants = applicants.length;

    // Belum tes
    const yetToTest = applicants.filter(
      (a) =>
        (a.status === 'registered' || a.status === 'scheduled') &&
        (a.testStatus === 'belum_tes' || !a.testStatus)
    ).length;

    // Selesai tes
    const testedCount = applicants.filter(
      (a) =>
        ['tested', 'reviewed', 'accepted', 'rejected'].includes(a.status) ||
        a.testStatus === 'selesai_tes' ||
        a.testStatus === 'dinilai'
    ).length;

    // Keputusan kelulusan
    const acceptedCount = applicants.filter((a) => {
      const dec = decisions.find((d) => d.applicantId === a.id);
      return a.status === 'accepted' || dec?.decision === 'accepted';
    }).length;

    const rejectedCount = applicants.filter((a) => {
      const dec = decisions.find((d) => d.applicantId === a.id);
      return a.status === 'rejected' || dec?.decision === 'rejected';
    }).length;

    // Menunggu keputusan
    const pendingDecision = applicants.filter((a) => {
      const dec = decisions.find((d) => d.applicantId === a.id);
      const isTested =
        ['tested', 'reviewed'].includes(a.status) ||
        a.testStatus === 'selesai_tes' ||
        a.testStatus === 'dinilai';
      const hasFinalDecision = dec && (dec.decision === 'accepted' || dec.decision === 'rejected');
      return isTested && !hasFinalDecision;
    }).length;

    // Penilaian belum lengkap: santri yang sudah ikut ujian / dinilai tapi masih ada rubrik penguji wajib yang missing / draft
    const incompleteAssessmentCount = applicants.filter((a) => {
      if (a.status === 'registered' || (a.status === 'scheduled' && a.testStatus === 'belum_tes')) {
        return false;
      }
      const appAsms = assessments.filter((asm) => asm.applicantId === a.id && asm.status === 'final');
      const missing = manualCategories.filter((mc) => !appAsms.some((asm) => asm.categoryId === mc.id));
      return missing.length > 0;
    }).length;

    return {
      totalApplicants,
      yetToTest,
      testedCount,
      incompleteAssessmentCount,
      acceptedCount,
      rejectedCount,
      pendingDecision,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return {
      totalApplicants: 0,
      yetToTest: 0,
      testedCount: 0,
      incompleteAssessmentCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      pendingDecision: 0,
    };
  }
}

export async function fetchApplicants(includeArchived = false): Promise<Applicant[]> {
  const path = 'applicants';
  try {
    const snap = await getDocs(collection(db, path));
    let list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Applicant));
    if (!includeArchived) {
      list = list.filter(a => !a.isArchived);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchApplicantByUserId(userId: string): Promise<Applicant | null> {
  const path = 'applicants';
  try {
    const q = query(collection(db, path), where('userId', '==', userId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { ...d.data(), id: d.id } as Applicant;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createApplicant(
  data: Omit<Applicant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const path = 'applicants';
  const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const now = new Date().toISOString();
    const payload: Applicant = {
      ...data,
      id,
      testStatus: data.testStatus || 'belum_tes',
      isArchived: false,
      registrationDate: data.registrationDate || now.split('T')[0],
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, path, id), payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateApplicant(
  applicantId: string,
  data: Partial<Applicant>
): Promise<void> {
  const path = `applicants/${applicantId}`;
  try {
    const ref = doc(db, 'applicants', applicantId);
    await updateDoc(ref, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateApplicantStatus(
  applicantId: string,
  status: ApplicantStatus,
  notes?: string
): Promise<void> {
  const path = `applicants/${applicantId}`;
  try {
    const ref = doc(db, 'applicants', applicantId);
    const updatePayload: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (notes) updatePayload.notes = notes;
    await updateDoc(ref, updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function archiveApplicant(applicantId: string, archived: boolean): Promise<void> {
  const path = `applicants/${applicantId}`;
  try {
    const ref = doc(db, 'applicants', applicantId);
    await updateDoc(ref, {
      isArchived: archived,
      status: archived ? 'archived' : 'registered',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteApplicant(applicantId: string): Promise<void> {
  const path = `applicants/${applicantId}`;
  try {
    await deleteDoc(doc(db, 'applicants', applicantId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function importApplicantsBatch(
  applicantsList: Array<Omit<Applicant, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<number> {
  const path = 'applicants';
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    let count = 0;

    for (const item of applicantsList) {
      const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${count}`;
      const docRef = doc(db, path, id);
      batch.set(docRef, {
        ...item,
        id,
        testStatus: item.testStatus || 'belum_tes',
        isArchived: false,
        registrationDate: item.registrationDate || now.split('T')[0],
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ================= TEST CATEGORIES ================= //

export async function fetchTestCategories(): Promise<TestCategory[]> {
  const path = 'testCategories';
  try {
    const snap = await getDocs(collection(db, path));
    const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as TestCategory));
    return list.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createTestCategory(category: Omit<TestCategory, 'id'>): Promise<string> {
  const path = 'testCategories';
  const id = `cat_${Date.now()}`;
  try {
    await setDoc(doc(db, path, id), {
      ...category,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTestCategory(
  id: string,
  data: Partial<TestCategory>
): Promise<void> {
  const path = `testCategories/${id}`;
  try {
    await updateDoc(doc(db, 'testCategories', id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTestCategory(id: string): Promise<void> {
  const path = `testCategories/${id}`;
  try {
    await deleteDoc(doc(db, 'testCategories', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function reorderTestCategories(orderedIds: string[]): Promise<void> {
  const path = 'testCategories';
  try {
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
      const ref = doc(db, path, id);
      batch.update(ref, { orderIndex: index + 1, updatedAt: new Date().toISOString() });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ================= QUESTION ITEMS (BANK SOAL) ================= //

export async function fetchQuestions(categoryId?: string): Promise<QuestionItem[]> {
  const path = 'questions';
  try {
    let snap;
    if (categoryId && categoryId !== 'all') {
      const q = query(collection(db, path), where('categoryId', '==', categoryId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(collection(db, path));
    }
    const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as QuestionItem));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createQuestion(
  question: Omit<QuestionItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const path = 'questions';
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const now = new Date().toISOString();
    await setDoc(doc(db, path, id), {
      ...question,
      id,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateQuestion(
  id: string,
  data: Partial<QuestionItem>
): Promise<void> {
  const path = `questions/${id}`;
  try {
    await updateDoc(doc(db, 'questions', id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteQuestion(id: string): Promise<void> {
  const path = `questions/${id}`;
  try {
    await deleteDoc(doc(db, 'questions', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function toggleQuestionStatus(id: string, active: boolean): Promise<void> {
  const path = `questions/${id}`;
  try {
    await updateDoc(doc(db, 'questions', id), {
      active,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ================= TEST SCHEDULES ================= //

export async function fetchTestSchedules(): Promise<TestSchedule[]> {
  const path = 'testSchedules';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as TestSchedule));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createTestSchedule(sched: Omit<TestSchedule, 'id'>): Promise<string> {
  const path = 'testSchedules';
  const id = `sch_${Date.now()}`;
  try {
    await setDoc(doc(db, path, id), {
      ...sched,
      id,
      status: sched.status || 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTestSchedule(
  id: string,
  data: Partial<TestSchedule>
): Promise<void> {
  const path = `testSchedules/${id}`;
  try {
    await updateDoc(doc(db, 'testSchedules', id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateScheduleStatus(id: string, status: ScheduleStatus): Promise<void> {
  const path = `testSchedules/${id}`;
  try {
    await updateDoc(doc(db, 'testSchedules', id), {
      status,
      active: status === 'open',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTestSchedule(id: string): Promise<void> {
  const path = `testSchedules/${id}`;
  try {
    await deleteDoc(doc(db, 'testSchedules', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ================= ASSESSMENT CONFIG ================= //

export const DEFAULT_ASSESSMENT_CONFIG: AssessmentConfig = {
  id: 'global_config',
  categoryWeights: {
    cat_akademik: 20,
    cat_baca_quran: 25,
    cat_hafalan: 25,
    cat_wawancara: 15,
    cat_praktik: 15,
  },
  passingGrade: 70,
  questionsPerExam: 25,
  shuffleQuestions: true,
  shuffleOptions: true,
  defaultDurationMinutes: 60,
  correctScore: 4,
  wrongScore: 0,
  emptyScore: 0,
  showInstantResult: false,
  updatedAt: new Date().toISOString(),
};

export async function fetchAssessmentConfig(): Promise<AssessmentConfig> {
  const path = 'assessmentConfig/global_config';
  try {
    const docSnap = await getDoc(doc(db, 'assessmentConfig', 'global_config'));
    if (docSnap.exists()) {
      return { ...DEFAULT_ASSESSMENT_CONFIG, ...docSnap.data() } as AssessmentConfig;
    }
    return DEFAULT_ASSESSMENT_CONFIG;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveAssessmentConfig(config: Partial<AssessmentConfig>): Promise<void> {
  const path = 'assessmentConfig/global_config';
  try {
    const payload = {
      ...DEFAULT_ASSESSMENT_CONFIG,
      ...config,
      id: 'global_config',
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'assessmentConfig', 'global_config'), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ================= ASSESSMENTS & DECISIONS ================= //

export async function fetchExaminerAssessments(applicantId?: string): Promise<ExaminerAssessment[]> {
  const path = 'examinerAssessments';
  try {
    let snap;
    if (applicantId) {
      const q = query(collection(db, path), where('applicantId', '==', applicantId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(collection(db, path));
    }
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as ExaminerAssessment));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function submitExaminerAssessment(
  assessment: Omit<ExaminerAssessment, 'id' | 'createdAt'>
): Promise<string> {
  const path = 'examinerAssessments';
  const id = `asm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const payload = {
      ...assessment,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, path, id), payload);

    // Also update applicant status
    await updateApplicant(assessment.applicantId, {
      status: 'reviewed',
      testStatus: 'dinilai',
    });

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchAdmissionDecisions(): Promise<AdmissionDecision[]> {
  const path = 'admissionDecisions';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as AdmissionDecision));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function submitAdmissionDecision(
  decision: Omit<AdmissionDecision, 'id' | 'decidedAt'>
): Promise<string> {
  const path = 'admissionDecisions';
  const id = `dec_${Date.now()}`;
  try {
    const payload = {
      ...decision,
      id,
      decidedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, path, id), payload);

    const targetStatus = decision.decision === 'accepted' ? 'accepted' : 'rejected';
    await updateApplicantStatus(decision.applicantId, targetStatus);

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchQuestionBanks(): Promise<QuestionBank[]> {
  const path = 'questionBanks';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as QuestionBank));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ================= SEED DATA LENGKAP PPDB ================= //

export async function seedDemoPesantrenData(): Promise<void> {
  // 1. Kategori Tes Sesuai Modul 2 (Tes Akademik, Baca Al-Qur'an, Hafalan, Wawancara, Praktik)
  const categories: Array<Omit<TestCategory, 'id'>> = [
    {
      name: 'Tes Akademik',
      code: 'AKADEMIK',
      description: 'Tes tertulis CBT meliputi Matematika Dasar, IPA/IPS umum, dan Wawasan Kebangsaan.',
      passingScore: 65,
      testType: 'computer_based',
      weight: 20,
      orderIndex: 1,
      active: true,
    },
    {
      name: "Tes Baca Al-Qur'an",
      code: 'BACA_QURAN',
      description: 'Ujian lisan membaca mushaf Al-Qur\'an dengan memperhatikan kaidah tajwid, fashahah, dan makhraj.',
      passingScore: 75,
      testType: 'oral_exam',
      weight: 25,
      orderIndex: 2,
      active: true,
    },
    {
      name: 'Tes Hafalan',
      code: 'HAFALAN',
      description: 'Tes sambung ayat dan kelancaran hafalan Juz 30 (Juz Amma) atau hafalan mutaqaddim santri.',
      passingScore: 75,
      testType: 'oral_exam',
      weight: 25,
      orderIndex: 3,
      active: true,
    },
    {
      name: 'Tes Wawancara',
      code: 'WAWANCARA',
      description: 'Wawancara motivasi nyantri, kemandirian santri, serta kesiapan dan komitmen orang tua/wali.',
      passingScore: 70,
      testType: 'interview',
      weight: 15,
      orderIndex: 4,
      active: true,
    },
    {
      name: 'Tes Praktik',
      code: 'PRAKTIK',
      description: 'Praktik ibadah praktis harian: wudhu, tayamum, bacaan shalat fardhu, dan doa harian.',
      passingScore: 70,
      testType: 'practical',
      weight: 15,
      orderIndex: 5,
      active: true,
    },
  ];

  for (const cat of categories) {
    const catId = `cat_${cat.code.toLowerCase()}`;
    await setDoc(doc(db, 'testCategories', catId), {
      ...cat,
      id: catId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 2. Bank Soal (Questions) lengkap dengan berbagai tipe (Pilihan Ganda, Benar/Salah, Isian Singkat)
  const sampleQuestions: Array<Omit<QuestionItem, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      categoryId: 'cat_akademik',
      categoryName: 'Tes Akademik',
      questionText: 'Sebuah kolam pesantren berbentuk persegi panjang dengan panjang 12 meter dan lebar 8 meter. Keliling kolam tersebut adalah...',
      questionType: 'multiple_choice',
      options: ['20 meter', '40 meter', '96 meter', '48 meter'],
      correctAnswer: '40 meter',
      weight: 5,
      active: true,
      explanation: 'Rumus keliling persegi panjang = 2 x (p + l) = 2 x (12 + 8) = 40 meter.',
    },
    {
      categoryId: 'cat_akademik',
      categoryName: 'Tes Akademik',
      questionText: 'Gagasan utama atau ide pokok dalam sebuah paragraf biasanya terdapat pada kalimat...',
      questionType: 'multiple_choice',
      options: ['Utama', 'Penjelas', 'Terakhir saja', 'Penghubung'],
      correctAnswer: 'Utama',
      weight: 5,
      active: true,
      explanation: 'Ide pokok terdapat pada kalimat utama paragraf (baik deduktif maupun induktif).',
    },
    {
      categoryId: 'cat_akademik',
      categoryName: 'Tes Akademik',
      questionText: 'Mata uang Republik Indonesia adalah Rupiah.',
      questionType: 'true_false',
      options: ['Benar', 'Salah'],
      correctAnswer: 'Benar',
      weight: 5,
      active: true,
      explanation: 'Rupiah (IDR) adalah mata uang resmi NKRI.',
    },
    {
      categoryId: 'cat_akademik',
      categoryName: 'Tes Akademik',
      questionText: 'Sebutkan nama ibukota negara Indonesia saat ini!',
      questionType: 'short_answer',
      options: [],
      correctAnswer: 'Jakarta',
      weight: 5,
      active: true,
      explanation: 'DKI Jakarta merupakan pusat pemerintahan dan ibukota saat ini.',
    },
    {
      categoryId: 'cat_baca_quran',
      categoryName: "Tes Baca Al-Qur'an",
      questionText: 'Ketika nun sukun (نْ) bertemu dengan huruf Ba (ب), hukum bacaan tajwid yang terjadi adalah...',
      questionType: 'multiple_choice',
      options: ['Idgham Bighunnah', 'Iqlab', 'Ikhfa Haqiqi', 'Idzhar Halqi'],
      correctAnswer: 'Iqlab',
      weight: 10,
      active: true,
      explanation: 'Hukum Iqlab menggantikan bunyi nun sukun menjadi mim disertai dengungan.',
    },
    {
      categoryId: 'cat_hafalan',
      categoryName: 'Tes Hafalan',
      questionText: 'Lanjutan ayat dari surat An-Naba: "عَمَّ يَتَسَآءَلُونَ • عَنِ ٱلنَّبَإِ..." adalah...',
      questionType: 'multiple_choice',
      options: ['ٱلۡعَظِيمِ', 'ٱلَّذِي هُمۡ فِيهِ مُخۡتَلِفُونَ', 'كَلَّا سَيَعۡلَمُونَ', 'ثُمَّ كَلَّا سَيَعۡلَمُونَ'],
      correctAnswer: 'ٱلۡعَظِيمِ',
      weight: 10,
      active: true,
      explanation: 'Surat An-Naba ayat 2: عَنِ ٱلنَّبَإِ ٱلۡعَظِيمِ.',
    },
    {
      categoryId: 'cat_praktik',
      categoryName: 'Tes Praktik',
      questionText: 'Membasuh kedua telinga merupakan rukun wajib dalam berwudhu.',
      questionType: 'true_false',
      options: ['Benar', 'Salah'],
      correctAnswer: 'Salah',
      weight: 5,
      active: true,
      explanation: 'Membasuh telinga merupakan sunnah wudhu menurut jumhur ulama.',
    },
  ];

  for (let i = 0; i < sampleQuestions.length; i++) {
    const qId = `q_demo_${i + 1}`;
    await setDoc(doc(db, 'questions', qId), {
      ...sampleQuestions[i],
      id: qId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 3. Konfigurasi Penilaian Global
  await saveAssessmentConfig({
    categoryWeights: {
      cat_akademik: 20,
      cat_baca_quran: 25,
      cat_hafalan: 25,
      cat_wawancara: 15,
      cat_praktik: 15,
    },
    passingGrade: 70,
    questionsPerExam: 20,
    shuffleQuestions: true,
    shuffleOptions: true,
    defaultDurationMinutes: 60,
    correctScore: 4,
    wrongScore: 0,
    emptyScore: 0,
    showInstantResult: false,
  });

  // 4. Jadwal Tes Terstruktur
  const schedules: Array<Omit<TestSchedule, 'id'>> = [
    {
      title: 'Sesi 1 Gelombang 1 - MTs & MA (Pagi)',
      sessionDate: '2026-11-15',
      startTime: '08:00',
      endTime: '11:30',
      durationMinutes: 210,
      location: 'Gedung Al-Hikmah & Laboratorium CBT',
      maxCapacity: 60,
      currentCount: 38,
      categoryIds: ['cat_akademik', 'cat_baca_quran', 'cat_hafalan'],
      examinerName: 'Ust. Ahmad Fauzan, Lc., M.Ag.',
      status: 'open',
      targetTiers: ['Tsanawiyyah (MTs)', 'Aliyah (MA)'],
      active: true,
      instructions: 'Peserta wajib hadir 30 menit sebelum sesi dimulai dengan busana muslim/muslimah rapi dan membawa mushaf.',
    },
    {
      title: 'Sesi 2 Gelombang 1 - Wawancara & Praktik (Siang)',
      sessionDate: '2026-11-15',
      startTime: '13:00',
      endTime: '16:00',
      durationMinutes: 180,
      location: 'Ruang Sidang Asatidz & Masjid Jami',
      maxCapacity: 50,
      currentCount: 25,
      categoryIds: ['cat_wawancara', 'cat_praktik'],
      examinerName: 'Ust. Muhammad Wildan, S.Pd.I.',
      status: 'open',
      targetTiers: ["Kulliyatul Mu'allimin (KMI)", 'Aliyah (MA)'],
      active: true,
      instructions: 'Wawancara santri didampingi oleh orang tua/wali santri.',
    },
  ];

  for (let i = 0; i < schedules.length; i++) {
    const sId = `sch_demo_0${i + 1}`;
    await setDoc(doc(db, 'testSchedules', sId), {
      ...schedules[i],
      id: sId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 5. Sample Applicants dengan status lengkap (Semua Jenjang & Variasi Status)
  const demoApplicants: Applicant[] = [
    {
      id: 'app_demo_01',
      userId: 'user_santri_01',
      registrationNumber: 'PPDB-2026-0012',
      fullName: 'Muhammad Zaid Al-Fatih',
      nisn: '0129384756',
      gender: 'Laki-laki',
      birthPlace: 'Cirebon',
      birthDate: '2012-04-10',
      previousSchool: 'SDIT Nurul Fikri Cirebon',
      guardianName: 'H. Bambang Irawan',
      guardianPhone: '081234567890',
      targetLevel: 'Tsanawiyyah (MTs)',
      status: 'registered',
      testStatus: 'belum_tes',
      testScheduleId: 'sch_demo_01',
      email: 'santri.zaid@gmail.com',
      registrationDate: '2026-10-10',
      isArchived: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 7).toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Pendaftar baru jalur reguler, berkas ijazah terverifikasi.',
    },
    {
      id: 'app_demo_02',
      userId: 'user_santri_02',
      registrationNumber: 'PPDB-2026-0034',
      fullName: 'Fathimah Azzahra',
      nisn: '0129847123',
      gender: 'Perempuan',
      birthPlace: 'Bandung',
      birthDate: '2012-08-22',
      previousSchool: 'MI Persis 12 Bandung',
      guardianName: 'Ir. Hendra Gunawan',
      guardianPhone: '085712345678',
      targetLevel: 'Tsanawiyyah (MTs)',
      status: 'scheduled',
      testStatus: 'terjadwal',
      testScheduleId: 'sch_demo_01',
      email: 'fathimah.azzahra@gmail.com',
      registrationDate: '2026-10-12',
      isArchived: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 6).toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Jadwal tes telah dikonfirmasi panitia.',
    },
    {
      id: 'app_demo_03',
      userId: 'user_santri_03',
      registrationNumber: 'PPDB-2026-0056',
      fullName: 'Rizqy Abdurrahman',
      nisn: '0098712345',
      gender: 'Laki-laki',
      birthPlace: 'Semarang',
      birthDate: '2009-11-05',
      previousSchool: 'SMP Islam Terpadu Assalam',
      guardianName: 'Drs. Supriyadi',
      guardianPhone: '081398765432',
      targetLevel: 'Aliyah (MA)',
      status: 'reviewed',
      testStatus: 'dinilai',
      testScheduleId: 'sch_demo_01',
      email: 'rizqy.abdur@gmail.com',
      registrationDate: '2026-10-14',
      isArchived: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Nilai ujian lengkap di atas passing grade, menunggu pengesahan sidang pleno.',
    },
    {
      id: 'app_demo_04',
      userId: 'user_santri_04',
      registrationNumber: 'PPDB-2026-0088',
      fullName: 'Aisyah Putri Humaira',
      nisn: '0091238765',
      gender: 'Perempuan',
      birthPlace: 'Bogor',
      birthDate: '2009-02-14',
      previousSchool: 'MTs Al-Inayah',
      guardianName: 'Hj. Siti Aminah',
      guardianPhone: '081122334455',
      targetLevel: "Kulliyatul Mu'allimin (KMI)",
      status: 'accepted',
      testStatus: 'dinilai',
      testScheduleId: 'sch_demo_02',
      email: 'aisyah.humaira@gmail.com',
      registrationDate: '2026-10-15',
      isArchived: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Lolos seleksi jalur prestasi tahfidz dan akademik.',
    },
    {
      id: 'app_demo_05',
      userId: 'user_santri_05',
      registrationNumber: 'PPDB-2026-0092',
      fullName: 'Ahmad Bilal Al-Habsyi',
      nisn: '0123456789',
      gender: 'Laki-laki',
      birthPlace: 'Solo',
      birthDate: '2012-01-18',
      previousSchool: 'SD Negeri 1 Solo',
      guardianName: 'H. Salim Al-Habsyi',
      guardianPhone: '081299887766',
      targetLevel: 'Tsanawiyyah (MTs)',
      status: 'rejected',
      testStatus: 'dinilai',
      testScheduleId: 'sch_demo_01',
      email: 'bilal.habsyi@gmail.com',
      registrationDate: '2026-10-16',
      isArchived: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 4).toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Belum memenuhi kriteria passing grade minimal kelulusan.',
    },
    {
      id: 'app_demo_06',
      userId: 'user_santri_06',
      registrationNumber: 'PPDB-2026-0105',
      fullName: 'Khadijah Nur Azizah',
      nisn: '0092837465',
      gender: 'Perempuan',
      birthPlace: 'Surabaya',
      birthDate: '2009-07-30',
      previousSchool: 'SMP Khadijah Surabaya',
      guardianName: 'Dra. Endang Sulastri',
      guardianPhone: '082155443322',
      targetLevel: 'Aliyah (MA)',
      status: 'tested',
      testStatus: 'sedang_tes',
      testScheduleId: 'sch_demo_01',
      email: 'khadijah.nur@gmail.com',
      registrationDate: '2026-10-17',
      isArchived: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'CBT selesai, namun belum mengikuti tes wawancara dan praktik ibadah.',
    },
    {
      id: 'app_demo_07',
      userId: 'user_santri_07',
      registrationNumber: 'PPDB-2026-0120',
      fullName: 'Salman Al-Farisi',
      nisn: '0087654321',
      gender: 'Laki-laki',
      birthPlace: 'Yogyakarta',
      birthDate: '2008-05-12',
      previousSchool: 'MTs Muallimin Jogja',
      guardianName: 'Dr. Agus Santoso',
      guardianPhone: '081822334411',
      targetLevel: "Kulliyatul Mu'allimin (KMI)",
      status: 'reviewed',
      testStatus: 'dinilai',
      testScheduleId: 'sch_demo_02',
      email: 'salman.alfarisi@gmail.com',
      registrationDate: '2026-10-18',
      isArchived: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Seluruh tahapan tes selesai, direkomendasikan penguji.',
    },
  ];

  for (const app of demoApplicants) {
    await setDoc(doc(db, 'applicants', app.id), app);
  }

  // 6. Seed Test Sessions (CBT)
  const demoSessions = [
    {
      id: 'sess_app_demo_03',
      applicantId: 'app_demo_03',
      userId: 'user_santri_03',
      categoryId: 'cat_akademik',
      scheduleId: 'sch_demo_01',
      status: 'submitted' as const,
      startedAt: new Date(Date.now() - 3600 * 1000 * 24 * 3).toISOString(),
      submittedAt: new Date(Date.now() - 3600 * 1000 * 24 * 3 + 45 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 3600 * 1000 * 24 * 3 + 60 * 60 * 1000).toISOString(),
      durationMinutes: 60,
      score: 85,
      summary: { totalQuestions: 15, answeredCount: 15, correctCount: 13, wrongCount: 2, emptyCount: 0 },
    },
    {
      id: 'sess_app_demo_04',
      applicantId: 'app_demo_04',
      userId: 'user_santri_04',
      categoryId: 'cat_akademik',
      scheduleId: 'sch_demo_02',
      status: 'submitted' as const,
      startedAt: new Date(Date.now() - 3600 * 1000 * 24 * 4).toISOString(),
      submittedAt: new Date(Date.now() - 3600 * 1000 * 24 * 4 + 40 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 3600 * 1000 * 24 * 4 + 60 * 60 * 1000).toISOString(),
      durationMinutes: 60,
      score: 95,
      summary: { totalQuestions: 15, answeredCount: 15, correctCount: 14, wrongCount: 1, emptyCount: 0 },
    },
    {
      id: 'sess_app_demo_05',
      applicantId: 'app_demo_05',
      userId: 'user_santri_05',
      categoryId: 'cat_akademik',
      scheduleId: 'sch_demo_01',
      status: 'submitted' as const,
      startedAt: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
      submittedAt: new Date(Date.now() - 3600 * 1000 * 24 * 2 + 50 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 3600 * 1000 * 24 * 2 + 60 * 60 * 1000).toISOString(),
      durationMinutes: 60,
      score: 55,
      summary: { totalQuestions: 15, answeredCount: 15, correctCount: 8, wrongCount: 7, emptyCount: 0 },
    },
    {
      id: 'sess_app_demo_06',
      applicantId: 'app_demo_06',
      userId: 'user_santri_06',
      categoryId: 'cat_akademik',
      scheduleId: 'sch_demo_01',
      status: 'submitted' as const,
      startedAt: new Date(Date.now() - 3600 * 1000 * 24 * 1).toISOString(),
      submittedAt: new Date(Date.now() - 3600 * 1000 * 24 * 1 + 52 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 3600 * 1000 * 24 * 1 + 60 * 60 * 1000).toISOString(),
      durationMinutes: 60,
      score: 78,
      summary: { totalQuestions: 15, answeredCount: 15, correctCount: 12, wrongCount: 3, emptyCount: 0 },
    },
    {
      id: 'sess_app_demo_07',
      applicantId: 'app_demo_07',
      userId: 'user_santri_07',
      categoryId: 'cat_akademik',
      scheduleId: 'sch_demo_02',
      status: 'submitted' as const,
      startedAt: new Date(Date.now() - 3600 * 1000 * 24 * 1).toISOString(),
      submittedAt: new Date(Date.now() - 3600 * 1000 * 24 * 1 + 48 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 3600 * 1000 * 24 * 1 + 60 * 60 * 1000).toISOString(),
      durationMinutes: 60,
      score: 82,
      summary: { totalQuestions: 15, answeredCount: 15, correctCount: 12, wrongCount: 3, emptyCount: 0 },
    },
  ];

  for (const sess of demoSessions) {
    await setDoc(doc(db, 'testSessions', sess.id), sess);
  }

  // 7. Seed Examiner Assessments (Manual Rubrics)
  const demoAssessments: ExaminerAssessment[] = [
    // app_demo_03 (Rizqy - MA)
    {
      id: 'asm_03_quran',
      applicantId: 'app_demo_03',
      applicantName: 'Rizqy Abdurrahman',
      registrationNumber: 'PPDB-2026-0056',
      examinerId: 'examiner_01',
      examinerName: 'Ust. Ahmad Fauzan, Lc., M.Ag.',
      categoryId: 'cat_baca_quran',
      categoryName: "Tes Baca Al-Qur'an",
      assessmentType: 'quran_recitation',
      score: 88,
      rubricScores: { makhraj: 90, tajweed: 85, fluency: 90, adab: 85 },
      notes: 'Tilawah tartil, makhraj fasih, pemahaman hukum mad sangat baik.',
      recommendation: 'Sangat Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'asm_03_hafalan',
      applicantId: 'app_demo_03',
      applicantName: 'Rizqy Abdurrahman',
      registrationNumber: 'PPDB-2026-0056',
      examinerId: 'examiner_01',
      examinerName: 'Ust. Ahmad Fauzan, Lc., M.Ag.',
      categoryId: 'cat_hafalan',
      categoryName: 'Tes Hafalan',
      assessmentType: 'tahfidz',
      score: 82,
      rubricScores: { fluency: 80, mutqin: 85, rhythm: 80 },
      notes: 'Hafalan Juz 30 mutqin, penguasaan ayat-ayat awal juz 29 lancar.',
      recommendation: 'Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'asm_03_wawancara',
      applicantId: 'app_demo_03',
      applicantName: 'Rizqy Abdurrahman',
      registrationNumber: 'PPDB-2026-0056',
      examinerId: 'examiner_02',
      examinerName: 'Ust. Muhammad Wildan, S.Pd.I.',
      categoryId: 'cat_wawancara',
      categoryName: 'Tes Wawancara',
      assessmentType: 'interview',
      score: 85,
      rubricScores: { readiness: 85, commitment: 90, character: 85, vision: 80 },
      notes: 'Motivasi santri mandiri tinggi, orang tua mendukung penuh sistem asrama.',
      recommendation: 'Sangat Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'asm_03_praktik',
      applicantId: 'app_demo_03',
      applicantName: 'Rizqy Abdurrahman',
      registrationNumber: 'PPDB-2026-0056',
      examinerId: 'examiner_02',
      examinerName: 'Ust. Muhammad Wildan, S.Pd.I.',
      categoryId: 'cat_praktik',
      categoryName: 'Tes Praktik',
      assessmentType: 'practical',
      score: 90,
      rubricScores: { wudhu: 90, prayer: 90, dailyDua: 90 },
      notes: 'Praktik shalat fardhu dan wudhu sesuai sunnah.',
      recommendation: 'Sangat Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },

    // app_demo_04 (Aisyah - KMI)
    {
      id: 'asm_04_quran',
      applicantId: 'app_demo_04',
      applicantName: 'Aisyah Putri Humaira',
      registrationNumber: 'PPDB-2026-0088',
      examinerId: 'examiner_01',
      examinerName: 'Ust. Ahmad Fauzan, Lc., M.Ag.',
      categoryId: 'cat_baca_quran',
      categoryName: "Tes Baca Al-Qur'an",
      assessmentType: 'quran_recitation',
      score: 96,
      rubricScores: { makhraj: 98, tajweed: 95, fluency: 96, adab: 95 },
      notes: 'Bacaan bersanad, fasih mutqin.',
      recommendation: 'Sangat Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'asm_04_hafalan',
      applicantId: 'app_demo_04',
      applicantName: 'Aisyah Putri Humaira',
      registrationNumber: 'PPDB-2026-0088',
      examinerId: 'examiner_01',
      examinerName: 'Ust. Ahmad Fauzan, Lc., M.Ag.',
      categoryId: 'cat_hafalan',
      categoryName: 'Tes Hafalan',
      assessmentType: 'tahfidz',
      score: 98,
      rubricScores: { fluency: 98, mutqin: 98, rhythm: 98 },
      notes: 'Hafalan 5 juz lancar tanpa ragu.',
      recommendation: 'Sangat Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'asm_04_wawancara',
      applicantId: 'app_demo_04',
      applicantName: 'Aisyah Putri Humaira',
      registrationNumber: 'PPDB-2026-0088',
      examinerId: 'examiner_02',
      examinerName: 'Ust. Muhammad Wildan, S.Pd.I.',
      categoryId: 'cat_wawancara',
      categoryName: 'Tes Wawancara',
      assessmentType: 'interview',
      score: 92,
      rubricScores: { readiness: 95, commitment: 95, character: 90, vision: 90 },
      notes: 'Karakter santriwati teladan, komitmen asrama 100%.',
      recommendation: 'Sangat Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'asm_04_praktik',
      applicantId: 'app_demo_04',
      applicantName: 'Aisyah Putri Humaira',
      registrationNumber: 'PPDB-2026-0088',
      examinerId: 'examiner_02',
      examinerName: 'Ust. Muhammad Wildan, S.Pd.I.',
      categoryId: 'cat_praktik',
      categoryName: 'Tes Praktik',
      assessmentType: 'practical',
      score: 95,
      rubricScores: { wudhu: 95, prayer: 95, dailyDua: 95 },
      notes: 'Doa-doa yaumiyyah hafal lengkap.',
      recommendation: 'Sangat Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },

    // app_demo_05 (Ahmad Bilal - MTs) - Below passing grade
    {
      id: 'asm_05_quran',
      applicantId: 'app_demo_05',
      applicantName: 'Ahmad Bilal Al-Habsyi',
      registrationNumber: 'PPDB-2026-0092',
      examinerId: 'examiner_01',
      examinerName: 'Ust. Ahmad Fauzan, Lc., M.Ag.',
      categoryId: 'cat_baca_quran',
      categoryName: "Tes Baca Al-Qur'an",
      assessmentType: 'quran_recitation',
      score: 60,
      rubricScores: { makhraj: 60, tajweed: 60, fluency: 60, adab: 60 },
      notes: 'Perlu bimbingan intensif makharijul huruf.',
      recommendation: 'Tidak Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'asm_05_hafalan',
      applicantId: 'app_demo_05',
      applicantName: 'Ahmad Bilal Al-Habsyi',
      registrationNumber: 'PPDB-2026-0092',
      examinerId: 'examiner_01',
      examinerName: 'Ust. Ahmad Fauzan, Lc., M.Ag.',
      categoryId: 'cat_hafalan',
      categoryName: 'Tes Hafalan',
      assessmentType: 'tahfidz',
      score: 55,
      rubricScores: { fluency: 55, mutqin: 55, rhythm: 55 },
      notes: 'Hafalan juz amma masih banyak terbata-bata.',
      recommendation: 'Tidak Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'asm_05_wawancara',
      applicantId: 'app_demo_05',
      applicantName: 'Ahmad Bilal Al-Habsyi',
      registrationNumber: 'PPDB-2026-0092',
      examinerId: 'examiner_02',
      examinerName: 'Ust. Muhammad Wildan, S.Pd.I.',
      categoryId: 'cat_wawancara',
      categoryName: 'Tes Wawancara',
      assessmentType: 'interview',
      score: 65,
      rubricScores: { readiness: 65, commitment: 70, character: 65, vision: 60 },
      notes: 'Kemandirian santri masih membutuhkan waktu adaptasi.',
      recommendation: 'Dipertimbangkan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'asm_05_praktik',
      applicantId: 'app_demo_05',
      applicantName: 'Ahmad Bilal Al-Habsyi',
      registrationNumber: 'PPDB-2026-0092',
      examinerId: 'examiner_02',
      examinerName: 'Ust. Muhammad Wildan, S.Pd.I.',
      categoryId: 'cat_praktik',
      categoryName: 'Tes Praktik',
      assessmentType: 'practical',
      score: 60,
      rubricScores: { wudhu: 60, prayer: 60, dailyDua: 60 },
      notes: 'Bacaan shalat perlu pembenahan tajwid.',
      recommendation: 'Tidak Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },

    // app_demo_06 (Khadijah - MA) - Incomplete: only Quran & Wawancara, missing Hafalan & Praktik
    {
      id: 'asm_06_quran',
      applicantId: 'app_demo_06',
      applicantName: 'Khadijah Nur Azizah',
      registrationNumber: 'PPDB-2026-0105',
      examinerId: 'examiner_01',
      examinerName: 'Ust. Ahmad Fauzan, Lc., M.Ag.',
      categoryId: 'cat_baca_quran',
      categoryName: "Tes Baca Al-Qur'an",
      assessmentType: 'quran_recitation',
      score: 80,
      rubricScores: { makhraj: 80, tajweed: 80, fluency: 80, adab: 80 },
      notes: 'Tilawah baik.',
      recommendation: 'Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'asm_06_wawancara',
      applicantId: 'app_demo_06',
      applicantName: 'Khadijah Nur Azizah',
      registrationNumber: 'PPDB-2026-0105',
      examinerId: 'examiner_02',
      examinerName: 'Ust. Muhammad Wildan, S.Pd.I.',
      categoryId: 'cat_wawancara',
      categoryName: 'Tes Wawancara',
      assessmentType: 'interview',
      score: 82,
      rubricScores: { readiness: 85, commitment: 80, character: 80, vision: 80 },
      notes: 'Kesiapan asrama baik.',
      recommendation: 'Direkomendasikan',
      status: 'draft',
      createdAt: new Date().toISOString(),
    },

    // app_demo_07 (Salman - KMI) - Complete
    {
      id: 'asm_07_quran',
      applicantId: 'app_demo_07',
      applicantName: 'Salman Al-Farisi',
      registrationNumber: 'PPDB-2026-0120',
      examinerId: 'examiner_01',
      examinerName: 'Ust. Ahmad Fauzan, Lc., M.Ag.',
      categoryId: 'cat_baca_quran',
      categoryName: "Tes Baca Al-Qur'an",
      assessmentType: 'quran_recitation',
      score: 85,
      rubricScores: { makhraj: 85, tajweed: 85, fluency: 85, adab: 85 },
      notes: 'Bagus.',
      recommendation: 'Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'asm_07_hafalan',
      applicantId: 'app_demo_07',
      applicantName: 'Salman Al-Farisi',
      registrationNumber: 'PPDB-2026-0120',
      examinerId: 'examiner_01',
      examinerName: 'Ust. Ahmad Fauzan, Lc., M.Ag.',
      categoryId: 'cat_hafalan',
      categoryName: 'Tes Hafalan',
      assessmentType: 'tahfidz',
      score: 80,
      rubricScores: { fluency: 80, mutqin: 80, rhythm: 80 },
      notes: 'Mutqin.',
      recommendation: 'Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'asm_07_wawancara',
      applicantId: 'app_demo_07',
      applicantName: 'Salman Al-Farisi',
      registrationNumber: 'PPDB-2026-0120',
      examinerId: 'examiner_02',
      examinerName: 'Ust. Muhammad Wildan, S.Pd.I.',
      categoryId: 'cat_wawancara',
      categoryName: 'Tes Wawancara',
      assessmentType: 'interview',
      score: 85,
      rubricScores: { readiness: 85, commitment: 85, character: 85, vision: 85 },
      notes: 'Sangat siap.',
      recommendation: 'Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'asm_07_praktik',
      applicantId: 'app_demo_07',
      applicantName: 'Salman Al-Farisi',
      registrationNumber: 'PPDB-2026-0120',
      examinerId: 'examiner_02',
      examinerName: 'Ust. Muhammad Wildan, S.Pd.I.',
      categoryId: 'cat_praktik',
      categoryName: 'Tes Praktik',
      assessmentType: 'practical',
      score: 85,
      rubricScores: { wudhu: 85, prayer: 85, dailyDua: 85 },
      notes: 'Tertib.',
      recommendation: 'Direkomendasikan',
      status: 'final',
      createdAt: new Date().toISOString(),
    },
  ];

  for (const asm of demoAssessments) {
    await setDoc(doc(db, 'examinerAssessments', asm.id), asm);
  }

  // 8. Seed Sample Admission Decisions
  const demoDecisions: AdmissionDecision[] = [
    {
      id: 'dec_app_demo_04',
      applicantId: 'app_demo_04',
      applicantName: 'Aisyah Putri Humaira',
      registrationNumber: 'PPDB-2026-0088',
      targetLevel: "Kulliyatul Mu'allimin (KMI)",
      decision: 'accepted',
      finalScore: 95,
      decreeNumber: 'SK-PPDB/2026/001',
      notes: 'Diterima sebagai santri baru program KMI dengan predikat Mumtaz (Istimewa).',
      isAllCompleted: true,
      decidedBy: 'admin_demo',
      decidedByName: 'Panitia PPDB Salamatul Insan',
      decidedAt: new Date(Date.now() - 3600 * 1000 * 24 * 1).toISOString(),
    },
    {
      id: 'dec_app_demo_05',
      applicantId: 'app_demo_05',
      applicantName: 'Ahmad Bilal Al-Habsyi',
      registrationNumber: 'PPDB-2026-0092',
      targetLevel: 'Tsanawiyyah (MTs)',
      decision: 'rejected',
      finalScore: 59,
      decreeNumber: 'SK-PPDB/2026/002',
      notes: 'Mohon maaf, perolehan nilai akumulasi belum memenuhi passing grade minimal PPDB.',
      isAllCompleted: true,
      decidedBy: 'admin_demo',
      decidedByName: 'Panitia PPDB Salamatul Insan',
      decidedAt: new Date(Date.now() - 3600 * 1000 * 24 * 1).toISOString(),
    },
  ];

  for (const dec of demoDecisions) {
    await setDoc(doc(db, 'admissionDecisions', dec.id), dec);
  }

  // 9. Seed Announcement Configuration
  const initialAnnounce: AnnouncementConfig = {
    id: 'default',
    isPublished: true,
    publishDate: '2026-11-20',
    allowApplicantsViewDetailScores: true,
    allowApplicantsViewRankings: false,
    allowApplicantsDownloadLetter: true,
    announcementTitle: 'Pengumuman Hasil Akhir Seleksi Santri Baru (PPDB) 2026/2027',
    officialNotes:
      'Keputusan Panitia Penerimaan Pesantren Salamatul Insan bersifat mutlak dan tidak dapat diganggu gugat.',
    signatoryName: 'KH. M. Zainul Muttaqin, M.Ag.',
    signatoryTitle: 'Pengasuh & Pimpinan Pondok Pesantren Salamatul Insan',
    updatedBy: 'Panitia PPDB',
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'announcementConfig', 'default'), initialAnnounce);

  // 10. Seed Initial Audit Logs
  const initialLogs: Array<Omit<AuditLog, 'id'>> = [
    {
      action: 'decision_created',
      entityType: 'decision',
      entityId: 'dec_app_demo_04',
      actorUid: 'admin_demo',
      actorName: 'Panitia PPDB Salamatul Insan',
      actorRole: 'admin',
      details: 'Mengesahkan kelulusan santri Aisyah Putri Humaira (PPDB-2026-0088) dengan skor 95. SK: SK-PPDB/2026/001',
      timestamp: new Date(Date.now() - 3600 * 1000 * 24 * 1).toISOString(),
    },
    {
      action: 'decision_created',
      entityType: 'decision',
      entityId: 'dec_app_demo_05',
      actorUid: 'admin_demo',
      actorName: 'Panitia PPDB Salamatul Insan',
      actorRole: 'admin',
      details: 'Menetapkan status tidak lolos santri Ahmad Bilal Al-Habsyi (PPDB-2026-0092) dengan skor 59. SK: SK-PPDB/2026/002',
      timestamp: new Date(Date.now() - 3600 * 1000 * 24 * 1).toISOString(),
    },
    {
      action: 'announcement_config_changed',
      entityType: 'announcement',
      entityId: 'default',
      actorUid: 'admin_demo',
      actorName: 'Panitia PPDB Salamatul Insan',
      actorRole: 'admin',
      details: 'Membuka dan mempublikasikan hasil seleksi resmi santri baru ke portal publik santri.',
      timestamp: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    },
  ];

  for (let i = 0; i < initialLogs.length; i++) {
    const lId = `log_init_${i + 1}`;
    await setDoc(doc(db, 'auditLogs', lId), { ...initialLogs[i], id: lId });
  }
}

// ================= MODUL 3: EXAM TAKING & AUTO-GRADING ================= //

/**
 * Fetches questions sanitized for students taking an exam (stripping correctAnswer)
 */
export async function fetchExamQuestions(categoryId?: string): Promise<SanitizedExamQuestion[]> {
  try {
    const rawQuestions = await fetchQuestions(categoryId);
    // Strip correctAnswer and explanation for zero-trust client security
    return rawQuestions
      .filter(q => q.active)
      .map(q => ({
        id: q.id,
        categoryId: q.categoryId,
        categoryName: q.categoryName,
        questionText: q.questionText,
        questionType: q.questionType,
        imageUrl: q.imageUrl,
        options: q.options,
        weight: q.weight,
      }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'questions');
  }
}

/**
 * Starts a new test session or resumes an ongoing session
 */
export async function startOrResumeTestSession(params: {
  applicantId: string;
  applicantName: string;
  registrationNumber: string;
  userId: string;
  scheduleId?: string;
  categoryId: string;
  categoryName: string;
  durationMinutes: number;
  totalQuestions: number;
}): Promise<TestSession> {
  const path = 'testSessions';
  try {
    // Check if an existing session exists for this applicant and category
    const q = query(
      collection(db, path),
      where('applicantId', '==', params.applicantId),
      where('categoryId', '==', params.categoryId),
      limit(1)
    );
    const snap = await getDocs(q);

    const now = new Date();

    if (!snap.empty) {
      const existing = { ...snap.docs[0].data(), id: snap.docs[0].id } as TestSession;

      // If already submitted or graded
      if (existing.status === 'submitted' || existing.status === 'graded' || existing.isLocked) {
        return existing;
      }

      // Check if time expired according to server timestamp
      if (existing.expiresAt && new Date(existing.expiresAt) <= now) {
        // Auto-submit and lock session
        return await submitAndGradeTestSession(existing.id);
      }

      return existing;
    }

    // Create a new session
    const sessionId = `ses_${params.applicantId}_${params.categoryId}_${Date.now()}`;
    const startedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + params.durationMinutes * 60 * 1000).toISOString();

    const newSession: TestSession = {
      id: sessionId,
      applicantId: params.applicantId,
      applicantName: params.applicantName,
      registrationNumber: params.registrationNumber,
      userId: params.userId,
      scheduleId: params.scheduleId,
      categoryId: params.categoryId,
      categoryName: params.categoryName,
      status: 'in_progress',
      startedAt,
      expiresAt,
      durationMinutes: params.durationMinutes,
      totalQuestions: params.totalQuestions,
      answeredCount: 0,
      isLocked: false,
      syncStatus: 'synced',
      createdAt: startedAt,
      updatedAt: startedAt,
    };

    await setDoc(doc(db, path, sessionId), newSession);

    // Update applicant test status
    await updateApplicant(params.applicantId, {
      testStatus: 'sedang_tes',
    });

    return newSession;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches a single test session and checks deadline expiration
 */
export async function fetchTestSession(sessionId: string): Promise<TestSession | null> {
  const path = `testSessions/${sessionId}`;
  try {
    const snap = await getDoc(doc(db, 'testSessions', sessionId));
    if (!snap.exists()) return null;

    const session = { ...snap.data(), id: snap.id } as TestSession;

    // Check expiration if session is still in progress
    if (session.status === 'in_progress' && session.expiresAt) {
      if (new Date(session.expiresAt) <= new Date()) {
        // Automatically lock and grade expired session
        return await submitAndGradeTestSession(sessionId);
      }
    }

    return session;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Saves or updates a test answer with idempotency and lock verification
 */
export async function saveTestAnswer(params: {
  sessionId: string;
  applicantId: string;
  userId: string;
  questionId: string;
  selectedOption: string;
  isFlagged?: boolean;
}): Promise<void> {
  const answerId = `${params.sessionId}_${params.questionId}`;
  const path = `testAnswers/${answerId}`;

  // Cache locally first for offline safety
  try {
    localStorage.setItem(`psi_ans_${answerId}`, JSON.stringify({
      ...params,
      savedAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }

  try {
    // 1. Verify session is still valid and not locked
    const sessionSnap = await getDoc(doc(db, 'testSessions', params.sessionId));
    if (!sessionSnap.exists()) {
      throw new Error('Sesi ujian tidak ditemukan.');
    }
    const session = sessionSnap.data() as TestSession;

    if (session.isLocked || session.status === 'submitted' || session.status === 'graded') {
      throw new Error('Waktu ujian telah berakhir atau sesi telah dikunci. Jawaban tidak dapat diubah.');
    }

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      await submitAndGradeTestSession(params.sessionId);
      throw new Error('Waktu pengerjaan telah habis. Jawaban terakhir Anda telah otomatis disimpan dan dikunci.');
    }

    // 2. Write answer document
    const answerPayload: TestAnswer = {
      id: answerId,
      sessionId: params.sessionId,
      applicantId: params.applicantId,
      userId: params.userId,
      questionId: params.questionId,
      selectedOption: params.selectedOption,
      isFlagged: params.isFlagged || false,
      savedAt: new Date().toISOString(),
      syncedToCloud: true,
    };

    await setDoc(doc(db, 'testAnswers', answerId), answerPayload, { merge: true });

    // 3. Update answered count in session
    const answersSnap = await getDocs(
      query(collection(db, 'testAnswers'), where('sessionId', '==', params.sessionId))
    );
    await updateDoc(doc(db, 'testSessions', params.sessionId), {
      answeredCount: answersSnap.size,
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
    });
  } catch (error) {
    // If permission or network issue, throw error for UI display
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches all answers recorded for a session
 */
export async function fetchTestAnswers(sessionId: string): Promise<TestAnswer[]> {
  const path = 'testAnswers';
  try {
    const q = query(collection(db, path), where('sessionId', '==', sessionId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as TestAnswer));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Submits and automatically grades a CBT test session
 */
export async function submitAndGradeTestSession(sessionId: string): Promise<TestSession> {
  const path = `testSessions/${sessionId}`;
  try {
    const sessionRef = doc(db, 'testSessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) {
      throw new Error('Sesi ujian tidak ditemukan.');
    }
    const session = { ...sessionSnap.data(), id: sessionSnap.id } as TestSession;

    // Idempotency: if already graded, return directly
    if (session.status === 'graded' && session.isLocked && session.score !== undefined) {
      return session;
    }

    const now = new Date().toISOString();

    // 1. Fetch answers for this session
    const answersSnap = await getDocs(
      query(collection(db, 'testAnswers'), where('sessionId', '==', sessionId))
    );
    const userAnswers = answersSnap.docs.map(d => d.data() as TestAnswer);
    const answersMap: Record<string, string> = {};
    userAnswers.forEach(a => {
      answersMap[a.questionId] = (a.selectedOption || '').trim().toLowerCase();
    });

    // 2. Fetch official question keys
    const questionsSnap = await getDocs(collection(db, 'questions'));
    const questions = questionsSnap.docs
      .map(d => d.data() as QuestionItem)
      .filter(q => q.active && (session.categoryId === 'all' || q.categoryId === session.categoryId));

    const totalQuestions = questions.length > 0 ? questions.length : session.totalQuestions;

    // 3. Fetch assessment config for scoring policy
    const config = await fetchAssessmentConfig();

    let correctCount = 0;
    let wrongCount = 0;
    let emptyCount = 0;
    let rawScoreSum = 0;
    let maxPossibleScore = 0;

    for (const q of questions) {
      const qWeight = q.weight || 5;
      maxPossibleScore += qWeight * config.correctScore;

      const userAns = answersMap[q.id];
      if (!userAns || userAns === '') {
        emptyCount++;
        rawScoreSum += config.emptyScore * qWeight;
      } else {
        const correctNorm = (q.correctAnswer || '').trim().toLowerCase();
        const isCorrect = userAns === correctNorm;
        if (isCorrect) {
          correctCount++;
          rawScoreSum += config.correctScore * qWeight;
        } else {
          wrongCount++;
          rawScoreSum += config.wrongScore * qWeight;
        }

        // Mark on answer record
        try {
          await updateDoc(doc(db, 'testAnswers', `${sessionId}_${q.id}`), {
            isCorrect,
            score: isCorrect ? qWeight : 0,
          });
        } catch (e) {
          // ignore answer-level marking error
        }
      }
    }

    // Compute scaled score (0 - 100)
    let finalScore = 0;
    if (maxPossibleScore > 0) {
      finalScore = Math.max(0, Math.min(100, Math.round((rawScoreSum / maxPossibleScore) * 100)));
    } else if (totalQuestions > 0) {
      finalScore = Math.round((correctCount / totalQuestions) * 100);
    }

    const updatedSession: TestSession = {
      ...session,
      status: 'graded',
      isLocked: true,
      submittedAt: now,
      score: finalScore,
      correctCount,
      wrongCount,
      emptyCount,
      totalQuestions,
      answeredCount: userAnswers.length,
      updatedAt: now,
    };

    await updateDoc(sessionRef, {
      status: 'graded',
      isLocked: true,
      submittedAt: now,
      score: finalScore,
      correctCount,
      wrongCount,
      emptyCount,
      totalQuestions,
      answeredCount: userAnswers.length,
      updatedAt: now,
    });

    // Update applicant test status
    await updateApplicant(session.applicantId, {
      testStatus: 'selesai_tes',
    });

    return updatedSession;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Submits manual assessment by examiner with support for draft or final status
 */
export async function submitExaminerManualAssessment(
  assessment: Omit<ExaminerAssessment, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const path = 'examinerAssessments';
  const id = assessment.id || `asm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const now = new Date().toISOString();
    const payload: ExaminerAssessment = {
      ...assessment,
      id,
      status: assessment.status || 'final',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, path, id), payload, { merge: true });

    // If assessment is finalized, update applicant status to reviewed
    if (assessment.status === 'final') {
      await updateApplicant(assessment.applicantId, {
        status: 'reviewed',
        testStatus: 'dinilai',
      });
    }

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Consolidates temporary recap across CBT and manual evaluations
 */
export async function fetchTemporaryRecap(applicantId: string): Promise<TemporaryRecap | null> {
  try {
    // 1. Get Applicant
    const appSnap = await getDoc(doc(db, 'applicants', applicantId));
    if (!appSnap.exists()) return null;
    const applicant = { ...appSnap.data(), id: appSnap.id } as Applicant;

    // 2. Get Categories
    const categories = await fetchTestCategories();
    const activeCategories = categories.filter(c => c.active);

    // 3. Get CBT Sessions
    const sessionSnap = await getDocs(
      query(collection(db, 'testSessions'), where('applicantId', '==', applicantId))
    );
    const sessions = sessionSnap.docs.map(d => ({ ...d.data(), id: d.id } as TestSession));
    const cbtSession = sessions.find(s => s.status === 'graded' || s.status === 'submitted') || sessions[0];

    // 4. Get Manual Assessments
    const assessmentsSnap = await getDocs(
      query(collection(db, 'examinerAssessments'), where('applicantId', '==', applicantId))
    );
    const manualAssessments = assessmentsSnap.docs.map(d => ({ ...d.data(), id: d.id } as ExaminerAssessment));

    // 5. Config for weights
    const config = await fetchAssessmentConfig();

    let totalWeightedScore = 0;
    const missingCategories: string[] = [];

    const categoryScores = activeCategories.map(cat => {
      const weight = config.categoryWeights[cat.id] || cat.weight || 20;

      if (cat.testType === 'computer_based') {
        const score = cbtSession?.score !== undefined ? cbtSession.score : 0;
        const isGraded = cbtSession?.status === 'graded';
        const weightedScore = Math.round((score * weight) / 100);
        if (isGraded) {
          totalWeightedScore += weightedScore;
        } else {
          missingCategories.push(cat.name);
        }

        return {
          category: cat,
          score,
          weightedScore,
          status: (isGraded ? 'final' : 'pending') as 'final' | 'draft' | 'pending',
          correctCount: cbtSession?.correctCount,
          wrongCount: cbtSession?.wrongCount,
          unansweredCount: cbtSession?.emptyCount,
        };
      } else {
        // Manual evaluation
        const asm = manualAssessments.find(a => a.categoryId === cat.id);
        const score = asm ? asm.score : 0;
        const status = asm ? (asm.status || 'final') : 'pending';
        const weightedScore = Math.round((score * weight) / 100);

        if (asm && asm.status === 'final') {
          totalWeightedScore += weightedScore;
        } else {
          missingCategories.push(cat.name);
        }

        return {
          category: cat,
          score,
          weightedScore,
          status: status as 'final' | 'draft' | 'pending',
          examinerName: asm?.examinerName,
          notes: asm?.notes,
        };
      }
    });

    const allMandatoryGraded = missingCategories.length === 0;

    return {
      applicant,
      cbtSession,
      manualAssessments,
      categoryScores,
      totalWeightedScore,
      allMandatoryGraded,
      missingCategories,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `applicants/${applicantId}`);
  }
}

// ================= MODULE 4: SELECTION RESULTS & AUDIT TRAIL ================= //

export async function logAuditEvent(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
  const path = 'auditLogs';
  const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const payload: AuditLog = {
      ...event,
      id,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, path, id), payload);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

export async function fetchAuditLogs(limitCount = 100): Promise<AuditLog[]> {
  const path = 'auditLogs';
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as AuditLog));
  } catch (error) {
    console.error('Failed to fetch audit logs, fallback to basic list:', error);
    try {
      const snap = await getDocs(collection(db, path));
      const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as AuditLog));
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      return [];
    }
  }
}

export async function fetchConsolidatedSelectionResults(): Promise<ConsolidatedResultItem[]> {
  try {
    const [appSnap, catSnap, sessSnap, asmSnap, decSnap, cfgSnap] = await Promise.all([
      getDocs(collection(db, 'applicants')),
      getDocs(collection(db, 'testCategories')),
      getDocs(collection(db, 'testSessions')),
      getDocs(collection(db, 'examinerAssessments')),
      getDocs(collection(db, 'admissionDecisions')),
      getDocs(collection(db, 'assessmentConfig')),
    ]);

    const applicants = appSnap.docs
      .map((d) => ({ ...d.data(), id: d.id } as Applicant))
      .filter((a) => !a.isArchived);

    const categories = catSnap.docs
      .map((d) => ({ ...d.data(), id: d.id } as TestCategory))
      .filter((c) => c.active !== false)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    const sessions = sessSnap.docs.map((d) => d.data() as TestSession);
    const assessments = asmSnap.docs.map((d) => d.data() as ExaminerAssessment);
    const decisions = decSnap.docs.map((d) => d.data() as AdmissionDecision);

    let passingGrade = 70;
    if (!cfgSnap.empty) {
      const cfg = cfgSnap.docs[0].data() as AssessmentConfig;
      if (cfg?.passingGrade) passingGrade = cfg.passingGrade;
    }

    const results: ConsolidatedResultItem[] = applicants.map((applicant) => {
      const cbtSession = sessions.find((s) => s.applicantId === applicant.id);
      const appAssessments = assessments.filter((a) => a.applicantId === applicant.id);
      const decision = decisions.find((d) => d.applicantId === applicant.id);

      const categoryScores: Record<
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
      > = {};

      let totalWeightedScore = 0;
      const missingCategories: string[] = [];

      categories.forEach((cat) => {
        const weight = cat.weight || 0;
        const passScore = cat.passingScore || passingGrade;

        if (cat.testType === 'computer_based' || cat.type === 'cbt') {
          const isSubmitted = cbtSession?.status === 'submitted';
          const score = isSubmitted ? cbtSession?.score || 0 : 0;
          const weightedScore = Math.round((score * weight) / 100);

          if (isSubmitted) {
            totalWeightedScore += weightedScore;
          } else {
            missingCategories.push(cat.name);
          }

          categoryScores[cat.id] = {
            score,
            weight,
            weightedScore,
            passingScore: passScore,
            isPassed: score >= passScore,
            status: isSubmitted ? 'final' : 'pending',
            examinerName: 'Sistem CBT Otomatis',
            notes: isSubmitted
              ? `Terjawab benar ${cbtSession?.summary?.correctCount || 0} dari ${cbtSession?.summary?.totalQuestions || 0} soal`
              : 'Belum menyelesaikan ujian online',
          };
        } else {
          const asm = appAssessments.find((a) => a.categoryId === cat.id);
          const score = asm ? asm.score : 0;
          const status = asm ? asm.status || 'final' : 'pending';
          const weightedScore = Math.round((score * weight) / 100);

          if (asm && asm.status === 'final') {
            totalWeightedScore += weightedScore;
          } else {
            missingCategories.push(cat.name);
          }

          categoryScores[cat.id] = {
            score,
            weight,
            weightedScore,
            passingScore: passScore,
            isPassed: score >= passScore,
            status: status as 'final' | 'draft' | 'pending',
            examinerName: asm?.examinerName,
            notes: asm?.notes,
          };
        }
      });

      const isAllCompleted = missingCategories.length === 0;

      let autoRecommendation: 'Lulus' | 'Tidak Lulus' | 'Menunggu Penilaian Lengkap';
      if (!isAllCompleted) {
        autoRecommendation = 'Menunggu Penilaian Lengkap';
      } else if (totalWeightedScore >= passingGrade) {
        autoRecommendation = 'Lulus';
      } else {
        autoRecommendation = 'Tidak Lulus';
      }

      return {
        applicant,
        cbtScore: cbtSession?.score,
        categoryScores,
        totalWeightedScore,
        isAllCompleted,
        missingCategories,
        autoRecommendation,
        decision,
      };
    });

    return results;
  } catch (error) {
    console.error('Failed to fetch consolidated selection results:', error);
    return [];
  }
}

export async function submitAdmissionDecisionWithAudit(
  decisionData: {
    applicantId: string;
    applicantName: string;
    registrationNumber: string;
    targetLevel?: any;
    decision: 'accepted' | 'rejected' | 'waitlist' | 'pending';
    finalScore: number;
    decreeNumber?: string;
    notes?: string;
    isAllCompleted: boolean;
    categoryBreakdownSummary?: Record<string, number>;
  },
  actor: { uid: string; displayName: string; role: string }
): Promise<string> {
  const path = 'admissionDecisions';
  const id = `dec_${decisionData.applicantId}`;
  try {
    const existingDoc = await getDoc(doc(db, path, id));
    const isUpdate = existingDoc.exists();
    const prevData = isUpdate ? existingDoc.data() : null;

    const payload: AdmissionDecision = {
      ...decisionData,
      id,
      decidedBy: actor.uid,
      decidedByName: actor.displayName,
      decidedAt: new Date().toISOString(),
      createdAt: prevData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, path, id), payload);

    // Update applicant status
    const targetStatus =
      decisionData.decision === 'accepted'
        ? 'accepted'
        : decisionData.decision === 'rejected'
        ? 'rejected'
        : 'reviewed';
    await updateApplicantStatus(decisionData.applicantId, targetStatus);

    // Immutable audit trail
    await logAuditEvent({
      action: isUpdate ? 'decision_updated' : 'decision_created',
      entityType: 'decision',
      entityId: id,
      actorUid: actor.uid,
      actorName: actor.displayName,
      actorRole: actor.role,
      details: `${isUpdate ? 'Memperbarui' : 'Menetapkan'} status seleksi santri ${decisionData.applicantName} (${decisionData.registrationNumber}) menjadi [${decisionData.decision.toUpperCase()}] dengan skor akhir ${decisionData.finalScore}. No. SK: ${decisionData.decreeNumber || '-'}`,
      previousValue: prevData ? JSON.stringify(prevData) : undefined,
      newValue: JSON.stringify(payload),
    });

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Announcement Configuration
export async function fetchAnnouncementConfig(): Promise<AnnouncementConfig> {
  const path = 'announcementConfig';
  const docRef = doc(db, path, 'default');
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AnnouncementConfig;
    }

    // Default configuration if not yet created
    const defaultConfig: AnnouncementConfig = {
      id: 'default',
      isPublished: false,
      publishDate: new Date().toISOString().split('T')[0],
      allowApplicantsViewDetailScores: true,
      allowApplicantsViewRankings: false,
      allowApplicantsDownloadLetter: true,
      announcementTitle: 'Hasil Seleksi Calon Santri Baru (PPDB) 2026/2027',
      officialNotes:
        'Berdasarkan hasil musyawarah sidang pleno panitia seleksi dan Pimpinan Pondok Pesantren Salamatul Insan.',
      signatoryName: 'KH. M. Zainul Muttaqin, M.Ag.',
      signatoryTitle: 'Pengasuh & Pimpinan Pondok Pesantren Salamatul Insan',
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, defaultConfig);
    return defaultConfig;
  } catch (error) {
    console.error('Failed to fetch announcement config:', error);
    return {
      id: 'default',
      isPublished: false,
      publishDate: new Date().toISOString().split('T')[0],
      allowApplicantsViewDetailScores: true,
      allowApplicantsViewRankings: false,
      allowApplicantsDownloadLetter: true,
      announcementTitle: 'Hasil Seleksi Calon Santri Baru (PPDB) 2026/2027',
      signatoryName: 'KH. M. Zainul Muttaqin, M.Ag.',
      signatoryTitle: 'Pengasuh & Pimpinan Pondok Pesantren Salamatul Insan',
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function saveAnnouncementConfigWithAudit(
  config: Partial<AnnouncementConfig>,
  actor: { uid: string; displayName: string; role: string }
): Promise<void> {
  const path = 'announcementConfig';
  const docRef = doc(db, path, 'default');
  try {
    const prevSnap = await getDoc(docRef);
    const prevConfig = prevSnap.exists() ? prevSnap.data() : null;

    const payload = {
      ...prevConfig,
      ...config,
      id: 'default',
      updatedBy: actor.displayName,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, payload);

    await logAuditEvent({
      action: 'announcement_config_changed',
      entityType: 'announcement',
      entityId: 'default',
      actorUid: actor.uid,
      actorName: actor.displayName,
      actorRole: actor.role,
      details: `Mengubah konfigurasi pengumuman kelulusan: Status publikasi = ${payload.isPublished ? 'DIPUBLIKASIKAN' : 'DRAF / DITUTUP'}. Tanggal: ${payload.publishDate}.`,
      previousValue: prevConfig ? JSON.stringify(prevConfig) : undefined,
      newValue: JSON.stringify(payload),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}


