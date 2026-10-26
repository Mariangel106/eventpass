import React, { useState } from 'react';
import { CalendarDays, Menu, X, Send, Sparkles, User, LogOut, Network } from 'lucide-react';
import { UserProfile } from '../../types';

interface NavbarProps {
  currentTab: 'inicio' | 'catalogo' | 'inscripciones' | 'perfil';
  onNavigate: (tab: 'inicio' | 'catalogo' | 'inscripciones' | 'perfil') => void;
  user: UserProfile;
  isLoggedIn: boolean;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenTelegram: () => void;
  onOpenSupport: () => void;
  onOpenN8nModal: () => void;
  unreadSupportCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  user,
  isLoggedIn,
  onOpenAuth,
  onLogout,
  onOpenTelegram,
  onOpenSupport,
  onOpenN8nModal
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'inicio' as const, label: 'Inicio' },
    { id: 'catalogo' as const, label: 'Catálogo' },
    { id: 'inscripciones' as const, label: 'Mis Inscripciones' },
    { id: 'perfil' as const, label: 'Perfil' }
  ];

  const handleMobileNav = (tab: 'inicio' | 'catalogo' | 'inscripciones' | 'perfil') => {
    onNavigate(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      {/* Top Banner indicating Demo / Architecture readiness */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-b border-indigo-500/10 px-4 py-1.5 text-xs text-slate-300 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-cyan-400">EventPass Demo</span>
            <span className="text-slate-500 hidden sm:inline">·</span>
            <span className="text-slate-400 hidden sm:inline truncate">
              Arquitectura lista para conectar 10 workflows en n8n & Google Sheets
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenTelegram}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors font-medium whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{user.telegramLinked ? 'Telegram Vinculado' : 'Vincular Telegram'}</span>
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={onOpenN8nModal}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors font-medium whitespace-nowrap"
            >
              <Network className="w-3.5 h-3.5" />
              <span>Estado API n8n</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Top Bar (Strict 3-zone contract) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => onNavigate('inicio')}
          className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg p-1 -ml-1 whitespace-nowrap shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/30 transition-shadow">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
            EventPass
          </span>
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 font-medium ${
                  isActive
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-slate-300 border-transparent hover:text-white hover:border-slate-700'
                }`}
              >
                {link.label}
              </button>
            );
          })}

          <button
            onClick={onOpenSupport}
            className="text-slate-300 hover:text-cyan-400 border-b-2 border-transparent transition-colors whitespace-nowrap shrink-0 py-1 flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Soporte IA</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('perfil')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 transition-colors text-xs text-slate-200"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-600/40 text-indigo-300 flex items-center justify-center text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
                <span className="font-medium max-w-[120px] truncate">{user.name}</span>
              </button>
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 whitespace-nowrap shrink-0"
            >
              Iniciar Sesión
            </button>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onOpenSupport}
            aria-label="Abrir Asistente"
            className="p-2 text-cyan-400 hover:bg-slate-900 rounded-lg transition-colors"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleMobileNav(link.id)}
                className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === link.id
                    ? 'bg-indigo-950/60 text-cyan-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <button
              onClick={() => {
                onOpenTelegram();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-cyan-400 hover:bg-slate-900 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Vincular Telegram (/vincular)
              </span>
              <span className="text-xs text-slate-500">
                {user.telegramLinked ? 'Conectado' : 'Pendiente'}
              </span>
            </button>

            <button
              onClick={() => {
                onOpenN8nModal();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-indigo-400 hover:bg-slate-900 flex items-center gap-2"
            >
              <Network className="w-4 h-4" />
              Arquitectura n8n & Google Sheets
            </button>

            {isLoggedIn ? (
              <div className="pt-2 flex items-center justify-between px-3 py-2 bg-slate-900 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-slate-200">{user.email}</span>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 text-center text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
              >
                Iniciar Sesión / Registrarme
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
