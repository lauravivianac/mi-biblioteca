/* ─────────────────────────────────────────────────────────────
   PRUEBAS DE «QUIEN LEYÓ ESTO TAMBIÉN LEYÓ»

   El grupo que más importa es «PREFIERE NO APARECER». La nota de la
   historia dice que con poca gente las sugerencias son absurdas y que
   una mala primera impresión cuesta más que no tener la sección. Así
   que lo que se prueba con más cuidado no es que recomiende bien, sino
   que SE CALLE cuando no tiene datos.
   ───────────────────────────────────────────────────────────── */

import {
  MIN_LECTORAS, MIN_COINCIDENCIAS, MAX_SUGERENCIAS,
  afinidad, peso, alsoRead, porQueTexto, encabezado,
} from '../src/alsoread-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

/** Una lectora que leyó `libros` y puntuó `valorados`. */
const lectora = (uid, libros, valorados = {}) => ({ uid, librosLeidos: libros, valorados });

/* ── PREFIERE NO APARECER ────────────────────────────────────── */

grupo('CON POCA GENTE, LA SECCIÓN NO APARECE');
{
  const dos = [lectora('a', ['x', 'p']), lectora('b', ['x', 'p'])];
  const r = alsoRead({ bookId: 'x', lectoras: dos });
  ok('con dos lectoras, nada', !r.suficiente);
  igual('y ni un libro', r.libros, []);
  ok(`el mínimo son ${MIN_LECTORAS}`, MIN_LECTORAS === 3);

  const tres = [...dos, lectora('c', ['x', 'p'])];
  ok('con tres, ya sí', alsoRead({ bookId: 'x', lectoras: tres }).suficiente);
}

grupo('UN LIBRO QUE SOLO COINCIDE UNA VEZ ES CASUALIDAD');
{
  const gente = [
    lectora('a', ['x', 'p', 'raro1']),
    lectora('b', ['x', 'p', 'raro2']),
    lectora('c', ['x', 'p', 'raro3']),
  ];
  const r = alsoRead({ bookId: 'x', lectoras: gente });
  igual('solo sale el que repiten', r.libros.map((l) => l.id), ['p']);
  ok('los que aparecen una sola vez se caen', !r.libros.some((l) => l.id.startsWith('raro')));
  ok(`el mínimo de coincidencias son ${MIN_COINCIDENCIAS}`, MIN_COINCIDENCIAS === 2);
}

grupo('SIN NADA QUE SUGERIR, TAMPOCO APARECE');
{
  /* Tres lectoras, pero ninguna leyó nada más en común. */
  const r = alsoRead({
    bookId: 'x',
    lectoras: [lectora('a', ['x', 'u1']), lectora('b', ['x', 'u2']), lectora('c', ['x', 'u3'])],
  });
  ok('no hay sección', !r.suficiente);
  igual('ni libros', r.libros, []);
}

grupo('SIN LIBRO, SIN NADA');
ok('sin bookId no revienta', !alsoRead({}).suficiente);
igual('ni devuelve libros', alsoRead({}).libros, []);
ok('sin lectoras tampoco', !alsoRead({ bookId: 'x' }).suficiente);

/* ── QUIÉN CUENTA ────────────────────────────────────────────── */

grupo('SOLO CUENTA QUIEN LEYÓ ESTE LIBRO');
{
  const r = alsoRead({
    bookId: 'x',
    lectoras: [
      lectora('a', ['x', 'p', 'q']),
      lectora('b', ['x', 'p', 'q']),
      lectora('c', ['x', 'p', 'q']),
      lectora('d', ['otro', 'zzz']),        // esta no leyó «x»
    ],
  });
  ok('quien no lo leyó no entra en la cuenta', r.lectoras === 3);
  ok('y su libro no se sugiere', !r.libros.some((l) => l.id === 'zzz'));
}

grupo('YO NO CUENTO COMO LECTORA DE MI PROPIO LIBRO');
{
  const gente = [lectora('yo', ['x', 'p']), lectora('a', ['x', 'p']), lectora('b', ['x', 'p'])];
  ok('conmigo dentro serían tres', alsoRead({ bookId: 'x', lectoras: gente }).suficiente);
  ok('quitándome, dos, y no llega al mínimo',
    !alsoRead({ bookId: 'x', lectoras: gente, miUid: 'yo' }).suficiente);
}

