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

  /* Un fallo de RED revienta aquí, antes de que el Worker conteste, así
     que no pasa por el mapa de mensajes de arriba: lo que sale es el
     texto del navegador —«Failed to fetch», «Load failed»—, en inglés
     y sin sentido para quien lo lee. Antes no se veía porque los otros
     encargos se lo tragaban en un console.warn; el chat de la mascota
     lo pinta en la conversación, delante de una niña. */
  let r;
  try {
    r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ intent, text }),
    });
  } catch {
    throw fallo('sin-red', 'No hay conexión con el asistente. Inténtalo en un rato.');
  }

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw fallo(data.error, MESSAGES[data.error] || data.message || 'No se pudo consultar.');
  }
  return data;
}

/* EL CÓDIGO VIAJA CON EL MENSAJE, y no en lugar de él.
   `MESSAGES` traduce a un español correcto para un aviso de Ajustes,
   que es donde nació. Pero el chat de la mascota necesita decir lo
   mismo con OTRA voz —debajo de su nombre, «Esa consulta no está
   permitida» la convierte en una ventanilla—, y para elegir la frase
   hay que saber QUÉ falló, no cómo se cuenta. Traducir aquí y tirar el
   código dejaba a quien llama con una cadena de texto y nada más. */
function fallo(codigo, mensaje) {
  const e = new Error(mensaje);
  e.codigo = codigo || 'desconocido';
  return e;
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
  return recommendWith(texto);
}

/**
 * El mismo encargo, con el texto ya escrito por quien llama.
 *
 * Lo usa la pantalla de «acabo de terminar un libro» (#64), que tiene
 * algo que decir que esta función no sabría: cuántas estrellas le
 * acabas de dar y, si fueron pocas, que se aleje de ese estilo. Sin
 * esto habría que meter el caso particular aquí dentro, y este módulo
 * volvería a saber de pantallas.
 *
 * Lo que viaja sigue siendo lo mismo —títulos, autores y puntuaciones,
 * nunca notas ni citas—, así que el aviso de privacidad sigue siendo
 * cierto. Si algún día se manda algo más, WHAT_WE_SEND cambia con ello.
 */
export async function recommendWith(texto) {
  const out = await call('recommend', texto);
  return out.sugerencias || [];
}

/* ── QUÉ SE MANDA, EXACTAMENTE ────────────────────────────────
   Vive aquí, al lado del código que lo manda, para que no se separen.
   Lo pinta la pantalla de consentimiento y también los ajustes. */
export const WHAT_WE_SEND = [
  {
    que: 'Ordenar mis notas',
    manda: 'Las notas de lectura que tú elijas, tal como las escribiste, para '
         + 'que las agrupe. Vuelven agrupadas por número: el asistente no '
         + 'reescribe ni una frase, así que el borrador es tuyo entero.',
  },
  {
    que: '¿Me lo leo?',
    manda: 'El título y el autor de ese libro. Nada más.',
  },
  {
    que: 'Qué leer después',
    manda: 'Hasta 25 títulos y autores que has marcado como leídos, '
         + 'con la puntuación que les diste, y hasta 25 de los pendientes. '
         + 'Al terminar un libro, también el que acabas de terminar y sus estrellas.',
  },
  {
    que: 'Foto de una portada',
    manda: 'El texto que el móvil lee de la portada, y solo cuando ningún '
         + 'catálogo reconoce el libro. Nunca la foto.',
  },
  {
    que: 'Hablar con la mascota',
    manda: 'Lo que le escribes, tal cual, y el título y el autor del libro que '
         + 'estás leyendo. Nunca tu nombre, tu correo, tus notas ni tus reseñas — '
         + 'ni el nombre que le hayas puesto a ella.',
  },
];

/* ── HABLAR CON LA MASCOTA  ·  historia #44 ──────────────────────
   El único encargo donde el texto lo escribe la lectora con sus
   palabras. Va con dos cuidados que los otros no necesitan:

   · SE MANDA EL LIBRO, NO A QUIEN LO LEE. Ni su nombre, ni el que le
     haya puesto a la mascota: un nombre propio en el texto es lo
     primero que un modelo repite, y aquí quien pregunta puede ser una
     niña. La mascota suena cercana por lo que sabe de tu lectura, no
     por llamarte por tu nombre.

   · Y AQUÍ EL FALLO SÍ SUBE. Los demás encargos devuelven null y
     siguen —que el agente no conteste no puede romper añadir un
     libro—. Este es una conversación: alguien acaba de escribir algo
     y espera respuesta, así que un «no pude» tiene que poder decirse
     en la propia conversación. Callarse sería lo peor de los dos
     mundos. */
export async function petChat(pregunta, { libro = null } = {}) {
  const texto = String(pregunta || '').trim();
  if (!texto) return null;

  const contexto = libro
    ? `LEYENDO: ${libro.title}${libro.author ? ` — ${libro.author}` : ''}`
    : 'LEYENDO: nada ahora mismo';

  const r = await call('pet_chat', `${contexto}\nPREGUNTA: ${texto}`);
  return r?.dice || null;
}

/* ── ORDENAR MIS NOTAS  ·  historia #74 ──────────────────────────
   Se le mandan las notas NUMERADAS y vuelve el agrupamiento por
   números. El borrador lo arma posts-core con el texto de quien
   escribió: aquí no vuelve ni una frase suya.

   Devuelve null si algo falla, como los demás: que el asistente no
   conteste nunca puede romper el escribir. */
export async function orderNotes(notas = []) {
  const lista = (Array.isArray(notas) ? notas : [])
    .map((n) => String(n ?? '').trim()).filter(Boolean);
  if (lista.length < 2) return null;

  const numeradas = lista.map((n, i) => `${i}. ${n}`).join('\n');
  try {
    const r = await call('order_notes', numeradas);
    if (r?.fuera_de_tema) return null;
    return {
      secciones: Array.isArray(r?.secciones) ? r.secciones : [],
      titulos: Array.isArray(r?.titulos) ? r.titulos : [],
    };
  } catch (e) {
    if (isDenied(e)) throw e;
    console.warn('No se pudieron ordenar las notas:', e);
    return null;
  }
}
