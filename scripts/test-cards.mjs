/* ─────────────────────────────────────────────────────────────
   PRUEBAS DE LAS TARJETAS PARA COMPARTIR

   El grupo que más importa es «LOS TÍTULOS LARGOS». Es el criterio de
   la historia que más se incumple en la práctica y el que decide si
   una tarjeta se comparte o se borra: un título cortado a la mitad o
   desbordado por el lado no lo enseña nadie. Y los títulos largos de
   verdad existen —«El Extraordinario Viaje del Faquir que se Quedó
   Atrapado en un Armario de Ikea» no me lo he inventado—.
   ───────────────────────────────────────────────────────────── */

import {
  wrapLines, fitText, cardContent, shareCaption, cardFilename,
  medidorDePrueba, ANCHO, ALTO,
} from '../src/cards-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

const CAJA = 880;                    // el ancho útil de la tarjeta
const medir = medidorDePrueba;

const LARGUISIMO = 'El Extraordinario Viaje del Faquir que se Quedó Atrapado en un Armario de Ikea';

/* ── FORMATO ─────────────────────────────────────────────────── */

grupo('EL FORMATO DE STORIES');
igual('1080 de ancho', ANCHO, 1080);
igual('1920 de alto', ALTO, 1920);

/* ── PARTIR EL TEXTO ─────────────────────────────────────────── */

grupo('PARTIR POR PALABRAS');
const cortas = wrapLines('Pedro Páramo', CAJA, (t) => medir(t, 64));
igual('lo que cabe va en una línea', cortas.length, 1);

const partido = wrapLines(LARGUISIMO, CAJA, (t) => medir(t, 64));
ok('lo que no cabe se parte', partido.length > 1, JSON.stringify(partido));
ok('ninguna línea se pasa de ancho',
  partido.every((l) => medir(l, 64) <= CAJA),
  JSON.stringify(partido.map((l) => Math.round(medir(l, 64)))));
ok('NINGUNA palabra queda cortada por la mitad',
  partido.join(' ') === LARGUISIMO, partido.join(' '));

igual('sin texto, ninguna línea', wrapLines('', CAJA, medir), []);
igual('con solo espacios, tampoco', wrapLines('   ', CAJA, medir), []);
igual('sin argumentos no revienta', wrapLines(undefined, CAJA, medir), []);

/* ── EL CRITERIO QUE MÁS IMPORTA ─────────────────────────────── */

grupo('LOS TÍTULOS LARGOS NO DESBORDAN NI SE CORTAN');
const corto = fitText('Pedro Páramo', { maxAncho: CAJA, medir });
igual('un título corto va a tamaño grande', corto.size, 96);
ok('y en una línea', corto.lineas.length === 1);
ok('sin recortar nada', !corto.recortado);

const largo = fitText(LARGUISIMO, { maxAncho: CAJA, medir });
ok('el larguísimo encoge la letra', largo.size < 96, `dio ${largo.size}`);
ok('cabe en tres líneas', largo.lineas.length <= 3, JSON.stringify(largo.lineas));
ok('y ninguna se sale',
  largo.lineas.every((l) => medir(l, largo.size) <= CAJA));
ok('sin perder ni una palabra',
  !largo.recortado && largo.lineas.join(' ') === LARGUISIMO,
  JSON.stringify(largo.lineas));

grupo('CUANDO NI ENCOGIENDO CABE');
const absurdo = fitText('palabra '.repeat(80).trim(), { maxAncho: CAJA, medir });
ok('se recorta en vez de romper la tarjeta', absurdo.recortado);
ok('y se dice con puntos suspensivos', absurdo.lineas.at(-1).endsWith('…'), absurdo.lineas.at(-1));
ok('sin pasarse de las líneas que caben', absurdo.lineas.length <= 3);
ok('ni de ancho, ni con los puntos puestos',
  absurdo.lineas.every((l) => medir(l, absurdo.size) <= CAJA),
  JSON.stringify(absurdo.lineas.map((l) => Math.round(medir(l, absurdo.size)))));

grupo('UNA PALABRA SOLA ENORME');
/* El caso que se olvida: no hay nada que partir. Si solo se recortara
   cuando SOBRAN líneas, esta palabra se saldría por el lado. */
const unaPalabra = fitText('Donaudampfschiffahrtselektrizitatenhauptbetriebswerkbauunterbeamtengesellschaft',
  { maxAncho: CAJA, medir });
ok('no se cuelga', Array.isArray(unaPalabra.lineas));
ok('y acaba cabiendo, encogida o recortada',
  unaPalabra.lineas.every((l) => medir(l, unaPalabra.size) <= CAJA),
  JSON.stringify(unaPalabra.lineas));
ok('se recorta aunque sea UNA sola línea', unaPalabra.recortado);
ok('y se ve que hay más', unaPalabra.lineas.at(-1).endsWith('…'), unaPalabra.lineas.at(-1));

const urlLarga = fitText('https://openlibrary.org/works/OL27448W/El_extraordinario_viaje',
  { maxAncho: CAJA, medir });
