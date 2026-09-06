/* ─────────────────────────────────────────────────────────────
   MODERACIÓN · la parte que se puede probar  ·  historia #51

   La guía 1.2 de la App Store lo hace OBLIGATORIO desde el momento en
   que hay contenido escrito por usuarias: filtro, reportar, bloquear,
   soporte y condiciones. Sin esto la app se rechaza — no es una mejora
   para más adelante.

   Y la historia dice algo que conviene tomarse en serio: construirlo
   JUNTO con los comentarios, no después. La moderación añadida al
   final siempre queda coja, porque para entonces ya hay sitios donde
   se escribe que nadie recuerda proteger.

   SOBRE EL FILTRO DE PALABRAS, CON HONESTIDAD. Un filtro que se salta
   con un acento o un asterisco no filtra nada, así que aquí el texto
   se normaliza antes de mirarlo: se le quitan tildes, se deshacen las
   sustituciones de números por letras y se juntan las letras repetidas.
   Pero un filtro DEMASIADO duro también falla, y falla peor: dejar a
   alguien sin poder decir «me pareció una mierda de libro» convierte
   la moderación en censura y la gente se va. Por eso la lista es corta
   y busca insultos DIRIGIDOS a personas, no palabrotas.
   ───────────────────────────────────────────────────────────── */

import { sinTildes } from './text-core.js';

/* ── NORMALIZAR ──────────────────────────────────────────────── */

const SUSTITUCIONES = {
  0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', $: 's', '@': 'a',
};

/**
 * El texto tal y como hay que mirarlo para decidir.
 *
 * Nunca se guarda así: esto es solo para comparar. Lo que se publica
 * es lo que escribió la persona, con sus tildes y sus mayúsculas.
 *
 * La eñe sobrevive al barrido de tildes, y eso vive en text-core
 * porque el mismo fallo se escribió DOS VECES en este repo: aquí
 * convertía «año» en «ano», y en los nombres de ciudad convertía «La
 * Coruña» en «La Coruna».
 */
