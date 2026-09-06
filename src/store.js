/* ─────────────────────────────────────────────────────────────
   DATOS POR USUARIA  ·  historia #17

   Antes: un único documento `biblioteca/laura`, con el ID escrito
   a mano y los libros metidos como cadenas JSON dentro de campos.
   Cualquiera que abriera la app escribía encima.

   Ahora: users/{uid}/books/{bookId}, un documento por libro.

   Los 73 libros semilla siguen viviendo en el código: por usuaria
   solo se guarda lo que cambia sobre ellos.
   ───────────────────────────────────────────────────────────── */

import {
  doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from './firebase.js';
import { seedBooks, pageCount } from './seed.js';

const state = {
  uid: null,
  books: [],        // semilla + propios, ya fusionados
  entries: {},      // bookId -> { status, rating, review, hidden, page, cover, pinnedMonth }
  settings: {},
  dirty: new Set(),
  settingsDirty: false,
};

const lsKey = (name) => `bib:${state.uid || 'anon'}:${name}`;
const readLS = (name, fallback) => {
  try { const v = localStorage.getItem(lsKey(name)); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const writeLS = (name, value) => {
  try { localStorage.setItem(lsKey(name), JSON.stringify(value)); } catch {}
};

export const DEFAULT_SETTINGS = {
  themeId: 'grimorio',
  achievements: [],
  minutesWeekday: null,
  minutesWeekend: null,
  goalKind: 'books',      // 'books' | 'pages' | 'minutes'
  goalValue: null,
  goalYear: new Date().getFullYear(),
  onboarded: false,
};

/* ── LECTURA ─────────────────────────────────────────────────── */

export const uid = () => state.uid;
export const allBooks = () => state.books.filter((b) => !state.entries[b.id]?.hidden);
export const everyBook = () => state.books;
export const findBook = (id) => state.books.find((b) => b.id === id);
export const entry = (id) => state.entries[id] || {};
export const statusOf = (id) => state.entries[id]?.status || 'pending';
export const ratingOf = (id) => state.entries[id]?.rating || 0;
export const reviewOf = (id) => state.entries[id]?.review || '';
export const coverOf = (id) => state.entries[id]?.cover ?? null;
export const settings = () => ({ ...DEFAULT_SETTINGS, ...state.settings });

/** Páginas leídas de un libro, tanto si se registró página como porcentaje. */
export function pagesRead(id) {
  const e = entry(id);
  if (e.status === 'read') return pageCount(findBook(id)?.pages) || 0;
  if (typeof e.page === 'number') return e.page;
  const total = pageCount(findBook(id)?.pages);
  if (typeof e.pct === 'number' && total) return Math.round((e.pct / 100) * total);
  return 0;
}

export function progressPct(id) {
  const e = entry(id);
  if (e.status === 'read') return 100;
  const total = pageCount(findBook(id)?.pages);
  if (typeof e.pct === 'number') return Math.max(0, Math.min(100, e.pct));
  if (typeof e.page === 'number' && total) return Math.max(0, Math.min(100, Math.round((e.page / total) * 100)));
  return 0;
}

/* ── ESCRITURA ───────────────────────────────────────────────── */

export function updateEntry(id, patch) {
  state.entries[id] = { ...(state.entries[id] || {}), ...patch };
  state.dirty.add(id);
  writeLS('entries', state.entries);
  schedulePersist();
}

export function updateSettings(patch) {
  state.settings = { ...settings(), ...patch };
  state.settingsDirty = true;
  writeLS('settings', state.settings);
  schedulePersist();
}

export function addBook(book) {
  const id = 'b' + Date.now().toString(36);
  const full = { ...book, id, custom: true };
  state.books.push(full);
  state.dirty.add(id);
  writeLS('custom', state.books.filter((b) => b.custom));
  schedulePersist();
  return full;
}

/** Los libros semilla se ocultan, no se borran: siguen viviendo en el código. */
export function removeBook(id) {
  const book = findBook(id);
  if (!book) return;
  if (book.custom) {
    state.books = state.books.filter((b) => b.id !== id);
    writeLS('custom', state.books.filter((b) => b.custom));
    if (state.uid) deleteDoc(doc(db, 'users', state.uid, 'books', id)).catch(() => {});
    delete state.entries[id];
    state.dirty.delete(id);
  } else {
    updateEntry(id, { hidden: true });
  }
  writeLS('entries', state.entries);
  schedulePersist();
}

/* ── PERSISTENCIA ────────────────────────────────────────────── */

let persistTimer = null;
let onSaveState = () => {};
export const onSave = (fn) => { onSaveState = fn; };

/** Agrupa las escrituras: teclear una reseña no debe ser 40 escrituras. */
function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => { flush().catch(() => {}); }, 900);
}

export async function flush() {
  if (!state.uid) return;                       // sin sesión, solo local
  if (!state.dirty.size && !state.settingsDirty) return;
  onSaveState('saving');
  const ids = [...state.dirty];
  state.dirty.clear();
  const hadSettings = state.settingsDirty;
  state.settingsDirty = false;
  try {
    const batch = writeBatch(db);
    for (const id of ids) {
      const book = findBook(id);
      const payload = { ...(state.entries[id] || {}) };
      if (book?.custom) Object.assign(payload, book);
      batch.set(doc(db, 'users', state.uid, 'books', id), payload, { merge: true });
    }
    if (hadSettings) {
      batch.set(doc(db, 'users', state.uid), {
        settings: state.settings, updatedAt: Date.now(),
      }, { merge: true });
    }
    await batch.commit();
    onSaveState('saved');
  } catch (e) {
    // Se devuelven a la cola: lo local ya está a salvo, se reintenta al próximo cambio
    ids.forEach((id) => state.dirty.add(id));
    if (hadSettings) state.settingsDirty = true;
    onSaveState('offline');
    console.warn('No se pudo guardar en Firestore, los datos siguen en este dispositivo:', e);
  }
}

// Nada se pierde al cerrar la pestaña con cambios pendientes
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush().catch(() => {});
});

