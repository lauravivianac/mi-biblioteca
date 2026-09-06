/* ─────────────────────────────────────────────────────────────
   EL PERFIL PÚBLICO · la pantalla  ·  historia #45

   Dos cosas que hace esta pantalla y conviene no confundir:

   1. ENSEÑAR el perfil de alguien —el tuyo o el de otra persona—, tal
      y como lo ve quien abre tu link. Se pinta SIEMPRE con el documento
      público, incluso cuando es el tuyo, para que lo que ves sea
      exactamente lo que se ve desde fuera. Si el tuyo se pintara con
      los datos de casa, una sección apagada seguiría enseñándose y no
      te enterarías nunca.

   2. DECIDIR qué se enseña. Los interruptores no esconden nada en la
      pantalla: cambian lo que se publica (ver profile-core.js). Apagar
      «Mis números» borra los números del documento.

   La nota de la historia pide que se vea bien con pocos libros. Por eso
   no hay ceros grandes ni barras vacías: si no hay nada que contar, se
   dice con una frase.
   ───────────────────────────────────────────────────────────── */

import {
  myUsername, settings, updateSettings, fetchProfile, fetchPublicReviews,
  publishProfile, uid as myUid,
} from './store.js';
import { allShelves } from './shelves.js';
import {
  SECCIONES, seccionVisible, toggleSeccion, limpiarBio, limpiarCiudad,
  inicial, profileUrl, usernameFromHash, resumenCorto,
} from './profile-core.js';
import { relationSlot, loadRelation } from './socialui.js';
import { meBloqueo } from './moderation.js';
import { petSvg } from './pet.js';
import { $, esc, toast, closeSheet } from './ui.js';

let visto = null;        // { profile, uid, mio } de lo último que se abrió
let turno = 0;           // una carga lenta no pinta encima de otra más nueva

/* ── ABRIR ───────────────────────────────────────────────────── */

/** Abrir un perfil por @usuario. Sin argumento, el tuyo. */
export async function openProfile(handle) {
  const nombre = handle || myUsername();
  $('profile-overlay').classList.add('open');

  if (!nombre) { pintarSinNombre(); return; }

  const mio = ++turno;
  $('profile-body').innerHTML = '<p class="planner-hint">Abriendo el perfil…</p>';

  const r = await fetchProfile(nombre);
  if (mio !== turno) return;

  if (!r.ok) {
    visto = null;
    $('profile-body').innerHTML = `
      <div class="empty">
        <div class="empty-rune">🔍</div>
        <div class="empty-text">${esc(r.error)}</div>
      </div>
      ${r.error.includes('todavía no tiene')
        ? '' : '<p class="set-fineprint">Comprueba el nombre; se escribe sin la arroba.</p>'}`;
    return;
  }

  /* Si esa persona me bloqueó, no se enseña su perfil. Que el bloqueo
     solo valiera para lo que ella ve sería medio bloqueo. */
  if (await meBloqueo(r.uid)) {
    if (mio !== turno) return;
    visto = null;
    $('profile-body').innerHTML = `
      <div class="empty">
        <div class="empty-rune">🔍</div>
        <div class="empty-text">Este perfil no está disponible</div>
      </div>`;
    return;
  }
  if (mio !== turno) return;

  visto = { ...r, resenas: null };
  pintar();

  /* La relación (seguir, contadores) va aparte y DESPUÉS: son tres
     consultas más y el perfil no tiene por qué esperarlas. */
  loadRelation(r.uid);

  /* Las reseñas vienen de otra colección y pueden tardar. Se pintan
     cuando lleguen en vez de retrasar todo el perfil. */
  if (r.profile.secciones?.includes('resenas')) {
    const resenas = await fetchPublicReviews(r.uid);
    if (mio !== turno || !visto) return;
    visto.resenas = resenas;
    pintar();
  }
}

export function closeProfile(e) {
  if (e && e.target !== $('profile-overlay')) return;
  closeSheet('profile-overlay');
}

/**
 * Lo que se abre desde `#/u/laura`.
 *
 * Devuelve el @usuario abierto, o null si la ruta no era esa. Devolver
 * el nombre y no un sí/no es lo que permite recordar por quién entró
 * alguien que todavía no tiene cuenta (#48).
 */
export function openProfileFromHash(hash = location.hash) {
  const nombre = usernameFromHash(hash);
  if (!nombre) return null;
  openProfile(nombre);
  return nombre;
}

function pintarSinNombre() {
  visto = null;
  $('profile-body').innerHTML = `
    <div class="empty">
      <div class="empty-rune">✦</div>
      <div class="empty-text">Todavía no has elegido tu @usuario</div>
    </div>
    <p class="set-fineprint">Es lo que te da un perfil y un link para compartir.</p>
    <button class="btn-magic full" onclick="closeSheet('profile-overlay');openSettings()"
            style="margin-top:14px">Elegirlo ahora</button>`;
}

/* ── PINTAR ──────────────────────────────────────────────────── */

