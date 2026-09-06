/* ─────────────────────────────────────────────────────────────
   ¿CUÁL PRIMERO? · la pantalla  ·  historia #60

   Eliges dos pendientes y la app dice cuál abrir esta noche, con sus
   razones y las del otro. Y desde ahí se puede actuar de una vez:
   empezarlo, o reordenar el plan para que el ganador caiga en este
   mes y el otro en el siguiente.

   Todo local. No hace falta agente ni conexión: lo que decide son tu
   ritmo, el mes que te queda y de qué vienes —tres cosas que la app
   ya sabe y que un modelo de lenguaje no sabría—.
   ───────────────────────────────────────────────────────────── */

import {
  allBooks, statusOf, entry, findBook, updateEntry, coverOf,
} from './store.js';
import { readingPace } from './planner.js';
import { myTaste, scoreByTaste } from './taste.js';
import { compareBooks, roomLeft, densityOf } from './duel-core.js';
import { placeInMonth } from './gaps.js';
import { MONTH_ORDER } from './seed.js';
import { $, esc, toast, closeSheet } from './ui.js';
import { refreshAll, openDetail } from './views.js';

let elegidos = [];
let busqueda = '';
let veredicto = null;

const PROPONIBLE = new Set(['pending', 'wished']);

const pendientes = () => allBooks()
  .map((b) => ({ ...b, status: statusOf(b.id) }))
  .filter((b) => PROPONIBLE.has(b.status));

/** El último que terminaste: es «de qué vienes». */
function ultimoLeido() {
  return allBooks()
    .filter((b) => statusOf(b.id) === 'read' && entry(b.id).finishedAt)
    .sort((a, b) => entry(b.id).finishedAt - entry(a.id).finishedAt)[0] || null;
}

export function openDuel() {
  elegidos = [];
  busqueda = '';
  veredicto = null;
  pintar();
  $('duel-overlay').classList.add('open');
}

export function closeDuel(e) {
  if (e && e.target !== $('duel-overlay')) return;
  closeSheet('duel-overlay');
}

export function searchDuel(texto) {
  busqueda = texto;
  pintarLista();
}

export function pickDuel(id) {
  if (elegidos.includes(id)) elegidos = elegidos.filter((x) => x !== id);
  else if (elegidos.length < 2) elegidos = [...elegidos, id];
  else elegidos = [elegidos[1], id];      // el tercero sustituye al más viejo
  veredicto = null;
  pintar();
}

export function compareNow() {
  const [a, b] = elegidos.map((id) => pendientes().find((x) => x.id === id));
  const perfil = myTaste();
  veredicto = compareBooks(a, b, {
    vengoDe: ultimoLeido(),
    room: roomLeft({ pagesPerDay: readingPace().pagesPerDay }),
    taste: (x) => scoreByTaste(x, perfil),
  });
  pintar();
}

export function backToPick() {
  veredicto = null;
  pintar();
}

/* ── PANTALLA ────────────────────────────────────────────────── */

function pintar() {
  const cuerpo = $('duel-body');
  if (!cuerpo) return;
  cuerpo.innerHTML = veredicto ? pintarVeredicto() : pintarEleccion();
  if (!veredicto) {
    const campo = $('duel-search');
    if (campo) campo.value = busqueda;
  }
}

function pintarEleccion() {
  return `
    <p class="planner-hint">
      Elige dos de tus pendientes y te digo cuál abrir esta noche.
    </p>
    <div class="search-wrap" style="margin-bottom:12px">
      <input class="search-input" id="duel-search" placeholder="Buscar entre tus pendientes…"
             oninput="searchDuel(this.value)">
    </div>
    <div id="duel-list">${listaHtml()}</div>
    <button class="btn-magic full" ${elegidos.length === 2 ? '' : 'disabled'}
            onclick="compareNow()" style="margin-top:14px">
      ${elegidos.length === 2 ? '⚖ ¿Cuál primero?' : `Elige ${2 - elegidos.length} más`}
    </button>`;
}

function pintarLista() {
  const lista = $('duel-list');
  if (lista) lista.innerHTML = listaHtml();
}

function listaHtml() {
  const q = busqueda.trim().toLowerCase();
  const todos = pendientes();
  const vistos = q
    ? todos.filter((b) => `${b.title} ${b.author}`.toLowerCase().includes(q))
    : todos;

  if (!vistos.length) {
    return `<p class="planner-hint">${todos.length
      ? 'Ninguno de tus pendientes se llama así.'
      : 'No tienes pendientes que comparar. Añade alguno con ＋.'}</p>`;
  }

  /* Los elegidos van arriba SIEMPRE, los filtre la búsqueda o no.
     Con 70 pendientes eliges el primero, escribes el título del
     segundo… y el primero desaparecía de la pantalla: seguía elegido,
     pero no había forma de verlo ni de quitarlo sin borrar la
     búsqueda. Lo que tú elegiste no lo esconde un filtro. */
  const puestos = elegidos
    .map((id) => todos.find((b) => b.id === id))
    .filter(Boolean);
  const orden = [
    ...puestos,
    ...vistos.filter((b) => !elegidos.includes(b.id)),
  ];

  /* La lista se corta, porque 70 tarjetas no se recorren con el pulgar.
     Pero cortarla en silencio es peor: buscas un libro que sí tienes, no
     está, y no hay nada que te diga que el buscador de arriba lo
     encontraría. Así que se dice cuántos faltan. */
  const TOPE = 40;
  const sobran = orden.length - TOPE;

  return orden.slice(0, TOPE).map((b) => `
    <button class="duel-pick ${elegidos.includes(b.id) ? 'on' : ''}" onclick="pickDuel('${b.id}')">
      ${coverOf(b.id)
        ? `<img class="duel-cover" src="${esc(coverOf(b.id))}" alt="" loading="lazy">`
        : '<span class="duel-cover duel-cover-ph">📕</span>'}
      <span class="duel-info">
        <span class="duel-title">${esc(b.title)}</span>
        <span class="duel-meta">${esc(b.author)} · ${esc(b.pages)} págs.${b.month ? ` · plan de ${b.month}` : ''}</span>
      </span>
      <span class="duel-check">${elegidos.includes(b.id) ? '✓' : ''}</span>
    </button>`).join('')
    + (sobran > 0
      ? `<p class="planner-hint">Y ${sobran} más. Si no ves el que buscas, escríbelo arriba.</p>`
      : '');
}

