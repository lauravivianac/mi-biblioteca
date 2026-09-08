/* ─────────────────────────────────────────────────────────────
   PANTALLAS NUEVAS
   Acceso · Onboarding · Tienda de temas · Ajustes · Plan lector
   ───────────────────────────────────────────────────────────── */

import { SOPORTE, mailtoSoporte } from './moderation-core.js';
import {
  registerWithEmail, signInWithEmail, resetPassword, signInWithGoogle,
  signInWithApple, logOut, deleteAccount, humanError, currentUser,
} from './auth.js';
import {
  settings, updateSettings, exportData, exportCsv, updateEntry, findBook,
  allBooks, statusOf, ratingOf, addBook, coverOf,
  myUsername, isUsernameFree, claimUsername,
  miRecordatorio, horasDeLectura,
} from './store.js';
import { findLegacyData, importLegacy, backupBeforeMigrating, dropLegacy } from './migrate.js';
import { applyTheme, previewTheme, themeAvailability, cargarFuentes } from './theme-engine.js';
import { THEMES } from './themes.js';

const THEME_BASE = THEMES[0].tokens;
import { readingPace, goalFeasibility, goalProgress, stalledBooks, generatePlan, planPatches, estimateDays } from './planner.js';
import { resumenRecordatorio } from './habito-core.js';
import { $, esc, toast, confirmAction, download, closeSheet, openSheet } from './ui.js';
import { refreshAll } from './views.js';
import { pintarEstanterias } from './shelvesui.js';
import { MONTH_ORDER } from './seed.js';
import { achievementStatus, earnedCount } from './achievements.js';
import {
  petConfig, petSvg, petState, availableFurs, availableAccessories, availableCorners,
  speciesIlustrada, petVista,
  availableSpecies, currentScene, SCENES, nombreDeFabrica, esNombreDeFabrica,
} from './pet.js';
import {
  workerUrl, agentAvailable, agentOffered, agentDecided, setAgentConsent,
  recommendFrom, isDenied, WHAT_WE_SEND,
} from './agent.js';
import { verifySuggestion } from './booklookup.js';
import { openShare } from './shareui.js';
import { refreshMyProfile } from './profileui.js';
import { soporteHref, soporteCorreo } from './commentsui.js';
import { recommendMine } from './taste.js';
import { describeTaste } from './taste-core.js';
import {
  validateUsername, canChangeUsername, displayHandle, suggestUsername, MAX as USER_MAX,
} from './username-core.js';
import {
  allShelves, createShelf, renameShelf, removeShelf,
  shelfCounts, toggleBookShelf, SHELF_COLORS, SHELF_EMOJIS, SUGGESTED,
} from './shelves.js';
import { ico } from './icons.js';
import { lomoHtml } from './lomo.js';

/* ── ACCESO  ·  historias #14, #15, #16 ──────────────────────── */

let authMode = 'signin';

/* Los once florones, y el CSS enseña el del tema activo. Se hace así
   —y no eligiendo aquí— porque es exactamente lo que ya hace `.vineta`
   al final de las listas: sin repintar al cambiar de tema y sin
   posibilidad de que se quede el adorno del anterior. */
const TEMAS_CON_ADORNO = [
  'exlibris', 'grimorio', 'obsidiana', 'pergamino', 'herbario', 'marea',
  'gotico', 'sakura', 'principito', 'maquina', 'manta',
];

const vinetaDelTema = () => `<svg viewBox="0 0 80 44">${
  TEMAS_CON_ADORNO.map((t) => `<use data-tema="${t}" href="#a-${t}"/>`).join('')
}</svg>`;

export function renderAuth() {
  const isSignup = authMode === 'signup';
  /* La letra de la tapa se pide AQUÍ y no en el index: es la única
     pantalla que la usa, así que quien ya tiene la sesión abierta no
     la descarga nunca. */
  cargarFuentes(['playball']);
  $('auth-screen').innerHTML = `
    <div class="auth-card">
      <!-- LA PORTADA. Es lo primero que ve alguien que llega, y hasta
           ahora era un formulario con un título encima. Ahora es la
           portada de un libro: la marca del propietario arriba, el
           nombre en grande, el filete, y debajo lo que promete. -->
      <div class="portada">
        <div class="portada-marco">
          <div class="portada-vineta" aria-hidden="true">${vinetaDelTema()}</div>
          <div class="auth-exlibris">Ex libris</div>
          <div class="auth-brand">Library</div>
          <div class="auth-filete"></div>
          <p class="auth-lede">Tu plan lector, tus reseñas y tu progreso — solo tuyos.</p>
        </div>
        <!-- QUIEN LEE CONTIGO, ESPERÁNDOTE EN LA PUERTA. Sale de los
             ajustes guardados en este teléfono, así que quien vuelve
             encuentra a la suya; quien llega por primera vez encuentra
             a la Gatita, que es la de fábrica. -->
        <div class="portada-companera" aria-hidden="true">${petVista('contenta')}</div>
      </div>

      <div class="auth-tabs">
        <button class="auth-tab ${!isSignup ? 'active' : ''}" onclick="setAuthMode('signin')">Entrar</button>
        <button class="auth-tab ${isSignup ? 'active' : ''}" onclick="setAuthMode('signup')">Crear cuenta</button>
      </div>

      <form id="auth-form" onsubmit="return submitAuth(event)">
        ${isSignup ? `<div class="fg"><label class="flabel" for="au-name">Cómo te llamas</label>
          <input class="finput" id="au-name" autocomplete="name" placeholder="Tu nombre"></div>` : ''}
        <div class="fg"><label class="flabel" for="au-email">Correo</label>
          <input class="finput" id="au-email" type="email" autocomplete="email" required placeholder="tu@correo.com"></div>
        <div class="fg"><label class="flabel" for="au-pass">Contraseña</label>
          <input class="finput" id="au-pass" type="password" required minlength="6"
            autocomplete="${isSignup ? 'new-password' : 'current-password'}" placeholder="Al menos 6 caracteres"></div>
        <div class="auth-error" id="auth-error" role="alert"></div>
        <button class="btn-magic full" type="submit" id="auth-submit">
          ${isSignup ? 'Crear mi cuenta' : 'Entrar'}
        </button>
      </form>

      ${!isSignup ? `<button class="link-btn" onclick="forgotPassword()">Olvidé mi contraseña</button>` : ''}

      <div class="auth-divider"><span>o</span></div>
      <button class="btn-provider" onclick="providerSignIn('google')">Continuar con Google</button>
      <button class="btn-provider" onclick="providerSignIn('apple')">Continuar con Apple</button>

      <p class="auth-fineprint">
        Nada de lo que escribas es público. Puedes exportar o borrar todo cuando quieras.
      </p>
      ${isSignup ? `
        <p class="auth-fineprint legal-acepta">
          Al crear la cuenta aceptas las
          <a href="/legal/eula" target="_blank" rel="noopener">normas de uso</a>,
          los <a href="/legal/terminos" target="_blank" rel="noopener">términos</a>
          y la <a href="/legal/privacidad" target="_blank" rel="noopener">política de privacidad</a>.
          Las normas son cortas y la primera es la que importa:
          <b>tolerancia cero al contenido ofensivo y a quien se comporta mal</b>.
        </p>` : ''}
    </div>`;
}

export function setAuthMode(mode) { authMode = mode; renderAuth(); }

export const showAuthError = (msg) => { const el = $('auth-error'); if (el) el.textContent = msg; };

export async function submitAuth(event) {
  event.preventDefault();
  const btn = $('auth-submit');
  const email = $('au-email').value;
  const pass = $('au-pass').value;
  const name = $('au-name')?.value;
  showAuthError('');
  btn.disabled = true;
  btn.textContent = authMode === 'signup' ? 'Creando…' : 'Entrando…';
  try {
    if (authMode === 'signup') await registerWithEmail(email, pass, name);
    else await signInWithEmail(email, pass);
  } catch (e) {
    showAuthError(humanError(e));
    btn.disabled = false;
    btn.textContent = authMode === 'signup' ? 'Crear mi cuenta' : 'Entrar';
  }
  return false;
}

export async function providerSignIn(which) {
  showAuthError('');
  try {
    if (which === 'google') await signInWithGoogle();
    else await signInWithApple();
  } catch (e) {
    showAuthError(humanError(e));
  }
}

