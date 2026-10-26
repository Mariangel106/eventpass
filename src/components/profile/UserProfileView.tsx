import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Send,
  Save,
  CheckCircle2,
  Bell,
  Network,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../../types';
import { n8nApi } from '../../services/n8nClient';

interface UserProfileViewProps {
  user: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<boolean>;
  onOpenTelegram: () => void;
  onOpenN8nModal: () => void;
  onResetDemo: () => void;
  onDeactivate: () => Promise<void>;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  user,
  onUpdateProfile,
  onOpenTelegram,
  onOpenN8nModal,
  onResetDemo,
  onDeactivate
}) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [city, setCity] = useState(user.city);
  const [organization, setOrganization] = useState(user.organization || '');
  const [notificationEmail, setNotificationEmail] = useState(user.notificationEmail);
  const [notificationTelegram, setNotificationTelegram] = useState(user.notificationTelegram);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onUpdateProfile({
      name,
      email,
      phone,
      city,
      organization,
      notificationEmail,
      notificationTelegram
    });
    setSaving(false);
    if (!ok) return;
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="py-8 lg:py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <User className="w-4 h-4" />
            <span>Configuración de Cuenta</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Perfil de Usuario
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Consulta y edita tus datos de contacto para la emisión de tus pases de eventos.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Cambios guardados con éxito</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary Card and Telegram status */}
        <div className="space-y-6">
          {/* User Card */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/20">
              {name.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{name}</h2>
              <p className="text-xs text-slate-400">{email}</p>
              {organization && <p className="text-xs text-cyan-400 mt-0.5">{organization}</p>}
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-around text-xs text-slate-400">
              <div>
                <p className="font-bold text-white">Ciudad</p>
                <p className="text-[11px] truncate max-w-[100px]">{city.split(',')[0]}</p>
              </div>
              <div className="border-r border-slate-800 h-6" />
              <div>
                <p className="font-bold text-white">Rol</p>
                <p className="text-[11px]">Asistente</p>
              </div>
            </div>
          </div>

          {/* Telegram Status Card */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <span>Canal Telegram</span>
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  user.telegramLinked
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                }`}
              >
                {user.telegramLinked ? 'Vinculado' : 'No Vinculado'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {user.telegramLinked
                ? `Conectado a Telegram con el usuario @${user.telegramUsername}. Recibes tus pases QR al momento de inscribirte.`
                : 'Vincula tu cuenta para recibir recordatorios y tu carnet de acreditación directamente en la app de Telegram.'}
            </p>

            <button
              onClick={onOpenTelegram}
              className="w-full py-2.5 px-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{user.telegramLinked ? 'Administrar Vinculación' : 'Vincular Telegram'}</span>
            </button>
          </div>

          {/* Architecture Status Widget */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-2 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-indigo-400" />
                <span>Servidor n8n</span>
              </span>
              <button
                onClick={onOpenN8nModal}
                className="text-indigo-400 hover:text-indigo-300 text-[11px] underline"
              >
                Ver arquitectura
              </button>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              El frontend está listo para canalizar los registros a Google Sheets cuando se configure
              la variable VITE_N8N_BASE_URL.
            </p>
          </div>
        </div>

        {/* Right Column: Editable Profile Form */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSave}
            className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-6 text-xs"
          >
            <h2 className="text-base font-bold text-white tracking-tight pb-3 border-b border-slate-800">
              Información Personal & Contacto
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Nombre Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Teléfono / WhatsApp</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+52 55 ..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Ciudad & País</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ciudad, País"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="font-semibold text-slate-200">Organización o Empresa (Opcional)</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Empresa, universidad o colectivo"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Notification Channels */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span>Canales de Notificación</span>
              </h3>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Todas las notificaciones (confirmación, lista de espera, reasignación de cupo,
                cancelaciones y recordatorios 72 h y 24 h antes) se envían por <strong>Gmail</strong> a{' '}
                <strong className="text-slate-200">{user.email}</strong> y por <strong>Telegram</strong>{' '}
                {user.telegramLinked ? `a @${user.telegramUsername}` : '(vincula tu cuenta para recibirlas)'}.
              </p>
            </div>

            {/* Submit & Reset Area */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              {n8nApi.isConnected() ? (
                <span />
              ) : (
                <button
                  type="button"
                  onClick={onResetDemo}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer datos demo</span>
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-60 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>

            {/* Danger Zone: borrado lógico de la cuenta (estado INACTIVO) */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-rose-300">Desactivar cuenta</p>
                <p className="text-slate-400 text-[11px]">
                  Tu cuenta pasará a estado INACTIVO y se cerrará la sesión. Los registros no se borran.
                </p>
              </div>
              {confirmDeactivate ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeactivate(false)}
                    className="px-3 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={onDeactivate}
                    className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                  >
                    Sí, desactivar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeactivate(true)}
                  className="px-4 py-2 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 text-xs font-semibold whitespace-nowrap"
                >
                  Desactivar mi cuenta
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
