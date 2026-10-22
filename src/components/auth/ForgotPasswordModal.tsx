import React, { useState } from 'react';
import { requestPasswordReset } from '@/src/firebase/auth';
import { Mail, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Mohon masukkan alamat email yang terdaftar.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('Alamat email belum terdaftar di sistem PPDB.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Format email tidak valid.');
      } else {
        setError('Gagal mengirim email reset. Mohon periksa kembali koneksi Anda.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[#0F2137]">
            <Mail className="w-5 h-5 text-[#B8860B]" />
            <h3 className="font-serif font-bold text-lg">Pemulihan Kata Sandi</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-slate-800">Email Pemulihan Terkirim</h4>
            <p className="text-xs text-slate-600 leading-relaxed px-4">
              Instruksi pengaturan ulang kata sandi telah dikirim ke{' '}
              <span className="font-semibold text-slate-800">{email}</span>. Mohon periksa folder kotak masuk atau spam Anda.
            </p>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-[#0F2137] text-white font-medium text-xs rounded-xl hover:bg-[#162D4A] transition-colors"
              >
                Kembali ke Halaman Masuk
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-4 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Masukkan alamat email akun santri/penguji yang Anda gunakan saat mendaftar. Kami akan mengirimkan tautan untuk membuat kata sandi baru.
            </p>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Email Terdaftar
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="santri@gmail.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2137]/20 focus:border-[#0F2137]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-3 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-[#0F2137] hover:bg-[#162D4A] rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Kirim Tautan Reset
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
