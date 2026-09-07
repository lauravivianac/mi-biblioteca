/* ─────────────────────────────────────────────────────────────
   TARJETAS PARA COMPARTIR · el núcleo  ·  historias #90–#93

   A la gente le gusta presumir, y presumir de lo que lee es de las
   pocas formas de presumir que no molestan a nadie. Esto es lo que
   convierte la app en algo que se ve fuera de la app.

   Aquí NO se dibuja nada: aquí se decide QUÉ dice cada tarjeta y CÓMO
   se parte el texto. El dibujo va en cardgen.js, que necesita un
   canvas de verdad; esto se prueba en Node.

   EL PROBLEMA DE VERDAD ES EL TEXTO LARGO, y por eso está aquí y con
   pruebas. «El Extraordinario Viaje del Faquir que se Quedó Atrapado
   en un Armario de Ikea» es un título real, y una tarjeta que lo corta
   a la mitad o lo desborda por el lado no se comparte: se borra. La
   partida y el encogido son la mitad de esta historia, no un detalle.

   `medir` se recibe de fuera —el canvas mide de verdad, las pruebas
   miden a lo bruto— para que este archivo no dependa del navegador.
   ───────────────────────────────────────────────────────────── */

export const ANCHO = 1080;
export const ALTO = 1920;

/**
 * Parte un texto en líneas que quepan.
 *
 * Parte por PALABRAS. Una palabra sola más ancha que la caja —una URL,
 * un título alemán— se deja entera y sobresaldría, así que para eso
 * está `fitText`, que encoge la letra hasta que quepa. Cortar una
 * palabra por la mitad se lee peor que una letra más pequeña.
 */
export function wrapLines(texto, maxAncho, medir) {
  const palabras = String(texto ?? '').trim().split(/\s+/).filter(Boolean);
  if (!palabras.length) return [];

  const lineas = [];
  let actual = palabras[0];

  for (const p of palabras.slice(1)) {
    const prueba = `${actual} ${p}`;
    if (medir(prueba) <= maxAncho) actual = prueba;
    else { lineas.push(actual); actual = p; }
  }
  lineas.push(actual);
  return lineas;
}

/**
 * El tamaño de letra más grande con el que el texto cabe en la caja.
 *
 * Baja de dos en dos hasta que entra en el ancho Y en el número de
 * líneas. Si ni al mínimo cabe, se recorta con puntos suspensivos —
 * pero eso pasa con títulos absurdos, no con los normales, y es
 * preferible a una tarjeta rota.
 */
export function fitText(texto, {
  maxAncho, maxLineas = 3, desde = 96, hasta = 44, paso = 4, medir,
}) {
  for (let size = desde; size >= hasta; size -= paso) {
    const m = (t) => medir(t, size);
    const lineas = wrapLines(texto, maxAncho, m);
    const cabenTodas = lineas.every((l) => m(l) <= maxAncho);
    if (lineas.length <= maxLineas && cabenTodas) return { size, lineas, recortado: false };
  }

  /* Ni al mínimo. Se recorta con «…», que es honesto: se ve que hay
     más, en vez de fingir que el título acaba ahí.

     Ojo con el caso que se olvida: UNA SOLA PALABRA más ancha que la
     caja. Ahí no hay nada que partir —wrapLines devuelve una línea— y
     si solo se recortara cuando sobran líneas, esa palabra se saldría
     de la tarjeta por el lado. Un título alemán, una URL o un título
     sin espacios bastan para provocarlo. Por eso se mira si la última
     línea CABE, y no cuántas líneas hay. */
  const m = (t) => medir(t, hasta);
  const todas = wrapLines(texto, maxAncho, m);
  const lineas = todas.slice(0, maxLineas);
  const sobranLineas = todas.length > maxLineas;
  const ultimaNoCabe = lineas.length > 0 && m(lineas[lineas.length - 1]) > maxAncho;

  if (lineas.length && (sobranLineas || ultimaNoCabe)) {
    let ultima = lineas[lineas.length - 1];
    while (ultima.length > 1 && m(`${ultima}…`) > maxAncho) ultima = ultima.slice(0, -1);
    lineas[lineas.length - 1] = `${ultima.trimEnd()}…`;
  }
  return { size: hasta, lineas, recortado: true };
}

