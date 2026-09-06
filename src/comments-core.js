/* ─────────────────────────────────────────────────────────────
   COMENTARIOS · la parte que se puede probar  ·  historia #50

   «Conversar sobre libros, que es de lo que se trata.»

   EL AVISO DE SPOILERS NO ES UN ADORNO en una app de libros. Lo dice
   la nota de la historia y tiene toda la razón: es la diferencia entre
   una conversación cómoda y una razón para dejar de abrir el feed. Por
   eso un comentario marcado como spoiler no llega tapado por CSS —eso
   se salta con el inspector y, peor, se lee de reojo—: llega con su
   marca, y quien pinta decide no enseñarlo hasta que se toque.

   REACCIONAR SIN ESCRIBIR también importa más de lo que parece. La
   mayoría de la gente no comenta nunca, pero sí toca un emoji, y una
   conversación con cinco corazones se siente viva mientras que una con
   cero comentarios se siente muerta aunque la haya leído todo el mundo.
   ───────────────────────────────────────────────────────────── */

import { tieneInsulto, MENSAJE_FILTRO } from './moderation-core.js';

export const MAX = 500;

/** Los emoji con los que se puede reaccionar. Pocos y claros. */
export const REACCIONES = ['❤️', '😂', '😮', '😢', '🔥', '📚'];

export const limpiar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/**
 * ¿Se puede publicar esto?
 *
 * Devuelve `{ok}` o `{ok:false, error}` con un mensaje que se le puede
 * enseñar a una persona tal cual. El filtro de la guía 1.2 entra aquí,
 * antes de escribir nada.
 */
export function validarComentario(texto) {
  const t = limpiar(texto);
  if (!t) return { ok: false, error: 'Escribe algo primero.' };
  if (t.length > MAX) return { ok: false, error: `Como mucho ${MAX} caracteres.` };
  const malo = tieneInsulto(t);
  if (malo) return { ok: false, error: MENSAJE_FILTRO, palabra: malo };
  return { ok: true, texto: t };
}

/**
 * El comentario que se guarda.
 *
 * `targetOwner` va dentro a propósito: es lo que permite que la dueña
 * de la publicación pueda borrar comentarios en lo suyo sin que las
 * reglas tengan que ir a buscar de quién era la publicación.
 */
export function commentDoc({
  uid, username = '', name = '', target, targetOwner = '',
  texto, spoiler = false, replyTo = null, at = Date.now(),
} = {}) {
  if (!uid || !target) return null;
  const v = validarComentario(texto);
  if (!v.ok) return null;
  return {
    uid,
    username: String(username ?? '').toLowerCase().slice(0, 20),
    name: String(name ?? '').slice(0, 60),
    target: String(target),
    targetOwner: String(targetOwner ?? ''),
    texto: v.texto,
    spoiler: spoiler === true,
    replyTo: replyTo ? String(replyTo) : null,
    at,
  };
}

export const COMMENT_FIELDS = [
  'uid', 'username', 'name', 'target', 'targetOwner',
  'texto', 'spoiler', 'replyTo', 'at',
];

/** Quién puede borrar un comentario: quien lo escribió, y la dueña del sitio. */
export const puedeBorrar = (comentario = {}, yo) =>
  Boolean(yo && (comentario.uid === yo || comentario.targetOwner === yo));

/**
 * Ordenar la conversación.
 *
 * Las respuestas van pegadas al comentario que contestan y en orden
 * antiguo→nuevo dentro de su hilo; los comentarios sueltos, también de
 * más antiguo a más nuevo. Un hilo del revés se lee fatal: las
 * respuestas aparecen antes que la pregunta.
 */
export function ordenar(comentarios = []) {
  const raiz = comentarios.filter((c) => !c.replyTo).sort((a, b) => (a.at || 0) - (b.at || 0));
  const porPadre = new Map();
  for (const c of comentarios) {
    if (!c.replyTo) continue;
    if (!porPadre.has(c.replyTo)) porPadre.set(c.replyTo, []);
    porPadre.get(c.replyTo).push(c);
  }
  const out = [];
  for (const c of raiz) {
    out.push({ ...c, nivel: 0 });
    const hijos = (porPadre.get(c.id) || []).sort((a, b) => (a.at || 0) - (b.at || 0));
    for (const h of hijos) out.push({ ...h, nivel: 1 });
  }
  /* Una respuesta cuyo padre se borró no desaparece: se sube a la raíz.
     Perder lo que alguien escribió porque otra persona borró lo suyo
     sería castigar a quien no hizo nada. */
  const vistos = new Set(out.map((c) => c.id));
  const huerfanos = comentarios
    .filter((c) => c.replyTo && !vistos.has(c.id))
    .sort((a, b) => (a.at || 0) - (b.at || 0))
    .map((c) => ({ ...c, nivel: 0, huerfano: true }));
  return [...out, ...huerfanos];
}

/** Cuántos hay, para el contador de la tarjeta. */
export const contar = (comentarios = []) => comentarios.length;

/* ── REACCIONES ──────────────────────────────────────────────── */

/**
 * El recuento por emoji.
 *
 * `reacciones` es {uid: emoji}: una persona, una reacción. Guardarlo
 * así —y no como una lista— hace que cambiar de emoji sustituya en vez
 * de sumar, que es lo que espera cualquiera que haya usado esto antes.
 */
export function contarReacciones(reacciones = {}) {
  const cuenta = new Map();
  for (const emoji of Object.values(reacciones)) {
    if (!REACCIONES.includes(emoji)) continue;
    cuenta.set(emoji, (cuenta.get(emoji) || 0) + 1);
  }
  return REACCIONES
    .filter((e) => cuenta.has(e))
    .map((emoji) => ({ emoji, n: cuenta.get(emoji) }));
}

/** Tocar un emoji: lo pone, o lo quita si ya era el tuyo. */
export function alternarReaccion(reacciones = {}, uid, emoji) {
  if (!uid || !REACCIONES.includes(emoji)) return reacciones;
  const copia = { ...reacciones };
  if (copia[uid] === emoji) delete copia[uid];
  else copia[uid] = emoji;
  return copia;
}

export const miReaccion = (reacciones = {}, uid) => reacciones[uid] || null;

/* ── APAGAR LOS COMENTARIOS DE UNA PIEZA ─────────────────────── */

export const comentariosCerrados = (pieza = {}) => pieza.comentariosOff === true;

/** Lo que se enseña donde estaría la caja de escribir. */
export const MENSAJE_CERRADO = 'Quien lo publicó ha desactivado los comentarios aquí.';

/* ── EL AVISO DE SPOILER ─────────────────────────────────────── */

export const AVISO_SPOILER = 'Spoiler · toca para leer';
