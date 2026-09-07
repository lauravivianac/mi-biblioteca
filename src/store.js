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
import { publicReviewDoc, isPublicReview, publicCount } from './reviews-core.js';
import { streakInfo, addDay } from './streak-core.js';
import { validateUsername, canChangeUsername, normalize } from './username-core.js';
import { publicProfileDoc, seccionVisible, followersOnlyDoc, esPrivada } from './profile-core.js';
import { activityDoc, activityId } from './feed-core.js';
import { placeDoc } from './place-core.js';
import { DEFAULT_THEME } from './themes.js';

const state = {
  uid: null,
  books: [],        // semilla + propios, ya fusionados
  entries: {},      // bookId -> { status, rating, review, reviewPublic, hidden, page, cover, pinnedMonth }
  settings: {},
  dirty: new Set(),
  /* Aparte del resto a propósito: la copia pública solo se toca cuando
     cambia la reseña o su interruptor. Si fuera con `dirty`, anotar una
     página escribiría en la colección pública, que es a la vez un gasto
     y una escritura que no tendría por qué existir. */
  reviewDirty: new Set(),
  /* El perfil público (#45) se rehace entero cada vez, así que basta
     una bandera. Se levanta cuando cambia algo que se ve desde fuera —
     los ajustes, o el estado de un libro—, no al anotar una página:
     nadie necesita que tu perfil se reescriba porque pasaste de la 40
     a la 41. */
  profileDirty: false,
  /* Los hechos que hay que publicar en el feed (#49). Es una cola y no
     una bandera porque cada uno es un documento distinto. */
  activityQueue: [],
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
  themeId: DEFAULT_THEME,
  achievements: [],
  minutesWeekday: null,
  minutesWeekend: null,
  goalKind: 'books',      // 'books' | 'pages' | 'minutes'
  goalValue: null,
  goalYear: new Date().getFullYear(),
  onboarded: false,
  /* El consentimiento del agente: undefined = sin preguntar todavía,
     'si', 'no'. Ausente a propósito de esta lista: que el valor por
     defecto sea «sin decidir» es el punto de la historia #61, y
     ponerlo aquí como 'si' sería volver al problema. */
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
export const reviewIsPublic = (id) => isPublicReview(state.entries[id] || {});
export const publicReviewCount = () => publicCount(state.entries);
export const coverOf = (id) => state.entries[id]?.cover ?? null;
export const settings = () => ({ ...DEFAULT_SETTINGS, ...state.settings });

/* ── LA RACHA  ·  historia #68 ────────────────────────────────
   Los días con actividad se guardan como fechas LOCALES en los
   ajustes. La racha en sí no se guarda: se deduce de esos días cada
   vez. Un contador guardado se desincroniza en cuanto cambias de
   dispositivo, y entonces la racha depende de la historia de tus
   clics en vez de tus días de lectura. */

export const readingDays = () => settings().readingDays || [];
export const myStreak = () => streakInfo(readingDays());

/**
 * Apuntar que hoy hubo lectura.
 *
 * Se llama desde donde se registra progreso de verdad —anotar página,
 * empezar un libro, terminarlo—, nunca al abrir la app: una racha que
 * sube por mirar la pantalla no mide nada.
 */
export function recordReadingDay(date = new Date()) {
  const antes = readingDays();
  const despues = addDay(antes, date);
  if (despues === antes) return false;      // ya estaba apuntado hoy
  updateSettings({ readingDays: despues });
  return true;
}

/* ── EL @USUARIO  ·  historia #44 ─────────────────────────────
   El nombre propio vive en los ajustes, que ya se sincronizan. El
   ÍNDICE —quién tiene cada nombre— vive en la colección `usernames`,
   fuera de users/{uid}, porque tiene que poder leerlo cualquiera para
   saber si está libre y para encontrarte.

   ESTUVO EN `social/usernames/{nombre}` Y NO FUNCIONABA. En Firestore
   las rutas alternan colección y documento, así que un documento
   siempre tiene un número PAR de segmentos; `social/usernames/laura`
   tiene tres y es una colección. `doc()` lanzaba antes de llegar a la
   red, el try/catch de abajo se lo tragaba, y salía «No se pudo
   comprobar. ¿Hay conexión?» — culpando a la red de un error de ruta.
   Con dos segmentos, `usernames/laura` sí es un documento. */

export const myUsername = () => settings().username || null;

/* ── DÓNDE ESTOY  ·  historia #81 ─────────────────────────────
   Vive en los ajustes, que ya se sincronizan, y de ahí sale al perfil
   público SOLO la ciudad — nunca el geohash, que es para el
   intercambio y no para que lo lea cualquiera que abra tu perfil. */

export const myPlace = () => settings().place || null;

export function setPlace(datos) {
  const p = placeDoc(datos);
  updateSettings({ place: p, city: p?.city || '' });
  return p;
}

export function clearPlace() {
  updateSettings({ place: null, city: '' });
}

/** ¿Mi cuenta es privada?  ·  historia #52 */
export const soyPrivada = () => esPrivada(settings());

const usernameRef = (handle) => doc(db, 'usernames', normalize(handle));

/** ¿Está libre? Es una respuesta con fecha de caducidad: ver claimUsername. */
export async function isUsernameFree(handle) {
  const v = validateUsername(handle);
  if (!v.ok) return { free: false, error: v.error };
  if (v.username === myUsername()) return { free: true, mine: true };
  if (!state.uid) return { free: false, error: 'Necesitas iniciar sesión.' };
  try {
    const snap = await getDoc(usernameRef(v.username));
    return snap.exists()
      ? { free: false, error: 'Ese nombre ya está cogido.' }
      : { free: true };
  } catch (e) {
    return { free: false, error: 'No se pudo comprobar. ¿Hay conexión?' };
  }
}

/**
 * Quedarse un nombre.
 *
 * Lo que devuelve isUsernameFree es cierto en el momento de mirar y
 * puede dejar de serlo un segundo después. Por eso quien decide de
 * verdad es el servidor: si el documento ya existe, la regla lo
 * rechaza —ver el `set` de abajo— y aquí se traduce ese fallo a «ya
 * está cogido». No hay comprobación en el cliente que pueda evitar la
 * carrera, solo disimularla.
 *
 * El cambio es un LOTE: se pide el nuevo y se suelta el viejo en la
 * misma escritura. Si el nuevo falla, el viejo sigue siendo tuyo.
 */
export async function claimUsername(handle) {
  const v = validateUsername(handle);
  if (!v.ok) return { ok: false, error: v.error };
  if (!state.uid) return { ok: false, error: 'Necesitas iniciar sesión.' };

  const actual = myUsername();
  if (v.username === actual) return { ok: true, username: actual, sinCambios: true };

  const puede = canChangeUsername(settings());
  if (!puede.ok) return { ok: false, error: puede.error };

  try {
    const batch = writeBatch(db);
    /* Es `set` y no `create` porque el SDK del navegador no tiene
       `create` —solo el de servidor—, y da igual: si el documento ya
       existe, Firestore evalúa esto como un UPDATE, y la regla dice
       `allow update: if false`. El servidor lo rechaza exactamente
       igual. La unicidad sigue estando donde tiene que estar. */
    batch.set(usernameRef(v.username), { uid: state.uid, at: Date.now() });
    if (actual) batch.delete(usernameRef(actual));
    await batch.commit();
  } catch (e) {
    /* El servidor dijo que no. La causa casi siempre es que alguien
       llegó antes; el resto son reglas sin desplegar o falta de red. */
    console.warn('No se pudo tomar el nombre:', e);
    return { ok: false, error: 'Ese nombre ya está cogido. Prueba otro.' };
  }

  updateSettings({ username: v.username, usernameChangedAt: Date.now() });
  return { ok: true, username: v.username };
}

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
  const antes = state.entries[id] || {};
  state.entries[id] = { ...antes, ...patch };
  state.dirty.add(id);

  /* ── EL FEED  ·  historia #49 ──────────────────────────────
     Solo cuando el estado CAMBIA de verdad. Sin comparar con lo que
     había, cada anotación de página volvería a publicar «empezó a
     leer» y el feed de quien te sigue sería una sola persona
     repitiendo el mismo libro. */
  if ('status' in patch && patch.status !== antes.status) {
    if (patch.status === 'reading') encolarActividad({ tipo: 'empezo', bookId: id });
    if (patch.status === 'read') encolarActividad({ tipo: 'termino', bookId: id });
  }
  /* Cambiar el texto también puede despublicar: si lo borras, la copia
     pública tiene que irse contigo, sin acordarte del interruptor. */
  if ('review' in patch || 'reviewPublic' in patch) state.reviewDirty.add(id);
  /* Lo que se ve desde fuera: empezar o terminar un libro, cambiarle la
     portada, moverlo de estantería. Anotar una página, no. */
  if ('status' in patch || 'cover' in patch || 'shelfIds' in patch || 'finishedAt' in patch) {
    state.profileDirty = true;
  }
  writeLS('entries', state.entries);
  schedulePersist();
}

