# EventPass 🎟️

**Estudiante:** Mariangel Jaimes
**Aplicación pública (Vercel):** https://eventpass-tawny.vercel.app

EventPass es una plataforma web para descubrir eventos, inscribirse, gestionar cupos y listas de espera, y recibir notificaciones por **Gmail** y **Telegram**. El frontend en React solo actúa como cliente: toda la lógica de negocio vive en **11 workflows de n8n** y la persistencia en **11 archivos de Google Sheets**. Incluye un asistente conversacional con **Google Gemini**.

> Configuración paso a paso (Telegram, Google Sheets, Gemini, n8n y Vercel): [docs/GUIA_CONFIGURACION.md](docs/GUIA_CONFIGURACION.md)

---

## Contenido

1. [Arquitectura general](#1-arquitectura-general)
2. [Tecnologías utilizadas](#2-tecnologías-utilizadas)
3. [Workflows, triggers y Google Sheets](#3-workflows-triggers-y-google-sheets)
4. [Comunicación frontend → n8n](#4-comunicación-frontend--n8n)
5. [Endpoints implementados](#5-endpoints-implementados)
6. [Estados utilizados](#6-estados-utilizados)
7. [Hashing de contraseñas](#7-hashing-de-contraseñas)
8. [Manejo de sesiones](#8-manejo-de-sesiones)
9. [Idempotencia](#9-idempotencia)
10. [Lista de espera y reasignación](#10-lista-de-espera-y-reasignación)
11. [Servicio central de notificaciones](#11-servicio-central-de-notificaciones)
12. [Asistente IA y sus restricciones](#12-asistente-ia-y-sus-restricciones)
13. [Variables de entorno](#13-variables-de-entorno)
14. [Ejecutar el proyecto](#14-ejecutar-el-proyecto)
15. [Estructura del repositorio](#15-estructura-del-repositorio)
16. [Examen — Check-in digital](#16-examen--check-in-digital)

---

## 1. Arquitectura general

```
 Aplicación pública en Vercel (React + Vite)
        │  HTTP (fetch JSON)          │  Chat
        ▼                             ▼
 ┌──────────────────────── n8n ─────────────────────────┐
 │ WF01 Usuarios  WF02 Sesiones  WF03 Telegram          │
 │ WF05 Catálogo  WF06 Inscripciones  WF10 Asistente IA │
 │ WF04 Admin (Form)  WF07 Reasignación  WF08 Recordat. │
 │            └──────────► WF09 Notificaciones ◄─────────┤
 └───────────────┬──────────────────────┬────────────────┘
                 ▼                      ▼
        Google Sheets (EP01…EP11)   Gmail · Telegram · Gemini
```

Principios:

- **El frontend nunca toca Google Sheets.** Solo conoce las URLs de los webhooks de n8n.
- **n8n decide todo:** validaciones, cupos, estados, idempotencia, persistencia y notificaciones.
- **Un archivo de Google Sheets por dominio** (EP01 a EP11). Un workflow puede *leer* otros archivos, pero escribe su información principal en el suyo.
- **Borrado lógico:** nunca se eliminan filas; se cambian estados.

## 2. Tecnologías utilizadas

| Capa | Tecnología |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, lucide-react |
| Hosting | Vercel |
| Orquestación | n8n (Webhook, Form Trigger, Schedule Trigger, Telegram Trigger, Chat Trigger, Execute Sub-workflow, Code, Switch, IF) |
| Persistencia | Google Sheets (11 archivos) |
| Notificaciones | Gmail y Telegram Bot API |
| IA | Google Gemini (`gemini-3.5-flash`) mediante el nodo LLM Chain de n8n |
| Herramientas | `n8n/generar_workflows.mjs` genera los workflows, `n8n/importar_workflows.mjs` los importa y activa por la API de n8n y el workflow adicional **WF00** crea los 11 Google Sheets (todo en JavaScript) |

## 3. Workflows, triggers y Google Sheets

| Workflow | Archivo JSON | Trigger | Google Sheets (hojas) |
|---|---|---|---|
| WF01 Usuarios CRUD | `WF01_usuarios_crud.json` | Webhook `POST /ep/usuarios` | **EP01_Usuarios** (Usuarios, Auditoria_Usuarios) |
| WF02 Autenticación y sesiones | `WF02_auth_sesiones.json` | Webhook `POST /ep/auth` | **EP02_Sesiones** (Sesiones) |
| WF03 Vinculación Telegram | `WF03_vinculacion_telegram.json` | Webhook `POST /ep/telegram` + **Telegram Trigger** | **EP03_Telegram** (Codigos_Vinculacion, Vinculaciones) |
| WF04 Administración de eventos | `WF04_eventos_crud.json` | **n8n Form Trigger** (Basic Auth) | **EP04_Eventos** (Eventos, Auditoria_Eventos) |
| WF05 Catálogo público | `WF05_catalogo_publico.json` | Webhook `GET /ep/catalogo` | **EP05_Catalogo_Log** (Consultas_Catalogo) |
| WF06 Inscripciones CRUD | `WF06_inscripciones_crud.json` | Webhook `POST /ep/inscripciones` | **EP06_Inscripciones** (Inscripciones, Auditoria_Inscripciones) |
| WF07 Reasignación lista de espera | `WF07_reasignacion_lista_espera.json` | **Schedule Trigger** (cada 5 min) | **EP07_Reasignaciones** (Reasignaciones) |
| WF08 Recordatorios | `WF08_recordatorios.json` | **Schedule Trigger** (cada hora) | **EP08_Recordatorios** (Recordatorios) |
| WF09 Notificaciones | `WF09_notificaciones.json` | **Execute Sub-workflow Trigger** | **EP09_Notificaciones** (Notificaciones) |
| WF10 EventPass Assistant | `WF10_eventpass_assistant.json` | **Chat Trigger** | **EP10_Soporte** (Conversaciones, Mensajes) |
| WF11 Check-in digital | `WF11_checkin_digital.json` | Webhook `POST /ep/checkin` | **EP11_Checkin** (Checkins) |

Cómo se reparten las responsabilidades mínimas dentro de cada workflow:

- **WF01:** Webhook → lectura de Usuarios → *Validar solicitud* (validación de datos, control de email duplicado, validación de sesión) → Switch *Enrutar operación* → Code *Generar hash, salt y usuario_id* → append/update en Usuarios → auditoría → respuesta JSON.
- **WF02:** Webhook → lectura de usuario y sesiones → Code *Verificar password y sesión* (hash + salt, token, expiración) → Switch → registro/actualización de sesión → respuesta JSON.
- **WF03:** (A) Webhook → validar sesión → generar código → guardar en Codigos_Vinculacion. (B) Telegram Trigger → *Extraer código* → *Validar código y vigencia* (existencia, vigencia, código usado) → marcar `USADO`/`EXPIRADO` → guardar `chat_id` → respuesta en Telegram.
- **WF04:** Form Trigger → lectura de eventos → *Validar formulario* → Switch por acción → crear/actualizar → auditoría → página de resultado. Si la acción es `CANCEL`, cancela las inscripciones activas y notifica vía WF09.
- **WF05:** Webhook → lectura de eventos e inscripciones → *Filtrar eventos publicables* (Filter) → *Calcular cupos (Aggregate)* → registro de la consulta → respuesta JSON.
- **WF06:** Webhook → lectura de sesión, usuario, vinculación Telegram, evento e inscripciones → *Validar y calcular cupos* → Switch → append/update → auditoría → respuesta JSON → Execute Sub-workflow a WF09.
- **WF07:** Schedule → lectura de eventos e inscripciones → *Calcular cupos y ordenar lista* → actualizar inscripción → WF09 → registrar reasignación y auditoría.
- **WF08:** Schedule → lectura de eventos, inscripciones y recordatorios previos → *Detectar recordatorios pendientes* (fechas + duplicados) → WF09 → registrar recordatorio.
- **WF09:** Execute Sub-workflow Trigger → consulta de usuario y `chat_id` → *Preparar notificación* (idempotencia) → Gmail → resultado Gmail → Telegram → resultado Telegram → registro con ambos resultados.
- **WF10:** Chat Trigger → lectura de solo lectura de eventos e inscripciones → historial → *Preparar contexto* → guarda conversación y mensaje del usuario → Gemini → guarda respuesta → responde al chat.
- **WF11:** Webhook → lectura de inscripción, evento e historial de check-in → validaciones de existencia, correspondencia, duplicado y estado → *Generar checkin_id* → IF → actualización a `ASISTIO` → registro en Checkins → respuesta JSON → Execute Sub-workflow a WF09 (ver [sección 16](#16-examen--check-in-digital)).

## 4. Comunicación frontend → n8n

Todo el acceso a datos está centralizado en [`src/services/n8nClient.ts`](src/services/n8nClient.ts):

1. Lee `VITE_N8N_BASE_URL` y `VITE_N8N_CHAT_URL` en tiempo de compilación.
2. Envía `fetch` con JSON. Las operaciones protegidas incluyen `session_token`.
3. Cada workflow responde con el mismo formato:

   ```json
   { "success": true, "data": { }, "message": "texto para el usuario" }
   { "success": false, "error": "motivo del error" }
   ```

4. La interfaz muestra los tres estados: **carga** (spinners en catálogo, botones y formularios), **éxito** (notificaciones toast verdes) y **error** (toast rojo con el mensaje de n8n y botón *Reintentar* en el catálogo).
5. Si n8n responde que la sesión no es válida, el cliente borra el token y la interfaz vuelve a "Iniciar sesión".

Si `VITE_N8N_BASE_URL` está vacía, la web funciona en **Modo Demostración** con datos locales (`localStorage`), útil para revisar la interfaz sin backend.

## 5. Endpoints implementados

Base: `VITE_N8N_BASE_URL` (por ejemplo `https://tu-n8n/webhook`).

| Método y ruta | `action` | Body / query | Respuesta `data` |
|---|---|---|---|
| `POST /ep/usuarios` | `create` | `nombre, email, password` | perfil |
| | `get` | `session_token` | perfil |
| | `update` | `session_token, nombre, email, telefono, ciudad, organizacion` | perfil |
| | `deactivate` | `session_token` | perfil (INACTIVO) |
| `POST /ep/auth` | `login` | `email, password` | `token, expiresAt, profile` |
| | `logout` | `session_token` | — |
| | `validate` | `session_token` | `expiresAt, profile` |
| `POST /ep/telegram` | `code` | `session_token` | `code, botUser, expiresAt` |
| | `status` | `session_token` | `linked, telegramUsername` |
| | `unlink` | `session_token` | — |
| `GET /ep/catalogo` | — | `?categoria=&disponibles=true&visitor_id=` | lista de eventos |
| | — | `?evento_id=EVT-...` | detalle de evento |
| `POST /ep/inscripciones` | `create` | `session_token, evento_id, nombre_acreditacion, observaciones` | inscripción |
| | `list` | `session_token` | inscripciones del usuario |
| | `update` | `session_token, inscripcion_id, nombre_acreditacion, observaciones` | inscripción |
| | `cancel` | `session_token, inscripcion_id, motivo` | inscripción |
| `POST /ep/checkin` | — | `inscripcion_id, evento_id` | resultado del check-in (`EXITOSO`/`DUPLICADO`/`RECHAZADO`) |
| `POST {VITE_N8N_CHAT_URL}` | `sendMessage` | `sessionId, chatInput, metadata{usuario_id, visitor_id}` | `{ output }` |

Códigos HTTP: `200/201` éxito, `400` datos inválidos, `401` sesión inválida o credenciales incorrectas, `403` usuario inactivo o Telegram sin vincular, `404` no encontrado, `409` conflicto (duplicado, evento no publicado o ya realizado).

## 6. Estados utilizados

| Entidad | Estados |
|---|---|
| Usuario | `ACTIVO`, `INACTIVO` |
| Sesión | `ACTIVA`, `CERRADA`, `EXPIRADA` |
| Código de vinculación | `PENDIENTE`, `USADO`, `EXPIRADO`, `CANCELADO` |
| Vinculación Telegram | `ACTIVA`, `INACTIVA` |
| Evento (Sheets) | `BORRADOR`, `PUBLICADO`, `CERRADO`, `CANCELADO` |
| Evento (vista web, calculado) | `DISPONIBLE`, `PROXIMO` (≤ 7 días), `AGOTADO`, `CERRADO`, `CANCELADO` |
| Inscripción | `CONFIRMADA`, `LISTA_ESPERA`, `CANCELADA`, `ASISTIO` |
| Check-in (resultado) | `EXITOSO`, `RECHAZADO`, `DUPLICADO` |
| Recordatorio | `PENDIENTE`, `ENVIADO`, `ERROR`, `OMITIDO` |
| Canal de notificación | `PENDIENTE`, `ENVIADO`, `ERROR`, `NO_APLICA` |
| Conversación | `ABIERTA`, `CERRADA` |
| Rol de mensaje | `USER`, `ASSISTANT`, `SYSTEM` |

Los eventos en `BORRADOR` no se publican en el catálogo. Un evento `PUBLICADO` cuya fecha ya pasó se muestra como `CERRADO` y no admite inscripciones.

## 7. Hashing de contraseñas

En WF01, el Code Node **Generar hash, salt y usuario_id**:

1. Genera un **salt** aleatorio de 16 bytes con `crypto.randomBytes`.
2. Calcula **PBKDF2-SHA256** con 100 000 iteraciones: `crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256')`.
3. Guarda en Sheets solo `password_hash` y `password_salt` (hex). La contraseña nunca se almacena ni se devuelve.

En WF02 el login recalcula el hash con el salt guardado y lo compara con `crypto.timingSafeEqual` (comparación en tiempo constante). El correo se normaliza (minúsculas, sin espacios) en `email_normalizado`.

## 8. Manejo de sesiones

- **Login** genera un `session_token` aleatorio de 32 bytes y registra la sesión `ACTIVA` con `expira_en` = ahora + 8 horas.
- El frontend guarda el token en `localStorage` y lo envía en cada operación protegida.
- Al abrir la web se llama a `validate`, que actualiza `ultima_validacion`.
- Una sesión **no es válida** si no existe, está `CERRADA`, está vencida (se marca `EXPIRADA`) o pertenece a un usuario `INACTIVO`. Esta misma regla se aplica en WF01, WF03 y WF06.
- **Logout** marca la sesión `CERRADA` y registra `cerrada_en`.

## 9. Idempotencia

| Dónde | Clave | Comportamiento |
|---|---|---|
| WF01 registro | `email_normalizado` | Un correo solo puede tener una cuenta (409). |
| WF03 vinculación | `codigo` + estado | Un código `USADO` o vencido no vuelve a vincular. |
| WF06 inscripción | `usuario_id + evento_id` | No pueden existir dos inscripciones activas (`CONFIRMADA`/`LISTA_ESPERA`). Se responde 409 con la inscripción existente. |
| WF07 reasignación | estado `LISTA_ESPERA` | Solo se promueven inscripciones que siguen en espera; tras promoverlas cambian de estado. |
| WF08 recordatorios | `usuario_id|evento_id|tipo_recordatorio` | Si ya hay un recordatorio `ENVIADO`/`OMITIDO` con esa clave, no se repite. |
| WF11 check-in | `inscripcion_id` + `resultado = EXITOSO` en Checkins | Una inscripción no puede tener dos check-ins exitosos (409 `DUPLICADO`). |
| WF09 notificaciones | `clave_idempotencia` (ej. `INSCRIPCION_CONFIRMADA|INS-...`) | Si ya se envió por algún canal, no se reenvía. |

## 10. Lista de espera y reasignación

- Al inscribirse (WF06) se calculan los cupos: **capacidad − inscripciones CONFIRMADAS o ASISTIO**. Nunca se usa un contador manual.
- Si hay cupo → `CONFIRMADA`. Si no → `LISTA_ESPERA` con `orden_espera`.
- Al cancelar una inscripción confirmada se libera el cupo.
- **WF07** se ejecuta cada 5 minutos. Para cada evento `PUBLICADO` y futuro, calcula los cupos libres y promueve a los usuarios en espera **ordenados por `fecha_inscripcion` ASC**. Ejemplo: 2 cupos libres y 5 en espera → los 2 más antiguos pasan a `CONFIRMADA` y los otros 3 siguen esperando.
- Cada promoción se registra en `EP07_Reasignaciones` (con el resultado de Gmail y Telegram) y en `Auditoria_Inscripciones`, y se notifica al usuario.

## 11. Servicio central de notificaciones

**WF09** es el único workflow que envía mensajes a los usuarios. Lo invocan WF04, WF06, WF07, WF08 y WF11 con *Execute Sub-workflow* y recibe:

```json
{ "usuario_id": "", "tipo": "", "titulo": "", "mensaje": "", "evento_id": "", "inscripcion_id": "", "clave_idempotencia": "" }
```

1. Busca el correo del usuario (EP01) y su `chat_id` activo (EP03).
2. Revisa la idempotencia en `EP09_Notificaciones`.
3. Envía por **Gmail** y luego por **Telegram**. Ambos nodos tienen *On Error → Continue*, así que una falla en un canal no oculta el resultado del otro.
4. Registra una fila con `gmail_estado`/`gmail_error` y `telegram_estado`/`telegram_error` por separado (`ENVIADO`, `ERROR` o `NO_APLICA`).

Tipos de notificación: `INSCRIPCION_CONFIRMADA`, `LISTA_ESPERA`, `INSCRIPCION_CANCELADA`, `REASIGNACION_CUPO`, `RECORDATORIO_72H`, `RECORDATORIO_24H`, `EVENTO_CANCELADO`, `CHECKIN_EXITOSO`.

## 12. Asistente IA y sus restricciones

**WF10** usa un **Chat Trigger** público y el modelo **Google Gemini**.

- **Contexto de solo lectura:** antes de cada respuesta lee eventos e inscripciones (solo para calcular cupos) y arma un catálogo resumido. No tiene ningún nodo que escriba en Usuarios, Sesiones, Eventos ni Inscripciones.
- **Reglas del prompt:** responde en español sobre eventos, categorías, fechas, lugares, lista de espera, estados y vinculación con Telegram. **No puede** crear usuarios, iniciar sesión, inscribir, cancelar, modificar eventos, cambiar cupos ni estados; si se lo piden, explica cómo hacerlo en la web. No inventa datos que no estén en el catálogo.
- **Identificación:** el frontend envía un `sessionId` por ventana de chat y `metadata` con `usuario_id` (si hay sesión) y `visitor_id` (anónimo persistente).
- **Persistencia:** `conversation_id = CONV-{sessionId}`. La hoja *Conversaciones* guarda inicio, última interacción y estado. La hoja *Mensajes* guarda cada mensaje con `rol` (`USER`/`ASSISTANT`). Filtrando *Mensajes* por `conversation_id` se reconstruye la conversación completa. Los últimos 10 mensajes se usan como historial para la IA.

## 13. Variables de entorno

Archivo [`.env.example`](.env.example):

| Variable | Descripción |
|---|---|
| `VITE_N8N_BASE_URL` | URL base de los webhooks de producción de n8n, ej. `https://tu-n8n/webhook`. Vacía = Modo Demostración. |
| `VITE_N8N_CHAT_URL` | URL del Chat Trigger del WF10 (termina en `/chat`). |
| `VITE_TELEGRAM_BOT_USERNAME` | Usuario del bot de Telegram, sin @. |

Los secretos (token de Telegram, API Key de Gemini, OAuth de Google) **solo** están en las credenciales de n8n, nunca en el repositorio.

## 14. Ejecutar el proyecto

Requisitos: Node.js 18 o superior.

```bash
npm install
cp .env.example .env      # y completa las URLs de n8n
npm run dev               # http://localhost:3000
npm run build             # compilación para producción (carpeta dist)
```

Backend (resumen; detalle en la [guía](docs/GUIA_CONFIGURACION.md)):

1. Crear las credenciales de Google en n8n e importar y ejecutar **WF00** (`POST /webhook/ep/setup-hojas`), que crea los 11 Google Sheets con datos de prueba y devuelve sus IDs. Alternativa: `docs/crear_hojas_eventpass.gs` en Google Apps Script.
2. Crear las credenciales en n8n (Google Sheets, Gmail, Telegram, Gemini, Basic Auth).
3. `cp n8n/config.example.json n8n/config.json`, completar IDs y ejecutar `node n8n/generar_workflows.mjs`.
4. Importar los JSON de `n8n/` en n8n y activarlos.

**Despliegue en Vercel:** framework Vite, build `npm run build`, salida `dist`, y las tres variables `VITE_*` en *Environment Variables*.

## 15. Estructura del repositorio

```
/
├── src/                       código del frontend (React + TypeScript)
│   ├── services/n8nClient.ts  único punto de comunicación con n8n
│   ├── components/            vistas y modales
│   └── types/                 tipos compartidos
├── public/images/             imágenes de los eventos
├── n8n/
│   ├── WF01…WF11_*.json       workflows descargados de n8n (entrega)
│   ├── WF00_crear_google_sheets.json  workflow adicional: crea los 11 Google Sheets
│   ├── generar_workflows.mjs  generador de los workflows (Node.js)
│   ├── importar_workflows.mjs importa y activa workflows por la API de n8n
│   ├── exportar_workflows.mjs descarga los workflows de n8n con los nombres de la entrega
│   └── config.example.json    IDs de hojas y credenciales para el generador
├── docs/
│   ├── GUIA_CONFIGURACION.md  configuración paso a paso
│   └── crear_hojas_eventpass.gs  alternativa en Apps Script para crear las hojas
├── .env.example
└── README.md
```

## 16. Examen — Check-in digital

### Descripción

EventPass controla el **ingreso real** de los asistentes. En la pestaña **Check-in** de la web, el personal de acceso escribe el `inscripcion_id` y el `evento_id`, o pega el contenido del QR del pase (`EVENTPASS|INS-...|EVT-...|USR-...|ESTADO`), y pulsa *Registrar ingreso*. El frontend envía la petición por HTTP al nuevo workflow **WF11 — Check-in digital** ([`n8n/WF11_checkin_digital.json`](n8n/WF11_checkin_digital.json)). WF11 valida, registra el intento, cambia la inscripción a `ASISTIO` y notifica al usuario reutilizando **WF09**.

La interfaz muestra el resultado con un color distinto para cada caso: verde **EXITOSO** ("Check-in realizado correctamente."), ámbar **DUPLICADO** ("El ingreso ya había sido registrado.") y rojo **RECHAZADO**, junto con el motivo. Debajo aparecen los datos del asistente, el evento, el `checkin_id` y la fecha y hora. Los intentos anteriores de la sesión se listan debajo.

### Endpoint

| Método y ruta | Trigger | Cliente |
|---|---|---|
| `POST {VITE_N8N_BASE_URL}/ep/checkin` | Webhook (`responseMode: responseNode`) | `n8nApi.checkIn()` en [`src/services/n8nClient.ts`](src/services/n8nClient.ts) |

### Petición

```json
{ "inscripcion_id": "INS-MVPXJD2VJP7T", "evento_id": "EVT-EDU-06" }
```

Los dos campos son obligatorios. Se comparan sin distinguir mayúsculas de minúsculas y sin espacios alrededor.

### Respuesta

Todas las respuestas tienen el formato común de EventPass (`success`, `data`, `error`/`message`). `data.resultado` indica qué ocurrió:

```json
// 200 — EXITOSO
{
  "success": true,
  "message": "Check-in realizado correctamente.",
  "data": {
    "resultado": "EXITOSO", "checkin_id": "CHK-MVTJF05MRTYK",
    "inscripcion_id": "INS-DEMO-01", "evento_id": "EVT-CULT-02", "usuario_id": "USR-DEMO-01",
    "asistente": "Asistente Demo 1", "evento_nombre": "Festival Iberoamericano de Jazz & Artes Sonoras",
    "fecha_checkin": "2026-10-29T12:46:34.378Z", "estado_inscripcion": "ASISTIO",
    "detalle": "Ingreso registrado: CONFIRMADA → ASISTIO"
  }
}

// 409 — DUPLICADO (data.checkin_id es el del check-in exitoso original)
{ "success": false, "error": "El ingreso ya había sido registrado el 29 de octubre a las 07:46 (check-in CHK-MVTJF05MRTYK).",
  "data": { "resultado": "DUPLICADO", "checkin_id": "CHK-MVTJF05MRTYK", "estado_inscripcion": "ASISTIO", "...": "..." } }

// 404 / 409 / 400 — RECHAZADO
{ "success": false, "error": "La inscripción INS-DEMO-02 pertenece al evento EVT-CULT-02, no a EVT-TECH-01.",
  "data": { "resultado": "RECHAZADO", "estado_inscripcion": "CONFIRMADA", "...": "..." } }
```

| Resultado | HTTP | Casos |
|---|---|---|
| `EXITOSO` | 200 | Inscripción `CONFIRMADA`, evento correcto, sin check-in previo. |
| `DUPLICADO` | 409 | Ya existe un check-in `EXITOSO` para la inscripción, o la inscripción ya está en `ASISTIO`. |
| `RECHAZADO` | 400 | Falta `inscripcion_id` o `evento_id`. |
| `RECHAZADO` | 404 | La inscripción no existe, o el evento no existe. |
| `RECHAZADO` | 409 | La inscripción es de otro evento; está en `LISTA_ESPERA`, `CANCELADA` u otro estado que no sea `CONFIRMADA`; o el evento está `CANCELADO`. |

### Validaciones implementadas (nodos de WF11)

```
Webhook → Leer inscripción (EP06) → Leer evento (EP04) → Leer historial de check-in (EP11)
→ Validar existencia → Validar correspondencia inscripción-evento → Validar duplicado → Validar estado
→ Generar checkin_id → IF ¿Check-in exitoso?
    ├─ sí → Actualizar inscripción a ASISTIO (EP06) → Auditoría inscripciones (EP06) ─┐
    └─ no ──────────────────────────────────────────────────────────────────────────┴→ Registrar check-in (EP11)
→ Respond to Webhook → IF ¿Requiere notificación? → Datos de notificación → Execute Sub-workflow (WF09)
```

1. **Validar existencia:** llegan los dos campos, la inscripción existe en `EP06_Inscripciones` y el evento existe en `EP04_Eventos`.
2. **Validar correspondencia inscripción-evento:** el `evento_id` de la inscripción coincide con el enviado.
3. **Validar duplicado:** no hay un check-in `EXITOSO` previo para esa inscripción en `EP11_Checkin`.
4. **Validar estado:** la inscripción está `CONFIRMADA` (`LISTA_ESPERA`, `CANCELADA` o cualquier otro estado se rechaza) y el evento no está `CANCELADO`.

Cada nodo de validación recibe el resultado del anterior. Si ya hay un rechazo, lo deja pasar sin cambios, así que se responde y se registra el **primer** motivo encontrado. La validación de duplicado va antes que la de estado: después de un check-in exitoso la inscripción queda en `ASISTIO`, y un segundo intento debe responder `DUPLICADO`, no `RECHAZADO`.

### Google Sheets: `EP11_Checkin`

Es un archivo nuevo e independiente: el historial de ingresos **no** se guarda en el archivo de inscripciones. Se creó con WF00, que ahora incluye `EP11_Checkin` y acepta `{"archivos": ["EP11_Checkin"]}` para crear solo ese archivo. Su ID está en `sheets.EP11_Checkin` de `n8n/config.json`. También se puede crear con `docs/crear_hojas_eventpass.gs`.

Hoja **Checkins** (se escribe una fila por **cada intento**, sea cual sea el resultado):

| Columna | Contenido |
|---|---|
| `checkin_id` | `CHK-...`, generado en el nodo *Generar checkin_id*. |
| `inscripcion_id` | Inscripción enviada. |
| `evento_id` | Evento enviado. |
| `usuario_id` | Dueño de la inscripción (vacío si la inscripción no existe). |
| `fecha_checkin` | Fecha y hora ISO 8601 del intento. |
| `resultado` | `EXITOSO`, `RECHAZADO` o `DUPLICADO`. |
| `detalle` | Motivo legible, por ejemplo `Ingreso registrado: CONFIRMADA → ASISTIO` o `La inscripción está en LISTA DE ESPERA...`. |

### Cambio de estado `CONFIRMADA → ASISTIO`

En un check-in exitoso, el nodo *Actualizar inscripción a ASISTIO* hace un `update` en `EP06_Inscripciones` **por `inscripcion_id`**. Solo cambia la fila de esa inscripción: el resto de columnas se conserva y se actualiza `fecha_actualizacion`. Además se agrega una fila en `Auditoria_Inscripciones` con `accion = CHECKIN`, `estado_anterior = CONFIRMADA` y `estado_nuevo = ASISTIO`.

Para que `ASISTIO` no rompiera el resto del sistema:

- **Cupos (WF05, WF06, WF07, WF10):** una inscripción en `ASISTIO` sigue ocupando su cupo, porque los cupos se calculan como *capacidad − (CONFIRMADA + ASISTIO)*. Así, un check-in no "libera" un lugar y WF07 no promueve a nadie de la lista de espera por error.
- **WF06:** una inscripción en `ASISTIO` no se puede cancelar (409) y sigue contando como inscripción activa para evitar una segunda inscripción al mismo evento.
- **WF08:** solo envía recordatorios a inscripciones `CONFIRMADA`, así que quien ya ingresó no recibe más recordatorios.
- **Frontend:** *Mis Inscripciones* y el pase digital muestran el estado **ASISTIÓ** y ocultan el botón de cancelar.

### Mecanismo contra check-in duplicado

- Antes de registrar, WF11 lee **todo el historial** de `EP11_Checkin` y busca una fila con la misma `inscripcion_id` y `resultado = EXITOSO`. Como respaldo, también trata como duplicado una inscripción que ya esté en `ASISTIO`.
- Si es duplicado, **no** se ejecuta la rama de actualización: el estado no se vuelve a modificar, no se notifica de nuevo y solo se registra el intento con `resultado = DUPLICADO`. La respuesta devuelve el `checkin_id` y la fecha del ingreso original.
- WF09 también protege la notificación con `clave_idempotencia = CHECKIN|{inscripcion_id}`.

### Integración con WF09 Notificaciones

WF11 **no** tiene nodos de Gmail ni de Telegram. Solo en el caso exitoso, después de responder al frontend, llama con *Execute Sub-workflow* al servicio central **WF09**:

```json
{ "usuario_id": "USR-...", "tipo": "CHECKIN_EXITOSO", "titulo": "Ingreso registrado: <evento>",
  "mensaje": "¡Te damos la bienvenida, <nombre>! Registramos tu ingreso a \"<evento>\". Fecha y hora de ingreso: ... Check-in: CHK-...",
  "evento_id": "EVT-...", "inscripcion_id": "INS-...", "clave_idempotencia": "CHECKIN|INS-..." }
```

WF09 busca el correo y el `chat_id` del usuario, envía el mensaje por **Gmail + Telegram** y lo registra en `EP09_Notificaciones` con el resultado de cada canal.

### Pruebas realizadas

| Caso | Petición | Resultado |
|---|---|---|
| 1 — Check-in válido | `INS-DEMO-01` + `EVT-CULT-02` (CONFIRMADA) | 200 `EXITOSO`, inscripción en `ASISTIO`, fila en Checkins y WF09 ejecutado |
| 2 — Duplicado | la misma petición otra vez | 409 `DUPLICADO`, estado sin cambios |
| 3 — Inscripción no válida | inscripción `CANCELADA` o `LISTA_ESPERA` | 409 `RECHAZADO` (probado ejecutando el código del nodo *Validar estado* con datos simulados, porque las hojas no tenían inscripciones en esos estados) |
| 4 — Evento incorrecto | `INS-DEMO-02` (de `EVT-CULT-02`) + `EVT-TECH-01` | 409 `RECHAZADO` |
| Inscripción inexistente | `INS-NOEXISTE` | 404 `RECHAZADO` |
| Evento inexistente | `EVT-NOPE` | 404 `RECHAZADO` |

En **Modo Demostración** (sin `VITE_N8N_BASE_URL`), `n8nApi.checkIn()` aplica las mismas validaciones sobre los datos locales.
