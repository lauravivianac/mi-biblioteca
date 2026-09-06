/* ─────────────────────────────────────────────────────────────
   PRUEBAS DE LAS CITAS

   Lo que más se prueba es la limpieza del texto que sale del OCR,
   porque es donde se decide si la función sirve: una cita con los
   saltos de renglón del papel dentro queda ilegible, y una con las
   palabras partidas por el guion de final de línea, peor.
   ───────────────────────────────────────────────────────────── */

import {
  cleanQuote, parsePage, makeQuote, sortQuotes, searchQuotes, quoteToText, MAX_QUOTE,
} from '../src/quotes-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

/* ── EL TEXTO QUE SALE DE UNA FOTO ───────────────────────────── */

grupo('LIMPIAR EL TEXTO DE UNA FOTO');

/* Así sale de verdad de un OCR: un salto por renglón impreso. */
igual('los renglones del papel no son saltos de la cita',
  cleanQuote('Muchos años después, frente\nal pelotón de fusilamiento,\nel coronel Aureliano Buendía'),
  'Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía');

igual('una palabra partida por el guion se cose',
  cleanQuote('había de recordar aquella tarde re-\nmota'),
  'había de recordar aquella tarde remota');

igual('un párrafo de verdad sí se conserva',
  cleanQuote('Primer párrafo.\n\nSegundo párrafo.'),
  'Primer párrafo.\n\nSegundo párrafo.');

igual('tres saltos siguen siendo un párrafo',
  cleanQuote('Uno.\n\n\n\nDos.'), 'Uno.\n\nDos.');

igual('los espacios de más se juntan', cleanQuote('hola    mundo'), 'hola mundo');
igual('recorta por delante y por detrás', cleanQuote('   hola   '), 'hola');
igual('vacío se queda vacío', cleanQuote('   \n  \n '), '');
igual('null no revienta', cleanQuote(null), '');
igual('se corta en el máximo', cleanQuote('a'.repeat(MAX_QUOTE + 500)).length, MAX_QUOTE);

/* ── LA PÁGINA ───────────────────────────────────────────────── */

grupo('LA PÁGINA, COMO SE ESCRIBA');
igual('un número pelado', parsePage('143'), 143);
igual('«p. 143»', parsePage('p. 143'), 143);
igual('«pág 143»', parsePage('pág 143'), 143);
igual('«página 143»', parsePage('página 143'), 143);
igual('sin página es null, no cero', parsePage(''), null);
igual('letras solas, null', parsePage('no sé'), null);
igual('cero no es una página', parsePage('0'), null);
igual('un número absurdo tampoco', parsePage('999999999'), null);

/* ── CREAR ───────────────────────────────────────────────────── */

grupo('CREAR UNA CITA');
const c = makeQuote({ text: 'La memoria del corazón\nelimina los malos recuerdos', page: 'p. 88' }, 1000);
ok('guarda el texto ya limpio', c.text === 'La memoria del corazón elimina los malos recuerdos');
igual('y la página', c.page, 88);
ok('le pone id y fecha', Boolean(c.id) && c.at === 1000);

ok('sin texto no se crea', makeQuote({ text: '   ', page: '10' }) === null);
igual('sin página se guarda igual', makeQuote({ text: 'Algo' }, 1).page, null);

const conNota = makeQuote({ text: 'Algo', note: '  Me recordó a mi abuela  ' }, 1);
igual('la nota se recorta', conNota.note, 'Me recordó a mi abuela');
igual('sin nota es null', makeQuote({ text: 'Algo' }, 1).note, null);

const q1 = makeQuote({ text: 'Una' }, 5);
const q2 = makeQuote({ text: 'Otra' }, 5);
ok('dos creadas en el mismo milisegundo no comparten id', q1.id !== q2.id);

/* ── ORDEN ───────────────────────────────────────────────────── */

grupo('ORDEN POR PÁGINA');
const citas = [
  { id: 'c', page: 200, at: 1 },
  { id: 'a', page: 12, at: 2 },
  { id: 'sin1', page: null, at: 50 },
  { id: 'b', page: 99, at: 3 },
  { id: 'sin2', page: null, at: 10 },
];
igual('por página, y las que no tienen al final por orden de guardado',
  sortQuotes(citas).map((x) => x.id), ['a', 'b', 'c', 'sin2', 'sin1']);
igual('sin citas no revienta', sortQuotes(), []);
ok('no toca la lista original', citas[0].id === 'c');

/* ── BUSCAR ──────────────────────────────────────────────────── */

grupo('BUSCAR ENTRE LAS CITAS');
const todas = [
  { text: 'Muchos años después, frente al pelotón', bookTitle: 'Cien años de soledad', bookAuthor: 'García Márquez' },
  { text: 'Vine a Comala porque me dijeron', bookTitle: 'Pedro Páramo', bookAuthor: 'Juan Rulfo' },
  { text: 'Nada sucede impunemente', bookTitle: 'Rayuela', bookAuthor: 'Cortázar', note: 'Para el club de lectura' },
];

igual('por una palabra de la cita', searchQuotes(todas, 'pelotón').length, 1);
igual('sin tildes encuentra igual', searchQuotes(todas, 'peloton').length, 1);
igual('por el autor, que es como se busca de verdad',
  searchQuotes(todas, 'rulfo').map((x) => x.bookTitle), ['Pedro Páramo']);
igual('por el título', searchQuotes(todas, 'rayuela').length, 1);
igual('por la nota', searchQuotes(todas, 'club').length, 1);
igual('varias palabras: tienen que estar todas',
  searchQuotes(todas, 'comala dijeron').length, 1);
igual('si una no está, no aparece', searchQuotes(todas, 'comala pelotón').length, 0);
igual('sin búsqueda salen todas', searchQuotes(todas, '').length, 3);
igual('lo que no está, no está', searchQuotes(todas, 'zzz').length, 0);

/* ── COMPARTIR ───────────────────────────────────────────────── */

grupo('EL TEXTO PARA COMPARTIR');
igual('cita, libro, autor y página',
  quoteToText({ text: 'Vine a Comala', page: 5 }, { title: 'Pedro Páramo', author: 'Juan Rulfo' }),
  '«Vine a Comala»\n\nPedro Páramo — Juan Rulfo, p. 5');
igual('sin página no se inventa una',
  quoteToText({ text: 'Vine a Comala', page: null }, { title: 'Pedro Páramo', author: 'Juan Rulfo' }),
  '«Vine a Comala»\n\nPedro Páramo — Juan Rulfo');
igual('sin libro, solo la cita', quoteToText({ text: 'Algo' }, {}), '«Algo»');

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
