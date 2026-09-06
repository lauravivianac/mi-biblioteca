/* ─────────────────────────────────────────────────────────────
   EL CHAT · las pantallas  ·  #85, #86, #87 y #88

   Tres cosas en una hoja: la conversación, los avisos de seguridad que
   no se van del todo, y el cierre del intercambio.

   LOS AVISOS SE ENCOGEN, NO SE QUITAN (#88). La primera vez ocupan la
   pantalla entera y hay que pasarlos; después se quedan en una línea
   fija en la cabecera. Un aviso que se puede cerrar para siempre es un
   aviso que nadie lee la segunda vez, que es justo cuando ya te has
   confiado.
   ───────────────────────────────────────────────────────────── */

import {
  abrirChat, misChats, escucharMensajes, mandar, marcarAvisosVistos,
  confirmarIntercambio, valorar, miValoracionDe, valoracionesDe,
} from './chat.js';
import {
  AVISO_CABECERA, RECOMENDACIONES, PUNTOS_SUGERIDOS, primeraVez,
  avisoAntesDeMandar, puedeEscribir, mensajesOrdenados, VACIO_CHAT, MAX_MENSAJE,
} from './chat-core.js';
import {
  EJES, confirmar as calcularConfirmacion, heConfirmado, estadoConfirmacion,
  puedeValorar, reputacion, porEje, insignia, MIN_PARA_PROMEDIO,
} from './trust-core.js';
import { misBloqueos, meBloqueo } from './moderation.js';
import { uid as myUid } from './store.js';
import { $, esc, toast, openSheet, closeSheet } from './ui.js';

let chatActual = null;
let mensajes = [];
let dejarDeEscuchar = null;
let bloqueada = false;
let valoracionMia = null;

/* ── ABRIR ───────────────────────────────────────────────────── */

export async function openChat(solicitud) {
  const r = await abrirChat(solicitud);
  if (!r.ok) { toast(r.error, 'error'); return; }

  chatActual = r.chat;
  mensajes = [];
  valoracionMia = await miValoracionDe(chatActual);
  bloqueada = await meBloqueo((chatActual.partes || []).find((p) => p !== myUid()));

  openSheet('chat-overlay');

  /* La primera vez, las recomendaciones enteras y a pantalla completa.
     Después, la línea de la cabecera. */
  if (primeraVez(chatActual, myUid())) {
    pintarSeguridadPrimeraVez();
    return;
  }
  pintarChat();
  engancharEscucha();
}

export function closeChat(e) {
  if (e && e.target !== $('chat-overlay')) return;
  soltarEscucha();
  closeSheet('chat-overlay');
}

function engancharEscucha() {
  soltarEscucha();
  dejarDeEscuchar = escucharMensajes(chatActual.id, (lista) => {
    if (lista === null) { toast('Se cortó la conexión del chat', 'error'); return; }
    mensajes = mensajesOrdenados(lista);
    pintarMensajes();
  });
}

function soltarEscucha() {
  if (typeof dejarDeEscuchar === 'function') dejarDeEscuchar();
  dejarDeEscuchar = null;
}

/* ── LAS RECOMENDACIONES, LA PRIMERA VEZ  ·  #88 ─────────────── */

function pintarSeguridadPrimeraVez() {
  $('chat-body').innerHTML = `
    <p class="planner-lede">Antes de quedar, cuatro cosas.</p>
    ${RECOMENDACIONES.map((r) => `
      <div class="seg-item">
        <div class="seg-titulo">${esc(r.titulo)}</div>
        <div class="seg-texto">${esc(r.texto)}</div>
      </div>`).join('')}

    <h4 class="prof-sec-title" style="margin-top:18px">Dónde quedar</h4>
    <p class="set-fineprint" style="margin-top:0">
      La app no sabe qué sitios hay en tu ciudad, así que no se los inventa.
      Estas son las clases de sitio que funcionan:
    </p>
    <div class="puntos">
      ${PUNTOS_SUGERIDOS.map((p) => `
        <div class="punto"><span>${p.icono}</span> ${esc(p.texto)}</div>`).join('')}
    </div>

    <button class="btn-magic full" style="margin-top:18px" onclick="entendidoSeguridad()">
      Entendido, abrir la conversación
    </button>
    <p class="set-fineprint" style="text-align:center">
      Esto no vuelve a salir entero, pero el aviso se queda arriba.
    </p>`;
}

export async function entendidoSeguridad() {
  await marcarAvisosVistos(chatActual);
  chatActual = { ...chatActual, vistoSeguridad: [...(chatActual.vistoSeguridad || []), myUid()] };
  pintarChat();
  engancharEscucha();
}

/** La página de seguridad, accesible siempre desde el módulo (#88). */
export function openSeguridad() {
  openSheet('seguridad-overlay');
  $('seguridad-body').innerHTML = `
    <p class="planner-lede">${esc(AVISO_CABECERA)}</p>
    ${RECOMENDACIONES.map((r) => `
      <div class="seg-item">
        <div class="seg-titulo">${esc(r.titulo)}</div>
        <div class="seg-texto">${esc(r.texto)}</div>
      </div>`).join('')}
    <h4 class="prof-sec-title" style="margin-top:18px">Dónde quedar</h4>
    <div class="puntos">
      ${PUNTOS_SUGERIDOS.map((p) => `
        <div class="punto"><span>${p.icono}</span> ${esc(p.texto)}</div>`).join('')}
    </div>`;
}