/* ── CARGA ───────────────────────────────────────────────────── */

/** Pinta primero con lo local (instantáneo, funciona sin red) y luego sincroniza. */
export async function loadStore(userId) {
  state.uid = userId;
  state.entries = readLS('entries', {});
  state.settings = readLS('settings', {});
  const localCustom = readLS('custom', []);
  state.books = [...seedBooks(), ...localCustom];

  if (!userId) return { source: 'local' };

  try {
    const [userSnap, booksSnap] = await Promise.all([
      getDoc(doc(db, 'users', userId)),
      getDocs(collection(db, 'users', userId, 'books')),
    ]);

    const custom = [];
    const entries = {};
    booksSnap.forEach((d) => {
      const data = d.data() || {};
      const { title, author, genre, year, month, pages, role, custom: isCustom, ...rest } = data;
      if (isCustom) custom.push({ id: d.id, title, author, genre, year, month, pages, role, custom: true });
      entries[d.id] = rest;
    });

    if (booksSnap.size || userSnap.exists()) {
      state.entries = entries;
      state.books = [...seedBooks(), ...custom];
      state.settings = userSnap.data()?.settings || {};
      writeLS('entries', state.entries);
      writeLS('settings', state.settings);
      writeLS('custom', custom);
    }
    return { source: 'firestore', empty: !booksSnap.size && !userSnap.exists() };
  } catch (e) {
    console.warn('Sin conexión a Firestore, se usa la copia de este dispositivo:', e);
    return { source: 'local', error: e };
  }
}

/** Semilla inicial de una cuenta nueva. */
export async function seedNewAccount(profile) {
  if (!state.uid) return;
  await setDoc(doc(db, 'users', state.uid), {
    profile, settings: state.settings, createdAt: Date.now(), updatedAt: Date.now(),
  }, { merge: true });
}

/* ── EXPORTAR Y BORRAR  ·  historias #20 y #21 ───────────────── */

/** Un JSON legible por una persona, no un volcado interno. */
export function exportData() {
  const books = state.books.map((b) => {
    const e = entry(b.id);
    return {
      titulo: b.title, autor: b.author, genero: b.genre,
      paginas: b.pages, rol: b.role,
      planificado: b.year ? `${b.year}${b.month ? ' · ' + b.month : ''}` : null,
      estado: e.status || 'pendiente',
      valoracion: e.rating || null,
      resena: e.review || null,
      progresoPaginas: e.page ?? null,
      propio: !!b.custom,
    };
  });
  return {
    exportadoEl: new Date().toISOString(),
    app: 'Mi Biblioteca',
    ajustes: settings(),
    totalLibros: books.length,
    libros: books,
  };
}

export function exportCsv() {
  const rows = [['Title', 'Author', 'Genre', 'Pages', 'My Rating', 'Exclusive Shelf', 'My Review']];
  for (const b of state.books) {
    const e = entry(b.id);
    const shelf = { read: 'read', reading: 'currently-reading' }[e.status] || 'to-read';
    rows.push([b.title, b.author, b.genre, pageCount(b.pages) ?? '', e.rating || '', shelf, (e.review || '').replace(/\s+/g, ' ')]);
  }
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

/** Borra TODO lo de esta usuaria en Firestore. Recorre el árbol: no es una sola operación. */
export async function deleteAllUserData() {
  if (!state.uid) return;
  const booksSnap = await getDocs(collection(db, 'users', state.uid, 'books'));
  const chunks = [];
  let batch = writeBatch(db); let n = 0;
  booksSnap.forEach((d) => {
    batch.delete(d.ref);
    if (++n === 400) { chunks.push(batch.commit()); batch = writeBatch(db); n = 0; }
  });
  chunks.push(batch.commit());
  await Promise.all(chunks);
  await deleteDoc(doc(db, 'users', state.uid));
  for (const k of ['entries', 'settings', 'custom']) {
    try { localStorage.removeItem(lsKey(k)); } catch {}
  }
}

/** Para la migración: escribe de golpe un conjunto de entradas y libros propios. */
export async function bulkImport({ entries = {}, custom = [] }) {
  Object.entries(entries).forEach(([id, v]) => {
    state.entries[id] = { ...(state.entries[id] || {}), ...v };
    state.dirty.add(id);
  });
  custom.forEach((b) => {
    if (!state.books.some((x) => x.id === b.id)) state.books.push({ ...b, custom: true });
    state.dirty.add(b.id);
  });
  writeLS('entries', state.entries);
  writeLS('custom', state.books.filter((b) => b.custom));
  await flush();
}
