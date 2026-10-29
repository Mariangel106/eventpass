#!/usr/bin/env node
/**
 * EventPass - Descarga desde n8n (API pública) los workflows instalados y los guarda en n8n/
 * con los nombres obligatorios de la entrega. El formato es el mismo de "Download" en el editor.
 *
 * Uso: node n8n/exportar_workflows.mjs
 * Variables: N8N_URL (por defecto http://localhost:5678), N8N_API_KEY (por defecto ~/.n8n_api_key)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = dirname(fileURLToPath(import.meta.url));
const N8N_URL = (process.env.N8N_URL || 'http://localhost:5678').replace(/\/+$/, '');
const API_KEY = process.env.N8N_API_KEY || readFileSync(join(homedir(), '.n8n_api_key'), 'utf-8').trim();

// Prefijo del nombre del workflow en n8n → archivo exigido por el enunciado
const ARCHIVOS = {
  WF00: 'WF00_crear_google_sheets.json',
  WF01: 'WF01_usuarios_crud.json',
  WF02: 'WF02_auth_sesiones.json',
  WF03: 'WF03_vinculacion_telegram.json',
  WF04: 'WF04_eventos_crud.json',
  WF05: 'WF05_catalogo_publico.json',
  WF06: 'WF06_inscripciones_crud.json',
  WF07: 'WF07_reasignacion_lista_espera.json',
  WF08: 'WF08_recordatorios.json',
  WF09: 'WF09_notificaciones.json',
  WF10: 'WF10_eventpass_assistant.json',
  WF11: 'WF11_checkin_digital.json'
};

async function api(path) {
  const res = await fetch(`${N8N_URL}/api/v1${path}`, { headers: { 'X-N8N-API-KEY': API_KEY } });
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`);
  return res.json();
}

const lista = (await api('/workflows?limit=250')).data;
for (const [prefijo, archivo] of Object.entries(ARCHIVOS)) {
  const resumen = lista.find((w) => w.name.startsWith(`${prefijo} `));
  if (!resumen) {
    console.log(`✗ ${prefijo}: no está en n8n`);
    process.exitCode = 1;
    continue;
  }
  const wf = await api(`/workflows/${resumen.id}`);
  const descarga = {
    name: wf.name, nodes: wf.nodes, pinData: wf.pinData || {}, connections: wf.connections, active: wf.active,
    settings: wf.settings, versionId: wf.versionId, meta: wf.meta || {}, id: wf.id, tags: wf.tags || []
  };
  writeFileSync(join(BASE, archivo), JSON.stringify(descarga, null, 2) + '\n', 'utf-8');
  console.log(`✓ ${archivo} ← "${wf.name}" (${wf.nodes.length} nodos, ${wf.active ? 'activo' : 'inactivo'})`);
}
