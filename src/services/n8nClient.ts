import { ApiResponse, EventItem, Registration, UserProfile } from '../types';
import { INITIAL_EVENTS, INITIAL_REGISTRATIONS, INITIAL_USER_PROFILE } from '../data/mockEvents';

/**
 * EventPass - Servicio Centralizado de Comunicación HTTP con n8n
 *
 * Toda lectura/escritura pasa por los webhooks de n8n (nunca directo a Google Sheets):
 *   WF01 POST  {VITE_N8N_BASE_URL}/ep/usuarios       action: create | get | update | deactivate
 *   WF02 POST  {VITE_N8N_BASE_URL}/ep/auth           action: login | logout | validate
 *   WF03 POST  {VITE_N8N_BASE_URL}/ep/telegram       action: code | status | unlink
 *   WF05 GET   {VITE_N8N_BASE_URL}/ep/catalogo       ?evento_id= &categoria= &visitor_id=
 *   WF06 POST  {VITE_N8N_BASE_URL}/ep/inscripciones  action: create | list | update | cancel
 *   WF10 POST  {VITE_N8N_CHAT_URL}                   Chat Trigger (sendMessage)
 *
 * Si VITE_N8N_BASE_URL no está configurada, opera en Modo Demostración con localStorage.
 */

const LOCAL_STORAGE_KEYS = {
  EVENTS: 'eventpass_demo_events',
  REGISTRATIONS: 'eventpass_demo_registrations',
  PROFILE: 'eventpass_demo_profile',
  IS_LOGGED_IN: 'eventpass_demo_is_logged_in',
  SESSION_TOKEN: 'eventpass_session_token',
  SESSION_PROFILE: 'eventpass_session_profile',
  VISITOR_ID: 'eventpass_visitor_id'
};

const GUEST_PROFILE: UserProfile = {
  name: 'Invitado',
  email: '',
  phone: '',
  city: '',
  telegramLinked: false,
  notificationEmail: true,
  notificationTelegram: true
};

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'EventPassNotificaBot';

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string | null): void => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (e) {
    console.warn('No se pudo escribir en localStorage:', e);
  }
};

class N8nApiClient {
  private baseUrl: string;
  private chatUrl: string;

  constructor() {
    this.baseUrl = (import.meta.env.VITE_N8N_BASE_URL || '').trim().replace(/\/+$/, '');
    this.chatUrl = (import.meta.env.VITE_N8N_CHAT_URL || '').trim();
    this.initializeLocalStorage();
  }

