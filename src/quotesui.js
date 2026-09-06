/* ─────────────────────────────────────────────────────────────
   CITAS · las pantallas  ·  historia #29

   Dos caminos para guardar una frase:

     · a mano, para quien lee en digital y puede copiar
     · con la cámara, que es el que hace que esto se use

   La nota de la historia lo dice y es cierto: teclear un párrafo
   desde un libro de papel es suficiente fricción como para no
   hacerlo nunca. Por eso la foto no es un extra.

   Y por eso el texto de la foto sale en un campo EDITABLE y no
   guardado ya: el OCR lee la página entera, y lo que quieres guardar
   es una frase de esa página. Recortar es parte del trabajo, no un
   arreglo de un fallo.
   ───────────────────────────────────────────────────────────── */

import {
  quotesOf, addQuote, removeQuote, allQuotes, searchQuotes,
  quoteToText, bookOfQuote, cleanQuote, MAX_QUOTE,
} from './quotes.js';
import { openCamera, closeCamera, grabFrame, readText } from './scan.js';
import { $, esc, toast, closeSheet } from './ui.js';
import { openDetail } from './views.js';
import { openShare } from './shareui.js';

let capturaLibro = null;     // el libro al que se le está poniendo una cita
let textoCapturado = '';
let busqueda = '';

/* ── LA CITA DENTRO DE LA FICHA DEL LIBRO ────────────────────── */

/** El bloque de citas que se pinta en la ficha. */
export function renderQuotes(bookId) {
  const citas = quotesOf(bookId);
  return `
    <div class="section-heading" style="margin-bottom:12px">
      <span class="section-heading-text">Citas${citas.length ? ` · ${citas.length}` : ''}</span>
    </div>
    ${citas.map((q) => `
      <figure class="quote">
        <blockquote class="quote-text">${esc(q.text)}</blockquote>
        <figcaption class="quote-foot">
          ${q.page ? `<span class="quote-page">p. ${q.page}</span>` : '<span class="quote-page quote-nopage">sin página</span>'}
          ${q.note ? `<span class="quote-note">${esc(q.note)}</span>` : ''}
          <button class="btn-mini" onclick="shareQuote('${bookId}','${q.id}')">✦ Presumir</button>
          <button class="btn-mini" onclick="copyQuote('${bookId}','${q.id}')">Copiar</button>
          <button class="btn-mini" onclick="dropQuote('${bookId}','${q.id}')">Borrar</button>
        </figcaption>
      </figure>`).join('')}
    <div class="store-actions" style="justify-content:flex-start;margin-bottom:18px">
      <button class="btn-ghost" onclick="openQuoteCapture('${bookId}','camara')">📷 Fotografiar</button>
      <button class="btn-ghost" onclick="openQuoteCapture('${bookId}','manual')">✎ Escribir</button>
    </div>`;
}

/* ── GUARDAR UNA CITA ────────────────────────────────────────── */

export function openQuoteCapture(bookId, modo = 'manual') {
  capturaLibro = bookId;
  textoCapturado = '';
  pintarCaptura(modo);
  $('qcap-overlay').classList.add('open');
  if (modo === 'camara') arrancarCamara();
  else setTimeout(() => $('q-text')?.focus(), 80);
}

export function closeQuoteCapture(e) {
  if (e && e.target !== $('qcap-overlay')) return;
  closeQuoteCaptureSheet();
}

export function closeQuoteCaptureSheet() {
  closeCamera();
  closeSheet('qcap-overlay');
  if (capturaLibro) openDetail(capturaLibro);
}

function pintarCaptura(modo) {
  $('qcap-body').innerHTML = modo === 'camara' && !textoCapturado
    ? `
      <div class="scan-stage">
        <video id="q-video" playsinline muted autoplay></video>
        <div class="scan-frame quote-frame"></div>
      </div>
      <p class="planner-hint" id="q-hint">
        Encuadra el trozo que quieres guardar. Luego podrás recortarlo antes de guardar.
      </p>
      <div class="store-actions">
        <button class="btn-magic" id="q-shoot" onclick="shootQuote()">Leer el texto</button>
      </div>`
    : formulario();
}

/** El formulario, con el texto ya leído si venía de una foto. */
function formulario() {
  return `
    <div class="fg">
      <label class="flabel" for="q-text">La cita</label>
      <textarea class="review-txt" id="q-text" maxlength="${MAX_QUOTE}"
                style="min-height:130px"
                placeholder="Pega o escribe el fragmento…">${esc(textoCapturado)}</textarea>
    </div>
    ${textoCapturado ? `<p class="planner-hint">
      Esto es lo que leyó la cámara de la página entera. <strong>Borra lo que sobre</strong>
      y quédate con la frase.
    </p>` : ''}
    <div class="frow">
      <div class="fg"><label class="flabel" for="q-page">Página</label>
        <input class="finput" id="q-page" inputmode="numeric" placeholder="143"></div>
      <div class="fg"><label class="flabel" for="q-note">Nota (opcional)</label>
        <input class="finput" id="q-note" maxlength="120" placeholder="Por qué te marcó"></div>
    </div>
    <button class="btn-magic full" onclick="saveQuote()">❞ Guardar la cita</button>`;
}

