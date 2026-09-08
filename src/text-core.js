/* ─────────────────────────────────────────────────────────────
   QUITAR TILDES SIN QUITAR LA EÑE

   Existe porque este fallo se ha escrito DOS VECES en este repo: una
   en el filtro de comentarios (#51) y otra en los nombres de ciudad
   (#81). Las dos veces con el mismo código de manual, y las dos veces
   convirtiendo «año» en «ano» y «La Coruña» en «La Coruna».

   El motivo es que `normalize('NFD')` parte la ñ en una n y una
   virgulilla suelta, y el barrido de acentos se lleva la virgulilla.
   En castellano la ñ NO es una n con adorno: es otra letra, y dos
   ciudades que se llaman distinto no pueden acabar llamándose igual.

   Así que la operación vive aquí una sola vez. La tercera vez que
   alguien la necesite, que la importe.
   ───────────────────────────────────────────────────────────── */

/* Un carácter que no aparece en ningún texto real, para esconder la ñ
   mientras pasa el barrido y devolverla después. */
const REFUGIO = '\u0001';

/** Minúsculas y sin tildes, pero con las eñes intactas. */
export function sinTildes(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .replace(/ñ/g, REFUGIO)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(new RegExp(REFUGIO, 'g'), 'ñ');
}

/** Espacios de sobra fuera, y los de dentro a uno solo. */
export const unSoloEspacio = (texto) => String(texto ?? '').replace(/\s+/g, ' ').trim();

/* ─────────────────────────────────────────────────────────────
   ¿ESTO QUE LEYÓ EL OCR ES TEXTO, O ES BASURA?  ·  historia #25

     Foto de «LA CABINA DE LOS ÚLTIMOS PENSAMIENTOS», de Lee Su-Yeon,
     nítida y legible. El OCR devolvió:  \ a — DE

   Y eso acabó ESCRITO EN EL CAMPO DEL TÍTULO, con la ficha diciendo
   «sin identificar, revisa los datos». O sea que además de no haber
   servido de nada, deja trabajo: hay que borrar la basura antes de
   poder escribir el título a mano.

   Un campo vacío con un aviso honesto es MEJOR que un campo con
   `\ a — DE`. No es una cuestión de elegancia: es que el vacío se
   rellena y la basura primero se borra.

   ── QUÉ SE CONSIDERA TEXTO ──────────────────────────────────

   No se intenta adivinar si es un título de verdad —eso no se puede
   saber— sino descartar lo que con seguridad no lo es. Basta con
   exigir una palabra: cuatro letras seguidas. Ningún título del mundo
   tiene menos, y ninguna basura de OCR las tiene por casualidad.
   ───────────────────────────────────────────────────────────── */

/* Las letras que cuentan, con las de las lenguas que la app va a ver.
   La ñ y las vocales acentuadas son letras: sin ellas, «MAÑANA» tendría
   un agujero en medio. */
const LETRA = /[a-záéíóúüñçàèìòùâêîôûäëïöÿ]/i;

/** ¿La palabra más larga de esta línea llega a cuatro letras? */
export function palabraMasLarga(linea) {
  let mejor = 0;
  let actual = 0;
  for (const c of String(linea ?? '')) {
    if (LETRA.test(c)) { actual += 1; if (actual > mejor) mejor = actual; } else actual = 0;
  }
  return mejor;
}

/**
 * ¿Esta línea del OCR se puede enseñar como texto?
 *
 * Se pide UNA palabra de cuatro letras. Es un listón bajo a propósito:
 * lo que hay que evitar es escribir basura en un campo, no acertar el
 * título — para eso están los catálogos y el agente.
 */
export const pareceTexto = (linea, minimo = 4) => palabraMasLarga(linea) >= minimo;

/**
 * La mejor línea de lo que leyó el OCR, o cadena vacía.
 *
 * La más larga de las que parecen texto, no la primera: en una portada
 * la primera línea suele ser la editorial o un adorno, y la más larga
 * suele ser el título. Antes se cogía la primera sin mirar, que es como
 * `\ a — DE` acabó en el campo.
 */
export function mejorLinea(texto, minimo = 4) {
  return String(texto ?? '')
    .split(/[\n·|]/)
    .map(unSoloEspacio)
    .filter((l) => pareceTexto(l, minimo))
    .sort((a, b) => b.length - a.length)[0] || '';
}
