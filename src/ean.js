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

/* ── DE UNA LÍNEA A LOS 95 MÓDULOS ───────────────────────────
   AQUÍ ESTABA EL FALLO QUE HACÍA QUE LA CÁMARA NO SIRVIERA.

     «Agregar libro por código de barras sigue sin funcionar.»

   La versión anterior suponía que el código iba «de la primera a la
   última marca oscura de la línea»: buscaba el primer píxel oscuro,
   el último, y repartía 95 módulos entre los dos. Eso funciona con un
   código dibujado solo sobre blanco —que es como estaba probado— y NO
   FUNCIONA NUNCA con una foto, porque en una foto siempre hay algo
   más oscuro en esa misma línea: el borde del libro, la mesa, la
   sombra, el texto de la contraportada. Con cualquiera de esas cosas,
   los 95 módulos se reparten a lo ancho de medio cuadro y se leen
   noventa y cinco sitios donde no hay nada.

   Medido con fotogramas realistas: 2 de 7. Y los 2 eran los de
   laboratorio.

   Peor todavía porque en el Safari del iPhone NO existe
   `BarcodeDetector`, así que este es el ÚNICO lector que hay. En ese
   teléfono el camino del código de barras no funcionó nunca.

   ── LO QUE HACE AHORA ───────────────────────────────────────

   No busca el código: busca SU GUARDA. Todo EAN-13 empieza y acaba
   con barra-espacio-barra de un módulo cada uno. Así que la línea se
   parte en tramos claros y oscuros, y cada vez que aparecen tres
   tramos seguidos de ancho parecido se prueba a leer un código desde
   ahí. El ancho de la guarda da el ancho del módulo, y la guarda del
   final —que tiene que caer a 95 módulos— lo afina y de paso confirma
   que aquello era un código y no tres rayas cualesquiera.

   Que se prueben muchos sitios no lo hace adivinar: el dígito de
   control tiene que cuadrar, y eso deja la probabilidad de acertar por
   casualidad en una entre diez. Con la estructura además obligada
   —guarda, paridad, guarda central, guarda final— es despreciable. */

/** La línea partida en tramos claros y oscuros. */
function tramosDe(lum, umbral) {
  const fuera = [];
  let x = 0;
  while (x < lum.length) {
    const oscuro = lum[x] < umbral;
    let hasta = x;
    while (hasta < lum.length && (lum[hasta] < umbral) === oscuro) hasta += 1;
    fuera.push({ x, ancho: hasta - x, oscuro });
    x = hasta;
  }
  return fuera;
}

/** ¿Los tres tramos de la guarda miden más o menos lo mismo? */
function guardaPlausible(a, b, c) {
  const m = (a + b + c) / 3;
  if (m < 0.7) return 0;
  /* Tolerancia ancha a propósito: con desenfoque una barra se come
     parte del espacio de al lado, y aun así el conjunto sigue siendo
     reconocible. Lo que no se tolera es que uno sea el doble que otro. */
  const cabe = (w) => w >= m * 0.45 && w <= m * 1.75;
  return cabe(a) && cabe(b) && cabe(c) ? m : 0;
}

/** Lee 95 módulos desde `inicio`, con `modulo` píxeles cada uno. */
function leerDesde(lum, umbral, inicio, modulo) {
  const fin = inicio + 95 * modulo;
  if (fin > lum.length + modulo) return null;
  let bits = '';
  for (let m = 0; m < 95; m++) {
    /* `floor` y no `round`: con módulos de un píxel, redondear el
       centro (x + 0,5) lo empuja AL MÓDULO SIGUIENTE y se lee todo
       corrido una columna. Lo cazó la prueba del módulo de 1 px. */
    const centro = Math.floor(inicio + (m + 0.5) * modulo);
    bits += lum[Math.min(lum.length - 1, Math.max(0, centro))] < umbral ? '1' : '0';
  }
  // Al derecho, y del revés por si el libro está boca abajo
  return decodeModules(bits) || decodeModules([...bits].reverse().join(''));
}

/** Un barrido completo con un umbral dado. */
function conUmbral(lum, umbral) {
  const tramos = tramosDe(lum, umbral);

  for (let i = 0; i + 2 < tramos.length; i++) {
    if (!tramos[i].oscuro) continue;
    const modulo = guardaPlausible(tramos[i].ancho, tramos[i + 1].ancho, tramos[i + 2].ancho);
    if (!modulo) continue;

    const inicio = tramos[i].x;
    if (inicio + 95 * modulo > lum.length + modulo) continue;

    /* AFINAR CON LA GUARDA DEL FINAL. Estimar el módulo con tres
       barras y estirarlo a noventa y cinco acumula error: un 3 % de
       más en la guarda son casi tres módulos de desvío al llegar al
       otro extremo, y ahí ya se lee la columna equivocada. Si hay un
       tramo oscuro que acabe cerca de donde debería acabar el código,
       ese es el borde de verdad y el módulo se recalcula con él. */
    const candidatos = [modulo];
    const finEsperado = inicio + 95 * modulo;
    for (let j = i + 3; j < tramos.length; j++) {
      const acaba = tramos[j].x + tramos[j].ancho;
      if (acaba < finEsperado - 4 * modulo) continue;
      if (acaba > finEsperado + 4 * modulo) break;
      if (tramos[j].oscuro) candidatos.push((acaba - inicio) / 95);
    }

    for (const m of candidatos) {
      const codigo = leerDesde(lum, umbral, inicio, m);
      if (codigo) return codigo;
    }
  }
  return null;
}

/**
 * Convierte una línea de luminancias en un EAN-13, o null.
 */
export function decodeLine(lum) {
  if (lum.length < 95) return null;

  let min = 255;
  let max = 0;
  for (let i = 0; i < lum.length; i++) {
    if (lum[i] < min) min = lum[i];
    if (lum[i] > max) max = lum[i];
  }
  // Una línea sin contraste no lleva ningún código
  if (max - min < 40) return null;

  /* Tres umbrales y no uno. Una foto rara vez está iluminada igual de
     un lado que del otro, y el punto medio entre el píxel más claro y
     el más oscuro de TODA la línea se desplaza en cuanto entra en el
     cuadro algo muy negro o un reflejo blanco. Probar también un poco
     por encima y por debajo cuesta dos barridos más y rescata las
     fotos con sombra en un lado. */
  for (const f of [0.5, 0.38, 0.62]) {
    const codigo = conUmbral(lum, min + (max - min) * f);
    if (codigo) return codigo;
  }
  return null;
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
