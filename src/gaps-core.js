/* ─────────────────────────────────────────────────────────────
   LOS HUECOS DEL PLAN  ·  historia #65

   Un plan lector con meses vacíos no es un plan a medias: es un plan
   que te va a fallar en marzo. Y hasta ahora esos meses ni siquiera se
   veían —la pantalla del plan solo pintaba los meses CON libros, así
   que un hueco era literalmente invisible—.

   Este módulo hace dos cosas:

     1. Encontrar los huecos, y saber qué le falta a cada uno: un
        ⚓ Ancla si el mes está vacío del todo, un ⚡ Corto si ya hay
        ancla pero sobra tiempo.

     2. Proponer con QUÉ llenarlos, usando el mismo criterio que el
        generador del plan (E10) —temporada, equilibrio de géneros y
        capacidad— más lo que se sabe de tu gusto (#62).

   Que el criterio sea EL MISMO no es elegancia: SEASON y la penalización
   por repetir género se importan de plan-core.js a propósito. Con dos
   tablas separadas, la app te diría que el terror va en octubre al
   repartir el año y otra cosa distinta al rellenar un mes, y tendrías
   razón en no fiarte de ninguna de las dos.

   Sin Firebase: se prueba en Node.
   ───────────────────────────────────────────────────────────── */

import { MONTH_ORDER, pageCount } from './seed.js';
import { SEASON, isAnchor } from './plan-core.js';

/** Por debajo de esto, lo que queda del mes no da para otro libro. */
const MINIMO_UTIL = 90;

/** Los estados que pueden ocupar un hueco. */
const DISPONIBLE = new Set(['pending', 'wished']);

/**
 * Qué le falta a cada mes del año.
 *
 * `libros` son entradas ya fusionadas con su estado. `capacidad` son
 * las páginas que caben en un mes a tu ritmo real (de readingPace).
 *
 * Un mes con un tocho de 900 páginas NO tiene hueco aunque solo tenga
 * un libro: la capacidad manda sobre el número de libros, que es lo
 * mismo que hace el generador.
 */
export function findGaps(libros = [], { year, capacidad = 600, desdeMes = null } = {}) {
  const empiezaEn = desdeMes ? MONTH_ORDER.indexOf(desdeMes) : 0;

  return MONTH_ORDER.map((month, i) => {
    const delMes = libros.filter((b) => b.year === year && b.month === month);
    const paginas = delMes.reduce((a, b) => a + (pageCount(b.pages) || 0), 0);
    const libre = Math.round(capacidad - paginas);
    const tieneAncla = delMes.some(isAnchor);

    return {
      month,
      indice: i,
      libros: delMes,
      paginas,
      libre,
      /* Vacío del todo, o con sitio de sobra para uno corto. */
      vacio: delMes.length === 0,
      hueco: delMes.length === 0 || (libre >= MINIMO_UTIL && delMes.length < 2),
      /* Lo que le falta: sin nada, un Ancla que sostenga el mes; con
         ancla y tiempo de sobra, un Corto que lo remate. */
      necesita: delMes.length === 0 ? 'ancla' : (tieneAncla ? 'corto' : 'ancla'),
      pasado: i < empiezaEn,
    };
  });
}

/** Solo los que se pueden llenar: hay hueco y no son un mes ya pasado. */
export const fillableGaps = (gaps) => gaps.filter((g) => g.hueco && !g.pasado);

/**
 * Con qué llenar un hueco concreto.
 *
 * `taste` es opcional y es una función (libro) → {score, porque}: el
 * perfil de gusto de #62 entra si está, y si no el hueco se llena
 * igual. Como en todo lo demás, lo que no depende de nada tiene que
 * seguir funcionando solo.
 */
export function candidatesForGap(libros = [], hueco, {
  taste = null, limit = 3, exclude = [], generosCerca = [],
} = {}) {
  if (!hueco) return [];
  const fuera = new Set(exclude);
  const objetivo = hueco.necesita === 'ancla'
    ? Math.max(hueco.libre, 200) * 0.9
    : Math.min(hueco.libre, 220) * 0.7;

  return libros
    .filter((b) => DISPONIBLE.has(b.status))
    .filter((b) => !fuera.has(b.id))
    /* Lo que ya está colocado en otro mes de este plan no es candidato:
       moverlo de sitio es rehacer el plan, no llenar un hueco. */
    .filter((b) => !(b.month && b.month !== hueco.month))
    .map((b) => ({ ...b, ...puntuar(b, hueco, { objetivo, taste, generosCerca }) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function puntuar(cand, hueco, { objetivo, taste, generosCerca }) {
  const paginas = pageCount(cand.pages) || 250;
  const deTemporada = (SEASON[hueco.month] || []).includes(cand.genre);
  const repite = generosCerca.includes(cand.genre);
  let score = 0;
  let porque = null;

  /* La temporada pesa mucho, igual que en el generador: hay once meses
     más donde meter un thriller, pero el terror de octubre solo cae en
     octubre. Es lo que conserva el carácter del plan hecho a mano. */
  if (deTemporada) {
    score += 70;
    porque = `${cand.genre} encaja con ${hueco.month}`;
  }

  /* «No cuatro thrillers seguidos», que pide la historia con esas
     palabras. Mirar los meses de al lado y no el año entero es lo
     correcto: repetir género en enero y en octubre no molesta a nadie. */
  if (repite) {
    score -= 60;
    if (!porque) porque = `Repite género con los meses de al lado`;
  }

  /* Que quepa. Un Ancla puede pasarse un poco —para eso el plan permite
     arrastrar—, pero un Corto que no cabe deja de ser corto. */
  const tolerancia = hueco.necesita === 'ancla' ? 160 : 45;
  score -= Math.abs(paginas - objetivo) / tolerancia;
  if (hueco.necesita === 'corto' && paginas > hueco.libre) score -= 60;

  /* El rol que pide el hueco. */
  const esAncla = isAnchor(cand);
  if (hueco.necesita === 'ancla' && esAncla) {
    score += 25;
    if (!porque) porque = `Un ⚓ Ancla para sostener ${hueco.month}`;
  } else if (hueco.necesita === 'corto' && !esAncla) {
    score += 25;
    if (!porque) porque = `Un ⚡ Corto para lo que queda de ${hueco.month}`;
  } else {
    score -= 20;
  }

  if (cand.status === 'wished') score += 10;

  /* Y por último tu gusto, que aquí desempata en vez de mandar: el
     hueco tiene forma —un tamaño, un mes, un género que no repetir— y
     esa forma es lo que hay que respetar primero. Un libro que te
     encanta pero no cabe sigue sin caber. */
  if (taste) {
    const t = taste(cand) || {};
    score += Math.round((t.score || 0) * 0.4);
    if (!porque && t.porque) porque = t.porque;
  }

  return { score: Math.round(score), porque: porque || `Cabe en ${hueco.month}` };
}

/**
 * Los géneros de los meses vecinos, que son con los que no conviene
 * repetir. Se miran los dos de antes y los dos de después.
 */
export function nearbyGenres(gaps, indice) {
  const cerca = [];
  for (const d of [-2, -1, 1, 2]) {
    const g = gaps[indice + d];
    if (g) cerca.push(...g.libros.map((b) => b.genre));
  }
  return [...new Set(cerca.filter(Boolean))];
}

/** Cómo se cuenta el hueco en la pantalla. */
export function describeGap(hueco) {
  if (!hueco) return '';
  if (hueco.vacio) return `${hueco.month} está vacío`;
  return `A ${hueco.month} le caben unas ${hueco.libre} páginas más`;
}
