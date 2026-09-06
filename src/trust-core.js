/* ─────────────────────────────────────────────────────────────
   CONFIRMAR Y VALORAR  ·  historia #86

   LA NOTA DE LA HISTORIA ES UNA REGLA DE PRESENTACIÓN, NO UN ADORNO:
   «con pocos intercambios hay que mostrar el número, no solo el
   promedio: "5 estrellas" con un solo intercambio no dice nada, y
   presentarlo como si dijera algo es engañoso».

   Así que aquí el promedio NUNCA sale solo. Por debajo de un mínimo ni
   siquiera se da: se dice cuántos intercambios lleva y ya está, que es
   la información honesta que hay. Un cinco perfecto sacado de una sola
   valoración es exactamente lo que usa quien quiere aparentar
   confianza que no tiene.

   Y NO SE PUEDE VALORAR SIN HABER INTERCAMBIADO. Lo comprueba también
   el servidor: una valoración que cualquiera puede escribir sobre
   cualquiera no es reputación, es un tablón de insultos.
   ───────────────────────────────────────────────────────────── */

const limpio = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/* ── CONFIRMAR ───────────────────────────────────────────────── */

/**
 * Hace falta que confirmen LAS DOS.
 *
 * Con una sola bastaría para cerrar el trato en la app, pero también
 * bastaría para que alguien marcara como hecho un intercambio que no
 * ocurrió y se ganara una valoración. Dos confirmaciones es el precio
 * mínimo de que la reputación signifique algo.
 */
export function confirmar(chat = {}, yo = '') {
  const partes = chat.partes || [];
  if (!partes.includes(yo)) return null;
  const ya = chat.confirmadoPor || [];
  if (ya.includes(yo)) return null;
  const confirmadoPor = [...ya, yo];
  const completado = partes.every((p) => confirmadoPor.includes(p));
  return { confirmadoPor, completado, ...(completado ? { cerrado: true } : {}) };
}

export const heConfirmado = (chat = {}, yo = '') => (chat.confirmadoPor || []).includes(yo);

export const faltaLaOtra = (chat = {}, yo = '') =>
  heConfirmado(chat, yo) && !chat.completado;

/** Lo que se lee según por dónde vaya. */
export function estadoConfirmacion(chat = {}, yo = '') {
  if (chat.completado) return 'Intercambio hecho ✓';
  if (faltaLaOtra(chat, yo)) return 'Has confirmado. Falta que confirme ella.';
  if ((chat.confirmadoPor || []).length) return 'Ella ya confirmó. ¿Lo hicisteis?';
  return '';
}

/**
 * Quien no confirma deja el intercambio pendiente, y eso se puede
 * cancelar. Sin esto, un trato que no ocurrió se queda ahí para
 * siempre ocupando sitio en la lista.
 */
export const puedeCancelarse = (chat = {}) => !chat.completado && !chat.cerrado;

/* ── VALORAR ─────────────────────────────────────────────────── */

export const EJES = [
  { id: 'puntualidad', label: 'Puntualidad', hint: '¿Llegó a la hora?' },
  { id: 'estado', label: 'El libro', hint: '¿Estaba como decía?' },
  { id: 'trato', label: 'El trato', hint: '¿Fue agradable quedar?' },
];

export const MIN_ESTRELLAS = 1;
export const MAX_ESTRELLAS = 5;

/**
 * Una puntuación, o CERO SI NO SE PUNTUÓ. La diferencia importa.
 *
 * Estaba escrito con un `Math.max(1, …)` que subía cualquier cosa por
 * debajo de uno hasta uno — así que un eje sin tocar se guardaba como
 * UNA ESTRELLA. Es el peor fallo posible en esto: le pone a alguien la
 * peor nota por no haber contestado, y encima no se puede corregir
 * después porque las valoraciones no se editan.
 *
 * Ahora «sin puntuar» es cero y `ratingDoc` devuelve null, que es lo
 * que hace que la pantalla diga «pon una puntuación en las tres».
 */
const estrella = (v) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < MIN_ESTRELLAS) return 0;
  return Math.min(MAX_ESTRELLAS, n);
};