export async function forgotPassword() {
  const email = $('au-email').value.trim();
  if (!email) { showAuthError('Escribe tu correo arriba y vuelve a tocar aquí.'); return; }
  try {
    await resetPassword(email);
    toast('Te enviamos un correo para restablecer la contraseña.');
  } catch (e) { showAuthError(humanError(e)); }
}

/* ── EL @USUARIO  ·  historia #44 ─────────────────────────────
   El nombre con el que te encuentran. Se comprueba mientras escribes,
   pero quien decide es el servidor: ver claimUsername en store.js. */

let userProbe = null;          // el temporizador de «mientras escribes»
let userState = null;          // { texto, libre, error } de la última comprobación

export function renderUsername() {
  const actual = myUsername();
  const puede = canChangeUsername(settings());
  const s = userState;

  /* SON DOS COSAS Y VAN SEPARADAS. El nombre que ya tienes es un DATO
     —se lee—, y elegir uno nuevo es un FORMULARIO, con su campo y su
     botón. Metidos en la misma tarjeta, el botón de «Quedármelo»
     salía a lo ancho pegado a los bordes y la tarjeta parecía rota.
     El dato lleva su propia tarjeta; el formulario va suelto debajo,
     que es donde vive un formulario. */
  return `
    ${actual ? `<div class="set-card">
      <div class="set-fact">
        <span class="set-fact-label">Tu @usuario</span>
        <span class="set-fact-value">${esc(displayHandle(actual))}</span>
      </div>
    </div>
    <p class="set-fineprint">${puede.ok
      ? 'Así te encuentran tus amistades. Puedes cambiarlo aquí abajo.'
      : esc(puede.error)}</p>` : `<p class="planner-hint">
      Todavía no tienes nombre. Es con lo que te encontrarán tus amistades.
    </p>`}

    ${puede.ok ? `
      <div class="fg" style="margin-top:10px">
        <label class="flabel" for="u-name">${actual ? 'Cambiarlo por' : 'Elige el tuyo'}</label>
        <div class="uname-field">
          <span class="uname-at">@</span>
          <input class="finput uname-input" id="u-name" maxlength="${USER_MAX}"
                 autocapitalize="none" autocomplete="off" spellcheck="false"
                 placeholder="${esc(suggestUsername(currentUser()?.displayName || '', currentUser()?.email || '') || 'tunombre')}"
                 value="${esc(s?.texto || '')}" oninput="probeUsername(this.value)">
        </div>
        <div class="uname-status ${s?.libre ? 'ok' : s?.error ? 'bad' : ''}">${esc(s?.mensaje || '')}</div>
      </div>
      <button class="btn-magic full" id="u-save" ${s?.libre ? '' : 'disabled'}
              onclick="saveUsername()">Quedármelo</button>
    ` : ''}`;
}

function repintarUsername() {
  const slot = $('username-slot');
  if (!slot) return;
  const foco = document.activeElement?.id === 'u-name';
  const pos = foco ? $('u-name').selectionStart : null;
  slot.innerHTML = renderUsername();
  if (foco) {
    const input = $('u-name');
    input?.focus();
    if (pos != null) input?.setSelectionRange(pos, pos);
  }
}

/**
 * Comprobar mientras se escribe, pero sin castigar cada tecla: se
 * espera a que pares. Una consulta por pulsación son treinta lecturas
 * para escribir un nombre, y ninguna de las veintinueve primeras
 * significaba nada.
 */
export function probeUsername(texto) {
  clearTimeout(userProbe);
  const v = validateUsername(texto);
  userState = { texto, libre: false, error: !v.ok, mensaje: v.ok ? 'Comprobando…' : v.error };
  repintarUsername();
  if (!v.ok) return;

  userProbe = setTimeout(async () => {
    const r = await isUsernameFree(texto);
    if (userState?.texto !== texto) return;      // ya escribió otra cosa
    userState = {
      texto,
      libre: r.free,
      error: !r.free,
      mensaje: r.free ? '¡Libre! Es tuyo si lo quieres.' : r.error,
    };
    repintarUsername();
  }, 400);
}

