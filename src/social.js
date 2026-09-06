/* ─────────────────────────────────────────────────────────────
   SEGUIR Y ENCONTRAR · lo que habla con Firestore  ·  #46 y #47

   SOBRE LOS CONTADORES, QUE ES LA DECISIÓN QUE MÁS PESA AQUÍ.

   La nota de la historia #46 propone mantenerlos con escrituras
   incrementales en vez de contar documentos. Tiene razón en el fondo
   —contar no escala— pero aquí no se puede hacer de forma segura, y
   conviene decir por qué:

   para subir TU contador de seguidoras cuando yo te sigo, yo tendría
   que poder escribir en tu documento. Sin un servidor de confianza
   —una Cloud Function— eso significa abrir tu perfil a que cualquiera
   le escriba, y entonces cualquiera puede ponerte las seguidoras que
   quiera, o algo peor. Un contador bonito no vale eso.

   Así que se cuentan los documentos, con tope. A esta escala son unas
   pocas lecturas de documentos diminutos. Cuando esto empiece a doler
   —y se notará— la solución no es cambiar el número por otro sitio en
   el cliente, es una Cloud Function que lo mantenga; queda apuntado.

   `getCountFromServer` habría sido lo suyo, pero no puedo comprobar
   desde aquí que esté en el paquete que carga la app, y un símbolo que
   no existe al importar tumba el módulo entero y con él la aplicación.
   No se arriesga la app por ahorrar unas lecturas.
   ───────────────────────────────────────────────────────────── */

