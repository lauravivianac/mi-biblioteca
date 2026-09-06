/* ─────────────────────────────────────────────────────────────
   ¿CUÁL PRIMERO?  ·  historia #60

   Dos pendientes, uno encima del otro, y la pregunta que de verdad te
   frena: cuál abro esta noche. La historia lo dice sin rodeos — «para
   dejar de darle vueltas».

   Aquí no se decide por «cuál es mejor libro», que es una pregunta sin
   respuesta. Se decide por CUÁL AHORA, que sí la tiene, y depende de
   tres cosas que la app ya sabe:

     · de qué vienes — después de un tomo denso, otro tomo denso es
       la forma más fiable de no leer nada en marzo;
     · cuánto mes te queda — el plan distingue ⚓ Ancla de ⚡ Corto por
       algo, y a mitad de mes esa distinción es lo único que importa;
     · qué te gusta — pero eso desempata, no manda: es lo mismo que
       hacen las otras pantallas.

   Y sobre todo: se explica. Un veredicto sin porqué no ayuda a decidir,
   solo cambia quién decide. Devuelve TODOS los motivos, incluidos los
   que juegan en contra del ganador, porque una comparación honesta
   admite que el otro también tenía algo.

   La densidad usa la MISMA tabla que el plan (GENRE_FRICTION): un
   ensayo de 300 páginas no se lee como un thriller de 300, y eso el
   generador ya lo sabía.

   Sin Firebase: se prueba en Node.
   ───────────────────────────────────────────────────────────── */

import { pageCount } from './seed.js';
import { GENRE_FRICTION, isAnchor } from './plan-core.js';

/** Páginas «de esfuerzo»: las de verdad, por lo que cuesta el género. */
export function densityOf(book) {
  const p = pageCount(book?.pages) || 250;
  return Math.round(p * (GENRE_FRICTION[book?.genre] ?? 1));
}

/** De lo que vienes: un tomo denso deja huella en lo siguiente. */
export const DENSO = 500;
export const isHeavy = (book) => Boolean(book) && densityOf(book) >= DENSO;

/**
 * Cuánto mes te queda, en páginas.
 *
 * No es lo mismo el día 2 que el día 24, y esa es exactamente la
 * diferencia entre poder abrir un Ancla o no.
 */
export function roomLeft({ pagesPerDay = 20, today = new Date() } = {}) {
  const finDeMes = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const diasQueQuedan = Math.max(1, finDeMes - today.getDate() + 1);
  return Math.round(pagesPerDay * diasQueQuedan);
}

/**
 * Compara dos pendientes y dice cuál primero.
 *
 * `motivos` son objetos {a, texto} donde `a` es a favor de quién juega
 * ese motivo: 1 para el primero, -1 para el segundo. Así la pantalla
 * puede enseñar los dos lados sin volver a razonar nada.
 */
export function compareBooks(a, b, {
  vengoDe = null, room = 600, taste = null,
} = {}) {
  if (!a || !b) return null;
  if (a.id === b.id) return null;

  const motivos = [];
  let punto = 0;                 // positivo = gana A

  /* 1 · De qué vienes. El criterio con el que más se acierta en la
     vida real: después de un tomo denso, lo ligero es lo que se acaba
     leyendo. No es una regla de estilo, es lo que pasa. */
  const da = densityOf(a);
  const db = densityOf(b);
  if (isHeavy(vengoDe) && Math.abs(da - db) > 80) {
    const ligero = da < db ? 1 : -1;
    punto += ligero * 40;
    motivos.push({
      a: ligero,
      texto: `Vienes de ${vengoDe.title}, que era denso: apetece algo más ligero`,
    });
  }

  /* 2 · Cuánto mes te queda. El rol del plan existe para esto. */
  const cabeA = da <= room;
  const cabeB = db <= room;
  if (cabeA !== cabeB) {
    const cabe = cabeA ? 1 : -1;
    punto += cabe * 35;
    motivos.push({
      a: cabe,
      texto: `Con lo que queda de mes (~${room} págs.) solo te da tiempo a uno de los dos`,
    });
  } else if (isAnchor(a) !== isAnchor(b)) {
    /* Los dos caben, o ninguno: entonces manda el rol y el hueco. */
    const quiereAncla = room >= 400;
    const anclaEs = isAnchor(a) ? 1 : -1;
    const favor = quiereAncla ? anclaEs : -anclaEs;
    punto += favor * 25;
    motivos.push({
      a: favor,
      texto: quiereAncla
        ? 'Queda mes de sobra: es momento de un ⚓ Ancla'
        : 'Queda poco mes: mejor un ⚡ Corto que sí termines',
    });
  }

  /* 3 · Lo que ya estaba planificado pesa: lo pusiste ahí por algo. */
  if (Boolean(a.month) !== Boolean(b.month)) {
    const enPlan = a.month ? 1 : -1;
    punto += enPlan * 15;
    motivos.push({
      a: enPlan,
      texto: `Ya lo tenías en el plan de ${a.month || b.month}`,
    });
  }

  /* 4 · Y tu gusto, que aquí desempata. Va el último y pesa poco a
     propósito: la pregunta es «cuál AHORA», no «cuál te gusta más». */
  if (taste) {
    const ta = taste(a) || {};
    const tb = taste(b) || {};
    const dif = (ta.score || 0) - (tb.score || 0);
    if (Math.abs(dif) >= 25) {
      const mejor = dif > 0 ? 1 : -1;
      punto += mejor * 20;
      const porque = (dif > 0 ? ta.porque : tb.porque);
      if (porque) motivos.push({ a: mejor, texto: porque });
    }
  }

  const porA = motivos.filter((m) => m.a === 1).map((m) => m.texto);
  const porB = motivos.filter((m) => m.a === -1).map((m) => m.texto);

  /* Empate. Hay dos empates distintos y confundirlos sería tirar el
     trabajo: uno es «no hay nada que los distinga» y el otro es «los
     dos tienen argumentos y se anulan». Al segundo decirle «elige por
     portada» sería esconder el razonamiento justo cuando más lo
     necesitas, que es cuando de verdad no lo tienes claro. */
  if (punto === 0) {
    const reñido = porA.length && porB.length;
    return {
      empate: true,
      ganador: null,
      perdedor: null,
      motivos,
      porA,
      porB,
      /* Mismas claves que cuando hay ganador, aunque vayan vacías: si
         el empate devolviera otra forma, la pantalla tendría que
         acordarse de mirar `empate` antes de tocar nada, y el día que
         se le olvide reventará justo en el caso raro. */
      aFavor: [],
      enContra: [],
      fuerza: 0,
      resumen: reñido
        ? 'Empatados: hay razones para los dos. Mira cuáles te suenan más y decide tú.'
        : 'Están igualados y no hay nada que los distinga ahora mismo. Elige por portada.',
    };
  }

  const ganaA = punto > 0;
  return {
    empate: false,
    ganador: ganaA ? a : b,
    perdedor: ganaA ? b : a,
    /* Los motivos, reordenados: primero los que apoyan al ganador, y
       después los del otro. Esconder los del perdedor sería vender la
       respuesta en vez de explicarla. */
    motivos: [
      ...motivos.filter((m) => (m.a === 1) === ganaA),
      ...motivos.filter((m) => (m.a === 1) !== ganaA),
    ],
    porA,
    porB,
    aFavor: ganaA ? porA : porB,
    enContra: ganaA ? porB : porA,
    fuerza: Math.abs(punto),
    resumen: `Empieza por ${(ganaA ? a : b).title}`,
  };
}
