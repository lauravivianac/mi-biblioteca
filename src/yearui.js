/* ─────────────────────────────────────────────────────────────
   TU AÑO EN LIBROS · la pantalla  ·  historia #71

   La nota de la historia dice que merece cuidado visual real y no una
   pantalla de estadísticas, y eso decide la forma: una tarjeta a
   pantalla completa cada vez, que se pasa. No una lista con seis
   números uno debajo de otro.

   Se pasa con el dedo o con los puntos de abajo, y cada tarjeta pinta
   UNA sola cosa grande. Si hay que entrecerrar los ojos para leerla,
   no se va a compartir.
   ───────────────────────────────────────────────────────────── */

import { allBooks, statusOf, ratingOf, entry, readingDays } from './store.js';
import { yearReview, yearCards, yearsWithBooks } from './year-core.js';
import { $, esc, closeSheet, openSheet } from './ui.js';
import { openShare } from './shareui.js';

let anio = new Date().getFullYear();
let indice = 0;
let tarjetas = [];

const conEstado = () => allBooks().map((b) => ({
  ...b,
  status: statusOf(b.id),
  rating: ratingOf(b.id),
  finishedAt: entry(b.id).finishedAt || null,
}));

export function openYear(year) {
  anio = year ?? new Date().getFullYear();
  indice = 0;
  cargar();
  openSheet('year-overlay');
}

export function closeYear(e) {
  if (e && e.target !== $('year-overlay')) return;
  closeSheet('year-overlay');
}

function cargar() {
  const r = yearReview(conEstado(), { year: anio, readingDays: readingDays() });
  tarjetas = yearCards(r);
  indice = Math.min(indice, tarjetas.length - 1);
  pintar();
}

export function yearGo(i) {
  if (i < 0 || i >= tarjetas.length) return;
  indice = i;
  pintar();
}

export const yearNext = () => yearGo(indice + 1);
export const yearPrev = () => yearGo(indice - 1);

/** Presumir del año entero  ·  historia #92 */
export function shareYear() {
  const r = yearReview(conEstado(), { year: anio, readingDays: readingDays() });
  openShare('anio', {
    anio: r.anio, leidos: r.leidos, paginas: r.paginas,
    generosDistintos: r.generosDistintos, rachaMasLarga: r.rachaMasLarga,
    enCurso: r.enCurso,
  });
}

export function setYearReview(y) {
  anio = Number(y);
  indice = 0;
  cargar();
}

function pintar() {
  const cuerpo = $('year-body');
  if (!cuerpo) return;

  const anios = yearsWithBooks(conEstado());
  const c = tarjetas[indice];
  if (!c) { cuerpo.innerHTML = ''; return; }

  cuerpo.innerHTML = `
    ${anios.length > 1 ? `
      <div class="filter-scroll year-picker">
        ${anios.map((y) => `
          <div class="chip ${y === anio ? 'active' : ''}" onclick="setYearReview(${y})">${y}</div>
        `).join('')}
      </div>` : ''}

    <div class="ycard ycard-${c.id}" onclick="yearNext()">
      <div class="ycard-kicker">${esc(c.kicker)}</div>
      <div class="ycard-title">${esc(c.titulo)}</div>
      <div class="ycard-text">${esc(c.texto)}</div>
      ${c.lista ? `
        <ul class="ycard-list">
          ${c.lista.map((g) => `<li><span>${esc(g.genre)}</span><span>${g.n}</span></li>`).join('')}
        </ul>` : ''}
    </div>

    <div class="ydots">
      ${tarjetas.map((t, i) => `
        <button class="ydot ${i === indice ? 'on' : ''}" aria-label="Tarjeta ${i + 1}"
                onclick="yearGo(${i})"></button>`).join('')}
    </div>

    <div class="store-actions" style="justify-content:space-between">
      <button class="btn-mini" onclick="yearPrev()" ${indice === 0 ? 'disabled' : ''}>← Antes</button>
      <button class="btn-mini" onclick="yearNext()" ${indice === tarjetas.length - 1 ? 'disabled' : ''}>Siguiente →</button>
    </div>

    <button class="btn-magic full" onclick="shareYear()" style="margin-top:6px">
      ✦ Presumir de tu año
    </button>`;
}
