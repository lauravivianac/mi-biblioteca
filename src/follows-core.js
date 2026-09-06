/* ─────────────────────────────────────────────────────────────
   SEGUIR A ALGUIEN · la parte que se puede probar  ·  historia #46

   EL MODELO ES ASIMÉTRICO, como Instagram y no como Facebook: te sigo
   sin que me sigas, y dejar de seguir es cosa mía sola. Eso decide la
   forma del dato: un documento por FLECHA, no por pareja.

   El identificador es `{quienSigue}_{aQuienSigue}`, y lleva dentro los
   dos uid en campos aparte. Lo primero permite saber si sigo a alguien
   con UNA lectura directa, sin consulta; lo segundo permite las dos
   listas —a quién sigo, quién me sigue— y que las reglas comprueben
   que el camino y el contenido dicen lo mismo.

   DEJAR DE SEGUIR ES SILENCIOSO. Lo pide la historia y no es un
   detalle: si avisara, dejaría de ser reversible sin coste social y la
   gente no lo usaría. Solo se avisa de que alguien te empieza a seguir.
   ───────────────────────────────────────────────────────────── */

/** El identificador de la flecha. El orden importa: no es simétrico. */
export const followId = (follower, following) => `${follower}_${following}`;

/** Al revés, para leer un id que viene de la base. */
export function splitFollowId(id) {
  const s = String(id ?? '');
  const i = s.indexOf('_');
  if (i <= 0 || i === s.length - 1) return null;
  return { follower: s.slice(0, i), following: s.slice(i + 1) };
}

/** No puedes seguirte a ti misma, y sin uid no hay a quién seguir. */
export const canFollow = (me, other) => Boolean(me && other && me !== other);

/**
 * El documento de la flecha.
 *
 * Los dos uid van dentro además de en el camino porque las consultas
 * («¿a quién sigo?») no pueden filtrar por trozos del identificador.
 */
export function followDoc({ follower, following, at = Date.now() } = {}) {
  if (!canFollow(follower, following)) return null;
  return { follower, following, at };
}

/**
 * Qué dice el botón.
 *
 * «Te sigue» no es un estado del botón sino una etiqueta aparte: que
 * alguien te siga no cambia lo que TÚ puedes hacer con esa persona.
 * Mezclarlos es como se acaba con un botón que dice «seguir» cuando ya
 * la sigues.
 */
export function followButton({ sigo = false, esperando = false } = {}) {
  if (esperando) return { texto: 'Pendiente', accion: 'cancelar', activo: true };
  return sigo
    ? { texto: 'Siguiendo', accion: 'dejar', activo: true }
    : { texto: 'Seguir', accion: 'seguir', activo: false };
}

/** La coletilla de «te sigue», que va aparte del botón. */
export const followBadge = ({ sigo = false, meSigue = false } = {}) => {
  if (meSigue && sigo) return 'Os seguís';
  if (meSigue) return 'Te sigue';
  return '';
};

/* Plurales en femenino, que es como habla el resto de la app. */
export const cuenta = (n, uno, muchos) => `${n} ${n === 1 ? uno : muchos}`;
export const seguidorasTexto = (n) => cuenta(n, 'seguidora', 'seguidoras');
export const siguiendoTexto = (n) => `siguiendo a ${n}`;

/**
 * El aviso de que alguien te empezó a seguir.
 *
 * Lo escribe QUIEN SIGUE en la bandeja de la otra persona, que es la
 * única forma sin servidor propio. Por eso lleva el uid de quien avisa:
 * las reglas exigen que coincida con quien escribe, y así nadie puede
 * dejar avisos firmados por otra.
 */
export function followNotice({ from, fromName = '', fromUsername = '', to, at = Date.now() } = {}) {
  if (!canFollow(from, to)) return null;
  return {
    tipo: 'follow',
    from,
    fromName: String(fromName ?? '').slice(0, 60),
    fromUsername: String(fromUsername ?? '').slice(0, 20),
    at,
    leido: false,
  };
}

export const NOTICE_FIELDS = ['tipo', 'from', 'fromName', 'fromUsername', 'at', 'leido'];

/** Cómo se lee un aviso en la bandeja. */
export function noticeText(n = {}) {
  const quien = n.fromUsername ? `@${n.fromUsername}` : (n.fromName || 'Alguien');
  if (n.tipo === 'follow') return `${quien} te sigue`;
  return `${quien} hizo algo`;
}

/** Los avisos sin leer, que es lo único que se cuenta en el punto rojo. */
export const unread = (avisos = []) => avisos.filter((a) => !a.leido).length;

/** Ordenados de más nuevo a más viejo, sin depender del orden que dé la base. */
export const byNewest = (avisos = []) => [...avisos].sort((a, b) => (b.at || 0) - (a.at || 0));