export async function saveUsername() {
  const texto = $('u-name')?.value;
  const btn = $('u-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  const r = await claimUsername(texto);
  if (!r.ok) {
    userState = { texto, libre: false, error: true, mensaje: r.error };
    repintarUsername();
    return;
  }
  userState = null;
  repintarUsername();
  toast(`Ahora eres ${displayHandle(r.username)}`);
  /* El @usuario es lo que hace que exista un perfil público (#45): sin
     él no hay dónde publicarlo ni link que dar. Así que se publica aquí
     mismo, y no en el próximo guardado, para que el link que acabas de
     ganar lleve a algo desde el primer segundo. */
  refreshMyProfile().catch(() => {});
}

/** Presumir de un logro  ·  historia #92 */
export function shareAchievement(nombre) {
  const a = achievementStatus().find((x) => x.name === nombre);
  if (!a) return;
  openShare('logro', { name: a.name, icon: a.icon, hint: a.earned ? '' : a.hint });
}

/* ── ONBOARDING  ·  historia #19 ─────────────────────────────── */

export async function maybeOnboard() {
  const s = settings();
  if (s.onboarded) return;

  /* La migración se ofrecía a TODA cuenta nueva sin mirar quién era,
     así que cualquiera que se registrara podía llevarse la biblioteca
     de otra persona. La migración ya ocurrió y las reglas cerraron la
     colección antigua; aquí se cierra también del lado del cliente,
     para no volver a ofrecer lo que no es de quien pregunta. */
  const legacy = null;
  const legacyBlock = legacy ? `
    <div class="onb-legacy">
      <div class="onb-legacy-title">Encontramos tu biblioteca anterior</div>
      <p>${legacy.count} libros con estado, valoraciones y reseñas${legacy.customCount ? `, y ${legacy.customCount} libros que añadiste tú` : ''}.</p>
      <button class="btn-magic full" onclick="runMigration()">Traerla a mi cuenta</button>
      <button class="link-btn" onclick="downloadLegacyBackup()">Descargar una copia primero</button>
    </div>` : '';

  $('onboard-screen').innerHTML = `
    <div class="onb-card">
      <div class="onb-step">Bienvenida</div>
      <h2 class="onb-title">Tu plan lector, vivo</h2>
      <p class="onb-lede">Registra lo que lees, y la app arma un plan que sí puedas cumplir.</p>
      ${legacyBlock}
      <div class="onb-actions">
        <button class="btn-magic full" onclick="finishOnboarding(true)">Empezar con el plan de 73 libros</button>
        <button class="btn-ghost full" onclick="finishOnboarding(false)">Empezar con la biblioteca vacía</button>
      </div>
      <button class="link-btn" onclick="finishOnboarding(true)">Saltar por ahora</button>
    </div>`;
  $('onboard-screen').classList.add('visible');
  window.__legacy = legacy;
}

export function downloadLegacyBackup() {
  if (!window.__legacy) return;
  download('mi-biblioteca-copia-antigua.json', backupBeforeMigrating(window.__legacy));
  toast('Copia descargada. Ahora puedes migrar con tranquilidad.');
}

export async function runMigration() {
  const legacy = window.__legacy;
  if (!legacy) return;
  toast('Trayendo tus datos…');
  try {
    const result = await importLegacy(legacy);
    await confirmAction({
      title: 'Listo',
      body: `Se trajeron <strong>${result.entradas}</strong> libros con datos,
             de los cuales <strong>${result.leidos}</strong> están marcados como leídos${
               result.librosPropios ? `, más <strong>${result.librosPropios}</strong> libros tuyos` : ''}.`,
      confirmLabel: 'Entendido',
    });
    /* Ya migrado: el documento antiguo deja de hacer falta. Si el borrado
       falla hay que SABERLO — tragárselo en silencio fue justo lo que dejó
       la biblioteca vieja visible para otras cuentas. */
    try {
      await dropLegacy();
    } catch (e) {
      console.error('No se pudo borrar el documento antiguo:', e);
      toast('Se migró, pero no se pudo borrar la copia antigua. Avísame.', 'error');
    }
    window.__legacy = null;
    finishOnboarding(true);
  } catch (e) {
    toast('No se pudo migrar: ' + e.message, 'error');
  }
}

export function finishOnboarding(keepSeed) {
  updateSettings({ onboarded: true, seedHidden: !keepSeed });
  if (!keepSeed) {
    // "Vacía" oculta los libros semilla, no los borra: siguen en el código
    import('./store.js').then(({ everyBook, updateEntry: ue }) => {
      everyBook().filter((b) => !b.custom).forEach((b) => ue(b.id, { hidden: true }));
      refreshAll();
    });
  }
  $('onboard-screen').classList.remove('visible');
  refreshAll();
}

/* ── TIENDA DE TEMAS  ·  historias #76, #77, #80 ─────────────── */

let restorePreview = null;
let previewing = null;

export function openThemeStore() {
  renderThemeStore();
  openSheet('store-overlay');
}

export function closeThemeStore() {
  /* Descarta la vista previa antes de salir: cerrar sin aplicar dejaba
     la app pintada con un tema que los ajustes no habían guardado, y al
     recargar volvía al anterior sin explicación. */
  if (restorePreview) { restorePreview(); restorePreview = null; previewing = null; }
  $('store-overlay').classList.remove('open');
  refreshAll();
}

function renderThemeStore() {
  const s = settings();
  const themes = themeAvailability(s.achievements);
  const active = previewing || s.themeId;

  $('store-body').innerHTML = `
    <p class="store-lede">Cada tema cambia el material, la forma y la tipografía —
    no solo el color. Toca uno para verlo aplicado antes de decidir.</p>

    <div class="store-shelf-label">Temas de la app</div>
    <div class="theme-grid">
      ${themes.map((t) => `
        <button class="theme-tile ${active === t.id ? 'active' : ''} ${t.locked ? 'locked' : ''}"
                onclick="${t.locked ? '' : `previewThemeTile('${t.id}')`}"
                ${t.locked ? 'aria-disabled="true"' : ''}
                style="${miniStyle(t)}">
          <span class="mini">
            <span class="mini-rune"></span>
            <span class="mini-lines"><i></i><i></i></span>
          </span>
          <span class="theme-name">${t.emoji} ${esc(t.name)}</span>
          <span class="theme-blurb">${esc(t.blurb)}</span>
          ${t.locked ? `<span class="theme-lock">${ico('candado', 'ico-sm')} ${esc(t.unlock.label)}</span>` : ''}
          ${s.themeId === t.id ? '<span class="theme-current">En uso</span>' : ''}
        </button>`).join('')}
    </div>

    ${previewing && previewing !== s.themeId ? `
      <div class="store-actions">
        <button class="btn-ghost" onclick="cancelThemePreview()">Descartar</button>
        <button class="btn-magic" onclick="applyPreviewedTheme()">Aplicar ${esc(themes.find((t) => t.id === previewing).name)} y volver</button>
      </div>` : ''}

    <!-- «Aquí dice "tu mascota" pero eso hace ver mal al animalito,
         como un accesorio innecesario.»

         Y es exacto: una mascota es algo que TIENES, como un tema o
         una estantería, y por eso este rótulo la ponía al nivel de un
         adorno de la tienda. Pero no hace lo mismo que un adorno: te
         pregunta por dónde vas, se acuerda de lo que dejaste a medias
         y te escribe cuando llevas días sin abrir un libro. Eso es
         compañía, no decoración.

         «Quien lee contigo» dice lo que hace, y además no tiene
         género: hay una gata y hay un oso, y «tu compañero» o «tu
         compañera» se equivoca con la mitad de ellos. -->
    <div class="store-shelf-label">Quien lee contigo</div>
    ${renderPetShelf()}`;
}

/** Segundo estante: la mascota. Nada se paga; todo se desbloquea leyendo. */
function renderPetShelf() {
  const cfg = petConfig();
  const especies = availableSpecies();
  /* Las que faltan, con su pista, escritas debajo. El `title` no vale
     aquí: esto es una app de teléfono y en un teléfono no hay ratón
     que se pose encima, así que un candado explicado solo en el
     `title` es un candado sin explicar. */
  const porGanar = especies.filter((sp) => sp.locked && sp.hint);
  /* El candado dice QUÉ falta, con las palabras del logro. «Se
     desbloquea leyendo» no es una pista, es un cartel de cerrado. */
  const opt = (group, item, extra = '') => `
    <button class="pet-opt ${cfg[group] === item.id ? 'on' : ''} ${item.locked ? 'locked' : ''}"
            ${item.locked ? 'aria-disabled="true"' : `onclick="setPetPart('${group}','${item.id}')"`}
            title="${esc(item.locked ? (item.hint || 'Se desbloquea leyendo') : item.name)}">
      ${extra}${item.locked ? '🔒 ' : ''}${esc(item.name)}
    </button>`;

  return `
    <div class="pet-preview">${petVista(petState().mood, cfg)}</div>

    <label class="pet-group-label" for="pet-name">Cómo se llama</label>
    <input class="pet-name-input" id="pet-name" maxlength="18"
           placeholder="${esc(nombreDeFabrica(cfg.species) || 'Ponle un nombre')}"
           value="${esc(cfg.name)}" onchange="setPetName(this.value)">
    <p class="planner-hint">Viene con nombre puesto, pero es tuya: cámbiaselo cuando quieras.</p>

    ${/* El botón enseña el NOMBRE, no la especie: el emoji ya dice qué
          animal es, y «Cleo, Nube, Ulises» son seis personajes donde
          «Gatita, Coneja, Búho» era un catálogo. La especie queda en
          el `title` y bajo el candado. */''}
    <div class="pet-group-label">Quién te acompaña</div>
    <div class="pet-options">
      ${especies.map((sp) => `
        <button class="pet-opt ${cfg.species === sp.id ? 'on' : ''} ${sp.locked ? 'locked' : ''}"
                ${sp.locked ? 'aria-disabled="true"' : `onclick="setPetPart('species','${sp.id}')"`}
                title="${esc(sp.locked ? (sp.hint || 'Se desbloquea leyendo') : sp.name)}">
          ${sp.emoji} ${sp.locked ? '🔒 ' : ''}${esc(sp.nombre)}
        </button>`).join('')}
    </div>
    ${porGanar.length ? `<ul class="pet-porganar">
      ${porGanar.map((sp) => `<li><span class="pet-porganar-quien">${sp.emoji} ${esc(sp.nombre)}</span>
        ${esc(sp.hint)}</li>`).join('')}
    </ul>` : ''}

    ${speciesIlustrada(cfg.species) ? `
    <p class="planner-hint">
      El pelaje y el accesorio no se eligen en esta: viene pintada a mano,
      con su color y sin postizos.
    </p>` : `
    <div class="pet-group-label">Pelaje</div>
    <div class="pet-options">
      ${availableFurs().map((f) => opt('fur', f,
        `<span class="pet-dot" style="background:${f.color}"></span>`)).join('')}
    </div>

    <div class="pet-group-label">Accesorio</div>
    <div class="pet-options">${availableAccessories().map((a) => opt('accessory', a)).join('')}</div>`}

    <div class="pet-group-label">Su rincón</div>
    <div class="pet-options">${availableCorners().map((c) => opt('corner', c)).join('')}</div>
    ${cfg.corner === 'auto' ? `<p class="planner-hint">
      Ahora mismo está en <strong>${esc(SCENES.find((sc) => sc.id === currentScene()).name)}</strong>,
      por lo que estás leyendo. Cambia sola con el bloque que tengas entre manos.
    </p>` : ''}

    <p class="set-fineprint">
      Aquí no se compra nada. Una compañera que costó terminar un libro de 900 páginas
      significa algo; una que costó dos dólares, no.
    </p>`;
}

/**
 * La miniatura de cada ficha se pinta con los tokens del propio tema,
 * así que muestra su forma y su material de verdad — no una muestra
 * de color que todos los temas comparten.
 */
function miniStyle(t) {
  const g = THEME_BASE;
  const k = (name) => t.tokens[name] ?? g[name] ?? '';
  return [
    `--m-bg:${k('--void')}`,
    `--m-surface:${k('--deep')}`,
    `--m-accent:${k('--purple')}`,
    `--m-gold:${k('--gold')}`,
    `--m-ink:${k('--text')}`,
    `--m-radius:${k('--card-radius') || '14px'}`,
    `--m-rune:${k('--rune-radius') || '8px'}`,
    `--m-border:${t.tokens['--card-border'] === 'none' || t.tokens['--card-border'] === '0'
        ? '0' : '1px solid ' + k('--lilac')}`,
  ].join(';');
}

export function previewThemeTile(id) {
  if (!restorePreview) restorePreview = previewTheme(id);
  else previewTheme(id);
  previewing = id;
  renderThemeStore();
}

export function cancelThemePreview() {
  if (restorePreview) restorePreview();
  restorePreview = null; previewing = null;
  renderThemeStore();
}

/**
 * Aplicar cierra la tienda y devuelve al inicio: aplicar ES la decisión.
 * Para seguir mirando está la vista previa, que no compromete nada.
 */
export function applyPreviewedTheme() {
  if (!previewing) return;
  applyTheme(previewing);
  updateSettings({ themeId: previewing });
  restorePreview = null;
  const name = themeAvailability().find((t) => t.id === previewing)?.name;
  previewing = null;
  closeSheet('store-overlay');
  refreshAll();
  toast(`Tema ${name} aplicado`);
}

export function setPetPart(group, id) {
  const cfg = petConfig();
  const nuevo = { ...cfg, [group]: id };

  /* AL CAMBIAR DE ESPECIE, EL NOMBRE VIENE CON ELLA — pero solo si el
     que había lo puso la app. Si lo escribió ella, es suyo y no se
     toca: cambiar de compañera no es motivo para borrarle el nombre
     que le puso. Y llamar «Cleo» a un panda porque antes tenías una
     gata tampoco es lo que nadie espera. */
  if (group === 'species' && (!cfg.name || esNombreDeFabrica(cfg.name))) {
    nuevo.name = nombreDeFabrica(id);
  }

  updateSettings({ pet: nuevo });
  renderThemeStore();
  refreshAll();
}

export function setPetName(name) {
  updateSettings({ pet: { ...petConfig(), name: name.trim().slice(0, 18) } });
  refreshAll();
  if (name.trim()) toast(`Se llama ${name.trim()}`);
}

export function togglePet() {
  const hidden = !petConfig().hidden;
  updateSettings({ pet: { ...petConfig(), hidden } });
  openSettings();
  refreshAll();
  toast(hidden ? 'Mascota oculta. Sigues ganando logros igual.' : 'Aquí está de vuelta.');
}

/**
 * Tocarla abre la conversación (#44).
 *
 * Si el asistente no está configurado en este despliegue, no se abre
 * una hoja que no puede contestar: se refresca, que es lo que hacía
 * antes, y ella dice lo suyo. Un botón que promete algo que no hay es
 * peor que un botón que hace poco.
 */
export function pokePet() {
  /* CUANDO ELLA PREGUNTA, TOCARLA RESPONDE. Abrir el chat sería
     cambiarle el tema a quien acaba de leer «¿por dónde vas?»: la
     intención más concreta gana, y la conversación sigue a un toque
     desde la propia hoja. */
  const { mood, libro } = petState();
  if (mood === 'preguntando' || mood === 'rescatando') { openPetAsk(libro); return; }
  if (agentOffered()) { openPetChat(); return; }
  refreshAll();
}

/* ── AJUSTES  ·  historias #20, #21 ──────────────────────────── */

/* ── LAS DOS PIEZAS DE AJUSTES ───────────────────────────────
   Una fila LLEVA A OTRO SITIO; un dato SE LEE Y YA. Antes las dos se
   pintaban igual —título, subtítulo y, si acaso, una flecha— así que
   «Tu ritmo real» parecía un menú roto: se toca y no pasa nada. Que
   se distingan a simple vista es la mitad de lo que hace legible una
   pantalla de ajustes. */

const filaAjuste = (accion, titulo, sub = '', chevron = '›') => `
  <div class="set-row"${accion ? ` onclick="${accion}"` : ''}>
    <div><div class="set-row-title">${titulo}</div>
      ${sub ? `<div class="set-row-sub">${sub}</div>` : ''}</div>
    <span class="set-chev">${chevron}</span>
  </div>`;

const datoAjuste = (etiqueta, valor) => `
  <div class="set-fact">
    <span class="set-fact-label">${etiqueta}</span>
    <span class="set-fact-value">${valor}</span>
  </div>`;

export function openSettings() {
  const user = currentUser();
  const s = settings();
  const progress = goalProgress();
  const pace = readingPace();

  $('settings-body').innerHTML = `
    <div class="set-account">
      <div class="set-avatar">${esc((user?.displayName || user?.email || '?').charAt(0).toUpperCase())}</div>
      <div>
        <div class="set-name">${esc(user?.displayName || 'Sin nombre')}</div>
        <div class="set-email">${esc(user?.email || '')}</div>
        ${user && !user.emailVerified ? '<div class="set-warn">Correo sin verificar</div>' : ''}
      </div>
    </div>

    <div class="section-heading"><span class="section-heading-text">Lectura</span></div>
    <div class="set-card">
      ${filaAjuste('openPlanner()', 'Tiempo y objetivo',
        `${s.minutesWeekday != null ? `${s.minutesWeekday} min entre semana` : 'Sin configurar'}${
          s.goalValue ? ` · meta de ${s.goalValue} ${s.goalKind === 'books' ? 'libros' : s.goalKind}` : ''}`)}
      ${/* «estimado · provisional» decía lo mismo dos veces y empujaba
            la etiqueta contra el borde en una pantalla estrecha. */''}
      ${datoAjuste('Tu ritmo real',
        `${pace.pagesPerDay.toFixed(0)} páginas al día${pace.provisional ? ' · estimación' : ` · ${pace.source}`}`)}
      ${progress ? datoAjuste('Avance del año',
        `${progress.done} de ${progress.goal} · ${progress.ahead
          ? `${progress.diffUnits} por delante 🎉` : `${progress.diffUnits} por detrás`}`) : ''}
      ${/* Va aquí, con el tiempo y el ritmo, y no en una sección de
            avisos: lo que se configura es CUÁNDO LEES, y eso es de este
            grupo. Además ya está al lado del dato del que sale. */''}
      ${filaAjuste('openRecordatorio()', 'Recordarme leer',
        resumenRecordatorio(miRecordatorio(), horasDeLectura()))}
    </div>

    <div class="section-heading"><span class="section-heading-text">Tu perfil</span></div>
    <div id="username-slot">${renderUsername()}</div>
    <div class="set-card">
      ${filaAjuste('openProfile()', 'Tu perfil público', myUsername()
        ? 'Míralo como lo ve quien abre tu link'
        : 'Elige tu @usuario para tenerlo')}
      ${filaAjuste('openProfileSettings()', 'Qué se ve en tu perfil',
        'Tu bio, tu ciudad y qué secciones se publican')}
      ${filaAjuste('openPosts()', 'Lo que escribo',
        'Tus notas de lectura, reseñas y listas')}
    </div>

    <div class="section-heading"><span class="section-heading-text">Tu gente</span></div>
    <div class="set-card">
      ${filaAjuste('openInvite()', 'Invitar a alguien',
        'Tu link y tu código QR, para enseñarlo en persona')}
      ${filaAjuste('openBlocked()', 'Bloqueadas y silenciadas',
        'Quién no te ve y a quién no ves')}
    </div>

    <div class="section-heading"><span class="section-heading-text">Intercambio</span></div>
    <div class="set-card">
      ${filaAjuste('openPlace()', 'Dónde estás',
        'Solo la ciudad, nunca la dirección')}
      ${filaAjuste('openMySwaps()', 'Mis libros ofrecidos')}
    </div>

    ${/* La regla del resto de la hoja: lo que es una LISTA DE FILAS va
          en tarjeta; lo que es un formulario o un par de botones, no.
          Los logros son una lista, así que llevan la suya. */''}
    <div class="section-heading"><span class="section-heading-text">Logros</span></div>
    <div class="set-card"><div class="ach-list">
      ${achievementStatus().map((a) => `
        <div class="ach ${a.earned ? 'got' : ''}">
          <span class="ach-icon">${a.earned ? a.icon : '🔒'}</span>
          <div class="ach-body">
            <div class="ach-name">${esc(a.name)}</div>
            <div class="ach-hint">${a.earned ? 'Conseguido' : esc(a.hint)}</div>
            ${!a.earned ? `<div class="mini-bar"><div class="mini-bar-fill" style="width:${a.pct}%"></div></div>` : ''}
          </div>
          ${a.earned
            ? `<button class="btn-mini" onclick="shareAchievement('${esc(a.name).replace(/'/g, "&#39;")}')">Presumir</button>`
            : `<span class="ach-count">${a.done}/${a.need}${a.unit}</span>`}
        </div>`).join('')}
    </div></div>

    <div class="section-heading"><span class="section-heading-text">Apariencia</span></div>
    <div class="set-card">
      ${filaAjuste('togglePet()', 'Mascota lectora', petConfig().hidden
        ? 'Oculta · toca para traerla de vuelta'
        : 'Visible en el inicio · toca para ocultarla',
        petConfig().hidden ? '○' : '●')}
      ${filaAjuste('openThemeStore()', 'Tienda de temas',
        `Once temas para cambiarle la cara a la app · ${earnedCount()} logros conseguidos`)}
    </div>

    ${workerUrl() ? `
    <div class="section-heading"><span class="section-heading-text">El agente</span></div>
    <div class="set-card">
      ${filaAjuste('toggleAgent()', 'El agente lector',
        !agentDecided() ? 'Sin decidir · te preguntaremos la primera vez que lo uses'
        : agentAvailable() ? 'Encendido · «¿me lo leo?» y qué leer después'
        : 'Apagado · no se envía nada',
        !agentDecided() ? '·' : agentAvailable() ? '●' : '○')}
    </div>
    <button class="link-btn" onclick="showAgentNotice()">Ver exactamente qué se envía</button>
    <p class="set-fineprint">
      Apagarlo no quita nada más: añadir libros por título o por código de barras
      nunca pasa por el agente.
    </p>` : ''}

    ${/* LAS ESTANTERÍAS SE FUERON DE AQUÍ · historia #57.
          Estaban desplegadas al final de Ajustes, entre el agente y la
          exportación de datos — o sea que para ver tus estanterías
          había que entrar en la pantalla de la configuración y bajar.
          Ahora tienen su propio botón en el margen y su propia hoja;
          esto es solo la puerta, para quien las busque donde estaban. */''}
    <div class="section-heading"><span class="section-heading-text">Estanterías</span></div>
    ${filaAjuste('openEstanterias()', 'Mis estanterías',
    allShelves().length
      ? `${allShelves().length} ${allShelves().length === 1 ? 'estantería' : 'estanterías'}`
      : 'Todavía ninguna')}
    <p class="set-fineprint">
      También están en el botón del margen. Un libro puede estar en varias a la vez.
    </p>

    <div class="section-heading"><span class="section-heading-text">Tus datos</span></div>
    <div class="set-card">
      ${filaAjuste('doExportJson()', 'Exportar a JSON',
        'Una copia tuya, legible, de todo lo registrado')}
      ${filaAjuste('doExportCsv()', 'Exportar a CSV',
        'Compatible con la importación de Goodreads')}
    </div>

    <!-- Privacidad estaba suelta en medio del perfil y «cómo escribirnos»
         repetía la fila de abajo. Las dos van juntas: son lo mismo. -->
    <div class="section-heading"><span class="section-heading-text">Privacidad y ayuda</span></div>
    <div class="set-card">
      ${filaAjuste('openLegal()', 'Privacidad y términos',
        'Qué se guarda de ti y qué no')}
      <a class="set-row" href="${soporteHref()}">
        <div><div class="set-row-title">Escríbenos</div>
          <div class="set-row-sub">${esc(soporteCorreo())}</div></div>
        <span class="set-chev">›</span>
      </a>
    </div>
    <p class="set-fineprint">
      Si alguien te está molestando, puedes reportarlo desde su perfil o desde
      cualquier comentario, y bloquearla desde ahí mismo.
    </p>

    <div class="section-heading"><span class="section-heading-text">Cuenta</span></div>
    <button class="btn-ghost full" onclick="doLogOut()">Cerrar sesión</button>
    <button class="btn-delete full" onclick="doDeleteAccount()">Borrar mi cuenta y todos mis datos</button>
    <p class="set-fineprint">
      Borrar la cuenta elimina tus libros, reseñas y ajustes. No se puede deshacer.
    </p>`;
  openSheet('settings-overlay');
}

/* ── EL AGENTE  ·  historia #61 ───────────────────────────────
   El consentimiento se pide al TOCAR el botón, no al registrarse.
   Al registrarse nadie lee, y además todavía no sabe qué es esto; al
   tocar «¿me lo leo?» ya sabe para qué sirve y la pregunta tiene
   sentido. Mientras no diga que sí, no se manda nada. */

/** El aviso, palabra por palabra. Lo comparten las dos pantallas. */
function agentNotice() {
  return `
    <p class="confirm-body">
      Para esto, la app le manda tus datos a <strong>DeepSeek</strong>, un servicio de
      inteligencia artificial. Es una empresa china y sus servidores están en China.
    </p>
    <div class="notice-list">
      ${WHAT_WE_SEND.map((x) => `
        <div class="notice-row">
          <div class="notice-what">${esc(x.que)}</div>
          <div class="notice-sends">${esc(x.manda)}</div>
        </div>`).join('')}
    </div>
    <p class="confirm-body">
      <strong>Nunca se envían</strong> tus reseñas, tus notas, tu nombre ni tu correo.
      La consulta viaja sin tu identidad: el servidor comprueba que tu sesión es válida,
      pero no le dice a DeepSeek quién eres.
    </p>
    <p class="confirm-body">
      Las respuestas se guardan en tu biblioteca para no volver a preguntar lo mismo.
      Puedes cambiar de opinión cuando quieras, en Ajustes.
    </p>`;
}

/**
 * Pregunta si se puede usar el agente. Devuelve true solo con un sí.
 * Si ya contestó antes, no vuelve a molestar.
 */
export function ensureAgentConsent() {
  if (agentAvailable()) return Promise.resolve(true);
  if (agentDecided()) return Promise.resolve(false);   // dijo que no

  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'overlay open confirm-overlay';
    wrap.innerHTML = `
      <div class="sheet confirm-sheet notice-sheet">
        <div class="sheet-title">¿Le preguntamos a la IA?</div>
        ${agentNotice()}
        <div class="confirm-actions">
          <button class="btn-ghost" data-act="no">No, gracias</button>
          <button class="btn-magic" data-act="si">Sí, úsalo</button>
        </div>
      </div>`;
    const done = (v) => {
      wrap.remove();
      if (v !== null) { setAgentConsent(v); refreshAll(); }
      resolve(v === true);
    };
    wrap.addEventListener('click', (e) => {
      const act = e.target.dataset?.act;
      if (act === 'si') done(true);
      else if (act === 'no') done(false);
      else if (e.target === wrap) done(null);   // cerrar sin contestar no es un no
    });
    document.body.appendChild(wrap);
  });
}

