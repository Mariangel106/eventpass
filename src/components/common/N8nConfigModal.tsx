import React, { useState } from 'react';
import { X, Network, CheckCircle2, AlertCircle, Copy, Check, FileSpreadsheet, Send, Mail, Server } from 'lucide-react';
import { n8nApi } from '../../services/n8nClient';

interface N8nConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetDemoData: () => void;
}

export const N8nConfigModal: React.FC<N8nConfigModalProps> = ({
  isOpen,
  onClose,
  onResetDemoData
}) => {
  const [copied, setCopied] = useState(false);
  const isConnected = n8nApi.isConnected();
  const baseUrl = n8nApi.getBaseUrl();

  if (!isOpen) return null;

  const workflows = [
    { num: '01', name: 'Usuarios CRUD', route: 'POST /ep/usuarios', purpose: 'Crea, consulta, actualiza y desactiva usuarios (hash + salt).' },
    { num: '02', name: 'Autenticación y Sesiones', route: 'POST /ep/auth', purpose: 'Login, logout y validación de token de sesión con expiración.' },
    { num: '03', name: 'Vinculación Telegram', route: 'POST /ep/telegram + Bot', purpose: 'Genera código temporal y procesa /vincular CODIGO en el bot.' },
    { num: '04', name: 'Administración de Eventos', route: 'n8n Form Trigger', purpose: 'CREATE, READ, UPDATE, CANCEL y CLOSE solo para el administrador.' },
    { num: '05', name: 'Catálogo Público', route: 'GET /ep/catalogo', purpose: 'Listado, detalle y filtros; cupos = capacidad - confirmadas.' },
    { num: '06', name: 'Inscripciones CRUD', route: 'POST /ep/inscripciones', purpose: 'Inscribe, lista, actualiza y cancela con idempotencia.' },
    { num: '07', name: 'Reasignación Lista de Espera', route: 'Schedule (cada 5 min)', purpose: 'Promueve por fecha de inscripción cuando se liberan cupos.' },
    { num: '08', name: 'Recordatorios', route: 'Schedule (cada hora)', purpose: 'Envía recordatorios 72 h y 24 h antes sin repetirlos.' },
    { num: '09', name: 'Notificaciones', route: 'Execute Sub-workflow', purpose: 'Envía por Gmail y Telegram y registra cada canal por separado.' },
    { num: '10', name: 'EventPass Assistant', route: 'Chat Trigger + Gemini', purpose: 'Soporte conversacional informativo con historial persistido.' },
    { num: '11', name: 'Check-in digital', route: 'POST /ep/checkin', purpose: 'Valida y registra el ingreso (CONFIRMADA → ASISTIO) sin duplicados.' }
  ];

  const handleCopyEnv = () => {
    navigator.clipboard?.writeText('VITE_N8N_BASE_URL="https://tu-instancia-n8n.ejemplo.com/webhook"');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-indigo-500/30 bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Cerrar modal"
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-950/70 hover:bg-slate-950 text-slate-300 hover:text-white border border-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Network className="w-4 h-4" />
            <span>Arquitectura Externa & Integración</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Conexión con n8n & Google Sheets
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            EventPass desacopla totalmente la lógica de negocio y persistencia en un backend externo
            orquestado por n8n, sin conexiones directas entre el navegador y Google Sheets.
          </p>
        </div>

        {/* Status card */}
        <div
          className={`p-4 rounded-2xl border ${
            isConnected
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
              : 'bg-slate-950 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Variable VITE_N8N_BASE_URL:</span>
            </span>
            {isConnected ? (
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Configurada ({baseUrl})</span>
              </span>
            ) : (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                <span>Modo Demostración Activo (No configurada)</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            {isConnected
              ? 'Las peticiones HTTP se están enviando al endpoint externo configurado.'
              : 'La aplicación utiliza datos demostrativos en memoria local para que pruebes toda la interfaz antes de desplegar tus flujos en n8n.'}
          </p>
        </div>

        {/* The 11 Workflows of EventPass */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Los 11 Workflows Preparados para n8n
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {workflows.map((wf) => (
              <div
                key={wf.num}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-3 text-xs"
              >
                <span className="font-mono text-cyan-400 font-bold shrink-0">{wf.num}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white truncate">{wf.name}</span>
                    <code className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono shrink-0">
                      {wf.route}
                    </code>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{wf.purpose}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How to configure */}
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 space-y-2 text-xs">
          <h4 className="font-bold text-indigo-300">¿Cómo conectar tus webhooks reales?</h4>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Crea un archivo <code className="text-cyan-300">.env</code> a partir de{' '}
            <code className="text-cyan-300">.env.example</code> y define tu URL base de n8n:
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-[11px] text-cyan-300">
            <span>VITE_N8N_BASE_URL="https://tu-n8n.com/webhook"</span>
            <button
              onClick={handleCopyEnv}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={() => {
              onResetDemoData();
              onClose();
            }}
            className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
          >
            Restablecer datos de muestra
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
