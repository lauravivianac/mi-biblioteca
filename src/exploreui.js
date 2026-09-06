/* ─────────────────────────────────────────────────────────────
   TRUEQUE · las pantallas  ·  historias #83 y #84

   Una pestaña para mirar lo que hay, una hoja para pedirlo, y otra
   para las conversaciones abiertas.

   LO QUE YA TIENES PENDIENTE VA MARCADO Y VA ARRIBA. Es la nota de la
   #83 y es lo único que separa esto de un tablón de anuncios: una
   lista de libros ajenos no dice nada, pero «tienes esto pendiente y
   lo tiene alguien de tu barrio» sí.

   Y NUNCA SE ENSEÑA DÓNDE VIVE NADIE. Ciudad, zona si la puso, y un
   escalón de cercanía. Nada más, porque nada más está guardado.
   ───────────────────────────────────────────────────────────── */

import { explorar } from './explore.js';
import {
  misEnviadas, misRecibidas, yaSolicitado, solicitar, responder,
} from './requests.js';
import {
  AMBITOS, ambitoLabel, indiceDeMisLibros, miEstadoCon, marcaDe,
  distanciaTexto, filtrar, ordenar, opcionesDe, hayFiltros, vacio,
  ESCALONES, PROMESA_EXPLORAR,
} from './explore-core.js';
import {
  MAX_OFRECIDOS, MAX_MENSAJE, estadoTexto, estaViva, resumenOferta,
  puedeResponder, puedeCerrarContra, puedeCancelar, porAtender,
  VACIO_ENVIADAS, VACIO_RECIBIDAS,
} from './requests-core.js';
import { ESTADOS, resumenPublicacion } from './swap-core.js';
import { placeTexto, tieneCiudad } from './place-core.js';
import { allBooks, statusOf, myPlace, uid as myUid } from './store.js';
import { $, esc, toast, openSheet, closeSheet } from './ui.js';

/* Lo que hay en pantalla ahora mismo. Se guarda porque los filtros
   repintan sin volver a la red: la consulta ya se pagó. */
let traidas = [];
let ambito = 'ciudad';
let filtros = {
  texto: '', genero: '', autor: '', estado: '', minimoCercania: 0, soloMiLista: false,
};
let pedida = null;          // la publicación que se está pidiendo
let ofrecidos = new Set();  // los libros que ofrezco a cambio

const indice = () => indiceDeMisLibros(
  allBooks().map((b) => ({ ...b, status: statusOf(b.id) })),
);

const contexto = () => {
  const p = myPlace() || {};
  return { indice: indice(), mio: p.geohash || null, miCityKey: p.cityKey || '' };
};

/* ── LA PESTAÑA  ·  #83 ──────────────────────────────────────── */

function pintarAmbitos() {
  const barra = $('trueque-ambitos');
  if (!barra) return;
  barra.innerHTML = AMBITOS.map((a) => `
    <div class="chip ${ambito === a.id ? 'active' : ''}" onclick="setAmbito('${a.id}')">
      ${esc(a.label)}
    </div>`).join('');
}

export async function renderTrueque() {
  const cuerpo = $('trueque-body');
  if (!cuerpo) return;
  pintarAmbitos();
  cuerpo.innerHTML = '<p class="planner-hint">Buscando…</p>';

  const r = await explorar(ambito);
  if (r.sinCiudad || r.sinPais) {
    traidas = [];
    pintarVacio(vacio({ ambito, sinCiudad: true }));
    return;
  }
  if (r.error) {
    traidas = [];
    cuerpo.innerHTML = `<p class="planner-hint warn">${esc(r.error)}</p>`;
    return;
  }
  traidas = r.publicaciones;
  pintarLista();
}

/** Cambiar de ámbito vuelve a la red; cambiar de filtro, no. */
export function setAmbito(id) {
  if (!AMBITOS.some((a) => a.id === id)) return;
  ambito = id;
  renderTrueque();
}

export function setFiltroTexto(v) { filtros.texto = v; pintarLista(); }
export function setFiltro(campo, valor) {
  if (!(campo in filtros)) return;
  filtros[campo] = filtros[campo] === valor ? (typeof valor === 'string' ? '' : 0) : valor;
  pintarLista();
}
export function toggleMiLista() { filtros.soloMiLista = !filtros.soloMiLista; pintarLista(); }
export function limpiarFiltros() {
  filtros = { texto: '', genero: '', autor: '', estado: '', minimoCercania: 0, soloMiLista: false };
  const c = $('trueque-buscar');
  if (c) c.value = '';
  pintarLista();
}

