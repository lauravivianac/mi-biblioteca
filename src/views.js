/* ─────────────────────────────────────────────────────────────
   LAS TRES VISTAS: Plan · Biblioteca · Tracker
   Portadas del archivo único, ahora leyendo del store por usuaria
   y con progreso por página (historia #24).
   ───────────────────────────────────────────────────────────── */

import { MONTH_ORDER, MONTH_COLORS, MONTH_EMOJIS, pageCount } from './seed.js';
import {
  allBooks, findBook, entry, statusOf, ratingOf, reviewOf, coverOf,
  updateEntry, removeBook, progressPct,
} from './store.js';
import { fetchCover } from './covers.js';
import { $, esc, initial, toast, confirmAction } from './ui.js';
import { refreshAchievements } from './achievements.js';
import { renderPet } from './pet.js';
import { agentOffered, bookBrief, isDenied } from './agent.js';
import { allShelves, shelvesOfBook, shelfCounts, toggleBookShelf } from './shelves.js';
import { renderQuotes } from './quotesui.js';
import { quoteCount } from './quotes.js';
import { celebrateFinished } from './finished.js';

const STATUS_LABEL = {
  read: 'Leído', reading: 'Leyendo', pending: 'Pendiente',
  abandoned: 'Abandonado', wished: 'Deseado',
};
const STATUS_DOT = {
  read: 'status-read-dot', reading: 'status-reading-dot', pending: 'status-pending-dot',
  abandoned: 'status-abandoned-dot', wished: 'status-wished-dot',
};

let curYear = 2026;
let filterGenre = 'all';
let filterStatus = 'all';
let filterShelf = 'all';
let searchQ = '';
let detailId = null;

/** Los estados que no cuentan como pendientes de verdad. */
const countsAsPending = (id) => !['read', 'abandoned', 'wished'].includes(statusOf(id));

export function updateStats() {
  const visible = allBooks().filter((b) => statusOf(b.id) !== 'wished');
  const total = visible.length;
  const read = visible.filter((b) => statusOf(b.id) === 'read').length;
  const reading = visible.filter((b) => statusOf(b.id) === 'reading').length;
  const pending = visible.filter((b) => countsAsPending(b.id) && statusOf(b.id) !== 'reading').length;
  const pct = total ? Math.round((read / total) * 100) : 0;

  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('stat-total', total); set('stat-read', read);
  set('t-read', read); set('t-reading', reading); set('t-pending', pending);
  set('ring-pct', pct + '%');
  const ring = $('ring-fill');
  if (ring) { const c = 289.0; ring.style.strokeDashoffset = c - (c * pct) / 100; }
}

function coverMarkup(book, cls, fallbackIcon) {
  const url = coverOf(book.id);
  const ph = fallbackIcon
    ? `<div class="cover-placeholder"><div class="cover-placeholder-icon">${fallbackIcon}</div><div class="cover-placeholder-letter">${initial(book.title)}</div></div>`
    : `<div class="${cls}">${initial(book.title)}</div>`;
  if (!url) return ph;
  return `<img src="${esc(url)}" alt="" loading="lazy" onerror="this.outerHTML=this.dataset.ph" data-ph="${esc(ph)}">`;
}

/** Pide las portadas que falten y repinta cuando lleguen. */
function hydrateCovers(books, rerender) {
  const missing = books.filter((b) => coverOf(b.id) === null || coverOf(b.id) === undefined);
  if (!missing.length) return;
  Promise.all(missing.slice(0, 24).map((b) => fetchCover(b.id))).then((urls) => {
    if (urls.some(Boolean)) rerender();
  });
}

/* ── PLAN ────────────────────────────────────────────────────── */

export function setYear(y, el) {
  curYear = y;
  document.querySelectorAll('.year-btn').forEach((b) => b.classList.remove('active'));
  el?.classList.add('active');
  renderPlan();
}

