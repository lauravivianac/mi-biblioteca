/* ─────────────────────────────────────────────────────────────
   RESOLUCIÓN DE LIBROS  ·  historias #25, #26, #27

   Una sola capa para los tres caminos de añadir un libro. Lo que
   cambia es de dónde sale la consulta —texto tecleado, código de
   barras o texto de una foto—, no lo que pasa después.

   Orden deliberado: OpenLibrary primero por ser abierta, Google
   Books como respaldo porque cubre mucho mejor el catálogo en
   español y latinoamericano, que es buena parte de este plan.

   DeepSeek NO participa aquí. Es el último recurso de src/agent.js,
   solo cuando estos catálogos no reconocen el texto de una portada.
   ───────────────────────────────────────────────────────────── */

import { GENRES } from './seed.js';

/* ── ISBN ────────────────────────────────────────────────────── */

/** Quita guiones y espacios. Los códigos de barras vienen sucios. */
export const cleanIsbn = (raw) => String(raw ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();

/**
 * Valida ISBN-10 e ISBN-13 por su dígito de control.
 * Merece la pena: un código mal leído devuelve un libro equivocado
 * con toda confianza, que es peor que no devolver nada.
 */
export function isValidIsbn(raw) {
  const s = cleanIsbn(raw);
  if (s.length === 10) {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      if (!/[0-9]/.test(s[i])) return false;
      sum += (10 - i) * Number(s[i]);
    }
    const last = s[9] === 'X' ? 10 : Number(s[9]);
    if (Number.isNaN(last)) return false;
    return (sum + last) % 11 === 0;
  }
  if (s.length === 13) {
    if (!/^[0-9]{13}$/.test(s)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(s[i]) * (i % 2 ? 3 : 1);
    return (10 - (sum % 10)) % 10 === Number(s[12]);
  }
  return false;
}

/* ── NORMALIZACIÓN ───────────────────────────────────────────── */

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Quita acentos y signos para poder comparar títulos. */
export const fold = (s) => clean(s)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, '');

/** Palabras que llevan un libro hacia uno de los géneros de esta biblioteca. */
/* El orden importa: se queda con el PRIMERO que encaje, así que lo
   específico va antes que lo general. "romance juvenil" debe caer en
   Romance, no en Fantasía / Juvenil por la palabra «juvenil». */
const GENRE_HINTS = {
  'Romance': ['romance', 'romántic', 'romantic', 'love stor', 'chick lit'],
  'Novela gráfica / Cómic': ['comic', 'graphic novel', 'novela gráfica', 'manga', 'historieta'],
  'Infantil': ['juvenile fiction', 'children', 'infantil', 'picture book', 'cuentos para niños'],
  'Terror / Misterio': ['horror', 'terror', 'mystery', 'misterio', 'suspense', 'gothic'],
  'Thriller': ['thriller', 'crime', 'policíaca', 'detective', 'espionaje'],
  'Ciencia ficción': ['science fiction', 'ciencia ficción', 'dystopia', 'distop', 'cyberpunk'],
  'Aventura': ['adventure', 'aventura', 'survival', 'sea stories', 'viajes'],
  'Humor': ['humor', 'humour', 'comedy', 'sátira', 'satire'],
  'Novela histórica': ['historical fiction', 'novela histórica'],
  'Fantasía / Juvenil': ['young adult', 'juvenil'],
  'Fantasía': ['fantasy', 'fantasía', 'magic', 'dragons', 'épica'],
  'Latinoamérica': ['latin america', 'latinoamérica', 'colombian', 'mexican', 'argentin', 'chilena'],
  'Oriente / Espiritualidad': ['japan', 'japon', 'zen', 'buddh', 'spiritual', 'oriental'],
  'Historia / Mitología': ['mythology', 'mitología', 'ancient', 'history', 'historia'],
  'Poesía / Teatro': ['poetry', 'poesía', 'drama', 'teatro', 'play'],
  'Autobiografía': ['biography', 'autobiograf', 'memoir', 'memorias'],
  'Ensayo / Filosofía': ['philosophy', 'filosofía', 'ensayo', 'essays'],
  'No ficción / Desarrollo': ['self-help', 'psychology', 'business', 'autoayuda'],
  'Clásico universal': ['classic', 'clásico', 'literatura universal', 'fiction classics'],
};

/** Propone un género de ESTA biblioteca, no el de una API. Siempre editable. */
export function guessGenre(subjects = [], description = '') {
  const hay = fold([...subjects, description].join(' '));
  for (const [genre, words] of Object.entries(GENRE_HINTS)) {
    if (words.some((w) => hay.includes(fold(w)))) return genre;
  }
  return 'Novela contemporánea';
}

/** Un candidato, en la forma que usa la app. */
const candidate = (o) => ({
  title: clean(o.title),
  author: clean(o.author) || 'Autor desconocido',
  pages: o.pages ? `~${o.pages}` : '—',
  year: o.year || null,
  publisher: clean(o.publisher) || null,
  cover: o.cover || null,
  isbn: o.isbn ? cleanIsbn(o.isbn) : null,
  genre: o.genre || 'Novela contemporánea',
  source: o.source,
});

/* ── FUENTES ─────────────────────────────────────────────────── */

