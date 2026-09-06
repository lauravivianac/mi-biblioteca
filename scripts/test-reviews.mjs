/* ─────────────────────────────────────────────────────────────
   PRUEBAS DE LAS RESEÑAS PRIVADAS Y PÚBLICAS

   El grupo que más importa es «QUÉ SALE DE TU CUENTA»: comprueba que
   la copia pública lleva exactamente los campos de la lista blanca y
   ni uno más. Es la prueba que tiene que fallar si alguien añade un
   campo nuevo a una entrada y lo publica sin darse cuenta.
   ───────────────────────────────────────────────────────────── */

import {
  hasText, isPublicReview, visibilityLabel, publicReviewDoc,
  publishAction, publicCount, PUBLIC_FIELDS,
} from '../src/reviews-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

const LIBRO = { id: 'b1', title: 'Pedro Páramo', author: 'Juan Rulfo', genre: 'Latinoamérica', pages: '~124' };

/* ── LO QUE PASA SI NO HACES NADA ────────────────────────────── */

grupo('POR DEFECTO, PRIVADA');
ok('una entrada recién escrita no es pública', !isPublicReview({ review: 'Me encantó' }));
ok('una entrada vacía tampoco', !isPublicReview({}));
ok('hace falta decirlo expresamente', isPublicReview({ review: 'Me encantó', reviewPublic: true }));
ok('un «casi sí» no cuenta como sí', !isPublicReview({ review: 'x', reviewPublic: 'si' }));
ok('ni un 1', !isPublicReview({ review: 'x', reviewPublic: 1 }));

grupo('UNA RESEÑA VACÍA NO SE PUBLICA');
ok('marcada pública pero sin texto, no', !isPublicReview({ review: '', reviewPublic: true }));
ok('solo espacios tampoco', !isPublicReview({ review: '   \n ', reviewPublic: true }));
ok('borrar el texto la despublica sola',
  publishAction({ review: '', reviewPublic: true }) === 'borrar');
ok('«hasText» no se cree los espacios', !hasText(' \t\n') && hasText(' a '));

/* ── EL CRITERIO QUE MÁS IMPORTA ─────────────────────────────── */

grupo('QUÉ SALE DE TU CUENTA');

const entrada = {
  review: '  Me marcó para siempre.  ',
  reviewPublic: true,
  rating: 5,
  /* Todo esto es tuyo y no tiene por qué salir de tu cuenta: */
  status: 'read', page: 120, pct: 100, startedAt: 1, finishedAt: 2, lastReadAt: 3,
  cover: 'https://…/portada.jpg', isbn: '9788437604183', pinnedMonth: 'Julio',
  hidden: false, shelves: ['s1'], quotes: [{ text: 'una frase que subrayé' }],
  brief: { resumen: 'lo que me contó el agente' },
  notaPrivadaFutura: 'un campo que alguien añadirá mañana sin pensar en esto',
};
const copia = publicReviewDoc({ uid: 'u1', book: LIBRO, entry: entrada, at: 1000 });

igual('salen exactamente los campos de la lista blanca',
  Object.keys(copia).sort(), [...PUBLIC_FIELDS].sort());
ok('un campo nuevo de la entrada NO viaja solo', !('notaPrivadaFutura' in copia));
ok('no viajan tus citas', !('quotes' in copia));
ok('ni por dónde vas', !('page' in copia) && !('pct' in copia));
ok('ni cuándo lo leíste', !('startedAt' in copia) && !('finishedAt' in copia));
ok('ni lo que te contó el agente', !('brief' in copia));
ok('ni tus estanterías', !('shelves' in copia));
igual('el texto va recortado', copia.review, 'Me marcó para siempre.');
igual('con su libro, para saber de qué habla', [copia.title, copia.author], ['Pedro Páramo', 'Juan Rulfo']);
igual('y con la puntuación', copia.rating, 5);
igual('y de quién es', copia.uid, 'u1');

grupo('CUÁNDO NO HAY COPIA QUE ESCRIBIR');
igual('sin publicar, no hay copia',
  publicReviewDoc({ uid: 'u1', book: LIBRO, entry: { review: 'privada' } }), null);
igual('sin sesión tampoco',
  publicReviewDoc({ book: LIBRO, entry: entrada }), null);
igual('sin libro tampoco',
  publicReviewDoc({ uid: 'u1', entry: entrada }), null);
igual('sin argumentos no revienta', publicReviewDoc(), null);
igual('una puntuación de cero no se publica como cero',
  publicReviewDoc({ uid: 'u1', book: LIBRO, entry: { review: 'x', reviewPublic: true, rating: 0 } }).rating, null);

/* ── PUBLICAR Y DESPUBLICAR ──────────────────────────────────── */

grupo('LAS DOS DIRECCIONES');
igual('publicar escribe', publishAction({ review: 'x', reviewPublic: true }), 'escribir');
igual('volver a privada borra', publishAction({ review: 'x', reviewPublic: false }), 'borrar');
igual('quitar el interruptor también borra', publishAction({ review: 'x' }), 'borrar');
igual('una entrada sin nada, borra', publishAction({}), 'borrar');

/* ── LO QUE SE LEE EN LA PANTALLA ────────────────────────────── */

grupo('LO QUE DICE LA FICHA');
ok('sin reseña, no promete nada', /nadie más/i.test(visibilityLabel({})));
ok('privada lo dice', /solo tú/i.test(visibilityLabel({ review: 'x' })));
ok('pública lo dice', /perfil/i.test(visibilityLabel({ review: 'x', reviewPublic: true })));
ok('marcada pública pero vacía no miente',
  !/perfil/i.test(visibilityLabel({ review: '', reviewPublic: true })));

grupo('CUÁNTAS SON PÚBLICAS');
igual('se cuentan solo las publicadas de verdad', publicCount({
  a: { review: 'x', reviewPublic: true },
  b: { review: 'y' },
  c: { review: '', reviewPublic: true },
  d: { review: 'z', reviewPublic: true },
}), 2);
igual('sin entradas, cero', publicCount({}), 0);
igual('sin argumentos, cero', publicCount(), 0);

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
