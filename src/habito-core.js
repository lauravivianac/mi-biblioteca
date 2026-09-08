/* ─────────────────────────────────────────────────────────────
   ¿A QUÉ HORA SUELES LEER, Y TOCA AVISAR HOY?  ·  historia #69

     «Quiero que me recuerden leer cuando suelo hacerlo, para que se me
      haga costumbre.»

   Sin DOM y sin red: recibe datos y devuelve datos. Aquí vive la parte
   de la historia que NO depende de las notificaciones — deducir la
   hora y decidir si hoy toca— y por eso se puede escribir y probar
   antes de que exista nada del otro lado.

   ── POR QUÉ HAY QUE GUARDAR LAS HORAS ───────────────────────

   La primera idea era deducirla de lo que ya hay, y no da: `lastReadAt`
   es UN sello por libro y se sobrescribe cada vez que anotas página.
   Con veinte libros son veinte muestras como mucho, casi todas viejas,
   y ninguna dice a qué hora lees NORMALMENTE — dicen cuándo tocaste
   cada libro por última vez.

   Así que se apunta la hora en `recordReadingDay`, que es el único
   sitio de toda la app donde consta que hubo lectura de verdad. Se
   guardan las horas y nada más: ni el libro, ni la página, ni el día.
   Una lista de números del 0 al 24 no dice de nadie más que a qué hora
   le gusta leer, que es exactamente el dato que hace falta y ni uno
   más.

   ── Y POR QUÉ NO VALE UNA MEDIA NORMAL ──────────────────────

   Las horas son un círculo, no una recta. Quien lee a las 23:00 y a la
   1:00 tiene una media aritmética de las 12:00 — mediodía, la hora a la
   que precisamente NO lee. El error es silencioso y el aviso llegaría
   sistemáticamente en el peor momento posible.

   Se calcula como un ángulo: cada hora se convierte en un punto de la
   circunferencia, se suman como vectores y se mira hacia dónde apunta
   el resultado. De propina, la LONGITUD de ese vector dice cuánto se
   parecen entre sí: si es corta, no hay una hora habitual — hay
   horarios distintos — y entonces lo honesto es no inventarse ninguna.
   ───────────────────────────────────────────────────────────── */

/* Cuántas horas se recuerdan. Cuarenta son unas seis semanas de leer
   casi a diario: bastante para que una hora nueva pese, y poco para
   que un horario viejo mande sobre el de ahora. */
export const MUESTRAS = 40;

/* Por debajo de esto no se deduce nada. Con dos o tres lecturas
   cualquier coincidencia parece una costumbre, y proponer una hora
   equivocada es peor que no proponer ninguna: se acepta sin pensar y
   luego el aviso llega siempre mal. */
export const MINIMO = 5;

/* Cuánto tienen que parecerse las horas entre sí para llamarlo
   costumbre. Es la longitud del vector resultante, de 0 a 1: vale 1 si
   siempre lees a la misma hora y baja hacia 0 según se reparten. 0,55
   admite un margen de un par de horas arriba y abajo, que es como lee
   la gente de verdad; por debajo, son horarios distintos y no una hora
   con ruido. */
export const CONSTANCIA_MINIMA = 0.55;

const HORAS = 24;
const aAngulo = (h) => (h / HORAS) * 2 * Math.PI;
const aHora = (a) => ((a / (2 * Math.PI)) * HORAS + HORAS) % HORAS;

/** La hora de un momento, con minutos, como número: las 19:30 son 19,5. */
export const horaDe = (fecha) => fecha.getHours() + fecha.getMinutes() / 60;

/**
 * Apuntar una hora más.
 *
 * Devuelve una lista NUEVA —no toca la que se le pasa— con la hora al
 * final y las más viejas fuera. Se redondea a un decimal: guardar
 * 19.516666666666666 es guardar ruido, y de paso ocupa cinco veces más
 * en un documento que se sincroniza.
 */
