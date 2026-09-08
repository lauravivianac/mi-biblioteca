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

/* ── CUANDO EL CATÁLOGO NO CONTESTA ──────────────────────────
   «Abrí una cuenta nueva de prueba y no está buscando los libros de
    ninguna forma. Me ha tocado incluirlos todos a mano.»

   No era la cuenta, y no era «de ninguna forma» por casualidad: los
   tres caminos —título, código de barras y foto de portada— acaban en
   estas dos consultas, así que cuando las dos fallan fallan los tres a
   la vez. Probados desde aquí el mismo día:

     Google Books   → HTTP 429, «Quota exceeded ... books.googleapis.com»
     OpenLibrary    → sin respuesta

   Google Books sin clave se atribuye a un proyecto anónimo compartido
   y esa cuota se agota sola; OpenLibrary pasa temporadas lenta y ocho
   segundos se le quedan cortos desde un móvil.

   Y AQUÍ ESTÁ EL FALLO DE VERDAD, que es nuestro y no suyo: un 429
   trae un cuerpo JSON de error, así que `d.items || []` daba LISTA
   VACÍA. Un servicio caído entraba por la misma puerta que «ese libro
   no existe», y la pantalla decía «Sin resultados. Puedes añadirlo a
   mano». Le estábamos diciendo que su libro no está en ningún
   catálogo del mundo cuando lo que pasaba es que no habíamos podido
   preguntar. Por eso los metió todos a mano: le dijimos que lo
   hiciera.

   Tres cosas cambian, y las tres son la misma: no mentir.
     1. Una respuesta que no es 200 LANZA. No se disfraza de vacío.
     2. Un fallo pasajero se reintenta una vez — lo que arregla la
        mitad de los 429 y de los tiempos agotados sin que nadie note
        nada.
     3. Quien llama recibe QUÉ fuentes fallaron, para poder decir la
        verdad en pantalla. */

/* Doce y no ocho: desde un móvil con mala cobertura, ocho segundos
   cortan consultas que habrían llegado. El precio es esperar cuatro
   segundos más en el peor caso; el que se pagaba era no encontrar el
   libro. */
const ESPERA = 12000;

