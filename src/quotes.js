/* ─────────────────────────────────────────────────────────────
   CITAS · atadas a los datos de la usuaria

   Lo que decide vive en quotes-core.js, sin Firebase, para poder
   probarlo. Aquí solo se le da de comer el estado real.

   Las citas viven en la ficha de cada libro, como `quotes`: guardar
   una es entonces una escritura de ese libro, por el mismo camino con
   retardo que ya usa todo lo demás.
   ───────────────────────────────────────────────────────────── */

import { allBooks, findBook, entry, updateEntry } from './store.js';
import { makeQuote, sortQuotes, searchQuotes } from './quotes-core.js';

export {
  cleanQuote, parsePage, quoteToText, sortQuotes, searchQuotes, MAX_QUOTE,
} from './quotes-core.js';

/** Las citas de un libro, ordenadas por página. */
export const quotesOf = (bookId) => sortQuotes(entry(bookId).quotes || []);

export function addQuote(bookId, datos) {
  const cita = makeQuote(datos);
  if (!cita) return null;
  updateEntry(bookId, { quotes: [...(entry(bookId).quotes || []), cita] });
  return cita;
}

export function editQuote(bookId, quoteId, datos) {
  const actual = (entry(bookId).quotes || []).find((q) => q.id === quoteId);
  if (!actual) return false;
  const cita = makeQuote(datos, actual.at);
  if (!cita) return false;
  updateEntry(bookId, {
    quotes: (entry(bookId).quotes || []).map((q) => (q.id === quoteId ? { ...cita, id: quoteId } : q)),
  });
  return true;
}

export function removeQuote(bookId, quoteId) {
  updateEntry(bookId, { quotes: (entry(bookId).quotes || []).filter((q) => q.id !== quoteId) });
}

/**
 * Todas las citas de todos los libros, con el libro al que pertenecen
 * pegado a cada una: la vista de «mis citas» y la búsqueda necesitan
 * saber de dónde salió cada frase.
 *
 * Las más recientes primero. Dentro de un libro manda la página, pero
 * entre libros manda cuándo la guardaste: lo último que te marcó es
 * lo que estás buscando casi siempre.
 */
export function allQuotes() {
  const todas = [];
  for (const b of allBooks()) {
    for (const q of entry(b.id).quotes || []) {
      todas.push({ ...q, bookId: b.id, bookTitle: b.title, bookAuthor: b.author });
    }
  }
  return todas.sort((a, b) => (b.at || 0) - (a.at || 0));
}

export const quoteCount = () => allQuotes().length;

/** Para la atribución al copiar: el libro del que salió la cita. */
export const bookOfQuote = (bookId) => {
  const b = findBook(bookId);
  return b ? { title: b.title, author: b.author } : {};
};