export function apuntarHora(horas = [], fecha = new Date()) {
  const h = horaDe(fecha);
  if (!Number.isFinite(h)) return horas;
  return [...horas, Math.round(h * 10) / 10].slice(-MUESTRAS);
}

/**
 * A qué hora sueles leer.
 *
 * Devuelve `{ hora, constancia, muestras }`, con `hora` en null cuando
 * no se puede decir: o hay pocas lecturas, o se reparten demasiado.
 * Null es una respuesta, no un fallo — la pantalla tiene que poder
 * decir «todavía no lo sé» en vez de inventarse una hora.
 */
export function horaHabitual(horas = [], { minimo = MINIMO, constancia = CONSTANCIA_MINIMA } = {}) {
  const validas = horas.filter((h) => Number.isFinite(h) && h >= 0 && h < HORAS);
  if (validas.length < minimo) {
    return { hora: null, constancia: 0, muestras: validas.length, motivo: 'pocas-lecturas' };
  }

  let x = 0;
  let y = 0;
  for (const h of validas) {
    x += Math.cos(aAngulo(h));
    y += Math.sin(aAngulo(h));
  }
  x /= validas.length;
  y /= validas.length;

  /* La longitud del vector medio: 1 = siempre a la misma hora, 0 = a
     cualquier hora. Es la medida de si esto es una costumbre o no. */
  const fuerza = Math.sqrt(x * x + y * y);
  if (fuerza < constancia) {
    return { hora: null, constancia: fuerza, muestras: validas.length, motivo: 'sin-hora-clara' };
  }

  return {
    hora: aHora(Math.atan2(y, x)),
    constancia: fuerza,
    muestras: validas.length,
    motivo: null,
  };
}

/**
 * La hora, redondeada a la media hora y escrita como se dice.
 *
 * A la media y no al minuto a propósito: «sueles leer sobre las 19:37»
 * suena a que la app te está midiendo. «Sobre las 19:30» dice lo mismo
 * y suena a lo que es, una observación.
 */
export function horaLegible(hora) {
  if (hora == null || !Number.isFinite(hora)) return '';
  const medias = Math.round(hora * 2) % (HORAS * 2);
  const h = Math.floor(medias / 2);
  return `${String(h).padStart(2, '0')}:${medias % 2 ? '30' : '00'}`;
}

/* ── CUÁNDO TOCA ─────────────────────────────────────────────── */

/* Lunes a domingo, como se leen en español. El índice es el de
   `getDay()` de JavaScript, que empieza en domingo — de ahí el 0 al
   final y no al principio. */
export const DIAS = [
  { i: 1, corto: 'L', nombre: 'lunes' },
  { i: 2, corto: 'M', nombre: 'martes' },
  { i: 3, corto: 'X', nombre: 'miércoles' },
  { i: 4, corto: 'J', nombre: 'jueves' },
  { i: 5, corto: 'V', nombre: 'viernes' },
  { i: 6, corto: 'S', nombre: 'sábado' },
  { i: 0, corto: 'D', nombre: 'domingo' },
];

export const TODOS_LOS_DIAS = DIAS.map((d) => d.i);

/** La configuración de fábrica: apagado, todos los días, hora deducida. */
export const RECORDATORIO_POR_DEFECTO = {
  activo: false,
  dias: TODOS_LOS_DIAS,
  hora: null,          // null = la que se deduzca de cómo lees
};

/* Cuánto margen se le da a la hora. El cron no dispara al segundo y el
   teléfono puede estar sin red un rato: sin margen, un aviso que llega
   diez minutos tarde no llega nunca. Media hora por delante es lo que
   hay entre «es la hora» y «ya es otra cosa». */
export const MARGEN_MINUTOS = 30;

/* La misma clave de día que usa la racha, para poder comparar con
   `readingDays` sin traducir nada por el medio. */
