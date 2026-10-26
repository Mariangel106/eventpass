/**
 * EventPass - Crea los 10 archivos de Google Sheets (EP01 a EP10) con sus hojas, columnas
 * y datos de prueba.
 *
 * Cómo usarlo:
 *   1. Abre https://script.google.com con la misma cuenta de Google que usarás en n8n.
 *   2. Nuevo proyecto → borra el contenido → pega este archivo completo → Guardar.
 *   3. Selecciona la función `crearHojasEventPass` y pulsa "Ejecutar" (acepta los permisos).
 *   4. Abre "Registro de ejecución": verás un bloque JSON con los IDs. Cópialo en la sección
 *      "sheets" de n8n/config.json.
 *
 * Todas las celdas quedan en formato "texto sin formato" para que Sheets no convierta
 * fechas, horas ni códigos.
 */

const ESTRUCTURA = {
  EP01_Usuarios: {
    Usuarios: ['usuario_id', 'nombre', 'email_normalizado', 'password_hash', 'password_salt', 'estado',
      'fecha_registro', 'fecha_actualizacion', 'telefono', 'ciudad', 'organizacion', 'notif_email', 'notif_telegram'],
    Auditoria_Usuarios: ['auditoria_id', 'usuario_id', 'accion', 'fecha', 'resultado', 'detalle']
  },
  EP02_Sesiones: {
    Sesiones: ['session_id', 'usuario_id', 'session_token', 'creada_en', 'expira_en', 'estado', 'cerrada_en',
      'ultima_validacion']
  },
  EP03_Telegram: {
    Codigos_Vinculacion: ['codigo_id', 'usuario_id', 'codigo', 'creado_en', 'expira_en', 'estado', 'usado_en'],
    Vinculaciones: ['vinculacion_id', 'usuario_id', 'chat_id', 'telegram_username', 'fecha_vinculacion', 'estado']
  },
  EP04_Eventos: {
    Eventos: ['evento_id', 'nombre', 'categoria', 'descripcion', 'fecha', 'hora', 'lugar', 'capacidad', 'imagen_url',
      'organizador', 'estado', 'fecha_creacion', 'fecha_actualizacion'],
    Auditoria_Eventos: ['auditoria_id', 'evento_id', 'accion', 'fecha', 'resultado', 'detalle']
  },
  EP05_Catalogo_Log: {
    Consultas_Catalogo: ['consulta_id', 'fecha', 'tipo', 'evento_id', 'categoria', 'resultado_count', 'visitor_id',
      'status_http']
  },
  EP06_Inscripciones: {
    Inscripciones: ['inscripcion_id', 'usuario_id', 'evento_id', 'estado', 'fecha_inscripcion', 'fecha_actualizacion',
      'nombre_acreditacion', 'observaciones', 'origen', 'orden_espera', 'motivo_cancelacion'],
    Auditoria_Inscripciones: ['auditoria_id', 'inscripcion_id', 'usuario_id', 'evento_id', 'accion', 'estado_anterior',
      'estado_nuevo', 'fecha', 'resultado', 'detalle']
  },
  EP07_Reasignaciones: {
    Reasignaciones: ['reasignacion_id', 'evento_id', 'inscripcion_id', 'usuario_id', 'fecha', 'orden_lista',
      'estado_anterior', 'estado_nuevo', 'resultado_notificacion']
  },
  EP08_Recordatorios: {
    Recordatorios: ['recordatorio_id', 'usuario_id', 'evento_id', 'inscripcion_id', 'tipo_recordatorio',
      'fecha_programada', 'fecha_envio', 'estado', 'clave_idempotencia']
  },
  EP09_Notificaciones: {
    Notificaciones: ['notificacion_id', 'usuario_id', 'tipo', 'titulo', 'mensaje', 'evento_id', 'inscripcion_id', 'fecha',
      'gmail_estado', 'telegram_estado', 'gmail_error', 'telegram_error', 'clave_idempotencia']
  },
  EP10_Soporte: {
    Conversaciones: ['conversation_id', 'usuario_id', 'visitor_id', 'fecha_inicio', 'fecha_ultima_interaccion', 'estado'],
    Mensajes: ['message_id', 'conversation_id', 'usuario_id', 'visitor_id', 'rol', 'mensaje', 'timestamp']
  }
};