import {
  doc, getDoc, setDoc, deleteDoc, collection, getDocs,
  query, where, limit, orderBy, writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from './firebase.js';
import { uid as myUid, myUsername, displayName } from './store.js';
import {
  followId, canFollow, followDoc, followNotice, byNewest,
} from './follows-core.js';
import {
  parseQuery, buscable, rankPeople, dedupe, sinMi,
  commonBooks, rankSuggestions, clavesParaBuscar, prefixRange,
} from './search-core.js';

/* Tope de todo lo que se lee de golpe. Una pantalla no enseña más. */
const TOPE = 100;

const followRef = (a, b) => doc(db, 'follows', followId(a, b));
const profileRef = (u) => doc(db, 'profiles', u);

/* ── SEGUIR  ·  historia #46 ─────────────────────────────────── */

/** ¿Sigo a esta persona? Una lectura directa, sin consulta. */
export async function isFollowing(otherUid) {
  const me = myUid();
  if (!canFollow(me, otherUid)) return false;
  try {
    return (await getDoc(followRef(me, otherUid))).exists();
  } catch (e) {
    console.warn('No se pudo comprobar el seguimiento:', e);
    return false;
  }
}

/** ¿Me sigue? La flecha contraria, que es otro documento. */
export async function isFollowedBy(otherUid) {
  const me = myUid();
  if (!canFollow(me, otherUid)) return false;
  try {
    return (await getDoc(followRef(otherUid, me))).exists();
  } catch { return false; }
}

/**
 * Seguir.
 *
 * El aviso va en el MISMO lote que la flecha: seguir a alguien sin que
 * se entere, o avisar de un seguimiento que no se guardó, son las dos
 * formas de quedar a medias. O las dos cosas o ninguna.
 */
export async function follow(otherUid) {
  const me = myUid();
  if (!canFollow(me, otherUid)) return { ok: false, error: 'No puedes seguirte a ti misma.' };
  const flecha = followDoc({ follower: me, following: otherUid });
  const aviso = followNotice({
    from: me, to: otherUid,
    fromName: displayName(), fromUsername: myUsername() || '',
  });
  try {
    const batch = writeBatch(db);
    batch.set(followRef(me, otherUid), flecha);
    batch.set(doc(db, 'notifs', otherUid, 'items', `follow_${me}`), aviso);
    await batch.commit();
    return { ok: true };
  } catch (e) {
    console.warn('No se pudo seguir:', e);
    return { ok: false, error: 'No se pudo. ¿Están desplegadas las reglas?' };
  }
}

/**
 * Dejar de seguir: inmediato y CALLADO.
 *
 * Lo pide la historia, y no es cortesía: si avisara, dejar de seguir
 * tendría un coste social y nadie lo usaría. Se borra también el aviso
 * de cuando la seguiste, para no dejar en su bandeja la noticia de un
 * seguimiento que ya no existe.
 */
export async function unfollow(otherUid) {
  const me = myUid();
  if (!canFollow(me, otherUid)) return { ok: false };
  try {
    const batch = writeBatch(db);
    batch.delete(followRef(me, otherUid));
    batch.delete(doc(db, 'notifs', otherUid, 'items', `follow_${me}`));
    await batch.commit();
    return { ok: true };
  } catch (e) {
    console.warn('No se pudo dejar de seguir:', e);
    return { ok: false, error: 'No se pudo. Inténtalo otra vez.' };
  }
}

/** Los uid a quienes sigue alguien. */
export async function followingOf(userUid) {
  if (!userUid) return [];
  try {
    const snap = await getDocs(query(
      collection(db, 'follows'), where('follower', '==', userUid), limit(TOPE),
    ));
    return snap.docs.map((d) => d.data().following).filter(Boolean);
  } catch (e) {
    console.warn('No se pudo leer a quién sigue:', e);
    return [];
  }
}

/** Los uid que siguen a alguien. */
export async function followersOf(userUid) {
  if (!userUid) return [];
  try {
    const snap = await getDocs(query(
      collection(db, 'follows'), where('following', '==', userUid), limit(TOPE),
    ));
    return snap.docs.map((d) => d.data().follower).filter(Boolean);
  } catch (e) {
    console.warn('No se pudo leer quién le sigue:', e);
    return [];
  }
}

/** Los dos números de un perfil, de una vez. */
export async function followCounts(userUid) {
  const [sigue, siguen] = await Promise.all([followingOf(userUid), followersOf(userUid)]);
  return { siguiendo: sigue.length, seguidoras: siguen.length };
}

/* ── PERFILES EN BLOQUE ──────────────────────────────────────── */

/**
 * Varios perfiles por uid.
 *
 * Uno a uno y en paralelo: `in` de Firestore admite 30 por consulta y
 * habría que trocear igual, y aquí ya hay tope de TOPE. Lo que no se
 * puede leer se cae de la lista en vez de tumbarla.
 */
export async function profilesOf(uids = []) {
  const unicos = [...new Set(uids)].slice(0, TOPE);
  const docs = await Promise.all(unicos.map(async (u) => {
    try {
      const s = await getDoc(profileRef(u));
      return s.exists() ? s.data() : null;
    } catch { return null; }
  }));
  return docs.filter(Boolean);
}

/* ── BUSCAR  ·  historia #47 ─────────────────────────────────── */

/**
 * Buscar personas por @usuario o por nombre.
 *
 * Dos caminos a la vez porque son dos preguntas distintas: el @usuario
 * es una dirección exacta y se resuelve leyendo un documento; el nombre
 * es un principio de palabra y necesita un rango. Se lanzan juntas y se
 * mezclan; el orden lo pone rankPeople, que sube el exacto arriba.
 */
export async function searchPeople(texto) {
  if (!buscable(texto)) return [];
  const { texto: q, handle } = parseQuery(texto);

  const porHandle = handle ? (async () => {
    try {
      const n = await getDoc(doc(db, 'usernames', handle));
      if (!n.exists()) return [];
      const p = await getDoc(profileRef(n.data().uid));
      return p.exists() ? [p.data()] : [];
    } catch { return []; }
  })() : Promise.resolve([]);

  const porNombre = (async () => {
    try {
      /* «Empieza por»: Firestore no sabe «contiene», solo rangos. El
         carácter alto de prefixRange cierra el rango en todo lo que
         empiece igual; sin él, «lau» solo encontraría a quien se
         llame exactamente «lau». Va aparte porque es invisible al
         leerlo, y un carácter invisible dentro de una consulta es de
         las cosas que se borran sin querer. */
      const [desde, hasta] = prefixRange(q);
      const snap = await getDocs(query(
        collection(db, 'profiles'),
        orderBy('nameLower'),
        where('nameLower', '>=', desde),
        where('nameLower', '<=', hasta),
        limit(20),
      ));
      return snap.docs.map((d) => d.data());
    } catch (e) {
      console.warn('No se pudo buscar por nombre:', e);
      return [];
    }
  })();

  const [a, b] = await Promise.all([porHandle, porNombre]);
  return rankPeople(sinMi(dedupe([...a, ...b]), myUid()), texto);
}

/**
 * Quizá conozcas: gente que ha leído lo mismo que tú.
 *
 * `misLeidos` son los identificadores de mis libros terminados. Solo
 * aparecen quienes encendieron «que me encuentren por mis libros»: el
 * campo no existe en los demás perfiles, así que la consulta no los
 * puede devolver ni por accidente.
 */
export async function suggestedPeople(misLeidos = []) {
  const claves = clavesParaBuscar(misLeidos.map(String));
  if (!claves.length) return [];
  const me = myUid();
  try {
    const snap = await getDocs(query(
      collection(db, 'profiles'),
      where('librosLeidos', 'array-contains-any', claves),
      limit(40),
    ));
    const yaSigo = new Set(await followingOf(me));
    const gente = snap.docs.map((d) => d.data())
      .filter((p) => p.uid !== me && !yaSigo.has(p.uid))
      .map((p) => ({ ...p, comunes: commonBooks(claves, p.librosLeidos || []).length }));
    return rankSuggestions(gente);
  } catch (e) {
    console.warn('No se pudieron buscar sugerencias:', e);
    return [];
  }
}

/* ── LA BANDEJA DE AVISOS ────────────────────────────────────── */

export async function myNotices() {
  const me = myUid();
  if (!me) return [];
  try {
    const snap = await getDocs(query(collection(db, 'notifs', me, 'items'), limit(TOPE)));
    return byNewest(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) {
    console.warn('No se pudieron leer los avisos:', e);
    return [];
  }
}

/** Marcar todo como leído al abrir la bandeja. */
export async function markNoticesRead(avisos = []) {
  const me = myUid();
  const pendientes = avisos.filter((a) => !a.leido);
  if (!me || !pendientes.length) return;
  try {
    const batch = writeBatch(db);
    for (const a of pendientes) {
      batch.set(doc(db, 'notifs', me, 'items', a.id), { leido: true }, { merge: true });
    }
    await batch.commit();
  } catch (e) {
    console.warn('No se pudieron marcar los avisos como leídos:', e);
  }
}

export async function dropNotice(id) {
  const me = myUid();
  if (!me || !id) return;
  try { await deleteDoc(doc(db, 'notifs', me, 'items', id)); } catch (e) {
    console.warn('No se pudo borrar el aviso:', e);
  }
}