/**
 * Publicar una reseña, o volver a guardársela  ·  historia #28
 *
 * En los dos sentidos y en cualquier momento. Lo que se publica no es
 * este documento —que lleva dentro por dónde vas, tus citas y lo demás—
 * sino una COPIA con lo justo, en otra colección; ver reviews-core.js.
 */
export const setReviewPublic = (id, pub) => updateEntry(id, { reviewPublic: !!pub });

export function updateSettings(patch) {
  state.settings = { ...settings(), ...patch };
  state.settingsDirty = true;
  /* Casi todo lo que se toca en ajustes se ve en el perfil: la bio, la
     ciudad, las estanterías, la mascota, qué secciones enseñas. Se
     rehace entero y es una escritura, así que no merece la pena hilar
     más fino que esto. */
  state.profileDirty = true;
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
  /* Quitar el libro se lleva su reseña pública. Dejarla publicada
     sería lo contrario de lo que acabas de pedir, y no habría dónde
     ir a quitarla: la ficha con el interruptor ya no existe. */
  state.reviewDirty.add(id);
  /* Y su rastro en el feed: dejar «terminó Pedro Páramo» de un libro
     que ya no está en tu biblioteca es contar algo que ya no es cierto. */
  borrarActividadDe(id);
  if (book.custom) {
    state.books = state.books.filter((b) => b.id !== id);
    writeLS('custom', state.books.filter((b) => b.custom));
    if (state.uid) deleteDoc(doc(db, 'users', state.uid, 'books', id)).catch(() => {});
    delete state.entries[id];
    state.dirty.delete(id);
  } else {
    updateEntry(id, { hidden: true, reviewPublic: false });
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

/** Dónde vive la copia pública de una reseña. La ruta la comprueban las reglas. */
const publicReviewRef = (userId, bookId) =>
  doc(db, 'reviews', userId, 'entries', bookId);

export async function flush() {
  if (!state.uid) return;                       // sin sesión, solo local
  if (!state.dirty.size && !state.reviewDirty.size
      && !state.settingsDirty && !state.profileDirty) return;
  onSaveState('saving');
  const ids = [...state.dirty];
  state.dirty.clear();
  const reviewIds = [...state.reviewDirty];
  state.reviewDirty.clear();
  const hadSettings = state.settingsDirty;
  state.settingsDirty = false;
  const hadProfile = state.profileDirty;
  state.profileDirty = false;
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

  await flushPublicReviews(reviewIds);
  if (hadProfile) await flushProfile();
  await flushActivity();
}

/**
 * Las copias públicas, en su propia escritura y no en el lote anterior.
 *
 * Iban juntas hasta que caí en esto: la colección `reviews` solo existe
 * si están desplegadas las reglas nuevas (`firebase deploy --only
 * firestore:rules`). Si no lo están, esa escritura la rechaza el
 * servidor — y en un lote único se habría llevado por delante el
 * guardado de TODOS los libros. Un interruptor que nadie ha tocado no
 * puede romper el guardado de quien no lo usa.
 *
 * Falla del lado seguro: si la escritura no pasa, la reseña NO se
 * publica; se reintenta con el próximo cambio y al cerrar la pestaña.
 */
async function flushPublicReviews(ids) {
  if (!ids.length || !state.uid) return;
  try {
    const batch = writeBatch(db);
    for (const id of ids) {
      const copia = publicReviewDoc({
        uid: state.uid, book: findBook(id), entry: state.entries[id],
      });
      const ref = publicReviewRef(state.uid, id);
      if (copia) {
        batch.set(ref, copia);
        encolarActividad({ tipo: 'resena', bookId: id });
      } else {
        batch.delete(ref);
      }
    }
    await batch.commit();
  } catch (e) {
    ids.forEach((id) => state.reviewDirty.add(id));
    console.warn(
      'No se pudo actualizar la visibilidad de una reseña. Se reintentará. '
      + '¿Están desplegadas las reglas de firestore.rules?', e,
    );
  }
}

/* ── EL PERFIL PÚBLICO  ·  historia #45 ───────────────────────
   Mismo trato que las reseñas y por el mismo motivo: es una COPIA en
   otra colección, con lo justo, y va en su propia escritura para que
   un fallo suyo no se lleve por delante el guardado de los libros.

   Quien decide qué se copia es profile-core.js, y ahí está probado. */

const profileRef = (userId) => doc(db, 'profiles', userId);

/* El nombre visible lo tiene Auth, no el store. Se le pasa al entrar en
   vez de importar auth.js, que importaría store.js de vuelta. */
let currentDisplayName = '';
export const setDisplayName = (n) => { currentDisplayName = String(n || ''); };
export const displayName = () => currentDisplayName;

/** Los datos que necesita el core, sacados del estado de aquí. */
function datosDelPerfil() {
  return {
    uid: state.uid,
    username: myUsername(),
    name: currentDisplayName,
    settings: settings(),
    books: allBooks().map((b) => ({
      ...b,
      status: statusOf(b.id),
      cover: coverOf(b.id),
      pct: progressPct(b.id),
      shelfIds: entry(b.id).shelfIds || [],
      finishedAt: entry(b.id).finishedAt || null,
      /* Los libros semilla guardan las páginas como «~124», con tilde,
         porque son aproximadas. Sin pasarlas por pageCount el perfil
         publicaba «0 páginas» con la biblioteca llena. */
      pages: pageCount(b.pages) || 0,
      rating: ratingOf(b.id),
    })),
    racha: myStreak().actual,
  };
}

/* ── LA ACTIVIDAD DEL FEED  ·  historia #49 ──────────────────
   Mismo trato que el perfil y las reseñas: una COPIA con lo justo, en
   su propia colección y en su propia escritura.

   No hay reparto a las seguidoras, y es a propósito: la nota de la
   historia dice que con pocas usuarias leer al vuelo es más simple y
   más barato que repartir copias, y tiene razón. Cuando repartir haga
   falta se notará; adelantarlo sería pagar complejidad por un problema
   que todavía no existe. */

function encolarActividad(evento) {
  state.activityQueue.push(evento);
}

/** Publicar un logro conseguido. Lo llama achievements. */
export function recordAchievement(nombre) {
  if (!nombre) return;
  encolarActividad({ tipo: 'logro', logro: nombre });
  schedulePersist();
}

async function flushActivity() {
  const cola = state.activityQueue;
  state.activityQueue = [];
  if (!cola.length || !state.uid) return;

  /* Apagado el interruptor, no se escribe NADA. No es que se oculte
     luego: es que no llega a existir. */
  if (!seccionVisible(settings(), 'actividad')) return;

  try {
    const batch = writeBatch(db);
    for (const ev of cola) {
      const libro = ev.bookId ? findBook(ev.bookId) : null;
      const copia = activityDoc({
        uid: state.uid,
        username: myUsername() || '',
        name: currentDisplayName,
        tipo: ev.tipo,
        logro: ev.logro,
        book: libro ? { ...libro, cover: coverOf(ev.bookId) } : null,
        rating: ratingOf(ev.bookId),
        review: ev.tipo === 'resena' ? reviewOf(ev.bookId) : '',
      });
      if (!copia) continue;
      batch.set(
        doc(db, 'activity', activityId(state.uid, ev.tipo, ev.bookId || ev.logro)),
        copia,
      );
    }
    await batch.commit();
  } catch (e) {
    /* No se reintenta: una entrada de feed que llega tarde es ruido, y
       perderla no rompe nada de lo que la usuaria tiene guardado. Lo
       suyo sigue a salvo en users/{uid}. */
    console.warn('No se pudo publicar en el feed:', e);
  }
}

/** Borrar del feed lo que ya no debería estar. */
async function borrarActividadDe(bookId) {
  if (!state.uid || !bookId) return;
  try {
    const batch = writeBatch(db);
    for (const tipo of ['empezo', 'termino', 'resena']) {
      batch.delete(doc(db, 'activity', activityId(state.uid, tipo, bookId)));
    }
    await batch.commit();
  } catch (e) {
    console.warn('No se pudo retirar la actividad del feed:', e);
  }
}

async function flushProfile() {
  if (!state.uid) return;
  try {
    const datos = datosDelPerfil();
    const copia = publicProfileDoc(datos);
    /* Sin @usuario todavía no hay perfil que publicar. No es un error:
       es que aún no ha elegido nombre. */
    if (!copia) return;
    await setDoc(profileRef(state.uid), copia);

    /* Con la cuenta privada (#52), lo que no va en la tarjeta va en un
       documento aparte que solo pueden leer las seguidoras. Al volver a
       público se BORRA: dejarlo ahí sería dejar una copia de tus datos
       en un sitio que ya no hace falta. */
    const soloSeguidoras = followersOnlyDoc(datos);
    const refFull = doc(db, 'profiles', state.uid, 'full', 'data');
    if (soloSeguidoras) await setDoc(refFull, soloSeguidoras);
    else await deleteDoc(refFull).catch(() => {});
  } catch (e) {
    state.profileDirty = true;      // se reintenta con el próximo cambio
    console.warn(
      'No se pudo actualizar tu perfil público. Se reintentará. '
      + '¿Están desplegadas las reglas de firestore.rules?', e,
    );
  }
}

/** Forzar la publicación ahora — al elegir @usuario, por ejemplo. */
export async function publishProfile() {
  state.profileDirty = false;
  await flushProfile();
}

/** Quitar el perfil público del todo. */
export async function unpublishProfile() {
  if (!state.uid) return;
  try { await deleteDoc(profileRef(state.uid)); } catch (e) {
    console.warn('No se pudo retirar el perfil público:', e);
  }
}

/**
 * El perfil de otra persona, por su @usuario.
 *
 * Dos lecturas y no una: `usernames/{nombre}` solo dice de quién es
 * ese nombre, y el perfil vive bajo el uid. Separarlos es lo que
 * permite cambiar de nombre sin que el perfil cambie de sitio.
 */
export async function fetchProfile(handle) {
  const nombre = normalize(handle);
  if (!nombre) return { ok: false, error: 'Falta el nombre de usuaria.' };
  try {
    const nameSnap = await getDoc(doc(db, 'usernames', nombre));
    if (!nameSnap.exists()) return { ok: false, error: 'No hay nadie con ese nombre.' };
    const otherUid = nameSnap.data()?.uid;
    if (!otherUid) return { ok: false, error: 'No hay nadie con ese nombre.' };

    const perfil = await getDoc(profileRef(otherUid));
    if (!perfil.exists()) return { ok: false, error: 'Esa persona todavía no tiene perfil público.' };
    return { ok: true, profile: perfil.data(), uid: otherUid, mio: otherUid === state.uid };
  } catch (e) {
    console.warn('No se pudo abrir el perfil:', e);
    return { ok: false, error: 'No se pudo abrir el perfil. ¿Hay conexión?' };
  }
}

/** Las reseñas públicas de alguien, que viven en su propia colección (#28). */
export async function fetchPublicReviews(otherUid) {
  if (!otherUid) return [];
  try {
    const snap = await getDocs(collection(db, 'reviews', otherUid, 'entries'));
    return snap.docs.map((d) => d.data())
      .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  } catch (e) {
    console.warn('No se pudieron leer las reseñas públicas:', e);
    return [];
  }
}

// Nada se pierde al cerrar la pestaña con cambios pendientes
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush().catch(() => {});
});

