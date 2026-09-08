/* ─────────────────────────────────────────────────────────────
   QUÉ AVISOS LLEGAN, Y CUÁNDO NO  ·  historia #95

   Sin DOM y sin red: recibe datos y devuelve datos. La parte que toca
   el navegador —pedir permiso, suscribirse, guardar— está en push.js.

   ── POR QUÉ ESTO ES LA MITAD DE LA HISTORIA ─────────────────

   Del cuerpo de la historia, literalmente:

     «Las notificaciones son la vía más rápida para que desinstalen una
      app. Que sean pocas, agrupadas y desactivables una por una no es
      amabilidad: es supervivencia.»

   Un solo interruptor de «avisos» no sirve. Quien quiere saber que le
   escribieron por un intercambio no necesariamente quiere que le digan
   que alguien le dio a seguir, y si la única forma de callar lo segundo
   es callar todo, apaga todo — y entonces tampoco se entera de lo que
   sí le importaba.

   Por eso cada tipo se enciende y se apaga por su cuenta, y por eso los
   valores de fábrica no son «todo encendido»: lo que llega de fábrica
   es lo que alguien está esperando (te escribieron, quieren tu libro) y
   lo que no, se ofrece apagado.
   ───────────────────────────────────────────────────────────── */

/* Los seis tipos que nombra la historia.

   `deFabrica` no es un capricho por tipo: encendidos van los que
   CONTESTAN algo que empezaste tú —una conversación, un intercambio— y
   el recordatorio, que es el único que se pide a propósito. Apagados
   los que son sobre ti sin haberlos pedido: que alguien te siga o que
   consigas un logro puede esperar a que abras la app. */
export const TIPOS_AVISO = [
  {
    id: 'mensaje',
    label: 'Mensajes',
    sub: 'Cuando alguien te escribe en una conversación',
    deFabrica: true,
  },
  {
    id: 'intercambio',
    label: 'Intercambios',
    sub: 'Cuando alguien pide un libro tuyo, o contesta al tuyo',
    deFabrica: true,
  },
  {
    id: 'recordatorio',
    label: 'Recordarme leer',
    sub: 'A tu hora, y solo si no leíste',
    deFabrica: true,
  },
  {
    id: 'comentario',
    label: 'Comentarios',
    sub: 'Cuando comentan algo que escribiste',
    deFabrica: false,
  },
  {
    id: 'seguidor',
    label: 'Te siguen',
    sub: 'Cuando alguien empieza a seguirte',
    deFabrica: false,
  },
  {
    id: 'logro',
    label: 'Logros',
    sub: 'Cuando consigues uno',
    deFabrica: false,
  },
];

export const ES_TIPO = (id) => TIPOS_AVISO.some((t) => t.id === id);

/* El horario de silencio, de fábrica. De once de la noche a ocho de la
   mañana: nadie quiere que le vibre el teléfono a las tres porque
   alguien al otro lado del mundo comentó una reseña. Viene ENCENDIDO —
   apagarlo es una decisión, tenerlo no debería serlo. */
export const SILENCIO_POR_DEFECTO = { activo: true, desde: 23, hasta: 8 };

export const AVISOS_POR_DEFECTO = {
  tipos: Object.fromEntries(TIPOS_AVISO.map((t) => [t.id, t.deFabrica])),
  silencio: { ...SILENCIO_POR_DEFECTO },
};

/** La configuración completa, con lo que falte relleno de fábrica. */
export function avisosCompletos(guardado = {}) {
  return {
    tipos: { ...AVISOS_POR_DEFECTO.tipos, ...(guardado.tipos || {}) },
    silencio: { ...SILENCIO_POR_DEFECTO, ...(guardado.silencio || {}) },
  };
}

/* ── EL SILENCIO ─────────────────────────────────────────────── */

/**
 * ¿Estamos dentro del horario de silencio?
 *
 * LA FRANJA CRUZA LA MEDIANOCHE Y ESE ES TODO EL PROBLEMA. De 23 a 8 no
 * es «entre 23 y 8» en el sentido de los números: 23 es mayor que 8, así
 * que la comprobación obvia —`h >= desde && h < hasta`— es falsa SIEMPRE
 * y el horario de silencio no silencia nada. Y falla en silencio: el
 * ajuste está ahí, se ve encendido, y los avisos siguen llegando de
 * madrugada.
 *
 * Se parte en dos tramos cuando cruza: de `desde` a medianoche, y de
 * medianoche a `hasta`.
 */
export function enSilencio(silencio = SILENCIO_POR_DEFECTO, fecha = new Date()) {
  if (!silencio?.activo) return false;

  const { desde, hasta } = silencio;
  if (!Number.isFinite(desde) || !Number.isFinite(hasta)) return false;
  /* Misma hora de inicio y fin: no es «silencio todo el día», es un
     ajuste sin sentido que alguien dejó a medias. No se silencia nada,
     que es lo menos dañino de las dos interpretaciones. */
  if (desde === hasta) return false;

  const h = fecha.getHours() + fecha.getMinutes() / 60;
  return desde < hasta
    ? h >= desde && h < hasta            // 8 a 23: un solo tramo
    : h >= desde || h < hasta;           // 23 a 8: cruza la medianoche
}