async function pedir(url) {
  const r = await fetch(url, { signal: timeout(ESPERA) });
  /* `fetch` solo rechaza si no hay red: un 429 o un 503 llegan como
     respuesta buena con un cuerpo de error dentro. Sin esta línea, ese
     cuerpo se leía como «no hay libros». */
  if (!r.ok) {
    const e = new Error(`HTTP ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return r.json();
}

/**
 * Una consulta, con un segundo intento si el primero se cayó por algo
 * pasajero.
 *
 * Un 4xx que no sea 429 no se reintenta: pedir dos veces lo mismo a
 * quien ya ha dicho que la petición está mal solo alarga la espera.
 */
async function conReintento(hacer) {
  try {
    return await hacer();
  } catch (e) {
    const pasajero = !e.status || e.status === 429 || e.status >= 500;
    if (!pasajero) throw e;
    await new Promise((r) => setTimeout(r, 600));
    return hacer();
  }
}

/* ── BUSCAR UN ISBN EN OPENLIBRARY: LA API, NO EL BUSCADOR ────

     «De todos los libros que intenté por portada y por escáner de
      código de barras, ninguno funcionó.»

   Se estaba preguntando por `search.json?q=isbn:...`, que es el
   BUSCADOR de texto de OpenLibrary. Encuentra ediciones si están
   indexadas, y el índice de búsqueda va muy por detrás del catálogo:
   se le escapan ediciones enteras, y muy en particular las
   latinoamericanas — que son las que ella tiene en la mano.

   O sea que la app preguntaba en el sitio donde el libro no iba a
   estar, y luego decía «este libro no está en los catálogos», que es
   una conclusión razonable a partir de una pregunta mal hecha.

   La API de ediciones —`/api/books?bibkeys=ISBN:...`— consulta el
   catálogo directamente, que es donde SÍ están, y encima devuelve
   título, autoría, editorial, páginas y portada en una sola llamada.

   Se prueban las dos, en ese orden: si la API no lo tiene, todavía
   queda el buscador. Dos oportunidades donde antes había una, y la
   buena primero. */
async function openLibraryIsbn(isbn) {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}`
    + '&format=json&jscmd=data';
  const d = await conReintento(() => pedir(url));

  /* Contesta 200 con `{}` cuando no lo tiene: un objeto vacío no es un
     fallo, es un «no lo tengo». */
  const x = d?.[`ISBN:${isbn}`];
  if (!x) return [];

  return [candidate({
    title: x.title,
    author: x.authors?.[0]?.name,
    pages: x.number_of_pages,
    year: x.publish_date ? Number(String(x.publish_date).match(/\d{4}/)?.[0]) || null : null,
    publisher: x.publishers?.[0]?.name,
    cover: x.cover?.medium || x.cover?.large || null,
    isbn,
    genre: guessGenre((x.subjects || []).map((t) => t.name || t)),
    source: 'openlibrary',
  })];
}

async function openLibrary(query, { isbn = false, limit = 6 } = {}) {
  if (isbn) {
    const porApi = await openLibraryIsbn(query);
    if (porApi.length) return porApi;
  }
  const url = isbn
    ? `https://openlibrary.org/search.json?q=isbn:${encodeURIComponent(query)}&limit=1&fields=title,author_name,number_of_pages_median,first_publish_year,publisher,cover_i,isbn,subject`
    : `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=title,author_name,number_of_pages_median,first_publish_year,publisher,cover_i,isbn,subject`;
  const d = await conReintento(() => pedir(url));
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
  const d = await conReintento(() => pedir(url));
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

/**
 * Las dos fuentes a la vez, contando cuál contestó.
 *
 * Devuelve `{ libros, caidas }`. `caidas` es la lista de fuentes que
 * no pudieron contestar, y es lo que permite distinguir «este libro no
 * está en los catálogos» de «los catálogos no están». Que una sola de
 * las dos conteste ya vale: se busca en dos sitios precisamente para
 * que uno pueda faltar.
 */
async function preguntarALosCatalogos(query, opciones = {}) {
  const fuentes = [
    ['OpenLibrary', () => openLibrary(query, opciones)],
    ['Google Books', () => googleBooks(query, opciones)],
  ];
  const salidas = await Promise.all(fuentes.map(async ([nombre, hacer]) => {
    try {
      return { nombre, libros: await hacer() };
    } catch (e) {
      /* A la consola el motivo de verdad; a la pantalla, nunca. Lo que
         hace falta arriba es SI falló, no por qué. */
      console.warn(`El catálogo ${nombre} no pudo contestar:`, e?.message || e);
      return { nombre, libros: null, error: String(e?.message || e) };
    }
  }));

  return {
    libros: mergeCandidates(salidas.map((s) => s.libros || []), typeof query === 'string' ? query : ''),
    caidas: salidas.filter((s) => s.libros === null).map((s) => s.nombre),
    /* El motivo de cada caída, para poder ENSEÑARLO. Sin esto, lo único
       que se puede contar de vuelta es «no funciona», y con eso no se
       arregla nada — es la misma lección que el mapa de los cafés, donde
       el «Detalle técnico» de la pantalla fue lo que permitió encontrar
       la causa real. */
    detalle: salidas.filter((s) => s.error).map((s) => `${s.nombre}: ${s.error}`).join(' · '),
  };
}

/** ¿Se quedó sin poder preguntar? Solo si NINGUNA de las dos contestó. */
const sinCatalogos = (r) => r.caidas.length === 2;

/** Por código de barras. Un ISBN inválido se rechaza antes de consultar. */
export async function lookupByIsbn(raw) {
  const isbn = cleanIsbn(raw);
  if (!isValidIsbn(isbn)) return { ok: false, reason: 'isbn-invalido', isbn };
  const r = await preguntarALosCatalogos(isbn, { isbn: true });
  /* Un código bien leído que no encuentra nada porque los catálogos
     están caídos NO es «este libro no está»: reintentar en un rato
     funciona, y volver a escanear no. La pantalla dice cosas
     distintas para cada uno. */
  if (sinCatalogos(r)) {
    return { ok: false, reason: 'catalogos-caidos', isbn, caidas: r.caidas, detalle: r.detalle };
  }
  if (!r.libros.length) {
    /* NO ES LO MISMO «no está» QUE «no está en el que pudo contestar».
       Si uno de los dos se cayó —un 429 de Google es de lo más normal
       desde una red móvil— decir «este libro no está en los catálogos»
       es afirmar algo que no se ha comprobado. Y encima manda a por la
       portada, que acaba en la MISMA consulta y va a fallar igual. */
    return {
      ok: false,
      reason: r.caidas.length ? 'no-encontrado-a-medias' : 'no-encontrado',
      isbn,
      caidas: r.caidas,
      detalle: r.detalle,
    };
  }
  return { ok: true, book: { ...r.libros[0], isbn }, candidates: r.libros };
}

/**
 * Escribiendo el título, con el parte de qué fuentes contestaron.
 *
 * Es la que usa la caja de búsqueda, que es donde importa poder decir
 * la verdad. `lookupByTitle` sigue existiendo para quien solo quiere
 * la lista.
 */
export async function buscarPorTitulo(text) {
  const query = clean(text);
  if (query.length < 3) return { libros: [], caidas: [], corto: true };
  const r = await preguntarALosCatalogos(query);
  return {
    libros: r.libros.slice(0, 8),
    caidas: r.caidas,
    sinCatalogos: sinCatalogos(r),
    detalle: r.detalle,
  };
}

/** Escribiendo el título. Devuelve varios para poder distinguir ediciones. */
export async function lookupByTitle(text) {
  return (await buscarPorTitulo(text)).libros;
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

  let mudos = false;
  let cojos = false;      // uno de los dos no contestó
  let detalle = '';
  for (const attempt of [lines.slice(0, 2).join(' '), lines[0], lines.slice(0, 3).join(' ')]) {
    if (!attempt) continue;
    const r = await buscarPorTitulo(attempt);
    if (r.libros.length) return { ok: true, candidates: r.libros, usedQuery: attempt };
    /* Si los catálogos están caídos, los tres intentos van a dar lo
       mismo y ninguno significa «no lo reconocemos». Se recuerda para
       no acabar diciendo que la foto salió mal. */
    if (r.sinCatalogos) mudos = true;
    /* Y si contestó UNO SOLO, tampoco se ha comprobado que el libro no
       esté: se ha comprobado que no está en el que pudo contestar. */
    if (r.caidas?.length) { cojos = true; detalle = r.detalle || detalle; }
  }
  if (mudos) return { ok: false, reason: 'catalogos-caidos', lines, detalle };
  if (cojos) return { ok: false, reason: 'sin-coincidencia-a-medias', lines, detalle };
  return { ok: false, reason: 'sin-coincidencia', lines };
}

export { GENRES };

/* ── COMPROBAR UNA SUGERENCIA  ·  historia #63 ────────────────
   Un modelo de lenguaje inventa libros plausibles con total
   confianza: autor real, título creíble, editorial verosímil. Pintar
   eso tal cual convierte una recomendación en una mentira bien
   escrita, y deja en la usuaria el trabajo de comprobarlo.

   Así que toda sugerencia pasa por los catálogos antes de aparecer,
   y la que nadie reconoce no aparece. */

/* Los artículos y preposiciones no dicen nada de qué libro es, y
   contarlos hacía que «La casa de los espíritus» y «La casa de
   Bernarda Alba» se parecieran un 60 % — suficiente para colar un
   libro por otro. */
const VACIAS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
  'al', 'a', 'y', 'e', 'o', 'u', 'en', 'con', 'por', 'para', 'que',
  'the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'to', 'for',
]);

const palabrasClave = (s) => fold(s).split(' ').filter((w) => w && !VACIAS.has(w));

/** Cuánto se parecen dos títulos, de 0 a 1, por palabras con contenido. */
export function titleSimilarity(a, b) {
  const pa = palabrasClave(a);
  const pb = palabrasClave(b);
  if (!pa.length || !pb.length) return 0;
  const enB = new Set(pb);
  const comunes = pa.filter((w) => enB.has(w)).length;
  return comunes / Math.max(pa.length, pb.length);
}

/**
 * ¿El candidato del catálogo es de verdad el libro que se pidió?
 *
 * Se exige parecido de VERDAD y no solo que el buscador devolviera
 * algo: pedir un libro inventado casi siempre devuelve otro libro
 * real que comparte una palabra, y aceptarlo sería cambiar una
 * mentira por otra.
 */
export function looksLikeSame(pedido, encontrado) {
  const a = fold(pedido);
  const b = fold(encontrado);
  if (!a || !b) return false;
  if (a === b) return true;
  // Uno contenido en el otro cubre subtítulos y ediciones
  if (a.length > 6 && (b.includes(a) || a.includes(b))) return true;
  return titleSimilarity(pedido, encontrado) >= 0.6;
}

/**
 * Comprueba una sugerencia contra los catálogos.
 * Devuelve el libro real —con su portada y sus páginas— o null.
 */
export async function verifySuggestion({ titulo, autor }) {
  if (!titulo) return null;
  const found = await lookupByTitle(`${titulo} ${autor || ''}`.trim());
  return found.find((c) => looksLikeSame(titulo, c.title)) || null;
}
