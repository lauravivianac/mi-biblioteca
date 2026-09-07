/* ─────────────────────────────────────────────────────────────
   CONVERSAR Y MODERAR · las pantallas  ·  #50 y #51

   Están en el mismo fichero a propósito. La historia #51 dice que la
   moderación hay que construirla JUNTO con los comentarios y no
   después, y separarlas en dos pantallas distintas es la primera forma
   de que se separen de verdad: se acaba con un sitio donde se escribe
   y ningún botón para reportar lo que se escribió ahí.

   Aquí no hay una sola caja de comentarios sin su «reportar» al lado.
   ───────────────────────────────────────────────────────────── */

import {
  loadComments, addComment, dropComment, loadReactions, react,
  report, block, unblock, mute, unmute, loadMyBlocks, misBloqueos, meBloqueo,
} from './moderation.js';
import { profilesOf } from './social.js';
import { uid as myUid } from './store.js';
import {
  REACCIONES, ordenar, puedeBorrar, contarReacciones, miReaccion,
  comentariosCerrados, MENSAJE_CERRADO, AVISO_SPOILER, MAX,
} from './comments-core.js';
import { MOTIVOS, EXPLICACION, mailtoSoporte, SOPORTE } from './moderation-core.js';
import { inicial } from './profile-core.js';
import { cuandoTexto } from './feed-core.js';
import { $, esc, toast, closeSheet, openSheet } from './ui.js';
import { ico } from './icons.js';

let hilo = { target: null, owner: null, comentarios: [], reacciones: {}, cerrado: false };
let abiertos = new Set();      // los spoilers que ya se destaparon

/* ── LA CONVERSACIÓN  ·  #50 ─────────────────────────────────── */

export async function openComments(target, owner = '', cerrado = false) {
  hilo = { target, owner, comentarios: [], reacciones: {}, cerrado };
  abiertos = new Set();
  openSheet('comments-overlay');
  $('comments-body').innerHTML = '<p class="planner-hint">Cargando…</p>';

  const [cs, rs] = await Promise.all([loadComments(target), loadReactions(target)]);
  if (hilo.target !== target) return;
  hilo.comentarios = cs;
  hilo.reacciones = rs;
  pintarHilo();
}

export const closeComments = (e) => {
  if (e && e.target !== $('comments-overlay')) return;
  closeSheet('comments-overlay');
};

function pintarHilo() {
  const cuerpo = $('comments-body');
  if (!cuerpo) return;
  const yo = myUid();
  const lista = ordenar(hilo.comentarios);

  cuerpo.innerHTML = `
    ${filaReacciones()}

    ${lista.length ? lista.map((c) => burbuja(c, yo)).join('') : `
      <p class="set-fineprint" style="text-align:center;margin:18px 0">
        Todavía no ha escrito nadie. Puedes empezar tú.
      </p>`}

    ${hilo.cerrado ? `
      <p class="planner-hint warn" style="margin-top:14px">${esc(MENSAJE_CERRADO)}</p>`
    : `
      <div class="cmt-write">
        <textarea class="review-txt" id="cmt-text" maxlength="${MAX}"
                  placeholder="Escribe algo…" oninput="cmtCount()"></textarea>
        <div class="cmt-row">
          <label class="cmt-spoiler">
            <input type="checkbox" id="cmt-spoiler"> Es un spoiler
          </label>
          <span class="cmt-count" id="cmt-count">0/${MAX}</span>
        </div>
        <button class="btn-magic full" onclick="sendComment()">Publicar</button>
      </div>`}`;
}

export function cmtCount() {
  const t = $('cmt-text');
  const c = $('cmt-count');
  if (t && c) c.textContent = `${t.value.length}/${MAX}`;
}

const filaReacciones = () => {
  const yo = myUid();
  const mia = miReaccion(hilo.reacciones, yo);
  const cuentas = contarReacciones(hilo.reacciones);
  return `
    <div class="react-row">
      ${REACCIONES.map((e) => {
        const n = cuentas.find((c) => c.emoji === e)?.n || 0;
        return `<button class="react ${mia === e ? 'mia' : ''}" onclick="tapReact('${e}')">
          ${e}${n ? `<span>${n}</span>` : ''}
        </button>`;
      }).join('')}
    </div>
    <p class="set-fineprint" style="margin:-4px 0 14px">
      Puedes reaccionar sin escribir nada.
    </p>`;
};

