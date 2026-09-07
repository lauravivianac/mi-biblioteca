/* ─────────────────────────────────────────────────────────────
   INVITAR · link y código QR  ·  historia #48

   La nota de la historia dice que este es el camino de crecimiento
   natural de la app: se comparte una tarjeta en Stories (#91), la
   tarjeta lleva el @usuario, y de ahí sale el link. Esta pantalla es
   el final de ese camino.

   EL QR ES PARA ESTAR DELANTE DE ALGUIEN. Por eso se pinta grande, en
   blanco y negro y no con los colores del tema: un QR bonito que no se
   lee no sirve de nada, y el contraste es lo único que importa.
   Tampoco se pide red para dibujarlo, porque el momento de enseñar un
   QR —una cafetería, un club de lectura— es justo donde peor va.
   ───────────────────────────────────────────────────────────── */

import { qrSvg } from './qr-core.js';
import { myUsername, uid as myUid } from './store.js';
import { usernameFromHash } from './profile-core.js';
import { openCamera, closeCamera, scanQr, puedeLeerQr } from './scan.js';
import { $, esc, toast, closeSheet, openSheet } from './ui.js';
import { ico } from './icons.js';

/** La dirección del perfil de quien sea, en ESTA instalación. */
export const linkDe = (handle) =>
  `${location.origin}${location.pathname}#/u/${String(handle || '').toLowerCase()}`;

export const miLink = () => (myUsername() ? linkDe(myUsername()) : '');

export function openInvite() {
  openSheet('invite-overlay');
  pintar();
}

export const closeInvite = (e) => {
  if (e && e.target !== $('invite-overlay')) return;
  cerrarCamara();
  closeSheet('invite-overlay');
};

function pintar() {
  const cuerpo = $('invite-body');
  if (!cuerpo) return;
  const nombre = myUsername();

  if (!nombre) {
    cuerpo.innerHTML = `
      <div class="empty">
        <div class="empty-rune">${ico('sobre', 'ico-lg')}</div>
        <div class="empty-text">Primero elige tu @usuario</div>
      </div>
      <p class="set-fineprint">Es lo que hace que tengas un link y un código que enseñar.</p>
      <button class="btn-magic full" style="margin-top:14px"
              onclick="closeSheet('invite-overlay');openSettings()">Elegirlo ahora</button>`;
    return;
  }

  const link = miLink();
  cuerpo.innerHTML = `
    <p class="planner-hint">Enséñale esto a quien tengas delante, o pásale el link.</p>

    <div class="qr-card">
      ${qrSvg(link, { tam: 232 }) || '<p class="planner-hint warn">El link es demasiado largo para un código.</p>'}
      <div class="qr-handle">@${esc(nombre)}</div>
    </div>

    <div class="qr-link">${esc(link)}</div>

    <button class="btn-magic full" onclick="copyInvite()">Copiar el link</button>
    ${navigator.share ? `
      <button class="btn-ghost full" style="margin-top:8px" onclick="shareInvite()">
        Compartir
      </button>` : ''}

    <h4 class="prof-sec-title" style="margin-top:22px">Escanear el de otra persona</h4>
    ${puedeLeerQr() ? `
      <button class="btn-ghost full" onclick="startScanInvite()">${ico('camara')} Abrir la cámara</button>
      <div id="qr-scan"></div>`
    : `<p class="set-fineprint">
         Este navegador no sabe leer códigos QR —en el iPhone no se puede todavía—.
         Pídele el link y pégalo en la barra de direcciones, o búscala por su @usuario.
       </p>
       <button class="btn-ghost full" style="margin-top:8px"
               onclick="closeSheet('invite-overlay');openPeople()">Buscarla por su nombre</button>`}`;
}

export async function copyInvite() {
  const link = miLink();
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    toast('Link copiado');
  } catch {
    toast(`Copia el link: ${link}`);
  }
}

export async function shareInvite() {
  const link = miLink();
  if (!link || !navigator.share) return;
  try {
    await navigator.share({
      title: 'Library',
      text: `Soy @${myUsername()} en Library. Mira lo que leo:`,
      url: link,
    });
  } catch (e) {
    if (e?.name === 'AbortError') return;      // se arrepintió, y ya está
    toast('No se pudo compartir. Copia el link.', 'error');
  }
}

