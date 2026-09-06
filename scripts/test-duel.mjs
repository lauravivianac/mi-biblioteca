/* ─────────────────────────────────────────────────────────────
   PRUEBAS DE «¿CUÁL PRIMERO?»

   El grupo que más importa es «SE EXPLICAN LOS DOS LADOS». Un
   veredicto sin porqué no ayuda a decidir: solo cambia quién decide.
   Y esconder los motivos que juegan a favor del perdedor sería vender
   la respuesta en vez de explicarla —justo lo que hace que no te
   fíes la segunda vez—.
   ───────────────────────────────────────────────────────────── */

import {
  compareBooks, densityOf, isHeavy, roomLeft, DENSO,
} from '../src/duel-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

const libro = (o) => ({ status: 'pending', role: '⚓ Ancla', pages: '~300', genre: 'Novela contemporánea', author: 'X', ...o });

const TOCHO = libro({ id: 'tocho', title: 'El Tocho', pages: '~800' });
const LIGERO = libro({ id: 'ligero', title: 'El Ligero', pages: '~180', role: '⚡ Corto', genre: 'Thriller' });
const DENSO_LEIDO = libro({ id: 'denso', title: 'Guerra y Paz', pages: '~1200', genre: 'Clásico universal' });

/* ── LA DENSIDAD, CON LA TABLA DEL PLAN ──────────────────────── */

grupo('NO TODAS LAS PÁGINAS PESAN IGUAL');
const ensayo = libro({ id: 'e', pages: '~300', genre: 'Ensayo / Filosofía' });
const thriller = libro({ id: 't', pages: '~300', genre: 'Thriller' });
ok('un ensayo de 300 pesa más que un thriller de 300',
  densityOf(ensayo) > densityOf(thriller), `${densityOf(ensayo)} vs ${densityOf(thriller)}`);
ok('y es la misma tabla que usa el generador del plan',
  densityOf(thriller) < 300 && densityOf(ensayo) > 300);
igual('sin páginas no revienta: asume unas cuantas', typeof densityOf({}), 'number');

grupo('DE QUÉ VIENES');
ok('un tomo denso se nota', isHeavy(DENSO_LEIDO));
ok('uno ligero no', !isHeavy(LIGERO));
ok('y sin nada previo tampoco', !isHeavy(null));
ok('el umbral está donde dice la constante', DENSO === 500);

/* ── EL CRITERIO DE LA HISTORIA ──────────────────────────────── */

grupo('SI VENGO DE ALGO DENSO, ALGO LIGERO');
const trasDenso = compareBooks(TOCHO, LIGERO, { vengoDe: DENSO_LEIDO, room: 900 });
igual('gana el ligero', trasDenso.ganador.id, 'ligero');
ok('y se dice por qué', trasDenso.aFavor.some((t) => /denso/.test(t)), JSON.stringify(trasDenso.aFavor));
ok('nombrando el libro del que vienes',
  trasDenso.aFavor.some((t) => /Guerra y Paz/.test(t)));

const sinVenirDeNada = compareBooks(TOCHO, LIGERO, { room: 900 });
ok('sin libro anterior, ese motivo no aparece',
  !(sinVenirDeNada?.motivos || []).some((m) => /denso/.test(m.texto)));

const trasLigero = compareBooks(TOCHO, LIGERO, { vengoDe: LIGERO, room: 900 });
ok('y venir de algo ligero tampoco lo dispara',
  !(trasLigero?.motivos || []).some((m) => /denso/.test(m.texto)));

/* ── EL MES QUE QUEDA ────────────────────────────────────────── */

grupo('CUÁNTO MES TE QUEDA');
const aMitadDeMes = compareBooks(TOCHO, LIGERO, { room: 250 });
igual('si solo cabe uno, gana el que cabe', aMitadDeMes.ganador.id, 'ligero');
ok('y lo explica con el número', aMitadDeMes.aFavor.some((t) => /250/.test(t)), JSON.stringify(aMitadDeMes.aFavor));

const anclaVsCorto = compareBooks(
  libro({ id: 'ancla', title: 'Ancla', pages: '~250', role: '⚓ Ancla' }),
  libro({ id: 'corto', title: 'Corto', pages: '~250', role: '⚡ Corto' }),
  { room: 800 },
);
igual('con mes de sobra, el ⚓ Ancla', anclaVsCorto.ganador.id, 'ancla');
ok('y lo dice', anclaVsCorto.aFavor.some((t) => /Ancla/.test(t)));

const apretado = compareBooks(
  libro({ id: 'ancla', title: 'Ancla', pages: '~200', role: '⚓ Ancla' }),
  libro({ id: 'corto', title: 'Corto', pages: '~200', role: '⚡ Corto' }),
  { room: 300 },
);
igual('con el mes apretado, el ⚡ Corto', apretado.ganador.id, 'corto');
ok('y también lo dice', apretado.aFavor.some((t) => /Corto/.test(t)));