/** El mismo aviso, para releerlo desde Ajustes sin decidir nada. */
export function showAgentNotice() {
  const wrap = document.createElement('div');
  wrap.className = 'overlay open confirm-overlay';
  wrap.innerHTML = `
    <div class="sheet confirm-sheet notice-sheet">
      <div class="sheet-title">Qué se envía</div>
      ${agentNotice()}
      <div class="confirm-actions">
        <button class="btn-ghost" data-act="ok">Entendido</button>
      </div>
    </div>`;
  wrap.addEventListener('click', (e) => {
    if (e.target.dataset?.act === 'ok' || e.target === wrap) wrap.remove();
  });
  document.body.appendChild(wrap);
}

/** Desde Ajustes: sin decidir abre la pregunta; decidido, cambia. */
export async function toggleAgent() {
  if (!agentDecided()) { await ensureAgentConsent(); openSettings(); return; }
  const estaba = agentAvailable();
  setAgentConsent(!estaba);
  toast(estaba ? 'Agente apagado' : 'Agente encendido');
  openSettings();
  refreshAll();
}

/* ── QUÉ LEER DESPUÉS  ·  historias #49, #63 ──────────────────
   Se le manda lo LEÍDO con su puntuación —que es lo que de verdad
   dice qué te gusta— y lo pendiente, para que no repita algo que ya
   está en la pila.

   Y TODA sugerencia pasa por los catálogos antes de aparecer. Un
   modelo inventa libros plausibles con total confianza; pintarlos tal
   cual convierte una recomendación en una mentira bien escrita. La
   que ningún catálogo reconoce, no se muestra. */