/* ── ESCANEAR ────────────────────────────────────────────────── */

let video = null;

function cerrarCamara() {
  closeCamera();
  video = null;
  const hueco = $('qr-scan');
  if (hueco) hueco.innerHTML = '';
}

export async function startScanInvite() {
  const hueco = $('qr-scan');
  if (!hueco) return;
  hueco.innerHTML = `
    <div class="qr-cam">
      <video id="qr-video" playsinline muted autoplay></video>
      <div class="qr-frame"></div>
    </div>
    <p class="planner-hint" id="qr-msg">Apunta al código de la otra persona…</p>
    <button class="btn-ghost full" onclick="stopScanInvite()">Cancelar</button>`;

  try {
    const stream = await openCamera();
    video = $('qr-video');
    video.srcObject = stream;
    await video.play();
  } catch {
    hueco.innerHTML = `<p class="planner-hint warn">
      No se pudo abrir la cámara. Comprueba el permiso en los ajustes del navegador.</p>`;
    return;
  }

  const leido = await scanQr(video, {
    onProgress: (quedan) => {
      const m = $('qr-msg');
      if (m) m.textContent = `Buscando un código… ${Math.ceil(quedan)}s`;
    },
  });
  cerrarCamara();

  if (!leido) { toast('No se encontró ningún código. Inténtalo otra vez.', 'error'); return; }
  abrirDesdeCodigo(leido);
}

export function stopScanInvite() { cerrarCamara(); }

/**
 * Lo que hay dentro de un QR ajeno.
 *
 * SE COMPRUEBA QUE SEA UN PERFIL DE ESTA APP. Un QR puede llevar
 * cualquier cosa, y abrir a ciegas lo que diga un cuadrado que te ha
 * enseñado un desconocido es exactamente como funcionan las estafas
 * por QR. Si no es un `#/u/loquesea`, se dice y no se abre nada.
 */
export function abrirDesdeCodigo(texto) {
  const t = String(texto || '');
  const hash = t.includes('#') ? t.slice(t.indexOf('#')) : t;
  const nombre = usernameFromHash(hash);
  if (!nombre) {
    toast('Ese código no es de un perfil de Library.', 'error');
    return null;
  }
  closeSheet('invite-overlay');
  window.openProfile(nombre);
  return nombre;
}

/* ── QUIEN LLEGA DESDE UNA INVITACIÓN  ·  #48 ────────────────── */

const RECUERDO = 'bib:invitada-por';

/** Apuntar de quién es el perfil por el que entró, para ofrecer seguirla luego. */
export function rememberInviter(handle) {
  try { localStorage.setItem(RECUERDO, String(handle || '')); } catch {}
}

export function takeInviter() {
  try {
    const v = localStorage.getItem(RECUERDO);
    localStorage.removeItem(RECUERDO);
    return v || null;
  } catch { return null; }
}

/**
 * Tras crear la cuenta desde una invitación, ofrecer seguir a quien
 * invitó — que es la mitad de la historia y la que se suele olvidar.
 *
 * No se sigue sola: se ofrece. Entrar en una app y descubrir que ya
 * sigues a alguien sin haberlo dicho es de las cosas que hacen
 * desconfiar de una app nueva.
 */
export async function maybeOfferInviter() {
  const handle = takeInviter();
  if (!handle || !myUid() || handle === myUsername()) return;
  openSheet('invite-overlay');
  $('invite-body').innerHTML = `
    <div class="empty">
      <div class="empty-rune">${ico('sobre', 'ico-lg')}</div>
      <div class="empty-text">Llegaste por @${esc(handle)}</div>
    </div>
    <p class="set-fineprint">¿Quieres seguirla para ver lo que lee?</p>
    <button class="btn-magic full" style="margin-top:14px"
            onclick="closeSheet('invite-overlay');openProfile('${esc(handle)}')">
      Ver su perfil
    </button>
    <button class="btn-ghost full" style="margin-top:8px"
            onclick="closeSheet('invite-overlay')">Ahora no</button>`;
}
