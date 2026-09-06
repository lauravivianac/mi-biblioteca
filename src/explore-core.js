/* ─────────────────────────────────────────────────────────────
   EXPLORAR LO QUE HAY CERCA  ·  historia #83

   La nota de la historia manda aquí: «que la app resalte los
   disponibles que ya están en mis pendientes es lo que convierte una
   lista de libros ajenos en algo personal. Es la diferencia entre un
   tablón de anuncios y una función útil».

   Así que esto no es un buscador con filtros; es un buscador con
   filtros QUE SABE QUÉ QUIERO LEER. Lo primero que hace con cada
   publicación es mirar si ese libro está en mi pila, y lo segundo es
   subirlo arriba.

   NUNCA APARECE DÓNDE VIVE NADIE. Lo más que se dice es un escalón de
   cercanía («Cerca», «En tu zona»), calculado con el geohash recortado
   que guarda place-core. Allí está explicado por qué no se dan
   kilómetros: una distancia exacta permite triangular la posición de
   alguien preguntándola desde tres sitios.
   ───────────────────────────────────────────────────────────── */

import { sinTildes, unSoloEspacio } from './text-core.js';
import { cercania, letrasComunes, CERCANIA } from './place-core.js';

/* ── HASTA DÓNDE MIRO ────────────────────────────────────────── */

/**
 * Los tres ámbitos, en orden de apertura.
 *
 * «Todo el país» y «cualquier sitio» existen porque la historia los
 * pide, y porque sin ellos la función no arranca: en una ciudad
 * pequeña la lista está vacía mucho tiempo, y una app que solo
 * funciona en Madrid no funciona. Un libro a dos provincias sigue
 * siendo un libro que alguien te puede mandar.
 */
export const AMBITOS = [
  { id: 'ciudad', label: 'Mi ciudad', siguiente: 'pais' },
  { id: 'pais', label: 'Todo el país', siguiente: 'todo' },
  { id: 'todo', label: 'En cualquier sitio', siguiente: null },
];

export const esAmbito = (id) => AMBITOS.some((a) => a.id === id);
export const ambitoSiguiente = (id) => AMBITOS.find((a) => a.id === id)?.siguiente || null;
export const ambitoLabel = (id) => AMBITOS.find((a) => a.id === id)?.label || '';

/* ── QUÉ DE ESTO YA ME IMPORTABA ─────────────────────────────── */

/**
 * La clave con la que se reconoce un libro entre dos bibliotecas.
 *
 * No vale el identificador: los libros del catálogo lo comparten, pero
 * los que alguien añade a mano llevan uno propio de su cuenta, así que
 * «Rayuela» añadido por ti y «Rayuela» añadido por otra son dos
 * identificadores distintos y el mismo libro. Se comparan el título y
 * el autor normalizados, que es lo que de verdad los iguala.
 */
export const claveLibro = (title, author = '') =>
  `${unSoloEspacio(sinTildes(title))}|${unSoloEspacio(sinTildes(author))}`;

/**
 * El índice de mi biblioteca, para mirar cada publicación una vez.
 *
 * Se guardan las dos claves —el identificador y el título+autor—
 * porque cualquiera de las dos puede acertar y ninguna acierta siempre.
 */
export function indiceDeMisLibros(libros = []) {
  const porId = new Map();
  const porClave = new Map();
  for (const b of libros) {
    if (!b) continue;
    const est = b.status || 'pending';
    if (b.id) porId.set(String(b.id), est);
    if (b.title) porClave.set(claveLibro(b.title, b.author), est);
  }
  return { porId, porClave };
}

const VACIO = { porId: new Map(), porClave: new Map() };

/**
 * ¿Qué es este libro para mí? Devuelve mi estado con él, o null.
 *
 * `pending` es la respuesta que le da sentido a toda la pantalla: un
 * libro que dije que quería leer y que alguien tiene aquí al lado.
 */
export function miEstadoCon(pub = {}, indice = VACIO) {
  if (!pub) return null;
  const porId = indice.porId?.get(String(pub.bookId));
  if (porId) return porId;
  return indice.porClave?.get(claveLibro(pub.title, pub.author)) || null;
}

/** Cómo se lee esa marca. Solo se enseña cuando dice algo. */
export const MARCAS = {
  pending: { texto: 'Lo tienes pendiente', clase: 'quiero' },
  reading: { texto: 'Lo estás leyendo', clase: 'leyendo' },
  read: { texto: 'Ya lo leíste', clase: 'leido' },
};

export const marcaDe = (estado) => MARCAS[estado] || null;

/* ── LA CERCANÍA, EN ESCALONES ───────────────────────────────── */

/**
 * A qué distancia está, sin decir dónde está.
 *
 * Si no hay geohash por alguna de las dos partes —nadie está obligado
 * a dar su ubicación— se cae a la ciudad, que es lo único seguro que
 * hay. «En tu ciudad» ya basta para decidir si vale la pena escribir.
 */
export function distanciaTexto(pub = {}, mio = null, miCityKey = '') {
  const c = cercania(mio, pub.geohash);
  if (c && c.letras > 0) return c.texto;
  if (miCityKey && pub.cityKey && miCityKey === pub.cityKey) return 'En tu ciudad';
  return pub.city ? `En ${pub.city}` : 'Lejos';
}

/** Para ordenar: cuantas más letras de geohash compartidas, más cerca. */
export function puntosDeCercania(pub = {}, mio = null, miCityKey = '') {
  const letras = mio && pub.geohash ? letrasComunes(mio, pub.geohash) : 0;
  if (letras > 0) return letras;
  return miCityKey && pub.cityKey === miCityKey ? 1 : 0;
}

