/* ─────────────────────────────────────────────────────────────
   ESCRIBIR SOBRE LO QUE LEO  ·  historias #72, #73 y #74

   EDITOR SIMPLE A PROPÓSITO. La nota de la #72 lo dice: «un editor
   completo trae mil decisiones de formato y ninguna mejora lo que se
   escribe; para notas de lectura, negrita y cita alcanzan». Así que
   hay cuatro marcas y no hay una quinta: negrita, cursiva, cita y
   lista. Se escriben con los signos de siempre y se pintan al leer;
   no hay barra de herramientas que decida por ti.

   POR DEFECTO, PRIVADA (#73). Escribir con libertad exige saber que
   nadie lo está leyendo mientras dudas. Publicar es un gesto aparte y
   siempre reversible.

   Y EL AGENTE ORDENA, NO ESCRIBE (#74). Ver `plantillaDesdeNotas`: lo
   que vuelve del asistente son ÍNDICES a tus propias notas, nunca
   texto nuevo. Así no es que se le pida que no invente: es que no
   puede.
   ───────────────────────────────────────────────────────────── */

const limpio = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const texto = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);

export const MAX_TITULO = 140;
export const MAX_CUERPO = 20000;
export const MAX_LIBROS = 6;

/* ── LOS TIPOS DE ENTRADA  ·  #72 ────────────────────────────── */

export const TIPOS = [
  {
    id: 'nota',
    label: 'Nota de lectura',
    hint: 'Mientras lees, sin pensarlo mucho',
    anclable: true,
  },
  {
    id: 'resena',
    label: 'Reseña',
    hint: 'Lo que piensas del libro, ya terminado',
    anclable: false,
  },
  {
    id: 'lista',
    label: 'Lista temática',
    hint: 'Varios libros alrededor de una idea',
    anclable: false,
  },
];

export const esTipo = (id) => TIPOS.some((t) => t.id === id);
export const tipoLabel = (id) => TIPOS.find((t) => t.id === id)?.label || 'Entrada';
/** Solo las notas se anclan a una página: una reseña no va por página. */
export const seAncla = (tipo) => TIPOS.find((t) => t.id === tipo)?.anclable === true;

/* ── LA VISIBILIDAD  ·  #73 ──────────────────────────────────── */

export const VISIBILIDADES = [
  {
    id: 'privada',
    label: 'Privada',
    icono: '🔒',
    sub: 'Solo tú. Ni siquiera se copia fuera de tu cuenta.',
  },
  {
    id: 'seguidoras',
    label: 'Quienes me siguen',
    icono: '👥',
    sub: 'Las personas que te siguen, y nadie más.',
  },
  {
    id: 'publica',
    label: 'Pública',
    icono: '🌍',
    sub: 'Cualquiera que tenga la app.',
  },
];

export const POR_DEFECTO = 'privada';
export const esVisibilidad = (v) => VISIBILIDADES.some((x) => x.id === v);
export const visibilidadDe = (v) => VISIBILIDADES.find((x) => x.id === v) || VISIBILIDADES[0];

/** Lo privado NO se copia a la colección pública: no existe fuera. */
export const sePublica = (v) => v === 'seguidoras' || v === 'publica';

/** Qué puedo pedirle al servidor sin que me deniegue la consulta entera. */
export function visibilidadesQuePuedoLeer({ soyYo = false, laSigo = false } = {}) {
  if (soyYo) return ['privada', 'seguidoras', 'publica'];
  return laSigo ? ['seguidoras', 'publica'] : ['publica'];
}

/* ── EL DOCUMENTO ────────────────────────────────────────────── */

const libroLigado = (b) => ({
  bookId: String(b?.id ?? ''),
  title: limpio(b?.title, 120),
  author: limpio(b?.author, 80),
  cover: typeof b?.cover === 'string' && b.cover ? b.cover : null,
});