/* ── CARGA ───────────────────────────────────────────────────── */

/**
 * Devolver a cada libro el mes al que lo movió el plan.
 *
 * Los 73 libros semilla viven en el código con su año y su mes de
 * fábrica, y por usuaria solo se guarda lo que cambia. Mover un libro
 * a otro mes escribía `plannedMonth` en la entrada... y nadie lo leía
 * nunca: al recargar, el libro volvía a su mes de fábrica y el plan
 * que acababas de aplicar desaparecía sin decir nada.
 *
 * Es de las peores formas de fallar que hay —la app te da la razón, y
 * al día siguiente hace como si no hubiera pasado—, y se veía solo si
 * recargabas. Aquí es donde el plan guardado vuelve a mandar.
 */
function applyPlannedMonths() {
  for (const b of state.books) {
    const e = state.entries[b.id];
    if (!e) continue;
    if (e.plannedMonth) b.month = e.plannedMonth;
    if (e.plannedYear) b.year = e.plannedYear;
  }
}

/** Pinta primero con lo local (instantáneo, funciona sin red) y luego sincroniza. */
export async function loadStore(userId) {
  state.uid = userId;
  state.entries = readLS('entries', {});
  state.settings = readLS('settings', {});
  const localCustom = readLS('custom', []);
  state.books = [...seedBooks(), ...localCustom];
  applyPlannedMonths();

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
      applyPlannedMonths();
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
      resenaPublica: isPublicReview(e),
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
  /* Las reseñas publicadas viven FUERA de users/{uid}, que es justo lo
     que las hace legibles. Por eso hay que ir a buscarlas: borrar la
     cuenta y dejar tus reseñas publicadas con tu nombre sería el peor
     fallo posible de esta historia. */
  const [booksSnap, publicSnap] = await Promise.all([
    getDocs(collection(db, 'users', state.uid, 'books')),
    getDocs(collection(db, 'reviews', state.uid, 'entries')).catch(() => ({ forEach: () => {} })),
  ]);
  const chunks = [];
  let batch = writeBatch(db); let n = 0;
  const borrar = (d) => {
    batch.delete(d.ref);
    if (++n === 400) { chunks.push(batch.commit()); batch = writeBatch(db); n = 0; }
  };
  booksSnap.forEach(borrar);
  publicSnap.forEach(borrar);
  chunks.push(batch.commit());
  await Promise.all(chunks);
  await deleteDoc(doc(db, 'reviews', state.uid)).catch(() => {});
  /* El perfil público también vive fuera, por lo mismo que las reseñas.
     Dejarlo en pie sería dejar tu nombre, tu bio y tus números
     colgados después de borrar la cuenta. */
  await deleteDoc(profileRef(state.uid))
    .catch((e) => console.warn('No se pudo borrar el perfil público:', e));
  await deleteDoc(doc(db, 'profiles', state.uid, 'full', 'data')).catch(() => {});
  /* El @usuario se libera: si no, el nombre quedaría cogido para
     siempre por una cuenta que ya no existe. Lo pide la historia #44
     y además es lo único decente. */
  const mio = myUsername();
  if (mio) {
    /* Si esto falla en silencio, el nombre queda cogido para siempre
       por una cuenta que ya no existe y no hay forma de reclamarlo:
       al menos que quede dicho en la consola. */
    await deleteDoc(usernameRef(mio))
      .catch((e) => console.warn(`No se pudo liberar @${mio}:`, e));
  }
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
