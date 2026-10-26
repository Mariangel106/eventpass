#!/usr/bin/env node
/**
 * EventPass - Generador de workflows de n8n (WF01 a WF10).
 *
 * Uso:
 *   cp n8n/config.example.json n8n/config.json   # completa IDs de hojas y credenciales
 *   node n8n/generar_workflows.mjs
 *
 * Genera n8n/WF01_usuarios_crud.json ... n8n/WF10_eventpass_assistant.json, listos para
 * importar en n8n (Workflows -> Import from File).
 *
 * El código de cada Code Node se escribe aquí como una función normal de JavaScript y el
 * generador copia su cuerpo al JSON. Los marcadores __CFG_x__ y __COLS_Hoja__ se reemplazan
 * por valores de config.json y por la lista de columnas de la hoja.
 */
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = dirname(fileURLToPath(import.meta.url));
let configPath = join(BASE, 'config.json');
if (!existsSync(configPath)) {
  configPath = join(BASE, 'config.example.json');
  console.log('Aviso: no existe n8n/config.json, se usa config.example.json (con marcadores).');
}
const CFG = JSON.parse(readFileSync(configPath, 'utf-8'));

// ---------------------------------------------------------------------------
// Columnas de cada hoja (deben coincidir con docs/crear_hojas_eventpass.gs)
// ---------------------------------------------------------------------------
const COLS = {
  Usuarios: ['usuario_id', 'nombre', 'email_normalizado', 'password_hash', 'password_salt', 'estado',
    'fecha_registro', 'fecha_actualizacion', 'telefono', 'ciudad', 'organizacion', 'notif_email', 'notif_telegram'],
  Auditoria_Usuarios: ['auditoria_id', 'usuario_id', 'accion', 'fecha', 'resultado', 'detalle'],
  Sesiones: ['session_id', 'usuario_id', 'session_token', 'creada_en', 'expira_en', 'estado', 'cerrada_en',
    'ultima_validacion'],
  Codigos_Vinculacion: ['codigo_id', 'usuario_id', 'codigo', 'creado_en', 'expira_en', 'estado', 'usado_en'],
  Vinculaciones: ['vinculacion_id', 'usuario_id', 'chat_id', 'telegram_username', 'fecha_vinculacion', 'estado'],
  Eventos: ['evento_id', 'nombre', 'categoria', 'descripcion', 'fecha', 'hora', 'lugar', 'capacidad', 'imagen_url',
    'organizador', 'estado', 'fecha_creacion', 'fecha_actualizacion'],
  Auditoria_Eventos: ['auditoria_id', 'evento_id', 'accion', 'fecha', 'resultado', 'detalle'],
  Consultas_Catalogo: ['consulta_id', 'fecha', 'tipo', 'evento_id', 'categoria', 'resultado_count', 'visitor_id',
    'status_http'],
  Inscripciones: ['inscripcion_id', 'usuario_id', 'evento_id', 'estado', 'fecha_inscripcion', 'fecha_actualizacion',
    'nombre_acreditacion', 'observaciones', 'origen', 'orden_espera', 'motivo_cancelacion'],
  Auditoria_Inscripciones: ['auditoria_id', 'inscripcion_id', 'usuario_id', 'evento_id', 'accion', 'estado_anterior',
    'estado_nuevo', 'fecha', 'resultado', 'detalle'],
  Reasignaciones: ['reasignacion_id', 'evento_id', 'inscripcion_id', 'usuario_id', 'fecha', 'orden_lista',
    'estado_anterior', 'estado_nuevo', 'resultado_notificacion'],
  Recordatorios: ['recordatorio_id', 'usuario_id', 'evento_id', 'inscripcion_id', 'tipo_recordatorio',
    'fecha_programada', 'fecha_envio', 'estado', 'clave_idempotencia'],
  Notificaciones: ['notificacion_id', 'usuario_id', 'tipo', 'titulo', 'mensaje', 'evento_id', 'inscripcion_id', 'fecha',
    'gmail_estado', 'telegram_estado', 'gmail_error', 'telegram_error', 'clave_idempotencia'],
  Conversaciones: ['conversation_id', 'usuario_id', 'visitor_id', 'fecha_inicio', 'fecha_ultima_interaccion', 'estado'],
  Mensajes: ['message_id', 'conversation_id', 'usuario_id', 'visitor_id', 'rol', 'mensaje', 'timestamp']
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
/** Devuelve el cuerpo de una función como texto, sin sangría común y con marcadores reemplazados. */
function cuerpo(fn) {
  const src = fn.toString();
  const lineas = src.slice(src.indexOf('{') + 1, src.lastIndexOf('}')).split('\n');
  const sangria = Math.min(...lineas.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return reemplazar(lineas.map((l) => l.slice(sangria)).join('\n').trim());
}

function reemplazar(texto) {
  return texto
    .replace(/__COLS_ALL__/g, () => JSON.stringify(COLS))
    .replace(/__COLS_(\w+)__/g, (_, hoja) => JSON.stringify(COLS[hoja]))
    .replace(/__CFG_(\w+)__/g, (_, clave) => String(CFG[clave]));
}

const js = (...fns) => fns.map(cuerpo).join('\n\n');

const sheetDoc = (key) => ({ __rl: true, mode: 'id', value: CFG.sheets[key] || `REEMPLAZAR_ID_${key}` });
const sheetTab = (name) => ({ __rl: true, mode: 'name', value: name });

// Google Sheets limita a 60 lecturas/escrituras por minuto por usuario: si responde
// "Quota exceeded" el nodo reintenta en vez de fallar la petición completa.
const REINTENTOS = { retryOnFail: true, maxTries: 5, waitBetweenTries: 5000 };

function creds(kind, credType) {
  const c = CFG.credentials[kind] || {};
  return c.id ? { credentials: { [credType]: { id: c.id, name: c.name || kind } } } : {};
}

class Workflow {
  constructor(name) {
    this.name = name;
    this.nodes = [];
    this.conns = {};
  }

  add(name, type, typeVersion, parameters, [x, y], extra = {}) {
    if (extra.webhookId === true) {
      // Mismo id en cada generación: así no cambian las URLs del chat (WF10), del formulario (WF04) ni de Telegram
      const h = createHash('sha1').update(`${this.name}/${name}`).digest('hex');
      extra = { ...extra, webhookId: `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}` };
    }
    this.nodes.push({ parameters, id: randomUUID(), name, type, typeVersion, position: [x * 240, y * 180], ...extra });
    return name;
  }

  connect(src, dst, out = 0, kind = 'main') {
    const outs = ((this.conns[src] ??= {})[kind] ??= []);
    while (outs.length <= out) outs.push([]);
    outs[out].push({ node: dst, type: kind, index: 0 });
  }

  chain(...names) {
    names.slice(1).forEach((n, i) => this.connect(names[i], n));
  }

  toJSON() {
    return {
      name: this.name, nodes: this.nodes, connections: this.conns, active: false,
      settings: { executionOrder: 'v1', timezone: CFG.timezone }, pinData: {},
      meta: { templateCredsSetupCompleted: false }
    };
  }

  // ----- nodos frecuentes -----
  webhook(name, path, pos, method = 'POST') {
    return this.add(name, 'n8n-nodes-base.webhook', 2,
      { httpMethod: method, path, responseMode: 'responseNode', options: { allowedOrigins: '*' } },
      pos, { webhookId: true });
  }

  code(name, source, pos) {
    return this.add(name, 'n8n-nodes-base.code', 2, { jsCode: source.trim() + '\n' }, pos);
  }

  read(name, doc, tab, pos, once = true) {
    const extra = { alwaysOutputData: true, ...(once ? { executeOnce: true } : {}) };
    return this.add(name, 'n8n-nodes-base.googleSheets', 4.5,
      { operation: 'read', documentId: sheetDoc(doc), sheetName: sheetTab(tab), options: {} },
      pos, { ...extra, ...REINTENTOS, ...creds('googleSheets', 'googleSheetsOAuth2Api') });
  }

  write(name, operation, doc, tab, pos, match) {
    const columns = {
      mappingMode: 'autoMapInputData', value: {}, matchingColumns: match ? [match] : [],
      schema: (COLS[tab] || []).map((c) => ({
        id: c, displayName: c, required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true
      }))
    };
    const parameters = { operation, documentId: sheetDoc(doc), sheetName: sheetTab(tab), columns,
      options: { cellFormat: 'RAW' } };
    if (match) parameters.columnToMatchOn = match;
    return this.add(name, 'n8n-nodes-base.googleSheets', 4.5, parameters, pos,
      { ...REINTENTOS, ...creds('googleSheets', 'googleSheetsOAuth2Api') });
  }

  /** Code que entrega exactamente las columnas de la hoja + nodo de Google Sheets que la escribe. */
  rowWriter(label, expr, operation, doc, tab, [x, y], match) {
    const fila = this.code(`Fila: ${label}`,
      `const COLS = ${JSON.stringify(COLS[tab])};\n` +
      'const pick = (o) => Object.fromEntries(COLS.map((c) => [c, o?.[c] ?? \'\']));\n' +
      `const data = ${reemplazar(expr)};\n` +
      'return (Array.isArray(data) ? data : [data]).map((r) => ({ json: pick(r) }));',
      [x, y]);
    const hoja = this.write(label, operation, doc, tab, [x + 1, y], match);
    this.connect(fila, hoja);
    return [fila, hoja];
  }

  switch(name, routes, pos) {
    const values = routes.map((r) => ({
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{ id: randomUUID(), leftValue: '={{ $json.route }}', rightValue: r,
          operator: { type: 'string', operation: 'equals' } }],
        combinator: 'and'
      },
      renameOutput: true, outputKey: r
    }));
    return this.add(name, 'n8n-nodes-base.switch', 3,
      { rules: { values }, options: { fallbackOutput: 'extra', renameFallbackOutput: 'otro' } }, pos);
  }

  ifTrue(name, expr, pos) {
    return this.add(name, 'n8n-nodes-base.if', 2, {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ id: randomUUID(), leftValue: expr, rightValue: '',
          operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      },
      looseTypeValidation: true, options: {}
    }, pos);
  }

  respond(name, source, pos) {
    return this.add(name, 'n8n-nodes-base.respondToWebhook', 1.1, {
      respondWith: 'json',
      responseBody: `={{ JSON.stringify($('${source}').first().json.body) }}`,
      options: { responseCode: `={{ $('${source}').first().json.status }}` }
    }, pos);
  }

  notify(name, pos) {
    return this.add(name, 'n8n-nodes-base.executeWorkflow', 1.2, {
      workflowId: { __rl: true, mode: 'id', value: CFG.wf09_id || 'REEMPLAZAR_ID_WF09' },
      mode: 'each', options: { waitForSubWorkflow: true }
    }, pos);
  }

  save(filename) {
    writeFileSync(join(BASE, filename), JSON.stringify(this.toJSON(), null, 2) + '\n', 'utf-8');
    console.log(`  ✓ ${filename} (${this.nodes.length} nodos)`);
  }
}

