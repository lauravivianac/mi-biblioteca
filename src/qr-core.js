/* ─────────────────────────────────────────────────────────────
   CÓDIGO QR · el algoritmo entero  ·  historia #48

   POR QUÉ ESTÁ ESCRITO AQUÍ Y NO SE USA UNA LIBRERÍA.

   La app es HTML estático sin empaquetador y funciona sin conexión:
   el service worker guarda TODO lo que hace falta. Un guion traído de
   un CDN es una dependencia que puede caerse, cambiar o no llegar —y
   el QR es justo lo que quieres enseñar cuando estás delante de otra
   persona, que es cuando peor conexión hay—. Un código QR es un
   algoritmo cerrado y bien especificado, así que cabe entero aquí y
   así no depende de nadie.

   Se genera una MATRIZ de booleanos, no una imagen. Quien la pinte
   decide si es un canvas, un SVG o una tarjeta de 1080×1920; esta
   parte se puede probar en Node sin navegador, que es lo que permite
   comprobarla de verdad.

   Modo byte y corrección M (recupera ~15%), versiones 1 a 10. Una
   dirección de perfil son unos 40 caracteres y le sobra sitio; el
   nivel M es el que aguanta que la pantalla tenga huellas.

   SIEMPRE MODO BYTE, a propósito. El estándar tiene modos más
   compactos para texto solo-mayúsculas o solo-cifras, y un
   codificador completo elegiría entre ellos. Aquí lo que se codifica
   es siempre una dirección web con minúsculas, así que esos modos no
   entrarían nunca: implementarlos sería más código que mantener para
   ahorrar cero. Los códigos salen idénticos a los de una librería de
   referencia salvo en textos que sí podrían usar otro modo, y también
   esos se leen igual — comprobado con un decodificador ajeno.
   ───────────────────────────────────────────────────────────── */

/* ── ARITMÉTICA DEL CUERPO DE GALOIS GF(256) ─────────────────
   La corrección de errores Reed-Solomon vive aquí. Multiplicar en
   GF(256) es sumar logaritmos, así que se hacen las dos tablas una vez
   y el resto es mirar. El polinomio primitivo es el del estándar. */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;      // el polinomio primitivo del estándar
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/**
 * El polinomio generador de `grado` codewords de corrección.
 *
 * Es el producto (x−α⁰)(x−α¹)…, y los coeficientes van de MAYOR a menor
 * potencia, que es como los espera ecBytes. Escribirlo al revés da los
 * mismos números en orden inverso y un código que no lee nadie: la
 * primera versión de esto tenía ese fallo, y solo lo cazó intentar
 * leerlo con un decodificador ajeno.
 */
function generatorPoly(grado) {
  let g = [1];
  for (let i = 0; i < grado; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j];                      // ×x
      next[j + 1] ^= mul(g[j], EXP[i]);     // ×α^i
    }
    g = next;
  }
  return g;
}

/** Los codewords de corrección de un bloque de datos. */
function ecBytes(datos, cuantos) {
  const gen = generatorPoly(cuantos);
  const resto = new Array(cuantos).fill(0);
  for (const byte of datos) {
    const factor = byte ^ resto[0];
    resto.shift();
    resto.push(0);
    for (let i = 0; i < cuantos; i++) resto[i] ^= mul(gen[i + 1], factor);
  }
  return resto;
}

/* ── LAS TABLAS DEL ESTÁNDAR  ·  nivel M ─────────────────────
   Por versión: [codewords de corrección por bloque, bloques del grupo
   1, datos por bloque del grupo 1, bloques del grupo 2, datos por
   bloque del grupo 2]. Salen del estándar ISO/IEC 18004 y no se
   deducen de nada, así que se copian tal cual. */
