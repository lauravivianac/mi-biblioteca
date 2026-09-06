/* ─────────────────────────────────────────────────────────────
   MOTOR DE TEMAS  ·  historias #75 y #78

   Aplicar un tema = escribir sus tokens en :root. Nada más.
   Ninguna regla de CSS sabe que los temas existen.
   ───────────────────────────────────────────────────────────── */

import { THEMES, FONT_SETS, DEFAULT_THEME, byId } from './themes.js';

const LS_KEY = 'bib_theme';
const loadedFonts = new Set();

/** Carga las tipografías de un tema, y solo cuando ese tema se usa. */
function ensureFonts(theme) {
  const pending = theme.fonts.filter((f) => !loadedFonts.has(f));
  if (!pending.length) return;
  pending.forEach((f) => loadedFonts.add(f));
  const families = pending.map((f) => `family=${FONT_SETS[f]}`).join('&');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}

/**
 * Escribe los tokens en :root.
 * Un tema incompleto se completa con Grimorio en vez de romperse,
 * así que añadir un token nuevo no rompe los siete temas viejos.
 */
export function applyTheme(id, { persistLocal = true } = {}) {
  const theme = byId(id);
  const base = byId(DEFAULT_THEME).tokens;
  const root = document.documentElement;

  ensureFonts(theme);

  // Limpia lo que el tema anterior hubiera puesto y no esté en este
  for (const key of Object.keys(base)) root.style.removeProperty(key);
  for (const t of THEMES) for (const key of Object.keys(t.tokens)) root.style.removeProperty(key);

  const tokens = { ...base, ...theme.tokens };
  for (const [key, value] of Object.entries(tokens)) root.style.setProperty(key, value);

  root.dataset.theme = theme.id;

  // La barra de estado del móvil también debe seguir al tema
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tokens['--void']);

  if (persistLocal) {
    try {
      localStorage.setItem(LS_KEY, theme.id);
      /* Instantánea mínima para pintar el fondo correcto ANTES de que
         cargue el módulo. Sin esto, la app aparece medio segundo con el
         tema equivocado, que es el detalle que delata una implementación
         floja (criterio de la historia #78). */
      localStorage.setItem('bib_theme_snap', JSON.stringify({
        '--void': tokens['--void'], '--deep': tokens['--deep'],
        '--text': tokens['--text'], '--gold': tokens['--gold'],
        '--lilac': tokens['--lilac'], '--bg-wash': tokens['--bg-wash'] || '',
      }));
    } catch {}
  }
  return theme;
}

/** El tema guardado en este dispositivo. Se lee antes del primer pintado. */
export function localTheme() {
  try { return localStorage.getItem(LS_KEY) || DEFAULT_THEME; } catch { return DEFAULT_THEME; }
}

/**
 * Vista previa: aplica sin guardar, para poder descartar.
 * Devuelve una función que restaura lo que había.
 */
export function previewTheme(id) {
  const previous = document.documentElement.dataset.theme || localTheme();
  applyTheme(id, { persistLocal: false });
  return () => applyTheme(previous, { persistLocal: false });
}

/**
 * Qué temas puede usar esta persona.
 * Los bloqueados NO se ocultan: saber qué falta es el incentivo (#80).
 */
export function themeAvailability(achievements = []) {
  return THEMES.map((t) => ({
    ...t,
    locked: !!t.unlock && !achievements.includes(t.unlock.achievement),
  }));
}