function burbuja(c, yo) {
  const tapado = c.spoiler && !abiertos.has(c.id);
  return `
    <div class="cmt ${c.nivel ? 'respuesta' : ''}">
      <div class="pers-avatar cmt-avatar">${esc(inicial(c.name || c.username))}</div>
      <div class="cmt-cuerpo">
        <div class="cmt-cab">
          <span class="cmt-quien" onclick="closeSheet('comments-overlay');openProfile('${esc(c.username || '')}')">
            @${esc(c.username || 'alguien')}
          </span>
          <span class="cmt-cuando">${esc(cuandoTexto(c.at))}</span>
        </div>

        ${tapado
          ? `<button class="cmt-spoiler-tapa" onclick="revealSpoiler('${esc(c.id)}')">
               ${esc(AVISO_SPOILER)}
             </button>`
          : `<p class="cmt-texto">${esc(c.texto)}</p>`}

        <div class="cmt-acciones">
          ${!c.nivel && !hilo.cerrado ? `<button class="btn-mini" onclick="replyTo('${esc(c.id)}','@${esc(c.username || '')}')">Responder</button>` : ''}
          ${puedeBorrar(c, yo) ? `<button class="btn-mini" onclick="removeComment('${esc(c.id)}')">Borrar</button>` : ''}
          ${c.uid !== yo ? `<button class="btn-mini" onclick="openReport('comentario','${esc(c.id)}','${esc(c.uid)}')">Reportar</button>` : ''}
        </div>
      </div>
    </div>`;
}

export function revealSpoiler(id) {
  abiertos.add(id);
  pintarHilo();
}

/** Responder: se prepara la caja en vez de abrir otra pantalla. */
let respondiendoA = null;
export function replyTo(id, quien) {
  respondiendoA = id;
  const t = $('cmt-text');
  if (!t) return;
  t.value = `${quien} `;
  t.focus();
  cmtCount();
  toast('Respondiendo. Borra el @ para comentar suelto.');
}

export async function sendComment() {
  const t = $('cmt-text');
  if (!t) return;
  const spoiler = $('cmt-spoiler')?.checked === true;
  const r = await addComment(hilo.target, hilo.owner, t.value, { spoiler, replyTo: respondiendoA });
  if (!r.ok) { toast(r.error, 'error'); return; }
  hilo.comentarios = [...hilo.comentarios, r.comentario];
  respondiendoA = null;
  pintarHilo();
  toast('Publicado');
}

export async function removeComment(id) {
  const r = await dropComment(hilo.target, id);
  if (!r.ok) { toast(r.error, 'error'); return; }
  hilo.comentarios = hilo.comentarios.filter((c) => c.id !== id);
  pintarHilo();
  toast('Comentario borrado');
}

export async function tapReact(emoji) {
  const antes = hilo.reacciones;
  hilo.reacciones = await react(hilo.target, emoji);
  if (hilo.reacciones === antes) toast('No se pudo reaccionar', 'error');
  pintarHilo();
}

/* ── REPORTAR  ·  #51 ────────────────────────────────────────── */

let reporte = { tipo: null, sobre: null, deQuien: null, copia: '' };

export function openReport(tipo, sobre, deQuien, copia = '') {
  reporte = { tipo, sobre, deQuien, copia };
  openSheet('report-overlay');
  $('report-body').innerHTML = `
    <p class="planner-hint">
      Lo mira una persona. Cuéntanos qué pasa y no le decimos a nadie que fuiste tú.
    </p>

    <label class="flabel">¿Qué pasa?</label>
    <select class="fselect" id="rep-motivo">
      ${MOTIVOS.map((m) => `<option value="${m.id}">${esc(m.label)}</option>`).join('')}
    </select>

    <label class="flabel" style="margin-top:12px">¿Quieres contar algo más? (opcional)</label>
    <textarea class="review-txt" id="rep-detalle" maxlength="500"
              placeholder="Lo que creas que ayuda a entenderlo."></textarea>

    <button class="btn-magic full" style="margin-top:12px" onclick="sendReport()">
      Enviar el reporte
    </button>

    ${deQuien && deQuien !== myUid() ? `
      <p class="set-fineprint" style="margin-top:16px">
        Si además no quieres volver a saber de esa persona:
      </p>
      <button class="btn-ghost full" onclick="closeSheet('report-overlay');openBlock('${esc(deQuien)}')">
        Bloquear o silenciar
      </button>` : ''}`;
}

export const closeReport = (e) => {
  if (e && e.target !== $('report-overlay')) return;
  closeSheet('report-overlay');
};

export async function sendReport() {
  const r = await report({
    sobre: reporte.sobre,
    tipo: reporte.tipo,
    motivo: $('rep-motivo')?.value,
    detalle: $('rep-detalle')?.value || '',
    copia: reporte.copia,
  });
  if (!r.ok) { toast(r.error, 'error'); return; }
  closeSheet('report-overlay');
  toast('Gracias. Lo vamos a mirar.');
}

/* ── BLOQUEAR Y SILENCIAR  ·  #51 ────────────────────────────── */

let aQuien = null;

