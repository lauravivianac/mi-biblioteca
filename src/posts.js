/* ─────────────────────────────────────────────────────────────
   EL BLOG · lo que habla con Firestore  ·  #72 y #73

   Lo tuyo vive en `users/{uid}/posts`, donde no entra nadie. Publicar
   es COPIAR a `posts/{id}`, y despublicar es borrar esa copia.

   LO PRIVADO NO SE COPIA NUNCA. No es que esté fuera y no se enseñe:
   es que no llega a salir de tu cuenta. Es la única forma de que
   «privada» signifique privada — ver el comentario de firestore.rules.
   ───────────────────────────────────────────────────────────── */

import {
  doc, getDoc, setDoc, deleteDoc, collection, getDocs, addDoc,
  query, where, limit,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from './firebase.js';
import { uid as myUid, myUsername, displayName } from './store.js';
import {
  postDoc, publicPostDoc, sePublica, porFecha, visibilidadesQuePuedoLeer,
} from './posts-core.js';

const TOPE = 100;

const mios = () => collection(db, 'users', myUid(), 'posts');
const mio = (id) => doc(db, 'users', myUid(), 'posts', id);
const copia = (id) => doc(db, 'posts', id);

/** Todo lo mío, de lo más reciente a lo más viejo. */
export async function misEntradas() {
  if (!myUid()) return [];
  try {
    const snap = await getDocs(query(mios(), limit(TOPE)));
    return porFecha(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) {
    console.warn('No se pudieron leer tus entradas:', e);
    return [];
  }
}

export async function unaEntrada(id) {
  if (!myUid() || !id) return null;
  try {
    const s = await getDoc(mio(id));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  } catch { return null; }
}

/**
 * Guardar. Crea o actualiza, y sincroniza la copia pública.
 *
 * El orden importa: primero lo tuyo, después la copia. Si la copia
 * falla —reglas sin desplegar, por ejemplo— tu texto YA está guardado.
 * Falla del lado seguro: se queda privada.
 */
export async function guardar(datos) {
  const me = myUid();
  if (!me) return { ok: false, error: 'Necesitas iniciar sesión.' };

  const d = postDoc({ ...datos, uid: me, editado: datos.id ? Date.now() : null });
  if (!d) return { ok: false, error: 'Escribe algo antes de guardar.' };
  const { id: _sinId, ...cuerpo } = d;

  try {
    let id = datos.id;
    if (id) await setDoc(mio(id), cuerpo, { merge: true });
    else id = (await addDoc(mios(), cuerpo)).id;

    await sincronizarCopia(id, { ...cuerpo, id });
    return { ok: true, id, entrada: { id, ...cuerpo } };
  } catch (e) {
    console.warn('No se pudo guardar la entrada:', e);
    return { ok: false, error: 'No se pudo guardar. Tu texto sigue en el dispositivo.' };
  }
}

/**
 * La copia pública, al día.
 *
 * Al volverla privada se BORRA. Dejarla ahí «pero sin enseñarla» sería
 * confiar en que nadie la pida, y las reglas conceden documentos
 * enteros: lo que está, se puede leer.
 */
async function sincronizarCopia(id, entrada) {
  const publica = publicPostDoc(entrada, {
    username: myUsername() || '', name: displayName(),
  });
  try {
    if (publica) {
      const { id: _quita, ...limpia } = publica;
      await setDoc(copia(id), limpia);
    } else {
      await deleteDoc(copia(id)).catch(() => {});
    }
  } catch (e) {
    console.warn('No se pudo publicar la entrada. Se queda privada:', e);
  }
}

/** Cambiar la visibilidad, en los dos sentidos y en cualquier momento. */
export async function cambiarVisibilidad(id, visibilidad) {
  const entrada = await unaEntrada(id);
  if (!entrada) return { ok: false };
  return guardar({ ...entrada, id, visibilidad });
}

export async function borrar(id) {
  if (!myUid() || !id) return { ok: false };
  try {
    await deleteDoc(mio(id));
    await deleteDoc(copia(id)).catch(() => {});
    return { ok: true };
  } catch (e) {
    console.warn('No se pudo borrar la entrada:', e);
    return { ok: false, error: 'No se pudo borrar.' };
  }
}

/**
 * Las entradas de otra persona.
 *
 * Se pide SOLO lo que se puede leer. En una consulta la regla se
 * evalúa documento a documento y basta que uno falle para que caiga
 * entera: pedirlo todo y esperar que el servidor filtre no devuelve
 * menos, devuelve un error.
 */
export async function entradasDe(otroUid, { laSigo = false } = {}) {
  if (!otroUid) return [];
  const puedo = visibilidadesQuePuedoLeer({ soyYo: otroUid === myUid(), laSigo });
  try {
    const snap = await getDocs(query(
      collection(db, 'posts'),
      where('uid', '==', otroUid),
      where('visibilidad', 'in', puedo),
      limit(TOPE),
    ));
    return porFecha(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) {
    console.warn('No se pudieron leer sus entradas:', e);
    return [];
  }
}

export { sePublica };
