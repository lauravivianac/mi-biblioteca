/* ─────────────────────────────────────────────────────────────
   PRUEBAS DE LAS SUGERENCIAS AL TERMINAR UN LIBRO

   El criterio que más pruebas tiene es «si valoré mal el libro, se
   evita sugerir más de lo mismo». Es el más fácil de romper sin
   enterarse: la tentación al escribir esto es tratar todo lo leído
   como señal positiva, y entonces terminar algo que odiaste te trae
   cinco libros iguales.
   ───────────────────────────────────────────────────────────── */

import {
  affinity, scoreOwn, suggestOwn, promptFor, dismissKey, pagesOf,
} from '../src/suggest-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

/* ── LA BIBLIOTECA DE PRUEBA ─────────────────────────────────── */

const RULFO_1 = { id: 'r1', title: 'Pedro Páramo', author: 'Juan Rulfo', genre: 'Latinoamérica', pages: '~124', status: 'read' };
const RULFO_2 = { id: 'r2', title: 'El llano en llamas', author: 'Juan Rulfo', genre: 'Latinoamérica', pages: '~150', status: 'pending' };
const OTRO_LATAM = { id: 'l1', title: 'La casa de los espíritus', author: 'Isabel Allende', genre: 'Latinoamérica', pages: '~450', status: 'pending' };
const TERROR = { id: 't1', title: 'It', author: 'Stephen King', genre: 'Terror / Misterio', pages: '~1200', status: 'pending' };
const CORTO = { id: 'c1', title: 'El principito', author: 'Saint-Exupéry', genre: 'Clásico universal', pages: '~96', status: 'pending' };
const EN_PLAN = { id: 'p1', title: 'Rayuela', author: 'Cortázar', genre: 'Latinoamérica', pages: '~600', status: 'pending', month: 'Julio' };
const DESEADO = { id: 'd1', title: 'Ficciones', author: 'Borges', genre: 'Clásico universal', pages: '~200', status: 'wished' };
const LEYENDO = { id: 'y1', title: 'Otro más', author: 'X', genre: 'Thriller', pages: '~300', status: 'reading' };
const ABANDONADO = { id: 'a1', title: 'Uno malo', author: 'Y', genre: 'Thriller', pages: '~300', status: 'abandoned' };

const TODOS = [RULFO_1, RULFO_2, OTRO_LATAM, TERROR, CORTO, EN_PLAN, DESEADO, LEYENDO, ABANDONADO];

/* ── LA AFINIDAD ─────────────────────────────────────────────── */

grupo('LO QUE DICEN LAS ESTRELLAS');
ok('cinco estrellas: más de lo mismo, sí', affinity(5).genre > 0 && affinity(5).author > 0);
ok('cuatro también, con menos fuerza', affinity(4).author > 0 && affinity(4).author < affinity(5).author);
ok('tres es neutro', affinity(3).genre === 0 && affinity(3).author === 0);
ok('dos: aléjate', affinity(2).genre < 0 && affinity(2).author < 0);
ok('una: aléjate más', affinity(1).author < affinity(2).author);
ok('el autor pesa más que el género, en los dos sentidos',
  affinity(5).author > affinity(5).genre && affinity(1).author < affinity(1).genre);

/* ── EL CRITERIO QUE MÁS IMPORTA ─────────────────────────────── */

grupo('SI LO VALORÉ MAL, NO ME DES MÁS DE LO MISMO');

const malas = suggestOwn(TODOS, { finished: RULFO_1, rating: 1 });
ok('el otro libro del mismo autor NO aparece',
  !malas.some((b) => b.id === 'r2'), `salió: ${malas.map((b) => b.title).join(', ')}`);
ok('y aparecen cosas de otros géneros', malas.some((b) => b.genre !== 'Latinoamérica'));

const buenas = suggestOwn(TODOS, { finished: RULFO_1, rating: 5 });
igual('con cinco estrellas, el mismo autor va primero', buenas[0].id, 'r2');
ok('y lo dice', /mismo autor/i.test(buenas[0].porque), buenas[0].porque);

const dosEstrellas = suggestOwn(TODOS, { finished: RULFO_1, rating: 2 });
ok('con dos estrellas tampoco sale el mismo autor', !dosEstrellas.some((b) => b.id === 'r2'));

/* ── QUÉ SE PUEDE PROPONER ───────────────────────────────────── */

grupo('QUÉ ENTRA Y QUÉ NO');
const s = suggestOwn(TODOS, { finished: RULFO_1, rating: 4, limit: 9 });
ok('no propone lo que ya leíste', !s.some((b) => b.status === 'read'));
ok('ni lo que estás leyendo', !s.some((b) => b.id === 'y1'));
ok('ni lo que abandonaste', !s.some((b) => b.id === 'a1'));
ok('ni el libro que acabas de terminar', !s.some((b) => b.id === RULFO_1.id));
ok('sí propone lo deseado', s.some((b) => b.id === 'd1'));
ok('y lo pendiente', s.some((b) => b.id === 't1'));

igual('devuelve cuatro por defecto', suggestOwn(TODOS, { finished: RULFO_1, rating: 4 }).length, 4);
igual('sin libros no revienta', suggestOwn([], { finished: RULFO_1, rating: 5 }), []);
igual('sin libro terminado tampoco', suggestOwn(TODOS, {}).length, 4);

