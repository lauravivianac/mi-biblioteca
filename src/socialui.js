/* ─────────────────────────────────────────────────────────────
   ENCONTRAR Y SEGUIR · las pantallas  ·  historias #46 y #47

   Tres cosas: buscar personas, el botón de seguir dentro de un perfil,
   y la bandeja de avisos.

   EL BOTÓN DE SEGUIR SE PINTA ANTES DE QUE EL SERVIDOR CONTESTE. Es
   deliberado: tocar «Seguir» y que no pase nada durante un segundo se
   siente roto, y la gente lo toca otra vez. Si el servidor dice que no,
   el botón vuelve atrás y se dice por qué — que es lo que hace honesto
   al truco.
   ───────────────────────────────────────────────────────────── */

import {
  follow, unfollow, isFollowing, isFollowedBy, followCounts,
  followersOf, followingOf, profilesOf, searchPeople, suggestedPeople,
  myNotices, markNoticesRead,
} from './social.js';
import { uid as myUid, allBooks, statusOf, settings } from './store.js';
import { followButton, followBadge, seguidorasTexto, unread, noticeText } from './follows-core.js';
import { buscable, porQue } from './search-core.js';
import { inicial } from './profile-core.js';
/* openProfile se llama desde los onclick del marcado, o sea por window,
   así que no se importa: profileui ya importa de aquí y hacerlo en los
   dos sentidos es un círculo que no hace falta. */
import { $, esc, toast, closeSheet } from './ui.js';

let turnoBusqueda = 0;
let debounce = null;
let relacion = { uid: null, sigo: false, meSigue: false, cuentas: null };

/* ── EL BOTÓN DENTRO DE UN PERFIL  ·  #46 ────────────────────── */

/**
 * Cargar la relación con alguien y pintarla en el hueco del perfil.
 *
 * Se llama desde profileui cuando ya hay perfil en pantalla, así que
 * el perfil nunca espera a esto: si tarda, el hueco se queda vacío un
 * momento en vez de retrasar todo lo demás.
 */
export async function loadRelation(otherUid) {
  relacion = { uid: otherUid, sigo: false, meSigue: false, cuentas: null };
  if (!otherUid) return;
  const [sigo, meSigue, cuentas] = await Promise.all([
    isFollowing(otherUid), isFollowedBy(otherUid), followCounts(otherUid),
  ]);
  if (relacion.uid !== otherUid) return;      // se cambió de perfil mientras tanto
  relacion = { uid: otherUid, sigo, meSigue, cuentas };
  pintarRelacion();
}

export function relationSlot() {
  return '<div id="rel-slot"></div>';
}

function pintarRelacion() {
  const slot = $('rel-slot');
  if (!slot) return;
  const { uid, sigo, meSigue, cuentas } = relacion;
  const esMio = uid === myUid();
  const b = followButton({ sigo });
  const insignia = followBadge({ sigo, meSigue });

  slot.innerHTML = `
    ${cuentas ? `
      <div class="rel-counts">
        <button class="rel-count" onclick="openFollowList('seguidoras','${esc(uid)}')">
          <b>${cuentas.seguidoras}</b><span>${cuentas.seguidoras === 1 ? 'seguidora' : 'seguidoras'}</span>
        </button>
        <button class="rel-count" onclick="openFollowList('siguiendo','${esc(uid)}')">
          <b>${cuentas.siguiendo}</b><span>siguiendo</span>
        </button>
      </div>` : ''}
    ${esMio ? '' : `
      <div class="rel-actions">
        <button class="btn-magic full ${b.activo ? 'is-following' : ''}"
                onclick="toggleFollow('${esc(uid)}')">${b.texto}</button>
        ${insignia ? `<span class="rel-badge">${insignia}</span>` : ''}
      </div>`}`;
}

/**
 * Seguir o dejar de seguir.
 *
 * Se pinta primero y se guarda después; si falla, se deshace y se dice.
 * Un botón que miente no es mejor que un botón lento.
 */
