export type EventCategory = 'Tecnología' | 'Educación' | 'Cultura' | 'Deportes';

export type EventStatus = 'DISPONIBLE' | 'AGOTADO' | 'PROXIMO' | 'CANCELADO' | 'CERRADO';

export type RegistrationStatus = 'CONFIRMADA' | 'LISTA_ESPERA' | 'CANCELADA' | 'ASISTIO';

export type CheckinResultado = 'EXITOSO' | 'RECHAZADO' | 'DUPLICADO';

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  shortDescription: string;
  description: string;
  date: string;
  time: string;
  location: string;
  venueType: 'Presencial' | 'Híbrido' | 'Online';
  organizer: string;
  organizerRole?: string;
  totalCapacity: number;
  registeredCount: number;
  availableSpots?: number;
  waitlistCount?: number;
  daysUntil?: number | null;
  status: EventStatus;
  cancellationReason?: string;
  imageUrl: string;
  featured?: boolean;
  tags: string[];
  priceText: string;
  agenda?: { time: string; topic: string }[];
  prerequisites?: string[];
}

export interface Registration {
  id: string;
  ticketCode: string;
  eventId: string;
  eventTitle: string;
  eventCategory: EventCategory;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventImageUrl: string;
  userEmail: string;
  userName: string;
  status: RegistrationStatus;
  registeredAt: string;
  notes?: string;
  cancellationReason?: string;
  qrPayload: string;
}

export interface CheckinResult {
  resultado: CheckinResultado;
  checkin_id: string;
  inscripcion_id: string;
  evento_id: string;
  usuario_id: string;
  asistente: string;
  evento_nombre: string;
  fecha_checkin: string;
  estado_inscripcion: string;
  detalle: string;
}

export interface UserProfile {
  usuario_id?: string;
  estado?: 'ACTIVO' | 'INACTIVO';
  name: string;
  email: string;
  phone: string;
  city: string;
  organization?: string;
  telegramUsername?: string;
  telegramLinked: boolean;
  telegramCode?: string;
  telegramCodeExpiresAt?: string;
  notificationEmail: boolean;
  notificationTelegram: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  quickActions?: { label: string; action: string }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  isMock: boolean;
  message?: string;
}
