/* ─────────────────────────────────────────────────────────────
   PRUEBAS DEL FEED

   Dos grupos importan más que el resto:

   · QUÉ SALE DE TU CUENTA — una entrada del feed es una copia pública,
     igual que el perfil y las reseñas, y se comprueba contra la lista
     blanca para que un campo nuevo rompa una prueba en vez de filtrarse.

   · QUE NO SE REPITA — el identificador lleva dentro de quién es y de
     qué va, para que retomar un libro pise la entrada anterior. Un feed
     que repite es un feed que se deja de abrir.
   ───────────────────────────────────────────────────────────── */

import {
  TIPOS, PAGINA, activityId, activityDoc, ACTIVITY_FIELDS,
  activityLine, cuandoTexto, mergeFeed, chunk, MAX_EN_IN, estadoVacio,
} from '../src/feed-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

const LIBRO = { id: 'b1', title: 'Pedro Páramo', author: 'Juan Rulfo', cover: 'https://x/p.jpg' };
const base = (extra = {}) => activityDoc({
  uid: 'u1', username: 'laura.v', name: 'Laura', tipo: 'termino',
  book: LIBRO, rating: 5, at: 1000, ...extra,
});

/* ── QUÉ SALE DE TU CUENTA ───────────────────────────────────── */

grupo('QUÉ SALE DE TU CUENTA');
{
  const d = base();
  const sobran = Object.keys(d).filter((k) => !ACTIVITY_FIELDS.includes(k));
  igual('nada fuera de la lista blanca', sobran, []);
  ok('lleva de quién es', d.uid === 'u1' && d.username === 'laura.v');
  ok('y el libro con su portada', d.title === 'Pedro Páramo' && d.cover === 'https://x/p.jpg');
}

grupo('DE LA RESEÑA VA UN TROZO, NO ENTERA');
{
  const larga = 'x'.repeat(1000);
  const d = base({ tipo: 'resena', review: larga });
  ok('se corta a 240', d.review.length === 240);
  ok('la tarjeta enseña un adelanto, el resto está en su perfil', d.review !== larga);
}

grupo('LA VALORACIÓN SOLO CUANDO SE TERMINÓ');
ok('al terminar, va', base({ tipo: 'termino', rating: 4 }).rating === 4);
ok('al empezar, NO — una estrella ahí no significa nada todavía',
  !('rating' in base({ tipo: 'empezo', rating: 4 })));
ok('sin valoración, la clave no existe', !('rating' in base({ rating: 0 })));
ok('una valoración imposible se recorta', base({ rating: 99 }).rating === 5);
ok('y una negativa no entra', !('rating' in base({ rating: -3 })));

grupo('LO QUE NO SE PUEDE PINTAR NO SE ESCRIBE');
ok('sin uid, null', activityDoc({ tipo: 'termino', book: LIBRO }) === null);
ok('sin tipo, null', activityDoc({ uid: 'u1', book: LIBRO }) === null);
ok('con un tipo inventado, null', activityDoc({ uid: 'u1', tipo: 'bailó', book: LIBRO }) === null);
ok('sin libro, null', activityDoc({ uid: 'u1', tipo: 'termino' }) === null);
ok('un logro sin libro sí vale', activityDoc({ uid: 'u1', tipo: 'logro', logro: 'Ratón de biblioteca' }) !== null);
ok('pero un logro sin nombre, no', activityDoc({ uid: 'u1', tipo: 'logro' }) === null);
ok('un logro no lleva libro', !('bookId' in activityDoc({ uid: 'u1', tipo: 'logro', logro: 'X' })));

/* ── QUE NO SE REPITA ────────────────────────────────────────── */

grupo('EL MISMO HECHO NO SE REPITE');
ok('el identificador lleva quién, qué y sobre qué',
  activityId('u1', 'termino', 'b1') === 'u1_termino_b1');
ok('empezar el mismo libro dos veces pisa la entrada anterior',
  activityId('u1', 'empezo', 'b1') === activityId('u1', 'empezo', 'b1'));
ok('empezarlo y terminarlo son entradas distintas',
  activityId('u1', 'empezo', 'b1') !== activityId('u1', 'termino', 'b1'));
ok('dos personas con el mismo libro no se pisan',
  activityId('u1', 'termino', 'b1') !== activityId('u2', 'termino', 'b1'));

/* ── LA LÍNEA DE LA TARJETA ──────────────────────────────────── */