  public isConnected(): boolean {
    return Boolean(this.baseUrl && this.baseUrl.startsWith('http'));
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getVisitorId(): string {
    let id = readStorage(LOCAL_STORAGE_KEYS.VISITOR_ID);
    if (!id) {
      id = `VIS-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
      writeStorage(LOCAL_STORAGE_KEYS.VISITOR_ID, id);
    }
    return id;
  }

  private getToken(): string {
    return readStorage(LOCAL_STORAGE_KEYS.SESSION_TOKEN) || '';
  }

  private saveSession(token: string | null, profile: UserProfile | null): void {
    writeStorage(LOCAL_STORAGE_KEYS.SESSION_TOKEN, token);
    writeStorage(LOCAL_STORAGE_KEYS.SESSION_PROFILE, profile ? JSON.stringify(profile) : null);
  }

  /** Llama a un webhook de n8n y normaliza la respuesta { success, data, error, message }. */
  private async call<T>(
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}/${path}`);
    Object.entries(query || {}).forEach(([k, v]) => v && url.searchParams.set(k, v));
    try {
      const response = await fetch(url.toString(), body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : { method: 'GET' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.success === false) {
        return {
          success: false,
          isMock: false,
          data: json.data,
          error: json.error || `El servidor respondió con error HTTP ${response.status}.`
        };
      }
      return { success: true, isMock: false, data: json.data, message: json.message };
    } catch {
      return {
        success: false,
        isMock: false,
        error: 'No se pudo conectar con el servidor de n8n. Revisa tu conexión e inténtalo de nuevo.'
      };
    }
  }

  /** Llamada autenticada: si la sesión ya no es válida, la limpia localmente. */
  private async authCall<T>(path: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
    const res = await this.call<T>(path, { ...body, session_token: this.getToken() });
    if (!res.success && /sesi[oó]n|INACTIV/i.test(res.error || '')) {
      this.saveSession(null, null);
    }
    return res;
  }

  private initializeLocalStorage(): void {
    if (typeof window === 'undefined') return;

    if (!readStorage(LOCAL_STORAGE_KEYS.EVENTS)) {
      writeStorage(LOCAL_STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
    }
    if (!readStorage(LOCAL_STORAGE_KEYS.REGISTRATIONS)) {
      writeStorage(LOCAL_STORAGE_KEYS.REGISTRATIONS, JSON.stringify(INITIAL_REGISTRATIONS));
    }
    if (!readStorage(LOCAL_STORAGE_KEYS.PROFILE)) {
      writeStorage(LOCAL_STORAGE_KEYS.PROFILE, JSON.stringify(INITIAL_USER_PROFILE));
    }
  }

  private getStoredEvents(): EventItem[] {
    try {
      const data = readStorage(LOCAL_STORAGE_KEYS.EVENTS);
      return data ? JSON.parse(data) : INITIAL_EVENTS;
    } catch {
      return INITIAL_EVENTS;
    }
  }

  private saveStoredEvents(events: EventItem[]): void {
    writeStorage(LOCAL_STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }

  private getStoredRegistrations(): Registration[] {
    try {
      const data = readStorage(LOCAL_STORAGE_KEYS.REGISTRATIONS);
      return data ? JSON.parse(data) : INITIAL_REGISTRATIONS;
    } catch {
      return INITIAL_REGISTRATIONS;
    }
  }

  private saveStoredRegistrations(registrations: Registration[]): void {
    writeStorage(LOCAL_STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
  }

  private getStoredProfile(): UserProfile {
    try {
      const data = readStorage(LOCAL_STORAGE_KEYS.PROFILE);
      return data ? JSON.parse(data) : INITIAL_USER_PROFILE;
    } catch {
      return INITIAL_USER_PROFILE;
    }
  }

  private saveStoredProfile(profile: UserProfile): void {
    writeStorage(LOCAL_STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }

  // ============================================================
  // WF05: Catálogo público (GET /ep/catalogo)
  // ============================================================
  public async getEvents(): Promise<ApiResponse<EventItem[]>> {
    if (this.isConnected()) {
      return this.call<EventItem[]>('ep/catalogo', undefined, { visitor_id: this.getVisitorId() });
    }

    return {
      success: true,
      data: this.getStoredEvents(),
      isMock: true,
      message: 'Modo Demostración: Eventos cargados desde la muestra local.'
    };
  }

  public async getEventById(id: string): Promise<ApiResponse<EventItem>> {
    if (this.isConnected()) {
      return this.call<EventItem>('ep/catalogo', undefined, { evento_id: id, visitor_id: this.getVisitorId() });
    }

    const event = this.getStoredEvents().find((e) => e.id === id);
    if (!event) {
      return { success: false, isMock: true, error: 'Evento no encontrado' };
    }
    return { success: true, data: event, isMock: true };
  }

  // ============================================================
  // WF06: Inscripción a evento (POST /ep/inscripciones, action=create)
  // ============================================================
  public async registerToEvent(payload: {
    eventId: string;
    userName: string;
    userEmail: string;
    notes?: string;
  }): Promise<ApiResponse<Registration>> {
    if (this.isConnected()) {
      return this.authCall<Registration>('ep/inscripciones', {
        action: 'create',
        evento_id: payload.eventId,
        nombre_acreditacion: payload.userName,
        observaciones: payload.notes || ''
      });
    }

    const events = this.getStoredEvents();
    const event = events.find((e) => e.id === payload.eventId);

    if (!event) {
      return { success: false, isMock: true, error: 'El evento solicitado no existe.' };
    }

    if (event.status === 'CANCELADO' || event.status === 'CERRADO') {
      return { success: false, isMock: true, error: 'Este evento no admite inscripciones.' };
    }

    // Modo Demostración
    const alreadyRegistered = this.getStoredRegistrations().some(
      (r) =>
        r.eventId === event.id &&
        r.status !== 'CANCELADA' &&
        r.userEmail.toLowerCase() === payload.userEmail.toLowerCase()
    );
    if (alreadyRegistered) {
      return { success: false, isMock: true, error: 'Ya tienes una inscripción activa para este evento.' };
    }

    const isFull = event.registeredCount >= event.totalCapacity || event.status === 'AGOTADO';
    const regStatus = isFull ? 'LISTA_ESPERA' : 'CONFIRMADA';
    const randomTicketNumber = Math.floor(10000 + Math.random() * 90000);
    const newRegId = `REG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newRegistration: Registration = {
      id: newRegId,
      ticketCode: isFull ? `EP-WL-${randomTicketNumber}` : `EP-TK-${randomTicketNumber}`,
      eventId: event.id,
      eventTitle: event.title,
      eventCategory: event.category,
      eventDate: event.date,
      eventTime: event.time,
      eventLocation: event.location,
      eventImageUrl: event.imageUrl,
      userEmail: payload.userEmail,
      userName: payload.userName,
      status: regStatus,
      registeredAt: new Date().toISOString(),
      notes: payload.notes || (isFull ? 'Ingresado a lista de espera automática.' : 'Acreditación confirmada.'),
      qrPayload: `EVENTPASS|${newRegId}|${randomTicketNumber}|${event.id}|${payload.userEmail}|${regStatus}`
    };

    // Actualizar cupos en memoria demo
    if (!isFull) {
      event.registeredCount += 1;
      if (event.registeredCount >= event.totalCapacity) {
        event.status = 'AGOTADO';
      }
      this.saveStoredEvents(events);
    }

    const currentRegs = this.getStoredRegistrations();
    this.saveStoredRegistrations([newRegistration, ...currentRegs]);

    return {
      success: true,
      data: newRegistration,
      isMock: true,
      message: isFull
        ? 'Evento lleno: Te has registrado con éxito en la LISTA DE ESPERA (Modo Demo).'
        : '¡Inscripción CONFIRMADA con éxito! (Modo Demo - No persistido en Google Sheets aún).'
    };
  }

  // ============================================================
  // WF06: Cancelar inscripción (POST /ep/inscripciones, action=cancel)
  // ============================================================
  public async cancelRegistration(payload: {
    registrationId: string;
    reason: string;
  }): Promise<ApiResponse<{ registrationId: string }>> {
    if (this.isConnected()) {
      return this.authCall<{ registrationId: string }>('ep/inscripciones', {
        action: 'cancel',
        inscripcion_id: payload.registrationId,
        motivo: payload.reason
      });
    }

    // Modo Demostración
    const regs = this.getStoredRegistrations();
    const target = regs.find((r) => r.id === payload.registrationId);

    if (!target) {
      return { success: false, isMock: true, error: 'Inscripción no encontrada.' };
    }

    if (target.status === 'CANCELADA') {
      return { success: false, isMock: true, error: 'Esta inscripción ya se encuentra cancelada.' };
    }

    const wasConfirmed = target.status === 'CONFIRMADA';
    target.status = 'CANCELADA';
    target.cancellationReason = payload.reason || 'Cancelada a petición del usuario';

    // Solo una inscripción confirmada ocupa cupo: se reasigna al primero en lista de espera
    // o, si no hay nadie esperando, se devuelve al evento.
    if (wasConfirmed) {
      const nextInLine = regs
        .filter((r) => r.eventId === target.eventId && r.status === 'LISTA_ESPERA')
        .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt))[0];

      if (nextInLine) {
        nextInLine.status = 'CONFIRMADA';
        nextInLine.ticketCode = nextInLine.ticketCode.replace('EP-WL-', 'EP-TK-');
        nextInLine.qrPayload = nextInLine.qrPayload
          .replace('EP-WL-', 'EP-TK-')
          .replace(/\|LISTA_ESPERA$/, '|CONFIRMADA');
        nextInLine.notes = 'Cupo liberado: promovido desde la lista de espera.';
      } else {
        const events = this.getStoredEvents();
        const event = events.find((e) => e.id === target.eventId);
        if (event && event.registeredCount > 0) {
          event.registeredCount -= 1;
          if (event.status === 'AGOTADO') {
            event.status = 'DISPONIBLE';
          }
          this.saveStoredEvents(events);
        }
      }
    }

    this.saveStoredRegistrations(regs);

    return {
      success: true,
      data: { registrationId: payload.registrationId },
      isMock: true,
      message: 'Inscripción cancelada correctamente (Modo Demostración).'
    };
  }

  // ============================================================
  // WF06: Inscripciones del usuario (POST /ep/inscripciones, action=list)
  // ============================================================
  public async getUserRegistrations(userEmail: string): Promise<ApiResponse<Registration[]>> {
    if (this.isConnected()) {
      if (!this.getToken()) return { success: true, data: [], isMock: false };
      return this.authCall<Registration[]>('ep/inscripciones', { action: 'list' });
    }

    const email = userEmail.trim().toLowerCase();
    return {
      success: true,
      data: this.getStoredRegistrations().filter((r) => r.userEmail.toLowerCase() === email),
      isMock: true
    };
  }

  // ============================================================
  // WF02: Autenticación y sesiones (POST /ep/auth)
  // ============================================================
  public async login(payload: { email: string; password?: string }): Promise<ApiResponse<UserProfile>> {
    if (this.isConnected()) {
      const res = await this.call<{ token: string; expiresAt: string; profile: UserProfile }>('ep/auth', {
        action: 'login',
        email: payload.email,
        password: payload.password
      });
      if (!res.success || !res.data) return { success: false, isMock: false, error: res.error };
      this.saveSession(res.data.token, res.data.profile);
      return { success: true, data: res.data.profile, isMock: false, message: res.message };
    }

    // Modo Demostración
    const profile = this.getStoredProfile();
    profile.email = payload.email || profile.email;
    this.saveStoredProfile(profile);
    writeStorage(LOCAL_STORAGE_KEYS.IS_LOGGED_IN, 'true');

    return {
      success: true,
      data: profile,
      isMock: true,
      message: 'Sesión iniciada en Modo Demostración (sin autenticación externa).'
    };
  }

  public async logout(): Promise<void> {
    if (this.isConnected()) {
      const token = this.getToken();
      this.saveSession(null, null);
      if (token) await this.call('ep/auth', { action: 'logout', session_token: token });
      return;
    }
    writeStorage(LOCAL_STORAGE_KEYS.IS_LOGGED_IN, 'false');
  }

  /** Valida en n8n la sesión guardada (al abrir la app). */
  public async validateSession(): Promise<ApiResponse<UserProfile>> {
    if (!this.isConnected()) {
      return { success: this.isLoggedIn(), data: this.getStoredProfile(), isMock: true };
    }
    if (!this.getToken()) return { success: false, isMock: false };
    const res = await this.authCall<{ profile: UserProfile }>('ep/auth', { action: 'validate' });
    if (!res.success || !res.data) return { success: false, isMock: false, error: res.error };
    this.saveSession(this.getToken(), res.data.profile);
    return { success: true, data: res.data.profile, isMock: false };
  }

  // ============================================================
  // WF01: Usuarios CRUD (POST /ep/usuarios)
  // ============================================================
  public async registerUser(payload: {
    name: string;
    email: string;
    password?: string;
  }): Promise<ApiResponse<UserProfile>> {
    if (this.isConnected()) {
      const res = await this.call<UserProfile>('ep/usuarios', {
        action: 'create',
        nombre: payload.name,
        email: payload.email,
        password: payload.password
      });
      if (!res.success) return res;
      // Cuenta creada: se inicia sesión con las mismas credenciales
      return this.login({ email: payload.email, password: payload.password });
    }

    const currentProfile = this.getStoredProfile();
    const updatedProfile: UserProfile = {
      ...currentProfile,
      name: payload.name,
      email: payload.email,
      telegramLinked: false,
      telegramCode: `EP-${Math.floor(10000 + Math.random() * 90000)}`
    };
    this.saveStoredProfile(updatedProfile);
    writeStorage(LOCAL_STORAGE_KEYS.IS_LOGGED_IN, 'true');

    return {
      success: true,
      data: updatedProfile,
      isMock: true,
      message: 'Usuario creado en Modo Demostración (preparado para n8n).'
    };
  }

  public async updateProfile(updated: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    if (this.isConnected()) {
      const res = await this.authCall<UserProfile>('ep/usuarios', {
        action: 'update',
        nombre: updated.name,
        email: updated.email,
        telefono: updated.phone,
        ciudad: updated.city,
        organizacion: updated.organization,
        notificationEmail: updated.notificationEmail,
        notificationTelegram: updated.notificationTelegram
      });
      if (res.success && res.data) this.saveSession(this.getToken(), res.data);
      return res;
    }

    const merged = { ...this.getStoredProfile(), ...updated };
    this.saveStoredProfile(merged);
    return { success: true, data: merged, isMock: true };
  }

  public async deactivateAccount(): Promise<ApiResponse<UserProfile>> {
    if (this.isConnected()) {
      const res = await this.authCall<UserProfile>('ep/usuarios', { action: 'deactivate' });
      if (res.success) this.saveSession(null, null);
      return res;
    }
    writeStorage(LOCAL_STORAGE_KEYS.IS_LOGGED_IN, 'false');
    return { success: true, isMock: true, message: 'Cuenta desactivada (Modo Demostración).' };
  }

  // ============================================================
  // WF03: Vinculación con Telegram (POST /ep/telegram)
  // ============================================================
  public async requestTelegramLinkCode(): Promise<ApiResponse<{ code: string; botUser: string; expiresAt: string }>> {
    if (this.isConnected()) {
      return this.authCall('ep/telegram', { action: 'code' });
    }

    // Modo Demostración
    const randomCode = `EP-${Math.floor(20000 + Math.random() * 79999)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const profile = this.getStoredProfile();
    profile.telegramCode = randomCode;
    profile.telegramCodeExpiresAt = expiresAt;
    this.saveStoredProfile(profile);

    return {
      success: true,
      data: { code: randomCode, botUser: BOT_USERNAME, expiresAt },
      isMock: true,
      message: 'Código generado en Modo Demostración. Usa /vincular ' + randomCode + ' en Telegram.'
    };
  }

  /**
   * Con n8n: consulta si el bot ya procesó el /vincular (WF03 con Telegram Trigger).
   * En demo: simula la vinculación.
   */
  public async checkTelegramLink(telegramUsername?: string): Promise<ApiResponse<UserProfile>> {
    if (this.isConnected()) {
      const res = await this.authCall<{ linked: boolean; telegramUsername: string | null }>('ep/telegram', {
        action: 'status'
      });
      if (!res.success || !res.data) return { success: false, isMock: false, error: res.error };
      if (!res.data.linked) {
        return {
          success: false,
          isMock: false,
          error: `Aún no recibimos tu código. Envía /vincular CODIGO al bot @${BOT_USERNAME} y vuelve a verificar.`
        };
      }
      const profile = {
        ...this.getProfile(),
        telegramLinked: true,
        telegramUsername: res.data.telegramUsername || undefined,
        telegramCode: undefined
      };
      this.saveSession(this.getToken(), profile);
      return { success: true, data: profile, isMock: false };
    }

    const profile = this.getStoredProfile();
    profile.telegramLinked = true;
    profile.telegramUsername = telegramUsername || profile.telegramUsername || 'usuario_telegram_demo';
    this.saveStoredProfile(profile);

    return {
      success: true,
      data: profile,
      isMock: true,
      message: `¡Cuenta de Telegram @${profile.telegramUsername} vinculada con éxito!`
    };
  }

  public async unlinkTelegram(): Promise<ApiResponse<UserProfile>> {
    if (this.isConnected()) {
      const res = await this.authCall('ep/telegram', { action: 'unlink' });
      if (!res.success) return { success: false, isMock: false, error: res.error };
      const profile = { ...this.getProfile(), telegramLinked: false, telegramUsername: undefined };
      this.saveSession(this.getToken(), profile);
      return { success: true, data: profile, isMock: false };
    }
    const merged = { ...this.getStoredProfile(), telegramLinked: false, telegramUsername: undefined };
    this.saveStoredProfile(merged);
    return { success: true, data: merged, isMock: true };
  }

  // ============================================================
  // WF10: Asistente conversacional (Chat Trigger de n8n + Gemini)
  // ============================================================
  public async sendChatMessage(promptText: string, sessionId: string): Promise<ApiResponse<{ reply: string }>> {
    if (this.chatUrl) {
      try {
        const response = await fetch(this.chatUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendMessage',
            sessionId,
            chatInput: promptText,
            metadata: { usuario_id: this.getProfile().usuario_id || '', visitor_id: this.getVisitorId() }
          })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        return { success: true, data: { reply: json.output || json.text || '' }, isMock: false };
      } catch {
        return {
          success: false,
          isMock: false,
          error: 'El asistente no está disponible en este momento. Inténtalo de nuevo en unos segundos.'
        };
      }
    }

    // Asistente Local Experto en EventPass
    const reply = this.generateLocalAssistantResponse(promptText);
    return {
      success: true,
      data: { reply },
      isMock: true
    };
  }

  public getProfile(): UserProfile {
    if (this.isConnected()) {
      try {
        const data = readStorage(LOCAL_STORAGE_KEYS.SESSION_PROFILE);
        return data ? JSON.parse(data) : GUEST_PROFILE;
      } catch {
        return GUEST_PROFILE;
      }
    }
    return this.getStoredProfile();
  }

  public isLoggedIn(): boolean {
    if (this.isConnected()) return Boolean(this.getToken());
    // Sin valor guardado se asume el usuario demo con sesión iniciada
    return readStorage(LOCAL_STORAGE_KEYS.IS_LOGGED_IN) !== 'false';
  }

  public resetDemoData(): void {
    if (typeof window === 'undefined') return;
    writeStorage(LOCAL_STORAGE_KEYS.EVENTS, null);
    writeStorage(LOCAL_STORAGE_KEYS.REGISTRATIONS, null);
    writeStorage(LOCAL_STORAGE_KEYS.PROFILE, null);
    this.initializeLocalStorage();
  }

  private generateLocalAssistantResponse(query: string): string {
    const q = query.toLowerCase();

    if (q.includes('telegram') || q.includes('vincular') || q.includes('bot') || q.includes('código') || q.includes('codigo')) {
      const profile = this.getStoredProfile();
      const code = profile.telegramCode || 'EP-84920';
      return `Para vincular tu cuenta de Telegram y recibir tus entradas digitales y alertas de cupos:

1. Abre la aplicación de Telegram y busca nuestro bot: @${import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'EventPassNotificaBot'}
2. Haz clic en "Iniciar" o envía el comando:
   /vincular ${code}
3. El bot confirmará la asociación automática con tu correo (${profile.email}).

Recuerda que cada código es de un solo uso y dura 15 minutos. Puedes generar uno nuevo en tu sección de Perfil.`;
    }

    if (q.includes('tecnología') || q.includes('tecnologia') || q.includes('ai') || q.includes('ia') || q.includes('cloud') || q.includes('devops')) {
      return `En la categoría de Tecnología contamos con dos eventos destacados:
• "Cumbre Global de Inteligencia Artificial & Cloud 2026": 15 de Noviembre en Ciudad de México (Híbrido). Actualmente tiene cupos disponibles.
• "DevOps & Kubernetes World Tour Latam": 18 de Noviembre en Lima. Quedan los últimos 3 cupos antes de pasar a lista de espera.`;
    }

    if (q.includes('cultura') || q.includes('jazz') || q.includes('música') || q.includes('musica')) {
      return `En la categoría de Cultura tenemos el "Festival Iberoamericano de Jazz & Artes Sonoras" el 28 de Octubre en Santiago.
El aforo presencial de 200 asistentes se encuentra completo (AGOTADO), pero puedes unirte a la LISTA DE ESPERA desde la ficha del evento para que se te asigne un pase en caso de cancelaciones.`;
    }

    if (q.includes('educación') || q.includes('educacion') || q.includes('taller') || q.includes('n8n') || q.includes('diseño') || q.includes('ux')) {
      return `En Educación tenemos dos opciones excelentes:
1. "Bootcamp Práctico: Automatizaciones con n8n & No-Code" (22 de Noviembre): cupos disponibles para aprender arquitectura de webhooks y Google Sheets.
2. "Masterclass de Diseño de Producto & UX Systems" (05 de Diciembre): estado PRÓXIMO con apertura programada de inscripciones.`;
    }

    if (q.includes('deporte') || q.includes('carrera') || q.includes('maratón') || q.includes('maraton')) {
      return `Sobre eventos deportivos: La "Maratón Nocturna Metropolitana 10K & 21K" programada en Buenos Aires fue CANCELADA oficialmente por el organizador debido a refacciones viales metropolitanas. No admite inscripciones.`;
    }

    if (q.includes('cancelar') || q.includes('anular') || q.includes('baja')) {
      return `Puedes cancelar cualquier inscripción desde la pestaña "Mis Inscripciones":
1. Dirígete a "Mis Inscripciones" en el menú superior.
2. Ubica el evento con estado CONFIRMADA o LISTA_ESPERA.
3. Haz clic en "Cancelar inscripción" y confirma el motivo en la ventana emergente.
El cupo se liberará automáticamente para otros usuarios o la lista de espera.`;
    }

    if (q.includes('n8n') || q.includes('sheets') || q.includes('backend') || q.includes('arquitectura')) {
      return `Arquitectura de EventPass:
El frontend está completamente preparado para conectarse vía HTTP a un servidor de n8n mediante la variable VITE_N8N_BASE_URL.
n8n actúa como orquestador central, guardando los registros en Google Sheets, enviando correos con Gmail y notificando por Telegram.
Actualmente la aplicación opera en Modo Demostración sin persistencia externa para que pruebes la experiencia visual y los flujos.`;
    }

    if (q.includes('costo') || q.includes('precio') || q.includes('pagar') || q.includes('gratis')) {
      return `Todos los eventos de demostración en EventPass son de acceso gratuito con acreditación previa. Simplemente debes registrar tu nombre y correo para recibir tu pase digital con código QR.`;
    }

    return `¡Hola! Soy el asistente virtual de EventPass. Puedo ayudarte con:
• Consultar eventos disponibles por categoría (Tecnología, Cultura, Educación, Deportes).
• Cómo vincular tu bot de Telegram con el comando /vincular.
• Cómo funcionan los estados: CONFIRMADA, LISTA DE ESPERA y CANCELADA.
• Información sobre la arquitectura n8n y Google Sheets.

¿Sobre qué evento o proceso deseas información específica?`;
  }
}

export const n8nApi = new N8nApiClient();