const BLOQUES_M = {
  1: [10, 1, 16, 0, 0],
  2: [16, 1, 28, 0, 0],
  3: [26, 1, 44, 0, 0],
  4: [18, 2, 32, 0, 0],
  5: [24, 2, 43, 0, 0],
  6: [16, 4, 27, 0, 0],
  7: [18, 4, 31, 0, 0],
  8: [22, 2, 38, 2, 39],
  9: [22, 3, 36, 2, 37],
  10: [26, 4, 43, 1, 44],
};

/** Centros de los patrones de alineación, por versión. */
const ALINEACION = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

export const MAX_VERSION = 10;
export const sizeOf = (version) => 17 + version * 4;

/** Cuántos bytes de datos caben en una versión (nivel M). */
export function capacity(version) {
  const [, g1, d1, g2, d2] = BLOQUES_M[version];
  return g1 * d1 + g2 * d2;
}

/**
 * La versión más pequeña donde cabe el texto.
 *
 * Cabecera: 4 bits de modo + el contador de caracteres, que ocupa 8
 * bits hasta la versión 9 y 16 desde la 10. Devuelve null si no cabe
 * en ninguna — con una dirección de perfil no pasa nunca, pero decirlo
 * es mejor que generar un código que no se puede leer.
 */
export function pickVersion(bytes) {
  for (let v = 1; v <= MAX_VERSION; v++) {
    const cabecera = 4 + (v <= 9 ? 8 : 16);
    if (bytes.length + Math.ceil(cabecera / 8) <= capacity(v)) return v;
  }
  return null;
}

/** El texto, en bytes UTF-8. */
export const toBytes = (texto) => Array.from(new TextEncoder().encode(String(texto ?? '')));

/* ── LOS DATOS, EN CODEWORDS ─────────────────────────────────── */

function dataCodewords(bytes, version) {
  const bits = [];
  const push = (valor, cuantos) => {
    for (let i = cuantos - 1; i >= 0; i--) bits.push((valor >> i) & 1);
  };

  push(0b0100, 4);                                   // modo byte
  push(bytes.length, version <= 9 ? 8 : 16);         // cuántos caracteres
  for (const b of bytes) push(b, 8);

  const total = capacity(version) * 8;
  push(0, Math.min(4, total - bits.length));         // terminador
  while (bits.length % 8) bits.push(0);              // completar el byte

  const cw = [];
  for (let i = 0; i < bits.length; i += 8) {
    cw.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  }
  /* El relleno del estándar: estos dos bytes alternándose. No es
     decoración, el lector los espera exactamente así. */
  const RELLENO = [0xec, 0x11];
  while (cw.length < capacity(version)) cw.push(RELLENO[cw.length % 2 ? 1 : 0]);
  return cw;
}

/**
 * Trocear, corregir y entrelazar.
 *
 * El entrelazado es lo que hace que un arañazo se reparta entre varios
 * bloques en vez de destrozar uno entero: por eso se escriben las
 * columnas y no los bloques seguidos.
 */
function finalCodewords(bytes, version) {
  const [ecPorBloque, g1, d1, g2, d2] = BLOQUES_M[version];
  const datos = dataCodewords(bytes, version);

  const bloques = [];
  let i = 0;
  for (let n = 0; n < g1; n++) { bloques.push(datos.slice(i, i + d1)); i += d1; }
  for (let n = 0; n < g2; n++) { bloques.push(datos.slice(i, i + d2)); i += d2; }
  const ec = bloques.map((b) => ecBytes(b, ecPorBloque));

  const out = [];
  const masLargo = Math.max(...bloques.map((b) => b.length));
  for (let c = 0; c < masLargo; c++) {
    for (const b of bloques) if (c < b.length) out.push(b[c]);
  }
  for (let c = 0; c < ecPorBloque; c++) {
    for (const e of ec) out.push(e[c]);
  }
  return out;
}

/* ── LA MATRIZ ───────────────────────────────────────────────── */

const nueva = (n, v) => Array.from({ length: n }, () => new Array(n).fill(v));

