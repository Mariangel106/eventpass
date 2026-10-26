import React, { useState } from 'react';
import { Calendar, MapPin, Users, ArrowUpRight, CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { EventItem } from '../../types';

interface EventCardProps {
  event: EventItem;
  onSelect: (event: EventItem) => void;
  onQuickRegister?: (event: EventItem) => void;
  isRegistered?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onSelect,
  onQuickRegister,
  isRegistered = false
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const availableSpots = Math.max(0, event.totalCapacity - event.registeredCount);
  const percentFilled = Math.min(100, Math.round((event.registeredCount / event.totalCapacity) * 100));

  // Status text & style mapping (Zero-pill discipline: unboxed subtle text with semantic color)
  const renderStatusIndicator = () => {
    switch (event.status) {
      case 'DISPONIBLE':
        return (
          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{availableSpots} cupos disponibles</span>
          </span>
        );
      case 'AGOTADO':
        return (
          <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Agotado · Lista de espera</span>
          </span>
        );
      case 'PROXIMO':
        return (
          <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>¡Muy pronto! · {availableSpots} cupos</span>
          </span>
        );
      case 'CERRADO':
        return (
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            <span>Inscripciones cerradas</span>
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            <span>Evento cancelado</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800/90 bg-slate-900/60 overflow-hidden shadow-lg hover:border-slate-700/80 hover:shadow-xl transition-all duration-200 group">
      {/* Event Image Container with Fallback */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-slate-900 animate-pulse" />
        )}
        {imageError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 text-center">
            <Calendar className="w-8 h-8 text-indigo-400 mb-2" />
            <span className="text-xs font-semibold text-slate-300">{event.category}</span>
          </div>
        ) : (
          <img
            src={event.imageUrl}
            alt={event.title}
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

        {/* Registered status flag if already enrolled */}
        {isRegistered && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-emerald-950/90 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 backdrop-blur-md flex items-center gap-1 shadow-md">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Inscrito</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Metadata Kicker: Category · Date · Venue Type (Clean Unboxed Text) */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-indigo-400">{event.category}</span>
            <span aria-hidden="true">·</span>
            <span>{event.venueType}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{event.date.split(',')[0]}</span>
          </div>

          {/* Primary Event Title */}
          <h3
            onClick={() => onSelect(event)}
            className="text-lg font-bold text-white tracking-tight group-hover:text-cyan-400 transition-colors cursor-pointer line-clamp-2 leading-snug"
          >
            {event.title}
          </h3>

          {/* Short description */}
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {event.shortDescription}
          </p>
        </div>

        {/* Location & Time Info */}
        <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{event.date} ({event.time.split(' ')[0]})</span>
          </div>
        </div>

        {/* Capacity / Availability Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            {renderStatusIndicator()}
            <span className="text-[11px] text-slate-400 tabular-nums">
              {event.registeredCount} / {event.totalCapacity}
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                event.status === 'CANCELADO' || event.status === 'CERRADO'
                  ? 'bg-rose-500/50'
                  : event.status === 'AGOTADO'
                  ? 'bg-amber-500'
                  : percentFilled > 85
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
              }`}
              style={{ width: `${percentFilled}%` }}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={() => onSelect(event)}
            className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:text-white text-slate-200 transition-colors text-center"
          >
            Ver Detalle
          </button>

          {event.status === 'DISPONIBLE' && (
            <button
              onClick={() => (onQuickRegister ? onQuickRegister(event) : onSelect(event))}
              className="py-2 px-3 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white transition-all shadow-md flex items-center justify-center gap-1 shrink-0 whitespace-nowrap"
            >
              <span>Inscribirme</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          {event.status === 'AGOTADO' && (
            <button
              onClick={() => onSelect(event)}
              className="py-2 px-3 text-xs font-semibold rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30 transition-colors shrink-0 whitespace-nowrap"
            >
              Lista Espera
            </button>
          )}

          {event.status === 'PROXIMO' && (
            <button
              onClick={() => onSelect(event)}
              className="py-2 px-3 text-xs font-semibold rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50 transition-colors shrink-0 whitespace-nowrap"
            >
              Inscribirme
            </button>
          )}

          {(event.status === 'CANCELADO' || event.status === 'CERRADO') && (
            <button
              disabled
              className="py-2 px-3 text-xs font-medium rounded-xl bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed shrink-0 whitespace-nowrap"
            >
              {event.status === 'CERRADO' ? 'Cerrado' : 'Cancelado'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
