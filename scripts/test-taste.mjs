/* ─────────────────────────────────────────────────────────────
   PRUEBAS DEL PERFIL DE GUSTO

   Los dos grupos que más importan:

     · «LEÍDO NO ES SINÓNIMO DE ME GUSTÓ» — es la forma más fácil de
       romper esto sin enterarse. Si alguien decide que contar libros
       basta, el motor te recomienda justo lo que sufriste, y encima
       con seguridad.

     · «CON POCOS DATOS NO SE QUEDA EN BLANCO» — porque el día uno es
       el día en que se decide si esta pantalla sirve para algo.
   ───────────────────────────────────────────────────────────── */

import {
  tasteProfile, scoreByTaste, recommendByTaste, describeTaste, signalOf,
} from '../src/taste-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

/* ── UNA BIBLIOTECA CON HISTORIA ─────────────────────────────── */

const libro = (o) => ({ pages: '~300', ...o });
const DIA = 86400000;

/* Le encanta el thriller: tres leídos, bien puntuados. */
const THRILLER = [
  libro({ id: 't1', title: 'El Psicoanalista', author: 'Katzenbach', genre: 'Thriller', status: 'read', rating: 5, finishedAt: Date.now() - 10 * DIA }),
  libro({ id: 't2', title: 'Jaque al Psicoanalista', author: 'Katzenbach', genre: 'Thriller', status: 'read', rating: 5, finishedAt: Date.now() - 40 * DIA }),
  libro({ id: 't3', title: 'La Chica del Tren', author: 'Hawkins', genre: 'Thriller', status: 'read', rating: 4, finishedAt: Date.now() - 70 * DIA }),
];

/* La poesía la lee y la abandona: dos abandonos, un leído de 2★. */
const POESIA = [
  libro({ id: 'p1', title: 'Antología', author: 'Varios', genre: 'Poesía / Teatro', status: 'read', rating: 2 }),
  libro({ id: 'p2', title: 'Odas', author: 'Neruda', genre: 'Poesía / Teatro', status: 'abandoned' }),
  libro({ id: 'p3', title: 'Sonetos', author: 'Quevedo', genre: 'Poesía / Teatro', status: 'abandoned' }),
];

/* Y los tomos largos se le atragantan: uno terminado, tres dejados. */
const LARGOS = [
  libro({ id: 'l1', title: 'Guerra y Paz', author: 'Tolstói', genre: 'Clásico universal', pages: '~1200', status: 'abandoned' }),
  libro({ id: 'l2', title: 'Los Miserables', author: 'Hugo', genre: 'Clásico universal', pages: '~1400', status: 'abandoned' }),
  libro({ id: 'l3', title: 'El Conde', author: 'Dumas', genre: 'Aventura', pages: '~900', status: 'abandoned' }),
  libro({ id: 'l4', title: 'It', author: 'King', genre: 'Terror / Misterio', pages: '~1100', status: 'read', rating: 4 }),
];

const CANDIDATOS = [
  libro({ id: 'c1', title: 'Otro thriller', author: 'Hawkins', genre: 'Thriller', status: 'pending' }),
  libro({ id: 'c2', title: 'Más poesía', author: 'Lorca', genre: 'Poesía / Teatro', status: 'pending' }),
  libro({ id: 'c3', title: 'Un tocho', author: 'Nadie', genre: 'Novela contemporánea', pages: '~800', status: 'pending' }),
  libro({ id: 'c4', title: 'Uno cortito', author: 'Nadie', genre: 'Novela contemporánea', pages: '~180', status: 'pending' }),
  libro({ id: 'c5', title: 'De Katzenbach', author: 'Katzenbach', genre: 'Thriller', status: 'pending' }),
];

const TODO = [...THRILLER, ...POESIA, ...LARGOS, ...CANDIDATOS];
const perfil = tasteProfile(TODO);

/* ── EL CRITERIO QUE MÁS IMPORTA ─────────────────────────────── */

grupo('LEÍDO NO ES SINÓNIMO DE ME GUSTÓ');
ok('cinco estrellas es la señal más fuerte', signalOf(5) === 1);
ok('dos estrellas es NEGATIVO, no un cero', signalOf(2) < 0);
ok('una, más negativo todavía', signalOf(1) < signalOf(2));
ok('terminarlo sin puntuar cuenta poco, y en positivo',
  signalOf(0) > 0 && signalOf(0) < signalOf(4));