grupo('NO SE SUGIERE LO QUE YA TENGO');
{
  const gente = [
    lectora('a', ['x', 'p', 'q']), lectora('b', ['x', 'p', 'q']), lectora('c', ['x', 'p', 'q']),
  ];
  const r = alsoRead({ bookId: 'x', lectoras: gente, excluir: ['p'] });
  igual('el que ya tengo no sale', r.libros.map((l) => l.id), ['q']);
  ok('ni el libro que estoy mirando',
    !alsoRead({ bookId: 'x', lectoras: gente }).libros.some((l) => l.id === 'x'));
}

/* ── VALORAR PARECIDO PESA MÁS ───────────────────────────────── */

grupo('CUÁNTO SE PARECEN DOS FORMAS DE PUNTUAR');
igual('idénticas, 1', afinidad({ a: 5, b: 3 }, { a: 5, b: 3 }), 1);
igual('opuestas en la escala, 0', afinidad({ a: 5 }, { a: 1 }), 0);
ok('a medias, a medias', afinidad({ a: 5 }, { a: 3 }) === 0.5);
ok('solo se miran los libros que las dos leyeron',
  afinidad({ a: 5, z: 1 }, { a: 5 }) === 1);
ok('SIN LIBROS EN COMÚN devuelve null, no 0 — «no lo sé» no es «no se parecen»',
  afinidad({ a: 5 }, { b: 5 }) === null);
ok('sin datos por ningún lado, null', afinidad({}, {}) === null);

grupo('EL PESO DE CADA LECTORA');
ok('quien valora igual pesa lo máximo', peso(1) === 1);
ok('quien valora al revés pesa lo mínimo', peso(0) === 0.25);
ok('quien no tiene puntuaciones en común pesa medio: leer lo mismo ya es algo',
  peso(null) === 0.5);
ok('y pesa más que quien valora al revés', peso(null) > peso(0));
ok('pero menos que quien valora igual', peso(null) < peso(1));

grupo('QUIEN VALORA COMO YO MANDA EN EL ORDEN');
{
  /* Dos libros con las mismas coincidencias. El que leen quienes
     puntúan como yo tiene que salir primero. */
  const mias = { comun: 5 };
  const gente = [
    // estas tres puntúan como yo y leyeron «bueno»
    lectora('a', ['x', 'comun', 'bueno'], { comun: 5 }),
    lectora('b', ['x', 'comun', 'bueno'], { comun: 5 }),
    lectora('c', ['x', 'comun', 'bueno'], { comun: 5 }),
    // estas tres puntúan al revés y leyeron «otro»
    lectora('d', ['x', 'comun', 'otro'], { comun: 1 }),
    lectora('e', ['x', 'comun', 'otro'], { comun: 1 }),
    lectora('f', ['x', 'comun', 'otro'], { comun: 1 }),
  ];
  const r = alsoRead({ bookId: 'x', lectoras: gente, mias, excluir: ['comun'] });
  ok('el de quienes puntúan como yo va primero', r.libros[0].id === 'bueno');
  ok('el otro sale, pero detrás', r.libros[1].id === 'otro');
  ok('y con menos puntuación', r.libros[0].punto > r.libros[1].punto);
  ok('aunque los leyó la misma cantidad de gente',
    r.libros[0].lectoras === r.libros[1].lectoras);
}

grupo('EL TOPE');
{
  const muchos = Array.from({ length: 20 }, (_, i) => `l${i}`);
  const gente = [
    lectora('a', ['x', ...muchos]), lectora('b', ['x', ...muchos]), lectora('c', ['x', ...muchos]),
  ];
  ok(`no se enseñan más de ${MAX_SUGERENCIAS}`,
    alsoRead({ bookId: 'x', lectoras: gente }).libros.length === MAX_SUGERENCIAS);
}

/* ── LOS TEXTOS ──────────────────────────────────────────────── */

grupo('LO QUE SE LEE EN PANTALLA');
ok('en singular', porQueTexto(1) === 'Lo leyó 1 de ellas');
ok('en plural', porQueTexto(4) === 'Lo leyeron 4 de ellas');
ok('el encabezado dice de dónde sale', encabezado(5).includes('5 lectoras'));
ok('y también en singular', encabezado(1).includes('1 lectora'));

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
