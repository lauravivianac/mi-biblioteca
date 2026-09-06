/* ─────────────────────────────────────────────────────────────
   ARRANQUE
   Une el acceso, los datos por usuaria, el tema y las vistas.
   ───────────────────────────────────────────────────────────── */

import { watchAuth, currentUser } from './auth.js';
import { loadStore, settings, updateSettings, onSave, addBook, flush } from './store.js';
import { applyTheme, localTheme } from './theme-engine.js';
import { seedNewAccount } from './store.js';
import * as views from './views.js';
import * as screens from './screens.js';
import { $, toast, backdropClose, closeSheet } from './ui.js';
import { GENRES, MONTH_ORDER } from './seed.js';

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

/* ── AÑADIR LIBRO ────────────────────────────────────────────── */

function openAdd() {
  const genreSel = $('f-genre');
  if (genreSel && !genreSel.options.length) {
    genreSel.innerHTML = GENRES.map((g) => `<option>${g}</option>`).join('');
  }
  const monthSel = $('f-month');
  if (monthSel && monthSel.options.length <= 1) {
    monthSel.innerHTML = '<option value="">—</option>' + MONTH_ORDER.map((m) => `<option>${m}</option>`).join('');
  }
  $('add-overlay').classList.add('open');
}

function submitAddBook() {
  const title = $('f-title').value.trim();
  const author = $('f-author').value.trim();
  if (!title || !author) { toast('El título y el autor son obligatorios', 'error'); return; }
  addBook({
    title, author,
    genre: $('f-genre').value,
    year: parseInt($('f-year').value, 10) || null,
    month: $('f-month').value || null,
    pages: $('f-pages').value.trim() || '—',
    role: $('f-role').value,
  });
  closeSheet('add-overlay');
  ['f-title', 'f-author', 'f-pages'].forEach((id) => { $(id).value = ''; });
  views.refreshAll();
  toast('Libro añadido');
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
Object.assign(window, {
  nav, openAdd, submitAddBook,
  closeAdd: (e) => backdropClose(e, 'add-overlay'),
  closeStore: (e) => backdropClose(e, 'store-overlay'),
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