export function renderPlan() {
  const shelf = $('pet-slot');
  if (shelf) shelf.innerHTML = renderPet();

  const body = $('plan-body');
  if (!body) return;
  const yearBooks = allBooks().filter((b) => b.year === curYear);

  const byMonth = {};
  MONTH_ORDER.forEach((m) => {
    const mb = yearBooks.filter((b) => b.month === m);
    if (mb.length) byMonth[m] = mb;
  });

  if (!Object.keys(byMonth).length) {
    body.innerHTML = `<div class="empty">
      <div class="empty-rune">📅</div>
      <div class="empty-text">No hay libros para ${curYear}</div>
      <button class="btn-ghost" onclick="openPlanner()">Armar un plan</button>
    </div>`;
    return;
  }

  let html = '';
  for (const [month, books] of Object.entries(byMonth)) {
    const col = MONTH_COLORS[month] || '#888888';
    const emoji = MONTH_EMOJIS[month] || '✦';
    const readCount = books.filter((b) => statusOf(b.id) === 'read').length;
    html += `<div class="month-group">
      <div class="month-label">
        <div class="month-rune" style="--month-accent:${col}">${emoji}</div>
        <div class="month-name-text">${month}</div>
        <div class="month-progress">${readCount}/${books.length}</div>
      </div>`;
    for (const book of books) {
      const isRead = statusOf(book.id) === 'read';
      const isAnchor = (book.role || '').includes('Ancla');
      const pct = progressPct(book.id);
      const pinned = !!entry(book.id).pinnedMonth;
      html += `<div class="book-card ${isRead ? 'read' : ''}" style="--month-accent:${col}" onclick="openDetail('${book.id}')">
        <div class="book-card-cover">${coverMarkup(book, 'cover-placeholder', emoji)}</div>
        <div class="book-card-body">
          <div class="book-card-role ${isAnchor ? 'role-anchor' : 'role-short'}">${esc(book.role)}${pinned ? ' · 📌' : ''}</div>
          <div class="book-card-title">${esc(book.title)}</div>
          <div class="book-card-author">${esc(book.author)}</div>
          <div class="book-card-tags">
            <span class="tag">${esc(book.genre)}</span>
            <span class="tag tag-pages">${esc(book.pages)} p.</span>
          </div>
          ${pct > 0 && !isRead ? `<div class="mini-bar"><div class="mini-bar-fill" style="width:${pct}%"></div></div>` : ''}
        </div>
        ${isRead ? '<div class="book-card-read-badge">✓</div>' : ''}
      </div>`;
    }
    html += '</div>';
  }
  body.innerHTML = html;
  hydrateCovers(yearBooks, renderPlan);
}

/* ── BIBLIOTECA ──────────────────────────────────────────────── */

export function setGenre(g) { filterGenre = g; renderLib(); }
export function setStatusFilter(s) { filterStatus = s; renderLib(); }
export function setShelfFilter(s) { filterShelf = s; renderLib(); }
export function searchLib(q) { searchQ = q; renderLib(); }

