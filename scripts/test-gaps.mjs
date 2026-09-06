/* ─────────────────────────────────────────────────────────────
   PRUEBAS DE LOS HUECOS DEL PLAN

   Dos grupos mandan aquí:

     · «LA FORMA DEL HUECO MANDA SOBRE EL GUSTO» — es la tentación
       obvia al juntar esto con el motor de #62: ordenar por lo que te
       gusta y ya. Pero un hueco tiene tamaño, mes y vecinos, y un
       libro que te encanta pero no cabe sigue sin caber.

     · «EL MISMO CRITERIO QUE EL GENERADOR» — la nota de la historia lo
       pide expresamente. Si la app dice que el terror va en octubre al
       repartir el año, tiene que decir lo mismo al rellenar un mes.
   ───────────────────────────────────────────────────────────── */

import {
  findGaps, fillableGaps, candidatesForGap, nearbyGenres, describeGap,
} from '../src/gaps-core.js';
import { SEASON } from '../src/plan-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

const AÑO = 2026;
const libro = (o) => ({ status: 'pending', role: '⚓ Ancla', pages: '~300', genre: 'Novela contemporánea', ...o });

/* Un plan con: enero lleno, febrero con un tocho, marzo con un corto
   y sitio de sobra, y el resto vacío. */
const PLAN = [
  libro({ id: 'e1', title: 'De enero', year: AÑO, month: 'Enero', pages: '~500', status: 'read' }),
  libro({ id: 'f1', title: 'El tocho', year: AÑO, month: 'Febrero', pages: '~900' }),
  libro({ id: 'm1', title: 'Cortito', year: AÑO, month: 'Marzo', pages: '~120', role: '⚡ Corto' }),
];

const gaps = findGaps(PLAN, { year: AÑO, capacidad: 600 });
const mes = (n) => gaps.find((g) => g.month === n);

/* ── ENCONTRAR LOS HUECOS ────────────────────────────────────── */

grupo('QUÉ LE FALTA A CADA MES');
igual('siempre se miran los doce meses', gaps.length, 12);
ok('un mes sin nada es un hueco', mes('Junio').vacio && mes('Junio').hueco);
ok('y lo que le falta es un ancla', mes('Junio').necesita === 'ancla');

ok('un mes con un tocho NO tiene hueco, aunque solo tenga un libro',
  !mes('Febrero').hueco, `libre: ${mes('Febrero').libre}`);
ok('la capacidad manda sobre el número de libros: es lo que hace el generador',
  mes('Febrero').libros.length === 1 && !mes('Febrero').hueco);

ok('un mes con un corto y sitio de sobra sí tiene hueco', mes('Marzo').hueco);
igual('y lo que le falta es un ancla, porque no la tiene', mes('Marzo').necesita, 'ancla');
igual('marzo tiene sitio para unas 480 páginas', mes('Marzo').libre, 480);

const conAncla = findGaps([libro({ id: 'x', year: AÑO, month: 'Abril', pages: '~200' })], { year: AÑO, capacidad: 600 });
igual('con ancla y sitio libre, lo que falta es un corto',
  conAncla.find((g) => g.month === 'Abril').necesita, 'corto');

grupo('LOS MESES QUE YA PASARON NO SON HUECOS');
const conPasado = findGaps(PLAN, { year: AÑO, capacidad: 600, desdeMes: 'Septiembre' });
ok('junio ya pasó', conPasado.find((g) => g.month === 'Junio').pasado);
ok('y no se ofrece para llenar',
  !fillableGaps(conPasado).some((g) => g.month === 'Junio'));
ok('octubre sí', fillableGaps(conPasado).some((g) => g.month === 'Octubre'));
ok('sin mes de corte, todos cuentan', fillableGaps(gaps).length > 8);

/* ── EL MISMO CRITERIO QUE EL GENERADOR ──────────────────────── */

grupo('LA TEMPORADA, IGUAL QUE AL REPARTIR EL AÑO');
ok('octubre es de terror en la tabla compartida',
  SEASON.Octubre.includes('Terror / Misterio'));

const paraOctubre = candidatesForGap([
  libro({ id: 'terror', title: 'It', genre: 'Terror / Misterio', pages: '~600' }),
  libro({ id: 'otro', title: 'Otro', genre: 'Novela contemporánea', pages: '~600' }),
], mes('Octubre'));
igual('el de terror va primero en octubre', paraOctubre[0].id, 'terror');
ok('y lo dice', /encaja con Octubre/.test(paraOctubre[0].porque), paraOctubre[0].porque);

const paraJunio = candidatesForGap([
  libro({ id: 'terror', title: 'It', genre: 'Terror / Misterio', pages: '~600' }),
  libro({ id: 'aventura', title: 'Aventura', genre: 'Aventura', pages: '~600' }),
], mes('Junio'));
igual('en junio manda la aventura, no el terror', paraJunio[0].id, 'aventura');