const thriller = perfil.generos.find((g) => g.genre === 'Thriller');
const poesia = perfil.generos.find((g) => g.genre === 'Poesía / Teatro');
ok('el género que disfruta puntúa alto', thriller.score > 40, `dio ${thriller.score}`);
ok('el que lee y no le gusta puntúa negativo', poesia.score < 0, `dio ${poesia.score}`);
ok('los dos tienen el MISMO número de libros: lo que los separa es cómo fueron',
  thriller.leidos === 3 && poesia.leidos + poesia.abandonados === 3);

grupo('ABANDONAR ES LA CRÍTICA MÁS SINCERA');
ok('se penaliza el género que dejas a medias', poesia.tasaAbandono > 0.5);
ok('y eso lo hunde por debajo de un género sin datos',
  poesia.score < 0, `poesía ${poesia.score}`);
const soloAbandonado = tasteProfile([
  libro({ id: 'x', genre: 'Ensayo / Filosofía', author: 'A', status: 'abandoned' }),
  libro({ id: 'y', genre: 'Ensayo / Filosofía', author: 'B', status: 'abandoned' }),
  libro({ id: 'z', genre: 'Ensayo / Filosofía', author: 'C', status: 'abandoned' }),
]);
ok('un género solo abandonado no sale recomendado jamás',
  soloAbandonado.generos[0].score < -40, `dio ${soloAbandonado.generos[0].score}`);

/* ── AUTORES ─────────────────────────────────────────────────── */

grupo('LOS AUTORES QUE REPITES');
ok('el autor repetido y bien valorado está', perfil.autores.some((a) => /Katzenbach/.test(a.author)));
ok('un autor leído UNA vez y del montón no ensucia el perfil',
  !perfil.autores.some((a) => /Tolstói|Hugo/.test(a.author)));
const unoQueEncanto = tasteProfile([
  libro({ id: 'u1', author: 'Rulfo', genre: 'Latinoamérica', status: 'read', rating: 5 }),
  libro({ id: 'u2', author: 'Otro', genre: 'Latinoamérica', status: 'read', rating: 3 }),
  libro({ id: 'u3', author: 'Más', genre: 'Latinoamérica', status: 'read', rating: 3 }),
]);
ok('pero uno leído una vez que te ENCANTÓ, sí',
  unoQueEncanto.autores.some((a) => a.author === 'Rulfo'));

/* ── LONGITUD ────────────────────────────────────────────────── */

grupo('LA LONGITUD QUE SÍ TERMINAS');
ok('se detecta que los tomos largos se atragantan', perfil.longitud.abandonaLargos);
igual('con la cuenta de los dos lados',
  [perfil.longitud.largosTerminados, perfil.longitud.largosAbandonados], [1, 3]);

const pocosLargos = tasteProfile([
  libro({ id: 'a', genre: 'X', author: 'A', pages: '~900', status: 'abandoned' }),
  libro({ id: 'b', genre: 'X', author: 'B', pages: '~200', status: 'read', rating: 4 }),
]);
ok('dos abandonos largos NO son una tendencia', !pocosLargos.longitud.abandonaLargos);

/* ── PUNTUAR CANDIDATOS ──────────────────────────────────────── */

grupo('CÓMO PUNTÚA UN LIBRO QUE NO HAS LEÍDO');
const delGenero = scoreByTaste(CANDIDATOS[0], perfil);
const deLaPoesia = scoreByTaste(CANDIDATOS[1], perfil);
ok('el del género que te gusta, arriba', delGenero.score > 0, `dio ${delGenero.score}`);
ok('el del género que abandonas, abajo', deLaPoesia.score < 0, `dio ${deLaPoesia.score}`);
ok('el tocho pierde puntos', scoreByTaste(CANDIDATOS[2], perfil).score < scoreByTaste(CANDIDATOS[3], perfil).score);

grupo('TODA PUNTUACIÓN SE EXPLICA');
ok('el del autor repetido dice cuántos llevas',
  /Has leído 2 de/.test(scoreByTaste(CANDIDATOS[4], perfil).porque),
  scoreByTaste(CANDIDATOS[4], perfil).porque);
ok('el del género bueno lo dice con números',
  /Thriller/.test(delGenero.porque), delGenero.porque);
ok('y el malo AVISA en vez de callarse',
  /dejado a medias/i.test(deLaPoesia.porque), deLaPoesia.porque);

/* ── EL DÍA UNO ──────────────────────────────────────────────── */

