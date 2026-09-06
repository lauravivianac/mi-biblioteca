/* ─────────────────────────────────────────────────────────────
   AL TERMINAR UN LIBRO  ·  historia #64

   El momento de mayor intención de toda la app. Hasta ahora marcabas
   «Leído» y no pasaba nada: justo cuando estás más abierta a lo
   siguiente, la app se quedaba callada.

   Dos pasos, y en este orden:

     1. ¿Qué tal estuvo?  — las estrellas primero, porque son la
        señal que decide todo lo demás. Pedirlas después de sugerir
        sería sugerir a ciegas.
     2. Qué leer ahora    — de tus pendientes, al instante, y
        descubrimientos nuevos si el agente está encendido.

   Lo local manda. Los descubrimientos se añaden cuando llegan, pero
   la pantalla nunca espera por ellos ni depende de que existan.
   ───────────────────────────────────────────────────────────── */

import {
  allBooks, findBook, statusOf, ratingOf, updateEntry, addBook, settings, updateSettings,
} from './store.js';
import { suggestOwn, promptFor, dismissKey } from './suggest-core.js';
import { recommendWith, agentAvailable, isDenied } from './agent.js';
import { verifySuggestion } from './booklookup.js';
import { MONTH_ORDER } from './seed.js';
import { $, esc, toast, closeSheet } from './ui.js';
import { refreshAll, openDetail } from './views.js';

let libro = null;          // el que se acaba de terminar
let paso = 'estrellas';
let propias = [];
let nuevas = [];
let casillas = [];         // los descubrimientos en el orden que los propuso el agente

/* Sube cada vez que se abre la hoja. Una búsqueda de descubrimientos
   puede tardar diez segundos; si para entonces has cerrado y terminado
   otro libro, los resultados de la anterior no deben pintarse encima. */
let turno = 0;

/** Lo descartado se recuerda para siempre: «no volver a verla». */
const descartadas = () => settings().dismissedSuggestions || [];

/* ── ABRIR ───────────────────────────────────────────────────── */

export function celebrateFinished(bookId) {
  libro = findBook(bookId);
  if (!libro) return;
  paso = ratingOf(bookId) ? 'sugerencias' : 'estrellas';
  propias = [];
  nuevas = [];
  casillas = [];
  turno += 1;
  pintar();
  $('done-overlay').classList.add('open');
  if (paso === 'sugerencias') cargar();
}

export function closeDone(e) {
  if (e && e.target !== $('done-overlay')) return;
  closeSheet('done-overlay');
}

/* ── PASO 1 · LAS ESTRELLAS ──────────────────────────────────── */

export function rateFinished(n) {
  if (!libro) return;
  updateEntry(libro.id, { rating: n });
  paso = 'sugerencias';
  pintar();
  cargar();
  refreshAll();
}

export function skipRating() {
  paso = 'sugerencias';
  pintar();
  cargar();
}

/* ── PASO 2 · QUÉ LEER AHORA ─────────────────────────────────── */

async function cargar() {
  const mio = turno;
  const rating = ratingOf(libro.id);

  /* De lo tuyo, al instante: sin red, sin agente, sin esperar. */
  const conEstado = allBooks().map((b) => ({ ...b, status: statusOf(b.id) }));
  propias = suggestOwn(conEstado, {
    finished: libro, rating, dismissed: descartadas(), limit: 3,
  });
  pintar();

  if (!agentAvailable()) return;

  /* Y descubrimientos nuevos, si se puede. Comprobados contra los
     catálogos como manda la historia #63: un libro que el agente se
     inventa no llega a la pantalla. */
  try {
    const pendientes = conEstado.filter((b) => ['pending', 'wished'].includes(b.status));
    const leidos = conEstado.filter((b) => b.status === 'read' && b.id !== libro.id);

    /* El encargo lo escribe suggest-core, no el agente: es el único
       sitio que sabe que estas estrellas son de HACE UN SEGUNDO y que,
       si fueron pocas, hay que pedirle que se aleje. Una lista pelada
       de libros leídos se lee como «todos me gustaron». */
    const crudas = await recommendWith(promptFor({
      finished: libro, rating, read: leidos, pending: pendientes,
    }));

    const fuera = new Set([
      ...descartadas(),
      ...conEstado.map(dismissKey),                 // lo que ya tienes no es un descubrimiento
    ]);

    /* Cada una se pinta en cuanto se comprueba, no cuando estén todas:
       un catálogo lento con UN título no puede dejar en blanco a los
       otros tres. Las casillas guardan el orden en que las propuso el
       agente, aunque lleguen desordenadas. */
    casillas = new Array(crudas.length).fill(undefined);
    await Promise.all(crudas.map(async (r, i) => {
      const real = await verifySuggestion(r).catch(() => null);
      if (mio !== turno) return;                    // ya no es esta hoja
      casillas[i] = !real || fuera.has(dismissKey(real))
        ? null
        : { ...real, porque: r.porque };
      nuevas = casillas.filter(Boolean).slice(0, 3);
      pintar();
    }));
  } catch (e) {
    if (!isDenied(e)) console.warn('No se pudieron traer descubrimientos:', e.message);
  }
}

/* ── ACCIONES DE UN TOQUE ────────────────────────────────────── */

/** Un libro tuyo: empezarlo ahora es lo que de verdad quieres hacer. */
export function readNow(bookId) {
  updateEntry(bookId, { status: 'reading', startedAt: Date.now() });
  closeSheet('done-overlay');
  refreshAll();
  openDetail(bookId);
  toast('¡A leer!');
}

