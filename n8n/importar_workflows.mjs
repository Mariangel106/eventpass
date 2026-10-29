#!/usr/bin/env node
/**
 * EventPass - Importa (o actualiza) workflows en n8n usando su API pública y los activa.
 *
 * Lee los archivos de n8n/generados/ (salida de generar_workflows.mjs).
 *
 * Uso:
 *   node n8n/importar_workflows.mjs                      # importa WF01..WF11
 *   node n8n/importar_workflows.mjs WF00_crear_google_sheets.json
 *   node n8n/importar_workflows.mjs --sin-activar WF09_notificaciones.json
 *
 * Variables:
 *   N8N_URL      (por defecto http://localhost:5678)
 *   N8N_API_KEY  (por defecto se lee de ~/.n8n_api_key)
 *
 * Si ya existe un workflow con el mismo nombre se actualiza en lugar de duplicarse.
 * Imprime "nombre → id" de cada workflow (el id de WF09 va en wf09_id de config.json).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = dirname(fileURLToPath(import.meta.url));
const N8N_URL = (process.env.N8N_URL || 'http://localhost:5678').replace(/\/+$/, '');
const API_KEY = process.env.N8N_API_KEY || readFileSync(join(homedir(), '.n8n_api_key'), 'utf-8').trim();

const args = process.argv.slice(2);
const activar = !args.includes('--sin-activar');
const archivos = args.filter((a) => !a.startsWith('--'));
const GENERADOS = join(BASE, 'generados');
const lista = archivos.length ? archivos : readdirSync(GENERADOS).filter((f) => /^WF(0[1-9]|1[01])_.*\.json$/.test(f)).sort();

async function api(method, path, body) {
  const res = await fetch(`${N8N_URL}/api/v1${path}`, {
    method,
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${path} → HTTP ${res.status}: ${json.message || text}`);
  return json;
}

const existentes = (await api('GET', '/workflows?limit=250')).data;

for (const archivo of lista) {
  const wf = JSON.parse(readFileSync(join(GENERADOS, archivo), 'utf-8'));
  const cuerpo = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings };
  const previo = existentes.find((w) => w.name === wf.name);
  try {
    const guardado = previo ? await api('PUT', `/workflows/${previo.id}`, cuerpo) : await api('POST', '/workflows', cuerpo);
    let estado = previo ? 'actualizado' : 'importado';
    if (activar) {
      await api('POST', `/workflows/${guardado.id}/activate`);
      estado += ' y activado';
    }
    console.log(`✓ ${wf.name} → ${guardado.id} (${estado})`);
  } catch (e) {
    console.log(`✗ ${wf.name}: ${e.message}`);
    process.exitCode = 1;
  }
}
