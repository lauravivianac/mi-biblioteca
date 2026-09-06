/* ─────────────────────────────────────────────────────────────
   PORTADAS
   OpenLibrary primero; si no la encuentra, Google Books, que
   cubre mucho mejor el catálogo en español y latinoamericano
   —que es buena parte de este plan lector.  (historia #26)
   ───────────────────────────────────────────────────────────── */

import { coverOf, updateEntry, findBook } from './store.js';

const inFlight = new Map();

async function fromOpenLibrary(book) {
  const q = encodeURIComponent(`${book.title} ${book.author}`);
  const r = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=3&fields=cover_i,title`);
  const d = await r.json();
  const hit = d.docs?.find((x) => x.cover_i);
  return hit ? `https://covers.openlibrary.org/b/id/${hit.cover_i}-M.jpg` : null;
}

async function fromGoogleBooks(book) {
  const q = encodeURIComponent(`intitle:${book.title} inauthor:${book.author}`);
  const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3`);
  const d = await r.json();
  const img = d.items?.map((i) => i.volumeInfo?.imageLinks?.thumbnail).find(Boolean);
  return img ? img.replace(/^http:/, 'https:') : null;
}

/** Devuelve la URL de portada, cacheada por libro. `null` = buscada y no encontrada. */
export async function fetchCover(bookId) {
  const cached = coverOf(bookId);
  if (cached !== null && cached !== undefined) return cached;
  if (inFlight.has(bookId)) return inFlight.get(bookId);

  const book = findBook(bookId);
  if (!book) return null;

  const job = (async () => {
    let url = null;
    try { url = await fromOpenLibrary(book); } catch {}
    if (!url) { try { url = await fromGoogleBooks(book); } catch {} }
    updateEntry(bookId, { cover: url });
    inFlight.delete(bookId);
    return url;
  })();

  inFlight.set(bookId, job);
  return job;
}
