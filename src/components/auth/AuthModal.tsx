import React, { useState } from 'react';
import { X, Lock, Mail, User, ArrowRight, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react';
import { UserProfile } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password?: string) => Promise<boolean>;
  onRegister: (name: string, email: string, password?: string) => Promise<boolean>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onRegister
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim() || !emailRegex.test(email)) {
      errs.email = 'Ingresa un correo electrónico válido.';
    }

    if (!password || password.length < 6) {
      errs.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (mode === 'register') {
      if (!name.trim()) {
        errs.name = 'El nombre completo es requerido.';
      }
      if (password !== confirmPassword) {
        errs.confirmPassword = 'Las contraseñas no coinciden.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        const ok = await onLogin(email, password);
        if (ok) onClose();
      } else {
        const ok = await onRegister(name, email, password);
        if (ok) onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoUser = () => {
    setEmail('sofia.valenzuela@ejemplo.com');
    setPassword('DemoPass2026!');
    setName('Sofía Valenzuela');
    setConfirmPassword('DemoPass2026!');
    setErrors({});
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Cerrar modal de autenticación"
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-950/70 hover:bg-slate-950 text-slate-300 hover:text-white border border-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>Acceso EventPass</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'login'
              ? 'Ingresa tus credenciales para administrar tus pases e inscripciones.'
              : 'Regístrate para recibir entradas digitales y vincular tu cuenta con Telegram.'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrors({});
            }}
            className={`py-2 rounded-lg transition-colors ${
              mode === 'login'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrors({});
            }}
            className={`py-2 rounded-lg transition-colors ${
              mode === 'register'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Registrarme
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200">Nombre Completo</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Sofía Valenzuela"
                  className={`w-full pl-9 pr-3 py-2.5 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    errors.name ? 'border-rose-500' : 'border-slate-800'
                  }`}
                />
              </div>
              {errors.name && <p className="text-rose-400 text-[11px]">{errors.name}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  errors.email ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
            </div>
            {errors.email && <p className="text-rose-400 text-[11px]">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  errors.password ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
            </div>
            {errors.password && <p className="text-rose-400 text-[11px]">{errors.password}</p>}
          </div>

          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className={`w-full pl-9 pr-3 py-2.5 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    errors.confirmPassword ? 'border-rose-500' : 'border-slate-800'
                  }`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-rose-400 text-[11px]">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Iniciar Sesión' : 'Crear Mi Cuenta'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Fill Button */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 text-[11px]">
            <p className="font-semibold text-slate-300">Usuario de prueba preconfigurado:</p>
            <p className="truncate">sofia.valenzuela@ejemplo.com</p>
          </div>
          <button
            type="button"
            onClick={handleFillDemoUser}
            className="px-3 py-1.5 rounded-lg bg-indigo-950 text-indigo-300 hover:bg-indigo-900 border border-indigo-500/30 font-semibold text-[11px] whitespace-nowrap transition-colors"
          >
            Autocompletar
          </button>
        </div>
      </div>
    </div>
  );
};
