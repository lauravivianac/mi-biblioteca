/* ─────────────────────────────────────────────────────────────
   EL CHAT · lo que habla con Firestore  ·  #85, #86, #87

   Se lee EN VIVO con onSnapshot, y es el único sitio de la app donde
   se hace. En todo lo demás una lectura al abrir basta; en una
   conversación, no: escribir y esperar a recargar para ver si te han
   contestado no es un chat.
   ───────────────────────────────────────────────────────────── */

import {
  doc, getDoc, setDoc, addDoc, collection, getDocs, onSnapshot,
  query, where, orderBy, limit,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from './firebase.js';
import { uid as myUid, addBook, updateEntry, findBook } from './store.js';
import { chatDoc, mensajeDoc } from './chat-core.js';
import { confirmar, ratingDoc, ratingId } from './trust-core.js';

const TOPE = 200;

const chatRef = (id) => doc(db, 'chats', id);
const mensajesRef = (id) => collection(db, 'chats', id, 'mensajes');

/** Abrir el chat de una solicitud aceptada, o traerlo si ya existe. */
export async function abrirChat(solicitud) {
  if (!solicitud?.id) return { ok: false, error: 'No hay intercambio.' };
  try {
    const existente = await getDoc(chatRef(solicitud.id));
    if (existente.exists()) return { ok: true, chat: { id: existente.id, ...existente.data() } };

    const d = chatDoc({ solicitud });
    if (!d) return { ok: false, error: 'El chat se abre cuando la solicitud está aceptada.' };
    await setDoc(chatRef(solicitud.id), d);
    return { ok: true, chat: { id: solicitud.id, ...d } };
  } catch (e) {
    console.warn('No se pudo abrir el chat:', e);
    return { ok: false, error: 'No se pudo abrir la conversación.' };
  }
}

/** Mis conversaciones. */
export async function misChats() {
  const me = myUid();
  if (!me) return [];
  try {
    const snap = await getDocs(query(
      collection(db, 'chats'), where('partes', 'array-contains', me), limit(TOPE),
    ));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.ultimoAt || 0) - (a.ultimoAt || 0));
  } catch (e) {
    console.warn('No se pudieron leer tus conversaciones:', e);
    return [];
  }
}

/**
 * Escuchar los mensajes en vivo.
 *
 * Devuelve la función para dejar de escuchar, y hay que llamarla al
 * cerrar la pantalla: una escucha que se queda abierta sigue costando
 * lecturas cuando ya no la mira nadie.
 */
export function escucharMensajes(id, alCambiar) {
  try {
    return onSnapshot(
      query(mensajesRef(id), orderBy('at', 'asc'), limit(TOPE)),
      (snap) => alCambiar(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => { console.warn('Se cortó la escucha del chat:', e); alCambiar(null); },
    );
  } catch (e) {
    console.warn('No se pudo escuchar el chat:', e);
    return () => {};
  }
}

export async function mandar(id, texto) {
  const me = myUid();
  const d = mensajeDoc({ de: me, texto });
  if (!d) return { ok: false };
  try {
    await addDoc(mensajesRef(id), d);
    /* La fecha del último mensaje va en el chat para poder ordenar la
       lista sin leer la conversación entera de cada uno. */
    await setDoc(chatRef(id), { ultimoAt: d.at }, { merge: true }).catch(() => {});
    return { ok: true };
  } catch (e) {
    console.warn('No se pudo mandar el mensaje:', e);
    return { ok: false, error: 'No se pudo mandar. ¿Te ha bloqueado?' };
  }
}

/** Dejar constancia de que ya se vieron los avisos de seguridad (#88). */
export async function marcarAvisosVistos(chat) {
  const me = myUid();
  if (!chat?.id || !me) return;
  const vistos = [...(chat.vistoSeguridad || [])];
  if (vistos.includes(me)) return;
  vistos.push(me);
  await setDoc(chatRef(chat.id), { vistoSeguridad: vistos }, { merge: true }).catch(() => {});
}

/* ── CONFIRMAR  ·  #86 ───────────────────────────────────────── */

/**
 * Confirmar que el intercambio ocurrió.
 *
 * Cuando confirman las dos, el libro entra en la biblioteca de quien
 * lo recibió y sale de disponibles. Lo segundo solo lo puede hacer su
 * dueña —la regla de `swaps` lo exige—, así que se intenta y si no
 * toca, no pasa nada: quien retire la publicación será la otra parte
 * la próxima vez que abra la app.
 */
export async function confirmarIntercambio(chat) {
  const me = myUid();
  const patch = confirmar(chat, me);
  if (!patch) return { ok: false, error: 'Ya lo habías confirmado.' };

  try {
    await setDoc(chatRef(chat.id), patch, { merge: true });

    if (patch.completado) {
      if (chat.recibe === me) await meLlevoElLibro(chat);
      if (chat.dueño === me && chat.swapId) {
        await setDoc(doc(db, 'swaps', chat.swapId), { activa: false }, { merge: true })
          .catch(() => {});
      }
    }
    return { ok: true, chat: { ...chat, ...patch } };
  } catch (e) {
    console.warn('No se pudo confirmar:', e);
    return { ok: false, error: 'No se pudo confirmar.' };
  }
}

/**
 * El libro entra en mi biblioteca.
 *
 * Si ya lo tengo —porque estaba en mis pendientes, que es el caso
 * normal: por eso lo pedí— no se duplica, solo se marca. Un libro
 * repetido en la biblioteca por haberlo intercambiado sería un
 * estropicio difícil de deshacer.
 */
async function meLlevoElLibro(chat) {
  const ya = chat.bookId ? findBook(chat.bookId) : null;
  if (ya) { updateEntry(ya.id, { status: 'pending' }); return; }
  addBook({
    title: chat.title || 'Libro intercambiado',
    author: chat.author || '',
    genre: '',
    pages: null,
  });
}

/* ── VALORAR  ·  #86 ─────────────────────────────────────────── */

export async function miValoracionDe(chat) {
  const me = myUid();
  if (!chat?.id || !me) return null;
  try {
    const s = await getDoc(doc(db, 'swapRatings', ratingId(chat.id, me)));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  } catch { return null; }
}

export async function valorar(chat, { puntualidad, estado, trato, comentario = '' }) {
  const me = myUid();
  const otra = (chat?.partes || []).find((p) => p !== me);
  const d = ratingDoc({
    de: me, sobre: otra, chatIdent: chat?.id, puntualidad, estado, trato, comentario,
  });
  if (!d) return { ok: false, error: 'Pon una puntuación en las tres cosas.' };
  try {
    await setDoc(doc(db, 'swapRatings', ratingId(chat.id, me)), d);
    return { ok: true, valoracion: d };
  } catch (e) {
    console.warn('No se pudo valorar:', e);
    return { ok: false, error: 'No se pudo guardar la valoración.' };
  }
}

/** Las valoraciones de alguien, para pintar su reputación. */
export async function valoracionesDe(otroUid) {
  if (!otroUid) return [];
  try {
    const snap = await getDocs(query(
      collection(db, 'swapRatings'), where('sobre', '==', otroUid), limit(50),
    ));
    return snap.docs.map((d) => d.data());
  } catch (e) {
    console.warn('No se pudieron leer las valoraciones:', e);
    return [];
  }
}
