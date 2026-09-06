/* ─────────────────────────────────────────────────────────────
   RESEÑAS PRIVADAS Y PÚBLICAS · el núcleo  ·  historia #28

   El punto de la historia es poder escribir con sinceridad. Eso solo
   funciona si el silencio es lo que pasa por defecto: publicar es una
   decisión que se toma, no un descuido que se descubre después.

   HAY UN DETALLE DE FIRESTORE QUE MANDA SOBRE TODO EL DISEÑO:
   las reglas de seguridad conceden o niegan documentos ENTEROS. No
   existe «puedes leer este documento pero no el campo `review`». Así
   que una reseña pública no puede ser un campo dentro del libro: si
   ese documento se abriera para que otra persona lea la reseña
   pública, se abriría con todo lo demás dentro —lo que estás leyendo,
   por dónde vas, tus notas, y las reseñas privadas del resto de tus
   libros no, pero la de ese libro sí aunque fuera privada—.

   Por eso publicar es COPIAR a otro sitio. El texto privado nunca sale
   de users/{uid}, y lo que se copia lo decide `publicReviewDoc`, que
   es una lista blanca: si un campo no está escrito ahí, no viaja. Es
   la función más importante de este módulo y la que más pruebas tiene.

   Sin Firebase, como plan-core.js: se prueba en Node.
   ───────────────────────────────────────────────────────────── */

/** Lo que se considera texto: espacios en blanco no son una reseña. */
export const hasText = (s) => String(s ?? '').trim().length > 0;

/**
 * ¿Está esta reseña publicada AHORA MISMO?
 *
 * Hacen falta las dos cosas. Marcar como pública una reseña vacía y
 * que apareciera un hueco con tu nombre en el perfil de nadie sería
 * raro; y borrar el texto de una reseña pública tiene que despublicarla
 * sola, sin obligarte a acordarte del interruptor.
 */
export const isPublicReview = (e = {}) => e.reviewPublic === true && hasText(e.review);

/** Lo que se ve en la ficha, en las dos direcciones. */
export function visibilityLabel(e = {}) {
  if (!hasText(e.review)) return 'Nadie más puede verla';
  return e.reviewPublic === true ? 'Visible para quien vea tu perfil' : 'Solo tú puedes verla';
}

/**
 * Lo que se copia fuera cuando publicas. LISTA BLANCA, a propósito.
 *
 * Escribir esto como «todo lo del libro menos unas cuantas cosas»
 * sería un descuido a la espera: cualquier campo nuevo que alguien
 * añada mañana a una entrada —una nota, una ubicación, lo que sea— se
 * publicaría solo. Así, un campo nuevo no viaja hasta que alguien lo
 * escriba aquí y tenga que pensárselo.
 *
 * Devuelve null si no hay nada que publicar: quien llama debe BORRAR
 * la copia, no escribir un documento vacío.
 */
export function publicReviewDoc({ uid, book, entry: e = {}, at = Date.now() } = {}) {
  if (!uid || !book?.id || !isPublicReview(e)) return null;
  return {
    uid,
    bookId: book.id,
    title: String(book.title ?? ''),
    author: String(book.author ?? ''),
    review: String(e.review).trim(),
    rating: Number.isFinite(e.rating) && e.rating > 0 ? e.rating : null,
    publishedAt: at,
  };
}

/** Los campos que puede tener una copia pública. Las pruebas los usan. */
export const PUBLIC_FIELDS = ['uid', 'bookId', 'title', 'author', 'review', 'rating', 'publishedAt'];

/**
 * Qué hay que hacer con la copia pública tras un cambio.
 *
 * Se resuelve aquí, en una función pura, en vez de a base de `if` por
 * la app: el caso que se olvida siempre es el de despublicar —borrar
 * el texto, o marcarla privada— y dejar la copia vieja publicada para
 * siempre.
 */
export const publishAction = (e = {}) => (isPublicReview(e) ? 'escribir' : 'borrar');

/** Cuántas de tus reseñas son públicas. Para poder decirlo de una vez. */
export const publicCount = (entries = {}) =>
  Object.values(entries).filter(isPublicReview).length;