function pintarVacio(v) {
  const cuerpo = $('trueque-body');
  if (!cuerpo) return;
  const boton = {
    ciudad: `<button class="btn-magic full" onclick="openPlace()">${esc(v.accionTexto)}</button>`,
    limpiar: `<button class="btn-ghost full" onclick="limpiarFiltros()">${esc(v.accionTexto)}</button>`,
    ampliar: `<button class="btn-magic full" onclick="setAmbito('${esc(v.siguiente || '')}')">${esc(v.accionTexto)}</button>`,
    ofrecer: '<button class="btn-ghost full" onclick="nav(\'biblioteca\')">Ir a mi biblioteca</button>',
  }[v.accion] || '';

  cuerpo.innerHTML = `
    <div class="empty">
      <div class="empty-rune">${v.rune}</div>
      <div class="empty-text">${esc(v.texto)}</div>
    </div>
    <p class="set-fineprint" style="text-align:center;margin-bottom:14px">${esc(v.detalle)}</p>
    ${boton}`;
}

function pintarLista() {
  const cuerpo = $('trueque-body');
  if (!cuerpo) return;

  const ctx = contexto();
  const visibles = ordenar(filtrar(traidas, { ...filtros, ...ctx }), ctx);
  const { generos, autores } = opcionesDe(traidas);

  if (!visibles.length) {
    pintarVacio(vacio({
      ambito,
      ciudad: myPlace()?.city || '',
      conFiltros: hayFiltros(filtros),
      sinCiudad: !tieneCiudad(myPlace()) && ambito === 'ciudad',
    }));
    return;
  }

  const chip = (activo, etiqueta, alPulsar) =>
    `<div class="chip ${activo ? 'active' : ''}" onclick="${alPulsar}">${esc(etiqueta)}</div>`;

  const filtroChips = `
    <div class="filter-scroll">
      ${chip(filtros.soloMiLista, '⭐ Solo mis pendientes', 'toggleMiLista()')}
      ${ESCALONES.map((e) => chip(
    filtros.minimoCercania === e.letras, e.texto, `setFiltro('minimoCercania',${e.letras})`,
  )).join('')}
    </div>
    ${generos.length > 1 ? `<div class="filter-scroll">
      ${generos.slice(0, 12).map((g) => chip(
    filtros.genero === g.valor, `${g.valor} (${g.n})`, `setFiltro('genero','${esc(g.valor).replace(/'/g, '&#39;')}')`,
  )).join('')}
    </div>` : ''}
    ${autores.length > 1 ? `<div class="filter-scroll">
      ${autores.slice(0, 10).map((a) => chip(
    filtros.autor === a.valor, a.valor, `setFiltro('autor','${esc(a.valor).replace(/'/g, '&#39;')}')`,
  )).join('')}
    </div>` : ''}
    <div class="filter-scroll">
      ${ESTADOS.map((e) => chip(filtros.estado === e.id, e.label, `setFiltro('estado','${e.id}')`)).join('')}
    </div>`;

  cuerpo.innerHTML = `
    ${filtroChips}
    ${hayFiltros(filtros) ? `<button class="btn-mini" onclick="limpiarFiltros()" style="margin-bottom:10px">Quitar filtros</button>` : ''}
    <p class="set-fineprint">${esc(PROMESA_EXPLORAR)}</p>
    ${visibles.map((p) => ficha(p, ctx)).join('')}`;
}

function ficha(p, ctx) {
  const marca = marcaDe(miEstadoCon(p, ctx.indice));
  const quien = p.username ? `@${p.username}` : (p.name || 'Alguien');
  return `
    <div class="swap-card ${marca ? `marca-${marca.clase}` : ''}">
      ${marca ? `<div class="swap-marca">${esc(marca.texto)}</div>` : ''}
      <div class="swap-cab">
        ${p.cover ? `<img class="swap-portada" src="${esc(p.cover)}" alt="">` : ''}
        <div>
          <div class="swap-title">${esc(p.title)}</div>
          <div class="swap-sub">${esc(p.author)}</div>
          <div class="swap-sub">${esc(resumenPublicacion(p))}</div>
        </div>
      </div>
      ${p.nota ? `<p class="swap-nota">${esc(p.nota)}</p>` : ''}
      ${p.foto ? `<img class="swap-foto" src="${esc(p.foto)}" alt="Foto del ejemplar">` : ''}
      ${p.suelto ? '' : `<div class="swap-sub">A cambio de: ${esc(p.aCambioDe || 'algo que le guste')}</div>`}
      <div class="swap-lugar">
        📍 ${esc(distanciaTexto(p, ctx.mio, ctx.miCityKey))} · ${esc(placeTexto(p))}
      </div>
      <div class="swap-acciones">
        <button class="btn-mini" onclick="openAsk('${esc(p.id)}')">Pedirlo</button>
        <button class="btn-mini" onclick="openProfile('${esc(p.username || '')}')">${esc(quien)}</button>
      </div>
    </div>`;
}

