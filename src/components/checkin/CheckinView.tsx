import React, { useState } from 'react';
import { ScanLine, CheckCircle2, XCircle, AlertTriangle, Loader2, QrCode, History } from 'lucide-react';
import { ApiResponse, CheckinResult, CheckinResultado, EventItem } from '../../types';

interface CheckinViewProps {
  events: EventItem[];
  onCheckIn: (inscripcionId: string, eventoId: string) => Promise<ApiResponse<CheckinResult>>;
}

interface Attempt {
  resultado: CheckinResultado | 'ERROR';
  detalle: string;
  data?: CheckinResult;
}

const resultConfigs = {
  EXITOSO: {
    title: 'Check-in realizado correctamente.',
    box: 'bg-emerald-950/40 border-emerald-500/40',
    text: 'text-emerald-300',
    icon: <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
  },
  DUPLICADO: {
    title: 'El ingreso ya había sido registrado.',
    box: 'bg-amber-950/40 border-amber-500/40',
    text: 'text-amber-300',
    icon: <AlertTriangle className="w-7 h-7 text-amber-400 shrink-0" />
  },
  RECHAZADO: {
    title: 'Ingreso rechazado.',
    box: 'bg-rose-950/40 border-rose-500/40',
    text: 'text-rose-300',
    icon: <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
  },
  ERROR: {
    title: 'No se pudo registrar el check-in.',
    box: 'bg-slate-900 border-slate-700',
    text: 'text-slate-200',
    icon: <XCircle className="w-7 h-7 text-slate-400 shrink-0" />
  }
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

export const CheckinView: React.FC<CheckinViewProps> = ({ events, onCheckIn }) => {
  const [qrPayload, setQrPayload] = useState('');
  const [inscripcionId, setInscripcionId] = useState('');
  const [eventoId, setEventoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Attempt[]>([]);

  // El pase digital contiene EVENTPASS|inscripcion_id|evento_id|usuario_id|estado
  const handleQrChange = (value: string) => {
    setQrPayload(value);
    const parts = value.trim().split('|');
    if (parts[0] === 'EVENTPASS' && parts.length >= 3) {
      setInscripcionId(parts[1]);
      setEventoId(parts[2]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inscripcionId.trim() || !eventoId.trim() || loading) return;
    setLoading(true);
    try {
      const res = await onCheckIn(inscripcionId, eventoId);
      const attempt: Attempt = res.data
        ? { resultado: res.data.resultado, detalle: res.data.detalle || res.error || '', data: res.data }
        : { resultado: 'ERROR', detalle: res.error || 'Error desconocido.' };
      setHistory((prev) => [attempt, ...prev].slice(0, 10));
    } finally {
      setLoading(false);
    }
  };

  const last = history[0];
  const config = last ? resultConfigs[last.resultado] : null;

  return (
    <div className="py-8 lg:py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
          <ScanLine className="w-4 h-4" />
          <span>Control de Acceso</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Check-in digital</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
          Registra el ingreso real de un asistente. Solo las inscripciones CONFIRMADAS del evento pueden
          ingresar, y cada inscripción solo una vez.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg space-y-5"
      >
        <div className="space-y-1.5">
          <label htmlFor="checkin-qr" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-cyan-400" />
            Contenido del QR del pase (opcional)
          </label>
          <input
            id="checkin-qr"
            value={qrPayload}
            onChange={(e) => handleQrChange(e.target.value)}
            placeholder="EVENTPASS|INS-...|EVT-...|USR-...|CONFIRMADA"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
          />
          <p className="text-[11px] text-slate-500">Al pegarlo se completan los dos campos de abajo.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="checkin-inscripcion" className="text-xs font-semibold text-slate-300">
              inscripcion_id *
            </label>
            <input
              id="checkin-inscripcion"
              value={inscripcionId}
              onChange={(e) => setInscripcionId(e.target.value)}
              placeholder="INS-..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="checkin-evento" className="text-xs font-semibold text-slate-300">
              evento_id *
            </label>
            <input
              id="checkin-evento"
              list="checkin-eventos"
              value={eventoId}
              onChange={(e) => setEventoId(e.target.value)}
              placeholder="EVT-..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
            <datalist id="checkin-eventos">
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </datalist>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !inscripcionId.trim() || !eventoId.trim()}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
          <span>{loading ? 'Registrando ingreso...' : 'Registrar ingreso'}</span>
        </button>
      </form>

      {last && config && (
        <div className={`p-5 sm:p-6 rounded-2xl border ${config.box} space-y-4`} role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            {config.icon}
            <div className="space-y-1">
              <p className={`text-xs font-bold uppercase tracking-wider ${config.text}`}>{last.resultado}</p>
              <h2 className="text-lg font-bold text-white">{config.title}</h2>
              <p className="text-sm text-slate-300">{last.detalle}</p>
            </div>
          </div>

          {last.data && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs pt-3 border-t border-slate-800/80">
              {[
                ['Asistente', last.data.asistente || '—'],
                ['Evento', last.data.evento_nombre ? `${last.data.evento_nombre} (${last.data.evento_id})` : last.data.evento_id],
                ['Inscripción', last.data.inscripcion_id],
                ['Estado de la inscripción', last.data.estado_inscripcion || '—'],
                ['Check-in', last.data.checkin_id],
                ['Fecha y hora', formatDate(last.data.fecha_checkin)]
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between sm:block gap-3">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-slate-200 font-mono break-all">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {history.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            Intentos anteriores
          </h3>
          <ul className="space-y-2">
            {history.slice(1).map((h, idx) => (
              <li
                key={idx}
                className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <span className={`font-bold ${resultConfigs[h.resultado].text}`}>{h.resultado}</span>
                <span className="font-mono text-slate-300">{h.data?.inscripcion_id}</span>
                <span className="text-slate-400 truncate">{h.detalle}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
