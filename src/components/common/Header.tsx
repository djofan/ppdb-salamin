import React, { useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { PesantrenLogo } from './PesantrenLogo';
import {
  LogOut,
  User,
  ShieldCheck,
  BookOpenCheck,
  GraduationCap,
  Sparkles,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { UserRole } from '@/src/types';

interface HeaderProps {
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefreshData, isRefreshing = false }) => {
  const { user, profile, role, demoRole, setDemoRole, logout } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const roleMeta: Record<UserRole, { label: string; icon: any; color: string }> = {
    admin: {
      label: 'Panitia PPDB (Admin)',
      icon: ShieldCheck,
      color: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    examiner: {
      label: 'Dewan Penguji',
      icon: BookOpenCheck,
      color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    },
    applicant: {
      label: 'Calon Santri',
      icon: GraduationCap,
      color: 'bg-blue-100 text-blue-900 border-blue-300',
    },
  };

  const currentRoleMeta = roleMeta[role] || roleMeta.applicant;
  const RoleIcon = currentRoleMeta.icon;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <PesantrenLogo size="md" />

        {/* Right: Role indicator & User Menu */}
        <div className="flex items-center gap-3">
          {/* Quick Refresh Button */}
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              title="Perbarui Data Firestore"
              disabled={isRefreshing}
              className="p-2 text-slate-500 hover:text-[#0F2137] hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0F2137]' : ''}`} />
            </button>
          )}

          {/* Role Switcher Pill for Testing / Evaluation */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${currentRoleMeta.color} shadow-xs transition-all hover:brightness-95`}
            >
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{currentRoleMeta.label}</span>
              {demoRole && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded text-[10px] uppercase font-bold tracking-wider">
                  DEMO
                </span>
              )}
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {/* Switch Role Dropdown */}
            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Ganti Mode Pengguna (Testing)
                  </p>
                  <p className="text-xs text-slate-500">
                    Beralih role untuk mengevaluasi modul PPDB
                  </p>
                </div>

                <button
                  onClick={() => {
                    setDemoRole('admin');
                    setShowRoleDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 ${
                    role === 'admin' ? 'font-bold text-[#0F2137] bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-medium">Panitia PPDB (Admin)</p>
                    <p className="text-[11px] text-slate-400">Akses penuh statistik & database</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setDemoRole('examiner');
                    setShowRoleDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 ${
                    role === 'examiner' ? 'font-bold text-[#0F2137] bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  <BookOpenCheck className="w-4 h-4 text-emerald-600" />
                  <div className="flex-1">
                    <p className="font-medium">Dewan Penguji (Musyrif)</p>
                    <p className="text-[11px] text-slate-400">Lembar penilaian tahfidz & wawancara</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setDemoRole('applicant');
                    setShowRoleDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 ${
                    role === 'applicant' ? 'font-bold text-[#0F2137] bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">Calon Peserta Didik (Santri)</p>
                    <p className="text-[11px] text-slate-400">Kartu tanda peserta & jadwal tes</p>
                  </div>
                </button>

                {demoRole && user && (
                  <div className="pt-1 mt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setDemoRole(null);
                        setShowRoleDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-50 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Kembalikan ke Akun Asli ({user.email})</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User info & Logout */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-[#0F2137] max-w-[140px] truncate">
                {profile?.displayName || user?.displayName || user?.email || 'Pengguna'}
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                {profile?.email || user?.email}
              </span>
            </div>

            <button
              onClick={() => logout()}
              title="Keluar (Logout)"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