// ===========================================================================
// Fragmentos compartidos por los Code Nodes (se copian al inicio de cada uno)
// ===========================================================================
/* eslint-disable no-undef */
function BASE_JS() {
  const TZ = '__CFG_timezone__';
  const ahora = new Date().toISOString();
  const norm = (s) => String(s ?? '').trim();
  const genId = (p) => `${p}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const rows = (nodo, clave) => $(nodo).all().map((i) => i.json).filter((r) => r && norm(r[clave]) !== '');
  const inicioEvento = (e) => DateTime.fromISO(`${norm(e.fecha)}T${(norm(e.hora) || '00:00').padStart(5, '0')}`, { zone: TZ });
  const fechaLegible = (e) => { const d = inicioEvento(e); return d.isValid ? d.setLocale('es').toFormat("d 'de' LLLL, yyyy") : norm(e.fecha); };
}

function SESION_JS() {
  // Una sesión es válida solo si existe, está ACTIVA, no expiró y su usuario está ACTIVO.
  function validarSesion(token, sesiones, usuarios) {
    const s = sesiones.find((x) => norm(x.session_token) === norm(token));
    if (!norm(token) || !s) return { ok: false, status: 401, error: 'Sesión no encontrada. Inicia sesión nuevamente.' };
    if (s.estado !== 'ACTIVA') return { ok: false, status: 401, error: `La sesión está ${String(s.estado).toLowerCase()}. Inicia sesión nuevamente.` };
    if (new Date(s.expira_en) < new Date()) return { ok: false, status: 401, error: 'La sesión expiró. Inicia sesión nuevamente.' };
    const u = usuarios.find((x) => x.usuario_id === s.usuario_id);
    if (!u || u.estado !== 'ACTIVO') return { ok: false, status: 403, error: 'El usuario no existe o está INACTIVO.' };
    return { ok: true, sesion: s, usuario: u };
  }
}

function PERFIL_JS() {
  // Perfil público (sin hash ni salt) en el formato que espera el frontend.
  function perfil(u, vinculaciones) {
    const v = vinculaciones.find((x) => x.usuario_id === u.usuario_id && x.estado === 'ACTIVA');
    return {
      usuario_id: u.usuario_id, name: u.nombre, email: u.email_normalizado, phone: u.telefono || '',
      city: u.ciudad || '', organization: u.organizacion || '', estado: u.estado,
      telegramLinked: Boolean(v), telegramUsername: v ? v.telegram_username : undefined,
      notificationEmail: u.notif_email !== 'NO', notificationTelegram: u.notif_telegram !== 'NO'
    };
  }
}

function EVENTO_FRONT_JS() {
  // Cupos = capacidad - inscripciones CONFIRMADAS (nunca un valor manual)
  function conteos(inscripciones) {
    const c = {}, w = {};
    for (const i of inscripciones) {
      if (i.estado === 'CONFIRMADA') c[i.evento_id] = (c[i.evento_id] || 0) + 1;
      if (i.estado === 'LISTA_ESPERA') w[i.evento_id] = (w[i.evento_id] || 0) + 1;
    }
    return { confirmadas: c, espera: w };
  }
  function eventoFront(e, cnt) {
    const capacidad = Number(e.capacidad) || 0;
    const confirmadas = cnt.confirmadas[e.evento_id] || 0;
    const libres = Math.max(0, capacidad - confirmadas);
    const inicio = inicioEvento(e);
    const dias = inicio.isValid ? Math.ceil(inicio.diff(DateTime.now(), 'days').days) : null;
    const finalizado = inicio.isValid && inicio < DateTime.now();
    let status;
    if (e.estado === 'CANCELADO') status = 'CANCELADO';
    else if (e.estado === 'CERRADO' || finalizado) status = 'CERRADO';
    else if (libres === 0) status = 'AGOTADO';
    else if (dias !== null && dias <= 7) status = 'PROXIMO';
    else status = 'DISPONIBLE';
    const desc = norm(e.descripcion);
    return {
      id: e.evento_id, slug: e.evento_id, title: e.nombre, category: e.categoria,
      shortDescription: desc.length > 150 ? desc.slice(0, 147) + '...' : desc, description: desc,
      date: fechaLegible(e), isoDate: norm(e.fecha), time: norm(e.hora), location: e.lugar, venueType: 'Presencial',
      organizer: e.organizador, totalCapacity: capacidad, registeredCount: confirmadas, availableSpots: libres,
      waitlistCount: cnt.espera[e.evento_id] || 0, daysUntil: dias, status,
      cancellationReason: e.estado === 'CANCELADO' ? 'Evento cancelado por el organizador.'
        : status === 'CERRADO' ? 'Inscripciones cerradas.' : undefined,
      imageUrl: e.imagen_url, tags: [e.categoria], priceText: 'Entrada gratuita con inscripción previa'
    };
  }
}

// ===========================================================================
// WF01 — Usuarios CRUD
// ===========================================================================
function wf01() {
  const wf = new Workflow('WF01 - Usuarios CRUD');
  const wh = wf.webhook('Webhook', 'ep/usuarios', [0, 1]);
  const r1 = wf.read('Leer Usuarios', 'EP01_Usuarios', 'Usuarios', [1, 1], false);
  const r2 = wf.read('Leer Sesiones', 'EP02_Sesiones', 'Sesiones', [2, 1]);
  const r3 = wf.read('Leer Vinculaciones', 'EP03_Telegram', 'Vinculaciones', [3, 1]);

  const val = wf.code('Validar solicitud', js(BASE_JS, SESION_JS, function () {
    const body = $('Webhook').first().json.body || {};
    const action = norm(body.action).toLowerCase();
    const usuarios = rows('Leer Usuarios', 'usuario_id');
    const sesiones = rows('Leer Sesiones', 'session_token');
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const COLS = __COLS_Usuarios__;
    const pick = (o) => Object.fromEntries(COLS.map((c) => [c, o?.[c] ?? '']));
    const fail = (status, error, usuario_id = '') => [{ json: { ok: false, route: 'responder', action, status, error, usuario_id } }];
    const siNo = (v, actual) => (v === undefined ? (actual || 'SI') : (v === true || v === 'true' || v === 'SI' ? 'SI' : 'NO'));

    if (action === 'create') {
      const nombre = norm(body.nombre);
      const email = norm(body.email).toLowerCase();
      const password = String(body.password ?? '');
      if (!nombre) return fail(400, 'El nombre es obligatorio.');
      if (!emailRx.test(email)) return fail(400, 'El correo electrónico no es válido.');
      if (password.length < 6) return fail(400, 'La contraseña debe tener al menos 6 caracteres.');
      // Control de email duplicado
      if (usuarios.some((u) => norm(u.email_normalizado).toLowerCase() === email)) {
        return fail(409, 'Ya existe una cuenta registrada con ese correo.');
      }
      return [{ json: { ok: true, route: 'crear', action, nombre, email, password,
        telefono: norm(body.telefono), ciudad: norm(body.ciudad), organizacion: norm(body.organizacion) } }];
    }

    const ses = validarSesion(body.session_token, sesiones, usuarios);
    if (!ses.ok) return fail(ses.status, ses.error);
    const u = ses.usuario;

    if (action === 'get') return [{ json: { ok: true, route: 'responder', action, usuario: pick(u) } }];

    if (action === 'update') {
      const email = body.email !== undefined ? norm(body.email).toLowerCase() : u.email_normalizado;
      if (!emailRx.test(email)) return fail(400, 'El correo electrónico no es válido.', u.usuario_id);
      if (usuarios.some((x) => norm(x.email_normalizado).toLowerCase() === email && x.usuario_id !== u.usuario_id)) {
        return fail(409, 'Ese correo ya pertenece a otra cuenta.', u.usuario_id);
      }
      const campo = (k, actual) => (body[k] !== undefined ? norm(body[k]) : (actual || ''));
      const row = { ...pick(u),
        nombre: norm(body.nombre) || u.nombre,
        email_normalizado: email,
        telefono: campo('telefono', u.telefono),
        ciudad: campo('ciudad', u.ciudad),
        organizacion: campo('organizacion', u.organizacion),
        notif_email: siNo(body.notificationEmail, u.notif_email),
        notif_telegram: siNo(body.notificationTelegram, u.notif_telegram),
        fecha_actualizacion: ahora };
      return [{ json: { ok: true, route: 'actualizar', action, row } }];
    }

    if (action === 'deactivate') {
      // Borrado lógico: la cuenta pasa a INACTIVO y sus sesiones dejan de ser válidas
      const row = { ...pick(u), estado: 'INACTIVO', fecha_actualizacion: ahora };
      return [{ json: { ok: true, route: 'actualizar', action, row } }];
    }

    return fail(400, 'Acción no soportada. Usa create, get, update o deactivate.');
  }), [4, 1]);

  const sw = wf.switch('Enrutar operación', ['crear', 'actualizar'], [5, 1]);

  const hash = wf.code('Generar hash, salt y usuario_id', cuerpo(function () {
    const crypto = require('crypto');
    const d = $input.first().json;
    const ahora = new Date().toISOString();
    // PBKDF2-SHA256 con salt aleatorio de 16 bytes y 100.000 iteraciones
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(d.password, salt, 100000, 32, 'sha256').toString('hex');
    const usuario_id = `USR-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    return [{ json: {
      usuario_id, nombre: d.nombre, email_normalizado: d.email, password_hash: hash, password_salt: salt,
      estado: 'ACTIVO', fecha_registro: ahora, fecha_actualizacion: ahora,
      telefono: d.telefono, ciudad: d.ciudad, organizacion: d.organizacion, notif_email: 'SI', notif_telegram: 'SI'
    } }];
  }), [6, 0]);
  const crear = wf.write('Crear usuario', 'append', 'EP01_Usuarios', 'Usuarios', [7, 0]);
  const [filaUpd, upd] = wf.rowWriter('Actualizar usuario', "$('Validar solicitud').first().json.row", 'update',
    'EP01_Usuarios', 'Usuarios', [6, 1], 'usuario_id');

  const resp = wf.code('Construir respuesta', js(BASE_JS, PERFIL_JS, function () {
    const v = $('Validar solicitud').first().json;
    const vinculaciones = rows('Leer Vinculaciones', 'usuario_id');
    const mensajes = { create: 'Cuenta creada correctamente.', get: 'Perfil consultado.',
      update: 'Perfil actualizado correctamente.', deactivate: 'La cuenta fue desactivada.' };
    let status, body, usuario_id = v.usuario_id || '', resultado, detalle;
    if (!v.ok) {
      status = v.status; body = { success: false, error: v.error }; resultado = 'ERROR'; detalle = v.error;
    } else {
      const u = v.route === 'crear' ? $('Generar hash, salt y usuario_id').first().json
        : v.route === 'actualizar' ? v.row : v.usuario;
      status = v.route === 'crear' ? 201 : 200;
      body = { success: true, data: perfil(u, vinculaciones), message: mensajes[v.action] };
      usuario_id = u.usuario_id; resultado = 'OK'; detalle = mensajes[v.action];
    }
    const audit = { auditoria_id: genId('AUD'), usuario_id, accion: (v.action || 'desconocida').toUpperCase(),
      fecha: ahora, resultado, detalle };
    return [{ json: { status, body, audit } }];
  }), [8, 1]);
  const [filaAud, aud] = wf.rowWriter('Auditoría usuarios', "$('Construir respuesta').first().json.audit", 'append',
    'EP01_Usuarios', 'Auditoria_Usuarios', [9, 1]);
  const out = wf.respond('Responder', 'Construir respuesta', [11, 1]);

  wf.chain(wh, r1, r2, r3, val, sw);
  wf.connect(sw, hash, 0);
  wf.connect(sw, filaUpd, 1);
  wf.connect(sw, resp, 2);
  wf.chain(hash, crear, resp);
  wf.connect(upd, resp);
  wf.connect(resp, filaAud);
  wf.connect(aud, out);
  wf.save('WF01_usuarios_crud.json');
}