let sugeridos = [];

/* ── LO TUYO PRIMERO  ·  historia #62 ─────────────────────────
   Esta pantalla pedía permiso para el agente antes de enseñar nada,
   así que sin agente no había recomendaciones en absoluto. Y las
   había: tus propios pendientes, ordenados por lo que ya se sabe de
   tu gusto. Es instantáneo, funciona sin conexión y no gasta un
   token. Los descubrimientos de fuera son un botón aparte, porque
   son lo único que de verdad necesita salir a internet. */

export function openRecs() {
  openSheet('recs-overlay');
  pintarRecsLocales();
}

function pintarRecsLocales() {
  const { perfil, sugerencias } = recommendMine({ limit: 5 });

  $('recs-body').innerHTML = `
    <p class="taste-line">${esc(describeTaste(perfil))}</p>

    ${sugerencias.length ? `
      <div class="store-shelf-label">De los tuyos</div>
      ${sugerencias.map((b) => `
        <div class="sug">
          <div class="sug-head">
            ${coverOf(b.id)
              ? `<img class="sug-cover" src="${esc(coverOf(b.id))}" alt="" loading="lazy">`
              : `<div class="sug-cover">${lomoHtml(b, { mini: true })}</div>`}
            <div class="sug-info">
              <div class="sug-title">${esc(b.title)}</div>
              <div class="sug-author">${esc(b.author)}${b.pages && b.pages !== '—' ? ` · ${esc(b.pages)} págs.` : ''}</div>
            </div>
          </div>
          ${b.porque ? `<p class="sug-why">${esc(b.porque)}</p>` : ''}
          <div class="sug-actions">
            <button class="btn-magic btn-sug" onclick="startFromRecs('${b.id}')">Empezarlo</button>
          </div>
        </div>`).join('')}
    ` : `<p class="planner-hint">
      No te queda nada pendiente que proponerte. Buen momento para añadir algo con ＋.
    </p>`}

    ${agentOffered() ? `
      <button class="btn-ghost full" id="recs-agent-btn" onclick="askAgentRecs()" style="margin-top:16px">
        Buscar libros nuevos, fuera de tu biblioteca
      </button>
      <p class="set-fineprint">Lo de arriba es tuyo y no gasta nada. Esto le pregunta al agente.</p>
    ` : ''}`;
}