/* ── PEDIRLO  ·  #84 ─────────────────────────────────────────── */

export async function openAsk(swapId) {
  pedida = traidas.find((p) => p.id === swapId) || null;
  ofrecidos = new Set();
  if (!pedida) { toast('Esa publicación ya no está', 'error'); return; }

  openSheet('ask-overlay');
  $('ask-body').innerHTML = '<p class="planner-hint">Un momento…</p>';

  const previa = await yaSolicitado(swapId);
  if (previa && estaViva(previa)) {
    $('ask-body').innerHTML = `
      <p class="planner-hint">Ya le pediste este libro.</p>
      <div class="swap-card">
        <div class="swap-title">${esc(previa.title)}</div>
        <div class="swap-sub">${esc(estadoTexto(previa, myUid()))}</div>
      </div>
      <button class="btn-magic full" onclick="closeSheet('ask-overlay');openSwaps()">
        Ver mis intercambios
      </button>`;
    return;
  }
  pintarFormularioAsk();
}

export const closeAsk = (e) => { if (!e || e.target === $('ask-overlay')) closeSheet('ask-overlay'); };

function pintarFormularioAsk() {
  /* Solo se pueden ofrecer libros LEÍDOS, por lo mismo que para
     publicar (#82): ofrecer algo que no has leído es ofrecer algo que
     no puedes describir. */
  const mios = allBooks().filter((b) => statusOf(b.id) === 'read');

  $('ask-body').innerHTML = `
    <div class="swap-card">
      <div class="swap-title">${esc(pedida.title)}</div>
      <div class="swap-sub">${esc(pedida.author)} · ${esc(resumenPublicacion(pedida))}</div>
      ${pedida.suelto ? '' : `<div class="swap-sub">Busca: ${esc(pedida.aCambioDe || 'algo que le guste')}</div>`}
    </div>

    <label class="flabel" style="margin-top:14px">
      ¿Qué le ofreces? <span class="opt">(hasta ${MAX_OFRECIDOS})</span>
    </label>
    ${mios.length ? `
      <div class="ask-libros" id="ask-libros">
        ${mios.slice(0, 60).map((b) => `
          <div class="chip" data-id="${esc(b.id)}" onclick="toggleOfrecido('${esc(b.id)}')">
            ${esc(b.title)}
          </div>`).join('')}
      </div>`
    : `<p class="set-fineprint">
        Todavía no has terminado ningún libro, así que solo puedes pedirlo suelto.
        No pasa nada: mucha gente los da sin pedir nada a cambio.
      </p>`}

    <div class="set-row" onclick="toggleAskSuelto()" style="margin-top:10px">
      <div>
        <div class="set-row-title" id="ask-modo">Ofrezco los de arriba</div>
        <div class="set-row-sub">Toca para pedirlo suelto. Nunca se paga con dinero.</div>
      </div>
      <span class="set-chev">⇄</span>
    </div>

    <label class="flabel" style="margin-top:12px">Un mensaje <span class="opt">(opcional)</span></label>
    <textarea class="finput" id="ask-mensaje" rows="3" maxlength="${MAX_MENSAJE}"
      placeholder="Hola, me interesa mucho. Lo tengo pendiente desde hace un año."></textarea>

    <button class="btn-magic full" style="margin-top:14px" onclick="doAsk()">Mandar la solicitud</button>
    <p class="set-fineprint">
      Al mandarla ve tu @usuario y lo que ofreces. Tu ciudad y tu dirección, no.
    </p>`;
}

let askSuelto = false;

export function toggleAskSuelto() {
  askSuelto = !askSuelto;
  const t = $('ask-modo');
  const libros = $('ask-libros');
  if (t) t.textContent = askSuelto ? 'Lo pido suelto' : 'Ofrezco los de arriba';
  if (libros) libros.style.display = askSuelto ? 'none' : '';
}

