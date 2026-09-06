/* ─────────────────────────────────────────────────────────────
   PRUEBAS DE LAS ESTANTERÍAS

   Se prueba la parte que decide, no la que pinta: qué nombres valen,
   qué pasa con los repetidos, y —lo que más importa— que borrar una
   estantería la quite de las fichas SIN tocar los libros.

   Ese último es el miedo real de quien pulsa el botón, así que es el
   que más pruebas tiene.
   ───────────────────────────────────────────────────────────── */

import {
  cleanName, nameTaken, makeShelf, toggleId, stripShelf,
  SHELF_COLORS, SHELF_EMOJIS, SUGGESTED,
} from '../src/shelves-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

/* ── EL NOMBRE ───────────────────────────────────────────────── */

grupo('EL NOMBRE');
igual('junta espacios de más', cleanName('  Para   el  viaje '), 'Para el viaje');
igual('vacío se queda vacío', cleanName('   '), '');
igual('null no revienta', cleanName(null), '');
igual('se corta a 32 caracteres', cleanName('a'.repeat(90)).length, 32);

const existentes = [
  { id: 's1', name: 'Favoritos' },
  { id: 's2', name: 'Para el viaje' },
];
ok('detecta el mismo nombre', nameTaken('Favoritos', existentes));
ok('sin importar mayúsculas', nameTaken('favoritos', existentes));
ok('ni tildes', nameTaken('Favóritos', existentes));
ok('ni espacios de más', nameTaken('  favoritos  ', existentes));
ok('un nombre nuevo no está repetido', !nameTaken('Releer', existentes));
ok('renombrar una a su propio nombre no es repetir',
  !nameTaken('Favoritos', existentes, 's1'));
ok('pero sí al nombre de otra', nameTaken('Favoritos', existentes, 's2'));

/* ── CREAR ───────────────────────────────────────────────────── */

grupo('CREAR UNA ESTANTERÍA');
const nueva = makeShelf({ name: 'Releer', emoji: '🔁', color: 'lilac' }, existentes);
ok('crea con nombre, emoji y color',
  nueva && nueva.name === 'Releer' && nueva.emoji === '🔁' && nueva.color === 'lilac');
ok('le pone un id propio', Boolean(nueva?.id) && nueva.id !== existentes[0].id);

ok('sin nombre no se crea', makeShelf({ name: '   ' }, existentes) === null);
ok('con un nombre repetido tampoco', makeShelf({ name: 'favoritos' }, existentes) === null);

const rara = makeShelf({ name: 'X', emoji: '<script>', color: 'rojo-neón' }, []);
igual('un emoji inventado cae en uno de la lista', SHELF_EMOJIS.includes(rara.emoji), true);
igual('un color inventado cae en uno del tema', SHELF_COLORS.includes(rara.color), true);

/* Dos estanterías creadas seguidas no pueden compartir id: pasa si el
   id sale solo del reloj. */
const a = makeShelf({ name: 'Una' }, []);
const b = makeShelf({ name: 'Otra' }, []);
ok('dos creadas en el mismo milisegundo tienen ids distintos', a.id !== b.id);

/* ── PERTENENCIA ─────────────────────────────────────────────── */

grupo('UN LIBRO EN VARIAS ESTANTERÍAS');
igual('entra en una', toggleId([], 's1'), ['s1']);
igual('y en otra sin salir de la primera', toggleId(['s1'], 's2'), ['s1', 's2']);
igual('vuelve a tocarse y sale', toggleId(['s1', 's2'], 's1'), ['s2']);
igual('sin lista previa no revienta', toggleId(undefined, 's1'), ['s1']);
igual('no se repite si ya estaba', toggleId(['s1'], 's1'), []);

/* ── BORRAR ──────────────────────────────────────────────────── */

grupo('BORRAR NO SE LLEVA LIBROS POR DELANTE');

const fichas = {
  libro1: { status: 'read', rating: 5, shelfIds: ['s1', 's2'] },
  libro2: { status: 'reading', shelfIds: ['s2'] },
  libro3: { status: 'pending' },                       // sin estanterías
  libro4: { review: 'Me encantó', shelfIds: ['s1'] },
};

const cambios = stripShelf(fichas, 's1');
igual('solo devuelve las fichas que de verdad cambian',
  Object.keys(cambios).sort(), ['libro1', 'libro4']);
igual('al libro que estaba en dos le queda la otra', cambios.libro1, ['s2']);
igual('al que solo estaba en esa le queda la lista vacía', cambios.libro4, []);
ok('no toca el que estaba en otra estantería', !('libro2' in cambios));
ok('ni el que no estaba en ninguna', !('libro3' in cambios));

/* Lo que de verdad da miedo del botón de borrar. */
ok('los libros siguen existiendo', Object.keys(fichas).length === 4);
ok('la reseña sigue ahí', fichas.libro4.review === 'Me encantó');
ok('la puntuación sigue ahí', fichas.libro1.rating === 5);
ok('el estado sigue ahí', fichas.libro2.status === 'reading');

igual('borrar una que no usa nadie no cambia nada', stripShelf(fichas, 'sNoExiste'), {});
igual('sin fichas tampoco revienta', stripShelf(undefined, 's1'), {});

/* ── LAS QUE SE OFRECEN ──────────────────────────────────────── */

grupo('LAS QUE SE OFRECEN AL EMPEZAR');
ok('todas tienen nombre, emoji y color',
  SUGGESTED.every((s) => s.name && s.emoji && s.color));
ok('sus emojis y colores son de los válidos',
  SUGGESTED.every((s) => SHELF_EMOJIS.includes(s.emoji) && SHELF_COLORS.includes(s.color)));
ok('ninguna repite nombre con otra',
  new Set(SUGGESTED.map((s) => s.name.toLowerCase())).size === SUGGESTED.length);
ok('no se ofrece «Abandonados», que ya es un estado del libro',
  !SUGGESTED.some((s) => /abandonad/i.test(s.name)));

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
