/* ─────────────────────────────────────────────────────────────
   LOS HUECOS DEL PLAN · atado al store  ·  historia #65

   El cálculo vive en gaps-core.js. Aquí solo se le dan los datos y se
   escribe el resultado.
   ───────────────────────────────────────────────────────────── */

import {
  allBooks, statusOf, updateEntry, findBook, entry,
} from './store.js';
import { readingPace } from './planner.js';
import { myTaste, scoreByTaste } from './taste.js';
import {
  findGaps, fillableGaps, candidatesForGap, nearbyGenres, describeGap,
} from './gaps-core.js';
import { MONTH_ORDER } from './seed.js';

const conEstado = () => allBooks().map((b) => ({ ...b, status: statusOf(b.id) }));

/** Las páginas que te caben en un mes a tu ritmo real. */
export const monthlyCapacity = () => Math.round(readingPace().pagesPerDay * 30);

/**
 * Los huecos de un año.
 *
 * En el año en curso no se ofrecen los meses que ya pasaron: llenar
 * marzo en septiembre no es planificar, es rellenar un hueco en un
 * papel. En un año futuro, los doce cuentan.
 */
export function gapsOf(year) {
  const hoy = new Date();
  const desdeMes = year === hoy.getFullYear() ? MONTH_ORDER[hoy.getMonth()] : null;
  return findGaps(conEstado(), { year, capacidad: monthlyCapacity(), desdeMes });
}

export function candidatesFor(year, month, { exclude = [] } = {}) {
  const gaps = gapsOf(year);
  const i = gaps.findIndex((g) => g.month === month);
  if (i < 0) return { hueco: null, candidatos: [] };
  const perfil = myTaste();
  return {
    hueco: gaps[i],
    candidatos: candidatesForGap(conEstado(), gaps[i], {
      taste: (b) => scoreByTaste(b, perfil),
      generosCerca: nearbyGenres(gaps, i),
      exclude,
      limit: 3,
    }),
  };
}

/**
 * Aceptar una propuesta: el libro queda en ese mes, y FIJADO.
 *
 * Sin fijarlo, el generador del plan podría moverlo la próxima vez que
 * se ejecute, y entonces «puedo aceptar una sugerencia y queda colocada
 * en ese mes» sería falso al día siguiente. Se guarda en la entrada
 * —`plannedMonth`— porque los libros semilla viven en el código y
 * cualquier cambio sobre ellos solo persiste ahí.
 */
export function placeInMonth(bookId, year, month) {
  const book = findBook(bookId);
  if (!book) return false;
  book.year = year;
  book.month = month;
  updateEntry(bookId, {
    plannedYear: year, plannedMonth: month, pinnedMonth: month,
    /* Volver a darle mes deshace el «sin fecha» de antes. */
    sinPlan: false,
  });
  return true;
}

/** Soltarlo del mes: vuelve a estar disponible para el generador. */
export function unpinFromMonth(bookId) {
  if (!entry(bookId).pinnedMonth) return;
  updateEntry(bookId, { pinnedMonth: null });
}

/**
 * SACARLO DEL PLAN DEL TODO: sin mes y sin año.
 *
 * No es lo mismo que `unpinFromMonth`, y esa diferencia es justo lo que
 * estaba roto:
 *
 *   · `unpinFromMonth` quita la CHINCHETA. El libro sigue teniendo su
 *     mes; lo único que cambia es que el generador puede moverlo.
 *   · esto le quita el MES.
 *
 * Y como quien decide si un libro está atrasado es `stalledBooks`
 * mirando `b.year` y `b.month`, quitar solo la chincheta no lo saca de
 * la lista de atrasados. Con eso, decirle a la mascota «más adelante»
 * no servía de nada: al día siguiente volvía a preguntar por el mismo
 * libro, porque para el plan seguía siendo el libro de agosto.
 *
 * `sinPlan` tiene que quedar ESCRITO y no basta con borrar los campos:
 * el mes de los libros de la semilla vive en el código, así que al
 * recargar volvería solo. Es la marca de «esto fue una decisión», no
 * un hueco.
 */
export function quitarDelPlan(bookId) {
  const book = findBook(bookId);
  if (book) { book.year = null; book.month = ''; }
  updateEntry(bookId, {
    plannedYear: null, plannedMonth: null, pinnedMonth: null, sinPlan: true,
  });
}

export { fillableGaps, describeGap };
