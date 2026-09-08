/* Pruebas de la capa de resolución de libros · historias #25, #26, #27
   Solo la parte pura: validación, normalización, orden y mezcla.
   Las llamadas de red se prueban en el navegador.
   Uso:  node scripts/test-booklookup.mjs */

import {
  looksLikeSame, titleSimilarity,
  cleanIsbn, isValidIsbn, fold, guessGenre, scoreCandidate, mergeCandidates, buscarPorTitulo,
  lookupByIsbn,
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

console.log('\nCOMPROBAR UNA SUGERENCIA DEL AGENTE');
ok(looksLikeSame('Rayuela', 'Rayuela'), 'el mismo título, igual');
ok(looksLikeSame('Cien Años de Soledad', 'cien anos de soledad'), 'no le importan tildes ni mayúsculas');
ok(looksLikeSame('Los detectives salvajes', 'Los detectives salvajes: novela'),
  'acepta un subtítulo añadido');
ok(looksLikeSame('El nombre de la rosa: edición anotada', 'El nombre de la rosa'),
  'acepta que falte el subtítulo');

ok(!looksLikeSame('Rayuela', 'La vuelta al día en ochenta mundos'),
  'rechaza otro libro del mismo autor');
ok(!looksLikeSame('La casa de los espíritus', 'La casa de Bernarda Alba'),
  'rechaza un libro que solo comparte parte del nombre');
ok(!looksLikeSame('', 'Rayuela'), 'rechaza un título vacío');

/* El caso que importa: el agente se inventa un libro, el catálogo
   devuelve otro real que comparte una palabra, y hay que descartarlo. */
ok(!looksLikeSame('El jardín de las mareas perdidas', 'El jardín secreto'),
  'un libro inventado no se cuela por compartir una palabra');
ok(!looksLikeSame('Memorias del fuego azul', 'Memorias de una geisha'),
  'ni por compartir la primera palabra');

ok(titleSimilarity('Rayuela', 'rayuela') === 1, 'el parecido es 1 cuando son iguales');
ok(titleSimilarity('Rayuela', 'Ficciones') === 0, 'el parecido es 0 sin nada en común');

/* ── UN CATÁLOGO CAÍDO NO ES «TU LIBRO NO EXISTE» ────────────
   El fallo que esto guarda salió de una cuenta nueva: «no está
   buscando los libros de ninguna forma, me ha tocado incluirlos todos
   a mano». Los tres caminos de añadir un libro acaban en estas dos
   consultas, así que cuando las dos fallan fallan los tres — y
   fallaban EN SILENCIO, porque un 429 trae un JSON de error y
   `d.items || []` lo leía como lista vacía.

   El daño no era no encontrar: era decir «Sin resultados, puedes
   añadirlo a mano» y mandarla a teclear su biblioteca entera.

   Se prueba con `fetch` sustituido, que es la única forma de tener un
   429 a mano sin depender de que hoy Google esté de mal humor. */

console.log('\nCUANDO EL CATÁLOGO NO CONTESTA');
{
  const fetchDeVerdad = globalThis.fetch;
  const respuesta = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  const UN_LIBRO = {
    docs: [{ title: 'Rayuela', author_name: ['Julio Cortázar'], number_of_pages_median: 600 }],
    items: [{ volumeInfo: { title: 'Rayuela', authors: ['Julio Cortázar'], pageCount: 600 } }],
  };

  const con = async (responder) => {
    let llamadas = 0;
    globalThis.fetch = async (url) => { llamadas += 1; return responder(String(url), llamadas); };
    const r = await buscarPorTitulo('rayuela');
    return { ...r, llamadas };
  };

  const cuota = { error: { code: 429, message: 'Quota exceeded' } };

  let r = await con(() => respuesta(cuota, 429));
  ok(r.sinCatalogos === true, 'los dos con 429 → se sabe que no se pudo preguntar');
  ok(r.libros.length === 0, 'y no se inventa ningún resultado');
  ok(r.caidas.length === 2, 'las dos fuentes constan como caídas', JSON.stringify(r.caidas));

  r = await con(() => { throw new TypeError('Failed to fetch'); });
  ok(r.sinCatalogos === true, 'sin red, lo mismo: no se pudo preguntar');

  r = await con((url) => (url.includes('googleapis')
    ? respuesta(cuota, 429)
    : respuesta(UN_LIBRO)));
  ok(r.sinCatalogos !== true, 'si UNA contesta, no está caído: para eso hay dos');
  ok(r.libros.length === 1, 'y su resultado llega igual');
  ok(r.caidas.length === 1, 'pero consta cuál faltó, para poder decirlo');

  r = await con(() => respuesta({ docs: [], items: [] }));
  ok(r.sinCatalogos !== true && r.libros.length === 0,
    'las dos contestan y no hay nada: ESO sí es «sin resultados»');

  /* El reintento: lo que arregla el 429 pasajero sin que nadie note
     nada. Dos fuentes × dos intentos = cuatro llamadas como mucho. */
  r = await con((url, n) => (n <= 2 ? respuesta(cuota, 429) : respuesta(UN_LIBRO)));
  ok(r.libros.length === 1, 'un fallo pasajero se reintenta y acaba encontrando');
  ok(r.llamadas === 4, 'con un intento de más por fuente, no más', `fueron ${r.llamadas}`);

  /* Y lo que NO se reintenta: a quien ya dijo que la petición está mal
     no se le pregunta dos veces, solo alarga la espera. */
  r = await con(() => respuesta({ error: 'mal' }, 400));
  ok(r.llamadas === 2, 'un 400 no se reintenta', `fueron ${r.llamadas}`);

  /* ── EL ISBN SE BUSCA DONDE ESTÁ EL LIBRO ──────────────────

       «De todos los libros que intenté por portada y por escáner de
        código de barras, ninguno funcionó.»

     Se preguntaba por `search.json?q=isbn:`, que es el BUSCADOR de
     texto de OpenLibrary, no su catálogo. El índice de búsqueda va muy
     por detrás y se le escapan ediciones enteras — muy en particular
     las latinoamericanas, que son las que ella tiene en la mano. Se
     preguntaba en el sitio donde el libro no iba a estar, y luego se
     concluía que el libro no existe. */

  console.log('\nUN ISBN SE BUSCA EN EL CATÁLOGO, NO EN EL BUSCADOR');

  const ISBN = '9786287794108';   // el de su pantalla: Penguin Colombia
  const EDICION = {
    [`ISBN:${ISBN}`]: {
      title: 'Un curso de economía',
      authors: [{ name: 'Quien sea' }],
      number_of_pages: 426,
      publish_date: 'marzo 2024',
      publishers: [{ name: 'Penguin Random House' }],
      cover: { medium: 'https://covers.openlibrary.org/b/id/1-M.jpg' },
      subjects: [{ name: 'Economics' }],
    },
  };

  const pedidas = [];
  const conIsbn = async (responder) => {
    pedidas.length = 0;
    globalThis.fetch = async (url) => { pedidas.push(String(url)); return responder(String(url)); };
    return lookupByIsbn(ISBN);
  };

  let ri = await conIsbn((url) => {
    if (url.includes('/api/books')) return respuesta(EDICION);
    if (url.includes('googleapis')) return respuesta({ items: [] });
    return respuesta({ docs: [] });
  });
  ok(ri.ok === true, 'LO ENCUENTRA por la API de ediciones', JSON.stringify(ri.reason));
  ok(ri.book?.title === 'Un curso de economía', 'con su título', ri.book?.title);
  ok(ri.book?.pages === '~426', 'y sus páginas', ri.book?.pages);
  ok(pedidas.some((u) => u.includes('/api/books?bibkeys=ISBN:')),
    'se pregunta al CATÁLOGO, no solo al buscador',
    pedidas.filter((u) => u.includes('openlibrary')).join(' '));

  /* Y el buscador sigue de reserva: si la API no lo tiene, todavía
     queda una oportunidad más de la que había antes. */
  ri = await conIsbn((url) => {
    if (url.includes('/api/books')) return respuesta({});   // 200 con {} = no lo tengo
    if (url.includes('googleapis')) return respuesta({ items: [] });
    return respuesta({ docs: [{ title: 'Por el buscador', author_name: ['X'] }] });
  });
  ok(ri.ok === true, 'si la API no lo tiene, el buscador sigue de reserva', JSON.stringify(ri.reason));
  ok(ri.book?.title === 'Por el buscador', 'y su resultado vale igual', ri.book?.title);

  /* ── «NO ESTÁ» NO ES LO MISMO QUE «NO ESTÁ EN EL QUE CONTESTÓ» ── */

  console.log('\nCUANDO SOLO CONTESTA UNO DE LOS DOS');

  ri = await conIsbn((url) => (url.includes('googleapis')
    ? respuesta(cuota, 429)
    : respuesta(url.includes('/api/books') ? {} : { docs: [] })));
  ok(ri.reason === 'no-encontrado-a-medias',
    'NO SE DICE «no está»: uno de los dos nunca contestó', ri.reason);
  ok(/429/.test(ri.detalle || ''),
    'y el motivo viaja para poder enseñarlo en pantalla', ri.detalle);

  ri = await conIsbn((url) => respuesta(url.includes('/api/books') ? {} : { docs: [], items: [] }));
  ok(ri.reason === 'no-encontrado',
    'los dos contestan y no lo tienen: ESO sí es «no está»', ri.reason);
  ok(!ri.caidas?.length, 'y no consta ninguna caída');

  globalThis.fetch = fetchDeVerdad;
}

console.log(`\n${pass} pruebas pasaron, ${fail} fallaron.`);
process.exit(fail ? 1 : 0);