// ===========================================================================
// WF02 — Autenticación y sesiones
// ===========================================================================
function wf02() {
  const wf = new Workflow('WF02 - Autenticación y sesiones');
  const wh = wf.webhook('Webhook', 'ep/auth', [0, 1]);
  const r1 = wf.read('Leer Usuarios', 'EP01_Usuarios', 'Usuarios', [1, 1], false);
  const r2 = wf.read('Leer Sesiones', 'EP02_Sesiones', 'Sesiones', [2, 1]);
  const r3 = wf.read('Leer Vinculaciones', 'EP03_Telegram', 'Vinculaciones', [3, 1]);

  const proc = wf.code('Verificar password y sesión', js(BASE_JS, PERFIL_JS, function () {
    const crypto = require('crypto');
    const HORAS_SESION = __CFG_session_hours__;
    const body = $('Webhook').first().json.body || {};
    const action = norm(body.action).toLowerCase();
    const usuarios = rows('Leer Usuarios', 'usuario_id');
    const sesiones = rows('Leer Sesiones', 'session_token');
    const vinculaciones = rows('Leer Vinculaciones', 'usuario_id');
    const COLS = __COLS_Sesiones__;
    const pick = (o) => Object.fromEntries(COLS.map((c) => [c, o?.[c] ?? '']));
    const out = (route, status, payload, row) => [{ json: { route, status, body: payload, row } }];
    const fail = (status, error) => out('responder', status, { success: false, error });

    if (action === 'login') {
      const email = norm(body.email).toLowerCase();
      const password = String(body.password ?? '');
      const u = usuarios.find((x) => norm(x.email_normalizado).toLowerCase() === email);
      if (!u || !password) return fail(401, 'Correo o contraseña incorrectos.');
      // Verificación: se recalcula PBKDF2 con el salt guardado y se compara en tiempo constante
      const calculado = crypto.pbkdf2Sync(password, String(u.password_salt), 100000, 32, 'sha256');
      const guardado = Buffer.from(String(u.password_hash), 'hex');
      if (guardado.length !== calculado.length || !crypto.timingSafeEqual(guardado, calculado)) {
        return fail(401, 'Correo o contraseña incorrectos.');
      }
      if (u.estado !== 'ACTIVO') return fail(403, 'La cuenta está INACTIVA.');
      const token = crypto.randomBytes(32).toString('hex');
      const expira = new Date(Date.now() + HORAS_SESION * 3600 * 1000).toISOString();
      const row = { session_id: genId('SES'), usuario_id: u.usuario_id, session_token: token, creada_en: ahora,
        expira_en: expira, estado: 'ACTIVA', cerrada_en: '', ultima_validacion: ahora };
      return out('crear_sesion', 200, { success: true, message: `Bienvenido, ${u.nombre}.`,
        data: { token, expiresAt: expira, profile: perfil(u, vinculaciones) } }, row);
    }

    const token = norm(body.session_token);
    const s = sesiones.find((x) => norm(x.session_token) === token);
    if (!token || !s) return fail(401, 'Sesión no encontrada.');
    const u = usuarios.find((x) => x.usuario_id === s.usuario_id);
    const base = pick(s);

    if (action === 'logout') {
      if (s.estado !== 'ACTIVA') return out('responder', 200, { success: true, message: 'La sesión ya estaba cerrada.' });
      return out('actualizar_sesion', 200, { success: true, message: 'Sesión cerrada correctamente.' },
        { ...base, estado: 'CERRADA', cerrada_en: ahora, ultima_validacion: ahora });
    }

    if (action === 'validate') {
      if (s.estado !== 'ACTIVA') return fail(401, `La sesión está ${String(s.estado).toLowerCase()}.`);
      if (new Date(s.expira_en) < new Date()) {
        return out('actualizar_sesion', 401, { success: false, error: 'La sesión expiró. Inicia sesión nuevamente.' },
          { ...base, estado: 'EXPIRADA', ultima_validacion: ahora });
      }
      if (!u || u.estado !== 'ACTIVO') {
        return out('actualizar_sesion', 403, { success: false, error: 'El usuario está INACTIVO.' },
          { ...base, estado: 'CERRADA', cerrada_en: ahora, ultima_validacion: ahora });
      }
      return out('actualizar_sesion', 200, { success: true, data: { expiresAt: s.expira_en, profile: perfil(u, vinculaciones) } },
        { ...base, ultima_validacion: ahora });
    }

    return fail(400, 'Acción no soportada. Usa login, logout o validate.');
  }), [4, 1]);

  const sw = wf.switch('Resultado de autenticación', ['crear_sesion', 'actualizar_sesion'], [5, 1]);
  const [f1, w1] = wf.rowWriter('Registrar sesión', "$('Verificar password y sesión').first().json.row", 'append',
    'EP02_Sesiones', 'Sesiones', [6, 0]);
  const [f2, w2] = wf.rowWriter('Actualizar sesión', "$('Verificar password y sesión').first().json.row", 'update',
    'EP02_Sesiones', 'Sesiones', [6, 1], 'session_id');
  const out = wf.respond('Responder', 'Verificar password y sesión', [8, 1]);

  wf.chain(wh, r1, r2, r3, proc, sw);
  wf.connect(sw, f1, 0);
  wf.connect(sw, f2, 1);
  wf.connect(sw, out, 2);
  wf.connect(w1, out);
  wf.connect(w2, out);
  wf.save('WF02_auth_sesiones.json');
}

// ===========================================================================
// WF03 — Vinculación con Telegram (Webhook + Telegram Trigger)
// ===========================================================================
function wf03() {
  const wf = new Workflow('WF03 - Vinculación con Telegram');

  // --- Parte A: la web solicita código / consulta estado / desvincula ---
  const wh = wf.webhook('Webhook', 'ep/telegram', [0, 1]);
  const a1 = wf.read('Leer Sesiones', 'EP02_Sesiones', 'Sesiones', [1, 1], false);
  const a2 = wf.read('Leer Usuarios', 'EP01_Usuarios', 'Usuarios', [2, 1]);
  const a3 = wf.read('Leer Códigos', 'EP03_Telegram', 'Codigos_Vinculacion', [3, 1]);
  const a4 = wf.read('Leer Vinculaciones', 'EP03_Telegram', 'Vinculaciones', [4, 1]);

  const proc = wf.code('Validar sesión y generar código', js(BASE_JS, SESION_JS, function () {
    const crypto = require('crypto');
    const BOT = '__CFG_telegram_bot_username__';
    const MINUTOS = __CFG_telegram_code_minutes__;
    const body = $('Webhook').first().json.body || {};
    const action = norm(body.action).toLowerCase();
    const sesiones = rows('Leer Sesiones', 'session_token');
    const usuarios = rows('Leer Usuarios', 'usuario_id');
    const codigos = rows('Leer Códigos', 'codigo_id');
    const vinculaciones = rows('Leer Vinculaciones', 'vinculacion_id');
    const VCOLS = __COLS_Vinculaciones__;
    const out = (route, status, payload, row) => [{ json: { route, status, body: payload, row } }];

    const ses = validarSesion(body.session_token, sesiones, usuarios);
    if (!ses.ok) return out('responder', ses.status, { success: false, error: ses.error });
    const u = ses.usuario;
    const vinc = vinculaciones.find((x) => x.usuario_id === u.usuario_id && x.estado === 'ACTIVA');

    if (action === 'status') {
      return out('responder', 200, { success: true, data: { linked: Boolean(vinc),
        telegramUsername: vinc ? vinc.telegram_username : null, botUser: BOT } });
    }

    if (action === 'code') {
      if (vinc) return out('responder', 409, { success: false, error: 'Tu cuenta ya tiene Telegram vinculado.' });
      const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const usados = new Set(codigos.map((c) => norm(c.codigo).toUpperCase()));
      let codigo;
      do {
        codigo = Array.from({ length: 6 }, () => alfabeto[crypto.randomInt(alfabeto.length)]).join('');
      } while (usados.has(codigo));
      const expira = new Date(Date.now() + MINUTOS * 60 * 1000).toISOString();
      const row = { codigo_id: genId('COD'), usuario_id: u.usuario_id, codigo, creado_en: ahora,
        expira_en: expira, estado: 'PENDIENTE', usado_en: '' };
      return out('generar', 201, { success: true, data: { code: codigo, botUser: BOT, expiresAt: expira },
        message: `Envía /vincular ${codigo} al bot @${BOT}. Vence en ${MINUTOS} minutos.` }, row);
    }

    if (action === 'unlink') {
      if (!vinc) return out('responder', 404, { success: false, error: 'No tienes una vinculación activa.' });
      const row = { ...Object.fromEntries(VCOLS.map((c) => [c, vinc[c] ?? ''])), estado: 'INACTIVA' };
      return out('desvincular', 200, { success: true, message: 'Telegram desvinculado.' }, row);
    }

    return out('responder', 400, { success: false, error: 'Acción no soportada. Usa code, status o unlink.' });
  }), [5, 1]);

  const sw = wf.switch('Enrutar solicitud', ['generar', 'desvincular'], [6, 1]);
  const [fa1, wa1] = wf.rowWriter('Guardar código', "$('Validar sesión y generar código').first().json.row", 'append',
    'EP03_Telegram', 'Codigos_Vinculacion', [7, 0]);
  const [fa2, wa2] = wf.rowWriter('Desactivar vinculación', "$('Validar sesión y generar código').first().json.row",
    'update', 'EP03_Telegram', 'Vinculaciones', [7, 1], 'vinculacion_id');
  const resp = wf.respond('Responder', 'Validar sesión y generar código', [9, 1]);
  wf.chain(wh, a1, a2, a3, a4, proc, sw);
  wf.connect(sw, fa1, 0);
  wf.connect(sw, fa2, 1);
  wf.connect(sw, resp, 2);
  wf.connect(wa1, resp);
  wf.connect(wa2, resp);

  // --- Parte B: el usuario envía /vincular CODIGO al bot ---
  const tg = wf.add('Telegram Trigger', 'n8n-nodes-base.telegramTrigger', 1.1,
    { updates: ['message'], additionalFields: {} }, [0, 4],
    { webhookId: true, ...creds('telegram', 'telegramApi') });

  const ext = wf.code('Extraer código', cuerpo(function () {
    const m = $input.first().json.message || {};
    const texto = String(m.text || '').trim();
    const match = texto.match(/^\/vincular(?:@\w+)?\s+([A-Za-z0-9-]+)/i);
    return [{ json: {
      chat_id: String(m.chat?.id ?? ''),
      username: m.from?.username || m.from?.first_name || '',
      texto,
      codigo: match ? match[1].toUpperCase() : ''
    } }];
  }), [1, 4]);
  const b1 = wf.read('Leer Códigos (bot)', 'EP03_Telegram', 'Codigos_Vinculacion', [2, 4]);
  const b2 = wf.read('Leer Vinculaciones (bot)', 'EP03_Telegram', 'Vinculaciones', [3, 4]);

  const vb = wf.code('Validar código y vigencia', js(BASE_JS, function () {
    const d = $('Extraer código').first().json;
    const codigos = rows('Leer Códigos (bot)', 'codigo_id');
    const vinculaciones = rows('Leer Vinculaciones (bot)', 'vinculacion_id');
    const CCOLS = __COLS_Codigos_Vinculacion__;
    const pickC = (o) => Object.fromEntries(CCOLS.map((c) => [c, o?.[c] ?? '']));
    const r = (route, reply, extra = {}) => [{ json: { route, reply, ...extra } }];

    if (!d.codigo) {
      return r('responder', d.texto.toLowerCase().startsWith('/vincular')
        ? 'Formato incorrecto. Envía: /vincular CODIGO'
        : '👋 Hola, soy el bot de EventPass. Genera tu código en la web (Perfil → Telegram) y envíame: /vincular CODIGO');
    }
    const c = codigos.find((x) => norm(x.codigo).toUpperCase() === d.codigo);
    if (!c) return r('responder', '❌ Ese código no existe. Genera uno nuevo en EventPass.');
    if (c.estado === 'USADO') return r('responder', '⚠️ Este código ya fue utilizado. Cada código sirve una sola vez.');
    if (c.estado !== 'PENDIENTE') return r('responder', `⚠️ Este código ya no es válido (${c.estado}). Genera uno nuevo.`);
    if (new Date(c.expira_en) < new Date()) {
      return r('expirar', '⌛ El código expiró. Genera uno nuevo en EventPass.', { codigoRow: { ...pickC(c), estado: 'EXPIRADO' } });
    }
    const previa = vinculaciones.find((x) => x.usuario_id === c.usuario_id);
    return r('vincular', '✅ ¡Cuenta vinculada! Aquí recibirás confirmaciones, avisos de lista de espera y recordatorios de EventPass.', {
      codigoRow: { ...pickC(c), estado: 'USADO', usado_en: ahora },
      vincRow: { vinculacion_id: previa?.vinculacion_id || genId('VIN'), usuario_id: c.usuario_id, chat_id: d.chat_id,
        telegram_username: d.username, fecha_vinculacion: ahora, estado: 'ACTIVA' }
    });
  }), [4, 4]);

  const swb = wf.switch('Resultado de validación', ['vincular', 'expirar'], [5, 4]);
  const [fb1, wb1] = wf.rowWriter('Marcar código usado', "$('Validar código y vigencia').first().json.codigoRow",
    'update', 'EP03_Telegram', 'Codigos_Vinculacion', [6, 3], 'codigo_id');
  const [fb2, wb2] = wf.rowWriter('Guardar vinculación', "$('Validar código y vigencia').first().json.vincRow",
    'appendOrUpdate', 'EP03_Telegram', 'Vinculaciones', [8, 3], 'usuario_id');
  const [fb3, wb3] = wf.rowWriter('Marcar código expirado', "$('Validar código y vigencia').first().json.codigoRow",
    'update', 'EP03_Telegram', 'Codigos_Vinculacion', [6, 4], 'codigo_id');
  const reply = wf.add('Responder en Telegram', 'n8n-nodes-base.telegram', 1.2, {
    chatId: "={{ $('Extraer código').first().json.chat_id }}",
    text: "={{ $('Validar código y vigencia').first().json.reply }}",
    additionalFields: { appendAttribution: false }
  }, [10, 4], creds('telegram', 'telegramApi'));

  wf.chain(tg, ext, b1, b2, vb, swb);
  wf.connect(swb, fb1, 0);
  wf.connect(swb, fb3, 1);
  wf.connect(swb, reply, 2);
  wf.connect(wb1, fb2);
  wf.connect(wb2, reply);
  wf.connect(wb3, reply);
  wf.save('WF03_vinculacion_telegram.json');
}

