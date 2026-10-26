import React, { useState, useMemo } from 'react';
import { Search, Filter, RotateCcw, AlertCircle, CheckCircle, Sparkles, Layers } from 'lucide-react';
import { EventCategory, EventItem, EventStatus } from '../../types';
import { EventCard } from './EventCard';

interface EventCatalogProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  onQuickRegister: (event: EventItem) => void;
  userRegisteredEventIds: string[];
  initialCategory?: string;
  initialQuery?: string;
}

export const EventCatalog: React.FC<EventCatalogProps> = ({
  events,
  onSelectEvent,
  onQuickRegister,
  userRegisteredEventIds,
  initialCategory = 'Todas',
  initialQuery = ''
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [sortBy, setSortBy] = useState<'date' | 'spots' | 'title'>('date');

  const categories: string[] = ['Todas', 'Tecnología', 'Educación', 'Cultura', 'Deportes'];

  // Filtered and sorted events
  const filteredEvents = useMemo(() => {
    return events
      .filter((evt) => {
        // Category filter
        if (selectedCategory !== 'Todas' && evt.category !== selectedCategory) {
          return false;
        }

        // Status filter
        if (selectedStatus === 'DISPONIBLES' && evt.status !== 'DISPONIBLE') {
          return false;
        }
        if (selectedStatus === 'AGOTADOS' && evt.status !== 'AGOTADO') {
          return false;
        }
        if (selectedStatus === 'PROXIMOS' && evt.status !== 'PROXIMO') {
          return false;
        }
        if (selectedStatus === 'CANCELADOS' && evt.status !== 'CANCELADO') {
          return false;
        }

        // Search text
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = evt.title.toLowerCase().includes(q);
          const matchDesc = evt.description.toLowerCase().includes(q);
          const matchLoc = evt.location.toLowerCase().includes(q);
          const matchOrg = evt.organizer.toLowerCase().includes(q);
          const matchTags = evt.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchLoc && !matchOrg && !matchTags) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'spots') {
          const spotsA = a.totalCapacity - a.registeredCount;
          const spotsB = b.totalCapacity - b.registeredCount;
          return spotsB - spotsA;
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        // Default: Keep canonical list order
        return 0;
      });
  }, [events, selectedCategory, selectedStatus, searchQuery, sortBy]);

  const totalAvailableSpots = useMemo(() => {
    return filteredEvents.reduce(
      (sum, evt) => (evt.status === 'DISPONIBLE' ? sum + Math.max(0, evt.totalCapacity - evt.registeredCount) : sum),
      0
    );
  }, [filteredEvents]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Todas');
    setSelectedStatus('TODOS');
    setSortBy('date');
  };

  return (
    <div className="py-8 lg:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Catalog Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Catálogo Completo de Eventos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Explora y Reserva tu Lugar
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Filtra por categoría, estado de aforo o término de búsqueda. Todos los eventos cuentan con
            validación de cupos y emisión de pase con QR.
          </p>
        </div>

        {/* Global Summary Badge (clean text metadata) */}
        <div className="flex items-center gap-4 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-xl self-start md:self-auto">
          <div>
            <span className="text-slate-400">Total listados: </span>
            <span className="font-bold text-white tabular-nums">{filteredEvents.length}</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <div>
            <span className="text-slate-400">Cupos activos: </span>
            <span className="font-bold text-emerald-400 tabular-nums">{totalAvailableSpots}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="space-y-4">
        {/* Search Input Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por palabra clave, tema o ciudad..."
              className="w-full pl-10 pr-3 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="DISPONIBLES">Con cupos disponibles</option>
              <option value="AGOTADOS">Llenos / Lista de espera</option>
              <option value="PROXIMOS">Próxima apertura</option>
              <option value="CANCELADOS">Cancelados / Cerrados</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="date">Ordenar: Recomendados</option>
              <option value="spots">Ordenar: Mayor cupo libre</option>
              <option value="title">Ordenar: Nombre (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs (Interactive filter buttons allowed per design system) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Grid or Empty State */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onSelect={onSelectEvent}
              onQuickRegister={onQuickRegister}
              isRegistered={userRegisteredEventIds.includes(event.id)}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
            <AlertCircle className="w-6 h-6 text-slate-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">No se encontraron eventos</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No hay eventos ficticios que coincidan con los filtros aplicados ({selectedCategory},{' '}
              {selectedStatus}).
            </p>
          </div>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:bg-cyan-950/20 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer filtros</span>
          </button>
        </div>
      )}
    </div>
  );
};
