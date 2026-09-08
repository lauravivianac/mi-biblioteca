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

/* ── UN FOTOGRAMA DE CÁMARA, QUE NO ES UNA IMAGEN DE LABORATORIO ──

   «Agregar libro por código de barras sigue sin funcionar.»

   Y llevaba sin funcionar desde el principio, con estas pruebas en
   verde. Todo lo de arriba dibuja el código SOLO, sobre blanco,
   ocupando la línea entera — y el lector suponía justo eso: que el
   código iba «de la primera a la última marca oscura». En una foto
   nunca es así. Siempre hay algo más oscuro en la misma línea: el
   borde del libro, la mesa, la sombra, el texto de la contraportada.
   Con cualquiera de ellas, los 95 módulos se repartían a lo ancho de
   medio cuadro.

   Medido con estos mismos fotogramas antes del arreglo: 2 de 7, y los
   2 eran de laboratorio. En el Safari del iPhone, donde no existe
   `BarcodeDetector` y este es el único lector, ese camino no funcionó
   nunca.

   Así que ahora se prueba con el cuadro entero y con lo que hay
   alrededor de verdad. */

grupo('UN FOTOGRAMA DE CÁMARA');

/**
 * Un cuadro como el que da la cámara: el código en su sitio, y
 * alrededor lo que hay en una contraportada.
 */
function fotograma({
  ancho = 1920, alto = 432, modulo = 3, x0 = 700,
  bordes = true, texto = true, ruido = 6, ean = CIEN_ANOS, conCodigo = true,
} = {}) {
  const bits = codificar(ean);
  const data = new Uint8ClampedArray(ancho * alto * 4);
  let semilla = 1;
  const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      let v = 210;                                        // la página
      if (bordes && (x < 40 || x > ancho - 60)) v = 45;    // el libro y la mesa
      if (texto && ((y < 90 && y % 14 < 7) || (y > alto - 90 && y % 14 < 7))
          && x > 120 && x < 640) v = 60;                  // renglones impresos
      if (conCodigo && x >= x0 && x < x0 + bits.length * modulo && y > 60 && y < alto - 60) {
        v = bits[Math.floor((x - x0) / modulo)] === '1' ? 25 : 235;
      }
      const c = Math.max(0, Math.min(255, v + (azar() * 2 - 1) * ruido));
      const p = (y * ancho + x) * 4;
      data[p] = data[p + 1] = data[p + 2] = c;
      data[p + 3] = 255;
    }
  }
  return { data, ancho, alto };
}

const leeFotograma = (op = {}) => {
  const f = fotograma(op);
  return decodeImage(f.data, f.ancho, f.alto);
};

ok('EL CASO DE LAURA · con el borde del libro y el texto alrededor',
  leeFotograma() === CIEN_ANOS);
ok('con el libro más cerca', leeFotograma({ modulo: 5, x0: 500 }) === CIEN_ANOS);
ok('con el libro más lejos', leeFotograma({ modulo: 2, x0: 900 }) === CIEN_ANOS);
ok('descentrado a la izquierda', leeFotograma({ x0: 150 }) === CIEN_ANOS);
ok('descentrado a la derecha', leeFotograma({ x0: 1300 }) === CIEN_ANOS);
ok('con sombra en un lado (poco contraste)',
  leeFotograma({ ruido: 14 }) === CIEN_ANOS);
ok('y con otro libro distinto', leeFotograma({ ean: ORGULLO }) === ORGULLO);

/* ── Y LO QUE NO PUEDE PASAR ─────────────────────────────────
   Ahora el lector prueba muchos puntos de arranque en cada línea, así
   que hay que asegurarse de que no se INVENTA un código. El dígito de
   control es lo que lo impide, y esto lo comprueba. */
ok('una contraportada SIN código no devuelve nada',
  leeFotograma({ conCodigo: false }) === null);

let inventados = 0;
for (let s = 0; s < 40; s++) {
  const ancho = 900;
  const alto = 60;
  const data = new Uint8ClampedArray(ancho * alto * 4);
  let semilla = s * 7919 + 13;
  for (let i = 0; i < ancho * alto; i++) {
    semilla = (semilla * 1103515245 + 12345) % 2147483648;
    const c = (semilla / 2147483648) * 255;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = c;
    data[i * 4 + 3] = 255;
  }
  if (decodeImage(data, ancho, alto)) inventados += 1;
}
ok('cuarenta imágenes de ruido puro y ningún código inventado',
  inventados === 0, `se inventó ${inventados}`);

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
