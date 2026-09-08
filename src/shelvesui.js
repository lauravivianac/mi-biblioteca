/* ─────────────────────────────────────────────────────────────
   LAS ESTANTERÍAS, EN SU PROPIA HOJA  ·  historias #57 y #157

     «Sería bueno sacar estanterías a ese nivel, con el botón del lado
      derecho también.»

   Estaban en dos sitios y en ninguno bien:

     · unos chips de filtro dentro de la Biblioteca, que sirven para
       filtrar pero no para VER cuáles tienes ni para tocarlas;
     · y la parte de crear, renombrar y borrar, enterrada en Ajustes,
       entre el agente y la exportación de datos.

   O sea, exactamente lo mismo que pasaba con los sitios donde leer:
   una cosa que se usa a menudo escondida detrás de una pantalla que se
   abre de vez en cuando. Ahora tiene su botón en el margen, al lado de
   los otros dos.

   LO PRIMERO ES ABRIRLA, NO ADMINISTRARLA. Al tocar una estantería la
   Biblioteca se filtra por ella y la hoja se cierra: eso es lo que se
   quiere hacer nueve de cada diez veces. Renombrar y borrar están, pero
   en pequeño y a un lado, que es el peso que les toca.
   ───────────────────────────────────────────────────────────── */

import { allShelves, shelfCounts, SUGGESTED } from './shelves.js';
import { setShelfFilter } from './views.js';
import { $, esc, openSheet, closeSheet } from './ui.js';
import { ico } from './icons.js';

export function openEstanterias() {
  openSheet('estanterias-overlay');
  pintarEstanterias();
}

export const closeEstanterias = (e) => {
  if (!e || e.target === $('estanterias-overlay')) closeSheet('estanterias-overlay');
};

/** Se llama también desde fuera, al crear o borrar una. */
export function pintarEstanterias() {
  const cuerpo = $('estanterias-body');
  if (!cuerpo) return;

  const cuenta = shelfCounts();
  const hay = allShelves();

  cuerpo.innerHTML = hay.length ? `
    <p class="set-fineprint lugares-intro">
      Toca una para ver sus libros. Un libro puede estar en varias a la vez.
    </p>
    ${hay.map((sh) => {
    const n = cuenta[sh.id] || 0;
    return `
      <div class="shelf-row" style="--shelf-rgb: var(--${sh.color}-rgb)">
        <button class="shelf-abrir" onclick="verEstanteria('${esc(sh.id)}')">
          <span class="shelf-row-emoji">${esc(sh.emoji)}</span>
          <span class="shelf-row-info">
            <span class="shelf-row-name">${esc(sh.name)}</span>
            <span class="shelf-row-count">${n} ${n === 1 ? 'libro' : 'libros'}</span>
          </span>
        </button>
        <button class="btn-mini" onclick="editShelf('${esc(sh.id)}')">Renombrar</button>
        <button class="btn-mini" onclick="deleteShelf('${esc(sh.id)}')">Borrar</button>
      </div>`;
  }).join('')}
    <button class="btn-ghost full" style="margin-top:14px" onclick="newShelfFor()">
      ＋ Nueva estantería
    </button>
    <p class="set-fineprint">Borrar una estantería no borra libros.</p>`
    : `
    <div class="empty">
      <div class="empty-rune">${ico('estanterias', 'ico-lg')}</div>
      <div class="empty-text">Todavía no tienes ninguna</div>
    </div>
    <p class="set-fineprint" style="text-align:center">
      Sirven para agrupar los libros como piensas en ellos, que casi nunca
      es por género.
    </p>
    <button class="btn-magic full" style="margin-top:14px" onclick="addSuggestedShelves()">
      Crear ${SUGGESTED.map((s) => s.emoji).join(' ')} ${SUGGESTED.map((s) => s.name).join(', ')}
    </button>
    <button class="btn-ghost full" style="margin-top:8px" onclick="newShelfFor()">
      ＋ Empezar una en blanco
    </button>`;
}

/**
 * Ver sus libros: filtra la Biblioteca y se quita de en medio.
 *
 * La hoja se cierra a propósito. Dejarla abierta encima de la lista que
 * acaba de filtrar sería tapar justo lo que se pidió ver.
 */
export function verEstanteria(id) {
  closeSheet('estanterias-overlay');
  /* Se toca la pestaña de la Biblioteca en vez de reimplementar el
     cambio de vista: `nav` vive en main.js y no se exporta, y copiar
     aquí lo que hace —quitar clases, poner otras, repintar— es tener
     dos sitios que se separan a la primera. Desde la pestaña del Plan,
     filtrar sin cambiar de vista habría filtrado una lista que no se
     está mirando. */
  document.querySelector('.nav-item[onclick*="biblioteca"]')?.click();
  setShelfFilter(id);
}
