/* ─────────────────────────────────────────────────────────────
   QUÉ LEER AHORA · el núcleo  ·  historia #64

   El momento de mayor intención de toda la app: acabas de terminar
   algo y estás abierta a lo siguiente. Si la app va a sugerir en un
   solo sitio, es aquí.

   Este módulo propone A PARTIR DE TUS PROPIOS LIBROS. Es instantáneo,
   gratis, funciona sin conexión y sin agente — y por eso es el que
   manda: los descubrimientos nuevos que trae la IA se añaden después,
   si están, pero la función no depende de ellos.

   Sin Firebase, como plan-core.js: se prueba en Node.
   ───────────────────────────────────────────────────────────── */

/** Los estados que sí se pueden proponer para leer a continuación. */
const PROPONIBLE = new Set(['pending', 'wished']);

/** La llave con la que se recuerda una sugerencia descartada. */
export const dismissKey = (b) => `${fold(b.title)}|${fold(b.author)}`;

export const fold = (s) => String(s ?? '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();

/** "~320" → 320 */
export const pagesOf = (p) => {
  const n = parseInt(String(p ?? '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Cómo pesa lo que acabas de puntuar.
 *
 * Con cinco estrellas, más de lo mismo es exactamente lo que quieres.
 * Con una o dos, más de lo mismo es lo último que quieres — y ese es
 * el criterio de la historia que más fácil sería olvidar, porque la
 * tentación es tratar todo lo leído como una señal positiva.
 */
export function affinity(rating) {
  if (rating >= 5) return { genre: 45, author: 60 };
  if (rating === 4) return { genre: 30, author: 40 };
  if (rating === 3) return { genre: 0, author: 0 };
  if (rating === 2) return { genre: -45, author: -70 };
  if (rating === 1) return { genre: -70, author: -100 };
  return { genre: 10, author: 15 };   // sin puntuar: una pizca de afinidad
}

/**
 * Puntúa un libro tuyo como candidato para leer a continuación.
 *
 * `porque` no es decoración: una sugerencia que no se explica se
 * ignora, y peor, no se puede corregir. Si dice «porque te gustó
 * mucho el anterior del mismo autor», tú sabes si eso es cierto.
 */
export function scoreOwn(cand, { finished, rating, longFinished }) {
  const af = affinity(rating);
  let score = 0;
  let porque = null;

  if (finished && fold(cand.author) === fold(finished.author) && cand.id !== finished.id) {
    score += af.author;
    if (af.author > 0) porque = `Del mismo autor que ${finished.title}`;
  }
  if (finished && cand.genre === finished.genre) {
    score += af.genre;
    if (af.genre > 0 && !porque) porque = `Otro de ${cand.genre}, que acabas de disfrutar`;
  }

  /* Después de un tomo largo apetece uno corto. No es una regla de
     nadie: es lo que pasa de verdad al cerrar un libro de 900
     páginas. */
  const p = pagesOf(cand.pages);
  if (longFinished && p && p <= 250) {
    score += 25;
    if (!porque) porque = 'Corto, para respirar después del anterior';
  }

  // Lo que ya está en el plan pesa: para eso lo pusiste ahí
  if (cand.month) {
    score += 20;
    if (!porque) porque = `Ya lo tenías en el plan de ${cand.month}`;
  }

  // Un empujón a lo deseado: lo marcaste porque lo querías
  if (cand.status === 'wished') {
    score += 15;
    if (!porque) porque = 'Lo tenías en deseados';
  }

  return { score, porque: porque || 'De tus pendientes' };
}

/**
 * Las mejores sugerencias entre TUS libros.
 *
 * Se descarta lo leído, lo abandonado, lo que estás leyendo, el libro
 * que acabas de terminar y lo que ya descartaste alguna vez.
 */
export function suggestOwn(books = [], {
  finished = null, rating = 0, dismissed = [], limit = 4,
} = {}) {
  const fuera = new Set(dismissed);
  const longFinished = (pagesOf(finished?.pages) || 0) >= 450;

  return books
    .filter((b) => PROPONIBLE.has(b.status))
    .filter((b) => b.id !== finished?.id)
    .filter((b) => !fuera.has(dismissKey(b)))
    .map((b) => ({ ...b, ...scoreOwn(b, { finished, rating, longFinished }) }))
    /* Un candidato con puntuación negativa es uno que el criterio
       «si valoré mal, no me des más de lo mismo» está rechazando
       activamente. Enseñarlo sería ignorar lo que acabas de decir. */
    .filter((b) => b.score > -20)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * El texto que se le manda al agente para los descubrimientos.
 *
 * Se le dice qué acabas de terminar y con cuántas estrellas, porque
 * es la señal más fresca que hay. Y si fue mala, se le pide
 * explícitamente que se aleje: un modelo al que solo le das una lista
 * de libros asume que todos te gustaron.
 */
export function promptFor({ finished, rating, pending = [], read = [] }) {
  const linea = (b) => `${b.title} — ${b.author}`;
  const partes = [];

  if (finished) {
    partes.push(rating
      ? `ACABO DE TERMINAR: ${linea(finished)} — le di ${rating} de 5 estrellas.`
      : `ACABO DE TERMINAR: ${linea(finished)}.`);
    if (rating && rating <= 2) {
      partes.push('NO me gustó: aléjate de ese estilo, ese género y ese autor.');
    } else if (rating >= 4) {
      partes.push('Me gustó mucho: busca algo que me haga sentir parecido.');
    }
  }

  if (read.length) partes.push('OTROS QUE LEÍ:', ...read.slice(0, 15).map(linea));
  if (pending.length) {
    partes.push('YA LOS TENGO, no los repitas:', ...pending.slice(0, 25).map(linea));
  }
  return partes.join('\n');
}