grupo('CON POCOS DATOS NO SE QUEDA EN BLANCO');
const nuevo = [
  libro({ id: 'n1', title: 'Del plan', author: 'A', genre: 'X', status: 'pending', month: 'Marzo' }),
  libro({ id: 'n2', title: 'Deseado', author: 'B', genre: 'Y', status: 'wished' }),
  libro({ id: 'n3', title: 'Suelto', author: 'C', genre: 'Z', status: 'pending' }),
];
const recienLlegada = recommendByTaste(nuevo);
igual('el perfil admite que no sabe nada', recienLlegada.perfil.confianza, 'ninguna');
ok('pero propone igual', recienLlegada.sugerencias.length === 3);
igual('lo del plan va primero', recienLlegada.sugerencias[0].id, 'n1');
ok('y dice de dónde sale', /plan de Marzo/.test(recienLlegada.sugerencias[0].porque));
ok('ninguna sale sin porqué', recienLlegada.sugerencias.every((s) => s.porque));
igual('sin libros, ni revienta ni inventa', recommendByTaste([]).sugerencias, []);

grupo('LA CONFIANZA SE DECLARA');
igual('con tres, poca', tasteProfile(POESIA).confianza, 'poca');
igual('con diez, buena', perfil.confianza, 'buena');
igual('sin nada, ninguna', tasteProfile([]).confianza, 'ninguna');
ok('sin confianza, el perfil no puntúa nada',
  scoreByTaste(CANDIDATOS[0], tasteProfile([])).score === 0);

/* ── RECOMENDAR DE VERDAD ────────────────────────────────────── */

grupo('LAS RECOMENDACIONES');
const { sugerencias } = recommendByTaste(TODO, { limit: 5 });
ok('no propone lo que ya leíste o abandonaste',
  sugerencias.every((s) => ['pending', 'wished'].includes(s.status)));
ok('el thriller del autor repetido va primero', sugerencias[0].id === 'c5', sugerencias[0].id);
ok('la poesía va la última', sugerencias.at(-1).id === 'c2', sugerencias.at(-1).id);
ok('se puede excluir lo que ya se enseñó',
  !recommendByTaste(TODO, { exclude: ['c5'] }).sugerencias.some((s) => s.id === 'c5'));

/* ── DECIRLO EN VOZ ALTA ─────────────────────────────────────── */

grupo('EL PERFIL, EN UNA FRASE');
const frase = describeTaste(perfil);
console.log(`     «${frase}»`);
ok('nombra lo que más lee', /Thriller/.test(frase));
ok('avisa de lo que abandona', /a medias|atragant/i.test(frase));
ok('empieza en mayúscula y termina en punto', /^[A-ZÁÉÍÓÚÑ]/.test(frase) && frase.endsWith('.'));
ok('dice a qué ritmo lees, en libros enteros', /3 libros en los últimos seis meses/.test(frase), frase);
ok('nunca dice medio libro', !/\d,\d libros/.test(frase), frase);
ok('pero no inventa un ritmo con un solo libro reciente',
  !/últimos seis meses/.test(describeTaste(tasteProfile([
    libro({ id: 'r1', genre: 'X', author: 'A', status: 'read', rating: 5, finishedAt: Date.now() }),
    libro({ id: 'r2', genre: 'X', author: 'B', status: 'read', rating: 4 }),
    libro({ id: 'r3', genre: 'X', author: 'C', status: 'read', rating: 4 }),
  ]))));

const fraseVacia = describeTaste(tasteProfile([]));
ok('sin datos, no se inventa un gusto', /todavía no puedo deducir/i.test(fraseVacia), fraseVacia);
ok('y dice qué hacer para arreglarlo', /estrellas/i.test(fraseVacia));
ok('con poca confianza, lo advierte',
  /provisional/i.test(describeTaste(tasteProfile(POESIA))));

/* ── RITMO ───────────────────────────────────────────────────── */

grupo('EL RITMO DE LOS ÚLTIMOS MESES');
ok('cuenta los terminados recientes', perfil.ritmo.muestra === 3, `dio ${perfil.ritmo.muestra}`);
ok('y lo pasa a libros por mes', perfil.ritmo.librosPorMes > 0);
const viejo = tasteProfile([
  libro({ id: 'v', genre: 'X', author: 'A', status: 'read', rating: 5, finishedAt: Date.now() - 400 * DIA }),
]);
igual('lo de hace un año no cuenta como ritmo de ahora', viejo.ritmo.muestra, 0);

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
