# Guía de configuración de EventPass

Esta guía va en orden. Cada paso deja listo algo que el siguiente necesita. Tiempo aproximado: 1 a 2 horas.

| Paso | Qué obtienes |
|---|---|
| 1. Node.js | Poder ejecutar el generador y la web |
| 2. Bot de Telegram | Token del bot y su nombre de usuario |
| 3. Google Sheets | Los 10 archivos EP01–EP10 y sus IDs |
| 4. Gemini | API Key de Google AI Studio |
| 5. Credenciales en n8n | IDs de credenciales para los workflows |
| 6. Generar e importar workflows | WF01–WF10 funcionando en n8n |
| 7. Frontend local | La web conectada a n8n |
| 8. Vercel | URL pública |
| 9. Prueba completa | Verificación de todo el flujo |
| 10. Exportar para la entrega | JSON finales en `n8n/` |

---

## 1. Instalar Node.js

En Linux con `nvm` (ya está instalado en tu equipo):

```bash
nvm install 20
nvm use 20
node -v   # debe mostrar v20.x
```

## 2. Crear el bot de Telegram

1. En Telegram abre **@BotFather** y envía `/newbot`.
2. Escribe un nombre (ej. `EventPass Notificaciones`) y un usuario terminado en `bot` (ej. `EventPassMarianBot`).
3. BotFather te entrega un **token** como `7123456789:AAH...`. Guárdalo: **es secreto, nunca lo subas a GitHub**.
4. Anota el usuario del bot **sin @**: lo usarás en `n8n/config.json` y en `.env`.

## 3. Crear los 10 Google Sheets

> **Forma recomendada:** primero crea la credencial de Google Sheets (paso 5), luego importa `n8n/WF00_crear_google_sheets.json`, actívalo y llama una vez a `POST https://TU-N8N/webhook/ep/setup-hojas`. Crea los 10 archivos con datos de prueba y responde con sus IDs. Después desactiva WF00.
>
> **Alternativa con Google Apps Script:**

1. Entra a <https://script.google.com> con la cuenta de Google que usarás en n8n.
2. **Nuevo proyecto** → borra lo que haya → pega el contenido de [`crear_hojas_eventpass.gs`](crear_hojas_eventpass.gs) → **Guardar**.
3. Elige la función `crearHojasEventPass` y pulsa **Ejecutar**. Acepta los permisos (Avanzado → Ir a proyecto).
4. Abre **Registro de ejecución**. Copia el bloque JSON con los 10 IDs.

El script crea la carpeta **"EventPass - Google Sheets"** en tu Drive con:

- Las hojas y columnas exactas que pide el enunciado (más `telefono`, `ciudad`, `organizacion`, `notif_email`, `notif_telegram` en Usuarios y `motivo_cancelacion` en Inscripciones).
- 7 eventos de prueba en 4 categorías: uno con cupos, uno **lleno** (3 cupos ocupados), uno **próximo** (en 2 días), uno **cancelado**, uno **cerrado**, otro con cupos y un **borrador** que no debe verse en la web.

> Las celdas quedan en formato *texto sin formato* para que Sheets no convierta fechas ni códigos. Si agregas filas a mano, escribe las fechas como `2026-11-15` y las horas como `18:30`.

## 4. API Key de Gemini

1. Entra a <https://aistudio.google.com/apikey>.
2. **Create API key** → cópiala. Es secreta.

## 5. Credenciales en n8n

En n8n: **Overview → Credentials → Create credential**. Crea estas cinco:

| Credencial (tipo en n8n) | Cómo se configura |
|---|---|
| **Google Sheets OAuth2 API** | En n8n Cloud: botón *Sign in with Google*. En n8n propio: cliente OAuth de Google Cloud con las APIs de Sheets y Drive activas. |
| **Gmail OAuth2 API** | Igual que la anterior, con la API de Gmail activa. Usa la cuenta desde la que se enviarán los correos. |
| **Telegram API** | Pega el token de BotFather. |
| **Google Gemini(PaLM) API** | Pega la API Key de AI Studio. Host: `https://generativelanguage.googleapis.com`. |
| **Basic Auth** | Usuario y contraseña del administrador. Protege el formulario del WF04. |

Abre cada credencial: el número al final de la URL (`.../credentials/AbCd1234`) es su **ID**.

### Si usas n8n local (con túnel)

Arranca el backend con `bash ~/iniciar-n8n.sh`. El script abre un túnel HTTPS de Cloudflare, arranca n8n con esa URL pública y la escribe en `.env`. La URL **cambia cada vez** que reinicias el script.

En n8n local no existe el botón *Sign in with Google*: Google Sheets y Gmail necesitan tu propio cliente OAuth.