export const ratingId = (chatIdent, deQuien) => `${chatIdent}_${deQuien}`;

/**
 * ¿Puede valorar?
 *
 * Solo quien participó, solo si el intercambio se completó, y solo una
 * vez. Los tres a la vez: cualquiera de los tres que falte convierte
 * la reputación en algo que se puede fabricar.
 */
export function puedeValorar({ chat = null, yo = '', yaValoro = false } = {}) {
  if (!chat || !yo) return { puede: false, motivo: '' };
  if (!(chat.partes || []).includes(yo)) {
    return { puede: false, motivo: 'Solo se valora a quien has intercambiado.' };
  }
  if (!chat.completado) {
    return { puede: false, motivo: 'Podréis valoraros cuando las dos confirméis el intercambio.' };
  }
  if (yaValoro) return { puede: false, motivo: 'Ya la valoraste.' };
  return { puede: true, motivo: '' };
}

export function ratingDoc({
  de, sobre, chatIdent, puntualidad = 0, estado = 0, trato = 0,
  comentario = '', at = Date.now(),
} = {}) {
  if (!de || !sobre || de === sobre || !chatIdent) return null;
  const p = estrella(puntualidad);
  const e = estrella(estado);
  const t = estrella(trato);
  if (!p || !e || !t) return null;
  return {
    de,
    sobre,
    chatIdent: String(chatIdent),
    puntualidad: p,
    estado: e,
    trato: t,
    /* La media de esta valoración, guardada: así calcular la del perfil
       no obliga a leer los tres ejes de cada una. */
    media: Math.round(((p + e + t) / 3) * 100) / 100,
    comentario: limpio(comentario, 300),
    at,
  };
}

export const RATING_FIELDS = [
  'de', 'sobre', 'chatIdent', 'puntualidad', 'estado', 'trato', 'media', 'comentario', 'at',
];

/* ── CÓMO SE ENSEÑA  ·  la parte que importa ─────────────────── */

/**
 * Por debajo de esto NO se enseña promedio. Ver la cabecera: un cinco
 * perfecto sacado de una valoración no dice nada, y enseñarlo como si
 * dijera algo es engañar a quien va a quedar con esa persona.
 */
export const MIN_PARA_PROMEDIO = 3;

export function reputacion(valoraciones = []) {
  const n = valoraciones.length;
  if (!n) {
    return {
      n: 0,
      promedio: null,
      /* «Sin valoraciones» no es una mancha: todo el mundo empieza ahí,
         y decirlo así evita que la primera persona no encuentre a nadie. */
      texto: 'Todavía no ha intercambiado',
      detalle: 'Alguien tiene que ser la primera.',
      fiable: false,
    };
  }

  const suma = valoraciones.reduce((a, v) => a + (Number(v.media) || 0), 0);
  const promedio = Math.round((suma / n) * 10) / 10;
  const plural = n === 1 ? 'intercambio' : 'intercambios';

  if (n < MIN_PARA_PROMEDIO) {
    return {
      n,
      promedio,
      /* Se dice el número y NO se dice el promedio, a propósito. */
      texto: `${n} ${plural}`,
      detalle: `Con ${n === 1 ? 'uno' : 'tan pocos'} todavía no hay promedio que valga.`,
      fiable: false,
    };
  }

  return {
    n,
    promedio,
    texto: `${promedio} ★ · ${n} ${plural}`,
    detalle: '',
    fiable: true,
  };
}

/** El desglose por eje, para quien quiera mirar de cerca. */
export function porEje(valoraciones = []) {
  if (!valoraciones.length) return [];
  return EJES.map((eje) => {
    const suma = valoraciones.reduce((a, v) => a + (Number(v[eje.id]) || 0), 0);
    return { ...eje, valor: Math.round((suma / valoraciones.length) * 10) / 10 };
  });
}

/**
 * Lo que se enseña junto al @usuario en el intercambio.
 *
 * Corto a propósito: quien está decidiendo si queda con alguien mira
 * esto de reojo, no lee un informe.
 */
export const insignia = (rep) => (rep.fiable ? rep.texto : (rep.n ? `${rep.n} ✓` : 'Nueva'));
