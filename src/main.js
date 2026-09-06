/* ─────────────────────────────────────────────────────────────
   ARRANQUE
   Une el acceso, los datos por usuaria, el tema y las vistas.
   ───────────────────────────────────────────────────────────── */

import { watchAuth, completePendingSignIn } from './auth.js';
import { loadStore, settings, onSave, flush, setDisplayName, uid } from './store.js';
import { applyTheme, localTheme } from './theme-engine.js';
import { seedNewAccount } from './store.js';
import * as views from './views.js';
import * as screens from './screens.js';
import * as addbook from './addbook.js';
import * as quotesui from './quotesui.js';
import * as finished from './finished.js';
import * as gapsui from './gapsui.js';
import * as duel from './duel.js';
import * as yearui from './yearui.js';
import * as shareui from './shareui.js';
import * as profileui from './profileui.js';
import * as socialui from './socialui.js';
import * as inviteui from './inviteui.js';
import * as feedui from './feedui.js';
import * as commentsui from './commentsui.js';
import { loadMyBlocks } from './moderation.js';
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
  if (view === 'feed') feedui.renderFeed();
}

/* ── INDICADOR DE GUARDADO ───────────────────────────────────── */

onSave((state) => {
  const el = $('save-state');
  if (!el) return;
  el.dataset.state = state;
  el.textContent = { saving: 'Guardando…', saved: '', offline: 'Sin conexión · guardado aquí' }[state] || '';
});

const show = (id, on) => $(id)?.classList.toggle('visible', on);

/* ── EXPONER AL DOM ──────────────────────────────────────────── */
// Los onclick del marcado necesitan estas funciones en window,
// porque un <script type="module"> no comparte ámbito global.
/* El agente pregunta antes de mandar nada, y quien pregunta es la
   pantalla de screens.js. Se enchufa aquí para que src/agent.js no
   dependa de la interfaz. */
setConsentPrompt(screens.ensureAgentConsent);

Object.assign(window, {
  nav, closeSheet,
  ...addbook, ...quotesui, ...finished, ...gapsui, ...duel, ...yearui, ...shareui,
  ...profileui, ...socialui, ...inviteui, ...feedui, ...commentsui,
  closeStore: (e) => backdropClose(e, 'store-overlay'),
  closeRecs: (e) => backdropClose(e, 'recs-overlay'),
  closeSettings: (e) => backdropClose(e, 'settings-overlay'),
  closePlanner: (e) => backdropClose(e, 'planner-overlay'),
  ...views, ...screens,
});
window.deleteBook = views.deleteBook;
/* Para quien está mirando un perfil sin cuenta y decide crearse una. */
window.openAuthScreen = () => {
  closeSheet('profile-overlay');
  show('auth-screen', true);
};
window.closeThemeStore = screens.closeThemeStore;

/* ── CICLO DE VIDA ───────────────────────────────────────────── */

watchAuth(async (user) => {
  const loading = $('loading-screen');

  if (!user) {
    show('auth-screen', true);
    document.body.classList.remove('signed-in');
    if (loading) loading.style.display = 'none';
    screens.renderAuth();

    /* QUIEN LLEGA POR UNA INVITACIÓN VE EL PERFIL, NO LA PUERTA (#48).
       Un link de perfil que abre una pantalla de «crea tu cuenta» es
       un link que nadie pulsa dos veces. Se le enseña a quién venía a
       ver, y se le ofrece la app desde ahí; el perfil público se lee
       sin sesión precisamente para esto (ver firestore.rules).

       Se apunta además de quién era el perfil, para poder ofrecerle
       seguirla si acaba creándose la cuenta. */
    const invitada = profileui.openProfileFromHash();
    if (invitada) {
      inviteui.rememberInviter(invitada);
      /* Y la puerta se aparta: la pantalla de acceso va por encima de
         todo, así que dejarla puesta tapaba el perfil que se acaba de
         abrir. Quien llega por una invitación ve primero a quien venía
         a ver; la puerta la abre el botón del final del perfil. */
      show('auth-screen', false);
    }
    /* Si venías de Google o Apple y la vuelta falló, aquí es donde se
       sabe: sin esto la pantalla de acceso se pinta otra vez como si no
       hubieras hecho nada, sin decir por qué. */
    completePendingSignIn().then((msg) => { if (msg) screens.showAuthError(msg); });
    return;
  }

  show('auth-screen', false);
  document.body.classList.add('signed-in');

  /* El nombre visible sale de Auth, y el perfil público lo necesita.
     Se le pasa al store antes de cargar para que la primera publicación
     ya salga con nombre en vez de con el @usuario a secas. */
  setDisplayName(user.displayName || '');

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

  /* El punto de avisos. No bloquea nada. */
  socialui.refreshNotices().catch(() => {});

  /* A quién he bloqueado, en cuanto hay sesión: hace falta ANTES de
     pintar nada social, porque es lo que decide qué no se enseña. */
  loadMyBlocks().catch(() => {});

  /* Un link de perfil también manda estando dentro, y el onboarding
     espera: quien llega desde una invitación viene a ver a alguien, no
     a configurar su plan lector. */
  if (profileui.openProfileFromHash()) return;

  /* Si llegó por la invitación de alguien y acaba de crear la cuenta,
     se le ofrece seguirla. Ofrecer, no seguir sola. */
  await inviteui.maybeOfferInviter();

  await screens.maybeOnboard();
});

/* Cambiar de link sin recargar (volver atrás, pegar otro) también abre.
   Y también apunta por quién se entró, si aún no hay cuenta: llegar por
   un link y navegar un poco antes de decidirse es lo normal. */
window.addEventListener('hashchange', () => {
  const quien = profileui.openProfileFromHash();
  if (!quien || uid()) return;
  inviteui.rememberInviter(quien);
  /* Y también aquí se aparta la puerta: pegar un link de perfil
     estando en la pantalla de acceso tiene que enseñar el perfil, no
     dejarlo abierto detrás de un formulario. */
  show('auth-screen', false);
});

/* ── SERVICE WORKER ──────────────────────────────────────────── */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

window.addEventListener('beforeunload', () => { flush(); });
