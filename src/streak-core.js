/* ─────────────────────────────────────────────────────────────
   LA RACHA · el núcleo  ·  historia #68

   Cuántos días seguidos llevas leyendo. Es la mecánica más barata que
   existe para volver mañana, y también la más fácil de convertir en
   algo que estresa en vez de motivar.

   POR ESO EXISTEN LAS CONGELACIONES, y son el corazón de la historia:
   dos al mes, que se gastan SOLAS para salvar un día perdido. Perder
   sesenta días por un vuelo largo hace que la gente deje de abrir la
   app —el efecto exactamente contrario al que se busca—.

   TRES DECISIONES QUE PARECEN DETALLES Y NO LO SON:

   1. Una congelación SALVA la racha pero NO la suma. Ese día no
      leíste, y decir que sí sería mentirte para que te sientas bien.
      La cadena no se rompe; el número no sube.

   2. Las congelaciones NO se guardan: se deducen del calendario cada
      vez. Un contador guardado se desincroniza en cuanto corriges una
      fecha o cambias de dispositivo, y entonces la racha depende de
      la historia de tus clics en vez de tus días de lectura.

   3. HOY NUNCA GASTA UNA CONGELACIÓN. El día no ha terminado: son las
      once de la mañana y todavía puedes leer. Gastarla ya sería
      cobrarte por algo que aún no ha pasado.

   Todo en fechas LOCALES —'2026-09-06'—, nunca en UTC: una racha que
   se rompe a las nueve de la noche porque el servidor ya está en
   mañana es un fallo que nadie te va a saber explicar.

   Sin Firebase: se prueba en Node.
   ───────────────────────────────────────────────────────────── */

export const CONGELACIONES_POR_MES = 2;

/** La fecha local en formato ordenable. Nada de toISOString(). */
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** El día siguiente, sin salir de fechas locales. */
export function nextDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d + 1);
  return dayKey(date);
}

export const monthOf = (key) => key.slice(0, 7);

/**
 * Todo lo que hay que saber de la racha, de una vez.
 *
 * `dias` son las fechas locales en las que registraste algo. Basta
 * con unas pocas páginas: la historia dice, con esas palabras, que no
 * hay un mínimo castigador, así que aquí un día es un día.
 */
export function streakInfo(dias = [], {
  today = new Date(), congelacionesPorMes = CONGELACIONES_POR_MES,
} = {}) {
  const activos = new Set(dias.filter(Boolean));
  const hoy = dayKey(today);

  if (!activos.size) {
    return {
      actual: 0, masLarga: 0, hoyCuenta: false,
      congelados: [], congeladasEsteMes: 0, congelacionesRestantes: congelacionesPorMes,
      enPeligro: false, primerDia: null,
    };
  }

  const primerDia = [...activos].sort()[0];
  const usadasPorMes = {};
  const congelados = [];        // los días que salvó una congelación

  let racha = 0;
  let masLarga = 0;
  let rachaViva = 0;            // la que llega hasta hoy (o hasta ayer)

  for (let d = primerDia; d <= hoy; d = nextDay(d)) {
    if (activos.has(d)) {
      racha += 1;
      masLarga = Math.max(masLarga, racha);
      continue;
    }

    /* Hoy sin leer todavía no es un día perdido: quedan horas. Ni
       rompe la racha ni gasta congelación. */
    if (d === hoy) break;

    const mes = monthOf(d);
    const gastadas = usadasPorMes[mes] || 0;
    if (gastadas < congelacionesPorMes) {
      usadasPorMes[mes] = gastadas + 1;
      congelados.push(d);
      continue;                 // salva la cadena, pero NO suma
    }

    racha = 0;                  // se rompió de verdad
  }

  rachaViva = racha;
  const mesActual = monthOf(hoy);
  const usadasEsteMes = usadasPorMes[mesActual] || 0;

  return {
    actual: rachaViva,
    masLarga: Math.max(masLarga, rachaViva),
    hoyCuenta: activos.has(hoy),
    /* Solo se avisa de las congelaciones que sostienen la racha VIVA:
       las de hace ocho meses ya no le importan a nadie. */
    congelados: congelados.filter((c) => c >= ultimoCorte(activos, congelados, hoy)),
    congeladasEsteMes: usadasEsteMes,
    congelacionesRestantes: Math.max(0, congelacionesPorMes - usadasEsteMes),
    enPeligro: rachaViva > 0 && !activos.has(hoy),
    primerDia,
  };
}

/**
 * Desde qué día viene la racha viva. Se usa para no listar
 * congelaciones de rachas anteriores, que ya no vienen a cuento.
 */
function ultimoCorte(activos, congelados, hoy) {
  const salvados = new Set(congelados);
  let d = hoy;
  let inicio = hoy;
  // Hacia atrás mientras el día esté leído o congelado
  for (let i = 0; i < 4000; i++) {
    const anterior = prevDay(d);
    if (!activos.has(anterior) && !salvados.has(anterior)) break;
    inicio = anterior;
    d = anterior;
  }
  return inicio;
}

export function prevDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

/**
 * El aviso de que una congelación te salvó.
 *
 * La historia lo pide con esas palabras: «que no sea magia invisible».
 * Una racha que sobrevive a un día en blanco sin explicación se lee
 * como un fallo, y a la tercera vez dejas de creerte el número.
 */
export function freezeNotice(info) {
  if (!info?.congelados?.length) return null;
  const n = info.congelados.length;
  const ultima = info.congelados[info.congelados.length - 1];
  return n === 1
    ? `Se usó una congelación para salvar el ${diaLegible(ultima)}.`
    : `Se usaron ${n} congelaciones, la última el ${diaLegible(ultima)}.`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function diaLegible(key) {
  const [, m, d] = key.split('-').map(Number);
  return `${d} de ${MESES[m - 1]}`;
}

/** Cómo se cuenta la racha en la pantalla, en una frase. */
export function streakLine(info) {
  if (!info || info.actual === 0) {
    return info?.masLarga
      ? `Sin racha ahora mismo. Tu mejor marca fueron ${info.masLarga} días.`
      : 'Anota unas páginas hoy y empieza tu racha.';
  }
  /* El adjetivo concuerda: «1 día seguido», no «1 día seguidos». */
  const dias = info.actual === 1 ? '1 día seguido' : `${info.actual} días seguidos`;
  if (!info.hoyCuenta) return `${dias}. Hoy todavía no cuenta — te quedan horas.`;
  return `${dias} leyendo.`;
}

/**
 * Añadir el día de hoy a la lista, sin duplicar y sin que crezca para
 * siempre: dos años de historia son de sobra para una racha y para la
 * marca más larga.
 */
export function addDay(dias = [], date = new Date(), tope = 800) {
  const key = dayKey(date);
  if (dias.includes(key)) return dias;
  return [...dias, key].sort().slice(-tope);
}
