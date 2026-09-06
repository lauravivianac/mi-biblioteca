/* ─────────────────────────────────────────────────────────────
   INTERCAMBIO · lo que habla con Firestore  ·  #81, #82, #89

   Las publicaciones viven en una colección propia y no dentro de
   users/{uid}: tienen que poder leerlas desconocidas de tu ciudad, y
   users/{uid} no se abre a nadie. La misma decisión de siempre en esta
   app — publicar es copiar a otro sitio con lo justo.

   Y aquí «lo justo» no incluye dónde vives. Ver place-core.js: entra
   la ciudad, la zona si la pusiste, y un geohash recortado. Nunca
   coordenadas.
   ───────────────────────────────────────────────────────────── */

import {
  doc, getDoc, setDoc, deleteDoc, collection, getDocs, addDoc,
  query, where, orderBy, limit,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from './firebase.js';
import {
  uid as myUid, myUsername, displayName, myPlace, allBooks, statusOf, coverOf,
} from './store.js';
import { swapDoc, puedePublicar, MAX_ACTIVAS } from './swap-core.js';
import { tieneCiudad } from './place-core.js';

const TOPE = 60;

/** Mis publicaciones, activas y retiradas. */
export async function misPublicaciones() {
  const me = myUid();
  if (!me) return [];
  try {
    const snap = await getDocs(query(
      collection(db, 'swaps'), where('uid', '==', me), limit(TOPE),
    ));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.at || 0) - (a.at || 0));
  } catch (e) {
    console.warn('No se pudieron leer tus publicaciones:', e);
    return [];
  }
}

export const activasDe = (lista = []) => lista.filter((p) => p.activa);

/**
 * ¿Puedo publicar, y si no, qué me falta?
 *
 * Se resuelve aquí y no en la pantalla porque hace falta contar las
 * publicaciones activas, que es una consulta. La pantalla solo pinta
 * lo que esto devuelve.
 */
export async function estadoParaPublicar(user) {
  const activas = activasDe(await misPublicaciones()).length;
  const libros = allBooks().filter((b) => statusOf(b.id) !== 'pending').length;
  return puedePublicar({
    emailVerified: user?.emailVerified === true,
    createdAt: Number(user?.metadata?.creationTime
      ? Date.parse(user.metadata.creationTime) : null) || null,
    libros,
    activas,
    ciudad: tieneCiudad(myPlace()),
  });
}

/** Poner un libro leído como disponible. */
export async function publicar(book, datos = {}) {
  const me = myUid();
  if (!me) return { ok: false, error: 'Necesitas iniciar sesión.' };
  const place = myPlace();
  if (!tieneCiudad(place)) return { ok: false, error: 'Primero di en qué ciudad estás.' };

  const d = swapDoc({
    uid: me, username: myUsername() || '', name: displayName(),
    book: { ...book, cover: coverOf(book.id) },
    place,
    ...datos,
  });
  if (!d) return { ok: false, error: 'Falta algo para publicarlo.' };

  try {
    const ref = await addDoc(collection(db, 'swaps'), d);
    return { ok: true, id: ref.id, publicacion: { id: ref.id, ...d } };
  } catch (e) {
    console.warn('No se pudo publicar:', e);
    return { ok: false, error: 'No se pudo publicar. ¿Están desplegadas las reglas?' };
  }
}

/**
 * Retirar.
 *
 * Se marca como no activa en vez de borrarse: si alguien te escribió
 * por ese libro, borrar el documento dejaría su conversación hablando
 * de algo que ya no existe. Retirar la saca de la lista y la deja
 * donde estaba.
 */
export async function retirar(id) {
  if (!id) return { ok: false };
  try {
    await setDoc(doc(db, 'swaps', id), { activa: false }, { merge: true });
    return { ok: true };
  } catch (e) {
    console.warn('No se pudo retirar:', e);
    return { ok: false, error: 'No se pudo retirar.' };
  }
}

export async function volverAPublicar(id) {
  if (!id) return { ok: false };
  try {
    await setDoc(doc(db, 'swaps', id), { activa: true, at: Date.now() }, { merge: true });
    return { ok: true };
  } catch (e) {
    console.warn('No se pudo volver a publicar:', e);
    return { ok: false };
  }
}

export async function borrarPublicacion(id) {
  if (!id) return { ok: false };
  try { await deleteDoc(doc(db, 'swaps', id)); return { ok: true }; } catch { return { ok: false }; }
}

/** ¿Este libro ya está publicado? Para no ofrecerlo dos veces. */
export function yaPublicado(lista = [], bookId) {
  return lista.find((p) => p.bookId === bookId && p.activa) || null;
}

export { MAX_ACTIVAS };