export const closeSeguridad = (e) => {
  if (!e || e.target === $('seguridad-overlay')) closeSheet('seguridad-overlay');
};

/* ── LA CONVERSACIÓN ─────────────────────────────────────────── */

function pintarChat() {
  const yo = myUid();
  const otra = (chatActual.partes || []).find((p) => p !== yo);
  const estado = estadoConfirmacion(chatActual, yo);

  $('chat-body').innerHTML = `
    <div class="chat-aviso" onclick="openSeguridad()">
      ⚠ ${esc(AVISO_CABECERA)} <span class="chat-aviso-mas">Ver más</span>
    </div>

    <div class="chat-libro">
      <b>${esc(chatActual.title)}</b>
      ${estado ? `<div class="swap-estado">${esc(estado)}</div>` : ''}
    </div>

    <div id="chat-mensajes" class="chat-mensajes"></div>

    <div id="chat-aviso-datos"></div>

    <div class="chat-escribir" id="chat-escribir">
      <textarea class="finput" id="chat-texto" rows="2" maxlength="${MAX_MENSAJE}"
        placeholder="¿Cómo quedamos?" oninput="revisarMensaje(this.value)"></textarea>
      <button class="btn-magic" onclick="enviarMensaje()">Enviar</button>
    </div>

    <div class="chat-acciones">
      ${chatActual.completado ? '' : `
        <button class="btn-mini" onclick="doConfirmar()">
          ${heConfirmado(chatActual, yo) ? 'Confirmado ✓' : 'Ya lo intercambiamos'}
        </button>`}
      ${chatActual.completado && !valoracionMia
    ? '<button class="btn-mini" onclick="openValorar()">Valorarla</button>' : ''}
      <button class="btn-mini" onclick="openBlock('${esc(otra)}')">Reportar o bloquear</button>
    </div>`;

  pintarMensajes();
  pintarSiSePuedeEscribir();
}

function pintarMensajes() {
  const caja = $('chat-mensajes');
  if (!caja) return;
  const yo = myUid();

  if (!mensajes.length) {
    caja.innerHTML = `
      <div class="empty">
        <div class="empty-rune">${VACIO_CHAT.rune}</div>
        <div class="empty-text">${esc(VACIO_CHAT.texto)}</div>
      </div>
      <p class="set-fineprint" style="text-align:center">${esc(VACIO_CHAT.detalle)}</p>`;
    return;
  }

  caja.innerHTML = mensajes.map((m) => `
    <div class="burbuja ${m.de === yo ? 'mia' : 'suya'}">
      ${esc(m.texto)}
      <span class="burbuja-hora">${hora(m.at)}</span>
    </div>`).join('');
  caja.scrollTop = caja.scrollHeight;
}

