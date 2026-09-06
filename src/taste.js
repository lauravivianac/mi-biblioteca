/* ─────────────────────────────────────────────────────────────
   TU GUSTO · atado al store  ·  historia #62

   El cálculo vive en taste-core.js, que no sabe que existe Firebase
   y por eso se puede probar en Node. Aquí solo se le dan los datos.
   ───────────────────────────────────────────────────────────── */

import { allBooks, statusOf, ratingOf, entry } from './store.js';
import {
  tasteProfile, scoreByTaste, recommendByTaste, describeTaste,
} from './taste-core.js';

/** Los libros con todo lo que el perfil necesita saber de cada uno. */
export function booksWithSignal() {
  return allBooks().map((b) => {
    const e = entry(b.id);
    return {
      ...b,
      status: statusOf(b.id),
      rating: ratingOf(b.id),
      startedAt: e.startedAt || null,
      finishedAt: e.finishedAt || null,
    };
  });
}

export const myTaste = () => tasteProfile(booksWithSignal());
export const myTasteInWords = () => describeTaste(myTaste());
export const recommendMine = (opts) => recommendByTaste(booksWithSignal(), opts);

export { scoreByTaste };
