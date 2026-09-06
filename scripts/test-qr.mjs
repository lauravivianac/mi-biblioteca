/* ─────────────────────────────────────────────────────────────
   PRUEBAS DEL CÓDIGO QR

   Un código QR o lo lee un lector o no vale para nada, y eso no se
   comprueba mirando el dibujo. Estas matrices SE VERIFICARON con un
   decodificador ajeno (jsQR) y con un codificador de referencia; aquí
   queda su huella, para que si alguien toca el Reed-Solomon o el
   recorrido de los datos la prueba se entere.

   La primera versión de qr-core tenía el polinomio generador al revés.
   Los números eran los correctos, en el orden equivocado; el dibujo
   parecía un QR perfectamente normal y NINGÚN lector lo leía. Por eso
   estas huellas están aquí y por eso hay que regenerarlas solo después
   de volver a pasar por un decodificador de verdad.
   ───────────────────────────────────────────────────────────── */

import { createHash } from 'node:crypto';
import {
  qrMatrix, qrSvg, pickVersion, capacity, sizeOf, toBytes, MAX_VERSION,
} from '../src/qr-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}

const huella = (m) =>
  createHash('sha256').update(m.map((f) => f.map((v) => (v ? '1' : '0')).join('')).join('')).digest('hex').slice(0, 16);

/* ── LAS HUELLAS VERIFICADAS ─────────────────────────────────── */

grupo('MATRICES QUE UN LECTOR AJENO YA LEYÓ');
const GOLDEN = [
  ['https://mibiblioteca.app/#/u/laura.v', 'd8b9780924fe1e77', 3],
  ['HOLA', 'b5f6f1692586adfc', 1],
  ['a', 'dc3f75d72b31399a', 1],
  ['Café con leche — ñandú, ¿sí?', '8fbe374bb89b7eb9', 3],
  ['z'.repeat(150), 'a3be48e2ab70578d', 8],
];
for (const [texto, esperada, version] of GOLDEN) {
  const m = qrMatrix(texto);
  const et = texto.length > 30 ? `${texto.slice(0, 28)}…` : texto;
  ok(`«${et}» sigue dando la misma matriz`, m && huella(m) === esperada,
    m ? `ahora da ${huella(m)}` : 'no se generó');
  ok(`  …y sigue siendo la versión ${version}`, m && (m.length - 17) / 4 === version);
}

/* ── LA FORMA ────────────────────────────────────────────────── */

grupo('LOS TAMAÑOS SON LOS DEL ESTÁNDAR');
ok('la versión 1 es 21×21', sizeOf(1) === 21);
ok('la 10 es 57×57', sizeOf(10) === 57);
ok('cada versión suma 4', sizeOf(5) - sizeOf(4) === 4);
ok('la matriz sale cuadrada', qrMatrix('hola').every((f, _, a) => f.length === a.length));

grupo('LOS TRES OJOS ESTÁN DONDE TIENEN QUE ESTAR');
{
  const m = qrMatrix('https://mibiblioteca.app/#/u/laura.v');
  const n = m.length;
  const ojo = (fy, fx) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const debe = r === 0 || r === 6 || c === 0 || c === 6
          || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        if (m[fy + r][fx + c] !== debe) return false;
      }
    }
    return true;
  };
  ok('arriba a la izquierda', ojo(0, 0));
  ok('arriba a la derecha', ojo(0, n - 7));
  ok('abajo a la izquierda', ojo(n - 7, 0));
  ok('abajo a la derecha NO hay ojo — así se sabe la orientación',
    !ojo(n - 7, n - 7));

  ok('la línea de puntos horizontal alterna',
    [8, 9, 10, 11].every((i) => m[6][i] === (i % 2 === 0)));
  ok('y la vertical también',
    [8, 9, 10, 11].every((i) => m[i][6] === (i % 2 === 0)));
  ok('el módulo que siempre está oscuro, lo está', m[n - 8][8] === true);
}

/* ── LO QUE CABE ─────────────────────────────────────────────── */

grupo('ELEGIR LA VERSIÓN MÁS PEQUEÑA DONDE QUEPA');
ok('un texto corto va en la 1', pickVersion(toBytes('hola')) === 1);
ok('una dirección de perfil, en la 3', pickVersion(toBytes('https://mibiblioteca.app/#/u/laura.v')) === 3);
ok('cuanto más largo, más versión',
  pickVersion(toBytes('z'.repeat(200))) > pickVersion(toBytes('z'.repeat(20))));
ok('lo que cabe justo, cabe', pickVersion(toBytes('z'.repeat(capacity(10) - 3))) === MAX_VERSION);
ok('lo que no cabe devuelve null, no un código roto',
  pickVersion(toBytes('z'.repeat(500))) === null);
ok('y qrMatrix también devuelve null', qrMatrix('z'.repeat(500)) === null);
ok('las capacidades crecen con la versión', capacity(10) > capacity(1));

grupo('LOS ACENTOS OCUPAN LO QUE OCUPAN');
ok('una eñe son dos bytes en UTF-8', toBytes('ñ').length === 2);
ok('y el texto se mide en bytes, no en letras',
  toBytes('ñññ').length === 6);
ok('un texto con acentos puede necesitar más versión que uno igual de largo sin ellos',
  pickVersion(toBytes('ñ'.repeat(60))) > pickVersion(toBytes('n'.repeat(60))));

/* ── EL SVG ──────────────────────────────────────────────────── */

grupo('EL SVG');
{
  const svg = qrSvg('https://mibiblioteca.app/#/u/laura.v');
  ok('es un svg', svg.startsWith('<svg') && svg.endsWith('</svg>'));
  ok('lleva el tamaño que se pide', qrSvg('hola', { tam: 300 }).includes('width="300"'));
  ok('lleva un borde blanco, sin el cual muchos lectores no lo encuentran',
    svg.includes('<rect') && svg.includes('fill="#fff"'));
  ok('el viewBox incluye el borde a los dos lados',
    svg.includes(`viewBox="0 0 ${29 + 8} ${29 + 8}"`));
  ok('se puede pintar en otros colores', qrSvg('hola', { oscuro: '#123456' }).includes('#123456'));
  ok('no se pierde el crispEdges: un QR difuminado no se lee',
    svg.includes('shape-rendering="crispEdges"'));
  ok('tiene etiqueta para quien no ve la pantalla', svg.includes('aria-label'));
  ok('si el texto no cabe, null y no un svg vacío', qrSvg('z'.repeat(500)) === null);
}

/* ── LAS MÁSCARAS ────────────────────────────────────────────── */

grupo('SE ELIGE MÁSCARA, NO SE USA SIEMPRE LA MISMA');
{
  /* Si todas las entradas dieran la misma máscara, el elegir sobraría.
     Basta con ver que dos textos distintos no dan el mismo dibujo. */
  const a = qrMatrix('aaaa');
  const b = qrMatrix('bbbb');
  ok('dos textos distintos dan matrices distintas', huella(a) !== huella(b));
  const m = qrMatrix('https://mibiblioteca.app/#/u/laura.v');
  const oscuros = m.flat().filter(Boolean).length;
  const pct = (oscuros * 100) / (m.length * m.length);
  ok(`la mitad oscura queda cerca del 50% (${pct.toFixed(0)}%)`, pct > 35 && pct < 65);
}

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