// ===========================================================================
// WF04 — Administración CRUD de eventos (n8n Form Trigger)
// ===========================================================================
function wf04() {
  const wf = new Workflow('WF04 - Administración de eventos');
  const SIN = '(sin cambio)';
  const field = (fieldLabel, fieldType, requiredField = false, placeholder, options) => ({
    fieldLabel, requiredField,
    ...(fieldType ? { fieldType } : {}),
    ...(placeholder ? { placeholder } : {}),
    ...(options ? { fieldOptions: { values: options.map((option) => ({ option })) } } : {})
  });
  const fields = [
    field('accion', 'dropdown', true, null, ['CREATE', 'READ', 'UPDATE', 'CANCEL', 'CLOSE']),
    field('evento_id', null, false, 'Obligatorio para READ, UPDATE, CANCEL y CLOSE (ej. EVT-...)'),
    field('nombre', null, false, 'Nombre del evento'),
    field('categoria', 'dropdown', false, null, [SIN, 'Tecnología', 'Educación', 'Cultura', 'Deportes']),
    field('descripcion', 'textarea', false, 'Descripción completa'),
    field('fecha', 'date'),
    field('hora', null, false, 'HH:MM (24 h), ej. 18:30'),
    field('lugar', null, false, 'Sede o enlace'),
    field('capacidad', 'number', false, 'Número de cupos'),
    field('imagen_url', null, false, 'URL de imagen (opcional)'),
    field('organizador', null, false, 'Organizador'),
    field('estado', 'dropdown', false, null, [SIN, 'BORRADOR', 'PUBLICADO'])
  ];
  const formCreds = creds('formBasicAuth', 'httpBasicAuth');
  const form = wf.add('Formulario de administración', 'n8n-nodes-base.formTrigger', 2.2, {
    formTitle: 'EventPass · Administración de eventos',
    formDescription: 'Solo administradores. CREATE crea un evento; READ lo consulta; UPDATE cambia solo los campos ' +
      'que llenes; CANCEL y CLOSE aplican borrado lógico.',
    formFields: { values: fields }, responseMode: 'responseNode', options: {},
    ...(formCreds.credentials ? { authentication: 'basicAuth' } : {})
  }, [0, 1], { webhookId: true, ...formCreds });
  const r1 = wf.read('Leer Eventos', 'EP04_Eventos', 'Eventos', [1, 1], false);

  const val = wf.code('Validar formulario', js(BASE_JS, function () {
    const SIN = '(sin cambio)';
    const IMG = '__CFG_imagen_por_defecto__';
    const f = $('Formulario de administración').first().json;
    const eventos = rows('Leer Eventos', 'evento_id');
    const COLS = __COLS_Eventos__;
    const pick = (o) => Object.fromEntries(COLS.map((c) => [c, o?.[c] ?? '']));
    const val = (k) => { const x = norm(f[k]); return x === SIN ? '' : x; };
    const accion = val('accion').toUpperCase();
    const out = (route, ok, mensaje, extra = {}) => [{ json: { route, ok, accion, mensaje, ...extra } }];
    const err = (m, extra) => out('responder', false, m, extra);
    const validarCampos = (row) => {
      const cap = Number(row.capacidad);
      if (!Number.isInteger(cap) || cap <= 0) return 'La capacidad debe ser un entero mayor a 0.';
      if (!/^\d{2}:\d{2}$/.test(row.hora)) return 'La hora debe tener formato HH:MM.';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.fecha)) return 'La fecha debe tener formato AAAA-MM-DD.';
      return '';
    };

    if (accion === 'CREATE') {
      const faltan = ['nombre', 'categoria', 'descripcion', 'fecha', 'hora', 'lugar', 'capacidad', 'organizador'].filter((k) => !val(k));
      if (faltan.length) return err('Faltan campos obligatorios: ' + faltan.join(', '));
      const row = { evento_id: genId('EVT'), nombre: val('nombre'), categoria: val('categoria'), descripcion: val('descripcion'),
        fecha: val('fecha'), hora: val('hora').padStart(5, '0'), lugar: val('lugar'), capacidad: String(Number(val('capacidad'))),
        imagen_url: val('imagen_url') || IMG, organizador: val('organizador'), estado: val('estado') || 'BORRADOR',
        fecha_creacion: ahora, fecha_actualizacion: ahora };
      const problema = validarCampos(row);
      if (problema) return err(problema);
      return out('crear', true, `Evento ${row.evento_id} creado con estado ${row.estado}.`, { row, estado_anterior: '' });
    }

    const id = val('evento_id');
    if (!id) return err('Debes indicar el evento_id para ' + (accion || 'esta acción') + '.');
    const ev = eventos.find((e) => norm(e.evento_id) === id);
    if (!ev) return err(`No existe un evento con id ${id}.`, { evento_id: id });

    if (accion === 'READ') return out('responder', true, 'Consulta de evento.', { evento: pick(ev), evento_id: id });
    if (ev.estado === 'CANCELADO') return err('El evento está CANCELADO y no admite cambios.', { evento_id: id });

    const row = { ...pick(ev), fecha_actualizacion: ahora };
    if (accion === 'UPDATE') {
      for (const k of ['nombre', 'categoria', 'descripcion', 'fecha', 'hora', 'lugar', 'capacidad', 'imagen_url', 'organizador', 'estado']) {
        if (val(k)) row[k] = k === 'capacidad' ? String(Number(val(k))) : k === 'hora' ? val(k).padStart(5, '0') : val(k);
      }
      const problema = validarCampos(row);
      if (problema) return err(problema, { evento_id: id });
    } else if (accion === 'CANCEL') {
      row.estado = 'CANCELADO';
    } else if (accion === 'CLOSE') {
      row.estado = 'CERRADO';
    } else {
      return err('Acción no soportada.', { evento_id: id });
    }
    return out('actualizar', true, `Evento ${id}: ${ev.estado} → ${row.estado} (${accion}).`,
      { row, estado_anterior: ev.estado, notificar: accion === 'CANCEL' });
  }), [2, 1]);

  const sw = wf.switch('Según acción', ['crear', 'actualizar'], [3, 1]);
  const [f1, w1] = wf.rowWriter('Crear evento', "$('Validar formulario').first().json.row", 'append',
    'EP04_Eventos', 'Eventos', [4, 0]);
  const [f2, w2] = wf.rowWriter('Actualizar evento', "$('Validar formulario').first().json.row", 'update',
    'EP04_Eventos', 'Eventos', [4, 1], 'evento_id');
  const [fa, wa] = wf.rowWriter('Auditoría eventos', `(() => {
  const v = $('Validar formulario').first().json;
  return { auditoria_id: \`AUD-\${Date.now().toString(36).toUpperCase()}\`, evento_id: v.row?.evento_id || v.evento_id || '',
    accion: v.accion || 'DESCONOCIDA', fecha: new Date().toISOString(), resultado: v.ok ? 'OK' : 'ERROR', detalle: v.mensaje };
})()`, 'append', 'EP04_Eventos', 'Auditoria_Eventos', [6, 1]);

  const html = "={{ (() => { const v = $('Validar formulario').first().json; const datos = v.row || v.evento; " +
    "return '<html><head><meta charset=\"utf-8\"></head><body style=\"font-family:sans-serif;max-width:640px;margin:40px auto\">' + " +
    "'<h2>' + (v.ok ? '✅ ' : '❌ ') + (v.accion || '') + '</h2><p>' + v.mensaje + '</p>' + " +
    "(datos ? '<pre style=\"background:#f3f4f6;padding:12px;border-radius:8px;white-space:pre-wrap\">' + JSON.stringify(datos, null, 2) + '</pre>' : '') + " +
    "'<p><a href=\"javascript:history.back()\">Volver al formulario</a></p></body></html>'; })() }}";
  const resp = wf.add('Mostrar resultado', 'n8n-nodes-base.respondToWebhook', 1.1, {
    respondWith: 'text', responseBody: html,
    options: { responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }] } }
  }, [8, 1]);

  // Si el evento se cancela: cancelar inscripciones activas y notificar a los inscritos
  const cond = wf.ifTrue('¿Evento cancelado?', "={{ $('Validar formulario').first().json.notificar === true }}", [9, 1]);
  const ri = wf.read('Leer Inscripciones', 'EP06_Inscripciones', 'Inscripciones', [10, 0]);
  const ci = wf.code('Inscripciones a cancelar', cuerpo(function () {
    const ev = $('Validar formulario').first().json.row;
    const ahora = new Date().toISOString();
    const COLS = __COLS_Inscripciones__;
    const activas = $('Leer Inscripciones').all().map((i) => i.json)
      .filter((i) => i.evento_id === ev.evento_id && ['CONFIRMADA', 'LISTA_ESPERA'].includes(i.estado));
    return activas.map((i) => ({ json: { ...Object.fromEntries(COLS.map((c) => [c, i[c] ?? ''])),
      estado: 'CANCELADA', fecha_actualizacion: ahora, orden_espera: '', motivo_cancelacion: 'Evento cancelado por el organizador' } }));
  }), [11, 0]);
  const ui = wf.write('Cancelar inscripciones', 'update', 'EP06_Inscripciones', 'Inscripciones', [12, 0], 'inscripcion_id');
  const dn = wf.code('Datos de notificación', cuerpo(function () {
    const ev = $('Validar formulario').first().json.row;
    return $('Inscripciones a cancelar').all().map((i) => ({ json: {
      usuario_id: i.json.usuario_id, tipo: 'EVENTO_CANCELADO', titulo: `Evento cancelado: ${ev.nombre}`,
      mensaje: `Lamentamos informarte que el evento "${ev.nombre}" programado para el ${ev.fecha} a las ${ev.hora} fue CANCELADO por el organizador. Tu inscripción ${i.json.inscripcion_id} quedó cancelada.`,
      evento_id: ev.evento_id, inscripcion_id: i.json.inscripcion_id,
      clave_idempotencia: `EVENTO_CANCELADO|${i.json.inscripcion_id}`
    } }));
  }), [13, 0]);
  const nt = wf.notify('Notificar (WF09)', [14, 0]);

  wf.chain(form, r1, val, sw);
  wf.connect(sw, f1, 0);
  wf.connect(sw, f2, 1);
  wf.connect(sw, fa, 2);
  wf.connect(w1, fa);
  wf.connect(w2, fa);
  wf.chain(wa, resp, cond);
  wf.connect(cond, ri, 0);
  wf.chain(ri, ci, ui, dn, nt);
  wf.save('WF04_eventos_crud.json');
}

