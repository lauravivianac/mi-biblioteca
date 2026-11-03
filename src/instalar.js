/* ─────────────────────────────────────────────────────────────
   EL CARTEL DE INSTALAR

   La parte que toca el navegador. Quién decide y qué se dice está en
   instalar-core.js, que no toca nada y se puede probar; aquí solo se
   escucha el evento, se pinta y se recuerda el «ahora no».

   ── POR QUÉ NO SALE EN EL PRIMER PÍXEL ──────────────────────

   Un cartel que aparece encima de una pantalla que todavía se está
   dibujando se cierra sin leerlo: es lo mismo que hace el banner de
   cookies, y la mano ya aprendió a descartarlo antes de mirar. Con
   un respiro, la pantalla ya está puesta y el cartel llega a algo que
   se entiende.

   Es un número y está arriba del todo a propósito: si se quiere más
   tarde —a la tercera visita, o después de añadir el primer libro—
   se cambia aquí y nada más.
   ───────────────────────────────────────────────────────────── */

import { $, esc } from './ui.js';
import { comoInstalar, QUE_HACER } from './instalar-core.js';

/** Cuánto se espera desde que abre hasta enseñar el cartel. */
const RESPIRO = 2500;

/** Dónde se apunta el «ahora no». */
const CLAVE = 'bib:instalar-descartada';

/* EL EVENTO LLEGA CUANDO QUIERE, Y UNA SOLA VEZ.
   Chrome lo dispara cuando le da la gana —a veces antes de que este
   módulo arranque— y no lo repite. Si no se guarda, el botón de
   instalar no funciona y no hay forma de saber por qué: hay que
   quedárselo en cuanto llega y usarlo después. */
let invitacion = null;

function descartadaEl() {
  try { return Number(localStorage.getItem(CLAVE)) || 0; } catch { return 0; }
}

function apuntarDescarte() {
  try { localStorage.setItem(CLAVE, String(Date.now())); } catch { /* modo privado */ }
}

function queTocaAhora() {
  return comoInstalar({
    userAgent: navigator.userAgent || '',
    platform: navigator.platform || '',
    maxTouchPoints: navigator.maxTouchPoints || 0,
    standalone: window.navigator?.standalone === true,
    displayStandalone: window.matchMedia?.('(display-mode: standalone)')?.matches === true,
    hayPrompt: Boolean(invitacion),
    descartadaEl: descartadaEl(),
  });
}

/* ── PINTAR ──────────────────────────────────────────────────── */

function pintar(modo) {
  const caja = $('instalar-cartel');
  if (!caja) return;
  const dice = QUE_HACER[modo];
  if (!dice) return;

  caja.innerHTML = `
    <div class="instalar-texto">
      <div class="instalar-titulo">${esc(dice.titulo)}</div>
      <p class="instalar-que">${esc(dice.texto)}</p>
    </div>
    <div class="instalar-botones">
      ${dice.accion ? `
        <button class="btn-magic" onclick="instalarAhora()">${esc(dice.accion)}</button>` : ''}
      <button class="btn-ghost" onclick="ahoraNoInstalar()">
        ${dice.accion ? 'Ahora no' : 'Entendido'}
      </button>
    </div>`;
  caja.classList.add('visible');
}

export function ocultarCartel() {
  $('instalar-cartel')?.classList.remove('visible');
}

/** «Ahora no» / «Entendido»: lo mismo, y los dos se respetan. */
export function ahoraNoInstalar() {
  apuntarDescarte();
  ocultarCartel();
}

/**
 * El diálogo de verdad. Solo existe donde el navegador lo dio.
 *
 * `prompt()` tiene que salir de un gesto de la persona, y por eso
 * esto cuelga de un onclick y no de un temporizador: llamado solo, el
 * navegador lo ignora sin decir nada.
 */
export async function instalarAhora() {
  if (!invitacion) return ocultarCartel();
  ocultarCartel();
  invitacion.prompt();
  try { await invitacion.userChoice; } catch { /* da igual qué eligió */ }
  /* La invitación se gasta al usarla: el navegador no la vuelve a dar
     para esta carga, así que guardarla sería guardar algo muerto. */
  invitacion = null;
}

/* Lo mismo que `queTocaAhora`, pero sin contar el «ahora no»: cuando
   lo pide ella desde Ajustes, un descarte de la semana pasada no
   puede ser el motivo de no enseñárselo. */
const siLoPide = () => comoInstalar({
  userAgent: navigator.userAgent || '',
  platform: navigator.platform || '',
  maxTouchPoints: navigator.maxTouchPoints || 0,
  standalone: window.navigator?.standalone === true,
  displayStandalone: window.matchMedia?.('(display-mode: standalone)')?.matches === true,
  hayPrompt: Boolean(invitacion),
  descartadaEl: 0,
});

/** ¿Pinta la fila de Ajustes? No, si ya está instalada o no hay forma. */
export const sePuedeOfrecerInstalar = () => siLoPide().ofrecer;

/** Enseñarlo a petición, desde Ajustes, sin que importe el «ahora no». */
export function ofrecerInstalar() {
  const { modo } = siLoPide();
  if (modo) pintar(modo);
}

/* ── ARRANQUE ────────────────────────────────────────────────── */

export function vigilarInstalacion() {
  window.addEventListener('beforeinstallprompt', (e) => {
    /* Sin esto, Chrome enseña SU propio aviso además del nuestro, y
       salen dos carteles diciendo lo mismo. */
    e.preventDefault();
    invitacion = e;
  });

  /* Si se instala —por nuestro botón o por el menú del navegador— el
     cartel sobra desde ese mismo segundo. */
  window.addEventListener('appinstalled', () => {
    invitacion = null;
    apuntarDescarte();
    ocultarCartel();
  });

  setTimeout(() => {
    const { ofrecer, modo } = queTocaAhora();
    if (ofrecer) pintar(modo);
  }, RESPIRO);
}
