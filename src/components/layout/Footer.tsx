import React from 'react';
import { CalendarDays, Send, ShieldCheck, HelpCircle, Network } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: 'inicio' | 'catalogo' | 'inscripciones' | 'perfil') => void;
  onOpenTelegram: () => void;
  onOpenSupport: () => void;
  onOpenN8nModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenTelegram,
  onOpenSupport,
  onOpenN8nModal
}) => {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Purpose */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center text-white">
                <CalendarDays className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">EventPass</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Plataforma para descubrir eventos, gestionar inscripciones y recibir entradas digitales
              con integración para flujos de trabajo en n8n, Google Sheets y Telegram.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Explorar
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('inicio')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Inicio
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('catalogo')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Catálogo de Eventos
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('inscripciones')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Mis Inscripciones
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('perfil')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Mi Perfil
                </button>
              </li>
            </ul>
          </div>

          {/* Integrations & Channels */}
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Integraciones
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={onOpenTelegram}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-cyan-400" />
                  Bot de Telegram (/vincular)
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenN8nModal}
                  className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                >
                  <Network className="w-3.5 h-3.5 text-indigo-400" />
                  Arquitectura n8n & Sheets
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenSupport}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  Asistente de Soporte
                </button>
              </li>
            </ul>
          </div>

          {/* Architecture notice */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Estado del Sistema
            </h3>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Frontend Desacoplado</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Preparado para desplegar en Vercel y enlazar con endpoints externos mediante HTTP sin
                dependencias de base de datos local.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} EventPass. Todos los derechos reservados.</p>
          <p className="text-center sm:text-right">
            Interfaz en español · Datos ficticios para demostración técnica
          </p>
        </div>
      </div>
    </footer>
  );
};