// ===========================================================================
// WF05 — Catálogo público
// ===========================================================================
function wf05() {
  const wf = new Workflow('WF05 - Catálogo público');
  const wh = wf.webhook('Webhook', 'ep/catalogo', [0, 1], 'GET');
  const r1 = wf.read('Leer Eventos', 'EP04_Eventos', 'Eventos', [1, 1], false);
  const r2 = wf.read('Leer Inscripciones', 'EP06_Inscripciones', 'Inscripciones', [2, 1]);
  const fe = wf.code('Filtrar eventos publicables', js(BASE_JS, function () {
    // Solo se publican eventos que no estén en BORRADOR
    const eventos = rows('Leer Eventos', 'evento_id').filter((e) => e.estado !== 'BORRADOR');
    return eventos.map((e) => ({ json: e }));
  }), [3, 1]);
  const ag = wf.code('Calcular cupos (Aggregate)', js(BASE_JS, EVENTO_FRONT_JS, function () {
    const q = $('Webhook').first().json.query || {};
    const eventos = $input.all().map((i) => i.json).filter((e) => e.evento_id);
    const cnt = conteos(rows('Leer Inscripciones', 'inscripcion_id'));
    let tipo, status = 200, body, count;

    if (norm(q.evento_id)) {
      tipo = 'DETALLE';
      const e = eventos.find((x) => x.evento_id === norm(q.evento_id));
      if (!e) { status = 404; count = 0; body = { success: false, error: 'Evento no encontrado.' }; }
      else { count = 1; body = { success: true, data: eventoFront(e, cnt) }; }
    } else {
      let lista = eventos.map((e) => eventoFront(e, cnt));
      tipo = 'LISTADO';
      if (norm(q.categoria) && norm(q.categoria) !== 'Todas') {
        tipo = 'FILTRO';
        lista = lista.filter((e) => e.category === norm(q.categoria));
      }
      if (norm(q.disponibles) === 'true') {
        tipo = 'FILTRO';
        lista = lista.filter((e) => ['DISPONIBLE', 'PROXIMO'].includes(e.status));
      }
      // Primero los eventos abiertos, luego por fecha
      const peso = { DISPONIBLE: 0, PROXIMO: 0, AGOTADO: 1, CERRADO: 2, CANCELADO: 3 };
      lista.sort((a, b) => (peso[a.status] - peso[b.status]) || a.isoDate.localeCompare(b.isoDate));
      count = lista.length;
      body = { success: true, data: lista };
    }
    const log = { consulta_id: genId('CON'), fecha: ahora, tipo, evento_id: norm(q.evento_id), categoria: norm(q.categoria),
      resultado_count: String(count), visitor_id: norm(q.visitor_id) || 'anonimo', status_http: String(status) };
    return [{ json: { status, body, log } }];
  }), [4, 1]);
  const [fl, wl] = wf.rowWriter('Registrar consulta', "$('Calcular cupos (Aggregate)').first().json.log", 'append',
    'EP05_Catalogo_Log', 'Consultas_Catalogo', [5, 1]);
  const out = wf.respond('Responder', 'Calcular cupos (Aggregate)', [7, 1]);
  wf.chain(wh, r1, r2, fe, ag, fl);
  wf.connect(wl, out);
  wf.save('WF05_catalogo_publico.json');
}

// ===========================================================================
// WF06 — Inscripciones CRUD
// ===========================================================================
function wf06() {
  const wf = new Workflow('WF06 - Inscripciones CRUD');
  const wh = wf.webhook('Webhook', 'ep/inscripciones', [0, 1]);
  const r1 = wf.read('Leer Sesiones', 'EP02_Sesiones', 'Sesiones', [1, 1], false);
  const r2 = wf.read('Leer Usuarios', 'EP01_Usuarios', 'Usuarios', [2, 1]);
  const r3 = wf.read('Leer Vinculación Telegram', 'EP03_Telegram', 'Vinculaciones', [3, 1]);
  const r4 = wf.read('Leer Eventos', 'EP04_Eventos', 'Eventos', [4, 1]);
  const r5 = wf.read('Leer Inscripciones', 'EP06_Inscripciones', 'Inscripciones', [5, 1]);

  const val = wf.code('Validar y calcular cupos', js(BASE_JS, SESION_JS, function () {
    const body = $('Webhook').first().json.body || {};
    const action = norm(body.action).toLowerCase();
    const sesiones = rows('Leer Sesiones', 'session_token');
    const usuarios = rows('Leer Usuarios', 'usuario_id');
    const vinculaciones = rows('Leer Vinculación Telegram', 'vinculacion_id');
    const eventos = rows('Leer Eventos', 'evento_id');
    const insc = rows('Leer Inscripciones', 'inscripcion_id');
    const COLS = __COLS_Inscripciones__;
    const pick = (o) => Object.fromEntries(COLS.map((c) => [c, o?.[c] ?? '']));
    const evMap = Object.fromEntries(eventos.map((e) => [e.evento_id, e]));
    const porFecha = (a, b) => norm(a.fecha_inscripcion).localeCompare(norm(b.fecha_inscripcion));

    const auditar = (i, accion, antes, despues, resultado, detalle) => ({ auditoria_id: genId('AUD'),
      inscripcion_id: i?.inscripcion_id || '', usuario_id: i?.usuario_id || '', evento_id: i?.evento_id || norm(body.evento_id),
      accion, estado_anterior: antes, estado_nuevo: despues, fecha: ahora, resultado, detalle });
    const out = (route, status, payload, extra = {}) => [{ json: { route, status, body: payload, ...extra } }];
    const fail = (status, error, audit) => out(audit ? 'auditar' : 'responder', status, { success: false, error }, { audit });

    const ses = validarSesion(body.session_token, sesiones, usuarios);
    if (!ses.ok) return fail(ses.status, ses.error);
    const u = ses.usuario;

    const posicionEspera = (i) => insc.filter((x) => x.evento_id === i.evento_id && x.estado === 'LISTA_ESPERA')
      .sort(porFecha).findIndex((x) => x.inscripcion_id === i.inscripcion_id) + 1;
    const toReg = (i) => {
      const e = evMap[i.evento_id] || {};
      return { id: i.inscripcion_id, ticketCode: i.inscripcion_id, eventId: i.evento_id, eventTitle: e.nombre || i.evento_id,
        eventCategory: e.categoria || '', eventDate: e.fecha ? fechaLegible(e) : '', eventTime: norm(e.hora),
        eventLocation: e.lugar || '', eventImageUrl: e.imagen_url || '', userEmail: u.email_normalizado,
        userName: i.nombre_acreditacion || u.nombre, status: i.estado, registeredAt: i.fecha_inscripcion,
        notes: i.observaciones || (i.estado === 'LISTA_ESPERA' ? `Posición en lista de espera: #${posicionEspera(i)}` : ''),
        cancellationReason: i.motivo_cancelacion || undefined,
        qrPayload: `EVENTPASS|${i.inscripcion_id}|${i.evento_id}|${i.usuario_id}|${i.estado}` };
    };

    if (action === 'list') {
      const data = insc.filter((i) => i.usuario_id === u.usuario_id).sort((a, b) => porFecha(b, a)).map(toReg);
      return out('responder', 200, { success: true, data });
    }

    if (action === 'create') {
      const audit = (m) => auditar({ usuario_id: u.usuario_id, evento_id: norm(body.evento_id) }, 'CREAR', '', '', 'ERROR', m);
      const vinc = vinculaciones.find((x) => x.usuario_id === u.usuario_id && x.estado === 'ACTIVA');
      if (!vinc) {
        const m = 'Debes vincular tu cuenta de Telegram antes de inscribirte (Perfil → Vincular Telegram).';
        return fail(403, m, audit(m));
      }
      const ev = evMap[norm(body.evento_id)];
      if (!ev) return fail(404, 'El evento no existe.', audit('Evento inexistente'));
      if (ev.estado !== 'PUBLICADO') {
        const m = `El evento no admite inscripciones (estado ${ev.estado}).`;
        return fail(409, m, audit(m));
      }
      const inicio = inicioEvento(ev);
      if (inicio.isValid && inicio < DateTime.now()) return fail(409, 'El evento ya se realizó.', audit('Evento finalizado'));

      // Idempotencia: usuario_id + evento_id no puede tener dos inscripciones activas
      const activa = insc.find((i) => i.usuario_id === u.usuario_id && i.evento_id === ev.evento_id && i.estado !== 'CANCELADA');
      if (activa) {
        const m = `Ya tienes una inscripción activa (${activa.estado}) para este evento.`;
        return out('auditar', 409, { success: false, error: m, data: toReg(activa) },
          { audit: auditar(activa, 'CREAR', activa.estado, activa.estado, 'DUPLICADO', m) });
      }

      const confirmadas = insc.filter((i) => i.evento_id === ev.evento_id && i.estado === 'CONFIRMADA').length;
      const enEspera = insc.filter((i) => i.evento_id === ev.evento_id && i.estado === 'LISTA_ESPERA').length;
      const hayCupo = confirmadas < (Number(ev.capacidad) || 0);
      const estado = hayCupo ? 'CONFIRMADA' : 'LISTA_ESPERA';
      const row = { inscripcion_id: genId('INS'), usuario_id: u.usuario_id, evento_id: ev.evento_id, estado,
        fecha_inscripcion: ahora, fecha_actualizacion: ahora, nombre_acreditacion: norm(body.nombre_acreditacion) || u.nombre,
        observaciones: norm(body.observaciones), origen: 'WEB', orden_espera: hayCupo ? '' : String(enEspera + 1), motivo_cancelacion: '' };
      insc.push(row);
      const tipo = hayCupo ? 'INSCRIPCION_CONFIRMADA' : 'LISTA_ESPERA';
      const notif = { usuario_id: u.usuario_id, tipo,
        titulo: hayCupo ? `Inscripción confirmada: ${ev.nombre}` : `Lista de espera: ${ev.nombre}`,
        mensaje: hayCupo
          ? `Tu inscripción a "${ev.nombre}" está CONFIRMADA.\nFecha: ${fechaLegible(ev)} ${ev.hora}\nLugar: ${ev.lugar}\nCódigo: ${row.inscripcion_id}`
          : `El evento "${ev.nombre}" no tiene cupos. Quedaste en LISTA DE ESPERA en la posición #${enEspera + 1}. Te avisaremos si se libera un cupo.`,
        evento_id: ev.evento_id, inscripcion_id: row.inscripcion_id, clave_idempotencia: `${tipo}|${row.inscripcion_id}` };
      return out('crear', 201, { success: true, data: toReg(row),
        message: hayCupo ? '¡Inscripción CONFIRMADA! Te enviamos la confirmación por correo y Telegram.'
          : 'Evento lleno: quedaste en LISTA DE ESPERA. Te avisaremos si se libera un cupo.' },
        { row, notif, audit: auditar(row, 'CREAR', '', estado, 'OK', hayCupo ? 'Cupo asignado' : 'Sin cupo, lista de espera') });
    }

    const propia = insc.find((i) => i.inscripcion_id === norm(body.inscripcion_id) && i.usuario_id === u.usuario_id);
    if (['update', 'cancel'].includes(action) && !propia) return fail(404, 'Inscripción no encontrada.');

    if (action === 'update') {
      if (propia.estado === 'CANCELADA') return fail(409, 'No se puede modificar una inscripción cancelada.');
      const row = { ...pick(propia), fecha_actualizacion: ahora,
        nombre_acreditacion: body.nombre_acreditacion !== undefined ? norm(body.nombre_acreditacion) || u.nombre : propia.nombre_acreditacion,
        observaciones: body.observaciones !== undefined ? norm(body.observaciones) : propia.observaciones };
      return out('actualizar', 200, { success: true, data: toReg(row), message: 'Inscripción actualizada.' },
        { row, audit: auditar(row, 'ACTUALIZAR', propia.estado, propia.estado, 'OK', 'Datos de acreditación actualizados') });
    }

    if (action === 'cancel') {
      if (propia.estado === 'CANCELADA') return fail(409, 'La inscripción ya estaba cancelada.');
      const ev = evMap[propia.evento_id] || { nombre: propia.evento_id };
      const motivo = norm(body.motivo) || 'Cancelada a petición del usuario';
      const row = { ...pick(propia), estado: 'CANCELADA', fecha_actualizacion: ahora, orden_espera: '', motivo_cancelacion: motivo };
      const notif = { usuario_id: u.usuario_id, tipo: 'INSCRIPCION_CANCELADA', titulo: `Inscripción cancelada: ${ev.nombre}`,
        mensaje: `Tu inscripción ${row.inscripcion_id} a "${ev.nombre}" fue cancelada. Motivo: ${motivo}.`,
        evento_id: row.evento_id, inscripcion_id: row.inscripcion_id, clave_idempotencia: `INSCRIPCION_CANCELADA|${row.inscripcion_id}` };
      return out('actualizar', 200, { success: true, data: toReg(row),
        message: propia.estado === 'CONFIRMADA' ? 'Inscripción cancelada. El cupo será reasignado a la lista de espera.' : 'Inscripción cancelada.' },
        { row, notif, audit: auditar(row, 'CANCELAR', propia.estado, 'CANCELADA', 'OK', motivo) });
    }

    return fail(400, 'Acción no soportada. Usa create, list, update o cancel.');
  }), [6, 1]);

  const sw = wf.switch('Según operación', ['crear', 'actualizar', 'auditar'], [7, 1]);
  const [f1, w1] = wf.rowWriter('Crear inscripción', "$('Validar y calcular cupos').first().json.row", 'append',
    'EP06_Inscripciones', 'Inscripciones', [8, 0]);
  const [f2, w2] = wf.rowWriter('Actualizar inscripción', "$('Validar y calcular cupos').first().json.row", 'update',
    'EP06_Inscripciones', 'Inscripciones', [8, 1], 'inscripcion_id');
  const [fa, wa] = wf.rowWriter('Auditoría inscripciones', "$('Validar y calcular cupos').first().json.audit", 'append',
    'EP06_Inscripciones', 'Auditoria_Inscripciones', [10, 1]);
  const out = wf.respond('Responder', 'Validar y calcular cupos', [12, 1]);
  const cond = wf.ifTrue('¿Requiere notificación?', "={{ Boolean($('Validar y calcular cupos').first().json.notif) }}", [13, 1]);
  const dn = wf.code('Datos de notificación', "return [{ json: $('Validar y calcular cupos').first().json.notif }];", [14, 0]);
  const nt = wf.notify('Notificar (WF09)', [15, 0]);

  wf.chain(wh, r1, r2, r3, r4, r5, val, sw);
  wf.connect(sw, f1, 0);
  wf.connect(sw, f2, 1);
  wf.connect(sw, fa, 2);
  wf.connect(sw, out, 3);
  wf.connect(w1, fa);
  wf.connect(w2, fa);
  wf.chain(wa, out, cond);
  wf.connect(cond, dn, 0);
  wf.connect(dn, nt);
  wf.save('WF06_inscripciones_crud.json');
}

