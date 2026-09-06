/* ─────────────────────────────────────────────────────────────
   ESTANTERÍAS PROPIAS · el núcleo  ·  historia #22

   Agrupar los libros como una piensa en ellos, que casi nunca es por
   género. «Para el viaje» y «Releer» no son categorías de nadie más.

   Un libro puede estar en varias a la vez, y borrar una estantería
   nunca borra libros — eso hay que dejarlo escrito y probado, porque
   es exactamente el miedo que da tocar el botón.

   DÓNDE VIVEN
   La definición (nombre, emoji, color) va en los ajustes: son cuatro
   objetos diminutos y así viajan con el resto de las preferencias sin
   escribir código de persistencia nuevo.

   La pertenencia va en la ficha de cada libro, como `shelfIds`. Meter
   un libro en una estantería es entonces una escritura de ese libro,
   por el mismo camino con retardo que ya usa todo lo demás — y no una
   escritura del documento de ajustes cada vez.

   Aquí no se importa el almacén a propósito, igual que en
   plan-core.js: sin Firebase de por medio, todo esto se prueba en
   Node en milisegundos.
   ───────────────────────────────────────────────────────────── */

/* Los colores son tokens del tema, no hex sueltos: así una estantería
   se ve bien en los nueve mundos y no hay que revisar el contraste
   otra vez por cada una. */
export const SHELF_COLORS = ['gold', 'violet', 'lilac', 'success', 'amber', 'danger'];

export const SHELF_EMOJIS = ['⭐', '✈️', '🔁', '🎁', '🌙', '☕', '🔖', '🏆', '🌱', '🕯️', '📌', '💫'];

/* Las que se ofrecen al empezar. La lista de la historia incluía
   «Abandonados», que se ha dejado fuera a propósito: ya es un ESTADO
   del libro, y tenerlo también como estantería crearía dos sitios
   donde decir lo mismo y dos que pueden contradecirse. «Prestados»
   ocupa su lugar, que es una necesidad real y no la cubre nada. */
export const SUGGESTED = [
  { name: 'Favoritos', emoji: '⭐', color: 'gold' },
  { name: 'Para el viaje', emoji: '✈️', color: 'violet' },
  { name: 'Releer', emoji: '🔁', color: 'lilac' },
  { name: 'Prestados', emoji: '🎁', color: 'amber' },
];

/* ── LO PURO, QUE ES LO QUE SE PUEDE PROBAR ──────────────────── */

export const cleanName = (n) => String(n ?? '').replace(/\s+/g, ' ').trim().slice(0, 32);

/** Comparación para detectar repetidas: sin tildes, sin mayúsculas. */
const key = (n) => cleanName(n).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const nameTaken = (name, shelves = [], exceptId = null) =>
  shelves.some((s) => s.id !== exceptId && key(s.name) === key(name));

/**
 * Crea la estantería, o devuelve null si el nombre no vale.
 * Null y no una excepción: un nombre repetido es un caso normal de
 * la interfaz, no un fallo del programa.
 */
export function makeShelf({ name, emoji, color }, shelves = []) {
  const limpio = cleanName(name);
  if (!limpio || nameTaken(limpio, shelves)) return null;
  return {
    id: 'sh' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    name: limpio,
    emoji: SHELF_EMOJIS.includes(emoji) ? emoji : SHELF_EMOJIS[0],
    color: SHELF_COLORS.includes(color) ? color : SHELF_COLORS[0],
  };
}

/** Mete o saca un id de una lista, sin repetir. */
export const toggleId = (list = [], id) =>
  (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/**
 * Quita una estantería de TODAS las fichas.
 *
 * Devuelve solo las fichas que cambian: escribir las 73 para borrar
 * una estantería que estaba en dos sería absurdo, y en Firestore se
 * paga por escritura.
 */
export function stripShelf(entries = {}, shelfId) {
  const cambios = {};
  for (const [bookId, e] of Object.entries(entries)) {
    if (e?.shelfIds?.includes(shelfId)) {
      cambios[bookId] = e.shelfIds.filter((x) => x !== shelfId);
    }
  }
  return cambios;
}
