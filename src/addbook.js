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

import { lookupByIsbn, lookupByTitle, lookupByCoverText } from './booklookup.js';
import { identifyFromCoverText, agentAvailable } from './agent.js';
import {
  openCamera, closeCamera, scanBarcode, grabFrame, frameToDataUrl,
  readCoverText,
} from './scan.js';
import { addBook, updateEntry } from './store.js';
import { GENRES, MONTH_ORDER } from './seed.js';
import { $, esc, toast, closeSheet } from './ui.js';
import { refreshAll } from './views.js';

let mode = 'titulo';       // titulo · camara · manual
let draft = null;          // el candidato elegido, antes de guardar
let searchTimer = null;
let lastQuery = '';

export function openAdd() {
  mode = 'titulo';
  draft = null;
  render();
  $('add-overlay').classList.add('open');
}

export function closeAdd(e) {
  if (e && e.target !== $('add-overlay')) return;
  closeAddSheet();
}

export function closeAddSheet() {
  closeCamera();
  clearTimeout(searchTimer);
  closeSheet('add-overlay');
}

export function setAddMode(next) {
  if (mode === 'camara' && next !== 'camara') closeCamera();
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

function renderCamara() {
  return `
    <div class="scan-stage">
      <video id="scan-video" playsinline muted autoplay></video>
      <div class="scan-frame"></div>
    </div>
    <p class="planner-hint" id="scan-hint">
      Encuadra el código de barras de la contraportada dentro del marco.
      Si el libro no tiene, toma una foto de la portada.
    </p>
    <div class="store-actions">
      <button class="btn-ghost" onclick="shootCover()">📕 Foto de la portada</button>
      <button class="btn-magic" id="scan-btn" onclick="shootBarcode()">Buscar código</button>
    </div>`;
}

function renderManual() {
  return `
    <div class="fg"><label class="flabel" for="f-title">Título</label>
      <input class="finput" id="f-title" placeholder="Título del libro"></div>
    <div class="fg"><label class="flabel" for="f-author">Autor</label>
      <input class="finput" id="f-author" placeholder="Nombre del autor"></div>
    ${commonFields()}
    <button class="btn-magic full" onclick="saveManual()">✦ Agregar a mi biblioteca</button>`;
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
        : '<div class="draft-cover draft-cover-ph">📕</div>'}
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
      <button class="btn-magic" onclick="saveDraft()">✦ Agregar a mi biblioteca</button>
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
    const found = await lookupByTitle(text);
    if (lastQuery !== text) return;
    if (hint) {
      hint.textContent = found.length
        ? 'Toca el que sea para revisarlo antes de guardar.'
        : 'Sin resultados. Puedes añadirlo a mano.';
    }
    $('add-results').innerHTML = found.map((b, i) => `
      <button class="cand" onclick="pickCandidate(${i})">
        ${b.cover ? `<img src="${esc(b.cover)}" alt="" loading="lazy">` : '<span class="cand-ph">📕</span>'}
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

async function startCamera() {
  try {
    const s = await openCamera();
    const v = $('scan-video');
    if (v) { v.srcObject = s; await v.play().catch(() => {}); }
  } catch {
    const hint = $('scan-hint');
    if (hint) hint.innerHTML = 'No se pudo abrir la cámara. Revisa el permiso, o añade el libro por título.';
  }
}

export async function shootBarcode() {
  const v = $('scan-video');
  const hint = $('scan-hint');
  const btn = $('scan-btn');
  if (!v) return;
  if (btn) btn.disabled = true;

  /* La cuenta atrás no es adorno: quince segundos mirando un botón
     quieto se leen como que la app se colgó, y la gente cierra. */
  const code = await scanBarcode(v, {
    onProgress: (quedan) => {
      if (hint) hint.textContent = `Buscando el código… ${Math.ceil(quedan)} s`;
    },
  });

  if (btn) btn.disabled = false;
  if (!code) {
    if (hint) {
      hint.textContent = 'No se encontró el código. Acércate un poco más, '
        + 'busca mejor luz, o toma una foto de la portada.';
    }
    return;
  }
  if (hint) hint.textContent = 'Código leído. Buscando el libro…';

  const res = await lookupByIsbn(code);
  if (!res.ok) {
    if (hint) {
      hint.textContent = res.reason === 'isbn-invalido'
        ? 'Ese código no es un ISBN válido. Prueba con la portada.'
        : 'El código no está en los catálogos. Prueba con la portada.';
    }
    return;
  }
  closeCamera();
  draft = res.book;
  render();
}

export async function shootCover() {
  const v = $('scan-video');
  const hint = $('scan-hint');
  if (!v) return;

  const canvas = grabFrame(v);
  const photo = frameToDataUrl(canvas);
  closeCamera();
  if (hint) hint.textContent = 'Leyendo la portada…';

  let text = '';
  try {
    text = await readCoverText(canvas, (p) => {
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
