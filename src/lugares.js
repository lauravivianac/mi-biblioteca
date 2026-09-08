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
const OVERPASS = 'https://overpass-api.de/api/interpreter';

const ESPERA = 20000;
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
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: timeout(ESPERA) });
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
  const consulta = consultaOverpass(centro, { radio: RADIO });
  const r = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: consulta,
    signal: timeout(ESPERA),
  });
  if (!r.ok) throw new Error(`Overpass HTTP ${r.status}`);
  return leerRespuesta(await r.json());
}

/**
 * Los sitios donde quedar, agrupados por clase.
 *
 * Devuelve `{ grupos, centro, motivo }`. `motivo` es null cuando salió
 * bien, y si no es una clave de `MOTIVOS` — porque «no hay cafeterías»
 * y «no hemos podido preguntar» son cosas distintas y la pantalla tiene
 * que poder decir cuál de las dos pasó.
 */
export async function buscarSitios(place = {}) {
  const city = String(place.city ?? '').trim();
  if (!city) return { grupos: [], centro: null, motivo: 'sin-ciudad' };

  let centro;
  try {
    centro = await centroDe(city, String(place.country ?? '').trim());
  } catch (e) {
    console.warn('No se pudo situar la ciudad:', e?.message || e);
    return { grupos: [], centro: null, motivo: 'servicio-caido' };
  }
  if (!centro) return { grupos: [], centro: null, motivo: 'ciudad-desconocida' };

  const clave = `lugares.sitios.${normalizarLugar(city)}`;
  let lugares = guardado(clave, SEMANA);
  if (!lugares) {
    try {
      lugares = await preguntarAOverpass(centro);
    } catch (e) {
      console.warn('El mapa no pudo contestar:', e?.message || e);
      return { grupos: [], centro, motivo: 'servicio-caido' };
    }
    /* Una lista vacía TAMBIÉN se guarda. Es una respuesta legítima —hay
       ciudades sin nada cartografiado— y volver a preguntar cada vez no
       la va a cambiar en una semana. */
    guardar(clave, lugares);
  }

  const grupos = agrupar(lugares, centro);
  return { grupos, centro, motivo: grupos.length ? null : 'sin-resultados' };
}

/** Para las pruebas y para «volver a buscar» cuando el mapa estaba caído. */
export function olvidarSitios(city) {
  try {
    localStorage.removeItem(`lugares.sitios.${normalizarLugar(city)}`);
  } catch { /* da igual: es una caché */ }
}
