/* ─────────────────────────────────────────────────────────────
   CLIENTE DEL AGENTE

   Habla con el Worker de Cloudflare, nunca con DeepSeek directamente.
   La key vive allí; aquí no hay ninguna.

   Si el Worker no está desplegado, la app funciona igual: el agente
   es un último recurso, no un requisito. Todo lo que hace falta para
   añadir un libro lo resuelven OpenLibrary y Google Books.

   Para activarlo: despliega worker/ y pega su URL abajo.
   ───────────────────────────────────────────────────────────── */

import { currentUser } from './auth.js';
import { settings, updateSettings } from './store.js';

/** URL del Worker desplegado. Vacía = el agente está apagado. */
const WORKER_URL = '';

/** ¿Se puede usar el agente ahora mismo? */
export const agentAvailable = () => Boolean(workerUrl()) && settings().agentEnabled === true;

/** Permite configurarlo desde ajustes sin tocar el código. */
export const workerUrl = () => settings().agentUrl || WORKER_URL;
export const setWorkerUrl = (url) => updateSettings({ agentUrl: String(url || '').trim() });
export const setAgentEnabled = (on) => updateSettings({ agentEnabled: !!on });

const MESSAGES = {
  'sin-sesion': 'La sesión caducó. Vuelve a entrar.',
  'limite-diario': 'Llegaste al límite de consultas de hoy. Se renueva mañana.',
  'intent-no-permitido': 'Esa consulta no está permitida.',
  'proveedor': 'El servicio no respondió. Inténtalo más tarde.',
  'origin': 'Este dominio no está autorizado en el Worker.',
};

async function call(intent, text) {
  const url = workerUrl();
  if (!url) throw new Error('El agente no está configurado.');

  const user = currentUser();
  if (!user) throw new Error('Necesitas iniciar sesión.');
  const token = await user.getIdToken();

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ intent, text }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(MESSAGES[data.error] || data.message || 'No se pudo consultar.');
  return data;
}

/**
 * Último recurso: identificar un libro desde el texto sucio de una
 * portada, cuando ningún catálogo lo reconoció.
 *
 * Devuelve `null` en vez de lanzar: que el agente falle nunca debe
 * romper el flujo de añadir un libro a mano.
 */
export async function identifyFromCoverText(ocrText) {
  if (!agentAvailable()) return null;
  try {
    const out = await call('identify_book', ocrText);
    if (!out.title || out.confidence < 0.4) return null;
    return { title: out.title, author: out.author || '', confidence: out.confidence };
  } catch (e) {
    console.warn('El agente no pudo identificar la portada:', e.message);
    return null;
  }
}
