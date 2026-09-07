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

/* Días de silencio en un libro EMPEZADO antes de que pregunte por él.
   Cinco, y no es un número redondo por gusto: a los dos ya lo comenta
   —«llevas 2 días en el mismo capítulo»—, así que preguntar antes sería
   decir dos veces lo mismo. Y a la semana ya no es una pregunta, es un
   recordatorio de algo que se te olvidó. */
export const DIAS_PARA_PREGUNTAR = 5;

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

  /* ¿CONSTA QUE LO LEYERA? Marcar un libro como terminado es un toque;
     leerlo deja rastro —una página apuntada o una lectura—. La
     diferencia importa porque hay frases que dicen CUÁNTO leíste, y
     decirle «eso fue 90 páginas, nada mal» a quien no ha abierto el
     libro es atribuirle algo que no hizo.

     Es la misma prueba de vida que separa «empezado» de «leyendo», que
     apliqué al libro en curso y no aquí — el mismo descuido, en el otro
     extremo del recorrido. */
  const constaLectura = Boolean(terminado
    && (terminado.page > 0 || terminado.lastReadAt));

  const casiTermina = leyendo.find((b) => (b.pct ?? 0) >= 85);

  /* «LEYENDO» NO ES LO MISMO QUE «EMPEZADO», y la app las confundía.
     `readNow()` —el «¡A leer!» de un toque, y también el ganador de un
     duelo y el libro que sigue al que acabas de terminar— marca el
     libro como reading con la página a cero y sin ninguna lectura
     apuntada. Con eso, la mascota anunciaba «Está leyendo Canción de
     Navidad contigo» sobre un libro que nadie había abierto, y que
     además había empezado la propia app en su nombre.

     Peor todavía: si había varios así, cuál de ellos nombraba salía
     del ORDEN DEL ARRAY, porque todos empataban a cero en la última
     lectura. Y lo decía con el ánimo en «dormida», o sea afirmando que
     lee contigo un libro mientras reconoce que nadie lee nada.

     Así que ahora hace falta una prueba de vida: una página o una
     lectura apuntada. Sin eso el libro está empezado, no en curso, y
     la mascota no lo nombra — callarse es siempre mejor que inventar,
     y más cuando lo que se inventa es lo que TÚ estás haciendo. */
  const hayLectura = (b) => Boolean(b.lastReadAt) || (b.page || 0) > 0;
  const enCurso = leyendo.find(hayLectura) || null;

  /* ── LO QUE NADIE PREGUNTABA NUNCA  ·  historia #45 ──────────
     «La app va a ayudar a la gente a que cumpla el plan: si pasó el
      mes y no leyó el libro, ver si lo quiere sacar; o en el mes,
      pedirle que actualice. La mascota debería hablar con la persona.»

     El plan YA SABE quién se quedó atrás: `stalledBooks()` en
     plan-core lo calcula desde el principio. Pero solo se consultaba
     dentro del asistente de «Armar mi plan», o sea que la app sabía
     que ibas atrasada y no decía nada salvo que fueras tú a buscarlo.

     Y es el mismo agujero que dejaba a la mascota hablando de un libro
     que nadie había abierto: la página y la última lectura se quedan a
     cero porque NADIE LAS PIDE JAMÁS. No falta el dato; falta la
     pregunta.

     Así que la mascota pregunta. Dos preguntas, y ninguna es un
     reproche —esa es la línea que no se cruza en este módulo—:

     · PREGUNTANDO · un libro que sí estabas leyendo lleva días callado.
       «¿Por dónde vas?» No «llevas cinco días sin leer».
     · RESCATANDO · se le pasó el mes al libro. «Se quedó en agosto,
       ¿lo traemos?» Y con la puerta de salida abierta: dejarlo ir
       tiene que ser una respuesta tan válida como retomarlo, o la
       pregunta es una trampa. */
  const diasDe = (b) => (b.lastReadAt ? Math.floor((ahora - b.lastReadAt) / DIA) : null);

  /* «Ahora no» tiene que valer para algo, o es un botón de cerrar con
     otro nombre. Un libro aplazado hoy no vuelve a salir hoy — y se
     comprueba aquí, en la decisión, no al pintar: si se filtrara en la
     pantalla, ella seguiría poniendo cara de pregunta sin preguntar. */
  const preguntar = leyendo.find((b) => !b.aplazado
    && hayLectura(b)
    && diasDe(b) !== null
    && diasDe(b) >= DIAS_PARA_PREGUNTAR
    && (b.pct ?? 0) < 85) || null;

  /* El más atrasado primero, como los ordena el propio plan. */
  const rescatar = libros
    .filter((b) => !b.aplazado && (b.atrasadoMeses || 0) >= 1)
    .sort((a, b) => b.atrasadoMeses - a.atrasadoMeses)[0] || null;

  /* Y NO SE INTERRUMPE UNA BUENA RACHA CON UNA TAREA VIEJA. Si leíste
     ayer, sacarte el libro de agosto es exactamente la clase de cosa
     que convierte a una compañera en una app de productividad. */
  const activa = Boolean(enCurso) && diasCallada !== null && diasCallada < 2;

  if (celebra) {
    return {
      mood: 'celebrando', libro: terminado, diasCallada,
      /* Viaja con el estado para que la frase sepa si puede hablar de
         páginas. Sin esto habría que volver a deducirlo al escribir, y
         dos sitios deduciendo lo mismo se separan a la primera. */
      constaLectura,
    };
  }
  if (casiTermina) return { mood: 'expectante', libro: casiTermina, diasCallada };
  if (preguntar) return { mood: 'preguntando', libro: preguntar, diasCallada };
  if (rescatar && !activa) return { mood: 'rescatando', libro: rescatar, diasCallada };
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
  /* «Eso fue {paginas} páginas» dice cuánto LEÍSTE, y solo puede
     decirse si consta que leyeras. Las otras dos celebran el final sin
     atribuirte nada, así que valen siempre. Ver `constaLectura`. */
  celebrando: [
    '¡Terminaste {libro}! 🎉',
    'Un libro menos en la pila.',
  ],
  celebrandoConPaginas: [
    'Eso fue {paginas} páginas. Nada mal.',
  ],
  expectante: [
    'Ya casi terminas {libro}.',
    'Faltan {faltan} páginas. ¿Las hacemos hoy?',
    'Estoy en la última parte de {libro} contigo.',
  ],

  /* PREGUNTA, NO PASA FACTURA. Ninguna dice cuántos días llevas: eso
     lo sabe la app y no le hace falta a nadie. «¿Por dónde vas?» abre
     una conversación; «llevas cinco días sin leer» la cierra. */
  preguntando: [
    '¿Por dónde vas con {libro}?',
    'Se me perdió la cuenta de {libro}. ¿En qué página andamos?',
    'Cuéntame cómo va {libro}.',
  ],

  /* Y AQUÍ LA PUERTA DE SALIDA, escrita en la propia frase. Si la
     única respuesta digna es «lo retomo», la pregunta es una trampa
     con dos salidas y una cerrada. Dejar un libro es una decisión de
     lectora, no un fracaso, y ella lo dice así. */
  rescatando: [
    '{libro} se quedó en {mes}. ¿Lo traemos?',
    'Tengo {libro} apartado desde {mes}. ¿Lo retomamos o lo dejamos ir?',
    '{libro} sigue esperando desde {mes}. ¿Qué hacemos con él?',
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
  /* Solo se puede presumir de páginas si consta que las leyeras. */
  if (mood === 'celebrando' && estado.constaLectura) {
    cesta = [...FRASES.celebrando, ...FRASES.celebrandoConPaginas];
  }

  const total = libro?.total || null;
  const pagina = libro?.page || 0;

  const huecos = {
    '{libro}': libro?.title || 'tu libro',
    '{pagina}': pagina || 1,
    '{paginas}': total || '—',
    '{faltan}': total ? Math.max(1, total - pagina) : 'algunas',
    '{dias}': diasCallada ?? 0,
    '{nombre}': nombre || '',
    /* El mes del plan al que estaba asignado. En minúscula porque va
       dentro de la frase, no encabezándola. */
    '{mes}': (libro?.mes || '').toLowerCase() || 'su mes',
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

/* ── CUANDO NO PUEDE CONTESTAR ───────────────────────────────
   LA MASCOTA NO ES UN MOSTRADOR.

   El cliente del agente traduce los fallos del Worker a un español
   correcto —«Esa consulta no está permitida», «Este dominio no está
   autorizado en el Worker»—, y eso está bien donde nació: en un aviso
   de Ajustes, leído por quien administra la app.

   En una conversación, debajo de su nombre, es otra cosa. Ahí no lo
   dice la app: lo dice CLEO. Y una compañera de lectura que contesta
   «Esa consulta no está permitida» a una niña de nueve años no es una
   compañera, es una ventanilla — con el agravante de que la pregunta
   la había propuesto ella misma dos líneas más arriba.

   DOS REGLAS, y de las dos sale todo lo de abajo:

   1. NUNCA SE CULPA A QUIEN PREGUNTA. Casi todos estos fallos son de
      configuración —el encargo no existe en el Worker desplegado, el
      dominio no está en la lista, el proveedor no contestó—. De ésos
      la lectora no tiene ni idea ni culpa, así que la frase dice «no
      puedo», nunca «no se puede» y mucho menos «no está permitido».

   2. NUNCA SE PONE TÉCNICA. Ni Worker, ni dominio, ni encargo, ni
      HTTP. El motivo de verdad va a la consola, que es donde mira
      quien puede arreglarlo.

   Es el mismo fallo que «Failed to fetch», que arreglé para UN código
   creyendo que era un caso suelto. No lo era: era toda la familia. */

const FALLOS = {
  /* Se cae la conexión. Ni de ella ni nuestro, y se arregla solo.
     Solo sale cuando el navegador CONFIRMA que no hay red: si no lo
     confirma, el fallo es nuestro y se dice como tal —achacarle a su
     conexión una caída del Worker la manda a reiniciar el router. */
  'sin-red': 'Parece que te quedaste sin internet. Aquí te espero.',
  'sin-respuesta': 'No conseguí contestarte, y tu conexión está bien. '
    + 'Es cosa mía — prueba en un rato.',
  'fallo-interno': 'Me atasqué por dentro. No es por lo que preguntaste; '
    + 'inténtalo en un rato.',

  /* Transitorio de verdad: vuelve a intentarlo y suele salir. */
  proveedor: 'Me quedé sin palabras un momento. ¿Lo intentamos otra vez?',
  'respuesta-ilegible': 'Me hice un lío al contestarte. Pregúntamelo otra vez.',

  /* Accionables por ella, dichos sin regañar. */
  'sin-sesion': 'Se cerró tu sesión. Entra otra vez y seguimos donde estábamos.',
  'limite-diario': 'Por hoy ya charlamos bastante. Mañana te contesto otra vez — '
    + 'y mientras, seguimos leyendo.',
  'presupuesto-agotado': 'Este mes ya no me quedan palabras para conversar, pero aquí '
    + 'sigo mientras lees. Volvemos el mes que viene.',

  /* Y el que abrió todo esto: le pediste algo que no es de libros.
     No es un rechazo, es un cambio de tema — y por eso es la misma
     frase que dice cuando se queda en blanco. */
  'fuera-de-tema': 'De eso no sé nada, pero de libros te cuento lo que quieras.',
};

/* Todo lo demás —el encargo que no existe en el Worker, el dominio sin
   autorizar, el JSON mal formado, el método equivocado— es la app rota,
   no una pregunta mala. Se dicen igual porque para quien lee son la
   misma cosa: hoy no se puede, y no por su culpa. */
const FALLO_NUESTRO = 'Ahora mismo no consigo contestarte, y no es por lo que '
  + 'preguntaste: es cosa mía. Inténtalo en un rato.';

/**
 * Lo que dice cuando el asistente no contestó.
 *
 * @param {string} codigo  el del Worker (`err.codigo`), no su mensaje
 */
export const fraseDeFallo = (codigo) => FALLOS[codigo] || FALLO_NUESTRO;

/* ── EL AVISO DEL DÍA  ·  historias #95 y #69 ────────────────
   «Haz que la mascota pregunte también por notificación.»

   Las dos preguntas de la #45 solo llegan al abrir la app — y quien
   lleva cinco días sin leer es justamente quien no la abre. Sin esto,
   la pregunta le llega a todo el mundo menos a quien iba dirigida.

   ESTA FUNCIÓN ES LA CABEZA DEL AVISO, y vive aquí por un motivo
   concreto: `pet-core.js` no toca DOM ni Firebase, así que el cron que
   manda las notificaciones puede IMPORTAR ESTE MISMO MÓDULO y decir
   exactamente la misma frase que verías en el inicio. Una sola voz en
   los dos sitios. Un segundo juego de frases en el servidor se
   desincroniza del primero en la segunda semana — es como esto sale
   mal siempre.

   Y AQUÍ LA REGLA DEL MÓDULO PESA EL DOBLE. Una frase floja en una
   pantalla que abriste tú se perdona; la misma entrando sola en el
   teléfono se lee mucho más dura. Por eso el aviso NO se manda casi
   nunca — y las cuatro condiciones de abajo son casi todas para
   callarse, no para hablar. */

/** Fuera de esta franja no se avisa, pase lo que pase. */
export const FRANJA_AVISO = { desde: 10, hasta: 21 };

/**
 * ¿Hay algo que avisar hoy, y qué?
 *
 * @param {object} estado     el de `estadoMascota`
 * @param {object} ctx
 *   `nombre`  cómo se llama ella — es quien firma el aviso
 *   `hora`    la hora local de quien lee, 0-23
 *   `ultimoAviso` fecha local del último aviso, «2026-09-07»
 *   `hoy`     la fecha local de hoy, mismo formato
 *   `ahora`   para que la frase sea la misma que la del inicio
 * @returns {{titulo: string, cuerpo: string, libroId: string}|null}
 */
export function avisoDelDia(estado, {
  nombre = '', hora = 12, ultimoAviso = '', hoy = '', ahora = Date.now(),
} = {}) {
  /* 1 · SOLO SI HAY UNA PREGUNTA DE VERDAD. Los otros ánimos son
     conversación de pantalla: «tu biblioteca está tranquila» no
     justifica encender el teléfono de nadie. Celebrar tampoco — para
     cuando el aviso llegue, ya lo has celebrado tú. */
  if (estado.mood !== 'preguntando' && estado.mood !== 'rescatando') return null;

  /* 2 · UNA AL DÍA COMO MUCHO, y por día del calendario de quien lee,
     no por 24 horas: lo que se promete es «hoy no te molesto más». */
  if (ultimoAviso && ultimoAviso === hoy) return null;

  /* 3 · NI DE NOCHE NI DE MADRUGADA. Una app de leer que suena a las
     siete de la mañana es una alarma, y a las once de la noche es peor
     todavía: la mitad de las lectoras de esta app se están durmiendo. */
  if (hora < FRANJA_AVISO.desde || hora >= FRANJA_AVISO.hasta) return null;

  /* 4 · Y LO FIRMA ELLA. El título es su nombre porque eso es lo que se
     lee en la pantalla bloqueada: «Cleo» y una pregunta se abre; «Mi
     Biblioteca» y una pregunta se descarta. La diferencia entre un
     mensaje de alguien y un aviso de una app está entera ahí. */
  return {
    titulo: nombre || 'Tu mascota',
    cuerpo: fraseMascota(estado, { ahora, nombre }),
    libroId: estado.libro?.id || '',
  };
}
