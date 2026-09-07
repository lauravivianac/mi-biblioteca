/* ─────────────────────────────────────────────────────────────
   ESCRIBIR · las pantallas  ·  #72, #73 y #74

   Una lista, un editor y un botón para pedirle al asistente que ordene
   tus notas.

   EL BORRADOR SE GUARDA SOLO, en el dispositivo, mientras escribes.
   La historia lo dice con estas palabras: «perder un texto escrito es
   imperdonable». Así que se guarda antes de que lo guardes tú, y si
   cierras la app a media frase, al volver está.

   LA VISIBILIDAD SE VE EN LA LISTA SIN ABRIR NADA (#73): un candado,
   dos siluetas o un mundo. Tener que abrir una entrada para saber
   quién la lee es exactamente lo que hace que alguien publique algo
   sin querer.
   ───────────────────────────────────────────────────────────── */

import {
  misEntradas, unaEntrada, guardar, borrar, cambiarVisibilidad,
} from './posts.js';
import {
  TIPOS, tipoLabel, seAncla, VISIBILIDADES, visibilidadDe, POR_DEFECTO,
  MAX_TITULO, MAX_CUERPO, MAX_LIBROS, aHtml, adelanto, citaComoTexto,
  CLAVE_BORRADOR, tocaGuardar, hayQueRecuperar, plantillaDesdeNotas,
  AVISO_AGENTE, porTrozos, VACIO_POSTS,
} from './posts-core.js';
import { allBooks, findBook, uid as myUid } from './store.js';
import { allQuotes } from './quotes.js';
import { orderNotes } from './agent.js';
import { agentOffered, isDenied } from './agent.js';
import { $, esc, toast, openSheet, closeSheet, confirmAction } from './ui.js';
import { ico } from './icons.js';

let entradas = [];
let editando = null;         // la entrada abierta, o null si es nueva
let librosLigados = [];      // ids
let ultimoGuardado = '';
let desdeCuando = 0;
let temporizador = null;

/* ── LA LISTA ────────────────────────────────────────────────── */

export async function openPosts() {
  openSheet('posts-overlay');
  $('posts-body').innerHTML = '<p class="planner-hint">Cargando…</p>';
  entradas = await misEntradas();
  pintarLista();
}

export const closePosts = (e) => {
  if (!e || e.target === $('posts-overlay')) closeSheet('posts-overlay');
};

function pintarLista() {
  const cuerpo = $('posts-body');
  if (!cuerpo) return;

  cuerpo.innerHTML = `
    <button class="btn-magic full" onclick="openEditor()" style="margin-bottom:14px">
      ${ico('pluma')} Escribir algo
    </button>

    ${entradas.length ? entradas.map(ficha).join('') : `
      <div class="empty">
        <div class="empty-rune">${ico(VACIO_POSTS.rune, 'ico-lg')}</div>
        <div class="empty-text">${esc(VACIO_POSTS.texto)}</div>
      </div>
      <p class="set-fineprint" style="text-align:center">${esc(VACIO_POSTS.detalle)}</p>`}`;
}

function ficha(p) {
  const v = visibilidadDe(p.visibilidad);
  return `
    <div class="post-card" onclick="openEditor('${esc(p.id)}')">
      <div class="post-cab">
        <span class="post-vis" title="${esc(v.label)}">${v.icono}</span>
        <span class="post-tipo">${esc(tipoLabel(p.tipo))}</span>
        ${p.pagina ? `<span class="post-tipo">p. ${p.pagina}</span>` : ''}
        ${p.ayudaDelAgente ? '<span class="post-tipo">ordenada</span>' : ''}
      </div>
      ${p.titulo ? `<div class="post-titulo">${esc(p.titulo)}</div>` : ''}
      <div class="post-adelanto">${esc(adelanto(p.cuerpo))}</div>
      ${p.libros?.length ? `
        <div class="post-libros">
          ${p.libros.map((b) => `<span class="post-libro">${esc(b.title)}</span>`).join('')}
        </div>` : ''}
    </div>`;
}

/* ── EL EDITOR ───────────────────────────────────────────────── */

