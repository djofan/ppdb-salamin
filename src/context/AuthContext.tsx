import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, testConnection } from '@/src/firebase/config';
import { getUserProfile, syncUserProfile, logOut as authLogOut } from '@/src/firebase/auth';
import { UserProfile, UserRole } from '@/src/types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  isFirebaseConnected: boolean;
  demoRole: UserRole | null;
  setDemoRole: (role: UserRole | null) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default mock profiles for instant evaluation preview
export const DEMO_PROFILES: Record<UserRole, UserProfile> = {
  admin: {
    uid: 'demo_admin_uid',
    email: 'admin.ppdb@salamatulinan.sch.id',
    displayName: 'Ust. H. Abdullah Syukri (Ketua Panitia)',
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  examiner: {
    uid: 'demo_examiner_uid',
    email: 'penguji.tahfidz@salamatulinan.sch.id',
    displayName: 'Ust. Ahmad Fauzan, Lc. (Penguji Tahfidz)',
    role: 'examiner',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  applicant: {
    uid: 'demo_applicant_uid',
    email: 'santri.zaid@gmail.com',
    displayName: 'Muhammad Zaid Al-Fatih',
    role: 'applicant',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [demoRole, setDemoRoleState] = useState<UserRole | null>(null);

  useEffect(() => {
    // Check connection first
    testConnection().then((connected) => {
      setIsFirebaseConnected(connected);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const prof = await syncUserProfile(currentUser);
          setProfile(prof);
        } catch (err) {
          console.error('Failed to sync user profile:', err);
          // Fallback to basic profile from token
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'Pengguna PPDB',
            role: currentUser.email === 'ignidi.works@gmail.com' ? 'admin' : 'applicant',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const prof = await getUserProfile(user.uid);
      if (prof) setProfile(prof);
    }
  };

  const logout = async () => {
    setDemoRoleState(null);
    await authLogOut();
    setUser(null);
    setProfile(null);
  };

  const setDemoRole = (newRole: UserRole | null) => {
    setDemoRoleState(newRole);
    if (newRole) {
      setProfile(DEMO_PROFILES[newRole]);
    } else if (user) {
      getUserProfile(user.uid).then((p) => setProfile(p));
    } else {
      setProfile(null);
    }
  };

  // Active role is demoRole (if switched for testing) or profile role or 'applicant'
  const effectiveRole = useMemo<UserRole>(() => {
    if (demoRole) return demoRole;
    if (profile?.role) return profile.role;
    return 'applicant';
  }, [demoRole, profile]);

  const effectiveProfile = useMemo<UserProfile | null>(() => {
    if (demoRole) return DEMO_PROFILES[demoRole];
    return profile;
  }, [demoRole, profile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: effectiveProfile,
        role: effectiveRole,
        loading,
        isFirebaseConnected,
        demoRole,
        setDemoRole,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
