/* ─────────────────────────────────────────────────────────────
   AÑADIR UN LIBRO  ·  historias #25, #26, #27

   Tres caminos que terminan en la MISMA ficha:
     · escribir el título, con sugerencias mientras escribes
     · apuntar la cámara a un código de barras
     · fotografiar la portada

   Cualquiera de ellos deja título, autor, páginas, portada, editorial
   y año sin teclear nada. Y siempre se puede corregir antes de guardar:
   la app propone, no impone.
   ───────────────────────────────────────────────────────────── */

import { lookupByIsbn, lookupByTitle, buscarPorTitulo, lookupByCoverText } from './booklookup.js';
import { identifyFromCoverText, agentAvailable } from './agent.js';
import {
  openCamera, closeCamera, scanBarcode, grabFrame, frameToDataUrl,
  readText,
} from './scan.js';
import { addBook, updateEntry } from './store.js';
import { GENRES, MONTH_ORDER } from './seed.js';
import { $, esc, toast, closeSheet, openSheet } from './ui.js';
import { refreshAll } from './views.js';
import { ico } from './icons.js';
import { lomoHtml } from './lomo.js';

let mode = 'titulo';       // titulo · camara · manual
let draft = null;          // el candidato elegido, antes de guardar
let searchTimer = null;
let lastQuery = '';

export function openAdd() {
  mode = 'titulo';
  draft = null;
  render();
  openSheet('add-overlay');
}

export function closeAdd(e) {
  if (e && e.target !== $('add-overlay')) return;
  closeAddSheet();
}

export function closeAddSheet() {
  pararEscaner();
  clearTimeout(searchTimer);
  closeSheet('add-overlay');
}

export function setAddMode(next) {
  if (mode === 'camara' && next !== 'camara') pararEscaner();
  mode = next;
  draft = null;
  render();
  if (next === 'camara') startCamera();
  if (next === 'titulo') setTimeout(() => $('add-query')?.focus(), 80);
}

/* ── PANTALLA ────────────────────────────────────────────────── */

function render() {
  const tab = (id, label) =>
    `<button class="auth-tab ${mode === id ? 'active' : ''}" onclick="setAddMode('${id}')">${label}</button>`;

  $('add-body').innerHTML = `
    <div class="auth-tabs">
      ${tab('titulo', 'Por título')}
      ${tab('camara', 'Con la cámara')}
      ${tab('manual', 'A mano')}
    </div>
    ${draft ? renderDraft() : { titulo: renderTitulo, camara: renderCamara, manual: renderManual }[mode]()}`;
}

function renderTitulo() {
  return `
    <div class="fg">
      <label class="flabel" for="add-query">Escribe el título</label>
      <input class="finput" id="add-query" autocomplete="off" placeholder="Cien años de soledad"
             oninput="queryBooks(this.value)" value="${esc(lastQuery)}">
    </div>
    <p class="planner-hint" id="add-hint">Buscamos en OpenLibrary y Google Books.</p>
    <div id="add-results"></div>`;
}

/* ── LA CÁMARA MIRA SOLA ─────────────────────────────────────
   «No se sabe si está viendo, tomando una foto o qué, y no encuentra
    nada.»

   Las dos mitades de la frase eran la misma cosa. Había un botón
   «Buscar código», así que la cámara estaba encendida y NO MIRABA
   hasta que lo pulsabas; y como no mira, no encuentra. Quien tiene un
   libro en una mano y el teléfono en la otra encuadra el código y
   espera, que es lo que hace cualquier lector de códigos del mundo —y
   aquí eso no hacía nada.

   Así que el botón se va. La cámara busca desde que se abre y hasta
   que se cierra, y lo DICE mientras lo hace: el marco late y debajo
   pone «Buscando el código…». Un estado que no se ve es un estado que
   no existe.

   Queda un solo botón, el de la portada, que es el otro camino de
   verdad — y ahora se lee como lo que es: la alternativa para el libro
   que no tiene código. */
function renderCamara() {
  return `
    <div class="scan-stage">
      <video id="scan-video" playsinline muted autoplay></video>
      <div class="scan-frame buscando"></div>
    </div>
    <p class="planner-hint" id="scan-hint">
      Encuadra el código de barras de la contraportada dentro del marco.
    </p>
    <div class="store-actions">
      <button class="btn-ghost full" onclick="shootCover()">
        ${ico('camara')} No tiene código: foto de la portada
      </button>
    </div>`;
}