/** «De 23:00 a 08:00», para la pantalla. */
export const silencioLegible = (s = SILENCIO_POR_DEFECTO) => (s?.activo
  ? `De ${String(s.desde).padStart(2, '0')}:00 a ${String(s.hasta).padStart(2, '0')}:00`
  : 'Apagado');

/* ── LA DECISIÓN ─────────────────────────────────────────────── */

/**
 * ¿Se puede mandar este aviso ahora?
 *
 * Devuelve `{ mandar, motivo }`. El motivo importa por lo mismo que en
 * el recordatorio: sin él, un ajuste que no hace nada visible parece
 * estropeado y no hay forma de saber si funciona así o falla.
 */
export function sePuedeAvisar(tipo, guardado = {}, fecha = new Date()) {
  const cfg = avisosCompletos(guardado);
  const no = (motivo) => ({ mandar: false, motivo });

  if (!ES_TIPO(tipo)) return no('tipo-desconocido');
  if (!cfg.tipos[tipo]) return no('tipo-apagado');

  /* EL RECORDATORIO SE SALTA EL SILENCIO, y a propósito: es el único
     aviso cuya hora la eliges tú. Quien pone el recordatorio a las 23:30
     porque lee antes de dormir lo ha pedido explícitamente; callárselo
     por el horario de silencio sería desobedecer el ajuste más concreto
     de los dos usando el más general. */
  if (tipo !== 'recordatorio' && enSilencio(cfg.silencio, fecha)) return no('en-silencio');

  return { mandar: true, motivo: null };
}

export const POR_QUE_NO_LLEGA = {
  'tipo-desconocido': 'Ese aviso no existe.',
  'tipo-apagado': 'Tienes ese tipo de aviso apagado.',
  'en-silencio': 'Estás en tu horario de silencio.',
};

/** Cómo se resume el ajuste en una línea, en Ajustes. */
export function resumenAvisos(guardado = {}, { encendido = false } = {}) {
  if (!encendido) return 'Apagados en este dispositivo';

  const cfg = avisosCompletos(guardado);
  const cuantos = TIPOS_AVISO.filter((t) => cfg.tipos[t.id]).length;
  if (!cuantos) return 'Encendidos, pero sin ningún tipo elegido';

  const deQue = cuantos === TIPOS_AVISO.length ? 'Todos'
    : TIPOS_AVISO.filter((t) => cfg.tipos[t.id]).map((t) => t.label.toLowerCase()).join(', ');

  return cfg.silencio.activo
    ? `${deQue} · en silencio ${silencioLegible(cfg.silencio).toLowerCase()}`
    : deQue;
}

/* ── AGRUPAR ─────────────────────────────────────────────────── */

/**
 * Cinco comentarios son un aviso, no cinco.
 *
 * Recibe los avisos pendientes de un tipo y devuelve UNO solo, con el
 * texto ya en plural cuando hay varios. Es lo que separa una app de la
 * que se desinstala: cinco vibraciones seguidas por lo mismo es la
 * definición práctica de spam, aunque cada una por separado fuera
 * legítima.
 *
 * `nombres` son los de quien lo hizo, y se usan hasta dos: «Rafael y
 * Ana comentaron» se lee; «Rafael, Ana, Luis, Marta y otras 3» es una
 * lista, y una lista en una pantalla bloqueada no se lee.
 */
export function agruparAvisos(avisos = []) {
  if (!avisos.length) return null;
  if (avisos.length === 1) return { ...avisos[0], cuantos: 1 };

  const nombres = [...new Set(avisos.map((a) => a.de).filter(Boolean))];
  const quien = nombres.length === 0 ? ''
    : nombres.length === 1 ? nombres[0]
      : nombres.length === 2 ? `${nombres[0]} y ${nombres[1]}`
        : `${nombres[0]} y ${nombres.length - 1} más`;

  return {
    ...avisos[0],
    cuantos: avisos.length,
    de: quien,
    cuerpo: pluralDe(avisos[0].tipo, avisos.length, quien),
  };
}

function pluralDe(tipo, n, quien) {
  const sujeto = quien || `${n} personas`;
  switch (tipo) {
    case 'mensaje': return `${sujeto} te escribieron · ${n} mensajes`;
    case 'comentario': return `${sujeto} comentaron lo que escribiste`;
    case 'seguidor': return `${sujeto} empezaron a seguirte`;
    case 'intercambio': return `${n} novedades en tus intercambios`;
    case 'logro': return `Conseguiste ${n} logros`;
    default: return `${n} novedades`;
  }
}