function ponPatrones(m, reservado, version) {
  const n = m.length;

  /* Las tres esquinas: el ojo de 7×7 con su separador */
  const ojo = (fila, col) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const y = fila + r; const x = col + c;
        if (y < 0 || y >= n || x < 0 || x >= n) continue;
        const dentro = r >= 0 && r <= 6 && c >= 0 && c <= 6
          && (r === 0 || r === 6 || c === 0 || c === 6
            || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        m[y][x] = dentro;
        reservado[y][x] = true;
      }
    }
  };
  ojo(0, 0); ojo(0, n - 7); ojo(n - 7, 0);

  /* Las dos líneas de puntos que dan la escala */
  for (let i = 8; i < n - 8; i++) {
    m[6][i] = i % 2 === 0; reservado[6][i] = true;
    m[i][6] = i % 2 === 0; reservado[i][6] = true;
  }

  /* Los cuadraditos de alineación, salvo donde pisarían un ojo */
  const centros = ALINEACION[version];
  for (const fila of centros) {
    for (const col of centros) {
      const enOjo = (fila <= 8 && col <= 8)
        || (fila <= 8 && col >= n - 9) || (fila >= n - 9 && col <= 8);
      if (enOjo) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          m[fila + r][col + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
          reservado[fila + r][col + c] = true;
        }
      }
    }
  }

  /* El módulo que siempre está encendido, y el hueco del formato */
  m[n - 8][8] = true; reservado[n - 8][8] = true;
  for (let i = 0; i < 9; i++) {
    if (!reservado[8][i]) { m[8][i] = false; reservado[8][i] = true; }
    if (!reservado[i][8]) { m[i][8] = false; reservado[i][8] = true; }
  }
  for (let i = 0; i < 8; i++) {
    if (!reservado[8][n - 1 - i]) { m[8][n - 1 - i] = false; reservado[8][n - 1 - i] = true; }
    if (!reservado[n - 1 - i][8]) { m[n - 1 - i][8] = false; reservado[n - 1 - i][8] = true; }
  }

  /* Desde la versión 7 el número de versión va escrito, dos veces */
  if (version >= 7) {
    let bits = version << 12;
    for (let i = 0; i < 12; i++) {
      if (bits >> (17 - i) & 1) bits ^= 0x1f25 << (5 - i);
    }
    const info = (version << 12) | (bits & 0xfff);
    for (let i = 0; i < 18; i++) {
      const bit = (info >> i) & 1;
      const r = Math.floor(i / 3); const c = i % 3;
      m[r][n - 11 + c] = !!bit; reservado[r][n - 11 + c] = true;
      m[n - 11 + c][r] = !!bit; reservado[n - 11 + c][r] = true;
    }
  }
}

/** El zigzag de dos columnas, de abajo a la derecha hacia arriba. */
function ponDatos(m, reservado, codewords) {
  const n = m.length;
  const bits = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);

  let i = 0;
  let subiendo = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;                    // la columna de puntos no cuenta
    for (let paso = 0; paso < n; paso++) {
      const fila = subiendo ? n - 1 - paso : paso;
      for (let d = 0; d < 2; d++) {
        const c = col - d;
        if (reservado[fila][c]) continue;
        m[fila][c] = i < bits.length ? !!bits[i] : false;
        i++;
      }
    }
    subiendo = !subiendo;
  }
}

const MASCARAS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** El formato: nivel de corrección y máscara, con su BCH y su XOR. */
function ponFormato(m, mascara) {
  const n = m.length;
  const datos = (0b00 << 3) | mascara;          // 00 = nivel M
  let bits = datos << 10;
  for (let i = 0; i < 5; i++) {
    if (bits >> (14 - i) & 1) bits ^= 0x537 << (4 - i);
  }
  const info = ((datos << 10) | (bits & 0x3ff)) ^ 0x5412;

  for (let i = 0; i < 15; i++) {
    const bit = !!((info >> i) & 1);
    // la copia de alrededor del ojo de arriba a la izquierda
    if (i < 6) m[i][8] = bit;
    else if (i < 8) m[i + 1][8] = bit;
    else if (i === 8) m[8][7] = bit;
    else m[8][14 - i] = bit;
    // y la copia repartida entre los otros dos
    if (i < 8) m[8][n - 1 - i] = bit;
    else m[n - 15 + i][8] = bit;
  }
}

