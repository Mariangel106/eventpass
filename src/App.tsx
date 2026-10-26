import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Hero } from './components/home/Hero';
import { CategoryHighlights } from './components/home/CategoryHighlights';
import { EventCatalog } from './components/events/EventCatalog';
import { EventCard } from './components/events/EventCard';
import { EventDetailModal } from './components/events/EventDetailModal';
import { MyRegistrations } from './components/registrations/MyRegistrations';
import { DigitalTicketModal } from './components/registrations/DigitalTicketModal';
import { CancelConfirmModal } from './components/registrations/CancelConfirmModal';
import { TelegramLinkingModal } from './components/telegram/TelegramLinkingModal';
import { SupportAssistant } from './components/support/SupportAssistant';
import { AuthModal } from './components/auth/AuthModal';
import { UserProfileView } from './components/profile/UserProfileView';
import { N8nConfigModal } from './components/common/N8nConfigModal';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { n8nApi } from './services/n8nClient';
import { EventCategory, EventItem, Registration, UserProfile } from './types';
import {
  Calendar,
  Send,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  MessageSquare
} from 'lucide-react';

const CatalogStatus: React.FC<{ loading: boolean; error: string | null; onRetry: () => void }> = ({
  loading,
  error,
  onRetry
}) => {
  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-sm text-slate-400" role="status">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <span>Cargando eventos desde n8n...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-3 rounded-2xl border border-rose-500/30 bg-rose-950/20" role="alert">
        <p className="text-sm font-semibold text-rose-300">No se pudo cargar el catálogo</p>
        <p className="text-xs text-slate-400">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }
  return null;
};

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<'inicio' | 'catalogo' | 'inscripciones' | 'perfil'>('inicio');

  // Application Data States
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [user, setUser] = useState<UserProfile>(n8nApi.getProfile());
  const [isLoggedIn, setIsLoggedIn] = useState(() => n8nApi.isLoggedIn());
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // Search & Filter cross-navigation state
  const [catalogCategory, setCatalogCategory] = useState<string>('Todas');
  const [catalogQuery, setCatalogQuery] = useState<string>('');

  // Modals
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<EventItem | null>(null);
  const [selectedRegForTicket, setSelectedRegForTicket] = useState<Registration | null>(null);
  const [selectedRegForCancel, setSelectedRegForCancel] = useState<Registration | null>(null);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [n8nModalOpen, setN8nModalOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  // Referencia estable: si cambiara en cada render, el temporizador de cada toast se reiniciaría
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load initial data
  const loadData = async () => {
    setLoadingEvents(true);
    try {
      const eventsRes = await n8nApi.getEvents();
      if (eventsRes.success && eventsRes.data) {
        setEvents(eventsRes.data);
        setEventsError(null);
      } else {
        setEventsError(eventsRes.error || 'No se pudo cargar el catálogo de eventos.');
      }

      // Leer el perfil guardado en lugar de `user`, que puede estar desactualizado en este closure
      const profile = n8nApi.getProfile();
      setUser(profile);
      setIsLoggedIn(n8nApi.isLoggedIn());

      const regRes = await n8nApi.getUserRegistrations(profile.email);
      if (regRes.success && regRes.data) setRegistrations(regRes.data);
      else if (!regRes.success) addToast('error', 'No se pudieron cargar tus inscripciones', regRes.error);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    // Primero se valida en n8n la sesión guardada (WF02) y luego se cargan los datos
    n8nApi.validateSession().finally(loadData);
  }, []);

  // Category counts
  const categoryCounts = events.reduce((acc, evt) => {
    acc[evt.category] = (acc[evt.category] || 0) + 1;
    return acc;
  }, {} as Record<EventCategory, number>);

  const userRegisteredEventIds = registrations
    .filter((r) => r.status !== 'CANCELADA')
    .map((r) => r.eventId);

  // Handlers
  const handleHeroSearch = (query: string, category: string) => {
    setCatalogQuery(query);
    setCatalogCategory(category);
    setCurrentTab('catalogo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (category: EventCategory) => {
    setCatalogCategory(category);
    setCatalogQuery('');
    setCurrentTab('catalogo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegisterToEvent = async (event: EventItem, notes?: string) => {
    if (!isLoggedIn) {
      setAuthModalOpen(true);
      return;
    }

    const res = await n8nApi.registerToEvent({
      eventId: event.id,
      userName: user.name,
      userEmail: user.email,
      notes
    });

    if (res.success && res.data) {
      addToast(
        'success',
        res.data.status === 'LISTA_ESPERA' ? 'Anotado en Lista de Espera' : '¡Inscripción Confirmada!',
        res.message || `Tu pase para ${event.title} ha sido generado.`
      );
      // Reload events & registrations
      await loadData();
      setSelectedEventForDetail(null);
    } else {
      addToast('error', 'No se pudo completar la inscripción', res.error);
      syncSession();
    }
  };

  const handleConfirmCancel = async (registrationId: string, reason: string) => {
    const res = await n8nApi.cancelRegistration({
      registrationId,
      reason
    });

    if (res.success) {
      addToast('info', 'Inscripción Cancelada', res.message || 'Tu cupo ha sido liberado para la lista de espera.');
      await loadData();
    } else {
      addToast('error', 'Error al cancelar', res.error);
      syncSession();
    }
  };

  // Si n8n informa que la sesión ya no es válida, se refleja en la interfaz
  const syncSession = () => {
    if (!n8nApi.isLoggedIn()) {
      setIsLoggedIn(false);
      setUser(n8nApi.getProfile());
    }
  };

  const handleRequestTelegramCode = async () => {
    const res = await n8nApi.requestTelegramLinkCode();
    if (res.success && res.data) {
      setUser((prev) => ({
        ...prev,
        telegramCode: res.data?.code,
        telegramCodeExpiresAt: res.data?.expiresAt
      }));
      addToast('info', 'Código generado', `Envía /vincular ${res.data.code} al bot @${res.data.botUser}.`);
      return res.data.code;
    }
    addToast('error', 'No se pudo generar el código', res.error);
    syncSession();
    return '';
  };

  const handleCheckTelegramLink = async (telegramUsername?: string) => {
    const res = await n8nApi.checkTelegramLink(telegramUsername);
    if (res.success && res.data) {
      setUser(res.data);
      addToast(
        'success',
        'Telegram Vinculado',
        `Recibirás pases y avisos de eventos en @${res.data.telegramUsername}.`
      );
    } else {
      addToast('info', 'Vinculación pendiente', res.error);
      syncSession();
    }
  };

  const handleUnlinkTelegram = async () => {
    const res = await n8nApi.unlinkTelegram();
    if (res.success && res.data) {
      setUser(res.data);
      addToast('info', 'Telegram Desvinculado', 'Has desvinculado tu cuenta del bot de Telegram.');
    } else {
      addToast('error', 'No se pudo desvincular', res.error);
      syncSession();
    }
  };

  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    const res = await n8nApi.updateProfile(updated);
    if (res.success && res.data) {
      setUser(res.data);
      addToast('success', 'Perfil Actualizado', 'Tus datos se guardaron correctamente.');
      return true;
    }
    addToast('error', 'No se pudo actualizar el perfil', res.error);
    syncSession();
    return false;
  };

  const handleDeactivateAccount = async () => {
    const res = await n8nApi.deactivateAccount();
    if (res.success) {
      setIsLoggedIn(false);
      setRegistrations([]);
      setUser(n8nApi.getProfile());
      setCurrentTab('inicio');
      addToast('info', 'Cuenta desactivada', 'Tu cuenta quedó INACTIVA. Gracias por usar EventPass.');
    } else {
      addToast('error', 'No se pudo desactivar la cuenta', res.error);
    }
  };

  const handleLogin = async (email: string, password?: string) => {
    const res = await n8nApi.login({ email, password });
    if (res.success && res.data) {
      setUser(res.data);
      setIsLoggedIn(true);
      addToast('success', 'Bienvenido de nuevo', `Sesión iniciada como ${res.data.name}`);
      await loadData();
      return true;
    }
    addToast('error', 'Fallo al iniciar sesión', res.error);
    return false;
  };

  const handleRegisterUser = async (name: string, email: string, password?: string) => {
    const res = await n8nApi.registerUser({ name, email, password });
    if (res.success && res.data) {
      setUser(res.data);
      setIsLoggedIn(true);
      addToast('success', 'Cuenta Creada', `Bienvenido a EventPass, ${name}.`);
      await loadData();
      return true;
    }
    addToast('error', 'Error en el registro', res.error);
    return false;
  };

  const handleLogout = async () => {
    await n8nApi.logout();
    setIsLoggedIn(false);
    setRegistrations([]);
    setUser(n8nApi.getProfile());
    if (currentTab === 'inscripciones' || currentTab === 'perfil') {
      setCurrentTab('inicio');
    }
    addToast('info', 'Sesión Finalizada', 'Has cerrado sesión exitosamente.');
  };

  const handleResetDemoData = () => {
    n8nApi.resetDemoData();
    loadData();
    addToast('info', 'Datos Restablecidos', 'Se han restablecido los 6 eventos y registros iniciales.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Bar Navigation */}
      <Navbar
        currentTab={currentTab}
        onNavigate={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        user={user}
        isLoggedIn={isLoggedIn}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenTelegram={() => setTelegramModalOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
        onOpenN8nModal={() => setN8nModalOpen(true)}
      />

      {/* Main Dynamic View */}
      <main className="flex-1">
        {currentTab === 'inicio' && (
          <div className="space-y-0">
            {/* Hero Section */}
            <Hero
              onSearch={handleHeroSearch}
              onExploreCatalog={() => {
                setCurrentTab('catalogo');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* Category Highlights */}
            <CategoryHighlights
              onSelectCategory={handleSelectCategory}
              categoryCounts={categoryCounts}
            />

            {/* Featured Events Showcase */}
            <section className="py-14 border-b border-slate-900 bg-slate-950">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                      <Sparkles className="w-4 h-4" />
                      <span>Selección Especial</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Eventos Destacados
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                      Explora eventos con cupos activos, conferencias internacionales y experiencias
                      exclusivas.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setCurrentTab('catalogo');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 self-start sm:self-auto"
                  >
                    <span>Ver catálogo completo ({events.length})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <CatalogStatus loading={loadingEvents && events.length === 0} error={events.length === 0 ? eventsError : null} onRetry={loadData} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.filter((e) => e.status !== 'CANCELADO' && e.status !== 'CERRADO').slice(0, 3).map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onSelect={(evt) => setSelectedEventForDetail(evt)}
                      onQuickRegister={(evt) => setSelectedEventForDetail(evt)}
                      isRegistered={userRegisteredEventIds.includes(event.id)}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Architecture Banner / n8n & Telegram Information Strip */}
            <section className="py-14 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 border-b border-slate-900">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="p-8 rounded-3xl border border-indigo-500/20 bg-slate-900/80 shadow-2xl relative overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-8 space-y-4">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Arquitectura Desacoplada & Enterprise Ready</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Orquestación con n8n, Google Sheets y Telegram Bot
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                        EventPass está concebido para operar con cero dependencia de bases de datos
                        pesadas en el navegador: toda la persistencia se gestiona vía HTTP con webhooks
                        de n8n conectados a Google Sheets, confirmaciones vía Gmail y emisión de
                        pases mediante el comando <code>/vincular</code> en Telegram.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          onClick={() => setN8nModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md"
                        >
                          Explorar los 10 Workflows
                        </button>
                        <button
                          onClick={() => setTelegramModalOpen(true)}
                          className="px-4 py-2 rounded-xl border border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40 text-xs font-semibold flex items-center gap-2 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Cómo funciona /vincular</span>
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
                      <h3 className="font-bold text-white uppercase tracking-wider text-[11px] text-slate-400">
                        Flujo de Datos Garantizado
                      </h3>
                      <ul className="space-y-2 text-slate-300">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Frontend puro en React + Vite + TS</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Sin conexión directa React a Google Sheets</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Sin Firestore ni bases propietarias</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Totalmente compatible con Vercel</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {currentTab === 'catalogo' && events.length === 0 && (loadingEvents || eventsError) && (
          <CatalogStatus loading={loadingEvents} error={eventsError} onRetry={loadData} />
        )}

        {currentTab === 'catalogo' && (events.length > 0 || (!loadingEvents && !eventsError)) && (
          <EventCatalog
            events={events}
            onSelectEvent={(evt) => setSelectedEventForDetail(evt)}
            onQuickRegister={(evt) => setSelectedEventForDetail(evt)}
            userRegisteredEventIds={userRegisteredEventIds}
            initialCategory={catalogCategory}
            initialQuery={catalogQuery}
          />
        )}

        {(currentTab === 'inscripciones' || currentTab === 'perfil') && !isLoggedIn && (
          <div className="py-20 px-4 max-w-md mx-auto text-center space-y-4">
            <h1 className="text-xl font-bold text-white">Inicia sesión para continuar</h1>
            <p className="text-sm text-slate-400">
              Necesitas una cuenta para ver tus inscripciones y gestionar tu perfil.
            </p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
            >
              Iniciar sesión / Registrarme
            </button>
          </div>
        )}

        {currentTab === 'inscripciones' && isLoggedIn && (
          <MyRegistrations
            registrations={registrations}
            onViewTicket={(reg) => setSelectedRegForTicket(reg)}
            onRequestCancel={(reg) => setSelectedRegForCancel(reg)}
            onExploreEvents={() => {
              setCurrentTab('catalogo');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenTelegram={() => setTelegramModalOpen(true)}
            isTelegramLinked={user.telegramLinked}
          />
        )}

        {currentTab === 'perfil' && isLoggedIn && (
          <UserProfileView
            user={user}
            onUpdateProfile={handleUpdateProfile}
            onOpenTelegram={() => setTelegramModalOpen(true)}
            onOpenN8nModal={() => setN8nModalOpen(true)}
            onResetDemo={handleResetDemoData}
            onDeactivate={handleDeactivateAccount}
          />
        )}
      </main>

      {/* Floating Support Button */}
      {!supportOpen && (
        <button
          onClick={() => setSupportOpen(true)}
          aria-label="Abrir Asistente de Soporte IA"
          className="fixed bottom-6 left-6 z-40 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-2xl shadow-indigo-600/30 flex items-center gap-2.5 transition-all hover:scale-105 group"
        >
          <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold hidden sm:inline">Asistente EventPass</span>
        </button>
      )}

      {/* Footer */}
      <Footer
        onNavigate={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenTelegram={() => setTelegramModalOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
        onOpenN8nModal={() => setN8nModalOpen(true)}
      />

      {/* Modals & Overlays */}
      <EventDetailModal
        key={selectedEventForDetail?.id}
        event={selectedEventForDetail}
        onClose={() => setSelectedEventForDetail(null)}
        onRegister={handleRegisterToEvent}
        isRegistered={
          selectedEventForDetail ? userRegisteredEventIds.includes(selectedEventForDetail.id) : false
        }
        onViewRegistration={(eventId) => {
          setSelectedEventForDetail(null);
          setCurrentTab('inscripciones');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        user={user}
        isLoggedIn={isLoggedIn}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenTelegram={() => setTelegramModalOpen(true)}
      />

      <DigitalTicketModal
        registration={selectedRegForTicket}
        onClose={() => setSelectedRegForTicket(null)}
      />

      <CancelConfirmModal
        key={selectedRegForCancel?.id}
        registration={selectedRegForCancel}
        onClose={() => setSelectedRegForCancel(null)}
        onConfirmCancel={handleConfirmCancel}
      />

      <TelegramLinkingModal
        user={user}
        isOpen={telegramModalOpen}
        onClose={() => setTelegramModalOpen(false)}
        onRequestNewCode={handleRequestTelegramCode}
        onSimulateLink={handleCheckTelegramLink}
        onUnlink={handleUnlinkTelegram}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegisterUser}
      />

      <N8nConfigModal
        isOpen={n8nModalOpen}
        onClose={() => setN8nModalOpen(false)}
        onResetDemoData={handleResetDemoData}
      />

      <SupportAssistant
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        onOpenTelegram={() => {
          setSupportOpen(false);
          setTelegramModalOpen(true);
        }}
        onExploreCatalog={() => {
          setSupportOpen(false);
          setCurrentTab('catalogo');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
