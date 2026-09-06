/* ─────────────────────────────────────────────────────────────
   DÓNDE VIVES, SIN DECIR DÓNDE VIVES  ·  historia #81

   Esta es la parte del intercambio donde más fácil es hacer daño, así
   que la decisión está tomada de antemano y es dura: NUNCA SE PIDE NI
   SE GUARDA LA DIRECCIÓN EXACTA. Ni «por si acaso», ni «solo para
   calcular la distancia», ni escondida en un campo que no se enseña.
   Lo que no está guardado no se puede filtrar.

   Si alguien autoriza su ubicación, se usa para PROPONER su ciudad y
   se tira: de las coordenadas solo sobrevive un geohash recortado a
   unos 600 metros, que sirve para ordenar por cercanía y no sirve para
   ir a buscar a nadie.

   Y el país y la ciudad son TEXTO LIBRE, sin lista cerrada. Una lista
   de países siempre deja fuera a alguien, y quien se queda fuera no
   puede usar la función.
   ───────────────────────────────────────────────────────────── */

import { sinTildes, unSoloEspacio } from './text-core.js';

/* ── GEOHASH ─────────────────────────────────────────────────
   Un geohash es la posición metida en una cadena: cuantas más letras,
   más fina. Se corta a 6 —una celda de algo más de un kilómetro de
   ancho— porque con eso se puede decir «está cerca» y no se puede
   decir «está aquí». */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
export const PRECISION = 6;

export function geohash(lat, lon, precision = PRECISION) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  let latMin = -90; let latMax = 90;
  let lonMin = -180; let lonMax = 180;
  let hash = '';
  let bits = 0;
  let bit = 0;
  let esLon = true;

  while (hash.length < precision) {
    if (esLon) {
      const medio = (lonMin + lonMax) / 2;
      if (lon >= medio) { bits = (bits << 1) + 1; lonMin = medio; }
      else { bits <<= 1; lonMax = medio; }
    } else {
      const medio = (latMin + latMax) / 2;
      if (lat >= medio) { bits = (bits << 1) + 1; latMin = medio; }
      else { bits <<= 1; latMax = medio; }
    }
    esLon = !esLon;
    if (++bit === 5) { hash += BASE32[bits]; bits = 0; bit = 0; }
  }
  return hash;
}

/**
 * ¿Están cerca? Se mide en letras de geohash compartidas.
 *
 * No da kilómetros a propósito: dar una distancia exacta permite
 * triangular la posición de alguien pidiéndola desde tres sitios. Da
 * un escalón, que es lo que hace falta para ordenar una lista.
 */
export const CERCANIA = [
  { letras: 6, texto: 'A un paseo' },
  { letras: 5, texto: 'Cerca' },
  { letras: 4, texto: 'En tu zona' },
  { letras: 3, texto: 'En tu ciudad' },
  { letras: 0, texto: 'Lejos' },
];

export function letrasComunes(a, b) {
  const x = String(a ?? ''); const y = String(b ?? '');
  let n = 0;
  while (n < x.length && n < y.length && x[n] === y[n]) n++;
  return n;
}

export function cercania(mio, suyo) {
  if (!mio || !suyo) return null;
  const n = letrasComunes(mio, suyo);
  return CERCANIA.find((c) => n >= c.letras) || CERCANIA[CERCANIA.length - 1];
}

/* ── PAÍS Y CIUDAD ───────────────────────────────────────────── */

/**
 * La forma normalizada de un nombre de sitio.
 *
 * «Bogotá», «bogota» y «Bogota D.C.» tienen que ser el mismo lugar, o
 * la gente no se encuentra. Se quitan tildes, se baja a minúsculas y
 * se sueltan los apellidos administrativos que la gente escribe o no
 * según el día.
 */
/* Nombres que la gente escribe de formas que no se parecen entre sí.
   Sin esto, quien pone «CDMX» no encuentra a quien puso «Ciudad de
   México», que es exactamente el fallo que esta normalización existe
   para evitar. */
const ALIAS = {
  cdmx: 'mexico',
  df: 'mexico',
  baires: 'buenos aires',
  bsas: 'buenos aires',
  nyc: 'new york',
};

const COLAS = [
  'd c', 'dc', 'distrito capital', 'capital federal', 'cdmx',
  'ciudad de', 'ciudad', 'municipio de', 'municipio', 'provincia de', 'provincia',
];

export function normalizarLugar(v) {
  /* La eñe sobrevive al barrido de tildes — eso vive en text-core,
     porque este mismo fallo ya se escribió dos veces en este repo y
     «La Coruña» acababa siendo «La Coruna». */
  let s = unSoloEspacio(sinTildes(v).replace(/[^a-z0-9ñ\s]/g, ' '));
  /* Las colas se quitan una vez y por los dos lados: «Ciudad de México»
     y «México» son el mismo sitio, y «Bogotá D.C.» y «Bogotá» también. */
  for (const cola of COLAS) {
    if (s.startsWith(`${cola} `)) s = s.slice(cola.length + 1);
    if (s.endsWith(` ${cola}`)) s = s.slice(0, -cola.length - 1);
  }
  s = s.trim();
  return ALIAS[s] || s;
}

export const mismoLugar = (a, b) => Boolean(normalizarLugar(a)) && normalizarLugar(a) === normalizarLugar(b);

const limpio = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * El sitio que se guarda.
 *
 * Devuelve null si no hay ciudad: sin ciudad no se aparece en el
 * intercambio, y eso es una opción válida y no un error.
 *
 * Fíjate en lo que NO tiene: ni lat, ni lon, ni dirección, ni código
 * postal. El geohash entra ya recortado y no se puede afinar después.
 */
export function placeDoc({ country = '', city = '', area = '', lat = null, lon = null } = {}) {
  const ciudad = limpio(city, 60);
  if (!ciudad) return null;
  const hash = (Number.isFinite(lat) && Number.isFinite(lon)) ? geohash(lat, lon) : null;
  return {
    country: limpio(country, 60),
    city: ciudad,
    cityKey: normalizarLugar(ciudad),
    countryKey: normalizarLugar(country),
    area: limpio(area, 60),
    geohash: hash,
  };
}

export const PLACE_FIELDS = ['country', 'city', 'cityKey', 'countryKey', 'area', 'geohash'];

/** Cómo se lee un sitio en pantalla. La zona solo si la puso. */
export function placeTexto(p = {}) {
  const partes = [p.area, p.city, p.country].map((x) => String(x ?? '').trim()).filter(Boolean);
  return partes.join(' · ');
}

export const tieneCiudad = (p) => Boolean(p && String(p.city ?? '').trim());

/** Lo que se le dice a quien no ha puesto ciudad. */
export const SIN_CIUDAD =
  'Para intercambiar hace falta decir en qué ciudad estás. No se pide la '
  + 'dirección, ni se guarda: solo la ciudad, y la zona si quieres.';

/** Lo que se le promete a quien sí la pone. Conviene que esté escrito. */
export const PROMESA =
  'Nunca se guarda tu dirección. Quien vea tus libros verá tu ciudad y, '
  + 'como mucho, si estás cerca — nunca dónde vives.';
