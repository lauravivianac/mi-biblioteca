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

   ───────────────────────────────────────────────────────────── */

import { currentUser } from './auth.js';
import { settings, updateSettings } from './store.js';

/**
 * La dirección del Worker de ESTE despliegue.
 *
 * Va aquí, en el código, y no en los ajustes de cada persona: es una
 * propiedad del despliegue, no de la usuaria. Pedírsela a cada quien
 * significaría que nadie salvo quien montó el Worker tendría agente
 * —y que para tenerlo habría que explicarle a la gente qué es un
 * Worker de Cloudflare, que es exactamente lo que una app no debe
 * hacer.
 *
 * No es un secreto: es una dirección pública. Lo que la protege es
 * lo que hay detrás — token de Firebase válido, origen permitido,
 * lista blanca de encargos y límite diario. Quien la copie no
 * consigue nada sin una cuenta de esta app.
 *
 * Si haces tu propio despliegue, cambia esta línea por la tuya.
 * Vacía = no hay agente, y la app funciona igual sin él.
 */
const WORKER_URL = 'https://mi-biblioteca-agente.iafactory.workers.dev';

export const workerUrl = () => WORKER_URL;

/* ── EL CONSENTIMIENTO  ·  historia #61 ───────────────────────
   Tres estados, no dos: sin decidir, sí y no.

   La diferencia importa. Antes el agente venía encendido, y eso
   significaba que alguien empezaba a usar la app mandando datos suyos
   a un servicio de terceros sin haber dicho que sí. Que sea cómodo no
   lo vuelve consentido.

   Sin decidir NO es que sí: los botones se ven —si no, nadie
   descubriría la función— pero no se manda nada hasta que hay un sí
   explícito. Se pregunta al tocar el botón, que es cuando se entiende
   para qué es, y no al registrarse, que es cuando nadie lee. */

/** ¿Se le enseña el agente a esta persona? Sí, salvo que dijera que no. */
export const agentOffered = () => Boolean(WORKER_URL) && settings().agentConsent !== 'no';

/** ¿Se le puede MANDAR algo? Solo con un sí explícito. */
export const agentAvailable = () => Boolean(WORKER_URL) && settings().agentConsent === 'si';

/** ¿Ya contestó alguna vez? */
export const agentDecided = () => ['si', 'no'].includes(settings().agentConsent);

export const setAgentConsent = (si) => updateSettings({ agentConsent: si ? 'si' : 'no' });

/* Quién pregunta. Lo enchufa main.js con la pantalla de screens.js,
   para no atar este módulo a la interfaz. */
let askConsent = async () => false;
export const setConsentPrompt = (fn) => { askConsent = fn; };

/** Se lanza cuando no hay permiso. No es un error que haya que enseñar. */
const DENEGADO = 'agente-no-autorizado';
export const isDenied = (e) => e?.message === DENEGADO;

const MESSAGES = {
  'sin-sesion': 'La sesión caducó. Vuelve a entrar.',
  'limite-diario': 'Llegaste al límite de consultas de hoy. Se renueva mañana.',
  'presupuesto-agotado': 'El agente agotó su presupuesto de este mes. Vuelve el mes que viene — '
    + 'todo lo demás de la app sigue funcionando igual.',
  'intent-no-permitido': 'Esa consulta no está permitida.',
  'fuera-de-tema': 'El agente solo habla de libros.',
  'proveedor': 'El servicio no respondió. Inténtalo más tarde.',
  'origin': 'Este dominio no está autorizado en el Worker.',
};

async function call(intent, text) {
  const url = workerUrl();
  if (!url) throw new Error('El agente no está configurado.');

  /* La puerta, y una sola. Ponerla aquí y no en cada pantalla
     significa que un encargo nuevo no puede saltársela por descuido:
     todo lo que sale de la app pasa por esta función. */
  if (!agentAvailable()) {
    if (agentDecided()) throw new Error(DENEGADO);   // ya dijo que no
    if (!await askConsent()) throw new Error(DENEGADO);
  }

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
  /* OJO al cambiar esto: lo que se manda aquí está descrito palabra
     por palabra en el aviso de privacidad (WHAT_WE_SEND). Si cambia
     lo uno, cambia lo otro — un aviso desactualizado es peor que no
     tenerlo, porque promete. */
  const linea = (b) => `${b.title} — ${b.author}${b.rating ? ` (${b.rating}/5)` : ''}`;
  const texto = [
    'LEÍDOS:', ...read.slice(0, 25).map(linea),
    'PENDIENTES (no los repitas):', ...pending.slice(0, 25).map((b) => `${b.title} — ${b.author}`),
  ].join('\n');
  const out = await call('recommend', texto);
  return out.sugerencias || [];
}

/* ── QUÉ SE MANDA, EXACTAMENTE ────────────────────────────────
   Vive aquí, al lado del código que lo manda, para que no se separen.
   Lo pinta la pantalla de consentimiento y también los ajustes. */
export const WHAT_WE_SEND = [
  {
    que: '¿Me lo leo?',
    manda: 'El título y el autor de ese libro. Nada más.',
  },
  {
    que: 'Qué leer después',
    manda: 'Hasta 25 títulos y autores que has marcado como leídos, '
         + 'con la puntuación que les diste, y hasta 25 de los pendientes.',
  },
  {
    que: 'Foto de una portada',
    manda: 'El texto que el móvil lee de la portada, y solo cuando ningún '
         + 'catálogo reconoce el libro. Nunca la foto.',
  },
];
