/* ─────────────────────────────────────────────────────────────
   PANTALLAS NUEVAS
   Acceso · Onboarding · Tienda de temas · Ajustes · Plan lector
   ───────────────────────────────────────────────────────────── */

import {
  registerWithEmail, signInWithEmail, resetPassword, signInWithGoogle,
  signInWithApple, logOut, deleteAccount, humanError, currentUser,
} from './auth.js';
import {
  settings, updateSettings, exportData, exportCsv, updateEntry, findBook,
} from './store.js';
import { findLegacyData, importLegacy, backupBeforeMigrating, dropLegacy } from './migrate.js';
import { applyTheme, previewTheme, themeAvailability } from './theme-engine.js';
import { THEMES } from './themes.js';

const THEME_BASE = THEMES[0].tokens;
import { readingPace, goalFeasibility, goalProgress, stalledBooks, generatePlan, planPatches, estimateDays } from './planner.js';
import { $, esc, toast, confirmAction, download, closeSheet } from './ui.js';
import { refreshAll } from './views.js';
import { MONTH_ORDER } from './seed.js';
import { achievementStatus, earnedCount } from './achievements.js';
import {
  petConfig, petSvg, petState, availableFurs, availableAccessories, availableCorners,
  availableSpecies, currentScene, SCENES,
} from './pet.js';
import { workerUrl, setWorkerUrl, setAgentEnabled } from './agent.js';

/* ── ACCESO  ·  historias #14, #15, #16 ──────────────────────── */

let authMode = 'signin';

export function renderAuth() {
  const isSignup = authMode === 'signup';
  $('auth-screen').innerHTML = `
    <div class="auth-card">
      <div class="auth-brand">✦ Mi Biblioteca</div>
      <p class="auth-lede">Tu plan lector, tus reseñas y tu progreso — solo tuyos.</p>

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
          ${isSignup ? '✦ Crear mi cuenta' : 'Entrar'}
        </button>
      </form>

      ${!isSignup ? `<button class="link-btn" onclick="forgotPassword()">Olvidé mi contraseña</button>` : ''}

      <div class="auth-divider"><span>o</span></div>
      <button class="btn-provider" onclick="providerSignIn('google')">Continuar con Google</button>
      <button class="btn-provider" onclick="providerSignIn('apple')">Continuar con Apple</button>

      <p class="auth-fineprint">
        Nada de lo que escribas es público. Puedes exportar o borrar todo cuando quieras.
      </p>
    </div>`;
}

export function setAuthMode(mode) { authMode = mode; renderAuth(); }

const showAuthError = (msg) => { const el = $('auth-error'); if (el) el.textContent = msg; };

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
    btn.textContent = authMode === 'signup' ? '✦ Crear mi cuenta' : 'Entrar';
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
  $('store-overlay').classList.add('open');
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
          ${t.locked ? `<span class="theme-lock">🔒 ${esc(t.unlock.label)}</span>` : ''}
          ${s.themeId === t.id ? '<span class="theme-current">En uso</span>' : ''}
        </button>`).join('')}
    </div>

    ${previewing && previewing !== s.themeId ? `
      <div class="store-actions">
        <button class="btn-ghost" onclick="cancelThemePreview()">Descartar</button>
        <button class="btn-magic" onclick="applyPreviewedTheme()">Aplicar ${esc(themes.find((t) => t.id === previewing).name)} y volver</button>
      </div>` : ''}

    <div class="store-shelf-label">Tu mascota</div>
    ${renderPetShelf()}`;
}