export function renderLib() {
  const body = $('lib-body');
  if (!body) return;

  const genres = ['all', ...new Set(allBooks().map((b) => b.genre))];
  const chips = $('genre-chips');
  if (chips) {
    chips.innerHTML = genres.map((g) =>
      `<div class="chip ${filterGenre === g ? 'active' : ''}" onclick="setGenre('${esc(g).replace(/'/g, '&#39;')}')">${g === 'all' ? 'Todos' : esc(g)}</div>`
    ).join('');
  }
  const statusChips = $('status-chips');
  if (statusChips) {
    const opts = [['all', 'Cualquier estado'], ['reading', 'Leyendo'], ['pending', 'Pendientes'],
      ['read', 'Leídos'], ['wished', 'Deseados'], ['abandoned', 'Abandonados']];
    statusChips.innerHTML = opts.map(([v, label]) =>
      `<div class="chip ${filterStatus === v ? 'active' : ''}" onclick="setStatusFilter('${v}')">${label}</div>`
    ).join('');
  }

  /* Los chips de estantería solo aparecen si hay estanterías: una
     fila de filtros vacía es ruido para quien no las usa. */
  const shelfChips = $('shelf-chips');
  if (shelfChips) {
    const shelves = allShelves();
    const cuenta = shelfCounts();
    shelfChips.innerHTML = shelves.length
      ? [`<div class="chip ${filterShelf === 'all' ? 'active' : ''}" onclick="setShelfFilter('all')">Todas</div>`,
         ...shelves.map((sh) => `
           <div class="chip chip-shelf ${filterShelf === sh.id ? 'active' : ''}"
                style="--shelf-rgb: var(--${sh.color}-rgb)" onclick="setShelfFilter('${sh.id}')">
             ${sh.emoji} ${esc(sh.name)}
             <span class="chip-count">${cuenta[sh.id] || 0}</span>
           </div>`)].join('')
      : '';
  }

  /* El agente solo aparece si está configurado. Un botón que siempre
     falla es peor que no tener botón. */
  const agentSlot = $('lib-agent');
  if (agentSlot) {
    const cuantas = quoteCount();
    agentSlot.innerHTML = [
      cuantas ? `<button class="btn-ghost full" onclick="openQuotes()">❞ Mis citas · ${cuantas}</button>` : '',
      agentOffered() ? '<button class="btn-ghost full" onclick="openRecs()">✦ Qué leer después</button>' : '',
    ].join('');
  }

  let filtered = allBooks();
  if (filterGenre !== 'all') filtered = filtered.filter((b) => b.genre === filterGenre);
  if (filterStatus !== 'all') filtered = filtered.filter((b) => statusOf(b.id) === filterStatus);
  if (filterShelf !== 'all') filtered = filtered.filter((b) => shelvesOfBook(b.id).includes(filterShelf));
  if (searchQ) {
    const q = searchQ.toLowerCase();
    filtered = filtered.filter((b) =>
      b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  }

  if (!filtered.length) {
    body.innerHTML = `<div class="empty"><div class="empty-rune">📚</div><div class="empty-text">No se encontraron libros</div></div>`;
    return;
  }

  body.innerHTML = filtered.map((book) => {
    const s = statusOf(book.id);
    const pct = progressPct(book.id);
    return `<div class="lib-card" onclick="openDetail('${book.id}')">
      <div class="lib-cover">${coverMarkup(book, 'lib-cover-ph')}</div>
      <div class="lib-info">
        <div class="lib-title">${esc(book.title)}</div>
        <div class="lib-author">${esc(book.author)}</div>
        <div class="lib-footer">
          <div class="status-dot ${STATUS_DOT[s]}"></div>
          <span class="status-text">${STATUS_LABEL[s]}</span>
          <span class="tag" style="font-size:9px">${esc(book.genre)}</span>
          ${book.year ? `<span class="lib-year">${book.year}${book.month ? ' · ' + book.month : ''}</span>` : ''}
        </div>
        ${pct > 0 && s !== 'read' ? `<div class="mini-bar"><div class="mini-bar-fill" style="width:${pct}%"></div></div>` : ''}
      </div>
    </div>`;
  }).join('');

  hydrateCovers(filtered, renderLib);
}

/* ── TRACKER ─────────────────────────────────────────────────── */

export function renderTracker() {
  updateStats();
  const body = $('tracker-body');
  if (!body) return;

  const visible = allBooks();
  const ordered = [
    ...visible.filter((b) => statusOf(b.id) === 'reading'),
    ...visible.filter((b) => statusOf(b.id) === 'pending'),
    ...visible.filter((b) => statusOf(b.id) === 'read'),
    ...visible.filter((b) => ['wished', 'abandoned'].includes(statusOf(b.id))),
  ];

  body.innerHTML = ordered.map((book) => {
    const s = statusOf(book.id);
    const r = ratingOf(book.id);
    const total = pageCount(book.pages);
    const e = entry(book.id);
    const pct = progressPct(book.id);
    const stars = [1, 2, 3, 4, 5].map((i) =>
      `<span class="star ${i <= r ? 'on' : ''}" onclick="setRating('${book.id}',${i})">★</span>`).join('');
    return `<div class="tracker-card">
      <div class="tracker-card-header">
        <div class="tracker-card-cover">${coverMarkup(book, 'tracker-card-cover-ph')}</div>
        <div class="tracker-card-info">
          <div class="tracker-card-title">${esc(book.title)}</div>
          <div class="tracker-card-author">${esc(book.author)}${book.year ? ' · ' + book.year + (book.month ? ' ' + book.month : '') : ''}</div>
        </div>
        <button class="read-btn ${s === 'read' ? 'done' : ''}" onclick="toggleRead('${book.id}')" aria-label="Marcar como leído">${s === 'read' ? '✓' : '○'}</button>
      </div>
      ${s !== 'read' ? `<div class="progress-row">
        <input class="page-input" type="number" min="0" ${total ? `max="${total}"` : ''}
          placeholder="pág." value="${e.page ?? ''}" onchange="setPage('${book.id}',this.value)">
        <span class="progress-of">${total ? 'de ' + total : 'sin total'}</span>
        <div class="mini-bar grow"><div class="mini-bar-fill" style="width:${pct}%"></div></div>
        <span class="progress-pct">${pct}%</span>
      </div>` : ''}
      <div class="stars-row">${stars}</div>
      <textarea class="review-txt" placeholder="Tu reseña o comentario..." onchange="setReview('${book.id}',this.value)">${esc(reviewOf(book.id))}</textarea>
    </div>`;
  }).join('') || `<div class="empty"><div class="empty-rune">✨</div><div class="empty-text">Tu progreso aparecerá aquí</div></div>`;

  hydrateCovers(ordered, renderTracker);
}

/* ── ACCIONES ────────────────────────────────────────────────── */

export function refreshAll() {
  updateStats(); renderPlan(); renderLib(); renderTracker();
}

/** Marcar leído deja constancia de cuándo: es el insumo del ritmo real. */
export function setStatus(id, status) {
  const patch = { status };
  const e = entry(id);
  const antes = statusOf(id);
  if (status === 'reading' && !e.startedAt) patch.startedAt = Date.now();
  if (status === 'read') {
    if (!e.startedAt) patch.startedAt = Date.now() - 7 * 86400000;
    patch.finishedAt = Date.now();
    patch.page = pageCount(findBook(id)?.pages) || e.page || null;
  }
  if (status === 'pending') { patch.finishedAt = null; }
  updateEntry(id, patch);

  /* Un logro que se consigue en silencio no motiva a nadie. */
  for (const a of refreshAchievements()) {
    toast(`${a.icon}  ${a.name}${a.unlocksTheme ? ' · desbloqueaste un tema' : ''}`);
  }

  /* Terminar un libro es el momento de mayor intención de la app.
     Hasta ahora no pasaba nada; ahora pregunta qué tal estuvo y
     propone qué sigue. Solo al PASAR a leído: volver a tocar el
     mismo botón no vuelve a celebrarlo. */
  if (status === 'read' && antes !== 'read') {
    setTimeout(() => celebrateFinished(id), 260);
  }
}

export function toggleRead(id) {
  setStatus(id, statusOf(id) === 'read' ? 'pending' : 'read');
  updateStats(); renderTracker();
}

export function setRating(id, v) { updateEntry(id, { rating: v }); renderTracker(); }
export function setReview(id, v) { updateEntry(id, { review: v }); }

export function setPage(id, value) {
  const total = pageCount(findBook(id)?.pages);
  let page = parseInt(value, 10);
  if (!Number.isFinite(page) || page < 0) page = 0;
  if (total && page > total) page = total;

  const e = entry(id);
  const patch = { page, lastReadAt: Date.now() };
  if (!e.startedAt && page > 0) patch.startedAt = Date.now();
  if (page > 0 && statusOf(id) === 'pending') patch.status = 'reading';
  updateEntry(id, patch);

  if (total && page >= total && statusOf(id) !== 'read') {
    confirmAction({
      title: '¿Terminaste el libro?',
      body: 'Llegaste a la última página. ¿Lo marcamos como leído?',
      confirmLabel: 'Sí, lo terminé',
    }).then((yes) => { if (yes) setStatus(id, 'read'); refreshAll(); });
  } else {
    renderTracker();
  }
}

/* ── DETALLE ─────────────────────────────────────────────────── */

export async function openDetail(id) {
  detailId = id;
  const book = findBook(id);
  if (!book) return;
  const s = statusOf(id);
  const r = ratingOf(id);
  const url = coverOf(id) ?? await fetchCover(id);
  const pinned = entry(id).pinnedMonth;

  const stars = [1, 2, 3, 4, 5].map((i) =>
    `<span class="star ${i <= r ? 'on' : ''}" onclick="detailRating(${i})" style="font-size:26px">★</span>`).join('');
  const statusBtn = (value, label) =>
    `<button class="status-btn ${s === value ? 's-' + value : ''}" onclick="detailStatus('${value}')">${label}</button>`;

  $('detail-sheet').innerHTML = `
    <div class="sheet-handle" style="margin-top:16px"></div>
    <button class="sheet-close" onclick="closeDetailSheet()" aria-label="Cerrar">✕</button>
    <div class="detail-cover-banner">
      ${url ? `<img src="${esc(url)}" alt="" onerror="this.style.display='none'">` : '<div class="detail-cover-banner-ph"></div>'}
      <div class="detail-cover-fg">
        <div class="detail-cover-thumb">${url ? `<img src="${esc(url)}" alt="">` : `<div class="detail-cover-thumb-ph">${initial(book.title)}</div>`}</div>
      </div>
    </div>
    <div style="padding:0 20px">
      <div class="detail-title">${esc(book.title)}</div>
      <div class="detail-author">${esc(book.author)}</div>
      <div class="detail-tags">
        <span class="detail-tag">${esc(book.genre)}</span>
        <span class="detail-tag">${esc(book.role)}</span>
        ${book.year ? `<span class="detail-tag">${book.year}${book.month ? ' · ' + book.month : ''}</span>` : ''}
        <span class="detail-tag">${esc(book.pages)} págs.</span>
      </div>

      <div class="section-heading" style="margin-bottom:12px"><span class="section-heading-text">Estado</span></div>
      <div class="status-row">
        ${statusBtn('read', '✓ Leído')}
        ${statusBtn('reading', '📖 Leyendo')}
        ${statusBtn('pending', '○ Pendiente')}
      </div>
      <div class="status-row" style="margin-top:8px">
        ${statusBtn('wished', '🤍 Deseado')}
        ${statusBtn('abandoned', '⏸ Abandonado')}
      </div>

      ${book.year && book.month ? `<div class="section-heading" style="margin-bottom:12px"><span class="section-heading-text">En el plan</span></div>
      <button class="btn-ghost full" onclick="togglePin('${id}')">
        ${pinned ? '📌 Fijado a ' + pinned + ' · toca para soltar' : '📌 Fijar a ' + book.month + ' para que el plan no lo mueva'}
      </button>` : ''}

      <div class="section-heading" style="margin-bottom:12px"><span class="section-heading-text">Estanterías</span></div>
      <div class="shelf-picker">
        ${allShelves().map((sh) => `
          <button class="chip chip-shelf ${shelvesOfBook(id).includes(sh.id) ? 'active' : ''}"
                  style="--shelf-rgb: var(--${sh.color}-rgb)" onclick="toggleShelf('${id}','${sh.id}')">
            ${sh.emoji} ${esc(sh.name)}
          </button>`).join('')}
        <button class="chip chip-new" onclick="newShelfFor('${id}')">＋ Nueva</button>
      </div>

      ${renderQuotes(id)}

      ${agentOffered() ? renderBrief(id) : ''}

      <div class="section-heading" style="margin-bottom:12px"><span class="section-heading-text">Calificación</span></div>
      <div class="stars-row" style="margin-bottom:16px">${stars}</div>

      <div class="section-heading" style="margin-bottom:12px"><span class="section-heading-text">Reseña</span></div>
      <textarea class="review-txt" style="min-height:72px;margin-bottom:16px" placeholder="¿Qué te pareció?" onchange="setReview('${id}',this.value)">${esc(reviewOf(id))}</textarea>

      <button class="btn-delete" onclick="deleteBook('${id}')">🗑 Eliminar de la biblioteca</button>
    </div>`;
  $('detail-overlay').classList.add('open');
}

export function closeDetail(e) {
  if (e.target === $('detail-overlay')) closeDetailSheet();
}

export function closeDetailSheet() {
  $('detail-overlay').classList.remove('open');
  refreshAll();
}

/* ── ¿ME LO LEO?  ·  historia #48 ─────────────────────────────
   La pregunta que de verdad se hace antes de empezar un libro. La
   respuesta se guarda en la ficha: preguntar dos veces lo mismo
   cuesta dinero y tarda, y el libro no cambia entre una vez y otra. */

function renderBrief(id) {
  const b = entry(id).brief;
  if (!b) {
    return `<div class="section-heading" style="margin-bottom:12px"><span class="section-heading-text">¿Me lo leo?</span></div>
      <button class="btn-ghost full" id="brief-btn" onclick="askBrief('${id}')">
        ✦ Pregúntale al agente si vale la pena
      </button>
      <p class="set-fineprint" style="margin-bottom:16px">Sin spoilers. Te dice también para quién NO es.</p>`;
  }
  return `<div class="section-heading" style="margin-bottom:12px"><span class="section-heading-text">¿Me lo leo?</span></div>
    <div class="brief">
      <p class="brief-text">${esc(b.resumen || '')}</p>
      ${b.tono || b.exigencia ? `<div class="detail-tags" style="margin:10px 0">
        ${b.tono ? `<span class="detail-tag">${esc(b.tono)}</span>` : ''}
        ${b.exigencia ? `<span class="detail-tag">${esc(b.exigencia)}</span>` : ''}
      </div>` : ''}
      ${b.para_quien ? `<div class="brief-row"><span class="brief-tag ok">Para ti si</span><span>${esc(b.para_quien)}</span></div>` : ''}
      ${b.no_para_quien ? `<div class="brief-row"><span class="brief-tag no">No si</span><span>${esc(b.no_para_quien)}</span></div>` : ''}
      ${b.parecidos?.length ? `<div class="brief-row"><span class="brief-tag">Se parece a</span><span>${b.parecidos.map(esc).join(' · ')}</span></div>` : ''}
      <button class="link-btn" onclick="askBrief('${id}', true)">Volver a preguntar</button>
    </div>`;
}

export async function askBrief(id, again = false) {
  const book = findBook(id);
  if (!book) return;
  if (again) updateEntry(id, { brief: null });
  const btn = $('brief-btn');
  if (btn) { btn.textContent = 'Preguntando…'; btn.disabled = true; }
  try {
    const brief = await bookBrief(book);
    updateEntry(id, { brief });
  } catch (e) {
    // Decir que no es una respuesta, no un fallo: no se enseña como error.
    if (!isDenied(e)) toast(e.message, 'error');
  }
  /* Si cerraste la ficha mientras el agente pensaba, no te la
     reabrimos en la cara: la respuesta ya quedó guardada y estará
     ahí la próxima vez que abras el libro. */
  if (detailId === id) await openDetail(id);
}

/** Meter o sacar el libro de una estantería, sin cerrar la ficha. */
export function toggleShelf(bookId, shelfId) {
  toggleBookShelf(bookId, shelfId);
  openDetail(bookId);
}

export function detailStatus(s) { setStatus(detailId, s); openDetail(detailId); updateStats(); }
export function detailRating(v) { updateEntry(detailId, { rating: v }); openDetail(detailId); }

export function togglePin(id) {
  const book = findBook(id);
  const current = entry(id).pinnedMonth;
  updateEntry(id, { pinnedMonth: current ? null : book.month });
  toast(current ? 'Soltado: el plan puede moverlo' : `Fijado a ${book.month}`);
  openDetail(id);
}

export async function deleteBook(id) {
  const yes = await confirmAction({
    title: '¿Eliminar este libro?',
    body: 'Se quita de tu biblioteca. Si es uno del plan original, puedes recuperarlo más adelante.',
    confirmLabel: 'Eliminar', danger: true,
  });
  if (!yes) return;
  removeBook(id);
  $('detail-overlay').classList.remove('open');
  refreshAll();
}