const hora = (at) => {
  try {
    return new Date(at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

function pintarSiSePuedeEscribir() {
  const caja = $('chat-escribir');
  if (!caja) return;
  const r = puedeEscribir({
    chat: chatActual,
    yo: myUid(),
    bloqueados: misBloqueos()?.bloqueados || [],
    meBloquearon: bloqueada,
  });
  if (r.puede) return;
  caja.innerHTML = `<p class="planner-hint warn">${esc(r.motivo)}</p>`;
}

/* ── AVISAR SIN IMPEDIR  ·  #85 ──────────────────────────────── */

export function revisarMensaje(texto) {
  const caja = $('chat-aviso-datos');
  if (!caja) return;
  const aviso = avisoAntesDeMandar(texto);
  caja.innerHTML = aviso
    ? `<div class="chat-cuidado">${esc(aviso.texto)}</div>`
    : '';
}

export async function enviarMensaje() {
  const campo = $('chat-texto');
  const texto = campo?.value || '';
  if (!texto.trim()) return;

  const r = await mandar(chatActual.id, texto);
  if (!r.ok) { toast(r.error || 'No se pudo mandar', 'error'); return; }
  if (campo) campo.value = '';
  revisarMensaje('');
}

/* ── CERRAR EL TRATO  ·  #86 ─────────────────────────────────── */

export async function doConfirmar() {
  const r = await confirmarIntercambio(chatActual);
  if (!r.ok) { toast(r.error, 'error'); return; }
  chatActual = r.chat;
  pintarChat();
  toast(chatActual.completado
    ? '¡Intercambio hecho! Ya podéis valoraros.'
    : 'Confirmado. Falta que confirme ella.');
}

let estrellas = { puntualidad: 0, estado: 0, trato: 0 };

export function openValorar() {
  const juicio = puedeValorar({ chat: chatActual, yo: myUid(), yaValoro: Boolean(valoracionMia) });
  if (!juicio.puede) { toast(juicio.motivo, 'error'); return; }

  estrellas = { puntualidad: 0, estado: 0, trato: 0 };
  openSheet('valorar-overlay');
  $('valorar-body').innerHTML = `
    <p class="planner-hint">
      Esto lo verá quien mire su perfil antes de quedar con ella. Sé justa.
    </p>
    ${EJES.map((eje) => `
      <div class="fg">
        <label class="flabel">${esc(eje.label)} <span class="opt">${esc(eje.hint)}</span></label>
        <div class="estrellas" id="est-${eje.id}">
          ${[1, 2, 3, 4, 5].map((n) => `
            <span class="estrella" onclick="setEstrella('${eje.id}',${n})">☆</span>`).join('')}
        </div>
      </div>`).join('')}
    <label class="flabel" style="margin-top:8px">Una nota <span class="opt">(opcional)</span></label>
    <textarea class="finput" id="valorar-comentario" rows="2" maxlength="300"
      placeholder="Puntual y muy maja. El libro estaba como decía."></textarea>
    <button class="btn-magic full" style="margin-top:12px" onclick="doValorar()">Valorar</button>
    <p class="set-fineprint">
      Una valoración no se puede cambiar ni borrar después. Por eso pesa.
    </p>`;
}

export const closeValorar = (e) => {
  if (!e || e.target === $('valorar-overlay')) closeSheet('valorar-overlay');
};

export function setEstrella(eje, n) {
  estrellas[eje] = n;
  const caja = $(`est-${eje}`);
  if (!caja) return;
  [...caja.children].forEach((el, i) => { el.textContent = i < n ? '★' : '☆'; });
}

export async function doValorar() {
  const r = await valorar(chatActual, {
    ...estrellas,
    comentario: $('valorar-comentario')?.value || '',
  });
  if (!r.ok) { toast(r.error, 'error'); return; }
  valoracionMia = r.valoracion;
  closeSheet('valorar-overlay');
  pintarChat();
  toast('Gracias. Así se construye la confianza.');
}

/* ── MIS CONVERSACIONES ──────────────────────────────────────── */

export async function openChats() {
  openSheet('chats-overlay');
  $('chats-body').innerHTML = '<p class="planner-hint">Cargando…</p>';
  const lista = await misChats();

  if (!lista.length) {
    $('chats-body').innerHTML = `
      <div class="empty">
        <div class="empty-rune">💬</div>
        <div class="empty-text">Todavía no tienes conversaciones</div>
      </div>
      <p class="set-fineprint" style="text-align:center">
        Se abren solas cuando alguien acepta un intercambio.
      </p>`;
    return;
  }

  $('chats-body').innerHTML = lista.map((c) => `
    <div class="swap-card ${c.completado ? 'cerrada' : ''}" onclick="abrirChatDeLista('${esc(c.id)}')">
      <div class="swap-title">${esc(c.title)}</div>
      <div class="swap-sub">${esc(estadoConfirmacion(c, myUid()) || 'Conversación abierta')}</div>
    </div>`).join('');
  chatsEnLista = lista;
}

let chatsEnLista = [];

export async function abrirChatDeLista(id) {
  const c = chatsEnLista.find((x) => x.id === id);
  if (!c) return;
  closeSheet('chats-overlay');
  /* Ya existe, así que se abre con lo que hay: `abrirChat` lo detecta y
     no intenta crearlo otra vez. */
  await openChat({ id: c.id, de: c.recibe, para: c.dueño, estado: 'aceptada', swapId: c.swapId, title: c.title });
}

export const closeChats = (e) => {
  if (!e || e.target === $('chats-overlay')) closeSheet('chats-overlay');
};

/* ── LA REPUTACIÓN EN EL PERFIL  ·  #86 ──────────────────────── */

/**
 * Lo que se pinta en el perfil de alguien.
 *
 * Con menos de tres intercambios NO se enseña promedio, se enseña el
 * número. Es la nota de la historia y es la parte que importa: «5
 * estrellas» con un solo intercambio no dice nada, y presentarlo como
 * si dijera algo es engañar a quien va a quedar con esa persona.
 */
export async function pintarReputacion(otroUid, hueco) {
  const caja = $(hueco);
  if (!caja || !otroUid) return;
  const valoraciones = await valoracionesDe(otroUid);
  const rep = reputacion(valoraciones);

  caja.innerHTML = `
    <div class="rep">
      <div class="rep-cifra">${esc(rep.texto)}</div>
      ${rep.detalle ? `<div class="rep-nota">${esc(rep.detalle)}</div>` : ''}
      ${rep.fiable ? `
        <div class="rep-ejes">
          ${porEje(valoraciones).map((e) => `
            <div class="rep-eje"><span>${esc(e.label)}</span><b>${e.valor} ★</b></div>`).join('')}
        </div>` : ''}
      ${rep.n && !rep.fiable ? `
        <div class="rep-nota">A partir de ${MIN_PARA_PROMEDIO} intercambios se enseña el promedio.</div>` : ''}
    </div>`;
}

export { insignia, calcularConfirmacion };