1. Entra a <https://console.cloud.google.com> → crea un proyecto `EventPass`.
2. **APIs y servicios → Biblioteca**: habilita **Google Sheets API**, **Google Drive API** y **Gmail API**.
3. **Pantalla de consentimiento OAuth**: tipo *Externo*, nombre `EventPass`, tu correo. En **Usuarios de prueba** agrega tu propio correo.
4. **Credenciales → Crear credenciales → ID de cliente OAuth** → tipo *Aplicación web*.
5. En n8n abre la credencial *Google Sheets OAuth2 API*, copia el **OAuth Redirect URL** que muestra y pégalo en *URIs de redireccionamiento autorizados* de Google Cloud.
6. Copia el *Client ID* y el *Client Secret* de Google a la credencial de n8n → **Sign in with Google**.
7. Repite los pasos 5 y 6 para *Gmail OAuth2 API* (puede ser el mismo cliente OAuth).

### Permitir el módulo `crypto` en los Code Nodes

WF01, WF02 y WF03 usan `require('crypto')` para el hash de contraseñas y los tokens.

- **n8n Cloud:** normalmente ya está permitido. Si al probar aparece `Cannot find module 'crypto'`, escribe al soporte de n8n o usa n8n propio.
- **n8n propio (Docker/npm):** agrega la variable de entorno `NODE_FUNCTION_ALLOW_BUILTIN=crypto` y reinicia n8n.

### Zona horaria

En n8n: **Settings → Timezone** = `America/Bogota` (o la de `config.json`). Los recordatorios y el cierre de eventos dependen de ella.

## 6. Generar e importar los workflows

### 6.1 Completar la configuración

```bash
cp n8n/config.example.json n8n/config.json
```

Edita `n8n/config.json`:

- `sheets`: pega el bloque de IDs del paso 3.
- `credentials`: pon el `id` de cada credencial del paso 5.
- `telegram_bot_username`: el usuario del bot sin @.
- `wf09_id`: déjalo vacío por ahora.

### 6.2 Generar e importar WF09 primero

```bash
node n8n/generar_workflows.mjs
```

Los archivos quedan en `n8n/generados/`. En n8n: **Add workflow → ⋯ → Import from File** → `n8n/generados/WF09_notificaciones.json` → **Save**.
Copia el ID del workflow de la URL (`.../workflow/XyZ123`) y ponlo en `wf09_id` de `config.json`.

### 6.3 Regenerar e importar el resto

```bash
node n8n/generar_workflows.mjs
```

Importa WF01 a WF08 y WF10 de la misma forma. Abre cada uno, revisa que ningún nodo muestre advertencia de credenciales y guarda.

### 6.4 Activar

Activa (toggle **Active** / **Publish**) **todos** los workflows, empezando por **WF09**: n8n no deja publicar un workflow que llame a un sub-workflow sin publicar.

Con n8n local también puedes hacerlo en un solo comando con la API de n8n (crea la clave en *Settings → n8n API* y guárdala en `~/.n8n_api_key`):

```bash
node n8n/importar_workflows.mjs WF09_notificaciones.json
node n8n/importar_workflows.mjs
```

Las URLs de producción quedan así (reemplaza tu dominio):

```
POST https://TU-N8N/webhook/ep/usuarios
POST https://TU-N8N/webhook/ep/auth
POST https://TU-N8N/webhook/ep/telegram
GET  https://TU-N8N/webhook/ep/catalogo
POST https://TU-N8N/webhook/ep/inscripciones
POST https://TU-N8N/webhook/<id>/chat          ← WF10, cópiala del nodo "Chat Trigger"
     https://TU-N8N/form/<id>                   ← WF04, cópiala del nodo "Formulario de administración"
```

Prueba rápida del catálogo en el navegador: abre `https://TU-N8N/webhook/ep/catalogo`. Debes ver un JSON con 6 eventos (el borrador no aparece).

> **Telegram Trigger:** un bot solo admite un webhook. No actives otro workflow con Telegram Trigger para el mismo bot, o dejará de llegar el `/vincular`.

## 7. Frontend local

```bash
cp .env.example .env
```

Completa `.env`:

```env
VITE_N8N_BASE_URL="https://TU-N8N/webhook"
VITE_N8N_CHAT_URL="https://TU-N8N/webhook/<id>/chat"
VITE_TELEGRAM_BOT_USERNAME="TuBot"
```

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>.

## 8. Publicar en Vercel

1. Sube el repositorio a GitHub (sin `.env`: ya está en `.gitignore`).
2. En <https://vercel.com> → **Add New → Project** → importa el repositorio.
3. Framework: **Vite**. Build: `npm run build`. Output: `dist`.
4. En **Environment Variables** agrega `VITE_N8N_BASE_URL`, `VITE_N8N_CHAT_URL` y `VITE_TELEGRAM_BOT_USERNAME`.
5. **Deploy**. Copia la URL pública en el README.

