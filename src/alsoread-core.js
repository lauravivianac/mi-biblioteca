/* ─────────────────────────────────────────────────────────────
   «QUIEN LEYÓ ESTO TAMBIÉN LEYÓ» · lo medible  ·  historia #67

   La nota de la historia avisa de lo que puede salir mal, y es lo que
   manda aquí: «con cinco usuarias produce sugerencias absurdas, y una
   mala primera impresión de esta sección cuesta más que no tenerla».

   Así que esta sección PREFIERE NO APARECER. Hay un mínimo de gente y
   un mínimo de coincidencias, y si no se llega, no se enseña nada —ni
   un hueco, ni un «todavía no hay datos»—. Una recomendación mala se
   recuerda; una sección que no estaba, no.

   Y se prioriza a quien VALORA parecido, no solo a quien lee lo mismo.
   No es lo mismo: dos personas pueden haber leído los mismos veinte
   libros y odiar cada una lo que adora la otra.
   ───────────────────────────────────────────────────────────── */

/* Los mínimos. Suben o bajan la exigencia de toda la sección. */
export const MIN_LECTORAS = 3;      // menos gente que esto no es una señal
export const MIN_COINCIDENCIAS = 2; // un libro suelto en común es casualidad
export const MAX_SUGERENCIAS = 6;

/**
 * Cuánto se parecen dos formas de puntuar.
 *
 * Devuelve de 0 a 1 mirando SOLO los libros que las dos leyeron. Sin
 * libros en común devuelve null y no 0: «no lo sé» y «no se parecen»
 * son cosas distintas, y confundirlas hace que quien no tiene datos
 * quede por debajo de quien sí los tiene y no se parece.
 */
export function afinidad(mias = {}, suyas = {}) {
  const comunes = Object.keys(mias).filter((id) => id in suyas);
  if (!comunes.length) return null;
  /* La distancia media entre puntuaciones, pasada a parecido. En una
     escala de 1 a 5 la distancia máxima es 4. */
  const suma = comunes.reduce((a, id) => a + Math.abs(mias[id] - suyas[id]), 0);
  return 1 - (suma / comunes.length) / 4;
}

/**
 * Con cuánto peso cuenta lo que leyó una persona.
 *
 * Quien valora parecido pesa más. Quien no tiene puntuaciones en común
 * cuenta, pero menos: leer lo mismo ya es algo, y descartarla del todo
 * dejaría la sección vacía justo al principio, que es cuando más falta
 * hace que aparezca.
 */
export function peso(afin) {
  if (afin === null) return 0.5;
  return 0.25 + afin * 0.75;      // de 0,25 a 1
}

/**
 * Los libros que también leyeron quienes leyeron este.
 *
 * `lectoras` son perfiles públicos con `librosLeidos` y `valorados`.
 * `mias` son mis puntuaciones. `excluir` es lo que ya tengo, para no
 * recomendarme lo que ya está en mi biblioteca.
 */
export function alsoRead({
  bookId, lectoras = [], mias = {}, excluir = [], miUid = null,
} = {}) {
  if (!bookId) return { suficiente: false, libros: [] };

  const relevantes = lectoras.filter((p) => p
    && p.uid !== miUid
    && Array.isArray(p.librosLeidos)
    && p.librosLeidos.includes(bookId));

  /* El primer freno: poca gente no es una señal, es ruido. */
  if (relevantes.length < MIN_LECTORAS) return { suficiente: false, libros: [], lectoras: relevantes.length };

  const fuera = new Set([...excluir, bookId]);
  const puntos = new Map();
  const cuantas = new Map();

  for (const p of relevantes) {
    const w = peso(afinidad(mias, p.valorados || {}));
    for (const id of p.librosLeidos) {
      if (fuera.has(id)) continue;
      puntos.set(id, (puntos.get(id) || 0) + w);
      cuantas.set(id, (cuantas.get(id) || 0) + 1);
    }
  }

  /* El segundo freno: un libro que solo coincide una vez es casualidad. */
  const libros = [...puntos.entries()]
    .filter(([id]) => cuantas.get(id) >= MIN_COINCIDENCIAS)
    .sort((a, b) => b[1] - a[1] || cuantas.get(b[0]) - cuantas.get(a[0]))
    .slice(0, MAX_SUGERENCIAS)
    .map(([id, punto]) => ({ id, punto: Math.round(punto * 100) / 100, lectoras: cuantas.get(id) }));

  return { suficiente: libros.length > 0, libros, lectoras: relevantes.length };
}

/** Lo que dice la tarjeta debajo de cada libro sugerido. */
export const porQueTexto = (n) =>
  (n === 1 ? 'Lo leyó 1 de ellas' : `Lo leyeron ${n} de ellas`);

/** El encabezado, que dice de dónde sale la sugerencia. */
export const encabezado = (lectoras) =>
  `Quienes leyeron este también leyeron · ${lectoras} ${lectoras === 1 ? 'lectora' : 'lectoras'}`;