/** Empezar uno de los tuyos, desde aquí. */
export function startFromRecs(id) {
  updateEntry(id, { status: 'reading', startedAt: Date.now() });
  closeSheet('recs-overlay');
  refreshAll();
  toast('¡A leer!');
}

export async function askAgentRecs() {
  // Antes de mandar nada: nada sale de aquí sin un sí.
  if (!await ensureAgentConsent()) return;

  $('recs-body').innerHTML = '<p class="planner-hint">Mirando lo que has leído…</p>';
  sugeridos = [];

  const books = allBooks();
  const read = books.filter((b) => statusOf(b.id) === 'read')
    .map((b) => ({ ...b, rating: ratingOf(b.id) }))
    .sort((a, b) => b.rating - a.rating);
  const pending = books.filter((b) => statusOf(b.id) !== 'read');

  if (read.length < 3) {
    $('recs-body').innerHTML = `<p class="planner-hint">
      Con <strong>${read.length}</strong> ${read.length === 1 ? 'libro leído' : 'libros leídos'} todavía no hay
      de dónde sacar un descubrimiento que valga. Marca unos cuantos como leídos
      —y ponles estrellas, que es lo que más dice— y vuelve.
    </p>
    <button class="btn-ghost full" onclick="openRecs()" style="margin-top:14px">← Volver a los tuyos</button>`;
    return;
  }

  try {
    const crudas = await recommendFrom({ read, pending });
    if (!crudas.length) {
      $('recs-body').innerHTML = '<p class="planner-hint">No se le ocurrió nada esta vez. Prueba otra vez más tarde.</p>';
      return;
    }

    $('recs-body').innerHTML = '<p class="planner-hint">Comprobando que los libros existan…</p>';

    /* En paralelo: son cinco consultas a catálogos, no cinco al modelo. */
    const yaTengo = new Set(books.map((b) => `${b.title} ${b.author}`.toLowerCase()));
    const verificadas = (await Promise.all(crudas.map(async (r) => {
      const real = await verifySuggestion(r).catch(() => null);
      if (!real) return null;
      if (yaTengo.has(`${real.title} ${real.author}`.toLowerCase())) return null;
      return { ...real, porque: r.porque };
    }))).filter(Boolean);

    sugeridos = verificadas;

    if (!verificadas.length) {
      $('recs-body').innerHTML = `<p class="planner-hint warn">
        El agente propuso ${crudas.length} libros y <strong>ningún catálogo reconoció ninguno</strong>.
        Suele significar que se los inventó, así que no te los muestro. Inténtalo otra vez.
      </p>`;
      return;
    }

    const descartadas = crudas.length - verificadas.length;
    $('recs-body').innerHTML = `
      <p class="planner-hint">
        A partir de tus ${read.length} libros leídos y de cómo los puntuaste.
        ${descartadas ? `Se ${descartadas === 1 ? 'descartó 1 sugerencia' : `descartaron ${descartadas} sugerencias`} porque ningún catálogo ${descartadas === 1 ? 'la' : 'las'} reconoció.` : ''}
      </p>
      <div class="recs">
        ${verificadas.map((r, i) => `
          <div class="rec">
            <div class="rec-head">
              ${r.cover
                ? `<img class="rec-cover" src="${esc(r.cover)}" alt="" loading="lazy">`
                : `<div class="rec-cover">${lomoHtml(r, { mini: true })}</div>`}
              <div class="rec-info">
                <div class="rec-title">${esc(r.title)}</div>
                <div class="rec-author">${esc(r.author)}${r.year ? ' · ' + r.year : ''}${r.pages !== '—' ? ' · ' + esc(r.pages) + ' págs.' : ''}</div>
              </div>
            </div>
            ${r.porque ? `<p class="rec-why">${esc(r.porque)}</p>` : ''}
            <button class="btn-ghost rec-add" id="rec-add-${i}" onclick="addSuggestion(${i})">
              ＋ Añadir a mis deseados
            </button>
          </div>`).join('')}
      </div>
      <p class="set-fineprint">
        Los datos —portada, autor, páginas— salen de OpenLibrary y Google Books, no del agente.
        Lo único suyo es el porqué.
      </p>
      <button class="btn-ghost full" onclick="openRecs()" style="margin-top:14px">← Volver a los tuyos</button>`;
  } catch (e) {
    if (isDenied(e)) { closeSheet('recs-overlay'); return; }
    $('recs-body').innerHTML = `<p class="planner-hint warn">${esc(e.message)}</p>`;
  }
}

/** Un toque y el libro entra en la biblioteca, con su portada. */
export function addSuggestion(i) {
  const r = sugeridos[i];
  if (!r) return;
  const saved = addBook({
    title: r.title, author: r.author, genre: r.genre,
    year: null, month: null, pages: r.pages, role: '⚓ Ancla',
  });
  updateEntry(saved.id, {
    status: 'wished',
    ...(r.cover ? { cover: r.cover } : {}),
    ...(r.isbn ? { isbn: r.isbn } : {}),
  });
  const btn = $(`rec-add-${i}`);
  if (btn) { btn.textContent = '✓ En tus deseados'; btn.disabled = true; }
  toast(`«${r.title}» añadido a deseados`);
  refreshAll();
}

/* ── ESTANTERÍAS  ·  historia #22 ─────────────────────────────
   Se crean desde donde hacen falta —la ficha de un libro— y se
   gestionan desde Ajustes. Crear una estantería vacía desde un menú
   de configuración es el camino que nadie recorre. */

let nuevaEmoji = SHELF_EMOJIS[0];
let nuevaColor = SHELF_COLORS[0];