> Si cambias una variable en Vercel, vuelve a desplegar: Vite las incrusta al compilar.

## 9. Prueba completa (guion para la sustentación)

1. **Catálogo:** la página de inicio carga los eventos desde n8n. En `EP05_Catalogo_Log` aparece una fila `LISTADO`.
2. **Registro:** crea una cuenta. En `EP01_Usuarios` aparece con `password_hash`, `password_salt` y estado `ACTIVO`. Intenta registrar el mismo correo: error "Ya existe una cuenta".
3. **Sesión:** en `EP02_Sesiones` aparece una sesión `ACTIVA`. Cierra sesión: pasa a `CERRADA`.
4. **Telegram:** Perfil → Vincular Telegram → **Nuevo código** → envía `/vincular CODIGO` al bot → el bot responde ✅ → **Verificar vinculación**. Reenvía el mismo código: el bot responde que ya fue usado.
5. **Inscripción confirmada:** inscríbete en un evento con cupos. Llegan correo y mensaje de Telegram. Revisa `EP06_Inscripciones` y `EP09_Notificaciones`.
6. **Idempotencia:** intenta inscribirte otra vez al mismo evento: error 409.
7. **Lista de espera:** inscríbete en el *Festival de Jazz* (lleno): quedas en `LISTA_ESPERA`.
8. **Reasignación:** en `EP06_Inscripciones` cambia una de las inscripciones `INS-DEMO` del jazz a `CANCELADA`. En máximo 5 minutos WF07 te promueve a `CONFIRMADA`, te notifica y registra la fila en `EP07_Reasignaciones`.
9. **Recordatorio:** inscríbete en la *Masterclass* (es en 2 días). En máximo 1 hora WF08 envía el recordatorio 72H y lo registra en `EP08_Recordatorios`, sin repetirlo.
10. **Administración:** abre el formulario del WF04, crea un evento con estado `PUBLICADO` y míralo aparecer en la web. Luego haz `CANCEL`: los inscritos reciben aviso.
11. **Asistente:** pregunta "¿qué eventos tienen cupo?" y "inscríbeme al bootcamp". La segunda debe explicar que no puede hacerlo. Revisa `EP10_Soporte`.

## 10. Exportar los workflows para la entrega

El enunciado pide los JSON **descargados de tu instancia de n8n**. Con la clave de la API de n8n en `~/.n8n_api_key`, un solo comando los descarga todos con los nombres correctos:

```bash
node n8n/exportar_workflows.mjs
```

O a mano, desde el editor:

1. Abre cada workflow → **⋯ → Download**.
2. Guarda cada archivo en `n8n/` con su nombre obligatorio, reemplazando el generado:

```
WF01_usuarios_crud.json            WF06_inscripciones_crud.json
WF02_auth_sesiones.json            WF07_reasignacion_lista_espera.json
WF03_vinculacion_telegram.json     WF08_recordatorios.json
WF04_eventos_crud.json             WF09_notificaciones.json
WF05_catalogo_publico.json         WF10_eventpass_assistant.json
```

Los JSON exportados solo contienen el *ID* de las credenciales, no los tokens ni las claves.

---

## Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| La web dice "No se pudo conectar con el servidor de n8n" | El workflow no está activo, la URL de `.env` está mal o falta `/webhook` al final. Prueba la URL del catálogo en el navegador. |
| Error de CORS en la consola del navegador | Verifica que el nodo Webhook tenga *Allowed Origins (CORS)* = `*` (ya viene así) y que el workflow esté **activo**. Las URLs `webhook-test` solo funcionan con el editor abierto. |
| `Cannot find module 'crypto'` o `is not allowed` | Falta `NODE_FUNCTION_ALLOW_BUILTIN=crypto` (n8n propio). |
| Un nodo de Google Sheets dice que no encuentra la columna | El encabezado de la hoja no coincide. Vuelve a crear las hojas con el script del paso 3. |
| El bot no responde al `/vincular` | El WF03 no está activo, el token es incorrecto o la URL de n8n no es HTTPS (Telegram exige HTTPS). |
| En `EP09_Notificaciones` aparece `gmail_estado = ERROR` | Revisa la credencial de Gmail. El error exacto queda en la columna `gmail_error`. Telegram se registra aparte. |
| "Debes vincular tu cuenta de Telegram antes de inscribirte" | Es una regla del enunciado (WF06). Vincula Telegram primero. |
| El asistente responde "no está disponible" | `VITE_N8N_CHAT_URL` vacía o incorrecta, WF10 inactivo o credencial de Gemini inválida. |