export async function openEditor(id = null) {
  editando = id ? await unaEntrada(id) : null;
  librosLigados = (editando?.libros || []).map((b) => b.bookId);

  /* Si hay un borrador sin guardar de una sesión anterior, se ofrece
     recuperarlo ANTES de pintar nada encima. */
  const borrador = leerBorrador();
  if (!id && hayQueRecuperar(borrador)) {
    openSheet('editor-overlay');
    $('editor-body').innerHTML = `
      <p class="planner-hint">
        Quedó algo a medias la última vez. ¿Lo recuperamos?
      </p>
      <div class="post-card">
        <div class="post-adelanto">${esc(adelanto(borrador.cuerpo, 220))}</div>
      </div>
      <button class="btn-magic full" onclick="recuperarBorrador()">Sí, seguir con eso</button>
      <button class="btn-ghost full" style="margin-top:8px" onclick="descartarBorrador()">
        No, empezar de cero
      </button>`;
    return;
  }

  openSheet('editor-overlay');
  pintarEditor();
}

export function recuperarBorrador() {
  const b = leerBorrador();
  editando = { ...b, id: null };
  librosLigados = (b.libros || []).map((x) => x.bookId || x);
  pintarEditor();
}

export function descartarBorrador() {
  guardarBorrador(null);
  editando = null;
  librosLigados = [];
  pintarEditor();
}

function pintarEditor() {
  const p = editando || {};
  const tipo = p.tipo || 'nota';

  $('editor-body').innerHTML = `
    <div class="filter-scroll">
      ${TIPOS.map((t) => `
        <div class="chip ${tipo === t.id ? 'active' : ''}" onclick="setTipoPost('${t.id}')">
          ${esc(t.label)}
        </div>`).join('')}
    </div>
    <p class="set-fineprint" style="margin-top:0">
      ${esc(TIPOS.find((t) => t.id === tipo)?.hint || '')}
    </p>

    <input class="finput" id="post-titulo" maxlength="${MAX_TITULO}"
           placeholder="Un título, si te sale" value="${esc(p.titulo || '')}"
           oninput="marcarSucio()">

    <textarea class="finput post-cuerpo" id="post-cuerpo" rows="12" maxlength="${MAX_CUERPO}"
      placeholder="Lo que quieras. **negrita**, _cursiva_, &gt; para citar, - para listas."
      oninput="marcarSucio()">${esc(p.cuerpo || '')}</textarea>

    <div class="editor-atajos">
      <button class="btn-mini" onclick="insertarMarca('**','**')"><b>B</b></button>
      <button class="btn-mini" onclick="insertarMarca('_','_')"><i>i</i></button>
      <button class="btn-mini" onclick="insertarMarca('&gt; ','')">❝</button>
      <button class="btn-mini" onclick="insertarMarca('- ','')">•</button>
      <button class="btn-mini" onclick="openInsertarCita()">Cita guardada</button>
    </div>

    ${seAncla(tipo) ? `
      <div class="fg">
        <label class="flabel" for="post-pagina">Página <span class="opt">(opcional)</span></label>
        <input class="finput" id="post-pagina" type="number" min="1"
               value="${p.pagina || ''}" oninput="marcarSucio()">
      </div>` : ''}

    <label class="flabel" style="margin-top:12px">
      Libros <span class="opt">(hasta ${MAX_LIBROS})</span>
    </label>
    <div class="ask-libros" id="post-libros">
      ${allBooks().slice(0, 80).map((b) => `
        <div class="chip ${librosLigados.includes(b.id) ? 'active' : ''}"
             data-id="${esc(b.id)}" onclick="toggleLibroPost('${esc(b.id)}')">
          ${esc(b.title)}
        </div>`).join('')}
    </div>

    <label class="flabel" style="margin-top:14px">¿Quién puede leerla?</label>
    <div class="vis-opciones" id="post-vis">
      ${VISIBILIDADES.map((v) => `
        <div class="vis-op ${(p.visibilidad || POR_DEFECTO) === v.id ? 'active' : ''}"
             data-id="${v.id}" onclick="setVisibilidad('${v.id}')">
          <span class="vis-icono">${v.icono}</span>
          <div>
            <div class="vis-label">${esc(v.label)}</div>
            <div class="vis-sub">${esc(v.sub)}</div>
          </div>
        </div>`).join('')}
    </div>

    ${agentOffered() ? `
      <button class="btn-ghost full" style="margin-top:14px" onclick="pedirOrden()">
        Ordenar mis notas en un borrador
      </button>
      <p class="set-fineprint" style="margin-top:4px">
        Agrupa lo que has escrito y propone títulos. No escribe ni una frase.
      </p>` : ''}

    <div id="editor-estado" class="editor-estado"></div>

    <button class="btn-magic full" style="margin-top:12px" onclick="doGuardar()">Guardar</button>
    ${editando?.id ? `
      <button class="btn-ghost full" style="margin-top:8px" onclick="doBorrar()">Borrar la entrada</button>` : ''}`;

  ultimoGuardado = valorActual().cuerpo;
  visibilidadElegida = p.visibilidad || POR_DEFECTO;
  tipoElegido = tipo;
}

