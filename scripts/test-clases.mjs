/* ─────────────────────────────────────────────────────────────
   CADA CLASE QUE SE USA, ¿TIENE ESTILO?

     npm run test:clases

   Recorre `index.html` y todos los `src/*.js`, saca cada clase que el
   marcado usa, y comprueba que exista al menos UNA regla de CSS que la
   nombre.

   POR QUÉ EXISTE. En el PR #135 desapareció el bloque entero de
   `.year-row` y `.year-btn`, y con él el selector de años del plan:
   los tres años pasaron de estar en una fila a apilarse uno debajo de
   otro. Nadie lo escribió: al reemplazar un trozo de CSS «desde este
   comentario hasta ese otro», el selector de años estaba en medio y se
   fue con el cambio.

   Y SE FUSIONÓ. Las capturas de aquella tanda eran de la estantería
   —que no tiene años— y del final de la lista, así que la pantalla
   donde se veía era justo la que no se miró.

   Esto no habría hecho falta si el CSS se tocara a mano. Se toca con
   scripts, y un script que reemplaza un rango se lleva por delante lo
   que haya dentro sin decir nada. Esta prueba es el que lo dice.
   ───────────────────────────────────────────────────────────── */

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── LO QUE EL MARCADO USA ───────────────────────────────────── */

const html = await readFile(join(raiz, 'index.html'), 'utf8');
const ficheros = (await readdir(join(raiz, 'src'))).filter((f) => f.endsWith('.js'));
const fuentes = await Promise.all(
  ficheros.map(async (f) => [f, await readFile(join(raiz, 'src', f), 'utf8')]),
);

const usadas = new Map();   // clase → dónde se usa
const anota = (clase, donde) => {
  if (!clase || /[${}`]/.test(clase)) return;   // interpolada: no se puede saber
  if (!usadas.has(clase)) usadas.set(clase, donde);
};

for (const [donde, texto] of [['index.html', html], ...fuentes]) {
  for (const m of texto.matchAll(/class="([^"${}`]+)"/g)) {
    for (const c of m[1].trim().split(/\s+/)) anota(c, donde);
  }
  /* `classList.add('x')` y `classList.contains('x')` también cuentan:
     una clase que solo aparece al pulsar algo es la más fácil de
     quedarse sin estilo sin que se note. */
  for (const m of texto.matchAll(/classList\.(?:add|toggle|contains|remove)\('([\w-]+)'/g)) {
    anota(m[1], donde);
  }
}

/* ── LO QUE EL CSS DEFINE ────────────────────────────────────── */

const hojas = (await readdir(join(raiz, 'styles'))).filter((f) => f.endsWith('.css'));
const css = (await Promise.all(hojas.map((f) => readFile(join(raiz, 'styles', f), 'utf8')))).join('\n');
/* Sin comentarios: `/* .foo … *\/` no es una regla, y contarlo como
   tal es exactamente cómo esta prueba dejaría de servir. */
const cssLimpio = css.replace(/\/\*[\s\S]*?\*\//g, '');
const definidas = new Set([...cssLimpio.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]));

/* ── LAS QUE NO SON DE ESTILO ────────────────────────────────── */

const SIN_ESTILO = new Set([
  /* Ganchos de comportamiento, no de aspecto. */
  'signed-in', 'visible', 'open', 'active', 'done', 'on', 'locked', 'read',
  'full', 'mini',
  /* Grupos del SVG de la mascota: nombran partes del dibujo para poder
     leerlo, y pintan con atributos, no con CSS. */
  'pet-eyes', 'pet-book',
]);

const huerfanas = [...usadas]
  .filter(([c]) => !definidas.has(c) && !SIN_ESTILO.has(c))
  .sort();

/* ── RESULTADO ───────────────────────────────────────────────── */

console.log(`\n  ${usadas.size} clases en el marcado · ${definidas.size} con regla en el CSS`);

if (!huerfanas.length) {
  console.log('\n  ✓ Todas las clases que se usan tienen estilo.\n');
  process.exit(0);
}

console.log(`\n  ${huerfanas.length} CLASE(S) SIN NINGUNA REGLA:\n`);
for (const [clase, donde] of huerfanas) {
  console.log(`  ✗ .${clase.padEnd(28)} se usa en ${donde}`);
}
console.log('\n  O le falta el estilo, o el estilo se borró sin querer.\n');
process.exit(1);
