/* ─────────────────────────────────────────────────────────────
   LA CLAVE DE LAS NOTIFICACIONES  ·  historia #95

     npm run test:push

   POR QUÉ EXISTE:

   Una clave VAPID mal pegada NO DA ERROR EN NINGÚN SITIO. El navegador
   no valida nada al arrancar; falla al llamar a `subscribe()`, dentro
   de un `try` que devuelve «no-se-pudo-suscribir», y lo que se ve en
   pantalla es que el interruptor no funciona. Un carácter de menos al
   copiar del terminal, un salto de línea que se coló, y a partir de ahí
   nadie recibe nada y nada lo dice.

   Es exactamente el tipo de fallo que hay que cazar en el repositorio y
   no en un teléfono: aquí cuesta una comprobación, y allí cuesta una
   tarde de no entender por qué el botón no hace nada.

   ── QUÉ SE MIRA, Y QUÉ NO ───────────────────────────────────

   Se lee el fichero como TEXTO, sin importarlo: `push.js` arrastra el
   almacén y Firebase detrás, y para comprobar la forma de una constante
   eso es montar un decorado entero para mirar una pared.

   Y se mira solo la PÚBLICA, que es la única que vive en el repositorio.
   La privada es un secreto del Worker —`wrangler secret put`— y si
   alguna vez apareciera por aquí, eso también es una comprobación: la
   última de este fichero.
   ───────────────────────────────────────────────────────────── */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const fuente = readFileSync(join(raiz, 'src/push.js'), 'utf8');

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
const ok = (nombre, condicion, detalle = '') => {
  if (condicion) { pasaron += 1; console.log(`  ✓ ${nombre}`); } else {
    fallaron += 1; console.log(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  }
};

const declarada = /const VAPID_PUBLICA = '([^']*)';/.exec(fuente);

grupo('LA CLAVE PÚBLICA ESTÁ DONDE SE ESPERA');

ok('se declara en src/push.js', Boolean(declarada),
  'si se renombró la constante, esta prueba deja de mirar nada — arréglala, no la quites');

const clave = declarada?.[1] ?? '';

/* Vacía es un estado LEGÍTIMO: significa «este despliegue no tiene
   notificaciones» y el interruptor ni aparece. Así que sin clave no se
   falla; se dice y se para. Fallar aquí obligaría a poner una clave de
   mentira para que la batería pasara, que es justo lo contrario de lo
   que se quiere. */
if (!clave) {
  console.log('\n  · Sin clave configurada: las notificaciones están apagadas a propósito.');
  console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.\n`);
  process.exit(fallaron ? 1 : 0);
}

grupo('Y TIENE LA FORMA DE UNA CLAVE DE VERDAD');

/* base64url: el alfabeto de base64 pero con - y _ en vez de + y /, y
   sin relleno. Un `+` o un `/` aquí casi siempre significa que se copió
   de un sitio que no era, y un espacio, que se coló un salto de línea
   al pegar desde el terminal. */
ok('solo lleva caracteres de base64url',
  /^[A-Za-z0-9_-]+$/.test(clave),
  'un +, un / o un espacio significa que se pegó mal');

ok('sin espacios ni saltos de línea', clave === clave.trim() && !/\s/.test(clave));

ok('mide 87 caracteres', clave.length === 87, `mide ${clave.length}`);

const bytes = (() => {
  try {
    const relleno = '='.repeat((4 - (clave.length % 4)) % 4);
    return Buffer.from((clave + relleno).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  } catch { return null; }
})();

ok('se puede decodificar', Boolean(bytes));
ok('son 65 bytes, que es lo que ocupa un punto de P-256',
  bytes?.length === 65, `son ${bytes?.length}`);

/* El 0x04 del principio dice «punto sin comprimir», y es lo que exige
   la especificación de Web Push para `applicationServerKey`. Una clave
   PRIVADA pegada aquí por error mide 43 caracteres y no empieza por 4,
   así que esta línea también caza esa confusión — que es la peligrosa,
   porque acabaría publicada en el repositorio. */
ok('EMPIEZA POR 0x04, o sea que es la PÚBLICA y no la privada',
  bytes?.[0] === 4, `empieza por 0x${bytes?.[0]?.toString(16)}`);

grupo('Y LA PRIVADA NO ESTÁ EN EL REPOSITORIO');

/* La privada de P-256 son 32 bytes: 43 caracteres en base64url. Si
   aparece una cadena así suelta en este fichero, hay que mirarlo. */
const sospechosas = [...fuente.matchAll(/'([A-Za-z0-9_-]{40,50})'/g)]
  .map((m) => m[1])
  .filter((s) => s.length === 43);

ok('no hay ninguna cadena con pinta de clave privada en push.js',
  sospechosas.length === 0,
  `sospechosa: ${sospechosas[0]?.slice(0, 12)}…`);

ok('y el fichero dice dónde va la privada de verdad',
  /secreto del Worker|wrangler secret/i.test(fuente),
  'quien venga detrás tiene que poder saberlo sin preguntar');

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.\n`);
process.exit(fallaron ? 1 : 0);
