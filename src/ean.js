/* ─────────────────────────────────────────────────────────────
   LECTOR DE CÓDIGO DE BARRAS  ·  historia #25

   El código de barras de un libro es SIEMPRE un EAN-13: es el ISBN.
   Eso permite escribir el lector entero aquí, en vez de descargar una
   librería genérica de 400 KB que además sabe leer códigos QR, Aztec
   y Data Matrix que ningún libro lleva.

   Y hay una razón mejor: `BarcodeDetector`, que es lo que trae el
   navegador, NO existe en Safari de iPhone. Sin este respaldo, el
   camino del código de barras estaba muerto para media biblioteca.
   Escrito aquí funciona en todas partes, sin descargar nada y sin
   conexión.

   Sin DOM a propósito: recibe píxeles y devuelve dígitos, así que se
   puede probar con un código dibujado a mano.
   ───────────────────────────────────────────────────────────── */

/* Las tres codificaciones de cada dígito. En la mitad izquierda cada
   dígito va en L o en G, y CUÁL de las dos se usa en cada posición es
   lo que codifica el primer dígito del número — el EAN-13 mete 13
   dígitos en sitio para 12. */
const L = ['0001101', '0011001', '0010011', '0111101', '0100011',
           '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101',
           '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = ['1110010', '1100110', '1101100', '1000010', '1011100',
           '1001110', '1010000', '1000100', '1001000', '1110100'];

/** Qué mezcla de L y G lleva cada primer dígito. */
const PARIDAD = ['000000', '001011', '001101', '001110', '010011',
                 '011001', '011100', '010101', '010110', '011010'];

const START = '101';
const MEDIO = '01010';

/** El dígito de control del EAN-13, que es el mismo del ISBN-13. */
export function checksumOk(digitos) {
  if (!/^\d{13}$/.test(digitos)) return false;
  let suma = 0;
  for (let i = 0; i < 12; i++) suma += Number(digitos[i]) * (i % 2 ? 3 : 1);
  return (10 - (suma % 10)) % 10 === Number(digitos[12]);
}

/**
 * Decodifica los 95 módulos de un EAN-13.
 * Devuelve los 13 dígitos, o null si no cuadra.
 */
export function decodeModules(bits) {
  if (bits.length !== 95) return null;
  if (bits.slice(0, 3) !== START) return null;
  if (bits.slice(45, 50) !== MEDIO) return null;
  if (bits.slice(92) !== START) return null;

  let paridad = '';
  let izquierda = '';
  for (let i = 0; i < 6; i++) {
    const trozo = bits.slice(3 + i * 7, 10 + i * 7);
    const enL = L.indexOf(trozo);
    const enG = G.indexOf(trozo);
    if (enL >= 0) { izquierda += enL; paridad += '0'; }
    else if (enG >= 0) { izquierda += enG; paridad += '1'; }
    else return null;
  }

  const primero = PARIDAD.indexOf(paridad);
  if (primero < 0) return null;

  let derecha = '';
  for (let i = 0; i < 6; i++) {
    const trozo = bits.slice(50 + i * 7, 57 + i * 7);
    const enR = R.indexOf(trozo);
    if (enR < 0) return null;
    derecha += enR;
  }

  const codigo = `${primero}${izquierda}${derecha}`;
  return checksumOk(codigo) ? codigo : null;
}

/**
 * Convierte una línea de luminancias en los 95 módulos.
 *
 * El barrido se apoya en que el código ocupa de la primera a la
 * última marca oscura de la línea: se mide ese ancho, se divide entre
 * 95 y se lee el centro de cada módulo. Es sencillo y se rompe si hay
 * otra cosa oscura en la misma línea — por eso se prueban muchas
 * líneas y se exige el dígito de control, que hace que un acierto por
 * casualidad sea prácticamente imposible.
 */
export function decodeLine(lum) {
  const ancho = lum.length;
  if (ancho < 95) return null;

  let min = 255;
  let max = 0;
  for (let i = 0; i < ancho; i++) {
    if (lum[i] < min) min = lum[i];
    if (lum[i] > max) max = lum[i];
  }
  // Una línea sin contraste no lleva ningún código
  if (max - min < 40) return null;
  const umbral = (min + max) / 2;

  let inicio = -1;
  let fin = -1;
  for (let i = 0; i < ancho; i++) if (lum[i] < umbral) { inicio = i; break; }
  for (let i = ancho - 1; i >= 0; i--) if (lum[i] < umbral) { fin = i; break; }
  // El código ocupa 95 módulos, así que hacen falta 95 píxeles como
  // mínimo: `fin` es un índice, no un ancho.
  if (inicio < 0 || fin - inicio + 1 < 95) return null;

  const modulo = (fin - inicio + 1) / 95;
  let bits = '';
  for (let m = 0; m < 95; m++) {
    const centro = Math.floor(inicio + (m + 0.5) * modulo);
    bits += lum[Math.min(ancho - 1, centro)] < umbral ? '1' : '0';
  }

  // Al derecho, y del revés por si el libro está boca abajo
  return decodeModules(bits)
      || decodeModules([...bits].reverse().join(''));
}

/** Luminancia de un píxel RGBA, ponderada como la ve el ojo. */
const lumDe = (d, p) => 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];

/**
 * Busca un EAN-13 en una imagen, barriendo varias líneas horizontales.
 *
 * Varias y no una: la del centro puede caer justo en el hueco entre
 * los dígitos impresos, o en un reflejo. Se empieza por el centro,
 * que es donde la gente apunta, y se abre hacia los bordes.
 */
export function decodeImage(data, ancho, alto, { lineas = 21 } = {}) {
  const lum = new Uint8ClampedArray(ancho);

  for (let n = 0; n < lineas; n++) {
    // 0, +1, −1, +2, −2… desde el centro
    const paso = Math.ceil(n / 2) * (n % 2 ? 1 : -1);
    const y = Math.round(alto / 2 + (paso * alto) / (lineas + 1));
    if (y < 0 || y >= alto) continue;

    const fila = y * ancho * 4;
    for (let x = 0; x < ancho; x++) lum[x] = lumDe(data, fila + x * 4);

    const codigo = decodeLine(lum);
    if (codigo) return codigo;
  }
  return null;
}
