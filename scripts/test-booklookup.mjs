/* Pruebas de la capa de resolución de libros · historias #25, #26, #27
   Solo la parte pura: validación, normalización, orden y mezcla.
   Las llamadas de red se prueban en el navegador.
   Uso:  node scripts/test-booklookup.mjs */

import {
  cleanIsbn, isValidIsbn, fold, guessGenre, scoreCandidate, mergeCandidates,
} from '../src/booklookup.js';

let pass = 0, fail = 0;
const ok = (cond, name, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? '\n      ' + detail : ''}`); }
};

console.log('\nISBN');
ok(cleanIsbn('978-84-376-0494-7') === '9788437604947', 'limpia guiones de un código de barras');
ok(cleanIsbn(' 0-306-40615-2 ') === '0306406152', 'limpia espacios y guiones de un ISBN-10');
ok(isValidIsbn('9788437604947'), 'acepta un ISBN-13 válido');
ok(isValidIsbn('0306406152'), 'acepta un ISBN-10 válido');
ok(isValidIsbn('080442957X'), 'acepta la X final como dígito de control');
ok(!isValidIsbn('9788437604948'), 'rechaza un ISBN-13 con el control cambiado');
ok(!isValidIsbn('0306406153'), 'rechaza un ISBN-10 con el control cambiado');
ok(!isValidIsbn('12345'), 'rechaza algo que no tiene largo de ISBN');
ok(!isValidIsbn(''), 'rechaza vacío');
ok(!isValidIsbn('ABCDEFGHIJ'), 'rechaza letras');

console.log('\nNORMALIZACIÓN');
ok(fold('El Corazón de las Tinieblas') === 'el corazon de las tinieblas', 'quita acentos y mayúsculas');
ok(fold('¿Quién  es  Ana?') === 'quien es ana', 'quita signos y espacios de más');
ok(fold('Cien Años de Soledad') === fold('cien anos de soledad'), 'compara igual con y sin tilde');

console.log('\nGÉNERO PROPUESTO');
ok(guessGenre(['Horror stories']) === 'Terror / Misterio', 'terror desde el tema en inglés');
ok(guessGenre(['Poesía']) === 'Poesía / Teatro', 'poesía desde el tema en español');
ok(guessGenre(['Japanese fiction']) === 'Oriente / Espiritualidad', 'oriental desde "japan"');
ok(guessGenre([], 'una memoir sobre su infancia') === 'Autobiografía', 'autobiografía desde la descripción');
ok(guessGenre([]) === 'Novela contemporánea', 'sin pistas, cae en un género neutro');

console.log('\nORDEN DE CANDIDATOS');
{
  const conTodo = { title: 'Kioto', author: 'Yasunari Kawabata', pages: '~300', year: 1962, publisher: 'X', cover: 'u' };
  const pelado  = { title: 'Kioto', author: 'Autor desconocido', pages: '—', year: null, publisher: null, cover: null };
  ok(scoreCandidate(conTodo) > scoreCandidate(pelado), 'con portada y páginas vale más que uno pelado');
  ok(scoreCandidate({ ...pelado, title: 'Kioto' }, 'Kioto') >
     scoreCandidate({ ...pelado, title: 'Kioto y sus jardines' }, 'Kioto'),
     'el título exacto gana al que solo empieza igual');
}

console.log('\nMEZCLA DE FUENTES');
{
  const ol = [{ title: 'Cien Años de Soledad', author: 'Gabriel García Márquez', pages: '—', cover: null, year: null }];
  const gb = [{ title: 'cien años de soledad', author: 'Gabriel García Márquez', pages: '~471', cover: 'u', year: 1967 }];
  const merged = mergeCandidates([ol, gb]);
  ok(merged.length === 1, 'el mismo libro en dos fuentes se cuenta una vez', `dio ${merged.length}`);
  ok(merged[0].pages === '~471' && merged[0].cover === 'u', 'se queda con la versión más completa');

  const distintos = mergeCandidates([
    [{ title: 'Kioto', author: 'Kawabata', pages: '—', cover: null }],
    [{ title: 'Moby Dick', author: 'Melville', pages: '~720', cover: 'u' }],
  ]);
  ok(distintos.length === 2, 'dos libros distintos no se colapsan');
  ok(distintos[0].title === 'Moby Dick', 'el más completo aparece primero');

  ok(mergeCandidates([[{ title: '', author: 'X' }], []]).length === 0, 'descarta candidatos sin título');
}

console.log(`\n${pass} pruebas pasaron, ${fail} fallaron.`);
process.exit(fail ? 1 : 0);