let tipoElegido = 'nota';
let visibilidadElegida = POR_DEFECTO;

export function setTipoPost(id) {
  editando = { ...valorActual(), id: editando?.id || null };
  tipoElegido = id;
  editando.tipo = id;
  pintarEditor();
}

export function setVisibilidad(id) {
  visibilidadElegida = id;
  const caja = $('post-vis');
  if (!caja) return;
  [...caja.children].forEach((el) => el.classList.toggle('active', el.dataset.id === id));
}

export function toggleLibroPost(id) {
  if (librosLigados.includes(id)) librosLigados = librosLigados.filter((x) => x !== id);
  else if (librosLigados.length >= MAX_LIBROS) {
    toast(`Como mucho ${MAX_LIBROS} libros`, 'error');
    return;
  } else librosLigados = [...librosLigados, id];

  const el = document.querySelector(`#post-libros .chip[data-id="${CSS.escape(id)}"]`);
  if (el) el.classList.toggle('active', librosLigados.includes(id));
}

/** Meter una marca alrededor de lo seleccionado, o donde esté el cursor. */
export function insertarMarca(antes, despues) {
  const t = $('post-cuerpo');
  if (!t) return;
  const a = t.selectionStart;
  const b = t.selectionEnd;
  const dentro = t.value.slice(a, b);
  const abre = antes.replace('&gt;', '>');
  t.value = t.value.slice(0, a) + abre + dentro + despues + t.value.slice(b);
  t.focus();
  t.selectionStart = a + abre.length;
  t.selectionEnd = a + abre.length + dentro.length;
  marcarSucio();
}

/* ── EL BORRADOR AUTOMÁTICO ──────────────────────────────────── */

const valorActual = () => ({
  ...(editando || {}),
  tipo: tipoElegido,
  titulo: $('post-titulo')?.value || '',
  cuerpo: $('post-cuerpo')?.value || '',
  pagina: $('post-pagina')?.value || null,
  visibilidad: visibilidadElegida,
  libros: librosLigados.map((id) => findBook(id)).filter(Boolean),
});

export function marcarSucio() {
  if (!desdeCuando) desdeCuando = Date.now();
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    const v = valorActual();
    if (!tocaGuardar({ actual: v.cuerpo, guardado: ultimoGuardado, desde: desdeCuando })) return;
    guardarBorrador(v);
    ultimoGuardado = v.cuerpo;
    desdeCuando = 0;
    const e = $('editor-estado');
    if (e) {
      e.textContent = 'Borrador guardado aquí';
      setTimeout(() => { if (e.textContent === 'Borrador guardado aquí') e.textContent = ''; }, 2000);
    }
  }, 1600);
}

const clave = () => `bib:${myUid() || 'anon'}:${CLAVE_BORRADOR}`;

function guardarBorrador(v) {
  try {
    if (v) localStorage.setItem(clave(), JSON.stringify(v));
    else localStorage.removeItem(clave());
  } catch { /* sin sitio: se pierde el borrador, no el texto en pantalla */ }
}

