/* ─────────────────────────────────────────────────────────────
   COMENTAR, REPORTAR Y BLOQUEAR · Firestore  ·  #50 y #51

   BLOQUEAR SE APLICA EN LAS REGLAS, NO SOLO AQUÍ. Filtrar en el
   cliente hace que no la veas, que ya es lo que pides; pero no impide
   que ella te escriba, y eso es lo que de verdad hace falta cuando
   alguien te está molestando. Por eso la regla de crear un comentario
   comprueba que quien escribe no esté bloqueada por la dueña del sitio.
   Cuesta una lectura por comentario y los vale.

   LOS REPORTES NO SE PUEDEN LEER DESDE LA APP, solo escribir. Si se
   pudieran leer, cualquiera podría enterarse de quién ha reportado a
   quién, que es la forma más rápida de que reportar deje de usarse.
   ───────────────────────────────────────────────────────────── */

import {
  doc, getDoc, setDoc, deleteDoc, collection, getDocs, addDoc,
  query, where, orderBy, limit, writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from './firebase.js';
import { uid as myUid, myUsername, displayName } from './store.js';
import { commentDoc, validarComentario, alternarReaccion } from './comments-core.js';
import { reportDoc, blockDoc, blockId, puedeBloquear } from './moderation-core.js';

const TOPE = 200;

/* ── COMENTARIOS  ·  #50 ─────────────────────────────────────── */

const comentariosDe = (target) => collection(db, 'comments', target, 'items');

export async function loadComments(target) {
  if (!target) return [];
  try {
    const snap = await getDocs(query(comentariosDe(target), orderBy('at', 'asc'), limit(TOPE)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('No se pudieron leer los comentarios:', e);
    return [];
  }
}

export async function addComment(target, targetOwner, texto, { spoiler = false, replyTo = null } = {}) {
  const me = myUid();
  if (!me) return { ok: false, error: 'Necesitas iniciar sesión.' };

  /* El filtro decide ANTES de tocar la red: si el texto no puede
     publicarse, no se manda a ningún sitio. */
  const v = validarComentario(texto);
  if (!v.ok) return { ok: false, error: v.error };

  const c = commentDoc({
    uid: me, username: myUsername() || '', name: displayName(),
    target, targetOwner, texto, spoiler, replyTo,
  });
  if (!c) return { ok: false, error: 'No se pudo publicar.' };

  try {
    const ref = await addDoc(comentariosDe(target), c);
    /* El aviso a la dueña va después y aparte: si falla, el comentario
       ya está publicado y eso es lo que importaba. */
    if (targetOwner && targetOwner !== me) avisarDeComentario(targetOwner, c).catch(() => {});
    return { ok: true, id: ref.id, comentario: { id: ref.id, ...c } };
  } catch (e) {
    console.warn('No se pudo comentar:', e);
    /* Un rechazo aquí casi siempre significa que te tiene bloqueada:
       la regla lo comprueba en el servidor. */
    return { ok: false, error: 'No se pudo publicar el comentario.' };
  }
}

export async function dropComment(target, id) {
  try {
    await deleteDoc(doc(db, 'comments', target, 'items', id));
    return { ok: true };
  } catch (e) {
    console.warn('No se pudo borrar el comentario:', e);
    return { ok: false, error: 'No se pudo borrar.' };
  }
}

/**
 * Avisar a la dueña de que le han comentado.
 *
 * EL IDENTIFICADOR ES `comment_{quienComenta}` Y NO LLEVA EL SITIO
 * DENTRO. Llevaba `comment_{quien}_{target}`, y el `target` es texto
 * libre que elige quien comenta: con eso, una sola persona podía
 * escribir avisos distintos hasta llenar la bandeja de otra. Cerrado
 * el identificador, cada quien deja como mucho un aviso.
 *
 * El precio es que dos comentarios seguidos de la misma persona se ven
 * como uno —el último—, que es exactamente el mismo trato que ya tenía
 * el aviso de seguimiento y por el mismo motivo.
 */
async function avisarDeComentario(paraUid, c) {
  await setDoc(doc(db, 'notifs', paraUid, 'items', `comment_${myUid()}`), {
    tipo: 'comment',
    from: myUid(),
    fromName: c.name,
    fromUsername: c.username,
    target: c.target,
    at: Date.now(),
    leido: false,
  });
}

/* ── REACCIONES  ·  #50 ──────────────────────────────────────── */

const reaccionesRef = (target) => doc(db, 'reactions', target);

export async function loadReactions(target) {
  if (!target) return {};
  try {
    const s = await getDoc(reaccionesRef(target));
    return s.exists() ? (s.data().de || {}) : {};
  } catch { return {}; }
}

/**
 * Reaccionar.
 *
 * Todas las reacciones de una publicación viven en UN documento
 * {uid: emoji}. Es lo que hace que «una persona, una reacción» sea
 * cierto sin tener que ir a buscar la anterior para borrarla.
 */
export async function react(target, emoji) {
  const me = myUid();
  if (!me || !target) return null;
  const actuales = await loadReactions(target);
  const nuevas = alternarReaccion(actuales, me, emoji);
  try {
    await setDoc(reaccionesRef(target), { de: nuevas }, { merge: false });
    return nuevas;
  } catch (e) {
    console.warn('No se pudo reaccionar:', e);
    return actuales;
  }
}

/* ── REPORTAR  ·  #51 ────────────────────────────────────────── */

export async function report({ sobre, tipo, motivo, detalle = '', copia = '' }) {
  const me = myUid();
  if (!me) return { ok: false, error: 'Necesitas iniciar sesión.' };
  const r = reportDoc({ de: me, sobre, tipo, motivo, detalle, copia });
  if (!r) return { ok: false, error: 'Elige un motivo.' };
  try {
    await addDoc(collection(db, 'reports'), r);
    return { ok: true };
  } catch (e) {
    console.warn('No se pudo enviar el reporte:', e);
    return { ok: false, error: 'No se pudo enviar. Inténtalo otra vez.' };
  }
}

/* ── BLOQUEAR Y SILENCIAR  ·  #51 ────────────────────────────── */

const blockRef = (de, a) => doc(db, 'blocks', blockId(de, a));
const muteRef = (de, a) => doc(db, 'mutes', blockId(de, a));

/**
 * Bloquear.
 *
 * En el mismo lote: el bloqueo y las DOS flechas de seguimiento. Si
 * quedara una en pie, seguiría apareciendo en el feed de la otra
 * persona — justo lo que se quería evitar.
 */
export async function block(otherUid) {
  const me = myUid();
  if (!puedeBloquear(me, otherUid)) return { ok: false };
  try {
    const batch = writeBatch(db);
    batch.set(blockRef(me, otherUid), blockDoc({ de: me, a: otherUid }));
    batch.delete(doc(db, 'follows', blockId(me, otherUid)));
    batch.delete(doc(db, 'follows', blockId(otherUid, me)));
    batch.delete(doc(db, 'notifs', me, 'items', `follow_${otherUid}`));
    await batch.commit();
    return { ok: true };
  } catch (e) {
    console.warn('No se pudo bloquear:', e);
    return { ok: false, error: 'No se pudo bloquear. Inténtalo otra vez.' };
  }
}

export async function unblock(otherUid) {
  const me = myUid();
  if (!me || !otherUid) return { ok: false };
  try {
    await deleteDoc(blockRef(me, otherUid));
    return { ok: true };
  } catch (e) {
    console.warn('No se pudo desbloquear:', e);
    return { ok: false };
  }
}

export async function mute(otherUid) {
  const me = myUid();
  if (!puedeBloquear(me, otherUid)) return { ok: false };
  try {
    await setDoc(muteRef(me, otherUid), { de: me, a: otherUid, at: Date.now() });
    return { ok: true };
  } catch { return { ok: false }; }
}

export async function unmute(otherUid) {
  const me = myUid();
  if (!me || !otherUid) return { ok: false };
  try { await deleteDoc(muteRef(me, otherUid)); return { ok: true }; } catch { return { ok: false }; }
}

/** A quién he bloqueado y a quién he silenciado. Se lee una vez al entrar. */
let cache = { bloqueados: [], silenciados: [], cargado: false };

export async function loadMyBlocks() {
  const me = myUid();
  if (!me) return { bloqueados: [], silenciados: [] };
  try {
    const [b, s] = await Promise.all([
      getDocs(query(collection(db, 'blocks'), where('de', '==', me), limit(TOPE))),
      getDocs(query(collection(db, 'mutes'), where('de', '==', me), limit(TOPE))),
    ]);
    cache = {
      bloqueados: b.docs.map((d) => d.data().a).filter(Boolean),
      silenciados: s.docs.map((d) => d.data().a).filter(Boolean),
      cargado: true,
    };
  } catch (e) {
    console.warn('No se pudo leer la lista de bloqueadas:', e);
  }
  return cache;
}

export const misBloqueos = () => cache;
export const estaBloqueada = (u) => cache.bloqueados.includes(u);
export const estaSilenciada = (u) => cache.silenciados.includes(u);

/** ¿Me tiene bloqueada ella a mí? Se mira al abrir su perfil. */
export async function meBloqueo(otherUid) {
  const me = myUid();
  if (!me || !otherUid) return false;
  try {
    return (await getDoc(blockRef(otherUid, me))).exists();
  } catch { return false; }
}
