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
  if (meSigue && sigo) return 'Se siguen';
  if (meSigue) return 'Te sigue';
  return '';
};

/* ── SIN GÉNERO, Y NO POR CORRECCIÓN ─────────────────────────
   «Pero él es un amigo, no una amiga.»

   La app hablaba en femenino de punta a punta —amigas, seguidoras,
   lectoras— y era una decisión de estilo, no un descuido. Pero un
   estilo que se equivoca con la mitad de la gente que lo lee deja de
   ser estilo: es un dato incorrecto sobre una persona concreta, y se
   nota justo cuando acabas de añadir a alguien.

   Cambiarlo a masculino sería el mismo error del otro lado. Así que
   estas frases no dicen QUÉ ES la persona, dicen QUÉ HACE: no «tres
   seguidoras» sino «te siguen tres». El castellano lo permite casi
   siempre, y de paso queda más claro. También sirvió para «Os seguís»,
   que además era de España y esto se usa en Colombia. */
export const cuenta = (n, uno, muchos) => `${n} ${n === 1 ? uno : muchos}`;
export const seguidorasTexto = (n) => (n === 1 ? 'te sigue 1' : `te siguen ${n}`);
export const siguiendoTexto = (n) => `sigues a ${n}`;

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

/* ── SOLICITUDES DE SEGUIMIENTO  ·  historia #52 ─────────────
   Con la cuenta privada, seguir no es seguir: es PEDIRLO. El
   identificador va al revés que el de la flecha —{aQuien}_{quienPide}—
   porque quien más lo consulta es la dueña, que quiere ver todo lo
   suyo junto.

   Aceptar es escribir la flecha y borrar la solicitud, en un lote:
   quedarse con las dos cosas dejaría una petición pendiente de alguien
   que ya te sigue. */

export const requestId = (aQuien, quienPide) => `${aQuien}_${quienPide}`;

export function requestDoc({ de, a, name = '', username = '', at = Date.now() } = {}) {
  if (!canFollow(de, a)) return null;
  return {
    de,
    a,
    name: String(name ?? '').slice(0, 60),
    username: String(username ?? '').toLowerCase().slice(0, 20),
    at,
  };
}

export const REQUEST_FIELDS = ['de', 'a', 'name', 'username', 'at'];

/**
 * Qué dice el botón cuando la cuenta es privada.
 *
 * «Solicitado» y no «Siguiendo»: decir que sigues a alguien que aún no
 * te ha aceptado es mentir, y la primera vez que abras su perfil y no
 * veas nada pensarás que la app está rota.
 */
export function followButtonPrivado({ sigo = false, pedido = false } = {}) {
  if (sigo) return { texto: 'Siguiendo', accion: 'dejar', activo: true };
  if (pedido) return { texto: 'Solicitado', accion: 'cancelar', activo: true };
  return { texto: 'Solicitar seguir', accion: 'pedir', activo: false };
}

/** Lo que ve quien no sigue a una cuenta privada. */
export const AVISO_PRIVADA = 'Esta cuenta es privada. Si te acepta, verás lo que lee.';
