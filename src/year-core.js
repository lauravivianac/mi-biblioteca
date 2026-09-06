/* ─────────────────────────────────────────────────────────────
   TU AÑO EN LIBROS · el núcleo  ·  historia #71

   La pieza más compartible de toda la app, y la que llega en el
   momento del año en que la gente está más dispuesta a compartir.

   TRES COSAS QUE DECIDEN SI ESTO SE COMPARTE O SE CIERRA:

   1. SE PUEDE MIRAR EN MARZO. Un resumen que solo existe en diciembre
      es una campaña, no una función. Aquí se dice «en lo que va de
      año» y ya está: los números son los que son.

   2. CON POCOS DATOS SE VE DIGNO. Un año con tres libros no puede
      salir con seis tarjetas a cero y un «tu género favorito: —».
      Las tarjetas que no tienen nada que decir NO SE PINTAN. Es la
      diferencia entre «me quedé corta» y «esta app no es para mí».

   3. NADA DE MEDIAS QUE NO SIGNIFICAN NADA. «1,7 libros al mes» es
      aritmética, no un recuerdo. Se cuentan cosas que pasaron: el que
      más te gustó, el más gordo que terminaste, el mes que más leíste.

   Sin Firebase: se prueba en Node.
   ───────────────────────────────────────────────────────────── */

import { pageCount, MONTH_ORDER } from './seed.js';
import { streakInfo, dayKey } from './streak-core.js';

/** Con menos de esto, el resumen se presenta como un principio. */
export const MINIMO_DIGNO = 3;

const finDeAnio = (year) => new Date(year, 11, 31);

/**
 * El año, contado.
 *
 * `libros` son entradas fusionadas con {status, rating, finishedAt,
 * pages, genre, title, author}. Se cuenta por finishedAt, que es
 * cuándo lo TERMINASTE — no por el mes del plan, que es cuándo
 * pensabas terminarlo. Confundirlos haría que el resumen contara tus
 * intenciones en vez de tu año.
 */
export function yearReview(libros = [], { year, readingDays = [], today = new Date() } = {}) {
  const anio = year ?? today.getFullYear();
  const enCurso = anio === today.getFullYear();

  const leidos = libros.filter((b) => b.status === 'read' && b.finishedAt
    && new Date(b.finishedAt).getFullYear() === anio);

  const paginas = leidos.reduce((a, b) => a + (pageCount(b.pages) || 0), 0);

  /* Los géneros, ordenados por cuántos leíste — y con empate, por
     páginas. Desempatar por orden alfabético sería decidir tu género
     del año con la letra inicial: dos géneros a dos libros no están
     igualados si en uno pasaste el triple de páginas. */
  const cuenta = {};
  for (const b of leidos) {
    if (!b.genre) continue;
    const c = cuenta[b.genre] || { n: 0, paginas: 0 };
    c.n += 1;
    c.paginas += pageCount(b.pages) || 0;
    cuenta[b.genre] = c;
  }
  const generos = Object.entries(cuenta)
    .map(([genre, c]) => ({ genre, n: c.n, paginas: c.paginas }))
    .sort((a, b) => b.n - a.n || b.paginas - a.paginas || a.genre.localeCompare(b.genre));

  /* El mejor valorado: con empate gana el más largo, que suele ser el
     que más te costó y por tanto el que más recuerdas. */
  const puntuados = leidos.filter((b) => b.rating > 0);
  const mejorValorado = puntuados.length
    ? [...puntuados].sort((a, b) => b.rating - a.rating
      || (pageCount(b.pages) || 0) - (pageCount(a.pages) || 0))[0]
    : null;

  const conPaginas = leidos.filter((b) => pageCount(b.pages));
  const masLargo = conPaginas.length
    ? [...conPaginas].sort((a, b) => pageCount(b.pages) - pageCount(a.pages))[0]
    : null;

  /* El mes que más leíste, por libros terminados. */
  const porMes = new Array(12).fill(0);
  for (const b of leidos) porMes[new Date(b.finishedAt).getMonth()] += 1;
  const maximo = Math.max(...porMes);
  const mesMasLector = maximo > 0
    ? { mes: MONTH_ORDER[porMes.indexOf(maximo)], libros: maximo }
    : null;

  /* La racha más larga DENTRO del año. Se usa el mismo cálculo que la
     racha viva —congelaciones incluidas— para que los dos números de
     la app no se contradigan. */
  const diasDelAnio = readingDays.filter((d) => d.startsWith(`${anio}-`));
  const corte = enCurso ? today : finDeAnio(anio);
  const rachaMasLarga = diasDelAnio.length
    ? streakInfo(diasDelAnio, { today: corte }).masLarga
    : 0;

  return {
    anio,
    enCurso,
    leidos: leidos.length,
    paginas,
    generos,
    generosDistintos: generos.length,
    mejorValorado,
    masLargo,
    mesMasLector,
    rachaMasLarga,
    diasLeyendo: diasDelAnio.length,
    /* Con menos de tres libros no hay «año»: hay un principio, y se
       cuenta como tal en vez de fingir un resumen. */
    suficiente: leidos.length >= MINIMO_DIGNO,
    libros: leidos,
  };
}

