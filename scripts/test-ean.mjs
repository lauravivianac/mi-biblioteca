/* ─────────────────────────────────────────────────────────────
   PRUEBAS DEL LECTOR DE CÓDIGO DE BARRAS

   Se dibujan códigos EAN-13 de verdad —a partir de ISBN reales— y se
   comprueba que el lector devuelve los mismos dígitos. Con ancho de
   módulo distinto, boca abajo, con ruido, con poca luz y torcidos de
   contraste.

   El codificador de aquí abajo es independiente del decodificador: si
   los dos compartieran una tabla equivocada, la prueba pasaría y el
   lector seguiría roto. Estas tablas están escritas mirando la norma,
   no copiadas de src/ean.js.
   ───────────────────────────────────────────────────────────── */

import { decodeLine, decodeImage, decodeModules, checksumOk } from '../src/ean.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}

/* ── UN CODIFICADOR, PARA PODER PROBAR EL LECTOR ─────────────── */

const TABLA_L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const TABLA_G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const TABLA_R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const TABLA_P = ['000000','001011','001101','001110','010011','011001','011100','010101','010110','011010'];

/** Los 95 módulos de un EAN-13, como cadena de ceros y unos. */
function codificar(ean) {
  const p = TABLA_P[Number(ean[0])];
  let bits = '101';
  for (let i = 0; i < 6; i++) {
    const d = Number(ean[1 + i]);
    bits += p[i] === '0' ? TABLA_L[d] : TABLA_G[d];
  }
  bits += '01010';
  for (let i = 0; i < 6; i++) bits += TABLA_R[Number(ean[7 + i])];
  return bits + '101';
}

/** Una línea de luminancias, como la vería la cámara. */
function pintarLinea(ean, { modulo = 3, margen = 20, negro = 20, blanco = 235 } = {}) {
  const bits = codificar(ean);
  const lum = [];
  for (let i = 0; i < margen; i++) lum.push(blanco);
  for (const b of bits) for (let i = 0; i < modulo; i++) lum.push(b === '1' ? negro : blanco);
  for (let i = 0; i < margen; i++) lum.push(blanco);
  return Uint8ClampedArray.from(lum);
}

/** La misma línea, repetida hacia abajo, como una imagen RGBA. */
function pintarImagen(ean, opciones = {}, alto = 60) {
  const linea = pintarLinea(ean, opciones);
  const ancho = linea.length;
  const data = new Uint8ClampedArray(ancho * alto * 4);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const p = (y * ancho + x) * 4;
      data[p] = data[p + 1] = data[p + 2] = linea[x];
      data[p + 3] = 255;
    }
  }
  return { data, ancho, alto };
}

/* ISBN reales, de libros del plan de Laura. */
const CIEN_ANOS   = '9788497592208';
const PRINCIPITO  = '9780156012195';
const ORGULLO     = '9780141439518';

/* ── EL DÍGITO DE CONTROL ────────────────────────────────────── */

grupo('DÍGITO DE CONTROL');
ok('acepta un EAN-13 real', checksumOk(CIEN_ANOS));
ok('acepta otro', checksumOk(PRINCIPITO));
ok('rechaza un dígito cambiado', !checksumOk('9788497592209'));
ok('rechaza dos dígitos intercambiados', !checksumOk('9788497592028'));
ok('rechaza algo que no tiene 13 dígitos', !checksumOk('978849759220'));
ok('rechaza letras', !checksumOk('978849759220X'));

/* ── LOS MÓDULOS ─────────────────────────────────────────────── */

grupo('DECODIFICAR 95 MÓDULOS');
for (const ean of [CIEN_ANOS, PRINCIPITO, ORGULLO]) {
  const leido = decodeModules(codificar(ean));
  ok(`lee ${ean}`, leido === ean, `leyó ${leido}`);
}
/* La marca de inicio es 101: se estropea el módulo del medio, porque
   cambiar el primero lo dejaba igual y la prueba no probaba nada. */
ok('rechaza un patrón sin la marca de inicio',
  decodeModules('11' + codificar(CIEN_ANOS).slice(2)) === null);
ok('rechaza un patrón de largo equivocado',
  decodeModules(codificar(CIEN_ANOS).slice(0, 94)) === null);
ok('rechaza 95 módulos inventados',
  decodeModules('1'.repeat(95)) === null);

/* ── UNA LÍNEA DE LA CÁMARA ──────────────────────────────────── */

grupo('LEER UNA LÍNEA');
for (const modulo of [1, 2, 3, 5, 8]) {
  const leido = decodeLine(pintarLinea(CIEN_ANOS, { modulo }));
  ok(`con módulos de ${modulo} píxel${modulo > 1 ? 'es' : ''}`, leido === CIEN_ANOS, `leyó ${leido}`);
}

ok('con el libro boca abajo',
  decodeLine(Uint8ClampedArray.from([...pintarLinea(PRINCIPITO, { modulo: 4 })].reverse())) === PRINCIPITO);

ok('con poca luz (contraste 90-160)',
  decodeLine(pintarLinea(ORGULLO, { modulo: 4, negro: 90, blanco: 160 })) === ORGULLO);

ok('sin contraste no inventa nada',
  decodeLine(Uint8ClampedArray.from(new Array(400).fill(128))) === null);

ok('una línea demasiado corta no se intenta',
  decodeLine(Uint8ClampedArray.from(new Array(40).fill(0))) === null);

ok('ruido puro no produce un código',
  decodeLine(Uint8ClampedArray.from(
    Array.from({ length: 600 }, (_, i) => ((i * 2654435761) % 256)))) === null);

/* Con ruido encima de un código de verdad sí debe leerlo. */
const conRuido = pintarLinea(CIEN_ANOS, { modulo: 6 });
for (let i = 0; i < conRuido.length; i++) {
  conRuido[i] = Math.max(0, Math.min(255, conRuido[i] + (((i * 7919) % 41) - 20)));
}
ok('con ruido encima del código, lo lee igual', decodeLine(conRuido) === CIEN_ANOS);

/* ── UNA IMAGEN ENTERA ───────────────────────────────────────── */

grupo('BUSCAR EN UNA IMAGEN');
for (const ean of [CIEN_ANOS, PRINCIPITO, ORGULLO]) {
  const { data, ancho, alto } = pintarImagen(ean, { modulo: 4 });
  ok(`encuentra ${ean} en la imagen`, decodeImage(data, ancho, alto) === ean);
}

/* Una imagen donde la línea del centro está tapada: el barrido de
   varias líneas es justo para esto. */
const tapada = pintarImagen(PRINCIPITO, { modulo: 4 }, 61);
for (let x = 0; x < tapada.ancho; x++) {
  const p = (30 * tapada.ancho + x) * 4;
  tapada.data[p] = tapada.data[p + 1] = tapada.data[p + 2] = 128;
}
ok('con la línea central tapada, la encuentra en otra',
  decodeImage(tapada.data, tapada.ancho, tapada.alto) === PRINCIPITO);

/* Una imagen en blanco no debe devolver nada. */
const blanca = new Uint8ClampedArray(300 * 40 * 4).fill(255);
ok('una imagen en blanco no devuelve código', decodeImage(blanca, 300, 40) === null);

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