/** Segundo estante: la mascota. Nada se paga; todo se desbloquea leyendo. */
function renderPetShelf() {
  const cfg = petConfig();
  const opt = (group, item, extra = '') => `
    <button class="pet-opt ${cfg[group] === item.id ? 'on' : ''} ${item.locked ? 'locked' : ''}"
            ${item.locked ? 'aria-disabled="true"' : `onclick="setPetPart('${group}','${item.id}')"`}
            title="${item.locked ? 'Se desbloquea leyendo' : esc(item.name)}">
      ${extra}${item.locked ? '🔒 ' : ''}${esc(item.name)}
    </button>`;

  return `
    <div class="pet-preview">${petSvg(petState().mood, cfg)}</div>

    <label class="pet-group-label" for="pet-name">Cómo se llama</label>
    <input class="pet-name-input" id="pet-name" maxlength="18"
           placeholder="Ponle un nombre" value="${esc(cfg.name)}"
           onchange="setPetName(this.value)">

    <div class="pet-group-label">Quién te acompaña</div>
    <div class="pet-options">
      ${availableSpecies().map((sp) => opt('species', sp, `${sp.emoji} `)).join('')}
    </div>

    <div class="pet-group-label">Pelaje</div>
    <div class="pet-options">
      ${availableFurs().map((f) => opt('fur', f,
        `<span class="pet-dot" style="background:${f.color}"></span>`)).join('')}
    </div>

    <div class="pet-group-label">Accesorio</div>
    <div class="pet-options">${availableAccessories().map((a) => opt('accessory', a)).join('')}</div>

    <div class="pet-group-label">Su rincón</div>
    <div class="pet-options">${availableCorners().map((c) => opt('corner', c)).join('')}</div>
    ${cfg.corner === 'auto' ? `<p class="planner-hint">
      Ahora mismo está en <strong>${esc(SCENES.find((sc) => sc.id === currentScene()).name)}</strong>,
      por lo que estás leyendo. Cambia sola con el bloque que tengas entre manos.
    </p>` : ''}

    <p class="set-fineprint">
      Todo se desbloquea leyendo. Un accesorio que costó terminar un libro de 900 páginas
      significa algo; uno que costó dos dólares, no.
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
  updateSettings({ pet: { ...petConfig(), [group]: id } });
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

/** Tocarla responde: si no reacciona, es un dibujo, no una compañera. */
export function pokePet() {
  refreshAll();
}

/* ── AJUSTES  ·  historias #20, #21 ──────────────────────────── */

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
    <div class="set-row" onclick="openPlanner()">
      <div><div class="set-row-title">Tiempo y objetivo</div>
        <div class="set-row-sub">${s.minutesWeekday != null ? `${s.minutesWeekday} min entre semana` : 'Sin configurar'}${
          s.goalValue ? ` · meta de ${s.goalValue} ${s.goalKind === 'books' ? 'libros' : s.goalKind}` : ''}</div></div>
      <span class="set-chev">›</span>
    </div>
    <div class="set-row">
      <div><div class="set-row-title">Tu ritmo real</div>
        <div class="set-row-sub">${pace.pagesPerDay.toFixed(0)} páginas al día · ${pace.source}${pace.provisional ? ' · estimación provisional' : ''}</div></div>
    </div>
    ${progress ? `<div class="set-row">
      <div><div class="set-row-title">Avance del año</div>
        <div class="set-row-sub">${progress.done} de ${progress.goal} · ${progress.ahead
          ? `vas ${progress.diffUnits} por delante 🎉` : `vas ${progress.diffUnits} por detrás`}</div></div>
    </div>` : ''}

    <div class="section-heading"><span class="section-heading-text">Logros</span></div>
    <div class="ach-list">
      ${achievementStatus().map((a) => `
        <div class="ach ${a.earned ? 'got' : ''}">
          <span class="ach-icon">${a.earned ? a.icon : '🔒'}</span>
          <div class="ach-body">
            <div class="ach-name">${esc(a.name)}</div>
            <div class="ach-hint">${a.earned ? 'Conseguido' : esc(a.hint)}</div>
            ${!a.earned ? `<div class="mini-bar"><div class="mini-bar-fill" style="width:${a.pct}%"></div></div>` : ''}
          </div>
          ${!a.earned ? `<span class="ach-count">${a.done}/${a.need}${a.unit}</span>` : ''}
        </div>`).join('')}
    </div>

    <div class="section-heading"><span class="section-heading-text">Apariencia</span></div>
    <div class="set-row" onclick="togglePet()">
      <div><div class="set-row-title">Mascota lectora</div>
        <div class="set-row-sub">${petConfig().hidden
          ? 'Oculta · toca para traerla de vuelta'
          : 'Visible en el inicio · toca para ocultarla'}</div></div>
      <span class="set-chev">${petConfig().hidden ? '○' : '●'}</span>
    </div>
    <div class="set-row" onclick="openThemeStore()">
      <div><div class="set-row-title">Tienda de temas</div>
        <div class="set-row-sub">Nueve temas para cambiarle la cara a la app · ${earnedCount()} logros conseguidos</div></div>
      <span class="set-chev">›</span>
    </div>

    <div class="section-heading"><span class="section-heading-text">El agente</span></div>
    <div class="set-row" onclick="configureAgent()">
      <div><div class="set-row-title">Identificar portadas con IA</div>
        <div class="set-row-sub">${workerUrl()
          ? (settings().agentEnabled
              ? 'Encendido · solo se usa cuando ningún catálogo reconoce la portada'
              : 'Configurado pero apagado · toca para encenderlo')
          : 'Sin configurar · despliega el Worker y pega aquí su dirección'}</div></div>
      <span class="set-chev">${workerUrl() && settings().agentEnabled ? '●' : '○'}</span>
    </div>
    <p class="set-fineprint">
      La clave de DeepSeek vive en el Worker, nunca en la app. Añadir libros
      por título o por código de barras funciona igual sin el agente.
    </p>

    <div class="section-heading"><span class="section-heading-text">Tus datos</span></div>
    <div class="set-row" onclick="doExportJson()">
      <div><div class="set-row-title">Exportar a JSON</div>
        <div class="set-row-sub">Una copia tuya, legible, de todo lo registrado</div></div>
      <span class="set-chev">›</span>
    </div>
    <div class="set-row" onclick="doExportCsv()">
      <div><div class="set-row-title">Exportar a CSV</div>
        <div class="set-row-sub">Compatible con la importación de Goodreads</div></div>
      <span class="set-chev">›</span>
    </div>

    <div class="section-heading"><span class="section-heading-text">Cuenta</span></div>
    <button class="btn-ghost full" onclick="doLogOut()">Cerrar sesión</button>
    <button class="btn-delete full" onclick="doDeleteAccount()">Borrar mi cuenta y todos mis datos</button>
    <p class="set-fineprint">
      Borrar la cuenta elimina tus libros, reseñas y ajustes. No se puede deshacer.
    </p>`;
  $('settings-overlay').classList.add('open');
}