export function toggleOfrecido(id) {
  if (ofrecidos.has(id)) ofrecidos.delete(id);
  else if (ofrecidos.size >= MAX_OFRECIDOS) {
    toast(`Como mucho ${MAX_OFRECIDOS} libros`, 'error');
    return;
  } else ofrecidos.add(id);

  const el = document.querySelector(`#ask-libros .chip[data-id="${CSS.escape(id)}"]`);
  if (el) el.classList.toggle('active', ofrecidos.has(id));
}

export async function doAsk() {
  const libros = allBooks().filter((b) => ofrecidos.has(b.id));
  const r = await solicitar(pedida, {
    ofrezco: libros,
    suelto: askSuelto || !libros.length,
    mensaje: $('ask-mensaje')?.value || '',
  });
  if (!r.ok) { toast(r.error, 'error'); return; }
  closeSheet('ask-overlay');
  toast('Solicitud mandada. Te avisamos cuando conteste.');
}

/* ── MIS INTERCAMBIOS  ·  #84 ────────────────────────────────── */

let enviadas = [];
let recibidas = [];
let pestana = 'recibidas';

export async function openSwaps() {
  openSheet('swaps-overlay');
  $('swaps-body').innerHTML = '<p class="planner-hint">Cargando…</p>';
  [enviadas, recibidas] = await Promise.all([misEnviadas(), misRecibidas()]);
  pintarSwaps();
}

export const closeSwaps = (e) => { if (!e || e.target === $('swaps-overlay')) closeSheet('swaps-overlay'); };

export function setPestanaSwaps(cual) { pestana = cual; pintarSwaps(); }

function pintarSwaps() {
  const cuerpo = $('swaps-body');
  if (!cuerpo) return;
  const lista = porAtender(pestana === 'recibidas' ? recibidas : enviadas);
  const sinAtender = recibidas.filter(estaViva).length;

  const v = pestana === 'recibidas' ? VACIO_RECIBIDAS : VACIO_ENVIADAS;

  cuerpo.innerHTML = `
    <div class="filter-scroll">
      <div class="chip ${pestana === 'recibidas' ? 'active' : ''}" onclick="setPestanaSwaps('recibidas')">
        Te piden${sinAtender ? ` (${sinAtender})` : ''}
      </div>
      <div class="chip ${pestana === 'enviadas' ? 'active' : ''}" onclick="setPestanaSwaps('enviadas')">
        Has pedido
      </div>
    </div>
    ${lista.length ? lista.map(tarjetaSolicitud).join('') : `
      <div class="empty">
        <div class="empty-rune">${v.rune}</div>
        <div class="empty-text">${esc(v.texto)}</div>
      </div>
      <p class="set-fineprint" style="text-align:center">${esc(v.detalle)}</p>`}`;
}

function tarjetaSolicitud(s) {
  const yo = myUid();
  const quien = s.de === yo
    ? ''
    : (s.deUsuario ? `@${s.deUsuario}` : (s.deNombre || 'Alguien'));

  const acciones = [];
  if (puedeResponder(s, yo)) {
    acciones.push(`<button class="btn-mini" onclick="answer('${esc(s.id)}','aceptada')">Aceptar</button>`);
    acciones.push(`<button class="btn-mini" onclick="openCounter('${esc(s.id)}')">Contraproponer</button>`);
    acciones.push(`<button class="btn-mini" onclick="answer('${esc(s.id)}','rechazada')">Rechazar</button>`);
  }
  if (puedeCerrarContra(s, yo)) {
    acciones.push(`<button class="btn-mini" onclick="answer('${esc(s.id)}','aceptada')">Me vale</button>`);
    acciones.push(`<button class="btn-mini" onclick="answer('${esc(s.id)}','rechazada')">No, gracias</button>`);
  }
  if (puedeCancelar(s, yo)) {
    acciones.push(`<button class="btn-mini" onclick="answer('${esc(s.id)}','cancelada')">Retirarla</button>`);
  }

  return `
    <div class="swap-card ${estaViva(s) ? 'viva' : 'cerrada'}">
      <div class="swap-cab">
        ${s.cover ? `<img class="swap-portada" src="${esc(s.cover)}" alt="">` : ''}
        <div>
          <div class="swap-title">${esc(s.title)}</div>
          <div class="swap-sub">${esc(s.author)}</div>
          <div class="swap-estado">${esc(estadoTexto(s, yo))}${quien ? ` · ${esc(quien)}` : ''}</div>
        </div>
      </div>
      <div class="swap-sub">${esc(resumenOferta(s))}</div>
      ${s.mensaje ? `<p class="swap-nota">«${esc(s.mensaje)}»</p>` : ''}
      ${s.contraoferta ? `
        <div class="swap-contra">
          <b>Contrapropuesta:</b>
          ${s.contraoferta.pido?.length
    ? esc(s.contraoferta.pido.map((b) => b.title).join(', '))
    : 'sin libros concretos'}
          ${s.contraoferta.mensaje ? `<br>«${esc(s.contraoferta.mensaje)}»` : ''}
        </div>` : ''}
      ${s.estado === 'aceptada' ? `
        <p class="set-fineprint">
          Aceptada. Poneos de acuerdo para quedar — y quedad siempre en un sitio
          público y con gente.
        </p>` : ''}
      ${acciones.length ? `<div class="swap-acciones">${acciones.join('')}</div>` : ''}
    </div>`;
}

