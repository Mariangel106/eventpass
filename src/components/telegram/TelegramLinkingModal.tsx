import React, { useState } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Bell,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { UserProfile } from '../../types';
import { n8nApi } from '../../services/n8nClient';

interface TelegramLinkingModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onRequestNewCode: () => Promise<string>;
  onSimulateLink: (telegramUsername?: string) => Promise<void>;
  onUnlink: () => void;
}

export const TelegramLinkingModal: React.FC<TelegramLinkingModalProps> = ({
  user,
  isOpen,
  onClose,
  onRequestNewCode,
  onSimulateLink,
  onUnlink
}) => {
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [mockTelegramUser, setMockTelegramUser] = useState(user.telegramUsername || 'sofia_eventpass');

  if (!isOpen) return null;

  const isConnected = n8nApi.isConnected();
  const currentCode = user.telegramCode || '';
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'EventPassNotificaBot';
  const linkCommand = currentCode ? `/vincular ${currentCode}` : 'Pulsa "Nuevo código" para generarlo';

  const handleCopy = () => {
    if (!currentCode) return;
    navigator.clipboard?.writeText(linkCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRefreshCode = async () => {
    setRefreshing(true);
    try {
      await onRequestNewCode();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSimulateLinkSubmit = async () => {
    setSimulating(true);
    try {
      await onSimulateLink(mockTelegramUser);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-cyan-500/30 bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Cerrar modal de Telegram"
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-950/70 hover:bg-slate-950 text-slate-300 hover:text-white border border-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Vincular Bot de Telegram
              </h2>
              <p className="text-xs text-slate-400">Notificaciones instantáneas y pases digitales</p>
            </div>
          </div>
        </div>

        {/* Current Status Box */}
        <div
          className={`p-4 rounded-2xl border ${
            user.telegramLinked
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-950 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">Estado de Vinculación:</span>
            {user.telegramLinked ? (
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Conectado (@{user.telegramUsername})</span>
              </span>
            ) : (
              <span className="text-amber-400 font-semibold">Pendiente de vinculación</span>
            )}
          </div>
          {user.telegramLinked && (
            <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-slate-400">
              <span>Recibes alertas de cambios de estado y entradas.</span>
              <button
                onClick={onUnlink}
                className="text-rose-400 hover:underline font-semibold"
              >
                Desvincular
              </button>
            </div>
          )}
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            ¿Cómo vincular tu cuenta en 3 pasos?
          </h3>

          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
              <span className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 font-bold flex items-center justify-center shrink-0 border border-cyan-500/30">
                1
              </span>
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-white">Abre el bot oficial en Telegram</p>
                <p className="text-slate-400 text-[11px]">
                  En tu buscador de Telegram busca{' '}
                  <code className="text-cyan-300 font-mono">@{botUsername}</code> o haz clic en el
                  acceso directo.
                </p>
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:underline pt-0.5"
                >
                  <span>Abrir @{botUsername}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
              <span className="w-6 h-6 rounded-lg bg-indigo-950 text-indigo-400 font-bold flex items-center justify-center shrink-0 border border-indigo-500/30">
                2
              </span>
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">Envía el comando con tu código</p>
                  <button
                    onClick={handleRefreshCode}
                    disabled={refreshing}
                    className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                    title="Generar nuevo código"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>Nuevo código</span>
                  </button>
                </div>

                {/* Command box with Copy Button */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs">
                  <span className="text-cyan-300 font-bold select-all">{linkCommand}</span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 text-xs transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 text-[10px]">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Código asignado a <strong className="text-white">{user.email}</strong>.{' '}
                  {user.telegramCodeExpiresAt
                    ? `Vence a las ${new Date(user.telegramCodeExpiresAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}. Solo sirve una vez.`
                    : 'Válido por 15 minutos y de un solo uso.'}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
              <span className="w-6 h-6 rounded-lg bg-violet-950 text-violet-400 font-bold flex items-center justify-center shrink-0 border border-violet-500/30">
                3
              </span>
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-white">¡Listo! Confirmación automática</p>
                <p className="text-slate-400 text-[11px]">
                  El webhook de n8n procesará tu ID de chat y recibirás tu carnet de asistente, alertas
                  de confirmación y aviso si se libera un cupo en lista de espera.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Mode Action Simulation */}
        <div className="pt-2 border-t border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs">
            <div className="text-slate-300">
              <p className="font-semibold text-indigo-300">
                {isConnected ? '¿Ya enviaste el comando al bot?' : 'Probar vinculación en Modo Demostración'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isConnected
                  ? 'Verifica en n8n si tu código ya fue procesado por el bot.'
                  : 'Simula la respuesta que enviará el webhook de n8n desde Telegram.'}
              </p>
            </div>
            <button
              onClick={handleSimulateLinkSubmit}
              disabled={simulating}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shrink-0 whitespace-nowrap shadow-sm"
            >
              {simulating ? 'Verificando...' : isConnected ? 'Verificar vinculación' : 'Simular Vinculación'}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