export function openBlock(otherUid, nombre = '') {
  aQuien = otherUid;
  openSheet('block-overlay');
  const bloqueada = misBloqueos().bloqueados.includes(otherUid);
  const silenciada = misBloqueos().silenciados.includes(otherUid);

  $('block-body').innerHTML = `
    ${nombre ? `<p class="planner-hint">Sobre ${esc(nombre)}:</p>` : ''}

    <div class="set-row" onclick="${bloqueada ? `doUnblock('${esc(otherUid)}')` : `doBlock('${esc(otherUid)}')`}">
      <div>
        <div class="set-row-title">${bloqueada ? 'Desbloquear' : 'Bloquear'}</div>
        <div class="set-row-sub">${esc(EXPLICACION.bloquear)}</div>
      </div>
${bloqueada ? '<span class="prof-flag on">Bloqueada</span>' : '<span class="set-chev">›</span>'}
    </div>

    <div class="set-row" onclick="${silenciada ? `doUnmute('${esc(otherUid)}')` : `doMute('${esc(otherUid)}')`}">
      <div>
        <div class="set-row-title">${silenciada ? 'Dejar de silenciar' : 'Silenciar'}</div>
        <div class="set-row-sub">${esc(EXPLICACION.silenciar)}</div>
      </div>
${silenciada ? '<span class="prof-flag on">Silenciada</span>' : '<span class="set-chev">›</span>'}
    </div>

    <p class="set-fineprint" style="margin-top:14px">
      Bloquear no le avisa. Simplemente dejará de encontrarte.
    </p>`;
}

export const closeBlock = (e) => {
  if (e && e.target !== $('block-overlay')) return;
  closeSheet('block-overlay');
};

export async function doBlock(u) {
  const r = await block(u);
  if (!r.ok) { toast(r.error || 'No se pudo bloquear', 'error'); return; }
  await loadMyBlocks();
  closeSheet('block-overlay');
  closeSheet('profile-overlay');
  toast('Bloqueada. No volveréis a veros.');
}

export async function doUnblock(u) {
  await unblock(u);
  await loadMyBlocks();
  openBlock(u);
  toast('Desbloqueada');
}

export async function doMute(u) {
  await mute(u);
  await loadMyBlocks();
  openBlock(u);
  toast('Silenciada. No se entera de nada.');
}

export async function doUnmute(u) {
  await unmute(u);
  await loadMyBlocks();
  openBlock(u);
  toast('Ya vuelves a ver lo suyo');
}

/** ¿Me tiene bloqueada? Lo usa el perfil para no enseñar nada. */
export { meBloqueo };

/* ── LA LISTA DE BLOQUEADAS, EN AJUSTES  ·  #51 ──────────────── */

export async function openBlocked() {
  openSheet('blocked-overlay');
  $('blocked-body').innerHTML = '<p class="planner-hint">Cargando…</p>';
  const { bloqueados, silenciados } = await loadMyBlocks();

  if (!bloqueados.length && !silenciados.length) {
    $('blocked-body').innerHTML = `
      <div class="empty">
        <div class="empty-rune">${ico('comillas', 'ico-lg')}</div>
        <div class="empty-text">No has bloqueado ni silenciado a nadie</div>
      </div>`;
    return;
  }

  const perfiles = await profilesOf([...bloqueados, ...silenciados]);
  const nombre = (u) => perfiles.find((p) => p.uid === u);
  const fila = (u, que) => {
    const p = nombre(u);
    return `
      <div class="pers-row">
        <div class="pers-avatar">${esc(inicial(p?.name || p?.username || '?'))}</div>
        <div class="pers-txt">
          <div class="pers-name">${esc(p?.name || p?.username || 'Alguien')}</div>
          <div class="pers-handle">${que}</div>
        </div>
        <button class="btn-mini" onclick="${que === 'Bloqueada' ? `doUnblock('${esc(u)}')` : `doUnmute('${esc(u)}')`};openBlocked()">
          Deshacer
        </button>
      </div>`;
  };

  $('blocked-body').innerHTML = `
    ${bloqueados.length ? `<h4 class="prof-sec-title">Bloqueadas</h4>${bloqueados.map((u) => fila(u, 'Bloqueada')).join('')}` : ''}
    ${silenciados.length ? `<h4 class="prof-sec-title" style="margin-top:18px">Silenciadas</h4>${silenciados.map((u) => fila(u, 'Silenciada')).join('')}` : ''}`;
}

export const closeBlocked = (e) => {
  if (e && e.target !== $('blocked-overlay')) return;
  closeSheet('blocked-overlay');
};

/* ── SOPORTE  ·  requisito de la guía 1.2 ────────────────────── */

export const soporteHref = () => mailtoSoporte();
export const soporteCorreo = () => SOPORTE.correo;
