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

/* ── LA ENCUADERNACIÓN ────────────────────────────────────────
   Las ocho telas de un lomo no son decoración: a cada género le toca
   siempre la misma, así que la estantería se lee de un vistazo. Eso
   solo funciona si LAS OCHO SE DISTINGUEN ENTRE SÍ y del fondo, y si
   el título estampado se lee sobre cualquiera de ellas.

   Con diez temas eso son ochenta telas. A ojo no se revisa: o es
   automático, o el undécimo tema sale con lomos que no se ven y nadie
   se entera hasta que alguien abre la app.

   OJO CON LA MEDIDA. Para «¿se distinguen estos dos colores?» NO sirve
   el contraste de WCAG: solo mide claridad, así que a un burdeos y a un
   verde botella de la misma claridad les da 1.00 y los declara
   idénticos, cuando a la vista no se parecen en nada. Aquí se usa la
   distancia de color de verdad (ΔE sobre CIE Lab).

   Para el título estampado sí se usa WCAG, porque eso es texto. */

const D65 = [0.95047, 1, 1.08883];

/** sRGB → Lab, que es donde las distancias se parecen a lo que ve un ojo. */
function lab(hexColor) {
  const [r, g, b] = hex(hexColor).map(lin);
  let [x, y, z] = [
    (0.4124 * r + 0.3576 * g + 0.1805 * b) / D65[0],
    (0.2126 * r + 0.7152 * g + 0.0722 * b) / D65[1],
    (0.0193 * r + 0.1192 * g + 0.9505 * b) / D65[2],
  ].map((v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116));
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** ΔE CIE76. Por debajo de ~10 son dos versiones del mismo color. */
const deltaE = (a, b) => {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

/* Dos umbrales distintos porque son dos preguntas distintas.

   ENTRE TELAS · ΔE 5. Son manchas grandes y pegadas: a ese tamaño un
   escalón de 5 ya se ve como «otro color». Pedir 10 obligaría a los
   temas sin color —Obsidiana, Máquina— a recorrer del negro al blanco
   para colocar ocho grises, y ahí la falta de color es la gracia, no
   un defecto que arreglar.

   TELA CONTRA FONDO · ΔE 8. Aquí sí hace falta más: si el lomo no se
   despega de la página no parece un libro, parece un hueco. */
const DE_TELAS = 5;
const DE_FONDO = 8;
const TELAS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `--tela-${n}`);

/** Resuelve `var(--x)` contra los tokens del tema. */
const resolver = (valor, t) => {
  const m = /^var\(\s*(--[\w-]+)\s*\)$/.exec(String(valor).trim());
  return m ? resolver(t[m[1]], t) : valor;
};

function revisarEncuadernacion(t) {
  const fallos = [];
  const telas = TELAS.map((k) => resolver(t[k], t));
  const fondo = t['--void'];

  telas.forEach((tela, i) => {
    const d = deltaE(tela, fondo);
    if (d < DE_FONDO) fallos.push(`la tela ${i + 1} (${tela}) se pierde en el fondo · ΔE ${d.toFixed(1)}`);
    /* Cada tela trae SU estampado: oro sobre las oscuras, oscuro sobre
       las claras. Se comprueba el que de verdad se va a usar. */
    const tinta = resolver(t[`--tela-${i + 1}-tinta`] ?? t['--lomo-filete'] ?? 'var(--gold)', t);
    const f = ratio(tinta, tela);
    if (f < AA_UI) fallos.push(`el estampado no se lee sobre la tela ${i + 1} · ${f.toFixed(2)} : 1`);
  });

  /* Dos telas iguales son una tela: dos géneros que se confunden. */
  for (let i = 0; i < telas.length; i += 1) {
    for (let j = i + 1; j < telas.length; j += 1) {
      const d = deltaE(telas[i], telas[j]);
      if (d < DE_TELAS) fallos.push(`las telas ${i + 1} y ${j + 1} no se distinguen · ΔE ${d.toFixed(1)}`);
    }
  }
  return fallos;
}

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
  const encuadernacion = revisarEncuadernacion(t);
  failures += encuadernacion.length;

  const bad = rows.filter((r) => !r.ok);
  const mark = bad.length || encuadernacion.length ? '✗' : '✓';
  console.log(`\n${mark} ${theme.emoji} ${theme.name}`);
  for (const r of rows) {
    const flag = r.ok ? ' ' : '✗';
    console.log(`   ${flag} ${r.pair.padEnd(30)} ${r.ratio.padStart(6)} : 1   (mín ${r.min})`);
  }
  if (encuadernacion.length) {
    for (const f of encuadernacion) console.log(`   ✗ encuadernación · ${f}`);
  } else {
    console.log(`     encuadernación · las ocho telas se distinguen y el estampado se lee`);
  }
}

console.log(
  failures
    ? `\n${failures} par(es) por debajo del mínimo AA. Un tema bonito e ilegible no sirve.`
    : `\nTodos los temas pasan contraste AA.`
);
process.exit(failures ? 1 : 0);