grupo('NO CUATRO THRILLERS SEGUIDOS');
const vecinos = ['Thriller'];
const conRepeticion = candidatesForGap([
  libro({ id: 'th', genre: 'Thriller', pages: '~500' }),
  libro({ id: 'la', genre: 'Latinoamérica', pages: '~500' }),
], mes('Junio'), { generosCerca: vecinos });
igual('el que repite género con los vecinos baja', conRepeticion[0].id, 'la');
ok('y se dice por qué baja el otro',
  /Repite género/.test(conRepeticion.find((c) => c.id === 'th').porque));

igual('los vecinos son los dos meses de antes y los dos de después',
  nearbyGenres(gaps, gaps.findIndex((g) => g.month === 'Abril')).sort(),
  ['Novela contemporánea']);

/* ── LA FORMA DEL HUECO MANDA ────────────────────────────────── */

grupo('UN LIBRO QUE NO CABE SIGUE SIN CABER');
const huecoCorto = mes('Marzo');
const gustoDelTocho = (b) => (b.id === 'tocho' ? { score: 100, porque: 'Te encanta' } : { score: 0 });

const mesConAncla = conAncla.find((g) => g.month === 'Abril');   // necesita un corto, 400 libres
const cabeONo = candidatesForGap([
  libro({ id: 'tocho', pages: '~900', role: '⚓ Ancla' }),
  libro({ id: 'justo', pages: '~250', role: '⚡ Corto' }),
], mesConAncla, { taste: gustoDelTocho });
igual('aunque te encante, el que no cabe no gana', cabeONo[0].id, 'justo');
ok('el gusto suma pero no manda',
  cabeONo.find((c) => c.id === 'tocho').score < cabeONo[0].score);

grupo('EL ROL QUE PIDE EL HUECO');
const paraVacio = candidatesForGap([
  libro({ id: 'ancla', role: '⚓ Ancla', pages: '~450' }),
  libro({ id: 'corto', role: '⚡ Corto', pages: '~450' }),
], mes('Julio'));
igual('un mes vacío pide un ancla', paraVacio[0].id, 'ancla');
ok('y lo explica', /Ancla para sostener/.test(paraVacio[0].porque), paraVacio[0].porque);

const paraResto = candidatesForGap([
  libro({ id: 'ancla', role: '⚓ Ancla', pages: '~200' }),
  libro({ id: 'corto', role: '⚡ Corto', pages: '~200' }),
], mesConAncla);
igual('un mes con ancla pide un corto', paraResto[0].id, 'corto');

/* ── QUÉ ENTRA Y QUÉ NO ──────────────────────────────────────── */

grupo('QUÉ PUEDE LLENAR UN HUECO');
const variados = [
  libro({ id: 'p', status: 'pending' }),
  libro({ id: 'w', status: 'wished' }),
  libro({ id: 'l', status: 'read' }),
  libro({ id: 'a', status: 'abandoned' }),
  libro({ id: 'y', status: 'reading' }),
  libro({ id: 'otro-mes', status: 'pending', year: AÑO, month: 'Enero' }),
];
const posibles = candidatesForGap(variados, mes('Julio'), { limit: 9 }).map((c) => c.id);
ok('lo pendiente, sí', posibles.includes('p'));
ok('lo deseado, también', posibles.includes('w'));
ok('lo leído, no', !posibles.includes('l'));
ok('lo abandonado, no', !posibles.includes('a'));
ok('lo que estás leyendo, no', !posibles.includes('y'));
ok('y lo que ya está colocado en otro mes, tampoco: eso sería rehacer el plan',
  !posibles.includes('otro-mes'));

igual('se puede pedir otras opciones excluyendo las vistas',
  candidatesForGap(variados, mes('Julio'), { exclude: ['p', 'w'] }).map((c) => c.id), []);
igual('sin candidatos, lista vacía', candidatesForGap([], mes('Julio')), []);
igual('sin hueco, lista vacía', candidatesForGap(variados, null), []);

grupo('TODA PROPUESTA SE EXPLICA');
ok('ninguna sale sin porqué',
  candidatesForGap(variados, mes('Julio'), { limit: 9 }).every((c) => c.porque && c.porque.length > 3));

grupo('CÓMO SE CUENTA EL HUECO');
ok('un mes vacío se dice así', /Junio está vacío/.test(describeGap(mes('Junio'))));
ok('y uno a medias dice cuánto le cabe', /480 páginas más/.test(describeGap(mes('Marzo'))), describeGap(mes('Marzo')));
igual('sin hueco no dice nada', describeGap(null), '');

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