/** El formulario de crear, con su emoji y su color. */
export function newShelfFor(bookId = null) {
  nuevaEmoji = SHELF_EMOJIS[0];
  nuevaColor = SHELF_COLORS[0];

  const wrap = document.createElement('div');
  wrap.className = 'overlay open confirm-overlay';
  wrap.id = 'shelf-form';
  wrap.innerHTML = `
    <div class="sheet confirm-sheet">
      <div class="sheet-title">Nueva estantería</div>
      <div class="fg">
        <label class="flabel" for="shelf-name">Cómo se llama</label>
        <input class="finput" id="shelf-name" maxlength="32" placeholder="Para el viaje" autocomplete="off">
      </div>
      <div class="pet-group-label">Su símbolo</div>
      <div class="shelf-emojis" id="shelf-emojis"></div>
      <div class="pet-group-label">Su color</div>
      <div class="shelf-colors" id="shelf-colors"></div>
      <p class="auth-error" id="shelf-error"></p>
      <div class="confirm-actions">
        <button class="btn-ghost" data-act="cancel">Cancelar</button>
        <button class="btn-magic" data-act="ok">Crear</button>
      </div>
    </div>`;

  wrap.addEventListener('click', (e) => {
    const act = e.target.dataset?.act;
    if (act === 'cancel' || e.target === wrap) { wrap.remove(); return; }
    if (act !== 'ok') return;

    const shelf = createShelf({
      name: $('shelf-name').value, emoji: nuevaEmoji, color: nuevaColor,
    });
    if (!shelf) {
      $('shelf-error').textContent = $('shelf-name').value.trim()
        ? 'Ya tienes una estantería con ese nombre.'
        : 'Ponle un nombre.';
      return;
    }
    wrap.remove();
    // Si venía de un libro, el libro entra en ella de una vez
    if (bookId) toggleBookShelf(bookId, shelf.id);
    toast(`Estantería «${shelf.name}» creada`);
    if (bookId) openDetail(bookId);
    /* Y si venía de la hoja de estanterías, que la nueva aparezca en
       ella. Sin esto, crear una desde ahí la dejaba en una lista que
       seguía enseñando las de antes. */
    pintarEstanterias();
    refreshAll();
  });

  document.body.appendChild(wrap);
  pintarOpcionesNueva();
  $('shelf-name').focus();
}

function pintarOpcionesNueva() {
  const e = $('shelf-emojis');
  const c = $('shelf-colors');
  if (e) {
    e.innerHTML = SHELF_EMOJIS.map((em) => `
      <button class="shelf-emoji ${em === nuevaEmoji ? 'on' : ''}" onclick="pickShelfEmoji('${em}')">${em}</button>`).join('');
  }
  if (c) {
    c.innerHTML = SHELF_COLORS.map((col) => `
      <button class="shelf-color ${col === nuevaColor ? 'on' : ''}"
              style="--shelf-rgb: var(--${col}-rgb)" onclick="pickShelfColor('${col}')"
              aria-label="${col}"></button>`).join('');
  }
}

export function pickShelfEmoji(em) { nuevaEmoji = em; pintarOpcionesNueva(); }
export function pickShelfColor(col) { nuevaColor = col; pintarOpcionesNueva(); }

/** Renombrar, desde Ajustes. */
export async function editShelf(id) {
  const shelf = allShelves().find((s) => s.id === id);
  if (!shelf) return;
  const nombre = await askShelfName(shelf.name);
  if (nombre === null) return;
  if (!renameShelf(id, nombre)) {
    toast('Ese nombre ya está usado', 'error');
    return;
  }
  pintarEstanterias();
  refreshAll();
}

function askShelfName(actual) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'overlay open confirm-overlay';
    wrap.innerHTML = `
      <div class="sheet confirm-sheet">
        <div class="sheet-title">Renombrar</div>
        <input class="finput" id="shelf-rename" maxlength="32" value="${esc(actual)}" autocomplete="off">
        <div class="confirm-actions" style="margin-top:16px">
          <button class="btn-ghost" data-act="cancel">Cancelar</button>
          <button class="btn-magic" data-act="ok">Guardar</button>
        </div>
      </div>`;
    wrap.addEventListener('click', (e) => {
      const act = e.target.dataset?.act;
      if (act === 'ok') { const v = $('shelf-rename').value; wrap.remove(); resolve(v); }
      else if (act === 'cancel' || e.target === wrap) { wrap.remove(); resolve(null); }
    });
    document.body.appendChild(wrap);
    $('shelf-rename').select();
  });
}

/** Borrar. Se dice explícitamente que los libros no se van con ella. */
export async function deleteShelf(id) {
  const shelf = allShelves().find((s) => s.id === id);
  if (!shelf) return;
  const cuantos = shelfCounts()[id] || 0;
  const yes = await confirmAction({
    title: `¿Borrar «${shelf.name}»?`,
    body: cuantos
      ? `Los <strong>${cuantos}</strong> ${cuantos === 1 ? 'libro sale' : 'libros salen'} de esta estantería,
         pero <strong>siguen en tu biblioteca</strong> con sus reseñas y sus puntuaciones. No se borra ningún libro.`
      : 'Está vacía, así que no se pierde nada.',
    confirmLabel: 'Borrar la estantería',
    danger: true,
  });
  if (!yes) return;
  removeShelf(id);
  toast(`Estantería «${shelf.name}» borrada`);
  pintarEstanterias();
  refreshAll();
}

/** Las primeras, para que la función no empiece con una pantalla vacía. */
export function addSuggestedShelves() {
  let puestas = 0;
  for (const s of SUGGESTED) if (createShelf(s)) puestas++;
  toast(puestas ? `${puestas} estanterías creadas` : 'Ya las tenías todas');
  pintarEstanterias();
  refreshAll();
}

export const doExportJson = () => {
  download('mi-biblioteca.json', JSON.stringify(exportData(), null, 2));
  toast('Exportado. La copia es tuya.');
};
export const doExportCsv = () => {
  download('mi-biblioteca.csv', exportCsv(), 'text/csv');
  toast('CSV exportado.');
};

export async function doLogOut() {
  const yes = await confirmAction({ title: '¿Cerrar sesión?', body: 'Tus datos quedan guardados.', confirmLabel: 'Cerrar sesión' });
  if (yes) logOut();
}

