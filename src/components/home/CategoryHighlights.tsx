import React from 'react';
import { Cpu, GraduationCap, Palette, Trophy, ArrowRight } from 'lucide-react';
import { EventCategory } from '../../types';

interface CategoryHighlightsProps {
  onSelectCategory: (category: EventCategory) => void;
  categoryCounts: Record<EventCategory, number>;
}

export const CategoryHighlights: React.FC<CategoryHighlightsProps> = ({
  onSelectCategory,
  categoryCounts
}) => {
  const categories: {
    id: EventCategory;
    title: string;
    description: string;
    icon: React.ReactNode;
    colorClasses: string;
    badgeCount: number;
  }[] = [
    {
      id: 'Tecnología',
      title: 'Tecnología',
      description: 'Inteligencia Artificial, arquitectura cloud, DevOps y automatizaciones.',
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      colorClasses: 'hover:border-cyan-500/40 hover:bg-cyan-950/20',
      badgeCount: categoryCounts['Tecnología'] || 0
    },
    {
      id: 'Educación',
      title: 'Educación',
      description: 'Masterclasses, talleres intensivos de diseño UX y bootcamps no-code.',
      icon: <GraduationCap className="w-5 h-5 text-indigo-400" />,
      colorClasses: 'hover:border-indigo-500/40 hover:bg-indigo-950/20',
      badgeCount: categoryCounts['Educación'] || 0
    },
    {
      id: 'Cultura',
      title: 'Cultura',
      description: 'Festivales de música en vivo, jazz acústico y exposiciones visuales.',
      icon: <Palette className="w-5 h-5 text-violet-400" />,
      colorClasses: 'hover:border-violet-500/40 hover:bg-violet-950/20',
      badgeCount: categoryCounts['Cultura'] || 0
    },
    {
      id: 'Deportes',
      title: 'Deportes',
      description: 'Maratones urbanas, competencias atléticas y circuitos metropolitanos.',
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
      colorClasses: 'hover:border-amber-500/40 hover:bg-amber-950/20',
      badgeCount: categoryCounts['Deportes'] || 0
    }
  ];

  return (
    <section className="py-12 border-b border-slate-900 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Explora por Categoría
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Filtra los eventos según tu campo de interés profesional y recreativo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`text-left p-5 rounded-2xl border border-slate-800 bg-slate-900/60 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-cyan-500 ${cat.colorClasses}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 shadow-sm">
                  {cat.icon}
                </div>
                <span className="text-xs font-semibold text-slate-400 tabular-nums">
                  {cat.badgeCount} {cat.badgeCount === 1 ? 'evento' : 'eventos'}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white group-hover:text-cyan-400 transition-colors">
                {cat.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                {cat.description}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center text-xs font-medium text-slate-300 group-hover:text-cyan-400 transition-colors">
                <span>Ver eventos</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
