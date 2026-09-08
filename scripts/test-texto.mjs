/* ─────────────────────────────────────────────────────────────
   ¿LO QUE LEYÓ EL OCR ES TEXTO O ES BASURA?  ·  historia #25

     npm run test:texto

   POR QUÉ EXISTE, con el caso exacto:

     Foto de «LA CABINA DE LOS ÚLTIMOS PENSAMIENTOS», de Lee Su-Yeon.
     Nítida, de frente, el título en letras grandes. El OCR devolvió:

         \ a — DE

     Y eso acabó ESCRITO en el campo del título, con la ficha diciendo
     «sin identificar, revisa los datos».

   Dos daños, y el segundo es el que se arregla aquí:

     1 · se gastó una consulta a los catálogos y una al agente
         preguntando por `\ a — DE`;
     2 · y al final se dijo «no lo reconocimos», que es falso — no es
         que nadie reconociera el libro, es que no llegamos a leer su
         nombre. Y encima dejó basura en un campo que hay que vaciar
         antes de poder escribir.

   Un campo vacío con un aviso honesto es mejor que un campo con
   basura: el vacío se rellena, la basura primero se borra.
   ───────────────────────────────────────────────────────────── */

import {
  palabraMasLarga, pareceTexto, mejorLinea, sinTildes, unSoloEspacio,
} from '../src/text-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
const ok = (nombre, condicion, detalle = '') => {
  if (condicion) { pasaron += 1; console.log(`  ✓ ${nombre}`); } else {
    fallaron += 1; console.log(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  }
};

/* ── EL CASO DE LA PANTALLA ──────────────────────────────────── */

grupo('LO QUE SALIÓ EN SU PANTALLA');

const BASURA = '\\ a — DE';

ok('«\\ a — DE» NO es texto', !pareceTexto(BASURA),
  `palabra más larga: ${palabraMasLarga(BASURA)}`);
ok('y no llega al campo del título', mejorLinea(BASURA) === '',
  JSON.stringify(mejorLinea(BASURA)));
ok('el título del libro SÍ es texto',
  pareceTexto('LA CABINA DE LOS ÚLTIMOS PENSAMIENTOS'));
ok('y su autora también', pareceTexto('Lee Su-Yeon'),
  `palabra más larga: ${palabraMasLarga('Lee Su-Yeon')}`);

/* ── QUÉ CUENTA COMO PALABRA ─────────────────────────────────── */

grupo('UNA PALABRA SON CUATRO LETRAS SEGUIDAS');

ok('«casa» sí', pareceTexto('casa'));
ok('«DE» no', !pareceTexto('DE'));
ok('«a b c d» no: son cuatro letras pero no seguidas', !pareceTexto('a b c d'));
ok('nada no', !pareceTexto(''));
ok('null no', !pareceTexto(null));
ok('solo símbolos no', !pareceTexto('|| — · \\ /'));
ok('solo números no', !pareceTexto('9 786287 794108'));

grupo('Y LAS TILDES Y LA Ñ SON LETRAS');

/* Sin esto «MAÑANA» tendría un agujero en medio y se partiría en dos
   palabras de tres, que es justo por debajo del listón. */
ok('«MAÑANA» es una palabra de seis', palabraMasLarga('MAÑANA') === 6,
  String(palabraMasLarga('MAÑANA')));
ok('«ÚLTIMOS» también', palabraMasLarga('ÚLTIMOS') === 7, String(palabraMasLarga('ÚLTIMOS')));
ok('«corazón» entera', palabraMasLarga('corazón') === 7, String(palabraMasLarga('corazón')));
ok('y una portada en catalán o francés vale igual',
  pareceTexto('Comença') && pareceTexto('Réflexions'));

/* ── LA MEJOR LÍNEA, NO LA PRIMERA ───────────────────────────── */

grupo('SE COGE LA MÁS LARGA, NO LA PRIMERA');

/* En una portada la primera línea suele ser la editorial o un adorno.
   Coger la primera sin mirar es como `\\ a — DE` acabó en el campo. */
const PORTADA = `PENGUIN
LA CABINA DE LOS ÚLTIMOS PENSAMIENTOS
Lee Su-Yeon`;

ok('sale el título, no la editorial',
  mejorLinea(PORTADA) === 'LA CABINA DE LOS ÚLTIMOS PENSAMIENTOS',
  mejorLinea(PORTADA));

const CONBASURA = `\\ | —
—— ·
La sombra del viento
2024`;
ok('la basura de alrededor no estorba',
  mejorLinea(CONBASURA) === 'La sombra del viento', mejorLinea(CONBASURA));

ok('los espacios de sobra se limpian',
  mejorLinea('   El   Aleph   ') === 'El Aleph', JSON.stringify(mejorLinea('   El   Aleph   ')));

ok('si NADA parece texto, cadena vacía',
  mejorLinea('\\ | — · 12 34') === '',
  JSON.stringify(mejorLinea('\\ | — · 12 34')));

ok('y sin texto ninguno, tampoco', mejorLinea('') === '' && mejorLinea(null) === '');

/* Los separadores que trae el OCR además del salto de línea. */
ok('parte también por · y por |',
  mejorLinea('ab · Cien años de soledad | cd') === 'Cien años de soledad',
  mejorLinea('ab · Cien años de soledad | cd'));

/* ── LO QUE YA HABÍA, QUE NO SE ROMPE ────────────────────────── */

grupo('Y LO QUE ESTE MÓDULO YA HACÍA');

ok('sinTildes sigue quitando tildes', sinTildes('canción') === 'cancion');
ok('y la ñ se mantiene o se pliega, pero no revienta',
  typeof sinTildes('mañana') === 'string');
ok('unSoloEspacio sigue colapsando', unSoloEspacio('  a   b  ') === 'a b');

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.\n`);
process.exit(fallaron ? 1 : 0);