export const claveDia = (fecha = new Date()) => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * ¿Toca avisar ahora mismo?
 *
 * Devuelve `{ avisar, motivo }`. `motivo` dice POR QUÉ no, siempre, y
 * no es un lujo: es lo que permite que la pantalla de ajustes explique
 * «hoy no te avisaremos porque ya leíste» en vez de dejar a quien mira
 * preguntándose si está roto.
 *
 * @param config       `{ activo, dias, hora }`
 * @param horas        las horas apuntadas, para deducir la hora si no hay una fija
 * @param diasLeidos   `readingDays` de la racha
 * @param ahora        el momento
 * @param ultimoAviso  clave de día del último aviso mandado
 */
export function tocaAvisar(config = RECORDATORIO_POR_DEFECTO, {
  horas = [], diasLeidos = [], ahora = new Date(), ultimoAviso = '',
} = {}) {
  const no = (motivo) => ({ avisar: false, motivo });

  if (!config?.activo) return no('apagado');

  /* «No llega si ya leí hoy» — el criterio que hace que esto sea un
     recordatorio y no una alarma. Quien ya leyó no necesita que se lo
     recuerden, y recordárselo igual es la forma más rápida de que
     apague los avisos para siempre. */
  const hoy = claveDia(ahora);
  if (diasLeidos.includes(hoy)) return no('ya-leiste-hoy');

  /* «Como máximo uno al día.» */
  if (ultimoAviso === hoy) return no('ya-avisamos-hoy');

  const dias = config.dias?.length ? config.dias : TODOS_LOS_DIAS;
  if (!dias.includes(ahora.getDay())) return no('hoy-no-toca');

  const objetivo = config.hora ?? horaHabitual(horas).hora;
  if (objetivo == null) return no('sin-hora');

  /* La ventana: desde la hora hasta media hora después. Se compara en
     el círculo para que un recordatorio a las 23:50 siga valiendo a las
     00:10 y no se pierda por el cambio de día. */
  const ahoraH = horaDe(ahora);
  const desde = (ahoraH - objetivo + HORAS) % HORAS;
  if (desde > MARGEN_MINUTOS / 60) return no('todavia-no');

  return { avisar: true, motivo: null };
}

/* Lo que se enseña en Ajustes para cada motivo. Que se pueda leer por
   qué no va a llegar un aviso es la diferencia entre un ajuste que se
   entiende y uno que parece estropeado. */
export const POR_QUE_NO = {
  apagado: 'Los recordatorios están apagados.',
  'ya-leiste-hoy': 'Hoy no te avisaremos: ya leíste.',
  'ya-avisamos-hoy': 'Ya te avisamos hoy. Como mucho, uno al día.',
  'hoy-no-toca': 'Hoy no es uno de los días que elegiste.',
  'sin-hora': 'Todavía no sabemos a qué hora sueles leer. Elige una tú, '
    + 'o lee unos días más y la deducimos.',
  'todavia-no': 'Todavía no es la hora.',
};

/** Cómo se resume el ajuste en una línea, en Ajustes. */
export function resumenRecordatorio(config = RECORDATORIO_POR_DEFECTO, horas = []) {
  if (!config?.activo) return 'Apagado';

  const deducida = config.hora == null;
  const objetivo = config.hora ?? horaHabitual(horas).hora;
  if (objetivo == null) return 'Encendido · aprendiendo tu hora';

  const dias = config.dias?.length ? config.dias : TODOS_LOS_DIAS;
  const cuando = dias.length === 7 ? 'todos los días'
    : dias.length === 5 && [1, 2, 3, 4, 5].every((d) => dias.includes(d)) ? 'de lunes a viernes'
      : DIAS.filter((d) => dias.includes(d.i)).map((d) => d.corto).join(' ');

  return `${horaLegible(objetivo)}, ${cuando}${deducida ? ' · tu hora habitual' : ''}`;
}
