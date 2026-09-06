/* Valida que TODOS los temas pasen contraste WCAG AA  ·  historia #79
   Con ocho temas y decenas de combinaciones esto no se revisa a ojo:
   o es automático, o se degrada en cuanto se añada el noveno.

   Uso:  node scripts/check-contrast.mjs
   Sale con código 1 si algún par falla, para poder ponerlo en CI. */

import { THEMES } from '../src/themes.js';

const AA_NORMAL = 4.5;   // texto normal
const AA_LARGE = 3.0;    // texto grande (>=18.66px bold o >=24px)
const AA_UI = 3.0;       // bordes y elementos de interfaz

const hex = (h) => {
  const m = /^#([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) throw new Error(`color no reconocido: ${h}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Canal lineal según WCAG 2.x */
const lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

const ratio = (a, b) => {
  const [l1, l2] = [luminance(hex(a)), luminance(hex(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

/** Mezcla un color con alfa sobre un fondo opaco: así se evalúa lo translúcido de verdad. */
const over = (fg, alpha, bg) => {
  const [f, b] = [hex(fg), hex(bg)];
  const mix = f.map((c, i) => Math.round(c * alpha + b[i] * (1 - alpha)));
  return '#' + mix.map((c) => c.toString(16).padStart(2, '0')).join('');
};

/* Los pares que de verdad aparecen en pantalla. El derivado --muted es
   rgb(text / .5) sobre la superficie, así que se evalúa mezclado. */
const PAIRS = [
  { name: 'texto sobre fondo',        fg: (t) => t['--text'],                      bg: (t) => t['--void'], min: AA_NORMAL },
  { name: 'texto sobre superficie',   fg: (t) => t['--text'],                      bg: (t) => t['--deep'], min: AA_NORMAL },
  { name: 'texto sobre elevada',      fg: (t) => t['--text'],                      bg: (t) => t['--dusk'], min: AA_NORMAL },
  { name: 'atenuado sobre superficie',fg: (t) => over(t['--text'], 0.5, t['--deep']), bg: (t) => t['--deep'], min: AA_LARGE },
  { name: 'acento claro sobre fondo', fg: (t) => t['--lilac'],                     bg: (t) => t['--void'], min: AA_NORMAL },
  { name: 'realce sobre fondo',       fg: (t) => t['--gold'],                      bg: (t) => t['--void'], min: AA_NORMAL },
  { name: 'realce sobre superficie',  fg: (t) => t['--gold'],                      bg: (t) => t['--deep'], min: AA_NORMAL },
  { name: 'realce 2 sobre superficie',fg: (t) => t['--amber'],                     bg: (t) => t['--deep'], min: AA_LARGE },
  { name: 'acento medio sobre fondo', fg: (t) => t['--violet'],                    bg: (t) => t['--void'], min: AA_UI },
  { name: 'borde sobre superficie',   fg: (t) => over(t['--lilac'], 0.3, t['--deep']), bg: (t) => t['--deep'], min: 1.4 },
];

const BASE = THEMES.find((t) => t.id === 'grimorio').tokens;
let failures = 0;

for (const theme of THEMES) {
  const t = { ...BASE, ...theme.tokens };   // un tema puede heredar lo que no redefine
  const rows = [];
  for (const pair of PAIRS) {
    const r = ratio(pair.fg(t), pair.bg(t));
    const ok = r >= pair.min;
    if (!ok) failures++;
    rows.push({ pair: pair.name, ratio: r.toFixed(2), min: pair.min.toFixed(1), ok });
  }
  const bad = rows.filter((r) => !r.ok);
  const mark = bad.length ? '✗' : '✓';
  console.log(`\n${mark} ${theme.emoji} ${theme.name}`);
  for (const r of rows) {
    const flag = r.ok ? ' ' : '✗';
    console.log(`   ${flag} ${r.pair.padEnd(30)} ${r.ratio.padStart(6)} : 1   (mín ${r.min})`);
  }
}

console.log(
  failures
    ? `\n${failures} par(es) por debajo del mínimo AA. Un tema bonito e ilegible no sirve.`
    : `\nTodos los temas pasan contraste AA.`
);
process.exit(failures ? 1 : 0);
