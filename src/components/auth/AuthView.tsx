import React, { useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { loginWithEmail, loginWithGoogle, registerApplicant } from '@/src/firebase/auth';
import { PesantrenLogo } from '@/src/components/common/PesantrenLogo';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import {
  Mail,
  Lock,
  User,
  Phone,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpenCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { EducationTier, UserRole } from '@/src/types';

export const AuthView: React.FC = () => {
  const { setDemoRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [regTier, setRegTier] = useState<EducationTier>('Tsanawiyyah (MTs)');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Modal
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Mohon isi email dan kata sandi.');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);
    try {
      await loginWithEmail(loginEmail, loginPassword);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setLoginError('Email atau kata sandi tidak cocok. Mohon periksa kembali.');
      } else if (err.code === 'auth/user-not-found') {
        setLoginError('Akun dengan email ini belum terdaftar.');
      } else if (err.code === 'auth/too-many-requests') {
        setLoginError('Terlalu banyak percobaan gagal. Mohon tunggu beberapa saat.');
      } else {
        setLoginError(err.message || 'Gagal masuk ke sistem PPDB.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setLoginError('Gagal masuk dengan Akun Google: ' + (err.message || ''));
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regEmail || !regPassword || !regPhone) {
      setRegError('Mohon lengkapi seluruh isian formulir pendaftaran.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Kata sandi minimal 6 karakter.');
      return;
    }

    setRegLoading(true);
    setRegError(null);
    try {
      const res = await registerApplicant(
        regEmail,
        regPassword,
        regFullName,
        regGender,
        regTier,
        regPhone
      );
      setRegSuccess(`Alhamdulillah! Pendaftaran berhasil dengan ID ${res.applicantId}. Sistem otomatis mengalihkan Anda.`);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setRegError('Alamat email ini sudah terdaftar. Silakan pilih tab Masuk.');
      } else {
        setRegError(err.message || 'Gagal melakukan pendaftaran akun.');
      }
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F2137] via-[#162D4A] to-[#0A1626] flex flex-col justify-between text-slate-100">
      {/* Background Islamic Geometric Pattern Accent */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Top Banner / Navigation */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex items-center justify-between">
        <PesantrenLogo size="md" className="[&_span]:text-white [&_span.text-slate-500]:text-slate-300" />
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#D4AF37] font-medium border border-[#D4AF37]/30 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tahun Ajaran 2026/2027</span>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 sm:px-6 py-4 flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 bg-white text-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          {/* Left Hero / Brand panel */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#0F2137] to-[#1A365D] p-8 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-[#D4AF37]/10 blur-2xl pointer-events-none" />

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#E5C05B] text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Portal Seleksi Mandiri</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                Sistem Tes & Penilaian PPDB
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Pondok Pesantren Modern Salamatul Insan. Memadukan keaslian tradisi salaf, kurikulum tahfidz mutqin, dan sains kontemporer.
              </p>
            </div>

            {/* Feature Points */}
            <div className="my-8 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <div className="p-1 rounded-md bg-white/10 text-[#D4AF37] mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>Sistem terintegrasi Cloud Firestore & Firebase Auth</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <div className="p-1 rounded-md bg-white/10 text-[#D4AF37] mt-0.5">
                  <BookOpenCheck className="w-3.5 h-3.5" />
                </div>
                <span>Rubrik pengujian Tahfidz Al-Qur'an & Wawancara terstandar</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <div className="p-1 rounded-md bg-white/10 text-[#D4AF37] mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <span>Jenjang MTs, MA, dan Kulliyatul Mu'allimin (KMI)</span>
              </div>
            </div>

            {/* Fast Demo Reviewer Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                <span>Akses Cepat Pengujian Role (Demo)</span>
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDemoRole('admin')}
                  className="py-1.5 px-2 bg-white/15 hover:bg-white/25 rounded-lg text-[11px] font-medium text-white transition-all text-center flex flex-col items-center gap-1 border border-white/10"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin PPDB</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDemoRole('examiner')}
                  className="py-1.5 px-2 bg-white/15 hover:bg-white/25 rounded-lg text-[11px] font-medium text-white transition-all text-center flex flex-col items-center gap-1 border border-white/10"
                >
                  <BookOpenCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Penguji</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDemoRole('applicant')}
                  className="py-1.5 px-2 bg-white/15 hover:bg-white/25 rounded-lg text-[11px] font-medium text-white transition-all text-center flex flex-col items-center gap-1 border border-white/10"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                  <span>Santri</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Interactive Form */}
          <div className="lg:col-span-7 p-8 flex flex-col justify-center">
            {/* Nav Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setLoginError(null);
                }}
                className={`flex-1 pb-3 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
                  activeTab === 'login'
                    ? 'border-[#0F2137] text-[#0F2137]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Masuk Akun PPDB
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setRegError(null);
                }}
                className={`flex-1 pb-3 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
                  activeTab === 'register'
                    ? 'border-[#0F2137] text-[#0F2137]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Daftar Calon Santri
              </button>
            </div>

            {/* LOGIN TAB */}
            {activeTab === 'login' && (
              <div className="space-y-4">
                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Google Sign-in */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loginLoading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 hover:border-slate-400"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Masuk Cepat dengan Akun Google</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="flex-shrink mx-3 text-[11px] text-slate-400 uppercase font-medium">
                    atau gunakan email
                  </span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>

                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alamat Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="contoh: panitia@salamatulinan.sch.id"
                        required
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2137]/20 focus:border-[#0F2137]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Kata Sandi
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-[11px] text-[#B8860B] hover:underline font-medium"
                      >
                        Lupa kata sandi?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Masukkan kata sandi akun"
                        required
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2137]/20 focus:border-[#0F2137]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full mt-2 py-2.5 px-4 bg-[#0F2137] hover:bg-[#162D4A] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {loginLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Masuk ke Dashboard</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* REGISTER TAB */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3">
                {regError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                {regSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-emerald-700 text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{regSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap Calon Santri
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="Contoh: Muhammad Zaid Al-Fatih"
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2137]/20 focus:border-[#0F2137]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jenis Kelamin
                    </label>
                    <select
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2137]/20 focus:border-[#0F2137]"
                    >
                      <option value="Laki-laki">Laki-laki (Santriwan)</option>
                      <option value="Perempuan">Perempuan (Santriwati)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jenjang Pendidikan
                    </label>
                    <select
                      value={regTier}
                      onChange={(e) => setRegTier(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2137]/20 focus:border-[#0F2137]"
                    >
                      <option value="Tsanawiyyah (MTs)">MTs (Tsanawiyyah)</option>
                      <option value="Aliyah (MA)">MA (Aliyah)</option>
                      <option value="Kulliyatul Mu'allimin (KMI)">KMI (Mu'allimin)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      No. WhatsApp Wali
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="081234567890"
                        required
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2137]/20 focus:border-[#0F2137]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alamat Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="santri@gmail.com"
                        required
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2137]/20 focus:border-[#0F2137]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buat Kata Sandi (Minimal 6 karakter)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2137]/20 focus:border-[#0F2137]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full mt-2 py-2.5 px-4 bg-[#B8860B] hover:bg-[#996515] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {regLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Daftar Sekarang & Dapatkan No. Registrasi</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 text-center text-xs text-slate-400">
        <p>© 2026 Pondok Pesantren Salamatul Insan. Hak cipta dilindungi undang-undang.</p>
        <p className="text-[11px] text-slate-500 mt-1">
          Alamat Kampus: Jl. Raya Pesantren No. 01, Kompleks Pendidikan Salamatul Insan
        </p>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        defaultEmail={loginEmail}
      />
    </div>
  );
};
