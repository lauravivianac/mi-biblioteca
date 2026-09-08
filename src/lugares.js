/* ─────────────────────────────────────────────────────────────
   PREGUNTARLE AL MAPA  ·  historia #157

   La parte que toca la red. La lógica —qué se pide, qué se hace con lo
   que vuelve y, sobre todo, POR QUÉ NO SE USA LA POSICIÓN DE LA OTRA
   PERSONA— está en lugares-core.js, que no tiene red y se puede probar.

   Dos servicios de OpenStreetMap, los dos sin clave:

     · Nominatim, que convierte «Bogotá, Colombia» en un punto;
     · Overpass, que da lo que hay alrededor de ese punto.

   NINGUNO PIDE CLAVE, y eso no es una casualidad afortunada sino el
   motivo de haberlos elegido: esta app son ficheros estáticos servidos
   tal cual, así que una clave puesta aquí se lee con F12. Google Places
   da mejores datos y no se puede usar sin regalar la clave o sin montar
   un servidor por medio.

   ── SER BUEN VECINO ─────────────────────────────────────────

   Son servicios gratuitos que mantiene una fundación con donaciones, y
   su condición de uso es no machacarlos. Por eso:

     · la ciudad se resuelve UNA vez y se guarda un mes: una ciudad no
       se mueve;
     · la lista de sitios se guarda una semana;
     · y se pide de una sola vez, no una consulta por cada clase de
       sitio.

   Sin caché, abrir la hoja tres veces serían seis consultas para
   enseñar exactamente lo mismo.
   ───────────────────────────────────────────────────────────── */

import { consultaOverpass, leerRespuesta, agrupar, RADIO } from './lugares-core.js';
import { normalizarLugar } from './place-core.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/* VARIOS SERVIDORES DE OVERPASS, y por la misma razón que hay dos
   catálogos de libros: para que uno pueda faltar. El primero es el
   oficial y también el más cargado del mundo —devuelve 429 y 504 con
   toda naturalidad a media tarde—, y los otros dos son espejos
   públicos que sirven exactamente los mismos datos. Se prueban en
   orden y basta con que conteste uno. */
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

/* DOS ESPERAS, Y LA DEL CLIENTE TIENE QUE SER MAYOR.

   Estaban las dos en 20 segundos: el `[timeout:20]` que va dentro de la
   consulta —lo que Overpass se permite tardar EJECUTÁNDOLA— y el
   nuestro. Pero el tiempo que pasa de verdad es la cola más la
   ejecución, así que en cuanto el servidor tenía trabajo pendiente
   nosotros cortábamos antes de que pudiera contestar, siempre. Cortar
   a la vez que el otro termina es cortar siempre. */
const ESPERA_CONSULTA = 25;        // segundos, dentro de la consulta
const ESPERA_RED = 45000;          // milisegundos, del lado de aquí
const ESPERA_CIUDAD = 15000;       // situar una ciudad es una consulta pequeña
const MES = 30 * 24 * 3600 * 1000;
const SEMANA = 7 * 24 * 3600 * 1000;

const timeout = (ms) => (typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(ms) : undefined);

/* ── LA DESPENSA ─────────────────────────────────────────────
   En `localStorage` y no en Firestore: es un dato público que no dice
   nada de nadie, y guardarlo en el servidor sería pagar por almacenar
   lo que cualquiera puede volver a preguntar. */
function guardado(clave, edad) {
  try {
    const crudo = localStorage.getItem(clave);
    if (!crudo) return null;
    const { cuando, dato } = JSON.parse(crudo);
    return Date.now() - cuando < edad ? dato : null;
  } catch { return null; }
}

function guardar(clave, dato) {
  try {
    localStorage.setItem(clave, JSON.stringify({ cuando: Date.now(), dato }));
  } catch { /* sin sitio en el almacén: se vuelve a preguntar y ya */ }
}

/* ── DÓNDE ESTÁ ESA CIUDAD ───────────────────────────────────── */

/**
 * El centro de una ciudad, o null si no se pudo situar.
 *
 * Lanza si el servicio no contesta —que no es lo mismo que no encontrar
 * la ciudad—, para que arriba se puedan contar cosas distintas.
 */
