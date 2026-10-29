import React, { useState } from 'react';
import { X, Calendar, MapPin, QrCode, CheckCircle2, Clock, XCircle, Printer, Download, Check } from 'lucide-react';
import { Registration } from '../../types';

interface DigitalTicketModalProps {
  registration: Registration | null;
  onClose: () => void;
}

export const DigitalTicketModal: React.FC<DigitalTicketModalProps> = ({
  registration,
  onClose
}) => {
  const [downloaded, setDownloaded] = useState(false);

  if (!registration) return null;

  const handleSimulateDownload = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const statusBadges = {
    CONFIRMADA: {
      text: 'ACREDITACIÓN CONFIRMADA',
      bg: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    },
    LISTA_ESPERA: {
      text: 'EN LISTA DE ESPERA',
      bg: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
      icon: <Clock className="w-4 h-4 text-amber-400" />
    },
    CANCELADA: {
      text: 'INSCRIPCIÓN CANCELADA',
      bg: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
      icon: <XCircle className="w-4 h-4 text-rose-400" />
    },
    ASISTIO: {
      text: 'INGRESO REGISTRADO',
      bg: 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300',
      icon: <CheckCircle2 className="w-4 h-4 text-cyan-400" />
    }
  };

  const badge = statusBadges[registration.status];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Cerrar pase"
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-950/60 hover:bg-slate-950 text-slate-300 hover:text-white backdrop-blur-md border border-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Ticket Header Banner */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-violet-900 to-slate-900 border-b border-indigo-500/20 text-white relative">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-2">
            <span>Pase Digital Oficial</span>
            <span className="font-mono">{registration.ticketCode}</span>
          </div>
          <h2 className="text-xl font-extrabold leading-snug tracking-tight text-white pr-8">
            {registration.eventTitle}
          </h2>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold backdrop-blur-sm shadow-sm ${badge.bg}">
            {badge.icon}
            <span>{badge.text}</span>
          </div>
        </div>

        {/* Notch separator styled like a physical event ticket */}
        <div className="relative h-4 bg-slate-950 flex items-center justify-between px-2">
          <div className="w-4 h-4 rounded-full bg-slate-950 -ml-4 border-r border-slate-800" />
          <div className="border-b border-dashed border-slate-800 w-full mx-2" />
          <div className="w-4 h-4 rounded-full bg-slate-950 -mr-4 border-l border-slate-800" />
        </div>

        {/* Ticket Details & QR Code */}
        <div className="p-6 space-y-6 bg-slate-900">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Asistente</p>
              <p className="font-bold text-white text-sm">{registration.userName}</p>
              <p className="text-slate-400 text-[11px] truncate">{registration.userEmail}</p>
            </div>

            <div>
              <p className="text-slate-400 font-medium">Registro ID</p>
              <p className="font-mono text-cyan-400 text-sm">{registration.id}</p>
              <p className="text-slate-400 text-[11px]">
                {new Date(registration.registeredAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>

            <div className="col-span-2 space-y-1 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{registration.eventDate} ({registration.eventTime})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">{registration.eventLocation}</span>
              </div>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="p-5 rounded-2xl bg-white flex flex-col items-center justify-center text-slate-950 text-center space-y-3 shadow-inner">
            {/* Visual SVG QR Code generator representation */}
            <div className="w-44 h-44 bg-slate-100 p-2 rounded-xl border border-slate-300 flex items-center justify-center relative">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full text-slate-900"
                fill="currentColor"
              >
                {/* Simulated high-contrast crisp QR code matrix */}
                <rect x="5" y="5" width="28" height="28" rx="4" fill="currentColor" />
                <rect x="9" y="9" width="20" height="20" fill="white" />
                <rect x="13" y="13" width="12" height="12" fill="currentColor" />

                <rect x="67" y="5" width="28" height="28" rx="4" fill="currentColor" />
                <rect x="71" y="9" width="20" height="20" fill="white" />
                <rect x="75" y="13" width="12" height="12" fill="currentColor" />

                <rect x="5" y="67" width="28" height="28" rx="4" fill="currentColor" />
                <rect x="9" y="71" width="20" height="20" fill="white" />
                <rect x="13" y="75" width="12" height="12" fill="currentColor" />

                {/* Pattern dots */}
                <rect x="38" y="10" width="8" height="8" fill="currentColor" />
                <rect x="50" y="14" width="8" height="6" fill="currentColor" />
                <rect x="40" y="24" width="6" height="6" fill="currentColor" />
                <rect x="52" y="26" width="6" height="8" fill="currentColor" />
                <rect x="10" y="40" width="8" height="6" fill="currentColor" />
                <rect x="22" y="42" width="6" height="8" fill="currentColor" />
                <rect x="36" y="38" width="10" height="10" fill="currentColor" />
                <rect x="50" y="40" width="6" height="8" fill="currentColor" />
                <rect x="62" y="38" width="8" height="8" fill="currentColor" />
                <rect x="74" y="42" width="8" height="6" fill="currentColor" />
                <rect x="86" y="38" width="6" height="10" fill="currentColor" />
                <rect x="38" y="54" width="8" height="8" fill="currentColor" />
                <rect x="52" y="52" width="8" height="6" fill="currentColor" />
                <rect x="64" y="56" width="6" height="8" fill="currentColor" />
                <rect x="76" y="52" width="8" height="8" fill="currentColor" />
                <rect x="38" y="68" width="8" height="8" fill="currentColor" />
                <rect x="52" y="72" width="8" height="6" fill="currentColor" />
                <rect x="66" y="68" width="6" height="10" fill="currentColor" />
                <rect x="78" y="70" width="8" height="8" fill="currentColor" />
                <rect x="42" y="84" width="8" height="8" fill="currentColor" />
                <rect x="56" y="82" width="8" height="6" fill="currentColor" />
                <rect x="70" y="84" width="10" height="8" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="font-mono text-xs font-bold tracking-widest text-slate-800">
                {registration.ticketCode}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Escanea al llegar o muestra desde tu bot de Telegram
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSimulateDownload}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
            >
              {downloaded ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Pase Guardado</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar Pase (PDF/PNG)</span>
                </>
              )}
            </button>

            <button
              onClick={() => window.print?.()}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
