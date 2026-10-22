import React from 'react';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { Header } from '@/src/components/common/Header';
import { AuthView } from '@/src/components/auth/AuthView';
import { AdminDashboard } from '@/src/components/admin/AdminDashboard';
import { ExaminerDashboard } from '@/src/components/examiner/ExaminerDashboard';
import { ApplicantDashboard } from '@/src/components/applicant/ApplicantDashboard';
import { PesantrenLogo } from '@/src/components/common/PesantrenLogo';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, role, loading, refreshProfile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F2137] flex flex-col items-center justify-center text-white space-y-4">
        <PesantrenLogo size="lg" className="[&_span]:text-white [&_span.text-slate-500]:text-slate-300" />
        <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-medium pt-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Memuat Sistem PPDB Pesantren Salamatul Insan...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Authentication View
  if (!user) {
    return <AuthView />;
  }

  // Logged in -> Route to Dashboard based on Role
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header onRefreshData={refreshProfile} />

      <main className="flex-1">
        {role === 'admin' && <AdminDashboard />}
        {role === 'examiner' && <ExaminerDashboard />}
        {role === 'applicant' && <ApplicantDashboard />}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>
          © 2026 <strong>Pondok Pesantren Salamatul Insan</strong> • Sistem Tes & Penilaian Calon Peserta Didik Baru (PPDB)
        </p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
