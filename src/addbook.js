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

/* Lo que la app está haciendo AHORA MISMO, cuando tarda.

     «Por la portada no se toma la foto, ni tampoco hay alguna barra o
      círculo de carga para ver que el código está haciendo algo.»

   Las dos mitades eran otra vez la misma cosa. La foto SÍ se tomaba:
   lo que pasaba después es que se apagaba la cámara —así que la
   pantalla se quedaba negra—, aparecía una línea de texto que no se
   movía, y detrás empezaba a bajar el motor de OCR con su diccionario,
   varios megas, en silencio. Sin ver la foto y sin ver movimiento, lo
   único razonable que se puede pensar es que no se tomó.

   Así que ahora se enseña la foto EN CUANTO se dispara —que es la
   prueba de que salió— y debajo qué se está haciendo, con barra. */
let trabajo = null;        // { foto, frase, parte }

export function openAdd() {
  mode = 'titulo';
  draft = null;
  trabajo = null;
  render();
  openSheet('add-overlay');
}

export function closeAdd(e) {
  if (e && e.target !== $('add-overlay')) return;
  closeAddSheet();
}

export function closeAddSheet() {
  pararEscaner();
  trabajo = null;
  clearTimeout(searchTimer);
  closeSheet('add-overlay');
}

export function setAddMode(next) {
  if (mode === 'camara' && next !== 'camara') pararEscaner();
  mode = next;
  draft = null;
  trabajo = null;
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
      ${/* «Con la cámara» no dice qué hay que hacer con la cámara. Con
            un código de barras y una portada detrás del mismo nombre,
            lo único que se puede hacer es adivinar. */''}
      ${tab('camara', 'Código de barras')}
      ${tab('manual', 'A mano')}
    </div>
    ${trabajo ? renderTrabajo()
      : draft ? renderDraft()
      : { titulo: renderTitulo, camara: renderCamara, manual: renderManual }[mode]()}`;
}

/* La foto arriba y el estado debajo. La foto no se vuelve a pintar en
   cada avance —parpadearía— así que el texto y la barra se actualizan
   por su cuenta en `pintarTrabajo`. */
function renderTrabajo() {
  return `
    <div class="foto-tomada">
      <img src="${esc(trabajo.foto)}" alt="La foto de la portada que acabas de tomar">
    </div>
    <div class="trabajo">
      <span class="trabajo-giro" aria-hidden="true"></span>
      <span class="trabajo-txt" id="trabajo-txt">${esc(trabajo.frase)}</span>
    </div>
    <div class="trabajo-bar ${trabajo.parte == null ? 'sin-fin' : ''}" id="trabajo-bar"
         role="progressbar" aria-label="${esc(trabajo.frase)}">
      <i style="width:${trabajo.parte == null ? 100 : Math.round(trabajo.parte * 100)}%"></i>
    </div>
    <button class="btn-ghost full" style="margin-top:14px" onclick="cancelarPortada()">
      Cancelar
    </button>`;
}

/** Mover el estado sin repintar la foto. */
function pintarTrabajo() {
  if (!trabajo) return;
  const txt = $('trabajo-txt');
  const bar = $('trabajo-bar');
  if (!txt || !bar) { render(); return; }
  txt.textContent = trabajo.frase;
  bar.setAttribute('aria-label', trabajo.frase);
  bar.classList.toggle('sin-fin', trabajo.parte == null);
  const relleno = bar.querySelector('i');
  if (relleno) relleno.style.width = trabajo.parte == null ? '100%' : `${Math.round(trabajo.parte * 100)}%`;
}

/** Volver a la cámara desde la espera de la portada. */
export function cancelarPortada() {
  trabajo = null;
  mode = 'camara';
  render();
  startCamera();
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
/* ── Y AHORA, QUÉ HAY QUE HACER  ·  segunda vuelta ───────────

     «¿Por qué no dice "toma la foto del código de barras" o algo así?
      Están mezclados código de barras y portada, pero ninguna es clara
      para el usuario. ¿Cuánto tiempo debo tener la cámara en el código
      de barras? ¿Si lo leyó bien o no? No es claro.»

   Tres preguntas distintas y las tres sin contestar en pantalla:

   1 · QUÉ APUNTAR. La instrucción existía, pero era el mismo hueco que
       el estado, así que en cuanto empezaba a buscar se sobrescribía
       con «Buscando el código…» y ya no volvía. La única frase que
       decía qué hacer duraba medio segundo. Ahora son DOS SITIOS: una
       instrucción fija encima del vídeo, que no se toca nunca, y el
       estado debajo, que va cambiando.

   2 · CUÁNTO HAY QUE AGUANTAR. Ninguno: lee solo, en cuanto lo ve
       nítido. Pero eso hay que decirlo, porque la pregunta es
       razonable —con una cámara encendida y un círculo girando, lo
       normal es pensar que hay que mantenerla quieta un rato— y la
       respuesta no se puede deducir mirando.

   3 · SI LO LEYÓ BIEN. Esta es la importante y es la más fácil: se
       enseñan LOS DÍGITOS, agrupados igual que van impresos debajo de
       las barras (9 786287 794108). Así no hay que creerse nada: se
       mira el libro, se mira la pantalla, y o coinciden o no.

   Y la portada deja de estar pegada al escáner como si fuera parte de
   lo mismo: va debajo, separada, y con su pregunta delante. */
function renderCamara() {
  return `
    <p class="scan-guia">
      Apunta al <b>código de barras</b> de la contraportada.
      Se lee solo: no hay que tocar nada ni aguantar, en cuanto se vea
      nítido lo coge.
    </p>
    <div class="scan-stage">
      <video id="scan-video" playsinline muted autoplay></video>
      <div class="scan-frame buscando" id="scan-frame"></div>
    </div>
    <div class="trabajo" id="scan-estado">
      <span class="trabajo-giro" aria-hidden="true"></span>
      <span class="trabajo-txt" id="scan-hint">Buscando el código…</span>
    </div>
    <div class="scan-otro">
      <p class="set-fineprint">¿Este libro no tiene código de barras?</p>
      <button class="btn-ghost full" onclick="shootCover()">
        ${ico('camara')} Tomar foto de la portada
      </button>
    </div>`;
}

/* Los dígitos como van impresos debajo de las barras: 1, 6 y 6. Se
   enseñan tal cual para que se puedan COMPARAR con el libro que se
   tiene en la mano, que es la única forma de contestar «¿lo leyó
   bien?» sin pedir un acto de fe. */
export function agruparCodigo(code) {
  const d = String(code || '').replace(/\D/g, '');
  if (d.length !== 13) return String(code || '');
  return `${d[0]} ${d.slice(1, 7)} ${d.slice(7)}`;
}

/**
 * El estado de debajo del vídeo: girando o quieto, y con qué texto.
 *
 * `detalle` es lo que dijeron los catálogos al fallar, en letra
 * pequeña. Va en pantalla por lo mismo que en la hoja de los cafés: sin
 * él, lo único que se puede contar de vuelta es «no funcionó», y con
 * eso no se arregla nada. Con el detalle del mapa se encontró la causa
 * real en una tarde.
 */
function estado(texto, { girando = true, codigo = '', detalle = '' } = {}) {
  const caja = $('scan-estado');
  if (!caja) return;
  caja.innerHTML = `
    ${girando ? '<span class="trabajo-giro" aria-hidden="true"></span>' : ''}
    <span class="trabajo-txt" id="scan-hint">
      ${codigo ? `<b class="scan-codigo">${esc(agruparCodigo(codigo))}</b>` : ''}${esc(texto)}
      ${detalle ? `<span class="lugares-detalle">Detalle técnico: ${esc(detalle)}</span>` : ''}
    </span>`;
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

export function discardDraft() { draft = null; trabajo = null; render(); }

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
    estado('No se pudo abrir la cámara. Revisa el permiso, o añade el libro por título.',
      { girando: false });
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
  if (!v) { mirando = false; return; }
  /* Volver a mirar tiene que VERSE: si el marco se quedó quieto tras
     leer un código que no estaba en los catálogos, la pantalla seguiría
     diciendo que ya terminó mientras la cámara busca otra vez. */
  $('scan-frame')?.classList.replace('leido', 'buscando');
  estado('Buscando el código…');

  const desde = Date.now();
  const aviso = setInterval(() => {
    if (!mirando) return;
    if (Date.now() - desde > 8000) {
      estado('Sigo buscando… acércate un poco más, o busca mejor luz.');
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

/* Se exporta para que la prueba de navegador ejecute ESTA función y no
   una copia suya. Es lo mismo que se hizo con `filaDeQuienSigues`: una
   copia enseña lo que uno cree que escribió, no lo que escribió. */
export async function usarCodigo(code) {
  /* «Código leído» pide que te lo creas. Los dígitos, no: están
     impresos debajo de las barras del libro que tienes en la mano, así
     que o coinciden o no, y eso se ve de un vistazo. Era la pregunta
     más directa de las tres —«¿si lo leyó bien o no?»— y la que menos
     cuesta contestar. */
  $('scan-frame')?.classList.replace('buscando', 'leido');
  estado(' · Buscando el libro…', { codigo: code });

  const res = await lookupByIsbn(code);
  if (!res.ok) {
    /* «Prueba con la portada» es un mal consejo si lo que pasa es que
       los catálogos no contestan: la foto acaba en la misma consulta y
       va a fallar igual. Leímos su código bien; lo que falta es el otro
       lado.

       El código se sigue enseñando en los tres casos: si no coincide
       con el del libro, ahí está el fallo y se ve solo. */
    estado({
      'isbn-invalido': ' · no es un ISBN válido. Prueba con la foto de la portada.',
      'catalogos-caidos': ' · lo leímos bien, pero los catálogos no contestan ahora mismo. '
        + 'Vuelve a intentarlo en un rato.',
      /* «No está» y «no está en el que pudo contestar» no son lo mismo,
         y mandar a por la portada en el segundo caso es mandar a la
         misma consulta que acaba de fallar. */
      'no-encontrado-a-medias': ' · lo leímos bien, pero uno de los dos catálogos no contestó '
        + 'y el otro no lo tiene. Vuelve a intentarlo en un rato antes de darlo por perdido.',
    }[res.reason] || ' · no está en los catálogos. Prueba con la foto de la portada, '
      + 'o escribe el título a mano.',
    { girando: false, codigo: code, detalle: res.detalle });
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
  if (!v) return;

  /* ¿HAY CUADRO? Si el vídeo todavía no da imagen —el permiso recién
     dado, la cámara arrancando— `grabFrame` devuelve un lienzo en
     negro y el OCR se pasa medio minuto leyendo la nada. Antes eso
     acababa en «no lo reconocimos», que es mentira: no es que no se
     reconociera, es que no había foto. */
  if (!v.videoWidth || !v.videoHeight) {
    estado('La cámara todavía no da imagen. Espera un segundo y vuelve a intentarlo.',
      { girando: false });
    return;
  }

  const canvas = grabFrame(v);
  const photo = frameToDataUrl(canvas);
  /* Se para TODO, no solo la cámara: el bucle de códigos seguiría
     pidiéndole cuadros a un vídeo apagado durante todo el OCR. */
  pararEscaner();

  /* Y AQUÍ SE ENSEÑA LA FOTO, antes de nada. Es lo primero que se
     quiere saber —¿salió?— y hasta ahora la respuesta era una pantalla
     negra durante todo el rato que tardara el OCR. */
  trabajo = { foto: photo, frase: 'Preparando el lector…', parte: null };
  render();

  let text = '';
  try {
    text = await readText(canvas, (parte, frase) => {
      if (!trabajo) return;
      trabajo.frase = frase;
      trabajo.parte = parte;
      pintarTrabajo();
    });
  } catch (e) {
    /* La foto NO se pierde. Se queda de portada y se rellena a mano,
       que es mucho mejor que mandarla a empezar de cero. */
    trabajo = null;
    mode = 'manual';
    draft = {
      title: '', author: '', pages: '—', cover: photo,
      genre: 'Novela contemporánea', source: 'foto',
    };
    render();
    toast(`${e.message || 'No se pudo leer la portada.'} La foto se guarda: pon el título a mano.`, 'error');
    return;
  }
  if (!trabajo) return;                 // se canceló mientras leía

  trabajo.frase = 'Buscando el libro en los catálogos…';
  trabajo.parte = null;
  pintarTrabajo();

  // 1) Los catálogos, que son gratis y fiables
  const res = await lookupByCoverText(text);
  if (!trabajo) return;
  if (res.ok) {
    trabajo = null;
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
  if (res.reason === 'catalogos-caidos' || res.reason === 'sin-coincidencia-a-medias') {
    /* La foto tampoco se tira aquí. Se vuelve a la cámara, pero con el
       libro ya en la ficha y la foto puesta: si los catálogos no
       contestan, al menos queda guardarlo a mano sin repetir la foto. */
    trabajo = null;
    mode = 'manual';
    draft = {
      title: text.split('\n').map((l) => l.trim()).filter(Boolean)[0] || '',
      author: '', pages: '—', cover: photo, genre: 'Novela contemporánea', source: 'foto',
    };
    render();
    /* La foto salió bien: lo que falló es el otro lado. Decirlo así
       importa, porque «no lo reconocimos» invita a repetir la foto —y
       repetirla no va a arreglar un catálogo que no contesta. */
    toast(res.reason === 'catalogos-caidos'
      ? 'La foto salió bien, pero los catálogos no contestan. Revisa los datos y guárdalo.'
      : 'La foto salió bien, pero uno de los catálogos no contestó y el otro no lo tiene. '
        + 'Revisa los datos y guárdalo, o inténtalo en un rato.', 'error');
    return;
  }

  // 2) Solo si fallan, el agente traduce el texto sucio del OCR
  if (agentAvailable()) {
    trabajo.frase = 'Los catálogos no lo reconocen. Preguntando al agente…';
    trabajo.parte = null;
    pintarTrabajo();
    const guess = await identifyFromCoverText(text);
    if (!trabajo) return;
    if (guess) {
      const found = await lookupByTitle(`${guess.title} ${guess.author}`.trim());
      if (!trabajo) return;
      trabajo = null;
      draft = found.length
        ? { ...found[0], cover: found[0].cover || photo, source: 'agente' }
        : { title: guess.title, author: guess.author, pages: '—', cover: photo, genre: 'Novela contemporánea', source: 'agente' };
      render();
      return;
    }
  }

  // 3) Nada lo reconoce: la foto queda de portada y se completa a mano
  trabajo = null;
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
