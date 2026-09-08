/* ─────────────────────────────────────────────────────────────
   EL FEED · la pantalla  ·  historia #49

   «Descubrir libros por gente y no por algoritmo». Por eso es una
   lista por fecha y punto: sin destacados, sin reordenar por interés,
   sin «quizá te perdiste». Lo último, arriba.

   LO QUE HACE ÚTIL AL FEED ES EL BOTÓN DE AÑADIR. Ver que alguien
   terminó un libro y tener que ir a buscarlo a mano es donde se pierde
   la gente: la historia pide poder tocarlo y que caiga en pendientes
   de una vez, y eso es lo que hace que el feed sirva para algo en vez
   de ser una lista de cosas bonitas que no llevan a ninguna parte.
   ───────────────────────────────────────────────────────────── */

import { loadFeed } from './social.js';
import { allBooks, addBook, updateEntry, findBook } from './store.js';
import { activityLine, cuandoTexto, estadoVacio } from './feed-core.js';
import { inicial } from './profile-core.js';
import { misBloqueos } from './moderation.js';
import { filtrarFuera } from './moderation-core.js';
import { $, esc, toast } from './ui.js';
import { refreshAll } from './views.js';
import { ico } from './icons.js';

let entradas = [];
let siguiendo = 0;
let hayMas = false;
let cargando = false;
let turno = 0;

/** Pintar el feed. Se llama al entrar en la pestaña. */
export async function renderFeed() {
  const cuerpo = $('feed-body');
  if (!cuerpo) return;
  const mio = ++turno;

  if (!entradas.length) cuerpo.innerHTML = '<p class="planner-hint">Cargando…</p>';
  const r = await loadFeed();
  if (mio !== turno) return;

  /* Lo de quien bloqueaste o silenciaste no llega a la pantalla. La
     regla del servidor impide que te escriban; esto es la otra mitad:
     que tú no las veas. */
  entradas = filtrarFuera(r.entradas, misBloqueos());
  siguiendo = r.siguiendo;
  hayMas = r.hayMas;
  pintar();
}

export async function moreFeed() {
  if (cargando || !hayMas || !entradas.length) return;
  cargando = true;
  const ultima = entradas[entradas.length - 1];
  const r = await loadFeed({ antesDe: ultima.at });
  cargando = false;
  /* Nada nuevo: se apaga el botón en vez de dejarlo pidiendo lo mismo. */
  if (!r.entradas.length) { hayMas = false; pintar(); return; }
  const vistos = new Set(entradas.map((e) => e.id));
  entradas = [...entradas, ...r.entradas.filter((e) => !vistos.has(e.id))];
  hayMas = r.hayMas;
  pintar();
}

function pintar() {
  const cuerpo = $('feed-body');
  if (!cuerpo) return;

  const vacio = estadoVacio({ siguiendo, entradas: entradas.length });
  if (vacio) {
    cuerpo.innerHTML = `
      <div class="empty">
        <div class="empty-rune">${ico('fichas', 'ico-lg')}</div>
        <div class="empty-text">${esc(vacio.titulo)}</div>
      </div>
      <p class="set-fineprint" style="text-align:center">${esc(vacio.texto)}</p>
      <button class="btn-magic full" style="margin-top:14px" onclick="openPeople()">
        🔍 Encontrar quién más lee
      </button>`;
    return;
  }

  cuerpo.innerHTML = `
    ${entradas.map(tarjeta).join('')}
    ${hayMas ? `<button class="btn-ghost full" style="margin-top:10px" onclick="moreFeed()">
      Ver más
    </button>` : '<p class="set-fineprint" style="text-align:center">No hay nada más por ahora.</p>'}`;
}

function tarjeta(a) {
  const yaLoTengo = !!miLibro(a);
  return `
    <div class="feed-card">
      <div class="feed-head" onclick="openProfile('${esc(a.username || '')}')">
        <div class="pers-avatar feed-avatar">${esc(inicial(a.name || a.username))}</div>
        <div class="feed-who">
          <div class="feed-line">${esc(activityLine(a))}</div>
          <div class="feed-when">${esc(cuandoTexto(a.at))}</div>
        </div>
      </div>

      ${a.tipo === 'logro' ? `
        <div class="feed-logro">🏆 ${esc(a.logro)}</div>`
      : `
        <div class="feed-book">
          ${a.cover
            ? `<img class="prof-cover" src="${esc(a.cover)}" alt="" loading="lazy">`
            : `<div class="prof-cover prof-cover-none">${esc(inicial(a.title))}</div>`}
          <div class="feed-book-txt">
            <div class="prof-book-title">${esc(a.title)}</div>
            <div class="prof-book-author">${esc(a.author)}</div>
            ${a.rating ? `<div class="feed-stars">${'★'.repeat(a.rating)}</div>` : ''}
          </div>
        </div>
        ${a.review ? `<p class="feed-review">${esc(a.review)}</p>` : ''}
        <button class="btn-mini feed-add ${yaLoTengo ? 'tengo' : ''}"
                onclick="addFromFeed('${esc(a.id)}')" ${yaLoTengo ? 'disabled' : ''}>
          ${yaLoTengo ? '✓ Ya está en tu biblioteca' : '+ A mis pendientes'}
        </button>`}
      ${pie(a)}
    </div>`;
}

/* Comentar y reportar van SIEMPRE juntos, en toda superficie donde se
   escriba algo. Es lo que evita acabar con un sitio donde se comenta y
   ningún botón para reportar lo que se comentó ahí. */
const pie = (a) => `
  <div class="feed-pie">
    <button class="btn-mini" onclick="openComments('${esc(a.id)}','${esc(a.uid)}')">
      💬 Comentar
    </button>
    <button class="btn-mini" onclick="openReport('resena','${esc(a.id)}','${esc(a.uid)}','${esc((a.review || a.title || '').slice(0,200))}')">
      Reportar
    </button>
  </div>`;

/** ¿Ya tengo este libro? Por id si es de la semilla, y si no por título. */
function miLibro(a) {
  if (!a) return null;
  const porId = findBook(a.bookId);
  if (porId) return porId;
  const t = String(a.title || '').toLowerCase();
  return allBooks().find((b) => String(b.title).toLowerCase() === t) || null;
}

/**
 * Añadirlo a pendientes de una vez.
 *
 * Si el libro es de los que ya viven en el código —los 73 de la
 * semilla— basta con marcarlo; si no, se crea como propio. Lo que no
 * se hace nunca es duplicar: tener «Pedro Páramo» dos veces porque lo
 * añadiste desde el feed es peor que no tener el botón.
 */
export function addFromFeed(id) {
  const a = entradas.find((x) => x.id === id);
  if (!a || a.tipo === 'logro') return;

  const ya = miLibro(a);
  if (ya) { toast('Ya lo tienes en tu biblioteca'); return; }

  const dela = findBook(a.bookId);
  if (dela) {
    updateEntry(a.bookId, { status: 'pending' });
  } else {
    const nuevo = addBook({ title: a.title, author: a.author, genre: 'Sin género', pages: null });
    updateEntry(nuevo.id, { status: 'pending', cover: a.cover || null });
  }
  toast(`«${a.title}» está en tus pendientes`);
  pintar();
  refreshAll();
}
