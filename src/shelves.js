/* ─────────────────────────────────────────────────────────────
   ESTANTERÍAS · atadas a los datos de la usuaria

   Lo que decide vive en shelves-core.js, sin Firebase, para poder
   probarlo. Aquí solo se le da de comer el estado real.
   ───────────────────────────────────────────────────────────── */

import { settings, updateSettings, entry, updateEntry, allBooks } from './store.js';
import {
  makeShelf, cleanName, nameTaken, toggleId, stripShelf,
  SHELF_COLORS, SHELF_EMOJIS,
} from './shelves-core.js';

export {
  SHELF_COLORS, SHELF_EMOJIS, SUGGESTED, cleanName,
} from './shelves-core.js';

export const allShelves = () => settings().shelves || [];
export const findShelf = (id) => allShelves().find((s) => s.id === id) || null;
export const shelvesOfBook = (bookId) => entry(bookId).shelfIds || [];

export function createShelf(datos) {
  const shelf = makeShelf(datos, allShelves());
  if (!shelf) return null;
  updateSettings({ shelves: [...allShelves(), shelf] });
  return shelf;
}

export function renameShelf(id, name) {
  const limpio = cleanName(name);
  if (!limpio || nameTaken(limpio, allShelves(), id)) return false;
  updateSettings({ shelves: allShelves().map((s) => (s.id === id ? { ...s, name: limpio } : s)) });
  return true;
}

export function restyleShelf(id, { emoji, color }) {
  updateSettings({
    shelves: allShelves().map((s) => (s.id === id ? {
      ...s,
      emoji: SHELF_EMOJIS.includes(emoji) ? emoji : s.emoji,
      color: SHELF_COLORS.includes(color) ? color : s.color,
    } : s)),
  });
}

/** Borra la estantería y la quita de las fichas. Los libros no se tocan. */
export function removeShelf(id) {
  const entries = Object.fromEntries(allBooks().map((b) => [b.id, entry(b.id)]));
  for (const [bookId, shelfIds] of Object.entries(stripShelf(entries, id))) {
    updateEntry(bookId, { shelfIds });
  }
  updateSettings({ shelves: allShelves().filter((s) => s.id !== id) });
}

export function toggleBookShelf(bookId, shelfId) {
  updateEntry(bookId, { shelfIds: toggleId(shelvesOfBook(bookId), shelfId) });
}

/** Cuántos libros hay en cada estantería, para enseñarlo en los chips. */
export function shelfCounts() {
  const cuenta = {};
  for (const b of allBooks()) {
    for (const id of shelvesOfBook(b.id)) cuenta[id] = (cuenta[id] || 0) + 1;
  }
  return cuenta;
}