const buscarSolicitud = (id) => [...recibidas, ...enviadas].find((s) => s.id === id) || null;

export async function answer(id, estado) {
  const s = buscarSolicitud(id);
  if (!s) return;
  const r = await responder(s, estado);
  if (!r.ok) { toast(r.error || 'No se pudo', 'error'); return; }
  [enviadas, recibidas] = await Promise.all([misEnviadas(), misRecibidas()]);
  pintarSwaps();
  toast({
    aceptada: '¡Aceptada! Poneos de acuerdo.',
    rechazada: 'Rechazada.',
    cancelada: 'Retirada.',
  }[estado] || 'Hecho');
}

/* ── CONTRAPROPONER ──────────────────────────────────────────── */

let contra = null;
let contraPido = new Set();

export function openCounter(id) {
  contra = buscarSolicitud(id);
  contraPido = new Set();
  if (!contra) return;
  const mios = allBooks().filter((b) => statusOf(b.id) === 'read');

  openSheet('counter-overlay');
  $('counter-body').innerHTML = `
    <p class="planner-hint">
      Le puedes decir que ese no, pero que te interesa otra cosa. Lo que pidió
      sigue a la vista para las dos.
    </p>
    <div class="swap-card">
      <div class="swap-title">${esc(contra.title)}</div>
      <div class="swap-sub">${esc(resumenOferta(contra))}</div>
    </div>
    <label class="flabel" style="margin-top:12px">¿Qué le pides a cambio?</label>
    <p class="set-fineprint" style="margin-top:0">
      De momento solo puedes señalar libros tuyos, para que sepa por dónde vas.
    </p>
    <div class="ask-libros" id="counter-libros">
      ${mios.slice(0, 60).map((b) => `
        <div class="chip" data-id="${esc(b.id)}" onclick="toggleContraPido('${esc(b.id)}')">
          ${esc(b.title)}
        </div>`).join('')}
    </div>
    <label class="flabel" style="margin-top:12px">Y dile por qué</label>
    <textarea class="finput" id="counter-mensaje" rows="3" maxlength="${MAX_MENSAJE}"
      placeholder="Ese ya lo tengo, pero me interesaría mucho otro tuyo."></textarea>
    <button class="btn-magic full" style="margin-top:12px" onclick="doCounter()">Mandar</button>`;
}

export const closeCounter = (e) => { if (!e || e.target === $('counter-overlay')) closeSheet('counter-overlay'); };

export function toggleContraPido(id) {
  if (contraPido.has(id)) contraPido.delete(id);
  else if (contraPido.size >= MAX_OFRECIDOS) {
    toast(`Como mucho ${MAX_OFRECIDOS} libros`, 'error');
    return;
  } else contraPido.add(id);
  const el = document.querySelector(`#counter-libros .chip[data-id="${CSS.escape(id)}"]`);
  if (el) el.classList.toggle('active', contraPido.has(id));
}

export async function doCounter() {
  const r = await responder(contra, 'contrapropuesta', {
    pido: allBooks().filter((b) => contraPido.has(b.id)),
    mensaje: $('counter-mensaje')?.value || '',
  });
  if (!r.ok) { toast(r.error || 'No se pudo', 'error'); return; }
  closeSheet('counter-overlay');
  [enviadas, recibidas] = await Promise.all([misEnviadas(), misRecibidas()]);
  pintarSwaps();
  toast('Contrapropuesta mandada');
}