export async function doDeleteAccount() {
  const first = await confirmAction({
    title: 'Borrar tu cuenta',
    body: 'Se eliminan tus libros, reseñas, ajustes y la cuenta misma. <strong>Esto no se puede deshacer.</strong><br><br>¿Quieres descargar una copia antes?',
    confirmLabel: 'Descargar copia primero',
  });
  if (first) { doExportJson(); return; }

  const sure = await confirmAction({
    title: '¿Seguro del todo?',
    body: 'Última confirmación. Se borra todo y no hay vuelta atrás.',
    confirmLabel: 'Sí, borrar todo', danger: true,
  });
  if (!sure) return;

  try {
    await deleteAccount();
    toast('Cuenta borrada. Gracias por haber estado.');
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ── ASISTENTE DEL PLAN  ·  historias #32, #33, #35, #36, #37 ── */

let draftPlan = null;

export function openPlanner() {
  draftPlan = null;
  renderPlannerStep1();
  openSheet('planner-overlay');
}

function renderPlannerStep1() {
  const s = settings();
  const pace = readingPace();
  const stalled = stalledBooks();

  $('planner-body').innerHTML = `
    <div class="sheet-title">Armar mi plan</div>
    <p class="planner-lede">Dos preguntas y te reparto los pendientes mes a mes.</p>

    <div class="section-heading"><span class="section-heading-text">¿Cuánto tiempo tienes?</span></div>
    <div class="frow">
      <div class="fg"><label class="flabel" for="p-weekday">Minutos entre semana</label>
        <input class="finput" id="p-weekday" type="number" min="0" max="600" value="${s.minutesWeekday ?? 30}" oninput="previewCapacity()"></div>
      <div class="fg"><label class="flabel" for="p-weekend">Minutos el fin de semana</label>
        <input class="finput" id="p-weekend" type="number" min="0" max="600" value="${s.minutesWeekend ?? 60}" oninput="previewCapacity()"></div>
    </div>
    <p class="planner-hint" id="p-capacity"></p>

    <div class="section-heading"><span class="section-heading-text">¿Qué quieres lograr?</span></div>
    <div class="frow">
      <div class="fg"><label class="flabel" for="p-goalkind">Meta en</label>
        <select class="fselect" id="p-goalkind" onchange="previewCapacity()">
          <option value="books" ${s.goalKind === 'books' ? 'selected' : ''}>Libros al año</option>
          <option value="pages" ${s.goalKind === 'pages' ? 'selected' : ''}>Páginas al año</option>
          <option value="minutes" ${s.goalKind === 'minutes' ? 'selected' : ''}>Minutos al día</option>
        </select></div>
      <div class="fg"><label class="flabel" for="p-goalvalue">Cuántos</label>
        <input class="finput" id="p-goalvalue" type="number" min="1" value="${s.goalValue ?? 24}" oninput="previewCapacity()"></div>
    </div>
    <p class="planner-hint" id="p-feasible"></p>

    ${stalled.length ? `
      <div class="section-heading"><span class="section-heading-text">Libros represados</span></div>
      <p class="planner-lede">Tienes <strong>${stalled.length}</strong> libros cuyo mes ya pasó. El plan nuevo les da prioridad.</p>
      <div class="stalled-list">
        ${stalled.slice(0, 6).map((b) => `
          <div class="stalled-row">
            <div>
              <div class="stalled-title">${esc(b.title)}</div>
              <div class="stalled-sub">${b.month} ${b.year} · ${b.monthsLate} ${b.monthsLate === 1 ? 'mes' : 'meses'} esperando${b.startedAlready ? ' · empezado' : ''}</div>
            </div>
            <button class="btn-mini" onclick="releaseBook('${b.id}')">Soltar</button>
          </div>`).join('')}
        ${stalled.length > 6 ? `<div class="stalled-more">y ${stalled.length - 6} más</div>` : ''}
      </div>` : ''}

    <button class="btn-magic full" onclick="buildPlan()">Ver el plan que me propones</button>
    <p class="set-fineprint">El plan es una propuesta. Puedes mover libros a mano y fijarlos para que no se muevan.</p>`;

  previewCapacity();
}

/** Traduce minutos a algo concreto: libros al año, no "páginas por día". */
export function previewCapacity() {
  const weekday = parseInt($('p-weekday')?.value, 10) || 0;
  const weekend = parseInt($('p-weekend')?.value, 10) || 0;
  const perDay = ((weekday * 5 + weekend * 2) / 7) * (250 / 300);
  const perYear = perDay * 365;
  const cap = $('p-capacity');
  if (cap) {
    cap.innerHTML = weekday || weekend
      ? `Son unas <strong>${perDay.toFixed(0)} páginas al día</strong>, o alrededor de <strong>${Math.round(perYear / 320)} libros al año</strong>.`
      : 'Si lo dejas en cero, usamos tu ritmo real observado.';
  }

  const kind = $('p-goalkind')?.value || 'books';
  const value = parseInt($('p-goalvalue')?.value, 10) || 0;
  const el = $('p-feasible');
  if (!el || !value) return;

  const yearly = kind === 'books' ? Math.round(perYear / 320) : kind === 'pages' ? Math.round(perYear) : Math.round(perDay / (250 / 300));
  if (yearly >= value) {
    el.className = 'planner-hint ok';
    el.innerHTML = `Con ese tiempo, la meta es alcanzable. 🎉`;
  } else {
    el.className = 'planner-hint warn';
    el.innerHTML = `Con ese tiempo darían unos <strong>${yearly}</strong>. Puedes dejar tu meta igual —es tuya— pero conviene saberlo antes de diciembre.`;
  }
}

export function releaseBook(id) {
  updateEntry(id, { status: 'wished', year: null });
  toast('Soltado sin culpa. Sigue en tus deseados.');
  renderPlannerStep1();
}

export function buildPlan() {
  updateSettings({
    minutesWeekday: parseInt($('p-weekday').value, 10) || null,
    minutesWeekend: parseInt($('p-weekend').value, 10) || null,
    goalKind: $('p-goalkind').value,
    goalValue: parseInt($('p-goalvalue').value, 10) || null,
    goalYear: new Date().getFullYear(),
  });

  draftPlan = generatePlan({ months: 12 });
  renderPlanProposal();
}

function renderPlanProposal() {
  const p = draftPlan;
  $('planner-body').innerHTML = `
    <div class="sheet-title">Tu plan propuesto</div>
    <p class="planner-lede">
      ${p.used} libros repartidos en 12 meses, a ${p.pace.pagesPerDay.toFixed(0)} páginas al día.
      ${p.rescued ? `<strong>${p.rescued}</strong> venían represados.` : ''}
      ${p.remaining ? `Quedan ${p.remaining} pendientes para después.` : ''}
    </p>

    <div class="proposal">
      ${p.assignments.map((slot) => `
        <div class="prop-month">
          <div class="prop-month-head">
            <span class="prop-month-name">${slot.month} ${slot.year}</span>
            <span class="prop-month-cap">~${slot.capacity} págs.</span>
          </div>
          ${slot.books.length ? slot.books.map((b) => `
            <div class="prop-book">
              <span class="prop-role">${b.slotRole === 'ancla' ? '⚓' : '⚡'}</span>
              <div>
                <div class="prop-title">${esc(b.title)}${b.continuing ? ' <em>(sigue)</em>' : ''}</div>
                <div class="prop-reason">${esc(b.reason)}</div>
              </div>
              <span class="prop-pages">${esc(b.pages)}</span>
            </div>`).join('') : '<div class="prop-empty">Mes libre</div>'}
        </div>`).join('')}
    </div>

    <div class="store-actions">
      <button class="btn-ghost" onclick="openPlanner()">Volver</button>
      <button class="btn-magic" onclick="acceptPlan()">Aplicar este plan</button>
    </div>
    <p class="set-fineprint">Aplicarlo no toca los meses ya pasados ni los libros que fijaste.</p>`;
}

export function acceptPlan() {
  if (!draftPlan) return;
  const patches = planPatches(draftPlan);
  for (const patch of patches) {
    const book = findBook(patch.id);
    if (!book) continue;
    book.year = patch.year;
    book.month = patch.month;
    updateEntry(patch.id, { plannedYear: patch.year, plannedMonth: patch.month, planApplied: Date.now() });
  }
  closeSheet('planner-overlay');
  refreshAll();
  toast(`Plan aplicado: ${patches.length} libros repartidos`);
}

/* ── LOS DOCUMENTOS LEGALES  ·  historia #97 ────────────────────
   Se abren en el navegador y no dentro de una hoja, a propósito: son
   páginas publicadas en una URL estable —eso es lo que exige la
   tienda— y así lo que lee quien usa la app es exactamente lo mismo
   que lee quien revisa la ficha. Un texto legal que solo existe dentro
   de la app es un texto que no se puede enlazar. */
export function openLegal() {
  openSheet('legal-overlay');
  $('legal-body').innerHTML = `
    <p class="planner-hint">
      Están escritos en español claro, no en jerga copiada. Se abren en el
      navegador porque son las mismas páginas que enlaza la ficha de la tienda.
    </p>

    <a class="set-row" href="/legal/privacidad" target="_blank" rel="noopener">
      <div><div class="set-row-title">Política de privacidad</div>
        <div class="set-row-sub">Qué se guarda, con quién se comparte y qué NO se guarda nunca</div></div>
      <span class="set-chev">↗</span>
    </a>
    <a class="set-row" href="/legal/terminos" target="_blank" rel="noopener">
      <div><div class="set-row-title">Términos de servicio</div>
        <div class="set-row-sub">Qué es esto y qué se puede esperar de ello</div></div>
      <span class="set-chev">↗</span>
    </a>
    <a class="set-row" href="/legal/eula" target="_blank" rel="noopener">
      <div><div class="set-row-title">Normas de uso</div>
        <div class="set-row-sub">Tolerancia cero al contenido ofensivo y a quien se comporta mal</div></div>
      <span class="set-chev">↗</span>
    </a>

    <h4 class="prof-sec-title" style="margin-top:20px">¿Necesitas ayuda?</h4>
    <p class="set-fineprint" style="margin-top:0">
      Escribe y te contestamos. Si es sobre alguien que te está molestando,
      cuéntalo con detalle: hay tolerancia cero y se revisa.
    </p>
    <a class="btn-magic full" href="${mailtoSoporte()}" style="display:block;text-align:center">
      Escribir a soporte
    </a>
    <p class="set-fineprint" style="text-align:center">${esc(SOPORTE.correo)}</p>`;
}

export const closeLegal = (e) => {
  if (!e || e.target === $('legal-overlay')) closeSheet('legal-overlay');
};
