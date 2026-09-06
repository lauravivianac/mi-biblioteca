/* ─────────────────────────────────────────────────────────────
   LLENAR UN HUECO · la pantalla  ·  historia #65

   Se abre desde el mes vacío del plan, que hasta esta historia ni
   siquiera se pintaba.

   Dos detalles que la historia pide con esas palabras:

     · «puedo pedir otras opciones» — y eso significa que las que ya
       viste no vuelven a salir, no que se baraje otra vez la misma
       mano. Si al pedir otras te salen dos de las mismas, el botón
       está mintiendo.

     · «puedo aceptar una sugerencia y queda colocada en ese mes» —
       colocada Y fijada, o el generador la movería la próxima vez y
       «queda» duraría hasta el siguiente plan.
   ───────────────────────────────────────────────────────────── */

import { candidatesFor, placeInMonth, describeGap, monthlyCapacity } from './gaps.js';
import { coverOf } from './store.js';
import { $, esc, toast, closeSheet, openSheet } from './ui.js';
import { refreshAll, openDetail } from './views.js';

let mesActual = null;
let anioActual = null;
let vistas = [];          // lo ya propuesto: pedir otras es no repetir

export function openGap(month, year) {
  mesActual = month;
  anioActual = year ?? currentPlanYear();
  vistas = [];
  pintar();
  openSheet('gap-overlay');
}

/* El año que se está mirando en el plan lo sabe views.js; se pregunta
   en vez de duplicarlo, para que no puedan discrepar. */
function currentPlanYear() {
  const activo = document.querySelector('.year-btn.active');
  return Number(activo?.textContent?.trim()) || new Date().getFullYear();
}

export function closeGap(e) {
  if (e && e.target !== $('gap-overlay')) return;
  closeSheet('gap-overlay');
}

/** Otras opciones: las ya vistas quedan fuera para siempre en esta sesión. */
export function otherOptions() {
  pintar();
}

function pintar() {
  const cuerpo = $('gap-body');
  const titulo = $('gap-title');
  if (!cuerpo) return;

  const { hueco, candidatos } = candidatesFor(anioActual, mesActual, { exclude: vistas });
  if (titulo) titulo.textContent = `✦ ${mesActual} ${anioActual}`;

  if (!hueco) {
    cuerpo.innerHTML = '<p class="planner-hint">Ese mes ya no tiene hueco.</p>';
    return;
  }

  if (!candidatos.length) {
    cuerpo.innerHTML = `
      <p class="planner-hint">${esc(describeGap(hueco))}.</p>
      <p class="planner-hint">
        ${vistas.length
          ? 'No queda nada más que proponerte para este mes. Añade libros con ＋ y vuelve.'
          : 'No te queda nada pendiente que encaje aquí. Buen momento para añadir algo con ＋.'}
      </p>
      ${vistas.length ? '<button class="btn-ghost full" onclick="resetGapOptions()">Ver otra vez las anteriores</button>' : ''}`;
    return;
  }

  vistas = [...vistas, ...candidatos.map((c) => c.id)];

  cuerpo.innerHTML = `
    <p class="planner-hint">
      ${esc(describeGap(hueco))}${hueco.vacio ? ` · a tu ritmo te caben unas ${monthlyCapacity()} páginas al mes` : ''}
    </p>
    ${candidatos.map((b) => `
      <div class="sug">
        <div class="sug-head">
          ${coverOf(b.id)
            ? `<img class="sug-cover" src="${esc(coverOf(b.id))}" alt="" loading="lazy">`
            : '<div class="sug-cover sug-cover-ph">📕</div>'}
          <div class="sug-info">
            <div class="sug-title">${esc(b.title)}</div>
            <div class="sug-author">${esc(b.author)}${b.pages && b.pages !== '—' ? ` · ${esc(b.pages)} págs.` : ''}</div>
          </div>
        </div>
        <p class="sug-why">${esc(b.porque)}</p>
        <div class="sug-actions">
          <button class="btn-magic btn-sug" onclick="acceptForGap('${b.id}')">Ponerlo en ${esc(mesActual)}</button>
          <button class="btn-mini" onclick="peekGapBook('${b.id}')">Ver ficha</button>
        </div>
      </div>`).join('')}
    <button class="btn-ghost full" onclick="otherOptions()" style="margin-top:12px">
      Otras opciones
    </button>`;
}

/** Volver a empezar, cuando ya no queda nada nuevo que enseñar. */
export function resetGapOptions() {
  vistas = [];
  pintar();
}

export function acceptForGap(bookId) {
  if (!placeInMonth(bookId, anioActual, mesActual)) return;
  closeSheet('gap-overlay');
  refreshAll();
  toast(`Colocado en ${mesActual} · queda fijado`);
}

export function peekGapBook(bookId) {
  closeSheet('gap-overlay');
  openDetail(bookId);
}