/* ── DESCARTAR PARA SIEMPRE ──────────────────────────────────── */

grupo('DESCARTAR UNA SUGERENCIA');
const conDescarte = suggestOwn(TODOS, {
  finished: RULFO_1, rating: 5, dismissed: [dismissKey(RULFO_2)],
});
ok('la descartada no vuelve', !conDescarte.some((b) => b.id === 'r2'));
ok('las demás siguen', conDescarte.length > 0);
igual('la llave no distingue tildes ni mayúsculas',
  dismissKey({ title: 'Pedro Páramo', author: 'Juan Rulfo' }),
  dismissKey({ title: 'PEDRO PARAMO', author: 'juan rulfo' }));

/* ── DETALLES QUE SE NOTAN AL USARLA ─────────────────────────── */

grupo('DESPUÉS DE UN TOMO LARGO, ALGO CORTO');
const trasLargo = suggestOwn([CORTO, TERROR], { finished: { ...TERROR, id: 'otro', pages: '~900' }, rating: 3 });
igual('el corto va primero', trasLargo[0].id, 'c1');
ok('y lo explica', /corto/i.test(trasLargo[0].porque), trasLargo[0].porque);

grupo('LO QUE YA ESTÁ EN EL PLAN PESA');
const conPlan = suggestOwn([EN_PLAN, TERROR], { finished: null, rating: 0 });
igual('el del plan va primero', conPlan[0].id, 'p1');
ok('y dice de qué mes', /Julio/.test(conPlan[0].porque), conPlan[0].porque);

grupo('TODA SUGERENCIA SE EXPLICA');
ok('ninguna sale sin porqué',
  suggestOwn(TODOS, { finished: RULFO_1, rating: 4, limit: 9 }).every((b) => b.porque && b.porque.length > 3));

/* ── EL GUSTO GENERAL, DE FONDO  ·  historia #62 ─────────────── */

grupo('LO QUE SE SABE DE TU GUSTO DESEMPATA, NO DECIDE');

/* Un gusto que empuja fuerte hacia el terror. */
const gustoTerror = (b) => (b.genre === 'Terror / Misterio'
  ? { score: 60, porque: 'Terror es lo que más lees' }
  : { score: 0, porque: null });

const sinGusto = suggestOwn(TODOS, { finished: RULFO_1, rating: 5, limit: 9 });
const conGusto = suggestOwn(TODOS, { finished: RULFO_1, rating: 5, limit: 9, taste: gustoTerror });

igual('el libro que acabas de terminar SIGUE mandando: el mismo autor va primero',
  conGusto[0].id, 'r2');
ok('pero el género que te encanta sube en la lista',
  conGusto.findIndex((b) => b.id === 't1') < sinGusto.findIndex((b) => b.id === 't1'),
  `con gusto ${conGusto.findIndex((b) => b.id === 't1')}, sin gusto ${sinGusto.findIndex((b) => b.id === 't1')}`);
ok('y con cuatro huecos, entra en la lista corta cuando antes no entraba',
  suggestOwn(TODOS, { finished: RULFO_1, rating: 5, taste: gustoTerror }).some((b) => b.id === 't1')
  && !suggestOwn(TODOS, { finished: RULFO_1, rating: 5 }).some((b) => b.id === 't1'));

const conPorque = suggestOwn([TERROR], { finished: null, rating: 0, taste: gustoTerror });
igual('el porqué del gusto sustituye al genérico «de tus pendientes»',
  conPorque[0].porque, 'Terror es lo que más lees');

const conAmbos = suggestOwn([RULFO_2], { finished: RULFO_1, rating: 5, taste: () => ({ score: 90, porque: 'Del perfil' }) });
igual('pero no pisa un porqué que sí explicaba algo',
  conAmbos[0].porque, 'Del mismo autor que Pedro Páramo');

ok('un perfil que devuelve basura no rompe nada',
  suggestOwn(TODOS, { finished: RULFO_1, rating: 4, taste: () => null }).length === 4);

/* ── LO QUE SE LE PIDE AL AGENTE ─────────────────────────────── */

grupo('EL ENCARGO AL AGENTE');
const bueno = promptFor({ finished: RULFO_1, rating: 5, pending: [TERROR], read: [] });
ok('dice qué terminaste y con cuántas estrellas', /Pedro Páramo/.test(bueno) && /5 de 5/.test(bueno));
ok('y que te gustó', /gustó mucho/i.test(bueno));
ok('avisa de lo que ya tienes', /no los repitas/i.test(bueno) && /It/.test(bueno));

const malo = promptFor({ finished: RULFO_1, rating: 1, pending: [] });
ok('con una estrella le pide alejarse', /aléjate/i.test(malo));
ok('y no le dice que te gustó', !/gustó mucho/i.test(malo));

const neutro = promptFor({ finished: RULFO_1, rating: 3, pending: [] });
ok('con tres estrellas no empuja en ninguna dirección',
  !/aléjate/i.test(neutro) && !/gustó mucho/i.test(neutro));

igual('sin nada que decir, no dice nada', promptFor({}), '');

/* ── PÁGINAS ─────────────────────────────────────────────────── */

grupo('LAS PÁGINAS APROXIMADAS');
igual('«~320» son 320', pagesOf('~320'), 320);
igual('«—» no es un número', pagesOf('—'), null);
igual('vacío tampoco', pagesOf(''), null);

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