grupo('LO QUE DICE LA TARJETA');
ok('empezó', activityLine({ tipo: 'empezo', username: 'ana' }) === '@ana empezó a leer');
ok('terminó', activityLine({ tipo: 'termino', username: 'ana' }) === '@ana terminó');
ok('escribió', activityLine({ tipo: 'resena', username: 'ana' }) === '@ana escribió sobre');
ok('logro', activityLine({ tipo: 'logro', username: 'ana' }) === '@ana consiguió un logro');
ok('sin @usuario usa el nombre', activityLine({ tipo: 'empezo', name: 'Ana' }) === 'Ana empezó a leer');
ok('sin nada, «Alguien»', activityLine({ tipo: 'empezo' }) === 'Alguien empezó a leer');

grupo('CUÁNDO PASÓ');
{
  const AHORA = new Date(2026, 8, 6, 12, 0, 0).getTime();
  const hace = (ms) => cuandoTexto(AHORA - ms, AHORA);
  ok('recién', hace(10 * 1000) === 'ahora mismo');
  ok('minutos', hace(25 * 60000) === 'hace 25 min');
  ok('horas', hace(3 * 3600000) === 'hace 3 h');
  ok('ayer', hace(30 * 3600000) === 'ayer');
  ok('días', hace(4 * 86400000) === 'hace 4 días');
  ok('más de una semana, la fecha', hace(30 * 86400000).includes('agosto'));
  ok('el futuro no da números negativos', cuandoTexto(AHORA + 99999, AHORA) === 'ahora mismo');
  ok('sin fecha no revienta', typeof cuandoTexto(undefined, AHORA) === 'string');
}

/* ── JUNTAR TROZOS ───────────────────────────────────────────── */

grupo('EL FEED SE ARMA DE VARIAS CONSULTAS Y SE REORDENA');
{
  const a = [{ id: '1', at: 100 }, { id: '2', at: 300 }];
  const b = [{ id: '3', at: 200 }, { id: '4', at: 400 }];
  igual('de más nuevo a más viejo, mezclando trozos',
    mergeFeed(a, b).map((x) => x.id), ['4', '2', '3', '1']);
  igual('sin repetidos aunque vengan en dos trozos',
    mergeFeed([{ id: '1', at: 1 }], [{ id: '1', at: 1 }]).map((x) => x.id), ['1']);
  ok('lo que no tiene id se cae', mergeFeed([{ at: 5 }]).length === 0);
  igual('sin nada, lista vacía', mergeFeed(), []);

  /* Así es como lo llama social.js de verdad: un Promise.all devuelve
     UN array de listas, no las listas sueltas. La primera versión
     aplanaba un solo nivel y con esta forma tiraba todas las entradas
     en silencio — el feed salía vacío con los datos delante. */
  igual('llamado con UN array de listas, que es como sale de Promise.all',
    mergeFeed([a, b]).map((x) => x.id), ['4', '2', '3', '1']);
  ok('y con las listas sueltas da lo mismo',
    JSON.stringify(mergeFeed([a, b])) === JSON.stringify(mergeFeed(a, b)));
}

grupo('LOS TROZOS DE 30 QUE ADMITE FIRESTORE');
{
  const treinta_y_cinco = Array.from({ length: 35 }, (_, i) => i);
  const trozos = chunk(treinta_y_cinco);
  ok('35 seguidas se parten en dos consultas', trozos.length === 2);
  ok('ninguna pasa de 30', trozos.every((t) => t.length <= MAX_EN_IN));
  ok('no se pierde a nadie', trozos.flat().length === 35);
  igual('con pocas, una sola', chunk([1, 2, 3]), [[1, 2, 3]]);
  igual('con ninguna, ninguna', chunk([]), []);
  ok('la página son 20', PAGINA === 20);
  ok('hay cuatro tipos', TIPOS.length === 4);
}

/* ── EL FEED VACÍO ───────────────────────────────────────────── */

grupo('CON EL FEED VACÍO SE SUGIERE, NO SE DEJA EN BLANCO');
{
  const nadie = estadoVacio({ siguiendo: 0, entradas: 0 });
  ok('no seguir a nadie tiene su propio mensaje', nadie.texto.includes('no sigues a nadie'));
  ok('y ofrece salida', nadie.accion === 'buscar');

  const callados = estadoVacio({ siguiendo: 5, entradas: 0 });
  ok('seguir a gente callada es OTRO problema, y se dice distinto',
    callados.texto !== nadie.texto);
  ok('también ofrece salida', callados.accion === 'buscar');

  ok('con entradas no hay estado vacío', estadoVacio({ siguiendo: 5, entradas: 3 }) === null);
  ok('los dos mensajes dicen algo, no están vacíos',
    nadie.titulo.length > 0 && callados.titulo.length > 0);
}

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
