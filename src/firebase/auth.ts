import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { UserProfile, UserRole } from '@/src/types';

const ADMIN_EMAILS = ['ignidi.works@gmail.com'];

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function syncUserProfile(user: FirebaseUser, requestedRole?: UserRole): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  try {
    const existing = await getUserProfile(user.uid);
    if (existing) {
      // Check if user is in admin list to enforce admin role if designated
      if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()) && existing.role !== 'admin') {
        const updated: UserProfile = { ...existing, role: 'admin', updatedAt: new Date().toISOString() };
        await setDoc(doc(db, 'users', user.uid), updated, { merge: true });
        return updated;
      }
      return existing;
    }

    // Determine initial role
    let role: UserRole = 'applicant';
    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      role = 'admin';
    } else if (requestedRole && ['admin', 'examiner', 'applicant'].includes(requestedRole)) {
      role = requestedRole;
    }

    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Calon Santri',
      role,
      photoURL: user.photoURL || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', user.uid), newProfile);

    // If role is admin, record in admins collection too
    if (role === 'admin') {
      try {
        await setDoc(doc(db, 'admins', user.uid), {
          email: user.email,
          role: 'admin',
          addedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Could not record in /admins:', err);
      }
    }

    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return await syncUserProfile(cred.user);
}

export async function loginWithGoogle(): Promise<UserProfile> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return await syncUserProfile(cred.user);
}

export async function registerApplicant(
  email: string,
  pass: string,
  fullName: string,
  gender: 'Laki-laki' | 'Perempuan',
  targetLevel: 'Tsanawiyyah (MTs)' | 'Aliyah (MA)' | "Kulliyatul Mu'allimin (KMI)",
  phone: string
): Promise<{ userProfile: UserProfile; applicantId: string }> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(cred.user, { displayName: fullName });

  const profile = await syncUserProfile(cred.user, 'applicant');

  // Generate unique registration number
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const registrationNumber = `PPDB-${year}-${randomNum}`;
  const applicantId = `app_${cred.user.uid.slice(0, 8)}_${Date.now().toString().slice(-4)}`;

  const applicantData = {
    id: applicantId,
    userId: cred.user.uid,
    registrationNumber,
    fullName,
    gender,
    birthPlace: 'Jakarta',
    birthDate: '2012-05-15',
    previousSchool: 'SD/MI Asal',
    guardianName: 'Wali Santri ' + fullName,
    guardianPhone: phone,
    targetLevel,
    status: 'registered' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const path = `applicants/${applicantId}`;
  try {
    await setDoc(doc(db, 'applicants', applicantId), applicantData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return { userProfile: profile, applicantId };
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function logOut(): Promise<void> {
  await firebaseSignOut(auth);
}
