import React, { useState } from 'react';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { Registration } from '../../types';

interface CancelConfirmModalProps {
  registration: Registration | null;
  onClose: () => void;
  onConfirmCancel: (registrationId: string, reason: string) => Promise<void>;
}

export const CancelConfirmModal: React.FC<CancelConfirmModalProps> = ({
  registration,
  onClose,
  onConfirmCancel
}) => {
  const [reason, setReason] = useState('Conflicto de horario imprevisto');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!registration) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const finalReason = reason === 'Otro' ? customReason : reason;
      await onConfirmCancel(registration.id, finalReason);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-500/30">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Cancelar Inscripción</h2>
              <p className="text-xs text-slate-400">Confirmación de baja</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            ¿Estás seguro de que deseas cancelar tu inscripción para el evento:{' '}
            <strong className="text-white">{registration.eventTitle}</strong>?
          </p>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
            <p>
              Código de boleto: <span className="font-mono text-cyan-400">{registration.ticketCode}</span>
            </p>
            <p className="text-amber-300/90 text-[11px]">
              Al cancelar, tu lugar será reasignado al siguiente usuario en la lista de espera.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Motivo de la cancelación:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="Conflicto de horario imprevisto">Conflicto de horario imprevisto</option>
              <option value="Dificultad de traslado o transporte">Dificultad de traslado o transporte</option>
              <option value="Inscripción por error">Inscripción realizada por error</option>
              <option value="Otro">Otro motivo</option>
            </select>

            {reason === 'Otro' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Indica brevemente el motivo..."
                rows={2}
                className="w-full mt-2 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
          >
            Mantener Inscripción
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Sí, Cancelar Cupo</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