grupo('CUÁNTO MES QUEDA DE VERDAD');
const primeroDeMes = roomLeft({ pagesPerDay: 20, today: new Date(2026, 8, 1) });
const finDeMes = roomLeft({ pagesPerDay: 20, today: new Date(2026, 8, 28) });
ok('el día 1 cabe mucho más que el día 28', primeroDeMes > finDeMes * 3, `${primeroDeMes} vs ${finDeMes}`);
ok('y nunca sale cero', roomLeft({ pagesPerDay: 20, today: new Date(2026, 8, 30) }) > 0);

/* ── EL GUSTO DESEMPATA, NO MANDA ────────────────────────────── */

grupo('EL GUSTO VA EL ÚLTIMO');
const gustoPorElTocho = (b) => (b.id === 'tocho'
  ? { score: 100, porque: 'Es de tu género favorito' }
  : { score: 0, porque: null });

const conGusto = compareBooks(TOCHO, LIGERO, { room: 250, taste: gustoPorElTocho });
igual('aunque te encante, el que no cabe en el mes no gana', conGusto.ganador.id, 'ligero');
ok('pero su motivo aparece igual, del lado del perdedor',
  conGusto.enContra.some((t) => /género favorito/.test(t)), JSON.stringify(conGusto.enContra));

const soloGusto = compareBooks(
  libro({ id: 'tocho', title: 'A', pages: '~250' }),
  libro({ id: 'otro', title: 'B', pages: '~250' }),
  { room: 800, taste: gustoPorElTocho },
);
igual('cuando todo lo demás empata, el gusto decide', soloGusto.ganador.id, 'tocho');

ok('una diferencia de gusto pequeña no cuenta',
  compareBooks(
    libro({ id: 'a', title: 'A', pages: '~250' }),
    libro({ id: 'b', title: 'B', pages: '~250' }),
    { room: 800, taste: (x) => ({ score: x.id === 'a' ? 10 : 0 }) },
  ).empate);

/* ── SE EXPLICAN LOS DOS LADOS ───────────────────────────────── */

grupo('UNA COMPARACIÓN HONESTA ADMITE QUE EL OTRO TENÍA ALGO');
/* A es el tocho y está en el plan; B es ligero, que es lo que apetece
   tras Guerra y Paz. Gana B, pero A tenía sus razones. */
const reñido = compareBooks(
  libro({ id: 'a', title: 'A', pages: '~700', role: '⚓ Ancla', month: 'Marzo' }),
  libro({ id: 'b', title: 'B', pages: '~150', role: '⚡ Corto', genre: 'Thriller' }),
  { vengoDe: DENSO_LEIDO, room: 400 },
);
ok('aquí sí hay ganador', !reñido.empate, reñido.resumen);
ok('hay motivos por los dos lados', reñido.aFavor.length > 0 && reñido.enContra.length > 0,
  `a favor ${reñido.aFavor.length}, en contra ${reñido.enContra.length}`);
ok('y los del ganador van primero', reñido.motivos[0].texto === reñido.aFavor[0]);
ok('ninguno sale vacío', reñido.motivos.every((m) => m.texto && m.texto.length > 5));
ok('todo veredicto trae un resumen legible', /^Empieza por /.test(reñido.resumen), reñido.resumen);

/* Y el caso que destapó la prueba anterior: se anulan exactos. */
grupo('DOS EMPATES QUE NO SON EL MISMO EMPATE');
const anulados = compareBooks(
  libro({ id: 'a', title: 'A', pages: '~700', role: '⚓ Ancla', month: 'Marzo' }),
  libro({ id: 'b', title: 'B', pages: '~150', role: '⚡ Corto', genre: 'Thriller' }),
  { vengoDe: DENSO_LEIDO, room: 800 },
);
ok('cuando los argumentos se anulan, sigue siendo empate', anulados.empate);
ok('pero NO se dice «elige por portada»: eso tiraría el razonamiento',
  !/portada/i.test(anulados.resumen), anulados.resumen);
ok('se enseñan las razones de cada uno',
  anulados.porA.length > 0 && anulados.porB.length > 0,
  `A: ${anulados.porA.length}, B: ${anulados.porB.length}`);

grupo('CUANDO DE VERDAD DA IGUAL');
const gemelos = compareBooks(
  libro({ id: 'a', title: 'A' }),
  libro({ id: 'b', title: 'B' }),
  { room: 800 },
);
ok('no se inventa un ganador', gemelos.empate && !gemelos.ganador);
ok('cuando de verdad no hay nada que decir, sí toca la portada',
  /portada/i.test(gemelos.resumen), gemelos.resumen);
ok('y no finge razones que no tiene', gemelos.porA.length === 0 && gemelos.porB.length === 0);
ok('el empate trae las mismas claves que un veredicto, para no tener que mirar `empate`',
  Array.isArray(gemelos.aFavor) && Array.isArray(gemelos.enContra) && typeof gemelos.fuerza === 'number');

grupo('LO QUE NO SE COMPARA');
igual('un libro contra sí mismo, no', compareBooks(TOCHO, TOCHO, {}), null);
igual('sin dos libros, no', compareBooks(TOCHO, null, {}), null);
igual('sin ninguno, tampoco', compareBooks(null, null, {}), null);

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