// ===========================================================================
// WF07 — Reasignación automática de lista de espera
// ===========================================================================
function wf07() {
  const wf = new Workflow('WF07 - Reasignación de lista de espera');
  const tr = wf.add('Cada 5 minutos', 'n8n-nodes-base.scheduleTrigger', 1.2,
    { rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] } }, [0, 1]);
  const r1 = wf.read('Leer Eventos', 'EP04_Eventos', 'Eventos', [1, 1], false);
  const r2 = wf.read('Leer Inscripciones', 'EP06_Inscripciones', 'Inscripciones', [2, 1]);

  const calc = wf.code('Calcular cupos y ordenar lista', js(BASE_JS, function () {
    const COLS = __COLS_Inscripciones__;
    const pick = (o) => Object.fromEntries(COLS.map((c) => [c, o?.[c] ?? '']));
    // Filter: solo eventos PUBLICADOS que aún no ocurren
    const eventos = rows('Leer Eventos', 'evento_id').filter((e) => e.estado === 'PUBLICADO')
      .filter((e) => { const d = inicioEvento(e); return !d.isValid || d > DateTime.now(); });
    const insc = rows('Leer Inscripciones', 'inscripcion_id');
    const salida = [];
    for (const e of eventos) {
      const delEvento = insc.filter((i) => i.evento_id === e.evento_id);
      const confirmadas = delEvento.filter((i) => i.estado === 'CONFIRMADA').length;
      const libres = (Number(e.capacidad) || 0) - confirmadas;
      if (libres <= 0) continue;
      // Prioridad: fecha_inscripcion ASC (quien más tiempo lleva esperando)
      const espera = delEvento.filter((i) => i.estado === 'LISTA_ESPERA')
        .sort((a, b) => norm(a.fecha_inscripcion).localeCompare(norm(b.fecha_inscripcion)));
      espera.slice(0, libres).forEach((i, idx) => {
        salida.push({ json: {
          inscripcion: { ...pick(i), estado: 'CONFIRMADA', orden_espera: '', fecha_actualizacion: ahora },
          reasignacion: { reasignacion_id: genId('REA'), evento_id: e.evento_id, inscripcion_id: i.inscripcion_id,
            usuario_id: i.usuario_id, fecha: ahora, orden_lista: String(idx + 1), estado_anterior: 'LISTA_ESPERA',
            estado_nuevo: 'CONFIRMADA', resultado_notificacion: 'PENDIENTE' },
          notif: { usuario_id: i.usuario_id, tipo: 'REASIGNACION_CUPO', titulo: `¡Se liberó un cupo! ${e.nombre}`,
            mensaje: `Buenas noticias: se liberó un cupo en "${e.nombre}" y tu inscripción ${i.inscripcion_id} pasó de LISTA DE ESPERA a CONFIRMADA.\nFecha: ${fechaLegible(e)} ${e.hora}\nLugar: ${e.lugar}`,
            evento_id: e.evento_id, inscripcion_id: i.inscripcion_id, clave_idempotencia: `REASIGNACION|${i.inscripcion_id}` }
        } });
      });
    }
    return salida;
  }), [3, 1]);

  const [, wi] = wf.rowWriter('Promover inscripción',
    "$('Calcular cupos y ordenar lista').all().map((i) => i.json.inscripcion)",
    'update', 'EP06_Inscripciones', 'Inscripciones', [4, 1], 'inscripcion_id');
  const dn = wf.code('Datos de notificación',
    "return $('Calcular cupos y ordenar lista').all().map((i) => ({ json: i.json.notif }));", [6, 1]);
  const nt = wf.notify('Notificar (WF09)', [7, 1]);
  const [fr] = wf.rowWriter('Registrar reasignación', `(() => {
  const resultados = $input.all();
  return $('Calcular cupos y ordenar lista').all().map((it, idx) => {
    const r = resultados[idx]?.json || {};
    return { ...it.json.reasignacion,
      resultado_notificacion: \`GMAIL:\${r.gmail_estado || 'DESCONOCIDO'} | TELEGRAM:\${r.telegram_estado || 'DESCONOCIDO'}\` };
  });
})()`, 'append', 'EP07_Reasignaciones', 'Reasignaciones', [8, 1]);
  const [fa] = wf.rowWriter('Auditoría inscripciones', `$('Calcular cupos y ordenar lista').all().map((i) => ({
  auditoria_id: \`AUD-\${Date.now().toString(36).toUpperCase()}\${Math.random().toString(36).slice(2, 6).toUpperCase()}\`,
  inscripcion_id: i.json.reasignacion.inscripcion_id, usuario_id: i.json.reasignacion.usuario_id,
  evento_id: i.json.reasignacion.evento_id, accion: 'REASIGNAR', estado_anterior: 'LISTA_ESPERA',
  estado_nuevo: 'CONFIRMADA', fecha: new Date().toISOString(), resultado: 'OK',
  detalle: \`Promovida automáticamente (orden \${i.json.reasignacion.orden_lista})\` }))`,
  'append', 'EP06_Inscripciones', 'Auditoria_Inscripciones', [10, 1]);

  wf.chain(tr, r1, r2, calc, 'Fila: Promover inscripción');
  wf.chain(wi, dn, nt, fr);
  wf.connect('Registrar reasignación', fa);
  wf.save('WF07_reasignacion_lista_espera.json');
}

// ===========================================================================
// WF08 — Recordatorios automáticos
// ===========================================================================
function wf08() {
  const wf = new Workflow('WF08 - Recordatorios automáticos');
  const tr = wf.add('Cada hora', 'n8n-nodes-base.scheduleTrigger', 1.2,
    { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } }, [0, 1]);
  const r1 = wf.read('Leer Eventos', 'EP04_Eventos', 'Eventos', [1, 1], false);
  const r2 = wf.read('Leer Inscripciones', 'EP06_Inscripciones', 'Inscripciones', [2, 1]);
  const r3 = wf.read('Leer Recordatorios', 'EP08_Recordatorios', 'Recordatorios', [3, 1]);

  const det = wf.code('Detectar recordatorios pendientes', js(BASE_JS, function () {
    // Ventanas de recordatorio: se envía la más cercana que aplique
    const TIPOS = [{ tipo: 'RECORDATORIO_24H', horas: 24 }, { tipo: 'RECORDATORIO_72H', horas: 72 }];
    const eventos = rows('Leer Eventos', 'evento_id').filter((e) => e.estado === 'PUBLICADO');
    const insc = rows('Leer Inscripciones', 'inscripcion_id').filter((i) => i.estado === 'CONFIRMADA');
    // Control de duplicados: la clave usuario_id|evento_id|tipo ya ENVIADA u OMITIDA no se repite
    const yaProcesadas = new Set(rows('Leer Recordatorios', 'recordatorio_id')
      .filter((r) => ['ENVIADO', 'OMITIDO'].includes(r.estado)).map((r) => r.clave_idempotencia));
    const salida = [];
    for (const e of eventos) {
      const inicio = inicioEvento(e);
      if (!inicio.isValid) continue;
      const horas = inicio.diff(DateTime.now(), 'hours').hours;
      if (horas <= 0) continue;
      const t = TIPOS.find((x) => horas <= x.horas);
      if (!t) continue;
      for (const i of insc.filter((x) => x.evento_id === e.evento_id)) {
        const clave = `${i.usuario_id}|${e.evento_id}|${t.tipo}`;
        if (yaProcesadas.has(clave)) continue;
        yaProcesadas.add(clave);
        const cuando = t.horas === 24 ? 'mañana' : 'en los próximos días';
        salida.push({ json: {
          recordatorio: { recordatorio_id: genId('REC'), usuario_id: i.usuario_id, evento_id: e.evento_id,
            inscripcion_id: i.inscripcion_id, tipo_recordatorio: t.tipo,
            fecha_programada: inicio.minus({ hours: t.horas }).toISO(), fecha_envio: '', estado: 'PENDIENTE', clave_idempotencia: clave },
          notif: { usuario_id: i.usuario_id, tipo: t.tipo, titulo: `Recordatorio: ${e.nombre}`,
            mensaje: `Te recordamos que "${e.nombre}" es ${cuando}.\nFecha: ${fechaLegible(e)} ${e.hora}\nLugar: ${e.lugar}\nPresenta tu código ${i.inscripcion_id} en el acceso.`,
            evento_id: e.evento_id, inscripcion_id: i.inscripcion_id, clave_idempotencia: clave }
        } });
      }
    }
    return salida;
  }), [4, 1]);

  const dn = wf.code('Datos de notificación', 'return $input.all().map((i) => ({ json: i.json.notif }));', [5, 1]);
  const nt = wf.notify('Notificar (WF09)', [6, 1]);
  const [fr] = wf.rowWriter('Registrar recordatorio', `(() => {
  const res = $input.all();
  return $('Detectar recordatorios pendientes').all().map((it, idx) => {
    const r = res[idx]?.json || {};
    const enviado = r.gmail_estado === 'ENVIADO' || r.telegram_estado === 'ENVIADO';
    const estado = r.omitido ? 'OMITIDO' : enviado ? 'ENVIADO' : 'ERROR';
    return { ...it.json.recordatorio, estado, fecha_envio: enviado ? new Date().toISOString() : '' };
  });
})()`, 'append', 'EP08_Recordatorios', 'Recordatorios', [7, 1]);
  wf.chain(tr, r1, r2, r3, det, dn, nt, fr);
  wf.save('WF08_recordatorios.json');
}

