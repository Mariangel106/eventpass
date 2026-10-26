import React, { useState } from 'react';
import { Search, MapPin, ArrowRight, ShieldCheck, Zap, Bell } from 'lucide-react';
import { EventCategory } from '../../types';

interface HeroProps {
  onSearch: (query: string, category: string) => void;
  onExploreCatalog: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onSearch, onExploreCatalog }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery, selectedCategory);
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-slate-800/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Subtle background ambient mesh */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600 rounded-full blur-[140px]" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-cyan-600 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Proposition and Search */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              <span>Plataforma de Descubrimiento & Acreditación</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-400 font-normal">Edición 2026</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15] text-balance">
              Descubre eventos memorables y asegura tu lugar en tiempo real.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              Conferencias de tecnología de frontera, festivales culturales y masterclasses
              especializadas. Recibe tu pase con código QR y sincroniza avisos instantáneos con Telegram.
            </p>

            {/* Search Box Card */}
            <form
              onSubmit={handleSubmit}
              className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Search input */}
                <div className="sm:col-span-7 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, ponente o ciudad..."
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Category select */}
                <div className="sm:col-span-5">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  >
                    <option value="Todas">Todas las categorías</option>
                    <option value="Tecnología">Tecnología</option>
                    <option value="Educación">Educación</option>
                    <option value="Cultura">Cultura</option>
                    <option value="Deportes">Deportes</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Filtrado en vivo sobre el catálogo demostrativo
                </span>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>Explorar Eventos</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Quick Proof Metrics adjacent to Hero claim */}
            <div className="pt-2 grid grid-cols-3 gap-4 border-t border-slate-800/80">
              <div>
                <p className="text-2xl font-bold text-white tabular-nums">6</p>
                <p className="text-xs text-slate-400">Eventos de prueba</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-400 tabular-nums">4</p>
                <p className="text-xs text-slate-400">Categorías vivas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-400 tabular-nums">100%</p>
                <p className="text-xs text-slate-400">Preparado para n8n</p>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Asset */}s
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group bg-slate-900">
              <img
                src="/images/hero_eventpass_conference_1792500747135.jpg"
                alt="Auditorio de conferencias tecnológicas EventPass"
                referrerPolicy="no-referrer"
                className="w-full h-[360px] sm:h-[420px] object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              {/* Overlay card for featured event quick glance */}
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/60 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold text-cyan-400">Evento Destacado</span>
                  <span className="tabular-nums">15 Nov 2026</span>
                </div>
                <h2 className="text-sm font-bold text-white line-clamp-1">
                  Cumbre Global de Inteligencia Artificial & Cloud 2026
                </h2>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    CDMX · Híbrido
                  </span>
                  <button
                    onClick={onExploreCatalog}
                    className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1"
                  >
                    <span>Ver catálogo</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