/** Los escalones que se ofrecen como filtro, de más cerca a más lejos. */
export const ESCALONES = CERCANIA.filter((c) => c.letras > 0);

/* ── FILTRAR Y BUSCAR ────────────────────────────────────────── */

const norm = (v) => unSoloEspacio(sinTildes(v));
const contiene = (campo, aguja) => norm(campo).includes(aguja);

/**
 * Filtrar la lista.
 *
 * La búsqueda por texto mira título Y autor a la vez: quien escribe
 * «Cortázar» en un buscador de títulos está buscando a Cortázar, y
 * obligarle a cambiar de campo para encontrarlo es hacerle trabajo.
 */
export function filtrar(lista = [], {
  texto = '', genero = '', autor = '', estado = '',
  minimoCercania = 0, soloMiLista = false, indice = null, mio = null, miCityKey = '',
} = {}) {
  const aguja = norm(texto);
  const gen = norm(genero);
  const aut = norm(autor);
  const idx = indice || VACIO;

  return lista.filter((p) => {
    if (!p) return false;
    if (aguja && !contiene(p.title, aguja) && !contiene(p.author, aguja)) return false;
    if (gen && norm(p.genre) !== gen) return false;
    if (aut && norm(p.author) !== aut) return false;
    if (estado && p.estado !== estado) return false;
    if (minimoCercania > 0 && puntosDeCercania(p, mio, miCityKey) < minimoCercania) return false;
    if (soloMiLista && !miEstadoCon(p, idx)) return false;
    return true;
  });
}

/**
 * Ordenar.
 *
 * Primero lo que ya querías leer, y dentro de eso lo más cerca. Es la
 * nota de la historia hecha orden de lista: si tienes «Pedro Páramo»
 * pendiente y alguien de tu barrio lo tiene, eso va arriba del todo.
 *
 * Lo que ya leíste va al final, no fuera: puede interesarte para
 * regalarlo o releerlo, pero no es lo que vienes a buscar.
 */
export function ordenar(lista = [], { indice = null, mio = null, miCityKey = '' } = {}) {
  const idx = indice || VACIO;
  const peso = (p) => {
    const est = miEstadoCon(p, idx);
    if (est === 'pending') return 3;
    if (est === 'reading') return 2;
    if (est === 'read') return 0;
    return 1;
  };
  return [...lista].sort((a, b) =>
    peso(b) - peso(a)
    || puntosDeCercania(b, mio, miCityKey) - puntosDeCercania(a, mio, miCityKey)
    || (b.at || 0) - (a.at || 0));
}

/** Las opciones de los desplegables salen de lo que hay, no de una lista fija. */
export function opcionesDe(lista = []) {
  const cuenta = (campo) => {
    const m = new Map();
    for (const p of lista) {
      const v = String(p?.[campo] ?? '').trim();
      if (!v) continue;
      m.set(v, (m.get(v) || 0) + 1);
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
      .map(([valor, n]) => ({ valor, n }));
  };
  return { generos: cuenta('genre'), autores: cuenta('author') };
}

/** ¿Hay algún filtro puesto? Decide qué se dice cuando no sale nada. */
export const hayFiltros = (f = {}) => Boolean(
  String(f.texto ?? '').trim() || f.genero || f.autor || f.estado
  || f.minimoCercania > 0 || f.soloMiLista,
);

/* ── LO QUE SE DICE CUANDO NO HAY NADA ───────────────────────── */

/**
 * Una lista vacía tiene que decir POR QUÉ está vacía y qué hacer.
 *
 * «No hay resultados» es la respuesta que hace cerrar la app. Cada caso
 * de aquí sabe por qué no hay nada y qué botón enseñar — que es lo que
 * pide la historia para la ciudad sin nada.
 */
export function vacio({
  ambito = 'ciudad', ciudad = '', conFiltros = false, sinCiudad = false,
} = {}) {
  if (sinCiudad) {
    return {
      rune: '📍',
      texto: 'Todavía no has dicho en qué ciudad estás',
      detalle: 'Sin ciudad puedes mirar lo que hay en cualquier sitio, pero no'
        + ' se puede ordenar por cercanía ni ofrecer libros tuyos. Solo la'
        + ' ciudad: la dirección no se pide nunca.',
      accion: 'ciudad',
      accionTexto: 'Decir mi ciudad',
    };
  }
  if (conFiltros) {
    return {
      rune: '🔍',
      texto: 'Nada con esos filtros',
      detalle: 'Prueba a quitar alguno.',
      accion: 'limpiar',
      accionTexto: 'Quitar los filtros',
    };
  }
  const siguiente = ambitoSiguiente(ambito);
  return {
    rune: '📦',
    texto: ambito === 'ciudad' && ciudad
      ? `Nadie ofrece libros en ${ciudad} todavía`
      : 'Todavía no hay libros disponibles aquí',
    detalle: siguiente
      ? 'Es una función nueva y se llena poco a poco. Puedes mirar más lejos,'
        + ' o ser la primera en ofrecer algo.'
      : 'Sé la primera en ofrecer algo: desde la ficha de cualquier libro que'
        + ' hayas leído.',
    accion: siguiente ? 'ampliar' : 'ofrecer',
    accionTexto: siguiente
      ? `Mirar en ${ambitoLabel(siguiente).toLowerCase()}`
      : 'Ofrecer un libro mío',
    siguiente,
  };
}

/** Lo que se promete arriba de la lista, para que no haya dudas. */
export const PROMESA_EXPLORAR =
  'De cada persona ves su ciudad y si está cerca. Nunca su dirección: no está guardada.';
