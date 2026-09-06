/* ─────────────────────────────────────────────────────────────
   MIGRACIÓN DE LOS DATOS ANTIGUOS  ·  historia #17

   El documento `biblioteca/laura` guardaba los libros como cadenas
   JSON dentro de campos. Esto lo trae a users/{uid}/books/*.

   Es idempotente: correrlo dos veces no duplica nada, porque las
   entradas se escriben por id de libro y los libros propios
   conservan su id original.
   ───────────────────────────────────────────────────────────── */

import { doc, getDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from './firebase.js';
import { bulkImport, exportData } from './store.js';
import { seedBooks, LEGACY_ALWAYS_READ } from './seed.js';

const LEGACY_DOC = ['biblioteca', 'laura'];

const parse = (raw, fallback) => {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return fallback; }
};

/** ¿Existe algo que migrar? Se consulta antes de ofrecerlo, para no prometer en vano. */
export async function findLegacyData() {
  try {
    const snap = await getDoc(doc(db, ...LEGACY_DOC));
    if (!snap.exists()) return null;
    const d = snap.data();
    const entries = parse(d.userData, {});
    const custom = parse(d.customBooks, []);
    const covers = parse(d.covers, {});
    const count = Object.keys(entries).length;
    if (!count && !custom.length) return null;
    return { entries, custom, covers, count, customCount: custom.length };
  } catch (e) {
    console.warn('No se pudo leer el documento antiguo:', e);
    return null;
  }
}

/**
 * Trae los datos antiguos a la cuenta actual.
 * Devuelve un recuento para poder verificar antes y después.
 */
export async function importLegacy(legacy) {
  const seeds = seedBooks();
  const byTitle = new Map(seeds.map((b) => [b.title, b.id]));

  const entries = {};
  for (const [id, value] of Object.entries(legacy.entries || {})) {
    const clean = {};
    if (value.status) clean.status = value.status;
    if (value.rating) clean.rating = value.rating;
    if (value.review) clean.review = value.review;
    if (value.hidden) clean.hidden = true;
    if (legacy.covers?.[id]) clean.cover = legacy.covers[id];
    if (Object.keys(clean).length) entries[id] = clean;
  }

  // Las portadas cacheadas de libros sin otro estado también se conservan
  for (const [id, url] of Object.entries(legacy.covers || {})) {
    if (url && !entries[id]) entries[id] = { cover: url };
  }

  /* Los ocho libros que el código antiguo forzaba como leídos en CADA carga.
     Eran los datos reales de Laura, así que se aplican aquí una sola vez;
     de lo contrario, toda usuaria nueva empezaría con ocho libros leídos. */
  for (const title of LEGACY_ALWAYS_READ) {
    const id = byTitle.get(title);
    if (id) entries[id] = { ...(entries[id] || {}), status: 'read' };
  }

  const custom = (legacy.custom || []).map((b) => ({ ...b, custom: true }));

  await bulkImport({ entries, custom });

  return {
    entradas: Object.keys(entries).length,
    librosPropios: custom.length,
    leidos: Object.values(entries).filter((e) => e.status === 'read').length,
  };
}

/** Copia de seguridad antes de tocar nada. */
export function backupBeforeMigrating(legacy) {
  const blob = { origen: 'biblioteca/laura', copiadoEl: new Date().toISOString(), datos: legacy };
  return JSON.stringify(blob, null, 2);
}

/**
 * Borra el documento antiguo una vez migrado.
 * Mientras exista, las reglas dejan que cualquiera con sesión lo lea,
 * que es lo que permite migrarlo. Borrarlo cierra esa puerta.
 */
export const dropLegacy = () => deleteDoc(doc(db, ...LEGACY_DOC));

export { exportData };