export function postDoc({
  id = null, uid, tipo = 'nota', titulo = '', cuerpo = '',
  libros = [], pagina = null, visibilidad = POR_DEFECTO,
  ayudaDelAgente = false, at = Date.now(), editado = null,
} = {}) {
  if (!uid) return null;
  const cuerpoLimpio = texto(cuerpo, MAX_CUERPO);
  const tituloLimpio = limpio(titulo, MAX_TITULO);
  /* Una entrada sin nada dentro no es un borrador: es un documento
     vacío que luego hay que ir a limpiar. */
  if (!cuerpoLimpio && !tituloLimpio) return null;

  return {
    ...(id ? { id } : {}),
    uid,
    tipo: esTipo(tipo) ? tipo : 'nota',
    titulo: tituloLimpio,
    cuerpo: cuerpoLimpio,
    libros: (Array.isArray(libros) ? libros : []).filter((b) => b?.id).slice(0, MAX_LIBROS).map(libroLigado),
    /* La página solo tiene sentido en una nota, y guardarla en una
       reseña sería guardar un dato que nadie va a poder interpretar. */
    pagina: seAncla(tipo) && Number.isFinite(Number(pagina)) && Number(pagina) > 0
      ? Math.round(Number(pagina)) : null,
    visibilidad: esVisibilidad(visibilidad) ? visibilidad : POR_DEFECTO,
    /* Se marca si el borrador salió de ordenar notas con el asistente
       (#74). Se queda marcado aunque luego se edite: lo honesto es
       decir de dónde salió el esqueleto. */
    ayudaDelAgente: ayudaDelAgente === true,
    at,
    editado: editado || null,
  };
}

export const POST_FIELDS = [
  'uid', 'tipo', 'titulo', 'cuerpo', 'libros', 'pagina', 'visibilidad',
  'ayudaDelAgente', 'at', 'editado',
];

/** Lo que se copia a la colección de lectura, cuando toca. */
export function publicPostDoc(post = {}, { username = '', name = '' } = {}) {
  if (!sePublica(post.visibilidad)) return null;
  return {
    ...postDoc(post),
    username: limpio(username, 20).toLowerCase(),
    name: limpio(name, 60),
  };
}

/* ── EL EDITOR MÍNIMO  ·  cuatro marcas y ni una más ─────────── */

const escapar = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/**
 * De texto a HTML, con cuatro marcas.
 *
 * Se escapa PRIMERO y se marca después, así que nada de lo que
 * escribas puede convertirse en marcado: el texto es un dato.
 *
 * `**negrita**`, `_cursiva_`, `> cita`, `- lista`. Nada más, y esa es
 * la decisión: cada marca nueva es una decisión de formato que hay que
 * tomar mientras escribes, y ninguna mejora lo que escribes.
 */
