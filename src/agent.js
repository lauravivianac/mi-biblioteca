/* ─────────────────────────────────────────────────────────────
   CLIENTE DEL AGENTE

   Habla con el Worker de Cloudflare, nunca con DeepSeek directamente.
   La key vive allí; aquí no hay ninguna.

   Una sola key, en el Worker, sirviendo a toda la app: identificar
   una portada, decidir si un libro vale la pena, y qué leer después.

   Si el Worker no está desplegado la app funciona igual y sus botones
   sencillamente no aparecen. Añadir libros por título o por código de
   barras nunca pasa por aquí: eso lo resuelven OpenLibrary y Google
   Books, que son gratis y no se inventan nada.

   Para activarlo: despliega worker/ y pega su dirección en
   ⚙ Ajustes → Identificar portadas con IA.
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
  'fuera-de-tema': 'El agente solo habla de libros.',
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

/**
 * «¿Me lo leo?» · historia #48
 *
 * Lo que hace falta para decidir, no una contraportada: de qué va sin
 * destripar nada, para quién es y —lo que casi nadie escribe— para
 * quién NO. Lanza en vez de devolver null: aquí la usuaria pidió esto
 * a propósito y merece saber por qué no salió.
 */
export async function bookBrief(book) {
  const out = await call('book_brief', `${book.title} — ${book.author}`);
  if (out.desconocido) throw new Error('El agente no conoce este libro.');
  return out;
}

/**
 * Qué leer después · historia #49
 *
 * Se le manda lo LEÍDO con su puntuación y lo pendiente. Lo puntuado
 * es lo que de verdad dice qué te gusta; lo pendiente evita que
 * recomiende algo que ya está en la pila.
 */
export async function recommendFrom({ read = [], pending = [] }) {
  const linea = (b) => `${b.title} — ${b.author}${b.rating ? ` (${b.rating}/5)` : ''}`;
  const texto = [
    'LEÍDOS:', ...read.slice(0, 25).map(linea),
    'PENDIENTES (no los repitas):', ...pending.slice(0, 25).map((b) => `${b.title} — ${b.author}`),
  ].join('\n');
  const out = await call('recommend', texto);
  return out.sugerencias || [];
}