function crearHojasEventPass() {
  const carpeta = DriveApp.createFolder('EventPass - Google Sheets');
  const ids = {};
  const libros = {};

  Object.keys(ESTRUCTURA).forEach(function (archivo) {
    const libro = SpreadsheetApp.create(archivo);
    DriveApp.getFileById(libro.getId()).moveTo(carpeta);
    const hojas = ESTRUCTURA[archivo];
    Object.keys(hojas).forEach(function (nombreHoja, i) {
      const hoja = i === 0 ? libro.getSheets()[0].setName(nombreHoja) : libro.insertSheet(nombreHoja);
      const columnas = hojas[nombreHoja];
      hoja.getRange(1, 1, hoja.getMaxRows(), Math.max(columnas.length, hoja.getMaxColumns())).setNumberFormat('@');
      hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]).setFontWeight('bold').setBackground('#e0e7ff');
      hoja.setFrozenRows(1);
    });
    ids[archivo] = libro.getId();
    libros[archivo] = libro;
  });

  cargarDatosDePrueba(libros);

  Logger.log('Carpeta creada: ' + carpeta.getUrl());
  Logger.log('Copia este bloque en "sheets" de n8n/config.json:\n' + JSON.stringify(ids, null, 2));
}

/** Escribe filas respetando el orden de columnas de la hoja. */
function agregarFilas(libro, nombreHoja, objetos) {
  const hoja = libro.getSheetByName(nombreHoja);
  const columnas = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const filas = objetos.map(function (o) {
    return columnas.map(function (c) { return o[c] === undefined ? '' : String(o[c]); });
  });
  hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, columnas.length).setValues(filas);
}

/** Fecha AAAA-MM-DD a N días de hoy (los eventos de prueba siempre quedan en el futuro). */
function enDias(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function cargarDatosDePrueba(libros) {
  const ahora = new Date().toISOString();
  const evento = function (id, nombre, categoria, descripcion, dias, hora, lugar, capacidad, imagen, organizador, estado) {
    return { evento_id: id, nombre: nombre, categoria: categoria, descripcion: descripcion, fecha: enDias(dias), hora: hora,
      lugar: lugar, capacidad: capacidad, imagen_url: imagen, organizador: organizador, estado: estado,
      fecha_creacion: ahora, fecha_actualizacion: ahora };
  };

  // 7 eventos en 4 categorías: disponible, lleno, próximo a realizarse, cancelado, cerrado y un borrador oculto
  agregarFilas(libros.EP04_Eventos, 'Eventos', [
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
  ]);

  // Usuarios de prueba (sin contraseña válida) que ocupan los 3 cupos del festival de jazz
  const demo = [1, 2, 3].map(function (n) {
    return { usuario_id: 'USR-DEMO-0' + n, nombre: 'Asistente Demo ' + n, email_normalizado: 'demo' + n + '@eventpass.test',
      password_hash: 'SEMILLA', password_salt: 'SEMILLA', estado: 'ACTIVO', fecha_registro: ahora, fecha_actualizacion: ahora,
      telefono: '', ciudad: '', organizacion: '', notif_email: 'SI', notif_telegram: 'SI' };
  });
  agregarFilas(libros.EP01_Usuarios, 'Usuarios', demo);
  agregarFilas(libros.EP06_Inscripciones, 'Inscripciones', demo.map(function (u, i) {
    return { inscripcion_id: 'INS-DEMO-0' + (i + 1), usuario_id: u.usuario_id, evento_id: 'EVT-CULT-02', estado: 'CONFIRMADA',
      fecha_inscripcion: ahora, fecha_actualizacion: ahora, nombre_acreditacion: u.nombre, observaciones: 'Dato de prueba',
      origen: 'SEMILLA', orden_espera: '', motivo_cancelacion: '' };
  }));
}