ok('una URL tampoco desborda',
  urlLarga.lineas.every((l) => medir(l, urlLarga.size) <= CAJA), JSON.stringify(urlLarga.lineas));

grupo('MÁS LÍNEAS CUANDO LA CAJA LO PERMITE');
const cita = fitText(
  'Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía '
  + 'había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo.',
  { maxAncho: CAJA, maxLineas: 7, desde: 64, hasta: 34, medir },
);
ok('una cita larga cabe en siete líneas', cita.lineas.length <= 7, JSON.stringify(cita.lineas));
ok('sin recortarse', !cita.recortado);

/* ── QUÉ DICE CADA TARJETA ───────────────────────────────────── */

grupo('LOS CUATRO MOMENTOS EN QUE APETECE PRESUMIR');
const libro = cardContent('libro', {
  title: 'Pedro Páramo', author: 'Juan Rulfo', rating: 5,
  username: 'laura.v', cover: 'https://…/p.jpg',
});
igual('el libro terminado lleva sus estrellas', libro.kicker, '★★★★★');
igual('el título', libro.titulo, 'Pedro Páramo');
igual('el autor', libro.subtitulo, 'Juan Rulfo');
igual('y tu nombre con arroba', libro.pie, '@laura.v');
igual('y la portada, para dibujarla', libro.portada, 'https://…/p.jpg');

const sinEstrellas = cardContent('libro', { title: 'X', author: 'Y' });
igual('sin puntuar, no se inventan estrellas', sinEstrellas.kicker, 'Terminado');
igual('sin @usuario, el pie va vacío en vez de una arroba suelta', sinEstrellas.pie, '');

const cita2 = cardContent('cita', {
  text: 'La memoria del corazón elimina los malos recuerdos.',
  bookTitle: 'El amor en los tiempos del cólera', bookAuthor: 'García Márquez', page: 143,
  username: 'laura.v',
});
igual('la cita es el titular', cita2.titulo, 'La memoria del corazón elimina los malos recuerdos.');
ok('y el libro va debajo', /cólera/.test(cita2.subtitulo) && /Márquez/.test(cita2.subtitulo));
igual('con su página', cita2.cuerpo, 'pág. 143');

const anio = cardContent('anio', {
  anio: 2026, leidos: 9, paginas: 3056, generosDistintos: 7, rachaMasLarga: 7, enCurso: true,
});
igual('el año enseña el número grande', anio.titulo, '9');
ok('y dice que va a medias', /En lo que va de 2026/.test(anio.kicker), anio.kicker);
ok('con lo demás en una línea', /3056|3\.056/.test(anio.cuerpo) && /7 géneros/.test(anio.cuerpo), anio.cuerpo);

const unLibro = cardContent('anio', { anio: 2026, leidos: 1 });
igual('un libro se dice en singular', unLibro.subtitulo, 'libro');

const logro = cardContent('logro', { name: 'Primer clásico', icon: '🏛', hint: 'Lee un clásico' });
igual('el logro lleva su nombre', logro.titulo, 'Primer clásico');
igual('y su icono', logro.subtitulo, '🏛');

igual('un tipo que no existe no devuelve una tarjeta a medias', cardContent('loquesea'), null);

/* ── EL TEXTO QUE ACOMPAÑA ───────────────────────────────────── */

grupo('LO QUE SE ESCRIBE AL COMPARTIR');
ok('el libro se cuenta en una frase',
  shareCaption('libro', { title: 'Pedro Páramo', author: 'Juan Rulfo' })
  === 'Terminé «Pedro Páramo», de Juan Rulfo.');
ok('sin autor, la frase sigue teniendo sentido',
  !/de undefined|de null/.test(shareCaption('libro', { title: 'X' })),
  shareCaption('libro', { title: 'X' }));
ok('el año, con su número', /9 libros/.test(shareCaption('anio', { anio: 2026, leidos: 9, enCurso: true })));
ok('NINGUNA lleva hashtags de relleno',
  ['libro', 'cita', 'anio', 'logro'].every((t) => !shareCaption(t, { title: 'X', name: 'Y' }).includes('#')));
igual('un tipo desconocido no escribe nada', shareCaption('loquesea'), '');

/* ── EL ARCHIVO ──────────────────────────────────────────────── */

grupo('CÓMO SE LLAMA EL ARCHIVO');
const nombre = cardFilename('libro', { title: 'Pedro Páramo' }, new Date(2026, 8, 6));
ok('lleva el título, sin tildes ni espacios', /pedro-paramo/.test(nombre), nombre);
ok('y la fecha, para que no se pisen', /2026-09-06/.test(nombre), nombre);
ok('acaba en .png', nombre.endsWith('.png'));
ok('un título imposible no deja el nombre vacío',
  cardFilename('logro', { name: '★★★' }, new Date(2026, 8, 6)).length > 20,
  cardFilename('logro', { name: '★★★' }, new Date(2026, 8, 6)));

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