function pintar() {
  if (!visto) return;
  const p = visto.profile;
  const ve = (id) => p.secciones?.includes(id);

  $('profile-body').innerHTML = `
    <div class="prof-head">
      <div class="prof-avatar">${esc(inicial(p.name || p.username))}</div>
      <div class="prof-id">
        <div class="prof-name">${esc(p.name || p.username)}</div>
        <div class="prof-handle">@${esc(p.username)}</div>
        ${p.city ? `<div class="prof-city">📍 ${esc(p.city)}</div>` : ''}
      </div>
      ${p.mascota ? `<div class="prof-pet">${petSvg('contenta', p.mascota)}</div>` : ''}
    </div>

    ${p.bio ? `<p class="prof-bio">${esc(p.bio)}</p>` : ''}
    <p class="prof-resumen">${esc(resumenCorto(p))}</p>

    ${relationSlot()}

    ${ve('numeros') && p.numeros ? bloqueNumeros(p.numeros) : ''}
    ${ve('leyendo') ? bloqueLeyendo(p.leyendo) : ''}
    ${ve('generos') && p.generos?.length ? bloqueGeneros(p.generos) : ''}
    ${ve('estanterias') && p.estanterias?.length ? bloqueEstanterias(p.estanterias) : ''}
    ${ve('resenas') ? bloqueResenas() : ''}

    ${!visto.mio && myUid() ? `
      <div class="prof-mod">
        <button class="btn-mini" onclick="openReport('perfil','${esc(visto.uid)}','${esc(visto.uid)}','@${esc(p.username)} · ${esc(p.bio || '')}')">
          Reportar este perfil
        </button>
        <button class="btn-mini" onclick="openBlock('${esc(visto.uid)}','@${esc(p.username)}')">
          Bloquear o silenciar
        </button>
      </div>` : ''}

    ${!myUid() ? `
      <div class="prof-mine">
        <p class="set-fineprint">
          Esto es Mi Biblioteca: un plan lector, tus reseñas y tu progreso.
          Puedes tener el tuyo.
        </p>
        <button class="btn-magic full" onclick="openAuthScreen()">
          ✦ Crear mi biblioteca
        </button>
      </div>` : visto.mio ? `
      <div class="prof-mine">
        <p class="set-fineprint">Esto es exactamente lo que ve quien abre tu link.</p>
        <button class="btn-ghost full" onclick="copyProfileLink()">🔗 Copiar mi link</button>
        <button class="btn-ghost full" onclick="closeSheet('profile-overlay');openProfileSettings()"
                style="margin-top:8px">Elegir qué se ve</button>
      </div>` : ''}`;
}

/**
 * Los números, y solo los que dicen algo.
 *
 * Un perfil recién hecho enseñaba «0 en 2026 · 0 en total», que es
 * justo lo que la historia pide evitar: dos ceros grandes es peor que
 * nada, porque parecen un reproche. Sin libros terminados no hay
 * bloque; la frase de arriba ya dice que acaba de llegar.
 */
function bloqueNumeros(n) {
  const celdas = [];
  if (n.leidosEsteAnio) celdas.push([n.leidosEsteAnio, `en ${n.anio}`]);
  if (n.leidosTotal) celdas.push([n.leidosTotal, 'en total']);
  if (n.paginas) celdas.push([n.paginas.toLocaleString('es'), 'páginas']);
  if (n.racha > 1) celdas.push([n.racha, 'días seguidos']);
  if (!celdas.length) return '';
  return `<div class="prof-nums">
    ${celdas.map(([v, t]) => `<div class="prof-num"><b>${v}</b><span>${t}</span></div>`).join('')}
  </div>`;
}

/* «Tus» o «sus» según de quién sea el perfil. Leer «Sus reseñas» en el
   perfil de una misma suena a que la app no sabe con quién habla. */
const suyo = (mio, ajeno) => (visto?.mio ? mio : ajeno);