// ===========================================================================
// WF09 — Servicio central de notificaciones (Gmail + Telegram)
// ===========================================================================
function wf09() {
  const wf = new Workflow('WF09 - Servicio central de notificaciones');
  const tr = wf.add('Recibir notificación', 'n8n-nodes-base.executeWorkflowTrigger', 1.1,
    { inputSource: 'passthrough' }, [0, 1]);
  const r1 = wf.read('Consultar usuario', 'EP01_Usuarios', 'Usuarios', [1, 1]);
  const r2 = wf.read('Consultar chat_id', 'EP03_Telegram', 'Vinculaciones', [2, 1]);
  const r3 = wf.read('Leer notificaciones previas', 'EP09_Notificaciones', 'Notificaciones', [3, 1]);

  const prep = wf.code('Preparar notificación', js(BASE_JS, function () {
    const d = $('Recibir notificación').first().json;
    const u = rows('Consultar usuario', 'usuario_id').find((x) => x.usuario_id === d.usuario_id);
    const v = rows('Consultar chat_id', 'vinculacion_id').find((x) => x.usuario_id === d.usuario_id && x.estado === 'ACTIVA');
    const clave = norm(d.clave_idempotencia) || `${d.tipo}|${d.usuario_id}|${d.inscripcion_id || ''}|${d.evento_id || ''}`;
    // Idempotencia: si ya se envió por algún canal con la misma clave, no se repite
    const previa = rows('Leer notificaciones previas', 'notificacion_id')
      .find((n) => n.clave_idempotencia === clave && (n.gmail_estado === 'ENVIADO' || n.telegram_estado === 'ENVIADO'));
    return [{ json: {
      enviar: Boolean(u) && !previa,
      motivo: !u ? 'Usuario no encontrado' : previa ? `Duplicado de ${previa.notificacion_id}` : '',
      clave, usuario_id: d.usuario_id, tipo: norm(d.tipo) || 'GENERAL', titulo: norm(d.titulo) || 'Notificación EventPass',
      mensaje: norm(d.mensaje), evento_id: norm(d.evento_id), inscripcion_id: norm(d.inscripcion_id),
      email: u ? u.email_normalizado : '', nombre: u ? u.nombre : '', chat_id: v ? String(v.chat_id) : ''
    } }];
  }), [4, 1]);

  const cond = wf.ifTrue('¿Enviar?', '={{ $json.enviar }}', [5, 1]);
  const gmail = wf.add('Enviar Gmail', 'n8n-nodes-base.gmail', 2.1, {
    sendTo: "={{ $('Preparar notificación').first().json.email }}",
    subject: "=EventPass · {{ $('Preparar notificación').first().json.titulo }}",
    emailType: 'text',
    message: "=Hola {{ $('Preparar notificación').first().json.nombre }},\n\n" +
      "{{ $('Preparar notificación').first().json.mensaje }}\n\n— Equipo EventPass",
    options: { appendAttribution: false }
  }, [6, 0], { onError: 'continueRegularOutput', ...creds('gmail', 'gmailOAuth2') });

  const rg = wf.code('Resultado Gmail', cuerpo(function () {
    const p = $('Preparar notificación').first().json;
    const r = $input.first().json;
    const msg = (e) => (typeof e === 'string' ? e : e?.message || JSON.stringify(e));
    if (!p.email) return [{ json: { gmail_estado: 'NO_APLICA', gmail_error: 'Usuario sin correo' } }];
    return [{ json: r.error ? { gmail_estado: 'ERROR', gmail_error: msg(r.error) } : { gmail_estado: 'ENVIADO', gmail_error: '' } }];
  }), [7, 0]);

  const tg = wf.add('Enviar Telegram', 'n8n-nodes-base.telegram', 1.2, {
    chatId: "={{ $('Preparar notificación').first().json.chat_id }}",
    text: "=🎟️ {{ $('Preparar notificación').first().json.titulo }}\n\n" +
      "{{ $('Preparar notificación').first().json.mensaje }}",
    additionalFields: { appendAttribution: false }
  }, [8, 0], { onError: 'continueRegularOutput', ...creds('telegram', 'telegramApi') });

  const rt = wf.code('Resultado Telegram', cuerpo(function () {
    const p = $('Preparar notificación').first().json;
    const r = $input.first().json;
    const msg = (e) => (typeof e === 'string' ? e : e?.message || JSON.stringify(e));
    if (!p.chat_id) return [{ json: { telegram_estado: 'NO_APLICA', telegram_error: 'Usuario sin Telegram vinculado' } }];
    return [{ json: r.error ? { telegram_estado: 'ERROR', telegram_error: msg(r.error) } : { telegram_estado: 'ENVIADO', telegram_error: '' } }];
  }), [9, 0]);

  const [fn, wn] = wf.rowWriter('Registrar notificación', `(() => {
  const p = $('Preparar notificación').first().json;
  const g = $('Resultado Gmail').first().json;
  const t = $('Resultado Telegram').first().json;
  return { notificacion_id: \`NOT-\${Date.now().toString(36).toUpperCase()}\${Math.random().toString(36).slice(2, 6).toUpperCase()}\`,
    usuario_id: p.usuario_id, tipo: p.tipo, titulo: p.titulo, mensaje: p.mensaje, evento_id: p.evento_id,
    inscripcion_id: p.inscripcion_id, fecha: new Date().toISOString(), gmail_estado: g.gmail_estado,
    telegram_estado: t.telegram_estado, gmail_error: g.gmail_error, telegram_error: t.telegram_error, clave_idempotencia: p.clave };
})()`, 'append', 'EP09_Notificaciones', 'Notificaciones', [10, 0]);

  const res = wf.code('Resumen', cuerpo(function () {
    const r = $('Fila: Registrar notificación').first().json;
    return [{ json: { notificacion_id: r.notificacion_id, gmail_estado: r.gmail_estado, telegram_estado: r.telegram_estado, omitido: false } }];
  }), [12, 0]);
  const om = wf.code('Resumen (omitida)', cuerpo(function () {
    const p = $('Preparar notificación').first().json;
    return [{ json: { notificacion_id: '', gmail_estado: 'NO_APLICA', telegram_estado: 'NO_APLICA', omitido: true, motivo: p.motivo } }];
  }), [6, 2]);

  wf.chain(tr, r1, r2, r3, prep, cond);
  wf.connect(cond, gmail, 0);
  wf.connect(cond, om, 1);
  wf.chain(gmail, rg, tg, rt, fn);
  wf.connect(wn, res);
  wf.save('WF09_notificaciones.json');
}

// ===========================================================================
// WF10 — EventPass Assistant (Chat Trigger + Gemini)
// ===========================================================================
function wf10() {
  const wf = new Workflow('WF10 - EventPass Assistant');
  const ct = wf.add('Chat Trigger', '@n8n/n8n-nodes-langchain.chatTrigger', 1.1,
    { public: true, mode: 'webhook', options: { allowedOrigins: '*', responseMode: 'lastNode' } }, [0, 1],
    { webhookId: true });
  const r1 = wf.read('Leer Eventos (solo lectura)', 'EP04_Eventos', 'Eventos', [1, 1]);
  const r2 = wf.read('Leer Inscripciones (solo lectura)', 'EP06_Inscripciones', 'Inscripciones', [2, 1]);
  const r3 = wf.read('Leer Conversaciones', 'EP10_Soporte', 'Conversaciones', [3, 1]);
  const r4 = wf.read('Leer Mensajes', 'EP10_Soporte', 'Mensajes', [4, 1]);

  const prep = wf.code('Preparar contexto', js(BASE_JS, EVENTO_FRONT_JS, function () {
    const c = $('Chat Trigger').first().json;
    const meta = c.metadata || {};
    const pregunta = norm(c.chatInput);
    const sessionId = norm(c.sessionId) || genId('SESS');
    // conversation_id derivado del sessionId del chat: misma ventana de chat = misma conversación
    const conversation_id = `CONV-${sessionId}`;
    const usuario_id = norm(meta.usuario_id);
    const visitor_id = norm(meta.visitor_id) || sessionId;
    const previa = rows('Leer Conversaciones', 'conversation_id').find((x) => x.conversation_id === conversation_id);
    const historial = rows('Leer Mensajes', 'message_id').filter((m) => m.conversation_id === conversation_id)
      .sort((a, b) => norm(a.timestamp).localeCompare(norm(b.timestamp))).slice(-10)
      .map((m) => `${m.rol === 'USER' ? 'Usuario' : 'Asistente'}: ${m.mensaje}`).join('\n');
    const cnt = conteos(rows('Leer Inscripciones (solo lectura)', 'inscripcion_id'));
    const catalogo = rows('Leer Eventos (solo lectura)', 'evento_id').filter((e) => e.estado !== 'BORRADOR')
      .map((e) => eventoFront(e, cnt))
      .map((e) => `- ${e.title} | Categoría: ${e.category} | Fecha: ${e.date} ${e.time} | Lugar: ${e.location} | Estado: ${e.status} | Cupos libres: ${e.availableSpots}/${e.totalCapacity} | En espera: ${e.waitlistCount}`)
      .join('\n');

    const prompt = `Eres "EventPass Assistant", el asistente de soporte de la plataforma EventPass.
Responde SIEMPRE en español, de forma breve, amable y precisa.
Escribe en texto plano: sin Markdown, sin asteriscos ni almohadillas. Para listas usa guiones simples.

REGLAS ESTRICTAS (eres solo informativo):
- NO puedes crear usuarios, iniciar sesión, inscribir, cancelar inscripciones, modificar eventos, cambiar cupos ni cambiar estados.
- Si te piden alguna de esas acciones, explica cómo hacerla el propio usuario desde la web de EventPass.
- Usa SOLO la información del catálogo de abajo. Si algo no aparece, di que no tienes ese dato. No inventes eventos, fechas ni cupos.
- Nunca reveles datos personales de otros usuarios.

CÓMO FUNCIONA EVENTPASS:
- Estados de evento: DISPONIBLE (hay cupos), PROXIMO (se realiza en menos de 7 días), AGOTADO (sin cupos, se entra a lista de espera), CERRADO (inscripciones cerradas o evento finalizado), CANCELADO.
- Estados de inscripción: CONFIRMADA (cupo garantizado), LISTA_ESPERA (sin cupo, en cola), CANCELADA.
- Lista de espera: si un inscrito confirmado cancela, el sistema revisa cada 5 minutos y promueve automáticamente al que lleva más tiempo esperando (orden por fecha de inscripción). Se notifica por correo y Telegram.
- Para inscribirse hay que tener cuenta, sesión iniciada y Telegram vinculado.
- Vincular Telegram: en la web ir a Perfil → Vincular Telegram, generar un código y enviar al bot @__CFG_telegram_bot_username__ el mensaje: /vincular CODIGO. El código dura __CFG_telegram_code_minutes__ minutos y solo sirve una vez.
- Cancelar: en "Mis Inscripciones" → "Cancelar inscripción".
- Recordatorios: se envían 72 h y 24 h antes del evento por correo y Telegram.

CATÁLOGO ACTUAL:
${catalogo || '(sin eventos publicados)'}

HISTORIAL RECIENTE DE ESTA CONVERSACIÓN:
${historial || '(inicio de la conversación)'}

PREGUNTA DEL USUARIO:
${pregunta}`;

    return [{ json: { conversation_id, usuario_id, visitor_id, pregunta, prompt,
      fecha_inicio: previa ? previa.fecha_inicio : ahora } }];
  }), [5, 1]);

  const [fc, wc] = wf.rowWriter('Guardar conversación', `(() => {
  const p = $('Preparar contexto').first().json;
  return { conversation_id: p.conversation_id, usuario_id: p.usuario_id, visitor_id: p.visitor_id,
    fecha_inicio: p.fecha_inicio, fecha_ultima_interaccion: new Date().toISOString(), estado: 'ABIERTA' };
})()`, 'appendOrUpdate', 'EP10_Soporte', 'Conversaciones', [6, 1], 'conversation_id');
  const [fu, wu] = wf.rowWriter('Guardar mensaje usuario', `(() => {
  const p = $('Preparar contexto').first().json;
  return { message_id: \`MSG-\${Date.now().toString(36).toUpperCase()}U\`, conversation_id: p.conversation_id,
    usuario_id: p.usuario_id, visitor_id: p.visitor_id, rol: 'USER', mensaje: p.pregunta, timestamp: new Date().toISOString() };
})()`, 'append', 'EP10_Soporte', 'Mensajes', [8, 1]);
  const llm = wf.add('EventPass Assistant (IA)', '@n8n/n8n-nodes-langchain.chainLlm', 1.5,
    { promptType: 'define', text: "={{ $('Preparar contexto').first().json.prompt }}" }, [10, 1]);
  const gem = wf.add('Google Gemini', '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', 1,
    { modelName: CFG.gemini_model, options: { temperature: 0.3 } }, [10, 2], creds('gemini', 'googlePalmApi'));
  const [fa, wa] = wf.rowWriter('Guardar mensaje asistente', `(() => {
  const p = $('Preparar contexto').first().json;
  const texto = $('EventPass Assistant (IA)').first().json.text || 'Lo siento, no pude generar una respuesta.';
  return { message_id: \`MSG-\${Date.now().toString(36).toUpperCase()}A\`, conversation_id: p.conversation_id,
    usuario_id: p.usuario_id, visitor_id: p.visitor_id, rol: 'ASSISTANT', mensaje: texto, timestamp: new Date().toISOString() };
})()`, 'append', 'EP10_Soporte', 'Mensajes', [11, 1]);
  const res = wf.code('Respuesta al chat', cuerpo(function () {
    const p = $('Preparar contexto').first().json;
    const texto = $('EventPass Assistant (IA)').first().json.text || 'Lo siento, no pude generar una respuesta.';
    return [{ json: { output: texto, conversation_id: p.conversation_id } }];
  }), [13, 1]);

  wf.chain(ct, r1, r2, r3, r4, prep, fc);
  wf.connect(wc, fu);
  wf.chain(wu, llm, fa);
  wf.connect(gem, llm, 0, 'ai_languageModel');
  wf.connect(wa, res);
  wf.save('WF10_eventpass_assistant.json');
}