export function aHtml(cuerpo = '') {
  const lineas = String(cuerpo ?? '').replace(/\r\n/g, '\n').split('\n');
  const salida = [];
  let enLista = false;

  const enLinea = (t) => escapar(t)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])_(.+?)_(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>');

  for (const linea of lineas) {
    const l = linea.trimEnd();

    if (/^\s*[-*]\s+/.test(l)) {
      if (!enLista) { salida.push('<ul>'); enLista = true; }
      salida.push(`<li>${enLinea(l.replace(/^\s*[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (enLista) { salida.push('</ul>'); enLista = false; }

    if (/^\s*>\s?/.test(l)) {
      salida.push(`<blockquote>${enLinea(l.replace(/^\s*>\s?/, ''))}</blockquote>`);
      continue;
    }
    if (!l.trim()) continue;
    salida.push(`<p>${enLinea(l)}</p>`);
  }
  if (enLista) salida.push('</ul>');
  return salida.join('');
}

/** Un adelanto para la lista, sin marcas y sin cortar palabras. */
export function adelanto(cuerpo = '', largo = 140) {
  const plano = String(cuerpo ?? '')
    .replace(/^\s*[->*]\s?/gm, '')
    .replace(/\*\*|_/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plano.length <= largo) return plano;
  const corte = plano.slice(0, largo);
  return `${corte.slice(0, corte.lastIndexOf(' ') || largo)}…`;
}

/** Insertar una cita guardada, con su página si la tiene (#72 · 1.8). */
export function citaComoTexto(cita = {}, libro = null) {
  const t = String(cita.text ?? '').trim();
  if (!t) return '';
  const firma = [libro?.title, cita.page ? `p. ${cita.page}` : null]
    .filter(Boolean).join(', ');
  return `> ${t}${firma ? `\n> — ${firma}` : ''}\n`;
}

/* ── EL BORRADOR AUTOMÁTICO  ·  «perder un texto es imperdonable» */

export const CLAVE_BORRADOR = 'post-borrador';

/**
 * ¿Merece la pena guardar?
 *
 * Guardar en cada tecla escribe cien veces por frase; guardar cada
 * treinta segundos pierde treinta segundos. Se guarda cuando el texto
 * CAMBIÓ de verdad y ha pasado un momento — y siempre al cerrar.
 */
export function tocaGuardar({ actual = '', guardado = '', desde = 0, ahora = Date.now() } = {}) {
  if (actual === guardado) return false;
  return ahora - desde >= 1500;
}

export const hayQueRecuperar = (borrador) =>
  Boolean(borrador && (String(borrador.cuerpo ?? '').trim() || String(borrador.titulo ?? '').trim()));

/* ── ORDENAR LAS NOTAS  ·  historia #74 ──────────────────────── */

/**
 * EL AGENTE DEVUELVE ÍNDICES, NO TEXTO.
 *
 * El límite de la historia es tajante: «ordena y estructura; no
 * escribe la reseña. Si el agente aporta ideas que no estaban en mis
 * notas, deja de ser mi texto».
 *
 * Se podría pedir en el prompt que no invente. Pero un prompt es una
 * súplica, y esto no admite súplicas: lo que vuelve del asistente son
 * los NÚMEROS de tus notas agrupados, y el borrador se arma aquí
 * pegando TU texto. Si se inventa una nota, el índice no existe y se
 * cae; si reescribe una frase, esa frase no llega a ninguna parte.
 *
 * Lo único suyo son los títulos de sección y las propuestas de título,
 * y por eso van marcados.
 */
export function plantillaDesdeNotas({ notas = [], secciones = [] } = {}) {
  const usadas = new Set();
  const partes = [];

  for (const sec of secciones) {
    /* Se comprueba el TIPO antes que el valor: `Number(null)` es 0, así
       que convertir primero colaba un null como la nota número 0 — y
       este es el sitio donde se coloca el texto de verdad. */
    const indices = (Array.isArray(sec?.notas) ? sec.notas : [])
      .filter((n) => typeof n === 'number' && Number.isInteger(n)
                     && n >= 0 && n < notas.length && !usadas.has(n));
    if (!indices.length) continue;

    const titulo = limpio(sec?.titulo, 80);
    if (titulo) partes.push(`**${titulo}**`);
    for (const i of indices) {
      usadas.add(i);
      partes.push(String(notas[i] ?? '').trim());
    }
    partes.push('');
  }

  /* Lo que el asistente no colocó NO se pierde. Perder una nota por no
     saber dónde ponerla sería exactamente el fallo que esto no puede
     tener. */
  const sueltas = notas.map((_, i) => i).filter((i) => !usadas.has(i));
  if (sueltas.length) {
    partes.push('**Sin colocar**');
    for (const i of sueltas) partes.push(String(notas[i] ?? '').trim());
  }

  return partes.join('\n\n').trim();
}

/** Lo que se le enseña a quien pidió ayuda, para que sepa qué es suyo. */
export const AVISO_AGENTE =
  'El asistente ha AGRUPADO tus notas y ha propuesto los títulos. El texto '
  + 'de dentro es tuyo, palabra por palabra: no ha escrito ni una frase.';

/** Se puede pedir por partes, no todo de golpe (#74). */
export const TROZO_NOTAS = 12;
export const porTrozos = (notas = [], tam = TROZO_NOTAS) => {
  const trozos = [];
  for (let i = 0; i < notas.length; i += tam) trozos.push(notas.slice(i, i + tam));
  return trozos;
};

/* ── ORDENAR Y VACÍOS ────────────────────────────────────────── */

export const porFecha = (lista = []) =>
  [...lista].sort((a, b) => (b.editado || b.at || 0) - (a.editado || a.at || 0));

export const VACIO_POSTS = {
  rune: '✍️',
  texto: 'Todavía no has escrito nada',
  detalle: 'Una nota suelta mientras lees ya cuenta. Nadie más la ve si no quieres.',
};