function pintarVeredicto() {
  const [a, b] = elegidos.map((id) => pendientes().find((x) => x.id === id));
  if (!veredicto || !a || !b) return '<p class="planner-hint">Se perdió la comparación. Vuelve a elegir.</p>';

  if (veredicto.empate) {
    return `
      <p class="duel-verdict">${esc(veredicto.resumen)}</p>
      <div class="duel-sides">
        ${ladoHtml(a, veredicto.porA)}
        ${ladoHtml(b, veredicto.porB)}
      </div>
      <button class="btn-ghost full" onclick="backToPick()" style="margin-top:14px">← Elegir otros</button>`;
  }

  const g = veredicto.ganador;
  const p = veredicto.perdedor;
  const mes = MONTH_ORDER[new Date().getMonth()];
  const siguiente = MONTH_ORDER[(new Date().getMonth() + 1) % 12];

  return `
    <p class="duel-verdict">✦ ${esc(veredicto.resumen)}</p>

    <div class="sug">
      <div class="sug-head">
        ${coverOf(g.id)
          ? `<img class="sug-cover" src="${esc(coverOf(g.id))}" alt="" loading="lazy">`
          : '<div class="sug-cover sug-cover-ph">📕</div>'}
        <div class="sug-info">
          <div class="sug-title">${esc(g.title)}</div>
          <div class="sug-author">${esc(g.author)} · ${esc(g.pages)} págs.</div>
        </div>
      </div>
      <ul class="duel-reasons">
        ${veredicto.aFavor.map((t) => `<li>${esc(t)}</li>`).join('')}
      </ul>
    </div>

    ${veredicto.enContra.length ? `
      <div class="duel-against">
        <div class="duel-against-title">A favor de ${esc(p.title)}:</div>
        <ul class="duel-reasons">
          ${veredicto.enContra.map((t) => `<li>${esc(t)}</li>`).join('')}
        </ul>
      </div>` : ''}

    <button class="btn-magic full" onclick="startWinner()" style="margin-top:14px">
      Empezar ${esc(g.title)}
    </button>
    <button class="btn-ghost full" onclick="applyDuelOrder()" style="margin-top:8px">
      ✦ Reordenar el plan: ${esc(mes)} y ${esc(siguiente)}
    </button>
    <button class="link-btn" onclick="backToPick()">Elegir otros dos</button>`;
}

function ladoHtml(libro, razones) {
  return `
    <div class="duel-side">
      <div class="duel-side-title">${esc(libro.title)}</div>
      ${razones.length
        ? `<ul class="duel-reasons">${razones.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
        : '<p class="duel-side-none">Nada a su favor en concreto</p>'}
      <button class="btn-mini" onclick="startBook('${libro.id}')">Empezar este</button>
    </div>`;
}

/* ── ACCIONES ────────────────────────────────────────────────── */

export function startBook(id) {
  updateEntry(id, { status: 'reading', startedAt: Date.now() });
  closeSheet('duel-overlay');
  refreshAll();
  openDetail(id);
  toast('¡A leer!');
}

export function startWinner() {
  if (veredicto?.ganador) startBook(veredicto.ganador.id);
}

/**
 * Reordenar el plan de una vez, que es lo que pide la historia.
 *
 * El ganador a este mes y el otro al siguiente, los dos FIJADOS: sin
 * fijarlos, el generador podría deshacerlo en cuanto se ejecute, y
 * «aplicar la sugerencia» habría durado hasta el próximo plan.
 */
export function applyDuelOrder() {
  if (!veredicto?.ganador) return;
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = MONTH_ORDER[hoy.getMonth()];
  const siguiente = MONTH_ORDER[(hoy.getMonth() + 1) % 12];
  const anioSiguiente = hoy.getMonth() === 11 ? anio + 1 : anio;

  placeInMonth(veredicto.ganador.id, anio, mes);
  placeInMonth(veredicto.perdedor.id, anioSiguiente, siguiente);

  closeSheet('duel-overlay');
  refreshAll();
  toast(`${veredicto.ganador.title} en ${mes}, ${veredicto.perdedor.title} en ${siguiente}`);
}

export { densityOf };