async function arrancarCamara() {
  try {
    const s = await openCamera();
    const v = $('q-video');
    if (v) { v.srcObject = s; await v.play().catch(() => {}); }
  } catch {
    const hint = $('q-hint');
    if (hint) hint.innerHTML = 'No se pudo abrir la cámara. Puedes escribir la cita a mano.';
  }
}

export async function shootQuote() {
  const v = $('q-video');
  const hint = $('q-hint');
  const btn = $('q-shoot');
  if (!v) return;
  if (btn) btn.disabled = true;

  try {
    const canvas = grabFrame(v, 1400);   // más resolución que una portada: aquí hay letra pequeña
    if (hint) hint.textContent = 'Leyendo la página…';
    const texto = await readText(canvas, (p) => {
      if (hint) hint.textContent = `Leyendo la página… ${Math.round(p * 100)}%`;
    });
    closeCamera();
    textoCapturado = cleanQuote(texto);
    if (!textoCapturado) {
      if (btn) btn.disabled = false;
      if (hint) hint.textContent = 'No se leyó nada. Acércate un poco más o busca mejor luz.';
      return;
    }
    pintarCaptura('manual');
    $('q-text')?.focus();
  } catch {
    if (btn) btn.disabled = false;
    if (hint) hint.textContent = 'No se pudo leer la página. Puedes escribirla a mano.';
  }
}

export function saveQuote() {
  if (!capturaLibro) return;
  const cita = addQuote(capturaLibro, {
    text: $('q-text')?.value,
    page: $('q-page')?.value,
    note: $('q-note')?.value,
  });
  if (!cita) { toast('Escribe la cita antes de guardarla', 'error'); return; }
  closeQuoteCaptureSheet();
  toast('Cita guardada');
}

export function dropQuote(bookId, quoteId) {
  removeQuote(bookId, quoteId);
  openDetail(bookId);
  toast('Cita borrada');
}

/**
 * Presumir de una frase  ·  historia #91
 *
 * La tarjeta bonita que la vista de citas prometía «para cuando exista
 * la épica de compartir». Ya existe.
 */
export function shareQuote(bookId, quoteId) {
  const cita = quotesOf(bookId).find((q) => q.id === quoteId);
  if (!cita) return;
  const libro = bookOfQuote(bookId);
  openShare('cita', {
    text: cita.text, page: cita.page,
    bookTitle: libro?.title, bookAuthor: libro?.author,
  });
}

/**
 * Copiar la cita con su atribución.
 *
 * La tarjeta bonita de 1080×1920 es de la épica de compartir (#90,
 * #91), que todavía no existe. Copiar el texto no es un sustituto de
 * eso, pero sirve HOY para mandarla por donde sea.
 */
export async function copyQuote(bookId, quoteId) {
  const cita = quotesOf(bookId).find((q) => q.id === quoteId);
  if (!cita) return;
  const texto = quoteToText(cita, bookOfQuote(bookId));
  try {
    await navigator.clipboard.writeText(texto);
    toast('Cita copiada');
  } catch {
    toast('Tu navegador no dejó copiar', 'error');
  }
}

/* ── LA VISTA DE TODAS MIS CITAS ─────────────────────────────── */

export function openQuotes() {
  busqueda = '';
  const campo = $('quote-search');
  if (campo) campo.value = '';
  pintarTodas();
  $('quotes-overlay').classList.add('open');
}

export function closeQuotes(e) {
  if (e && e.target !== $('quotes-overlay')) return;
  closeSheet('quotes-overlay');
}

export function searchMyQuotes(texto) {
  busqueda = texto;
  pintarTodas();
}

function pintarTodas() {
  const todas = allQuotes();
  const vistas = searchQuotes(todas, busqueda);
  const cuerpo = $('quotes-body');
  if (!cuerpo) return;

  if (!todas.length) {
    cuerpo.innerHTML = `<div class="empty">
      <div class="empty-rune">❞</div>
      <div class="empty-text">Todavía no has guardado ninguna cita</div>
      <p class="set-fineprint">
        Se guardan desde la ficha de cada libro. Puedes fotografiar la página
        en vez de teclearla.
      </p>
    </div>`;
    return;
  }

  if (!vistas.length) {
    cuerpo.innerHTML = `<p class="planner-hint">
      Ninguna de tus ${todas.length} citas dice «${esc(busqueda)}».
    </p>`;
    return;
  }

  cuerpo.innerHTML = `
    <p class="planner-hint">
      ${vistas.length === todas.length
        ? `${todas.length} ${todas.length === 1 ? 'cita guardada' : 'citas guardadas'}`
        : `${vistas.length} de ${todas.length}`}
    </p>
    ${vistas.map((q) => `
      <figure class="quote quote-standalone">
        <blockquote class="quote-text">${esc(q.text)}</blockquote>
        <figcaption class="quote-foot">
          <button class="quote-book" onclick="goToQuoteBook('${q.bookId}')">
            ${esc(q.bookTitle)} · ${esc(q.bookAuthor)}
          </button>
          ${q.page ? `<span class="quote-page">p. ${q.page}</span>` : ''}
          <button class="btn-mini" onclick="shareQuote('${q.bookId}','${q.id}')">✦ Presumir</button>
          <button class="btn-mini" onclick="copyQuote('${q.bookId}','${q.id}')">Copiar</button>
        </figcaption>
      </figure>`).join('')}`;
}

/** Desde una cita, al libro del que salió. */
export function goToQuoteBook(bookId) {
  closeSheet('quotes-overlay');
  openDetail(bookId);
}
