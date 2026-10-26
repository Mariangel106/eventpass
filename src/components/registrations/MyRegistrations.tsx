import React, { useState } from 'react';
import {
  Ticket,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  QrCode,
  Send,
  Trash2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Registration, RegistrationStatus } from '../../types';

interface MyRegistrationsProps {
  registrations: Registration[];
  onViewTicket: (reg: Registration) => void;
  onRequestCancel: (reg: Registration) => void;
  onExploreEvents: () => void;
  onOpenTelegram: () => void;
  isTelegramLinked: boolean;
}

export const MyRegistrations: React.FC<MyRegistrationsProps> = ({
  registrations,
  onViewTicket,
  onRequestCancel,
  onExploreEvents,
  onOpenTelegram,
  isTelegramLinked
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | RegistrationStatus>('ALL');

  const filteredRegistrations = registrations.filter((r) => {
    if (activeTab === 'ALL') return true;
    return r.status === activeTab;
  });

  const counts = {
    ALL: registrations.length,
    CONFIRMADA: registrations.filter((r) => r.status === 'CONFIRMADA').length,
    LISTA_ESPERA: registrations.filter((r) => r.status === 'LISTA_ESPERA').length,
    CANCELADA: registrations.filter((r) => r.status === 'CANCELADA').length
  };

  const statusConfigs = {
    CONFIRMADA: {
      label: 'CONFIRMADA',
      badgeClass: 'text-emerald-400 font-semibold',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      desc: 'Cupo garantizado. Presenta tu código QR en el acceso.'
    },
    LISTA_ESPERA: {
      label: 'LISTA DE ESPERA',
      badgeClass: 'text-amber-400 font-semibold',
      icon: <Clock className="w-4 h-4 text-amber-400" />,
      desc: 'En espera de liberación de vacante. Se te notificará automáticamente.'
    },
    CANCELADA: {
      label: 'CANCELADA',
      badgeClass: 'text-rose-400 font-semibold',
      icon: <XCircle className="w-4 h-4 text-rose-400" />,
      desc: 'Inscripción cancelada. Cupo liberado.'
    }
  };

  return (
    <div className="py-8 lg:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <Ticket className="w-4 h-4" />
            <span>Gestión de Acreditaciones</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Mis Inscripciones
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Consulta el estado de tus entradas, accede a tu código QR para el ingreso o gestiona la
            cancelación si tus planes cambian.
          </p>
        </div>

        {/* Telegram Quick Integration Box */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 flex items-center justify-between gap-4 self-start md:self-auto">
          <div className="flex items-center gap-2.5">
            <Send className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-slate-200">
                {isTelegramLinked ? 'Telegram Vinculado' : 'Recibe avisos en Telegram'}
              </p>
              <p className="text-slate-400 text-[11px]">
                {isTelegramLinked
                  ? 'Entradas sincronizadas en tu bot'
                  : 'Usa /vincular para alertas directas'}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenTelegram}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/30 transition-colors whitespace-nowrap"
          >
            {isTelegramLinked ? 'Ver datos' : 'Vincular'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
            activeTab === 'ALL'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>Todas</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-950/60 font-mono">
            {counts.ALL}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('CONFIRMADA')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
            activeTab === 'CONFIRMADA'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>Confirmadas</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-950/60 font-mono text-emerald-300">
            {counts.CONFIRMADA}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('LISTA_ESPERA')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
            activeTab === 'LISTA_ESPERA'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>Lista de Espera</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-950/60 font-mono text-amber-300">
            {counts.LISTA_ESPERA}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('CANCELADA')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
            activeTab === 'CANCELADA'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>Canceladas</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-950/60 font-mono text-rose-300">
            {counts.CANCELADA}
          </span>
        </button>
      </div>

      {/* Registrations List */}
      {filteredRegistrations.length > 0 ? (
        <div className="space-y-4">
          {filteredRegistrations.map((reg) => {
            const config = statusConfigs[reg.status];
            return (
              <div
                key={reg.id}
                className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-700/80 transition-all"
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
                  <div className="relative w-full sm:w-28 sm:h-24 h-36 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                    <img
                      src={reg.eventImageUrl}
                      alt={reg.eventTitle}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Quiet Unboxed metadata */}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-semibold text-indigo-400">{reg.eventCategory}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-slate-300">{reg.ticketCode}</span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug truncate">
                      {reg.eventTitle}
                    </h2>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {reg.eventDate} ({reg.eventTime.split(' ')[0]})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[200px]">{reg.eventLocation}</span>
                      </span>
                    </div>

                    {/* Status Note */}
                    <div className="flex items-center gap-2 text-xs pt-1">
                      {config.icon}
                      <span className={config.badgeClass}>{config.label}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-400 text-[11px] truncate">{config.desc}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800/80 shrink-0">
                  {reg.status !== 'CANCELADA' && (
                    <button
                      onClick={() => onViewTicket(reg)}
                      className="flex-1 md:flex-initial py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-all whitespace-nowrap"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Ver Pase Digital</span>
                    </button>
                  )}

                  {reg.status === 'CANCELADA' && (
                    <button
                      onClick={() => onViewTicket(reg)}
                      className="flex-1 md:flex-initial py-2 px-3 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Registro de baja</span>
                    </button>
                  )}

                  {reg.status !== 'CANCELADA' && (
                    <button
                      onClick={() => onRequestCancel(reg)}
                      className="py-2.5 px-3 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-950/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cancelar inscripción</span>
                      <span className="sm:hidden">Cancelar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
            <Ticket className="w-6 h-6 text-slate-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">No tienes inscripciones aquí</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {activeTab === 'ALL'
                ? 'Aún no te has inscrito en ningún evento de la plataforma.'
                : `No tienes acreditaciones con estado ${activeTab}.`}
            </p>
          </div>
          <button
            onClick={onExploreEvents}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md"
          >
            <span>Explorar catálogo de eventos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