function leerBorrador() {
  try {
    const raw = localStorage.getItem(clave());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* ── GUARDAR DE VERDAD ───────────────────────────────────────── */

export async function doGuardar() {
  const r = await guardar({ ...valorActual(), id: editando?.id || null });
  if (!r.ok) { toast(r.error, 'error'); return; }
  guardarBorrador(null);
  clearTimeout(temporizador);
  closeSheet('editor-overlay');
  entradas = await misEntradas();
  pintarLista();
  toast(r.entrada.visibilidad === 'privada' ? 'Guardada, solo para ti' : 'Guardada y publicada');
}

export async function doBorrar() {
  const seguro = await confirmAction({
    title: '¿Borrar esta entrada?',
    body: 'No se puede deshacer.',
    confirmLabel: 'Borrar',
    danger: true,
  });
  if (!seguro) return;
  await borrar(editando.id);
  closeSheet('editor-overlay');
  entradas = await misEntradas();
  pintarLista();
  toast('Borrada');
}

export const closeEditor = (e) => {
  if (e && e.target !== $('editor-overlay')) return;
  /* Al cerrar se guarda el borrador siempre, aunque no haya pasado el
     tiempo: cerrar es justo cuando se pierde un texto. */
  const v = valorActual();
  if (String(v.cuerpo).trim() || String(v.titulo).trim()) guardarBorrador(v);
  clearTimeout(temporizador);
  closeSheet('editor-overlay');
};

/* ── INSERTAR UNA CITA GUARDADA  ·  #72 con 1.8 ──────────────── */

export function openInsertarCita() {
  const citas = allQuotes();
  openSheet('citapick-overlay');
  $('citapick-body').innerHTML = citas.length ? citas.slice(0, 60).map((c, i) => `
    <div class="post-card" onclick="meterCita(${i})">
      <div class="post-adelanto">${esc(adelanto(c.text, 160))}</div>
      <div class="post-tipo">${esc(c.bookTitle || '')}${c.page ? ` · p. ${c.page}` : ''}</div>
    </div>`).join('') : `
    <div class="empty">
      <div class="empty-rune">❝</div>
      <div class="empty-text">Todavía no has guardado ninguna cita</div>
    </div>`;
}

export const closeCitaPick = (e) => {
  if (!e || e.target === $('citapick-overlay')) closeSheet('citapick-overlay');
};

export function meterCita(i) {
  const c = allQuotes()[i];
  if (!c) return;
  const t = $('post-cuerpo');
  if (t) {
    const trozo = citaComoTexto(c, { title: c.bookTitle });
    t.value = `${t.value}${t.value.endsWith('\n') || !t.value ? '' : '\n\n'}${trozo}`;
    marcarSucio();
  }
  closeSheet('citapick-overlay');
}

/* ── ORDENAR CON EL ASISTENTE  ·  #74 ────────────────────────── */

/**
 * Se le mandan las notas y vuelve el AGRUPAMIENTO POR NÚMEROS.
 *
 * El borrador lo arma `plantillaDesdeNotas` con el texto de quien
 * escribió: el asistente no puede colar una frase porque por ese canal
 * no cabe texto. Ver el comentario del intent en worker/index.js.
 */
export async function pedirOrden() {
  const cuerpo = $('post-cuerpo')?.value || '';
  const notas = cuerpo.split(/\n{2,}/).map((n) => n.trim()).filter(Boolean);

  if (notas.length < 2) {
    toast('Escribe unas cuantas notas primero, separadas por una línea en blanco', 'error');
    return;
  }

  const estado = $('editor-estado');
  if (estado) estado.textContent = 'Ordenando…';

  try {
    /* Por trozos, no todo de golpe: lo pide la historia y además evita
       mandar un texto larguísimo de una vez. */
    const trozos = porTrozos(notas);
    const secciones = [];
    const titulos = [];
    let base = 0;

    for (const trozo of trozos) {
      const r = await orderNotes(trozo);
      if (r) {
        for (const s of r.secciones) {
          secciones.push({ ...s, notas: s.notas.map((n) => n + base) });
        }
        titulos.push(...r.titulos);
      }
      base += trozo.length;
    }

    if (!secciones.length) {
      if (estado) estado.textContent = '';
      toast('No se pudo ordenar. Tu texto está intacto.', 'error');
      return;
    }

    const t = $('post-cuerpo');
    if (t) { t.value = plantillaDesdeNotas({ notas, secciones }); marcarSucio(); }
    if (editando) editando.ayudaDelAgente = true;
    else editando = { ayudaDelAgente: true };

    if (estado) estado.innerHTML = `<span class="editor-agente">${esc(AVISO_AGENTE)}</span>`;

    if (titulos.length) {
      toast(`Títulos propuestos: ${titulos.slice(0, 3).join(' · ')}`);
    }
  } catch (e) {
    if (estado) estado.textContent = '';
    if (isDenied(e)) return;
    toast('No se pudo ordenar. Tu texto está intacto.', 'error');
  }
}

export { aHtml };