/* ── QUÉ DICE CADA TARJETA ───────────────────────────────────── */

/**
 * El contenido de una tarjeta, según lo que se comparte.
 *
 * Cuatro tipos, que son los cuatro momentos en que de verdad apetece
 * enseñar algo: terminar un libro (#91), una frase que te paró en
 * seco (#91), el año entero (#92) y un logro (#92).
 */
export function cardContent(tipo, datos = {}) {
  const handle = datos.username ? `@${datos.username}` : '';

  switch (tipo) {
    case 'libro':
      return {
        tipo,
        kicker: datos.rating ? '★'.repeat(datos.rating) : 'Terminado',
        titulo: datos.title || '',
        subtitulo: datos.author || '',
        cuerpo: datos.review || '',
        pie: handle,
        portada: datos.cover || null,
      };

    case 'cita':
      return {
        tipo,
        kicker: '❝',
        titulo: datos.text || '',
        subtitulo: [datos.bookTitle, datos.bookAuthor].filter(Boolean).join(' · '),
        cuerpo: datos.page ? `pág. ${datos.page}` : '',
        pie: handle,
        portada: datos.cover || null,
      };

    case 'anio':
      return {
        tipo,
        kicker: datos.enCurso ? `En lo que va de ${datos.anio}` : `${datos.anio} en libros`,
        titulo: String(datos.leidos ?? 0),
        subtitulo: (datos.leidos === 1 ? 'libro' : 'libros'),
        cuerpo: [
          datos.paginas ? `${datos.paginas.toLocaleString('es')} páginas` : '',
          datos.generosDistintos ? `${datos.generosDistintos} géneros` : '',
          datos.rachaMasLarga ? `${datos.rachaMasLarga} días seguidos` : '',
        ].filter(Boolean).join('  ·  '),
        pie: handle,
        portada: null,
      };

    case 'logro':
      return {
        tipo,
        kicker: 'Logro conseguido',
        titulo: datos.name || '',
        subtitulo: datos.icon || '✦',
        cuerpo: datos.hint || '',
        pie: handle,
        portada: null,
      };

    default:
      return null;
  }
}

/**
 * El texto que acompaña a la imagen al compartir.
 *
 * Corto y sin hashtags de relleno. Nadie comparte algo que suena a
 * anuncio, y una app que escribe por ti «#amoleer #bookstagram» hace
 * exactamente eso.
 */
export function shareCaption(tipo, datos = {}) {
  switch (tipo) {
    case 'libro':
      return `Terminé «${datos.title}»${datos.author ? `, de ${datos.author}` : ''}.`;
    case 'cita':
      return datos.bookTitle ? `De «${datos.bookTitle}».` : 'Una frase que me paró en seco.';
    case 'anio':
      return datos.enCurso
        ? `${datos.leidos} libros en lo que va de ${datos.anio}.`
        : `Mi ${datos.anio} en libros: ${datos.leidos}.`;
    case 'logro':
      return `Nuevo logro: ${datos.name}.`;
    default:
      return '';
  }
}

/** Cómo se llama el archivo. Con fecha, para que no se pisen en la galería. */
export function cardFilename(tipo, datos = {}, hoy = new Date()) {
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const trozo = String(datos.title || datos.bookTitle || datos.name || tipo)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || tipo;
  return `library-${trozo}-${fecha}.png`;
}

/* ── LA MEDIDA DE MENTIRA, PARA PROBAR ───────────────────────── */

/**
 * Un medidor aproximado para las pruebas: cada carácter ocupa ~0,52
 * del tamaño de letra. No es exacto —ninguna medida sin canvas lo
 * es— pero basta para comprobar que la partida y el encogido hacen lo
 * que dicen, que es lo que se está probando.
 */
export const medidorDePrueba = (texto, size = 64) => String(texto).length * size * 0.52;