const timeout = (ms) => new AbortController_(ms);
function AbortController_(ms) {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function openLibrary(query, { isbn = false, limit = 6 } = {}) {
  const url = isbn
    ? `https://openlibrary.org/search.json?q=isbn:${encodeURIComponent(query)}&limit=1&fields=title,author_name,number_of_pages_median,first_publish_year,publisher,cover_i,isbn,subject`
    : `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=title,author_name,number_of_pages_median,first_publish_year,publisher,cover_i,isbn,subject`;
  const r = await fetch(url, { signal: timeout(8000) });
  const d = await r.json();
  return (d.docs || []).map((x) => candidate({
    title: x.title,
    author: x.author_name?.[0],
    pages: x.number_of_pages_median,
    year: x.first_publish_year,
    publisher: x.publisher?.[0],
    cover: x.cover_i ? `https://covers.openlibrary.org/b/id/${x.cover_i}-M.jpg` : null,
    isbn: x.isbn?.[0],
    genre: guessGenre(x.subject || []),
    source: 'openlibrary',
  }));
}

async function googleBooks(query, { isbn = false, limit = 6 } = {}) {
  const q = isbn ? `isbn:${query}` : query;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${limit}`;
  const r = await fetch(url, { signal: timeout(8000) });
  const d = await r.json();
  return (d.items || []).map((x) => {
    const v = x.volumeInfo || {};
    const ids = v.industryIdentifiers || [];
    return candidate({
      title: v.title + (v.subtitle ? `: ${v.subtitle}` : ''),
      author: v.authors?.[0],
      pages: v.pageCount,
      year: v.publishedDate ? Number(String(v.publishedDate).slice(0, 4)) : null,
      publisher: v.publisher,
      cover: v.imageLinks?.thumbnail?.replace(/^http:/, 'https:') || null,
      isbn: (ids.find((i) => i.type === 'ISBN_13') || ids[0])?.identifier,
      genre: guessGenre(v.categories || [], v.description || ''),
      source: 'google',
    });
  });
}

/* ── ORDEN Y MEZCLA ──────────────────────────────────────────── */

/** Un candidato vale más si trae portada, páginas y autor de verdad. */
export function scoreCandidate(c, query = '') {
  let score = 0;
  if (c.cover) score += 30;
  if (c.pages !== '—') score += 20;
  if (c.author !== 'Autor desconocido') score += 15;
  if (c.year) score += 5;
  if (c.publisher) score += 3;
  const q = fold(query);
  if (q) {
    const t = fold(c.title);
    if (t === q) score += 60;
    else if (t.startsWith(q)) score += 35;
    else if (t.includes(q)) score += 20;
  }
  return score;
}

/** Quita repetidos entre las dos fuentes y ordena por utilidad. */
export function mergeCandidates(lists, query = '') {
  const seen = new Map();
  for (const c of lists.flat()) {
    if (!c.title) continue;
    const key = `${fold(c.title)}|${fold(c.author)}`;
    const prev = seen.get(key);
    if (!prev) { seen.set(key, c); continue; }
    // Se queda con el más completo de los dos
    seen.set(key, scoreCandidate(c, query) > scoreCandidate(prev, query) ? c : prev);
  }
  return [...seen.values()]
    .sort((a, b) => scoreCandidate(b, query) - scoreCandidate(a, query));
}

/* ── LOS TRES CAMINOS ────────────────────────────────────────── */

const settle = (p) => p.then((v) => v).catch(() => []);

/** Por código de barras. Un ISBN inválido se rechaza antes de consultar. */
export async function lookupByIsbn(raw) {
  const isbn = cleanIsbn(raw);
  if (!isValidIsbn(isbn)) return { ok: false, reason: 'isbn-invalido', isbn };
  const [a, b] = await Promise.all([
    settle(openLibrary(isbn, { isbn: true })),
    settle(googleBooks(isbn, { isbn: true })),
  ]);
  const found = mergeCandidates([a, b]);
  if (!found.length) return { ok: false, reason: 'no-encontrado', isbn };
  return { ok: true, book: { ...found[0], isbn }, candidates: found };
}

/** Escribiendo el título. Devuelve varios para poder distinguir ediciones. */
export async function lookupByTitle(text) {
  const query = clean(text);
  if (query.length < 3) return [];
  const [a, b] = await Promise.all([
    settle(openLibrary(query)),
    settle(googleBooks(query)),
  ]);
  return mergeCandidates([a, b], query).slice(0, 8);
}

/**
 * Desde el texto de una foto de portada. El OCR devuelve texto sucio,
 * así que primero se prueba tal cual y luego con las líneas más largas,
 * que suelen ser el título y el autor.
 */
export async function lookupByCoverText(ocrText) {
  const lines = clean(ocrText)
    .split(/[\n·|]/)
    .map(clean)
    .filter((l) => l.length > 2 && !/^\d+$/.test(l))
    .sort((a, b) => b.length - a.length);

  for (const attempt of [lines.slice(0, 2).join(' '), lines[0], lines.slice(0, 3).join(' ')]) {
    if (!attempt) continue;
    const found = await lookupByTitle(attempt);
    if (found.length) return { ok: true, candidates: found, usedQuery: attempt };
  }
  return { ok: false, reason: 'sin-coincidencia', lines };
}

export { GENRES };