/* Las cuatro penalizaciones del estándar. Se prueban las ocho máscaras
   y gana la de menos puntos: es lo que evita que salgan bandas o
   cuadrados grandes que confunden al lector. */
function penalizacion(m) {
  const n = m.length;
  let p = 0;

  const seguidas = (get) => {
    for (let a = 0; a < n; a++) {
      let run = 1;
      for (let b = 1; b < n; b++) {
        if (get(a, b) === get(a, b - 1)) run++;
        else { if (run >= 5) p += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) p += 3 + (run - 5);
    }
  };
  seguidas((r, c) => m[r][c]);
  seguidas((c, r) => m[r][c]);

  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3;
    }
  }

  /* El patrón que se parece a un ojo: si aparece en los datos, el
     lector puede confundirlo con una esquina. */
  const MALO = [true, false, true, true, true, false, true, false, false, false, false];
  const MALO2 = [false, false, false, false, true, false, true, true, true, false, true];
  const casa = (get, a, b, pat) => pat.every((v, k) => get(a, b + k) === v);
  for (let a = 0; a < n; a++) {
    for (let b = 0; b + 11 <= n; b++) {
      if (casa((x, y) => m[x][y], a, b, MALO) || casa((x, y) => m[x][y], a, b, MALO2)) p += 40;
      if (casa((x, y) => m[y][x], a, b, MALO) || casa((x, y) => m[y][x], a, b, MALO2)) p += 40;
    }
  }

  let oscuros = 0;
  for (const fila of m) for (const v of fila) if (v) oscuros++;
  const pct = (oscuros * 100) / (n * n);
  p += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return p;
}

/**
 * El código QR de un texto, como matriz de booleanos.
 *
 * `true` es módulo oscuro. Devuelve null si el texto no cabe.
 */
export function qrMatrix(texto) {
  const bytes = toBytes(texto);
  const version = pickVersion(bytes);
  if (!version) return null;

  const n = sizeOf(version);
  const codewords = finalCodewords(bytes, version);

  let mejor = null;
  for (let mascara = 0; mascara < 8; mascara++) {
    const m = nueva(n, false);
    const reservado = nueva(n, false);
    ponPatrones(m, reservado, version);
    ponDatos(m, reservado, codewords);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!reservado[r][c] && MASCARAS[mascara](r, c)) m[r][c] = !m[r][c];
      }
    }
    ponFormato(m, mascara);
    const p = penalizacion(m);
    if (!mejor || p < mejor.p) mejor = { m, p, mascara };
  }
  return mejor.m;
}

/**
 * El mismo código, como SVG.
 *
 * SVG y no canvas porque un perfil se enseña en una pantalla que puede
 * ser cualquier tamaño, y un QR borroso no se lee. El borde blanco no
 * es margen bonito: sin él, muchos lectores no encuentran el código.
 */
export function qrSvg(texto, { tam = 240, borde = 4, oscuro = '#000', claro = '#fff' } = {}) {
  const m = qrMatrix(texto);
  if (!m) return null;
  const n = m.length;
  const total = n + borde * 2;

  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (m[r][c]) d += `M${c + borde} ${r + borde}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" `
    + `viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" `
    + `aria-label="Código QR del perfil">`
    + `<rect width="${total}" height="${total}" fill="${claro}"/>`
    + `<path d="${d}" fill="${oscuro}"/></svg>`;
}