function bloqueLeyendo(libros = []) {
  if (!libros.length) return '';
  return `
    <div class="prof-sec">
      <h4 class="prof-sec-title">Leyendo ahora</h4>
      ${libros.map((b) => `
        <div class="prof-book">
          ${b.cover
            ? `<img class="prof-cover" src="${esc(b.cover)}" alt="" loading="lazy">`
            : `<div class="prof-cover prof-cover-none">${esc(inicial(b.title))}</div>`}
          <div class="prof-book-txt">
            <div class="prof-book-title">${esc(b.title)}</div>
            <div class="prof-book-author">${esc(b.author)}</div>
            ${b.pct ? `<div class="mini-bar"><div class="mini-bar-fill" style="width:${b.pct}%"></div></div>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
}

const bloqueGeneros = (gs) => `
  <div class="prof-sec">
    <h4 class="prof-sec-title">${suyo('Lo que más lees', 'Lo que más lee')}</h4>
    <div class="filter-scroll">
      ${gs.map((g) => `<div class="chip">${esc(g.genre)} · ${g.n}</div>`).join('')}
    </div>
  </div>`;

const bloqueEstanterias = (ss) => `
  <div class="prof-sec">
    <h4 class="prof-sec-title">${suyo('Tus estanterías', 'Sus estanterías')}</h4>
    <div class="filter-scroll">
      ${ss.map((s) => `<div class="chip shelf-${esc(s.color)}">${esc(s.emoji)} ${esc(s.name)} · ${s.n}</div>`).join('')}
    </div>
  </div>`;

function bloqueResenas() {
  const rs = visto?.resenas;
  if (rs === null) return '<p class="planner-hint">Buscando sus reseñas…</p>';
  if (!rs.length) return '';
  return `
    <div class="prof-sec">
      <h4 class="prof-sec-title">${suyo('Tus reseñas', 'Sus reseñas')}</h4>
      ${rs.slice(0, 10).map((r) => `
        <figure class="quote-card">
          <blockquote>${esc(r.review)}</blockquote>
          <figcaption class="quote-foot">
            <span>${esc(r.title)} · ${esc(r.author)}</span>
            ${r.rating ? `<span class="quote-page">${'★'.repeat(r.rating)}</span>` : ''}
          </figcaption>
        </figure>`).join('')}
    </div>`;
}

/* ── EL LINK ─────────────────────────────────────────────────── */

export const myProfileUrl = () => profileUrl(myUsername(), location.origin + location.pathname);

export async function copyProfileLink() {
  const url = myProfileUrl();
  if (!url) { toast('Primero elige tu @usuario', 'error'); return; }
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copiado');
  } catch {
    /* Sin permiso de portapapeles no se deja a la usuaria sin nada:
       se le enseña el link para que lo copie a mano. */
    toast('Copia el link: ' + url);
  }
}

/* ── ELEGIR QUÉ SE VE ────────────────────────────────────────── */

export function openProfileSettings() {
  $('profset-overlay').classList.add('open');
  pintarAjustes();
}

export function closeProfileSettings(e) {
  if (e && e.target !== $('profset-overlay')) return;
  closeSheet('profset-overlay');
}

function pintarAjustes() {
  const s = settings();
  const nombre = myUsername();
  const cuerpo = $('profset-body');
  if (!cuerpo) return;

  cuerpo.innerHTML = `
    ${nombre ? `
      <p class="set-fineprint">Tu link: <code>${esc(myProfileUrl())}</code></p>
    ` : `
      <p class="planner-hint warn">
        Sin <strong>@usuario</strong> tu perfil no se publica. Elígelo en Ajustes.
      </p>`}

    <label class="flabel">Sobre ti</label>
    <textarea class="review-txt" id="prof-bio" maxlength="160" placeholder="Leo de noche, sobre todo novela negra."
              onchange="saveProfileText()">${esc(s.bio || '')}</textarea>

    <label class="flabel">Ciudad</label>
    <input class="finput" id="prof-city" maxlength="40" placeholder="Bogotá"
           value="${esc(s.city || '')}" onchange="saveProfileText()">

    <h4 class="prof-sec-title" style="margin-top:20px">Qué se ve en tu perfil</h4>
    <p class="set-fineprint">
      Lo que apagues no se publica: deja de estar en tu perfil, no solo de pintarse.
    </p>
    ${SECCIONES.map((sec) => `
      <div class="set-row" onclick="toggleProfileSection('${sec.id}')">
        <div>
          <div class="set-row-title">${esc(sec.label)}</div>
          <div class="set-row-sub">${esc(sec.hint)}</div>
        </div>
        <span class="prof-flag ${seccionVisible(s, sec.id) ? 'on' : ''}">
          ${seccionVisible(s, sec.id) ? 'Se ve' : 'Oculto'}
        </span>
      </div>`).join('')}

    ${bloqueEstanteriasAjustes()}

    <button class="btn-magic full" onclick="closeSheet('profset-overlay');openProfile()"
            style="margin-top:16px">Ver cómo queda</button>`;
}

function bloqueEstanteriasAjustes() {
  const shelves = allShelves();
  if (!shelves.length) return '';
  return `
    <h4 class="prof-sec-title" style="margin-top:20px">Qué estanterías se ven</h4>
    <p class="set-fineprint">Ninguna se publica hasta que la enciendas aquí.</p>
    ${shelves.map((sh) => `
      <div class="set-row" onclick="toggleShelfPublic('${sh.id}')">
        <div class="set-row-title">${esc(sh.emoji || '🔖')} ${esc(sh.name)}</div>
        <span class="prof-flag ${sh.public ? 'on' : ''}">
          ${sh.public ? 'Se ve' : 'Oculto'}
        </span>
      </div>`).join('')}`;
}

export function toggleProfileSection(id) {
  updateSettings({ profileHidden: toggleSeccion(settings(), id) });
  pintarAjustes();
}

export function toggleShelfPublic(id) {
  const shelves = allShelves().map((s) => (s.id === id ? { ...s, public: !s.public } : s));
  updateSettings({ shelves });
  pintarAjustes();
}

export function saveProfileText() {
  updateSettings({
    bio: limpiarBio($('prof-bio')?.value),
    city: limpiarCiudad($('prof-city')?.value),
  });
  toast('Guardado');
}

/** Publicar ahora — se llama al elegir @usuario, que es cuando nace el perfil. */
export async function refreshMyProfile() {
  if (!myUid() || !myUsername()) return;
  await publishProfile();
}
