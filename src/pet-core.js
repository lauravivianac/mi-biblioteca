/* ─────────────────────────────────────────────────────────────
   LO QUE LA MASCOTA SABE Y LO QUE DICE  ·  historias #39 y #42

   Aquí solo hay cuentas: de una lista de libros sale un ánimo, y del
   ánimo sale una frase. Sin Firebase, sin DOM y sin azar, para que se
   pueda comprobar — que es justo lo que faltaba.

   POR QUÉ ESTÁ SEPARADO DE `pet.js`. Las tres cosas que iban mal eran
   de cuenta, no de dibujo:

     · se felicitaba por el libro EQUIVOCADO —`.some()` decía «hubo un
       final» y la frase se quedaba con el libro en curso—,
     · se celebraba durante dos días aunque desde entonces hubieras
       leído otras doscientas páginas,
     · y la frase se volvía a sortear en CADA repintado, así que
       cambiaba al tocar cualquier cosa sin que hubiera pasado nada.

   Ninguna se veía leyendo el código: se ven poniendo fechas y mirando
   qué sale. Eso es lo que `npm run test:mascota` hace ahora.
   ───────────────────────────────────────────────────────────── */

export const DIA = 86400000;

/**
 * El ánimo, y de qué libro habla.
 *
 * @param {object[]} libros  `{id, status, page, total, pct, lastReadAt, finishedAt}`
 * @param {number} ahora
 * @returns {{mood: string, libro: object|null, diasCallada: number|null}}
 */
export function estadoMascota(libros = [], ahora = Date.now()) {
  /* Por lectura más reciente, igual que el rincón: si no, la frase
     hablaba de un libro y el escenario mostraba otro. */
  const leyendo = libros
    .filter((b) => b.status === 'reading')
    .sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0));

  const ultimaLectura = Math.max(0, ...libros.map((b) => b.lastReadAt || 0));
  const diasCallada = ultimaLectura
    ? Math.floor((ahora - ultimaLectura) / DIA)
    : null;

  /* EL LIBRO QUE SE TERMINÓ, no un sí/no: es lo que hacía que
     felicitara por el que estabas leyendo en vez de por el que
     acababas de acabar. */
  const terminado = libros
    .filter((b) => b.finishedAt && ahora - b.finishedAt < 2 * DIA)
    .sort((a, b) => b.finishedAt - a.finishedAt)[0];

  /* Y SOLO SI ES LA ÚLTIMA NOTICIA. Si después de terminar has vuelto
     a leer, lo que importa es lo que lees ahora, no el final de
     anteayer. */
  const celebra = Boolean(terminado && terminado.finishedAt >= ultimaLectura);

  const casiTermina = leyendo.find((b) => (b.pct ?? 0) >= 85);
  const enCurso = leyendo[0] || null;

  if (celebra) return { mood: 'celebrando', libro: terminado, diasCallada };
  if (casiTermina) return { mood: 'expectante', libro: casiTermina, diasCallada };
  if (diasCallada === null || diasCallada >= 4) return { mood: 'dormida', libro: enCurso, diasCallada };
  if (enCurso) return { mood: 'leyendo', libro: enCurso, diasCallada };
  return { mood: 'contenta', libro: enCurso, diasCallada };
}

/* ── SU VOZ ──────────────────────────────────────────────────
   Frases escritas a mano con huecos que se rellenan con tus datos.
   NO las genera el agente: cuestan cero, responden al instante y
   —lo que de verdad importa— una mascota con voz propia y constante
   se siente un personaje; una que improvisa se siente un chatbot
   con sombrero. */

export const FRASES = {
  contenta: [
    'Hoy hay tiempo para un capítulo.',
    'Tu biblioteca está tranquila.',
    '¿Empezamos algo nuevo?',
    'Me gusta este silencio de estantería.',
  ],
  leyendo: [
    'Vas por la mitad de {libro}.',
    'Te espero en la página {pagina} de {libro}.',
    '{libro} avanza bien.',
    'Quedan {faltan} páginas de {libro}.',
  ],
  estancada: [
    'Llevas {dias} días en el mismo capítulo, ¿está pesado?',
    '{libro} lleva un rato esperando.',
    'Nadie corre. Ahí sigue {libro}.',
  ],
  dormida: [
    'Aquí sigo cuando quieras.',
    'Me eché una siesta entre los libros.',
    'Los libros no se van a ninguna parte.',
    'Cuando vuelvas, seguimos.',
  ],
  celebrando: [
    '¡Terminaste {libro}! 🎉',
    'Un libro menos en la pila.',
    'Eso fue {paginas} páginas. Nada mal.',
  ],
  expectante: [
    'Ya casi terminas {libro}.',
    'Faltan {faltan} páginas. ¿Las hacemos hoy?',
    'Estoy en la última parte de {libro} contigo.',
  ],
};

/* Una huella entera y estable de un texto. La misma que reparte las
   telas de los lomos (ver src/lomo.js): aquí reparte frases. */
export function huella(texto) {
  let h = 0;
  const s = String(texto);
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Lo que dice ahora mismo.
 *
 * LA FRASE NO SE SORTEA: SE DEDUCE. Antes salía de `Math.random()` en
 * cada llamada, y la mascota se repinta en cada refresco —al marcar un
 * libro, al cambiar un filtro, al abrir y cerrar una hoja—. O sea que
 * cambiaba de frase cada vez que tocabas cualquier cosa, sin que
 * hubiera pasado nada. Eso es lo que la hacía sonar a que decía
 * cualquier cosa: no es que la frase fuera falsa, es que no tenía
 * ninguna relación con lo que acababa de ocurrir. Alguien que dice
 * algo distinto cada vez que parpadeas no está diciendo nada.
 *
 * Ahora la elige una huella de SU ESTADO: el ánimo, el libro, la
 * página, los días de silencio y el día del calendario. Mientras no
 * cambie nada de eso repite lo mismo —que es lo que hace alguien con
 * algo que decir— y cuando de verdad pasa algo, cambia.
 */
export function fraseMascota(estado, { ahora = Date.now(), nombre = '' } = {}) {
  const { mood, libro, diasCallada } = estado;

  let cesta = FRASES[mood] || FRASES.contenta;
  if (mood === 'leyendo' && diasCallada >= 2) cesta = FRASES.estancada;

  const total = libro?.total || null;
  const pagina = libro?.page || 0;

  const huecos = {
    '{libro}': libro?.title || 'tu libro',
    '{pagina}': pagina || 1,
    '{paginas}': total || '—',
    '{faltan}': total ? Math.max(1, total - pagina) : 'algunas',
    '{dias}': diasCallada ?? 0,
    '{nombre}': nombre || '',
  };

  /* Sin libro no se usa una frase que lo nombre. Antes, si TODAS lo
     nombraban, el filtro se descartaba entero y salía «¡Terminaste tu
     libro!», que es justo la frase de relleno que no debería existir. */
  const utiles = cesta.filter((f) => libro || !f.includes('{libro}'));
  const finales = utiles.length ? utiles : FRASES.contenta;

  const semilla = `${mood}|${libro?.id || ''}|${pagina}|${diasCallada ?? ''}|${Math.floor(ahora / DIA)}`;
  return finales[huella(semilla) % finales.length]
    .replace(/\{[a-z]+\}/g, (m) => huecos[m] ?? '');
}
