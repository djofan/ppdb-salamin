import React, { useState, useEffect } from 'react';
import { AuditLog } from '@/src/types';
import { fetchAuditLogs } from '@/src/firebase/db';
import { ShieldCheck, History, Clock, User, X, Loader2, ArrowRight } from 'lucide-react';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadLogs = async () => {
      setLoading(true);
      try {
        const data = await fetchAuditLogs(50);
        setLogs(data);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [isOpen]);

  if (!isOpen) return null;

  const actionLabels: Record<string, { label: string; color: string }> = {
    decision_created: { label: 'Penetapan Keputusan', color: 'bg-emerald-100 text-emerald-800' },
    decision_updated: { label: 'Perubahan Keputusan', color: 'bg-blue-100 text-blue-800' },
    manual_score_modified: { label: 'Penilaian Diubah', color: 'bg-amber-100 text-amber-800' },
    announcement_config_changed: { label: 'Pengaturan Pengumuman', color: 'bg-purple-100 text-purple-800' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0F2137]/10 flex items-center justify-center text-[#0F2137]">
              <History className="w-5 h-5 text-[#B8860B]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#0F2137]">
                Log Jejak Audit & Keamanan Keputusan
              </h3>
              <p className="text-xs text-slate-500">
                Catatan riwayat tak-terubah (immutable) seluruh penetapan keputusan dan nilai
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 mx-auto text-[#0F2137] animate-spin" />
            <p className="text-xs text-slate-500">Memuat riwayat jejak audit...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-1">
            <ShieldCheck className="w-8 h-8 mx-auto text-slate-300" />
            <p>Belum ada rekaman log audit yang tercatat di sistem.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const actionMeta = actionLabels[log.action] || {
                label: log.action,
                color: 'bg-slate-100 text-slate-800',
              };
              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 text-xs space-y-2 hover:bg-white hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${actionMeta.color}`}
                    >
                      {actionMeta.label}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <p className="text-slate-800 font-medium leading-relaxed">{log.details}</p>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <User className="w-3 h-3 text-[#B8860B]" />
                      <span>{log.actorName}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({log.actorRole})</span>
                    </span>
                    <span className="font-mono text-[9px] text-slate-400">{log.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
