/* ─────────────────────────────────────────────────────────────
   ARRANQUE
   Une el acceso, los datos por usuaria, el tema y las vistas.
   ───────────────────────────────────────────────────────────── */

import { watchAuth, completePendingSignIn } from './auth.js';
import { loadStore, settings, onSave, flush } from './store.js';
import { applyTheme, localTheme } from './theme-engine.js';
import { seedNewAccount } from './store.js';
import * as views from './views.js';
import * as screens from './screens.js';
import * as addbook from './addbook.js';
import * as quotesui from './quotesui.js';
import * as finished from './finished.js';
import { setConsentPrompt } from './agent.js';
import { $, backdropClose, closeSheet } from './ui.js';

/* ── TEMA ────────────────────────────────────────────────────── */
// El tema local ya se pintó en el <head>; aquí se aplica completo.
applyTheme(localTheme(), { persistLocal: false });

/* ── NAVEGACIÓN ──────────────────────────────────────────────── */

function nav(view, el) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  $('view-' + view)?.classList.add('active');
  el?.classList.add('active');
  if (view === 'plan') views.renderPlan();
  if (view === 'biblioteca') views.renderLib();
  if (view === 'tracker') views.renderTracker();
}

/* ── INDICADOR DE GUARDADO ───────────────────────────────────── */

onSave((state) => {
  const el = $('save-state');
  if (!el) return;
  el.dataset.state = state;
  el.textContent = { saving: 'Guardando…', saved: '', offline: 'Sin conexión · guardado aquí' }[state] || '';
});

/* ── EXPONER AL DOM ──────────────────────────────────────────── */
// Los onclick del marcado necesitan estas funciones en window,
// porque un <script type="module"> no comparte ámbito global.
/* El agente pregunta antes de mandar nada, y quien pregunta es la
   pantalla de screens.js. Se enchufa aquí para que src/agent.js no
   dependa de la interfaz. */
setConsentPrompt(screens.ensureAgentConsent);

Object.assign(window, {
  nav, closeSheet,
  ...addbook, ...quotesui, ...finished,
  closeStore: (e) => backdropClose(e, 'store-overlay'),
  closeRecs: (e) => backdropClose(e, 'recs-overlay'),
  closeSettings: (e) => backdropClose(e, 'settings-overlay'),
  closePlanner: (e) => backdropClose(e, 'planner-overlay'),
  ...views, ...screens,
});
window.deleteBook = views.deleteBook;
window.closeThemeStore = screens.closeThemeStore;

/* ── CICLO DE VIDA ───────────────────────────────────────────── */

const show = (id, on) => $(id)?.classList.toggle('visible', on);

watchAuth(async (user) => {
  const loading = $('loading-screen');

  if (!user) {
    show('auth-screen', true);
    document.body.classList.remove('signed-in');
    if (loading) loading.style.display = 'none';
    screens.renderAuth();
    /* Si venías de Google o Apple y la vuelta falló, aquí es donde se
       sabe: sin esto la pantalla de acceso se pinta otra vez como si no
       hubieras hecho nada, sin decir por qué. */
    completePendingSignIn().then((msg) => { if (msg) screens.showAuthError(msg); });
    return;
  }

  show('auth-screen', false);
  document.body.classList.add('signed-in');

  const result = await loadStore(user.uid);

  // Cuenta nueva: deja constancia del perfil
  if (result.empty) {
    seedNewAccount({
      displayName: user.displayName || null,
      email: user.email || null,
      photoURL: user.photoURL || null,
    }).catch(() => {});
  }

  // El tema guardado en el perfil manda sobre el de este dispositivo
  const s = settings();
  if (s.themeId && s.themeId !== localTheme()) applyTheme(s.themeId);
  else applyTheme(localTheme());

  views.refreshAll();
  if (loading) loading.style.display = 'none';

  await screens.maybeOnboard();
});

/* ── SERVICE WORKER ──────────────────────────────────────────── */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

window.addEventListener('beforeunload', () => { flush(); });