export async function centroDe(city, country = '') {
  const clave = `lugares.centro.${normalizarLugar(city)}|${normalizarLugar(country)}`;
  const ya = guardado(clave, MES);
  if (ya !== null) return ya;

  const url = `${NOMINATIM}?${new URLSearchParams({
    city, country, format: 'json', limit: '1',
  })}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: timeout(ESPERA_CIUDAD) });
  if (!r.ok) throw new Error(`Nominatim HTTP ${r.status}`);
  const datos = await r.json();

  const uno = Array.isArray(datos) ? datos[0] : null;
  const centro = uno && Number.isFinite(Number(uno.lat)) && Number.isFinite(Number(uno.lon))
    ? { lat: Number(uno.lat), lon: Number(uno.lon) }
    : null;
  /* El «no la encontramos» también se guarda: si no, cada vez que se
     abriera la hoja se volvería a preguntar por una ciudad mal escrita
     que va a seguir sin encontrarse. */
  guardar(clave, centro);
  return centro;
}

/* ── QUÉ HAY ALREDEDOR ───────────────────────────────────────── */

async function preguntarAOverpass(centro) {
  const consulta = consultaOverpass(centro, { radio: RADIO, espera: ESPERA_CONSULTA });
  const fallos = [];

  for (const servidor of OVERPASS) {
    try {
      const r = await fetch(servidor, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: consulta,
        signal: timeout(ESPERA_RED),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      /* Overpass contesta 200 con un texto de error cuando la consulta
         se le atraganta, así que un 200 no basta: si no hay `elements`
         no ha contestado, ha dicho que no puede. */
      const datos = await r.json();
      if (!Array.isArray(datos?.elements)) throw new Error('respuesta sin datos');
      return leerRespuesta(datos);
    } catch (e) {
      const corto = new URL(servidor).hostname;
      fallos.push(`${corto}: ${e?.message || e}`);
      console.warn(`Overpass ${corto} no pudo contestar:`, e?.message || e);
    }
  }
  /* Ninguno contestó. El motivo viaja hacia arriba para que se pueda
     LEER EN LA PANTALLA: sin eso, «no funciona» es todo lo que se puede
     contar de vuelta, y con eso no se arregla nada. */
  const e = new Error(fallos.join(' · '));
  e.detalle = fallos.join(' · ');
  throw e;
}

/**
 * Los sitios donde quedar, agrupados por clase.
 *
 * Devuelve `{ grupos, centro, motivo }`. `motivo` es null cuando salió
 * bien, y si no es una clave de `MOTIVOS` — porque «no hay cafeterías»
 * y «no hemos podido preguntar» son cosas distintas y la pantalla tiene
 * que poder decir cuál de las dos pasó.
 */
export async function buscarSitios(place = {}, { desdeAqui = null } = {}) {
  const city = String(place.city ?? '').trim();
  if (!city && !desdeAqui) return { grupos: [], centro: null, motivo: 'sin-ciudad', detalle: '' };

  let centro = desdeAqui;
  if (!centro) {
    try {
      centro = await centroDe(city, String(place.country ?? '').trim());
    } catch (e) {
      console.warn('No se pudo situar la ciudad:', e?.message || e);
      /* «Situar la ciudad» y «preguntar qué hay» son dos servicios
         distintos, y este es el primero. Se distingue porque el otro
         camino —cerca de donde estás— no lo necesita. */
      return {
        grupos: [], centro: null, motivo: 'ciudad-caida', detalle: String(e?.message || e),
      };
    }
    if (!centro) return { grupos: [], centro: null, motivo: 'ciudad-desconocida' };
  }

  /* Buscando cerca de ti la caché no vale: el centro es otro y los
     sitios de alrededor también. Y NO SE GUARDA, que es lo importante:
     una lista guardada bajo «cerca de mí» sería tu posición escrita en
     el disco del teléfono con otro nombre. */
  const clave = desdeAqui ? null : `lugares.sitios.${normalizarLugar(city)}`;
  let lugares = clave ? guardado(clave, SEMANA) : null;
  if (!lugares) {
    try {
      lugares = await preguntarAOverpass(centro);
    } catch (e) {
      console.warn('El mapa no pudo contestar:', e?.message || e);
      return {
        grupos: [], centro, motivo: 'mapa-caido', detalle: e?.detalle || String(e?.message || e),
      };
    }
    /* Una lista vacía TAMBIÉN se guarda. Es una respuesta legítima —hay
       ciudades sin nada cartografiado— y volver a preguntar cada vez no
       la va a cambiar en una semana. */
    if (clave) guardar(clave, lugares);
  }

  const grupos = agrupar(lugares, centro);
  return { grupos, centro, motivo: grupos.length ? null : 'sin-resultados', detalle: '' };
}

/** Para las pruebas y para «volver a buscar» cuando el mapa estaba caído. */
export function olvidarSitios(city) {
  try {
    localStorage.removeItem(`lugares.sitios.${normalizarLugar(city)}`);
  } catch { /* da igual: es una caché */ }
}

/* ── DÓNDE ESTOY ─────────────────────────────────────────────
   Solo para buscar sitios cerca de una misma, y nada más.

   NO SE GUARDA EN NINGÚN SITIO: ni en el almacén del navegador, ni en
   los ajustes, ni en Firestore. Vive en una variable mientras la hoja
   está abierta y se va con ella. Lo que no está guardado no se puede
   filtrar, que es la misma regla de place-core.js.

   Y NO SE OFRECE al buscar dónde quedar con alguien: ahí la lista acaba
   convirtiéndose en una propuesta que ve la otra persona, y cuanto
   menos dependa de dónde estás, mejor. Aquí no hay nadie al otro lado.

   `enableHighAccuracy` a false a propósito: para elegir un café da
   igual el metro exacto, tarda menos y gasta menos batería. */
export function dondeEstoy({ espera = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('sin-geolocalizacion')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err?.code === 1 ? 'permiso-denegado' : 'sin-posicion')),
      { enableHighAccuracy: false, timeout: espera, maximumAge: 60000 },
    );
  });
}