export async function toggleFollow(otherUid) {
  const antes = relacion.sigo;
  relacion.sigo = !antes;
  if (relacion.cuentas) relacion.cuentas.seguidoras += antes ? -1 : 1;
  pintarRelacion();

  const r = antes ? await unfollow(otherUid) : await follow(otherUid);
  if (!r.ok) {
    relacion.sigo = antes;
    if (relacion.cuentas) relacion.cuentas.seguidoras += antes ? 1 : -1;
    pintarRelacion();
    toast(r.error || 'No se pudo. Inténtalo otra vez.', 'error');
    return;
  }
  /* Dejar de seguir es silencioso también aquí: sin aviso, sin
     celebración. Solo se dice cuando empiezas a seguir. */
  if (!antes) toast('Ahora la sigues');
}

/* ── LAS LISTAS DE SEGUIDORAS  ·  #46 ────────────────────────── */

export async function openFollowList(cual, userUid) {
  $('follows-overlay').classList.add('open');
  $('follows-title').textContent = cual === 'seguidoras' ? 'Seguidoras' : 'Siguiendo a';
  $('follows-body').innerHTML = '<p class="planner-hint">Cargando…</p>';

  const uids = cual === 'seguidoras' ? await followersOf(userUid) : await followingOf(userUid);
  const perfiles = await profilesOf(uids);

  $('follows-body').innerHTML = perfiles.length
    ? perfiles.map(fila).join('')
    : `<div class="empty">
         <div class="empty-rune">✦</div>
         <div class="empty-text">${cual === 'seguidoras'
           ? 'Todavía no la sigue nadie'
           : 'Todavía no sigue a nadie'}</div>
       </div>`;
}

export const closeFollows = (e) => {
  if (e && e.target !== $('follows-overlay')) return;
  closeSheet('follows-overlay');
};

/** Una persona en una lista. Se toca y se abre su perfil. */
function fila(p, motivo = '') {
  return `
    <div class="pers-row" onclick="closeSheet('follows-overlay');closeSheet('people-overlay');openProfile('${esc(p.username)}')">
      <div class="pers-avatar">${esc(inicial(p.name || p.username))}</div>
      <div class="pers-txt">
        <div class="pers-name">${esc(p.name || p.username)}</div>
        <div class="pers-handle">@${esc(p.username)}${p.city ? ` · ${esc(p.city)}` : ''}</div>
        ${motivo ? `<div class="pers-why">${esc(motivo)}</div>` : ''}
      </div>
    </div>`;
}

/* ── BUSCAR PERSONAS  ·  #47 ─────────────────────────────────── */

export function openPeople() {
  $('people-overlay').classList.add('open');
  $('people-body').innerHTML = `
    <div class="fg">
      <div class="uname-field">
        <span class="uname-at">@</span>
        <input class="finput uname-input" id="pe-q" autocapitalize="none" autocomplete="off"
               spellcheck="false" placeholder="su nombre o su @usuario"
               oninput="probePeople(this.value)">
      </div>
    </div>
    <div id="pe-results"></div>`;
  $('pe-q')?.focus();
  sugerencias();
}

export const closePeople = (e) => {
  if (e && e.target !== $('people-overlay')) return;
  closeSheet('people-overlay');
};

/**
 * Buscar mientras se escribe, pero no en cada tecla.
 *
 * 350 ms y mínimo dos letras: cada búsqueda son dos consultas, y
 * lanzarlas por cada letra de «laura» son diez consultas para una sola
 * pregunta.
 */
