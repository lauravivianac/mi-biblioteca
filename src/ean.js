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

/* ── LEER POR ANCHOS DE TRAMO, NO POR PÍXELES SUELTOS ────────

   La foto que lo destapó: un código de barras nítido, grande y
   centrado, y el lector no lo leía. Ni una sola de 57 filas.

   Se muestreaba UN PÍXEL en el centro de cada módulo y se comparaba
   con el umbral. Medido contra esa foto: aun encontrando la geometría
   PERFECTA a base de fuerza bruta —probando todos los inicios y todos
   los anchos de módulo— salían 12 módulos mal de 95. O sea que no era
   que no encontrara dónde empezar: es que con una foto de verdad ese
   método no puede leer, se ponga donde se ponga.

   El motivo es el desenfoque. En una foto una barra no acaba de golpe:
   se degrada hacia el blanco a lo largo de un par de píxeles. El centro
   de un módulo estrecho cae en esa pendiente, y de qué lado del umbral
   queda es una moneda al aire. Noventa y cinco monedas al aire.

   Los lectores de verdad no hacen eso. Miden ANCHOS: cada dígito son
   siete módulos repartidos en exactamente cuatro tramos, y se compara
   la proporción entre esos cuatro anchos con las diez posibles. Es
   robusto por dos motivos:

     · el desenfoque ensancha la barra tanto como estrecha el espacio
       de al lado, así que la SUMA de los cuatro se conserva;
     · y cada dígito se mide con sus propios tramos, así que un error
       de escala no se acumula a lo largo del código — que es lo que
       hacía que los errores crecieran hacia la derecha. */

/** Un patrón de bits a los anchos de sus cuatro tramos: '0001101' → [3,2,1,1] */
function anchosDe(bits) {
  const fuera = [];
  let n = 1;
  for (let i = 1; i <= bits.length; i++) {
    if (bits[i] === bits[i - 1]) { n += 1; continue; }
    fuera.push(n);
    n = 1;
  }
  return fuera;
}

const ANCHOS = { L: L.map(anchosDe), G: G.map(anchosDe), R: R.map(anchosDe) };

/* Cuánto se le permite desviarse a un dígito, en módulos sumando los
   cuatro tramos. Un dígito bien medido se queda por debajo de 0,5; con
   una foto movida sube. Por encima de 1,5 ya no se distingue de otro
   dígito y es mejor no adivinar: para eso está el dígito de control,
   pero cuanto menos llegue hasta él, mejor. */
const TOLERANCIA = 1.5;

/**
 * Qué dígito es este grupo de cuatro tramos.
 *
 * Se normaliza a siete módulos con la SUMA de los cuatro, no con el
 * módulo estimado del código: así cada dígito se mide consigo mismo y
 * da igual que el código esté un poco escorado o que la cámara lo vea
 * en perspectiva.
 */
function digitoDe(anchos, familias) {
  const total = anchos[0] + anchos[1] + anchos[2] + anchos[3];
  if (!total) return null;
  const escala = 7 / total;

  let mejor = null;
  for (const familia of familias) {
    const tabla = ANCHOS[familia];
    for (let d = 0; d < 10; d++) {
      let error = 0;
      for (let k = 0; k < 4; k++) error += Math.abs(anchos[k] * escala - tabla[d][k]);
      if (!mejor || error < mejor.error) mejor = { d, familia, error };
    }
  }
  return mejor && mejor.error <= TOLERANCIA ? mejor : null;
}

/** ¿Estos tramos son una guarda: n tramos de un módulo cada uno? */
function esGuarda(anchos, modulo) {
  return anchos.every((w) => w >= modulo * 0.35 && w <= modulo * 2.2);
}

/**
 * Leer un EAN-13 empezando en el tramo `i`, que debe ser la guarda.
 *
 * Devuelve los trece dígitos o null. La estructura está fijada por la
 * norma —guarda, seis dígitos, guarda central, seis dígitos, guarda— y
 * cada pieza que no cuadra corta la lectura: por eso encontrar un
 * código donde no lo hay es tan improbable.
 */
function leerTramos(tramos, i) {
  const ancho = (k) => tramos[k]?.ancho ?? 0;

  /* La guarda de la izquierda da la primera idea del módulo. */
  const modulo = (ancho(i) + ancho(i + 1) + ancho(i + 2)) / 3;
  if (modulo < 2) return null;
  if (!esGuarda([ancho(i), ancho(i + 1), ancho(i + 2)], modulo)) return null;

  let k = i + 3;
  const izquierda = [];
  let paridad = '';
  for (let n = 0; n < 6; n++, k += 4) {
    const g = digitoDe([ancho(k), ancho(k + 1), ancho(k + 2), ancho(k + 3)], ['L', 'G']);
    if (!g) return null;
    izquierda.push(g.d);
    paridad += g.familia === 'L' ? '0' : '1';
  }

  /* La guarda central: cinco tramos de un módulo. */
  if (!esGuarda([ancho(k), ancho(k + 1), ancho(k + 2), ancho(k + 3), ancho(k + 4)], modulo)) return null;
  k += 5;

  const derecha = [];
  for (let n = 0; n < 6; n++, k += 4) {
    const g = digitoDe([ancho(k), ancho(k + 1), ancho(k + 2), ancho(k + 3)], ['R']);
    if (!g) return null;
    derecha.push(g.d);
  }

  if (!esGuarda([ancho(k), ancho(k + 1), ancho(k + 2)], modulo)) return null;

  /* La paridad de los seis de la izquierda ES el primer dígito. */
  const primero = PARIDAD.indexOf(paridad);
  if (primero < 0) return null;

  const codigo = `${primero}${izquierda.join('')}${derecha.join('')}`;
  return checksumOk(codigo) ? codigo : null;
}

/** Un barrido completo con un umbral dado. */
function conUmbral(lum, umbral) {
  const tramos = tramosDe(lum, umbral);

  /* Al derecho y del revés: un libro se fotografía boca abajo con la
     misma facilidad que del derecho. */
  const alReves = [...tramos].reverse();

  for (const lista of [tramos, alReves]) {
    for (let i = 0; i + 58 < lista.length; i++) {
      if (!lista[i].oscuro) continue;
      const codigo = leerTramos(lista, i);
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