export function normalizar(texto) {
  return sinTildes(texto)
  .replace(/[0-9$@]/g, (c) => SUSTITUCIONES[c] ?? c)  // g4t0 → gato
    .replace(/[^a-z\sñ]/g, '')                          // fuera puntuación y asteriscos
    /* A UNA letra, no a dos: «idiotaaaaa» tiene que quedar en «idiota»
       para que la lista lo reconozca. Las repeticiones de solo dos se
       dejan en paz, porque «perro» no es «pero». */
    .replace(/(.)\1{2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Insultos DIRIGIDOS A PERSONAS, que es lo que rompe una conversación.
 *
 * A propósito NO están las palabrotas sueltas: «me pareció una mierda
 * de libro» es una opinión sobre un libro y tiene que poder decirse.
 * Lo que no puede decirse es llamárselo a alguien.
 */
const INSULTOS = [
  'idiota', 'imbecil', 'estupida', 'estupido', 'gilipollas', 'subnormal',
  'retrasada', 'retrasado', 'puta', 'puto', 'zorra', 'perra', 'maricon',
  'marica', 'negrata', 'sudaca', 'cerda', 'cerdo', 'basura humana',
  'muerete', 'matate', 'ojala te mueras', 'malparida', 'malparido',
  'hijueputa', 'hijaeputa', 'gonorrea', 'pendeja', 'pendejo',
];

/* Palabras que contienen un insulto sin serlo. Sin esto, «Marica» —que
   es un pueblo y un apellido— o «putamen» quedarían censurados, y una
   moderación que se equivoca así se nota más que la que no está. */
const EXCEPCIONES = [
  'putamen', 'diputada', 'diputado', 'reputacion', 'computadora',
  'perracal', 'marical',
];

/**
 * ¿Hay un insulto dirigido a alguien?
 *
 * Se busca por PALABRA COMPLETA, no por trozo: «disputa» contiene
 * «puta» y no es un insulto. Ese es el fallo clásico de estos filtros
 * y el que más gente inocente pilla.
 */
export function tieneInsulto(texto) {
  const n = normalizar(texto);
  if (!n) return null;
  if (EXCEPCIONES.some((e) => n.includes(e))) {
    /* Puede haber un insulto de verdad además de la excepción, así que
       se sigue mirando, pero quitando antes la palabra inocente. */
    let limpio = n;
    for (const e of EXCEPCIONES) limpio = limpio.split(e).join(' ');
    return buscar(limpio);
  }
  return buscar(n);
}

function buscar(n) {
  const palabras = new Set(n.split(' '));
  for (const mala of INSULTOS) {
    if (mala.includes(' ')) { if (n.includes(mala)) return mala; }
    else if (palabras.has(mala)) return mala;
  }
  return null;
}

/** El mensaje que ve quien lo escribió. Explica, no regaña. */
export const MENSAJE_FILTRO =
  'Ese comentario lleva un insulto. Puedes decir que un libro no te gustó '
  + 'todo lo que quieras; a las personas, no.';

/* ── REPORTAR ────────────────────────────────────────────────── */

export const MOTIVOS = [
  { id: 'acoso', label: 'Acoso o insultos' },
  { id: 'spam', label: 'Spam o publicidad' },
  { id: 'odio', label: 'Discurso de odio' },
  { id: 'sexual', label: 'Contenido sexual' },
  { id: 'suplantacion', label: 'Se hace pasar por otra persona' },
  { id: 'estafa', label: 'Estafa o engaño' },
  { id: 'otro', label: 'Otra cosa' },
];

export const TIPOS_REPORTABLES = ['perfil', 'comentario', 'resena', 'intercambio'];

/**
 * El parte que llega a la cola de revisión.
 *
 * Lleva una COPIA del texto reportado, y eso es a propósito: si solo
 * llevara el identificador, bastaría con borrar el comentario para que
 * el reporte se quedara sin pruebas y quien acosa saliera limpio.
 */
export function reportDoc({
  de, sobre, tipo, motivo, detalle = '', copia = '', at = Date.now(),
} = {}) {
  if (!de || !sobre || !TIPOS_REPORTABLES.includes(tipo)) return null;
  if (!MOTIVOS.some((m) => m.id === motivo)) return null;
  return {
    de,
    sobre,
    tipo,
    motivo,
    detalle: String(detalle ?? '').replace(/\s+/g, ' ').trim().slice(0, 500),
    copia: String(copia ?? '').slice(0, 1000),
    estado: 'pendiente',
    at,
  };
}

export const REPORT_FIELDS = ['de', 'sobre', 'tipo', 'motivo', 'detalle', 'copia', 'estado', 'at'];

/* ── BLOQUEAR Y SILENCIAR ────────────────────────────────────── */

export const blockId = (quien, aQuien) => `${quien}_${aQuien}`;
export const muteId = (quien, aQuien) => `${quien}_${aQuien}`;

export const puedeBloquear = (yo, otra) => Boolean(yo && otra && yo !== otra);

export function blockDoc({ de, a, at = Date.now() } = {}) {
  if (!puedeBloquear(de, a)) return null;
  return { de, a, at };
}

/**
 * Bloquear rompe el seguimiento EN LAS DOS DIRECCIONES.
 *
 * Lo pide la historia #46 y la #51, y es lo único coherente: si te
 * bloqueo, no quiero verte y no quiero que me veas. Dejar una de las
 * dos flechas en pie haría que siguieras apareciendo en el feed de la
 * otra persona, que es exactamente lo que se quería evitar.
 */
export const flechasARomper = (yo, otra) => [blockId(yo, otra), blockId(otra, yo)];

/**
 * La diferencia entre bloquear y silenciar, dicha para la pantalla.
 *
 * No es un detalle: mucha gente quiere dejar de ver a alguien sin el
 * gesto de bloquearla —una conocida, una compañera de trabajo—, y si
 * la única opción es bloquear, no hace nada y aguanta.
 */
export const EXPLICACION = {
  bloquear: 'No os veréis. Deja de seguirte y dejas de seguirla, y no podrá '
    + 'escribirte ni encontrar tu perfil.',
  silenciar: 'Dejas de ver lo suyo. Ella no se entera de nada y seguís '
    + 'siguiéndoos igual.',
};

/** Quitar de una lista lo de quien bloqueaste o silenciaste. */
export function filtrarFuera(items = [], { bloqueados = [], silenciados = [] } = {}) {
  const fuera = new Set([...bloqueados, ...silenciados]);
  return items.filter((i) => !fuera.has(i?.uid));
}

/* ── EL SOPORTE  ·  requisito de la guía 1.2 ─────────────────── */

export const SOPORTE = {
  correo: 'soporte@mibiblioteca.app',
  asunto: 'Ayuda con Mi Biblioteca',
};

export const mailtoSoporte = (cuerpo = '') =>
  `mailto:${SOPORTE.correo}?subject=${encodeURIComponent(SOPORTE.asunto)}`
  + (cuerpo ? `&body=${encodeURIComponent(cuerpo)}` : '');
