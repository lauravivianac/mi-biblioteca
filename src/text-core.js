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