export function probePeople(texto) {
  clearTimeout(debounce);
  if (!buscable(texto)) { sugerencias(); return; }
  const slot = $('pe-results');
  if (slot) slot.innerHTML = '<p class="planner-hint">Buscando…</p>';
  debounce = setTimeout(async () => {
    const mio = ++turnoBusqueda;
    const gente = await searchPeople(texto);
    if (mio !== turnoBusqueda) return;         // llegó tarde: hay otra búsqueda
    const slot2 = $('pe-results');
    if (!slot2) return;
    slot2.innerHTML = gente.length
      ? gente.map((p) => fila(p)).join('')
      : `<div class="empty">
           <div class="empty-rune">🔍</div>
           <div class="empty-text">No hay nadie con ese nombre</div>
         </div>
         <p class="set-fineprint">
           Quizá todavía no ha elegido su @usuario: sin él no aparece en la búsqueda.
         </p>`;
  }, 350);
}

/**
 * Quizá conozcas.
 *
 * Se enseña con la caja vacía, que es cuando alguien no sabe a quién
 * buscar — que es casi siempre al principio.
 */
async function sugerencias() {
  const slot = $('pe-results');
  if (!slot) return;
  const mios = allBooks().filter((b) => statusOf(b.id) === 'read').map((b) => b.id);
  if (!mios.length) {
    slot.innerHTML = `<p class="set-fineprint">
      Busca a alguien por su @usuario. Cuando termines algún libro, aquí
      aparecerá gente que haya leído lo mismo que tú.</p>`;
    return;
  }
  slot.innerHTML = '<p class="planner-hint">Buscando gente que lea lo que tú…</p>';
  const mio = ++turnoBusqueda;
  const gente = await suggestedPeople(mios);
  if (mio !== turnoBusqueda) return;
  const slot2 = $('pe-results');
  if (!slot2) return;

  const miCiudad = settings().city || null;
  slot2.innerHTML = gente.length
    ? `<h4 class="prof-sec-title">Quizá conozcas</h4>
       ${gente.map((p) => fila(p, porQue({
         comunes: p.comunes, ciudad: p.city, miCiudad,
       }))).join('')}`
    : `<p class="set-fineprint">
         Busca a alguien por su @usuario o por su nombre. Para aparecer en
         las sugerencias de otras, enciende «que me encuentren por mis
         libros» en tu perfil.</p>`;
}

/* ── LA BANDEJA DE AVISOS  ·  #46 ────────────────────────────── */

let avisos = [];

export async function openNotices() {
  $('notices-overlay').classList.add('open');
  $('notices-body').innerHTML = '<p class="planner-hint">Cargando…</p>';
  avisos = await myNotices();

  $('notices-body').innerHTML = avisos.length
    ? avisos.map((a) => `
        <div class="pers-row ${a.leido ? '' : 'nuevo'}"
             onclick="closeSheet('notices-overlay');openProfile('${esc(a.fromUsername || '')}')">
          <div class="pers-avatar">${esc(inicial(a.fromName || a.fromUsername))}</div>
          <div class="pers-txt">
            <div class="pers-name">${esc(noticeText(a))}</div>
            <div class="pers-handle">${new Date(a.at || 0).toLocaleDateString('es')}</div>
          </div>
        </div>`).join('')
    : `<div class="empty">
         <div class="empty-rune">✦</div>
         <div class="empty-text">Aquí aparecerá quien te siga</div>
       </div>`;

  /* Se marcan al abrir, no al tocarlas: abrir la bandeja ES leerlas. */
  await markNoticesRead(avisos);
  avisos = avisos.map((a) => ({ ...a, leido: true }));
  pintarPunto();
}

export const closeNotices = (e) => {
  if (e && e.target !== $('notices-overlay')) return;
  closeSheet('notices-overlay');
};

/** El punto rojo. Se mira al entrar y al cerrar la bandeja. */
export async function refreshNotices() {
  if (!myUid()) return;
  avisos = await myNotices();
  pintarPunto();
}

function pintarPunto() {
  const n = unread(avisos);
  const el = $('notice-dot');
  if (!el) return;
  el.textContent = n > 9 ? '9+' : String(n);
  el.hidden = n === 0;
}

export { seguidorasTexto };
