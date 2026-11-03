/* ─────────────────────────────────────────────────────────────
   QUÉ HORA ES DONDE LEE CADA QUIEN  ·  historias #69 y #95

   El cron corre en UTC, cada hora en punto. La hora del recordatorio
   —«a las nueve de la noche»— es la del reloj de quien lee. Traducir
   mal entre las dos es el fallo más caro de esta historia, porque no
   se nota: los avisos llegan, pero a las cuatro de la mañana, y quien
   los recibe apaga las notificaciones para siempre.

   ── POR QUÉ NO SE PUEDE USAR UN Date NORMAL ─────────────────

   `tocaAvisar` pregunta la hora con `getHours()`, `getDay()` y
   compañía, y esos devuelven la hora local DEL SITIO DONDE CORRE EL
   CÓDIGO. En un Worker eso es UTC. O sea que pasarle un `new Date()`
   le diría a todo el mundo que son las 3 de la mañana en Bogotá
   cuando son las 8 de la noche.

   La tentación es montar un `Date` desplazado: `new Date(ahora +
   desfase)`. Funciona hasta que el código corre en una máquina que no
   está en UTC —un portátil, el CI de otra persona— y entonces se
   suman dos desfases y nadie entiende por qué. Es un fallo que
   depende de DÓNDE se ejecuten las pruebas, que es la peor clase.

   Así que esto no devuelve un `Date`: devuelve un objeto con los seis
   getters que `tocaAvisar` usa, cada uno contestando con la hora de
   pared del huso pedido. No hay desfase que sumar, no hay zona del
   runtime que importe, y `claveDia()` saca el día correcto sin saber
   nada de todo esto.
   ───────────────────────────────────────────────────────────── */

/* Intl devuelve el día de la semana por nombre; `getDay()` lo quiere
   como número y domingo es el 0. Se piden en inglés a propósito: el
   nombre es una clave interna aquí, no algo que lea nadie, y pedirlo
   en el idioma del sistema lo haría depender del entorno. */
const DIAS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * El momento actual visto desde `tz`, con la forma que espera
 * `tocaAvisar` (y `claveDia`, que es quien saca el día).
 *
 * @param tz     un huso IANA, como 'America/Bogota'. Vacío o inválido = UTC.
 * @param ahora  el instante, en UTC. Se pasa en las pruebas.
 */
export function momentoEn(tz, ahora = new Date()) {
  const partes = partesEn(tz, ahora);
  return {
    getFullYear: () => partes.year,
    /* `getMonth()` cuenta desde 0 y el formateador desde 1. Este «-1»
       es el típico que se olvida y desplaza todos los días un mes: lo
       cubre una prueba. */
    getMonth: () => partes.month - 1,
    getDate: () => partes.day,
    getDay: () => partes.weekday,
    getHours: () => partes.hour,
    getMinutes: () => partes.minute,
  };
}

function partesEn(tz, ahora) {
  try {
    return leerPartes(tz || 'UTC', ahora);
  } catch {
    /* Un huso que el runtime no conoce no puede dejar a nadie sin
       aviso para siempre, y tampoco debe mandarlo a ciegas a una hora
       inventada: se cae a UTC, que es la hora del servidor y al menos
       es una hora real. Quien lo tenga mal lo verá como un aviso a
       destiempo, no como silencio. */
    return leerPartes('UTC', ahora);
  }
}

function leerPartes(tz, ahora) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',      // sin esto, la medianoche sale como «24»
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const p = {};
  for (const { type, value } of fmt.formatToParts(ahora)) p[type] = value;

  const weekday = DIAS_EN.indexOf(p.weekday);
  if (weekday < 0) throw new Error(`día no reconocido: ${p.weekday}`);

  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    weekday,
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
  };
}