/* ── EL AGENTE ────────────────────────────────────────────────
   Se configura desde aquí y no desde el código, porque la
   dirección del Worker es de cada quien. Lo que NUNCA se pide
   aquí es la clave de DeepSeek: esa vive en el Worker, y en la
   app sería visible con F12. */
export async function configureAgent() {
  const current = workerUrl();

  if (current) {
    const on = settings().agentEnabled;
    setAgentEnabled(!on);
    toast(on ? 'Agente apagado' : 'Agente encendido');
    openSettings();
    return;
  }

  const url = await askText({
    title: 'Dirección del Worker',
    body: 'Despliega la carpeta <strong>worker/</strong> en Cloudflare y pega aquí la dirección que te dé. La clave de DeepSeek no se escribe aquí: va en el Worker con <code>wrangler secret put</code>.',
    placeholder: 'https://mi-agente.workers.dev',
  });
  if (!url) return;

  if (!/^https:\/\/[^\s]+$/i.test(url)) {
    toast('La dirección tiene que empezar por https://', 'error');
    return;
  }
  setWorkerUrl(url);
  setAgentEnabled(true);
  toast('Agente configurado');
  openSettings();
}

/** Un campo de texto en una hoja, con el mismo aire que confirmAction. */
function askText({ title, body, placeholder = '' }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'overlay open confirm-overlay';
    wrap.innerHTML = `
      <div class="sheet confirm-sheet">
        <div class="sheet-title">${esc(title)}</div>
        <p class="confirm-body">${body}</p>
        <input class="finput" id="ask-text" placeholder="${esc(placeholder)}" autocomplete="off">
        <div class="confirm-actions" style="margin-top:16px">
          <button class="btn-ghost" data-act="cancel">Cancelar</button>
          <button class="btn-magic" data-act="ok">Guardar</button>
        </div>
      </div>`;
    const done = (v) => { wrap.remove(); resolve(v); };
    wrap.addEventListener('click', (e) => {
      const act = e.target.dataset?.act;
      if (act === 'ok') done($('ask-text').value.trim());
      else if (act === 'cancel' || e.target === wrap) done(null);
    });
    document.body.appendChild(wrap);
    $('ask-text').focus();
  });
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
  $('planner-overlay').classList.add('open');
}

function renderPlannerStep1() {
  const s = settings();
  const pace = readingPace();
  const stalled = stalledBooks();

  $('planner-body').innerHTML = `
    <div class="sheet-title">✦ Armar mi plan</div>
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
    <div class="sheet-title">✦ Tu plan propuesto</div>
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