/**
 * Las tarjetas, en orden, y SOLO las que tienen algo que decir.
 *
 * Esta función es la que cumple «con pocos datos se ve digno»: en vez
 * de pintar seis tarjetas y rellenar los huecos con guiones, se
 * devuelven las que existen. Un año de tres libros sale con tres
 * tarjetas buenas en lugar de seis a medias.
 */
export function yearCards(r) {
  if (!r) return [];
  const cards = [];

  cards.push({
    id: 'portada',
    kicker: r.enCurso ? 'En lo que va de' : 'Tu año en libros',
    titulo: String(r.anio),
    texto: r.leidos
      ? (r.leidos === 1 ? 'Un libro terminado' : `${r.leidos} libros terminados`)
      : 'Todavía sin libros terminados',
  });

  if (r.paginas > 0) {
    cards.push({
      id: 'paginas',
      kicker: 'Páginas',
      titulo: r.paginas.toLocaleString('es'),
      texto: alturaDePapel(r.paginas),
    });
  }

  if (r.generos.length) {
    const top = r.generos[0];
    cards.push({
      id: 'generos',
      kicker: r.generosDistintos > 1 ? `${r.generosDistintos} géneros distintos` : 'Tu género',
      titulo: top.genre,
      texto: top.n === 1 ? 'Tu único de ese género este año' : `${top.n} libros`,
      lista: r.generos.slice(0, 5),
    });
  }

  if (r.mejorValorado) {
    cards.push({
      id: 'mejor',
      kicker: `Lo mejor del año · ${'★'.repeat(r.mejorValorado.rating)}`,
      titulo: r.mejorValorado.title,
      texto: r.mejorValorado.author,
      libro: r.mejorValorado,
    });
  }

  /* El más largo solo si de verdad es una hazaña: repetir el mismo
     libro que ya salió como «lo mejor» no cuenta dos veces. */
  if (r.masLargo && r.masLargo.id !== r.mejorValorado?.id && pageCount(r.masLargo.pages) >= 300) {
    cards.push({
      id: 'largo',
      kicker: 'El más gordo que terminaste',
      titulo: r.masLargo.title,
      texto: `${pageCount(r.masLargo.pages)} páginas`,
      libro: r.masLargo,
    });
  }

  if (r.rachaMasLarga >= 3) {
    cards.push({
      id: 'racha',
      kicker: 'Tu mejor racha',
      titulo: `${r.rachaMasLarga} días`,
      texto: 'seguidos leyendo',
    });
  }

  if (r.mesMasLector && r.mesMasLector.libros > 1) {
    cards.push({
      id: 'mes',
      kicker: 'Tu mes más lector',
      titulo: r.mesMasLector.mes,
      texto: `${r.mesMasLector.libros} libros`,
    });
  }

  cards.push({
    id: 'cierre',
    kicker: r.suficiente ? 'Y lo que queda' : 'Esto acaba de empezar',
    titulo: cierre(r),
    texto: r.enCurso
      ? 'El año sigue. Esto se actualiza solo.'
      : 'Un año entero, guardado.',
  });

  return cards;
}

function cierre(r) {
  if (!r.leidos) return 'Tu primer libro te está esperando';
  if (!r.suficiente) return `${r.leidos} ${r.leidos === 1 ? 'libro' : 'libros'}, y contando`;
  return r.enCurso ? '¿Cuántos más caben?' : 'Nada mal';
}

/**
 * Las páginas, en algo que se pueda imaginar.
 *
 * Un número grande solo es grande si lo puedes ver. Una página de
 * bolsillo tiene unos 0,1 mm, así que mil páginas son diez centímetros
 * de papel — una pila que sí te puedes figurar encima de la mesa.
 */
export function alturaDePapel(paginas) {
  const cm = paginas * 0.01;
  if (cm < 1) return 'Un buen principio';
  if (cm < 100) return `Una pila de ${Math.round(cm)} cm`;
  return `Una pila de ${(cm / 100).toFixed(1).replace('.', ',')} metros`;
}

/** Los años en los que terminaste algo, del más nuevo al más viejo. */
export function yearsWithBooks(libros = [], today = new Date()) {
  const anios = new Set(
    libros.filter((b) => b.status === 'read' && b.finishedAt)
      .map((b) => new Date(b.finishedAt).getFullYear()),
  );
  anios.add(today.getFullYear());        // el año en curso siempre se puede mirar
  return [...anios].sort((a, b) => b - a);
}

export { dayKey };