function renderManual() {
  return `
    <div class="fg"><label class="flabel" for="f-title">Título</label>
      <input class="finput" id="f-title" placeholder="Título del libro"></div>
    <div class="fg"><label class="flabel" for="f-author">Autor</label>
      <input class="finput" id="f-author" placeholder="Nombre del autor"></div>
    ${commonFields()}
    <button class="btn-magic full" onclick="saveManual()">Agregar a mi biblioteca</button>`;
}

/** Los campos que comparten el camino manual y la confirmación. */
function commonFields(book = {}) {
  return `
    <div class="fg"><label class="flabel" for="f-genre">Género</label>
      <select class="fselect" id="f-genre">
        ${GENRES.map((g) => `<option ${book.genre === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}
      </select>
    </div>
    <div class="frow">
      <div class="fg"><label class="flabel" for="f-year">Año del plan</label>
        <select class="fselect" id="f-year">
          <option value="2026">2026</option><option value="2027">2027</option>
          <option value="2028">2028</option><option value="" selected>Sin asignar</option>
        </select>
      </div>
      <div class="fg"><label class="flabel" for="f-month">Mes</label>
        <select class="fselect" id="f-month">
          <option value="">—</option>${MONTH_ORDER.map((m) => `<option>${m}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="frow">
      <div class="fg"><label class="flabel" for="f-pages">Páginas</label>
        <input class="finput" id="f-pages" placeholder="~300" value="${esc(book.pages && book.pages !== '—' ? book.pages : '')}"></div>
      <div class="fg"><label class="flabel" for="f-role">Rol</label>
        <select class="fselect" id="f-role">
          <option value="⚓ Ancla">⚓ Ancla</option><option value="⚡ Corto">⚡ Corto</option>
        </select>
      </div>
    </div>`;
}

/** La ficha encontrada, siempre corregible antes de guardar. */
function renderDraft() {
  const b = draft;
  return `
    <div class="draft-head">
      ${b.cover
        ? `<img class="draft-cover" src="${esc(b.cover)}" alt="">`
        : `<div class="draft-cover">${lomoHtml(b, { mini: true })}</div>`}
      <div>
        <div class="draft-source">${{
          agente: 'Identificado por el agente',
          foto: 'Sin identificar · revisa los datos',
        }[b.source] || 'Encontrado en el catálogo'}</div>
        <input class="finput" id="f-title" value="${esc(b.title)}">
        <input class="finput" id="f-author" style="margin-top:6px" value="${esc(b.author)}">
        ${b.year || b.publisher ? `<div class="draft-meta">${[b.publisher, b.year].filter(Boolean).map(esc).join(' · ')}</div>` : ''}
      </div>
    </div>
    ${commonFields(b)}
    <div class="store-actions">
      <button class="btn-ghost" onclick="discardDraft()">Buscar otro</button>
      <button class="btn-magic" onclick="saveDraft()">Agregar a mi biblioteca</button>
    </div>`;
}

/* ── POR TÍTULO ──────────────────────────────────────────────── */

export function queryBooks(text) {
  lastQuery = text;
  clearTimeout(searchTimer);
  const hint = $('add-hint');
  if (text.trim().length < 3) {
    $('add-results').innerHTML = '';
    if (hint) hint.textContent = 'Escribe al menos tres letras.';
    return;
  }
  if (hint) hint.textContent = 'Buscando…';
  // Se espera a que dejes de teclear: una consulta por letra sería absurda
  searchTimer = setTimeout(async () => {
    const r = await buscarPorTitulo(text);
    const found = r.libros;
    if (lastQuery !== text) return;
    if (hint) {
      /* TRES FINALES DISTINTOS, y antes había dos. «Sin resultados»
         cuando lo que pasa es que no hemos podido preguntar es una
         mentira con consecuencias: dice que el libro no existe en
         ningún catálogo y manda a teclearlo entero a mano. */
      if (r.sinCatalogos) {
        hint.innerHTML = 'No hemos podido consultar los catálogos ahora mismo — '
          + 'no es que tu libro no esté. '
          + `<button class="btn-mini" onclick="queryBooks(${JSON.stringify(text).replace(/"/g, '&quot;')})">Reintentar</button>`;
      } else if (found.length) {
        hint.textContent = 'Toca el que sea para revisarlo antes de guardar.';
      } else if (r.caidas.length) {
        /* Contestó una de las dos y no encontró nada. Puede que el
           libro esté en la que no contestó, así que tampoco se afirma
           que no exista. */
        hint.textContent = 'Sin resultados, pero uno de los dos catálogos no contestó. '
          + 'Prueba otra vez, o añádelo a mano.';
      } else {
        hint.textContent = 'Sin resultados. Puedes añadirlo a mano.';
      }
    }
    $('add-results').innerHTML = found.map((b, i) => `
      <button class="cand" onclick="pickCandidate(${i})">
        ${b.cover ? `<img src="${esc(b.cover)}" alt="" loading="lazy">` : lomoHtml(b, { mini: true, cls: 'cand-ph' })}
        <span class="cand-info">
          <span class="cand-title">${esc(b.title)}</span>
          <span class="cand-sub">${esc(b.author)}${b.year ? ' · ' + b.year : ''}${b.pages !== '—' ? ' · ' + esc(b.pages) + ' págs.' : ''}</span>
        </span>
      </button>`).join('');
    window.__candidates = found;
  }, 420);
}

export function pickCandidate(i) {
  draft = window.__candidates?.[i];
  if (draft) render();
}

export function discardDraft() { draft = null; render(); }

/* ── CON LA CÁMARA ───────────────────────────────────────────── */

/* El bucle vive mientras esto sea cierto. Se apaga al cerrar la hoja,
   al cambiar de pestaña y al encontrar un código: una cámara mirando
   detrás de una pantalla cerrada gasta batería y no sirve a nadie. */
let mirando = false;

export function pararEscaner() {
  mirando = false;
  closeCamera();
}

async function startCamera() {
  try {
    const s = await openCamera();
    const v = $('scan-video');
    if (v) { v.srcObject = s; await v.play().catch(() => {}); }
    buscarCodigoSinParar();
  } catch {
    const hint = $('scan-hint');
    if (hint) hint.innerHTML = 'No se pudo abrir la cámara. Revisa el permiso, o añade el libro por título.';
  }
}

/**
 * Buscar sin parar, desde que se abre la cámara.
 *
 * SIN CUENTA ATRÁS. La había —«quedan 9 s»— y era una promesa que la
 * app no tiene por qué hacer: a los quince segundos se rendía sola y
 * dejaba a quien seguía encuadrando delante de un mensaje de fracaso.
 * Un lector de códigos no se rinde, mira hasta que le enseñas uno o
 * hasta que te vas.
 *
 * A los ocho segundos sin suerte sí cambia el consejo, porque a esas
 * alturas ya no es cosa de esperar: casi siempre es distancia o luz.
 */
async function buscarCodigoSinParar() {
  if (mirando) return;         // no dos bucles sobre la misma cámara
  mirando = true;

  const v = $('scan-video');
  const hint = $('scan-hint');
  if (!v) { mirando = false; return; }
  if (hint) hint.textContent = 'Buscando el código…';

  const desde = Date.now();
  const aviso = setInterval(() => {
    if (!mirando) return;
    const h = $('scan-hint');
    if (h && Date.now() - desde > 8000) {
      h.textContent = 'Sigo buscando… acércate un poco más, o busca mejor luz. '
        + 'Si el libro no tiene código, usa la foto de la portada.';
    }
  }, 1000);

  const code = await scanBarcode(v, { seconds: Infinity, seguir: () => mirando });
  clearInterval(aviso);
  if (!code || !mirando) { mirando = false; return; }
  mirando = false;

  /* Que se NOTE que lo encontró. Con la cámara siempre mirando, el
     único momento en que pasa algo es este, y sin un golpecito se
     confunde con el mensaje anterior. */
  try { navigator.vibrate?.(60); } catch { /* el teléfono decidirá */ }
  await usarCodigo(code);
}

async function usarCodigo(code) {
  const hint = $('scan-hint');
  if (hint) hint.textContent = 'Código leído. Buscando el libro…';

  const res = await lookupByIsbn(code);
  if (!res.ok) {
    if (hint) {
      /* «Prueba con la portada» es un mal consejo si lo que pasa es
         que los catálogos no contestan: la foto acaba en la misma
         consulta y va a fallar igual. Leímos su código bien; lo que
         falta es el otro lado. */
      hint.textContent = {
        'isbn-invalido': 'Ese código no es un ISBN válido. Prueba con la portada.',
        'catalogos-caidos': 'Leímos el código, pero los catálogos no contestan ahora mismo. '
          + 'Vuelve a intentarlo en un rato.',
      }[res.reason] || 'El código no está en los catálogos. Prueba con la portada.';
    }
    /* Y SE VUELVE A MIRAR. Sin esto, un código que no está en los
       catálogos dejaba la cámara encendida y ciega: el mensaje decía
       qué pasó y luego no pasaba nada nunca más, ni con ese libro ni
       con el siguiente. Se espera un momento para que el mensaje se
       pueda leer antes de que lo pise «Buscando el código…». */
    setTimeout(() => { if ($('scan-video')) buscarCodigoSinParar(); }, 2500);
    return;
  }
  pararEscaner();
  draft = res.book;
  render();
}

export async function shootCover() {
  const v = $('scan-video');
  const hint = $('scan-hint');
  if (!v) return;

  const canvas = grabFrame(v);
  const photo = frameToDataUrl(canvas);
  /* Se para TODO, no solo la cámara: el bucle de códigos seguiría
     pidiéndole cuadros a un vídeo apagado durante todo el OCR. */
  pararEscaner();
  if (hint) hint.textContent = 'Leyendo la portada…';

  let text = '';
  try {
    text = await readText(canvas, (p) => {
      if (hint) hint.textContent = `Leyendo la portada… ${Math.round(p * 100)}%`;
    });
  } catch {
    if (hint) hint.textContent = 'No se pudo leer la portada. Añádelo por título.';
    return;
  }

  // 1) Los catálogos, que son gratis y fiables
  const res = await lookupByCoverText(text);
  if (res.ok) {
    window.__candidates = res.candidates;
    draft = { ...res.candidates[0], cover: res.candidates[0].cover || photo };
    render();
    return;
  }

  /* Los catálogos MUDOS no son los catálogos que dicen que no. Si no
     contestaron, ni el agente ayuda —su respuesta vuelve a pasar por
     ellos— ni tiene sentido mandarla a rellenar la ficha a mano: la
     foto ya está tomada y dentro de un rato esta misma búsqueda
     funciona. */
  if (res.reason === 'catalogos-caidos') {
    if (hint) {
      hint.textContent = 'La foto salió bien, pero los catálogos no contestan ahora mismo. '
        + 'Vuelve a intentarlo en un rato.';
    }
    /* La cámara se apagó al disparar, así que se vuelve a encender: si
       no, queda un rectángulo negro debajo de un mensaje que pide
       reintentar. */
    startCamera();
    return;
  }

  // 2) Solo si fallan, el agente traduce el texto sucio del OCR
  if (agentAvailable()) {
    if (hint) hint.textContent = 'Los catálogos no lo reconocen. Preguntando al agente…';
    const guess = await identifyFromCoverText(text);
    if (guess) {
      const found = await lookupByTitle(`${guess.title} ${guess.author}`.trim());
      draft = found.length
        ? { ...found[0], cover: found[0].cover || photo, source: 'agente' }
        : { title: guess.title, author: guess.author, pages: '—', cover: photo, genre: 'Novela contemporánea', source: 'agente' };
      render();
      return;
    }
  }

  // 3) Nada lo reconoce: la foto queda de portada y se completa a mano
  mode = 'manual';
  draft = {
    title: text.split('\n').map((l) => l.trim()).filter(Boolean)[0] || '',
    author: '', pages: '—', cover: photo, genre: 'Novela contemporánea', source: 'foto',
  };
  render();
  toast('No lo reconocimos. Revisa los datos y guárdalo.');
}

/* ── GUARDAR ─────────────────────────────────────────────────── */

function readForm() {
  return {
    title: $('f-title')?.value.trim() || '',
    author: $('f-author')?.value.trim() || '',
    genre: $('f-genre')?.value || 'Novela contemporánea',
    year: parseInt($('f-year')?.value, 10) || null,
    month: $('f-month')?.value || null,
    pages: $('f-pages')?.value.trim() || '—',
    role: $('f-role')?.value || '⚓ Ancla',
  };
}

function commit(book, cover, isbn) {
  if (!book.title || !book.author) { toast('El título y el autor son obligatorios', 'error'); return; }
  const saved = addBook(book);
  if (cover || isbn) updateEntry(saved.id, { ...(cover ? { cover } : {}), ...(isbn ? { isbn } : {}) });
  closeAddSheet();
  refreshAll();
  toast(`«${book.title}» añadido`);
}

export function saveDraft() { commit(readForm(), draft?.cover, draft?.isbn); }
export function saveManual() { commit(readForm(), null, null); }