/** Un descubrimiento: entra en la biblioteca como pendiente. */
export function keepNew(i) {
  const r = nuevas[i];
  if (!r) return;
  const guardado = addBook({
    title: r.title, author: r.author, genre: r.genre,
    year: null, month: null, pages: r.pages, role: '⚓ Ancla',
  });
  updateEntry(guardado.id, {
    status: 'pending',
    ...(r.cover ? { cover: r.cover } : {}),
    ...(r.isbn ? { isbn: r.isbn } : {}),
  });
  quitarNueva(r);
  pintar();
  refreshAll();
  toast(`«${r.title}» a tus pendientes`);
}

/**
 * Al plan: entra y se fija al mes que viene para que el generador no
 * lo mueva. Sin fijarlo, «al plan» sería una sugerencia más que el
 * plan puede ignorar, y el botón estaría mintiendo.
 */
export function planNew(i) {
  const r = nuevas[i];
  if (!r) return;
  const mes = MONTH_ORDER[(MONTH_ORDER.indexOf(mesActual()) + 1) % MONTH_ORDER.length];
  const guardado = addBook({
    title: r.title, author: r.author, genre: r.genre,
    year: new Date().getFullYear(), month: mes, pages: r.pages, role: '⚓ Ancla',
  });
  updateEntry(guardado.id, {
    status: 'pending', pinnedMonth: mes,
    ...(r.cover ? { cover: r.cover } : {}),
    ...(r.isbn ? { isbn: r.isbn } : {}),
  });
  quitarNueva(r);
  pintar();
  refreshAll();
  toast(`«${r.title}» al plan de ${mes}`);
}

const mesActual = () => MONTH_ORDER[new Date().getMonth()] || MONTH_ORDER[0];

/**
 * Sacar un descubrimiento de la lista.
 *
 * Se borra también de su casilla: si no, una comprobación que llegue
 * tarde recalcula la lista desde las casillas y resucita la tarjeta que
 * acabas de guardar o descartar.
 */
function quitarNueva(r) {
  const j = casillas.indexOf(r);
  if (j >= 0) casillas[j] = null;
  nuevas = nuevas.filter((x) => x !== r);
}

/** Descartar: no vuelve a aparecer nunca. */
export function dismissSuggestion(tipo, i) {
  const b = tipo === 'propia' ? propias[i] : nuevas[i];
  if (!b) return;
  updateSettings({ dismissedSuggestions: [...descartadas(), dismissKey(b)] });
  if (tipo === 'propia') propias.splice(i, 1);
  else quitarNueva(b);
  pintar();
}

/* ── PANTALLA ────────────────────────────────────────────────── */

function pintar() {
  const cuerpo = $('done-body');
  if (!cuerpo || !libro) return;
  cuerpo.innerHTML = paso === 'estrellas' ? pasoEstrellas() : pasoSugerencias();
}

function pasoEstrellas() {
  return `
    <p class="done-lede">Terminaste <strong>${esc(libro.title)}</strong>.</p>
    <p class="planner-hint">¿Qué tal estuvo? Es lo que usaremos para proponerte qué sigue.</p>
    <div class="stars-row done-stars">
      ${[1, 2, 3, 4, 5].map((i) => `<span class="star" onclick="rateFinished(${i})">★</span>`).join('')}
    </div>
    <button class="link-btn" onclick="skipRating()">Prefiero no puntuarlo</button>`;
}

function pasoSugerencias() {
  const rating = ratingOf(libro.id);
  const mala = rating > 0 && rating <= 2;

  return `
    <p class="done-lede">
      Terminaste <strong>${esc(libro.title)}</strong>${rating ? ` · ${'★'.repeat(rating)}` : ''}
    </p>
    <p class="planner-hint">
      ${mala
        ? 'Apuntado. Te proponemos algo <strong>distinto</strong> a esto.'
        : 'Esto es lo que te propondría ahora mismo.'}
    </p>

    ${propias.length ? `
      <div class="store-shelf-label">De los tuyos</div>
      ${propias.map((b, i) => tarjeta(b, `
        <button class="btn-magic btn-sug" onclick="readNow('${b.id}')">Empezarlo</button>
        <button class="btn-mini" onclick="dismissSuggestion('propia',${i})">No, gracias</button>`)).join('')}
    ` : `<p class="planner-hint">No te queda nada pendiente que encaje. Buen momento para añadir algo con ＋.</p>`}

    ${nuevas.length ? `
      <div class="store-shelf-label">Descubrimientos</div>
      ${nuevas.map((b, i) => tarjeta(b, `
        <button class="btn-ghost btn-sug" onclick="keepNew(${i})">＋ Pendientes</button>
        <button class="btn-magic btn-sug" onclick="planNew(${i})">✦ Al plan</button>
        <button class="btn-mini" onclick="dismissSuggestion('nueva',${i})">No</button>`)).join('')}
    ` : agentAvailable() ? '<p class="planner-hint" id="done-cargando">Buscando descubrimientos…</p>' : ''}

    <button class="btn-ghost full" onclick="closeSheet('done-overlay')" style="margin-top:14px">
      Ahora no
    </button>`;
}

function tarjeta(b, acciones) {
  return `
    <div class="sug">
      <div class="sug-head">
        ${b.cover
          ? `<img class="sug-cover" src="${esc(b.cover)}" alt="" loading="lazy">`
          : '<div class="sug-cover sug-cover-ph">📕</div>'}
        <div class="sug-info">
          <div class="sug-title">${esc(b.title)}</div>
          <div class="sug-author">${esc(b.author)}${b.pages && b.pages !== '—' ? ` · ${esc(b.pages)} págs.` : ''}</div>
        </div>
      </div>
      ${b.porque ? `<p class="sug-why">${esc(b.porque)}</p>` : ''}
      <div class="sug-actions">${acciones}</div>
    </div>`;
}
