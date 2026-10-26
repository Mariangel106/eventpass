import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  Building,
  Check,
  Share2,
  Sparkles,
  XCircle
} from 'lucide-react';
import { EventItem, UserProfile } from '../../types';
import { n8nApi } from '../../services/n8nClient';

interface EventDetailModalProps {
  event: EventItem | null;
  onClose: () => void;
  onRegister: (event: EventItem, notes?: string) => Promise<void>;
  isRegistered: boolean;
  onViewRegistration: (eventId: string) => void;
  user: UserProfile;
  isLoggedIn: boolean;
  onOpenAuth: () => void;
  onOpenTelegram: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onRegister,
  isRegistered,
  onViewRegistration,
  user,
  isLoggedIn,
  onOpenAuth,
  onOpenTelegram
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!event) return null;

  const availableSpots = Math.max(0, event.totalCapacity - event.registeredCount);
  const percentFilled = Math.min(100, Math.round((event.registeredCount / event.totalCapacity) * 100));

  const handleRegisterSubmit = async () => {
    setSubmitting(true);
    try {
      await onRegister(event, notes);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
    >
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Sticky Close Button */}
        <button
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-950/70 hover:bg-slate-950 text-slate-300 hover:text-white backdrop-blur-md border border-slate-700/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          {/* Header Image Cover */}
          <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full bg-slate-950 overflow-hidden">
            <img
              src={event.imageUrl}
              alt={event.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

            {/* Quiet Unboxed Metadata on Scrim */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-cyan-400">{event.category}</span>
                <span aria-hidden="true">·</span>
                <span>{event.venueType}</span>
                <span aria-hidden="true">·</span>
                <span>{event.priceText}</span>
              </div>
              <button
                onClick={handleShare}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-950 border border-slate-700/60 text-xs text-slate-300"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Enlace copiado' : 'Compartir'}</span>
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Title & Key Data */}
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {event.title}
              </h1>

              {/* Status Banner */}
              {event.status === 'CANCELADO' && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs sm:text-sm space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-300">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Evento Cancelado Oficialmente</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {event.cancellationReason || 'Este evento ha sido suspendido por la organización.'}
                  </p>
                </div>
              )}

              {event.status === 'CERRADO' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{event.cancellationReason || 'Las inscripciones para este evento están cerradas.'}</span>
                </div>
              )}

              {event.status === 'AGOTADO' && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    El aforo presencial de {event.totalCapacity} personas se ha completado. Las nuevas
                    solicitudes ingresan a <strong>Lista de Espera</strong> automática.
                  </span>
                </div>
              )}

              {event.status === 'PROXIMO' && (
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    Este evento se realiza en los próximos días. ¡Asegura tu lugar antes de que se
                    agoten los cupos!
                  </span>
                </div>
              )}
            </div>

            {/* Quick Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Fecha</p>
                  <p className="text-slate-400">{event.date}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Horario</p>
                  <p className="text-slate-400">{event.time}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Lugar & Acceso</p>
                  <p className="text-slate-400">{event.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Organizador</p>
                  <p className="text-slate-400">{event.organizer}</p>
                </div>
              </div>
            </div>

            {/* Capacity Meter */}
            <div className="space-y-2 p-4 rounded-xl border border-slate-800 bg-slate-950/40">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Capacidad y Cupos</span>
                <span className="tabular-nums text-slate-400">
                  {event.registeredCount} de {event.totalCapacity} asistentes ({percentFilled}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    event.status === 'CANCELADO'
                      ? 'bg-rose-500/50'
                      : event.status === 'AGOTADO'
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                  }`}
                  style={{ width: `${percentFilled}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {event.status === 'DISPONIBLE' && (
                  <span className="text-emerald-400 font-medium">
                    Quedan {availableSpots} plazas disponibles para confirmación inmediata.
                  </span>
                )}
                {event.status === 'AGOTADO' && 'Cupos regulares llenos.'}
                {event.status === 'PROXIMO' && `Quedan ${availableSpots} plazas · el evento es muy pronto.`}
                {event.status === 'CERRADO' && 'Inscripciones cerradas.'}
                {event.status === 'CANCELADO' && 'Cupos cerrados por cancelación.'}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
                Descripción del Evento
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">{event.description}</p>
            </div>

            {/* Agenda Timeline if exists */}
            {event.agenda && event.agenda.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
                  Cronograma & Agenda
                </h2>
                <div className="space-y-2">
                  {event.agenda.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-semibold text-cyan-400 tabular-nums shrink-0 sm:w-36">
                        {item.time}
                      </span>
                      <span className="text-slate-300 flex-1">{item.topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prerequisites */}
            {event.prerequisites && event.prerequisites.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
                  Requisitos de Asistencia
                </h2>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {event.prerequisites.map((req, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Registration Actions Area */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              {isRegistered ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-emerald-300 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Ya estás inscrito en este evento con tu correo <strong>{user.email}</strong>.</span>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onViewRegistration(event.id);
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap transition-colors"
                  >
                    Ver mi Pase / Ticket
                  </button>
                </div>
              ) : event.status === 'CANCELADO' || event.status === 'CERRADO' ? (
                <div className="p-3 text-center text-xs text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                  {event.status === 'CANCELADO'
                    ? 'Este evento ha sido cancelado y no admite nuevas acreditaciones.'
                    : 'Las inscripciones para este evento están cerradas.'}
                </div>
              ) : !isLoggedIn ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    Inicia sesión o crea una cuenta para inscribirte en este evento.
                  </span>
                  <button
                    onClick={onOpenAuth}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold whitespace-nowrap transition-colors"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              ) : n8nApi.isConnected() && !user.telegramLinked ? (
                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-slate-300">
                    Para inscribirte primero debes vincular tu cuenta de Telegram: ahí recibirás tu
                    confirmación, avisos de lista de espera y recordatorios.
                  </span>
                  <button
                    onClick={onOpenTelegram}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold whitespace-nowrap transition-colors"
                  >
                    Vincular Telegram
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>
                      Inscribirse como: <strong className="text-white">{user.name}</strong> ({user.email})
                    </span>
                    <span className="text-cyan-400">Pase Digital sin costo</span>
                  </div>

                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas o requerimientos especiales (opcional)..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={handleRegisterSubmit}
                      disabled={submitting}
                      className={`w-full flex-1 py-3 px-6 rounded-xl text-sm font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                        event.status === 'AGOTADO'
                          ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                          : 'bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-indigo-600/20'
                      }`}
                    >
                      {submitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>
                            {event.status === 'AGOTADO'
                              ? 'Unirme a Lista de Espera'
                              : 'Confirmar mi Inscripción'}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      Volver al catálogo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