// ===========================================================================
// WF00 — Crear los 10 Google Sheets (se ejecuta una sola vez al configurar)
// ===========================================================================
function wf00() {
  const wf = new Workflow('WF00 - Crear Google Sheets de EventPass');
  const wh = wf.webhook('Webhook', 'ep/setup-hojas', [0, 1]);

  const def = wf.code('Definir hojas y datos de prueba', cuerpo(function () {
    const COLS = __COLS_ALL__;
    const ARCHIVOS = {
      EP01_Usuarios: ['Usuarios', 'Auditoria_Usuarios'],
      EP02_Sesiones: ['Sesiones'],
      EP03_Telegram: ['Codigos_Vinculacion', 'Vinculaciones'],
      EP04_Eventos: ['Eventos', 'Auditoria_Eventos'],
      EP05_Catalogo_Log: ['Consultas_Catalogo'],
      EP06_Inscripciones: ['Inscripciones', 'Auditoria_Inscripciones'],
      EP07_Reasignaciones: ['Reasignaciones'],
      EP08_Recordatorios: ['Recordatorios'],
      EP09_Notificaciones: ['Notificaciones'],
      EP10_Soporte: ['Conversaciones', 'Mensajes']
    };
    const ahora = new Date().toISOString();
    const enDias = (n) => DateTime.now().setZone('__CFG_timezone__').plus({ days: n }).toFormat('yyyy-MM-dd');
    const evento = (id, nombre, categoria, descripcion, dias, hora, lugar, capacidad, imagen, organizador, estado) => ({
      evento_id: id, nombre, categoria, descripcion, fecha: enDias(dias), hora, lugar, capacidad: String(capacidad),
      imagen_url: imagen, organizador, estado, fecha_creacion: ahora, fecha_actualizacion: ahora });

    // 7 eventos en 4 categorías: con cupos, lleno, próximo (2 días), cancelado, cerrado y un borrador oculto
    const datos = {
      Eventos: [
        evento('EVT-TECH-01', 'Cumbre Global de Inteligencia Artificial & Cloud', 'Tecnología',
          'Conferencias magistrales sobre agentes autónomos, LLMs y arquitectura cloud serverless, con paneles y networking.',
          20, '09:00', 'Auditorio NovaTech Center, Bogotá', 350, '/images/event_tech_summit_1792500747939.jpg',
          'Alianza Iberoamericana de Innovación', 'PUBLICADO'),
        evento('EVT-CULT-02', 'Festival Iberoamericano de Jazz & Artes Sonoras', 'Cultura',
          'Encuentro musical al aire libre con orquestas contemporáneas y ensambles acústicos. Aforo reducido: está LLENO.',
          10, '19:00', 'Teatro Abierto Bellas Vistas, Medellín', 3, '/images/event_culture_jazz_1792500747803.jpg',
          'Colectivo Cultural Acústico', 'PUBLICADO'),
        evento('EVT-EDU-03', 'Masterclass de Diseño de Producto & UX Systems', 'Educación',
          'Taller sobre design tokens, microinteracciones accesibles y diseño centrado en el usuario. ¡Es en 2 días!',
          2, '10:00', 'Campus Creativo Loft 04, Bucaramanga', 80, '/images/event_education_design_1792500748396.jpg',
          'Design Academy Latam', 'PUBLICADO'),
        evento('EVT-DEP-04', 'Maratón Nocturna Metropolitana 10K & 21K', 'Deportes',
          'Carrera atlética urbana. Edición suspendida por obras de infraestructura vial en el circuito.',
          15, '20:00', 'Circuito Costanera Central, Cali', 1200, '/images/event_sports_marathon_1792500748476.jpg',
          'Federación Atlética Urbana', 'CANCELADO'),
        evento('EVT-TECH-05', 'DevOps & Kubernetes World Tour Latam', 'Tecnología',
          'Observabilidad, pipelines GitOps y despliegues multi-cluster con alta disponibilidad.',
          25, '09:30', 'Centro de Convenciones Prisma, Bogotá', 180, '/images/hero_eventpass_conference_1792500747135.jpg',
          'Cloud Native Community Latam', 'CERRADO'),
        evento('EVT-EDU-06', 'Bootcamp Práctico: Automatizaciones con n8n & No-Code', 'Educación',
          'Conecta formularios web con Google Sheets, webhooks y bots de Telegram en tiempo real.',
          30, '15:00', 'Laboratorio Tech Hub, Bucaramanga', 120, '/images/event_education_design_1792500748396.jpg',
          'Workflow Masters Hub', 'PUBLICADO'),
        evento('EVT-DEP-07', 'Torneo Relámpago de Fútbol 5 Comunitario', 'Deportes',
          'Evento en preparación (BORRADOR): no debe aparecer en el catálogo público.',
          40, '08:00', 'Polideportivo Norte, Bucaramanga', 64, '/images/event_sports_marathon_1792500748476.jpg',
          'Liga Barrial', 'BORRADOR')
      ],
      // Usuarios de prueba (sin contraseña válida) que ocupan los 3 cupos del festival de jazz
      Usuarios: [1, 2, 3].map((n) => ({ usuario_id: `USR-DEMO-0${n}`, nombre: `Asistente Demo ${n}`,
        email_normalizado: `demo${n}@eventpass.test`, password_hash: 'SEMILLA', password_salt: 'SEMILLA', estado: 'ACTIVO',
        fecha_registro: ahora, fecha_actualizacion: ahora, notif_email: 'SI', notif_telegram: 'SI' })),
      Inscripciones: [1, 2, 3].map((n) => ({ inscripcion_id: `INS-DEMO-0${n}`, usuario_id: `USR-DEMO-0${n}`,
        evento_id: 'EVT-CULT-02', estado: 'CONFIRMADA', fecha_inscripcion: ahora, fecha_actualizacion: ahora,
        nombre_acreditacion: `Asistente Demo ${n}`, observaciones: 'Dato de prueba', origen: 'SEMILLA' }))
    };

    return Object.entries(ARCHIVOS).map(([archivo, hojas]) => ({ json: {
      archivo,
      hojas: hojas.map((h) => ({
        titulo: h,
        filas: [COLS[h], ...(datos[h] || []).map((r) => COLS[h].map((c) => r[c] ?? ''))]
      }))
    } }));
  }), [1, 1]);

  const googleSheetsCreds = creds('googleSheets', 'googleSheetsOAuth2Api');
  const crear = wf.add('Crear archivo de Google Sheets', 'n8n-nodes-base.httpRequest', 4.2, {
    method: 'POST', url: 'https://sheets.googleapis.com/v4/spreadsheets',
    authentication: 'predefinedCredentialType', nodeCredentialType: 'googleSheetsOAuth2Api',
    sendBody: true, specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({ properties: { title: $json.archivo, locale: "es_CO", timeZone: "${CFG.timezone}" }, ` +
      'sheets: $json.hojas.map((h) => ({ properties: { title: h.titulo, gridProperties: { frozenRowCount: 1 } } })) }) }}',
    options: {}
  }, [2, 1], googleSheetsCreds);
  const escribir = wf.add('Escribir columnas y datos', 'n8n-nodes-base.httpRequest', 4.2, {
    method: 'POST', url: '=https://sheets.googleapis.com/v4/spreadsheets/{{ $json.spreadsheetId }}/values:batchUpdate',
    authentication: 'predefinedCredentialType', nodeCredentialType: 'googleSheetsOAuth2Api',
    sendBody: true, specifyBody: 'json',
    jsonBody: "={{ JSON.stringify({ valueInputOption: 'RAW', data: $('Definir hojas y datos de prueba').item.json.hojas" +
      ".map((h) => ({ range: \"'\" + h.titulo + \"'!A1\", values: h.filas })) }) }}",
    options: {}
  }, [3, 1], googleSheetsCreds);
  const ids = wf.code('IDs para config.json', cuerpo(function () {
    const ids = {};
    $('Crear archivo de Google Sheets').all().forEach((it) => {
      ids[it.json.properties.title] = it.json.spreadsheetId;
    });
    return [{ json: { status: 200, body: { success: true, data: ids } } }];
  }), [4, 1]);
  const out = wf.respond('Responder', 'IDs para config.json', [5, 1]);
  wf.chain(wh, def, crear, escribir, ids, out);
  wf.save('WF00_crear_google_sheets.json');
}

// ===========================================================================
console.log('Generando workflows de EventPass...');
[wf00, wf01, wf02, wf03, wf04, wf05, wf06, wf07, wf08, wf09, wf10].forEach((fn) => fn());
const faltan = Object.entries(CFG.sheets).filter(([, v]) => !v).map(([k]) => k);
if (faltan.length) console.log(`\nAviso: faltan IDs de Google Sheets en config.json: ${faltan.join(', ')}`);
if (!CFG.wf09_id) console.log('Aviso: falta wf09_id (importa primero WF09 y copia su ID de la URL).');
