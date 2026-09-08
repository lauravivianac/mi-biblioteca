/* ─────────────────────────────────────────────────────────────
   DÓNDE QUEDAR: CAFÉS, LIBRERÍAS Y BIBLIOTECAS  ·  historia #157

     «Podríamos ubicar cafés o librerías cercanas. ¿Podemos hacer esto
      con alguna integración de internet?»

   Hasta ahora la hoja de seguridad decía, literalmente, «la app no sabe
   qué sitios hay en tu ciudad, así que no se los inventa», y ofrecía
   CLASES de sitio: una biblioteca, una cafetería del centro, una plaza.
   Buen consejo y ninguna ayuda: el sitio concreto había que buscarlo
   fuera de la app y traerlo copiado al chat.

   ── DE DÓNDE SALEN LOS SITIOS ───────────────────────────────

   De OpenStreetMap, por dos razones que no son el precio. La primera es
   que NO PIDE CLAVE: esta app son ficheros estáticos, así que cualquier
   clave que se pusiera aquí se lee con F12 y estaría regalada. La
   segunda es que se puede consultar sin identificar a quien pregunta.

   ── Y AHORA LA PARTE DELICADA ───────────────────────────────

   La tentación evidente es proponer sitios en el PUNTO MEDIO entre las
   dos personas. Suena justo y es un agujero de seguridad:

     si a Laura le enseño el punto medio entre ella y Rafael, Laura sabe
     dónde está ella, así que Rafael está exactamente al otro lado —
     posición_de_Rafael = 2 × punto_medio − posición_de_Laura.

   Es decir: un punto medio CONVIERTE un geohash recortado a propósito a
   un kilómetro (ver place-core.js) en la posición exacta de la otra
   persona. Toda la cautela de la historia #81 se perdería en la función
   que viene a ayudar a quedar.

   Así que aquí NO ENTRA la posición de la otra persona. Ni para
   ordenar, ni para filtrar, ni «solo para el cálculo». Se busca por
   CIUDAD —la que las dos ya comparten para poder intercambiar— y se
   ordena por distancia al centro de esa ciudad, que es un dato público
   y el mismo para las dos. La lista que ve una es idéntica a la que ve
   la otra, así que no hay nada que deducir de ella.

   Elegir un sitio y mandarlo SÍ dice algo de una, claro. Pero eso lo
   decide quien lo manda, sobre un local público, y a sabiendas — que es
   una cosa muy distinta de que lo calcule la app por detrás.

   Sin DOM y sin red a propósito: recibe datos y devuelve datos.
   ───────────────────────────────────────────────────────────── */

import { sinTildes, unSoloEspacio } from './text-core.js';

/* Las tres clases de sitio, y por qué estas tres: son las que ya
   recomienda la hoja de seguridad para un primer encuentro. Públicas,
   con gente dentro, y con una excusa evidente para estar ahí con un
   libro en la mano. Ordenadas como se enseñan. */
export const TIPOS = [
  { id: 'biblioteca', icono: '📚', label: 'Bibliotecas', consulta: ['"amenity"="library"'] },
  { id: 'libreria', icono: '📖', label: 'Librerías', consulta: ['"shop"="books"'] },
  { id: 'cafe', icono: '☕', label: 'Cafeterías', consulta: ['"amenity"="cafe"'] },
];

const POR_ETIQUETA = {
  library: 'biblioteca',
  books: 'libreria',
  cafe: 'cafe',
};

/* Cuántos de cada clase. Sin tope, las cafeterías se comen la lista —de
   una biblioteca hay tres en una ciudad y de cafeterías, seiscientas— y
   entonces la función deja de servir para lo que se pidió, que era
   encontrar un sitio para verse y no un listado de hostelería. */
export const TOPE_POR_TIPO = 6;

/** El radio de búsqueda alrededor del centro, en metros. */
export const RADIO = 4000;

/* ── LA CONSULTA ─────────────────────────────────────────────── */

/**
 * La consulta de Overpass, en su propio lenguaje.
 *
 * `out center` y no `out`: una biblioteca suele estar dibujada como el
 * contorno del edificio y no como un punto, y sin `center` esos vuelven
 * sin coordenadas y no se pueden poner en un mapa.
 */
export function consultaOverpass(centro, { radio = RADIO, tipos = TIPOS } = {}) {
  if (!centro || !Number.isFinite(centro.lat) || !Number.isFinite(centro.lon)) return null;
  const lat = centro.lat.toFixed(5);
  const lon = centro.lon.toFixed(5);
  const cuerpo = tipos
    .flatMap((t) => t.consulta)
    .flatMap((filtro) => ['node', 'way'].map((q) => `  ${q}[${filtro}](around:${radio},${lat},${lon});`))
    .join('\n');
  return `[out:json][timeout:20];\n(\n${cuerpo}\n);\nout center 300;`;
}

/* ── LO QUE VUELVE ───────────────────────────────────────────── */

const texto = (v, max = 90) => unSoloEspacio(v).slice(0, max);

/** Un elemento de Overpass, traducido a lo que la pantalla necesita. */
function unLugar(el) {
  const tags = el?.tags || {};
  const nombre = texto(tags.name);
  if (!nombre) return null;                  // un sitio sin nombre no se puede proponer

  const tipo = POR_ETIQUETA[tags.amenity] || POR_ETIQUETA[tags.shop];
  if (!tipo) return null;

  const lat = Number(el.lat ?? el.center?.lat);
  const lon = Number(el.lon ?? el.center?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const calle = texto([tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '));
  return {
    id: `${el.type || 'node'}/${el.id}`,
    tipo,
    nombre,
    lat,
    lon,
    calle,
    horario: texto(tags.opening_hours, 60),
  };
}

export function leerRespuesta(json) {
  const elementos = Array.isArray(json?.elements) ? json.elements : [];
  return elementos.map(unLugar).filter(Boolean);
}

/* ── DISTANCIAS ──────────────────────────────────────────────── */

const RADIO_TIERRA = 6371;
const aRad = (g) => (g * Math.PI) / 180;

/** Kilómetros entre dos puntos. Solo se usa contra el CENTRO DE LA CIUDAD. */
export function distanciaKm(a, b) {
  if (!a || !b) return Infinity;
  const dLat = aRad(b.lat - a.lat);
  const dLon = aRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(aRad(a.lat)) * Math.cos(aRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Fuera los repetidos.
 *
 * Las cadenas salen muchas veces con el mismo nombre, y a veces el
 * mismo local está dos veces en el mapa —como punto y como edificio—
 * porque lo dibujaron dos personas distintas. Se considera el mismo
 * sitio si comparte nombre y está a menos de 150 metros; dos sucursales
 * de verdad, en barrios distintos, sobreviven las dos.
 */
export function quitarRepetidos(lugares) {
  const fuera = [];
  for (const l of lugares) {
    const clave = sinTildes(l.nombre);
    const gemelo = fuera.find((x) => sinTildes(x.nombre) === clave && distanciaKm(x, l) < 0.15);
    if (!gemelo) fuera.push(l);
  }
  return fuera;
}

/**
 * La lista lista para pintar, agrupada por clase de sitio.
 *
 * Se ordena por distancia AL CENTRO DE LA CIUDAD y nunca a ninguna de
 * las dos personas — la cabecera de este fichero explica por qué—. El
 * centro es además el sitio neutral por defecto: es a donde va la gente
 * cuando queda con alguien a quien no conoce.
 */
export function agrupar(lugares, centro, { tope = TOPE_POR_TIPO } = {}) {
  const limpios = quitarRepetidos(lugares);
  return TIPOS.map((t) => ({
    ...t,
    lugares: limpios
      .filter((l) => l.tipo === t.id)
      .map((l) => ({ ...l, km: distanciaKm(centro, l) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, tope),
  })).filter((g) => g.lugares.length);
}

export const cuantos = (grupos) => grupos.reduce((n, g) => n + g.lugares.length, 0);

/* ── CÓMO SE LEE ─────────────────────────────────────────────── */

/**
 * «A 400 m del centro», «A 2,1 km del centro».
 *
 * Del CENTRO, dicho con todas las letras. Si pusiera solo «a 400 m»,
 * cualquiera entendería «de ti» — y entonces la app estaría dando a
 * entender que sabe dónde estás, que es justo lo que no hace.
 */
export function distanciaTexto(km) {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `A ${Math.max(1, Math.round(km * 10)) * 100} m del centro`;
  return `A ${km.toFixed(1).replace('.', ',')} km del centro`;
}

/** El mapa, en OpenStreetMap, que es de donde salió el dato. */
export const enlaceMapa = (l) =>
  `https://www.openstreetmap.org/?mlat=${l.lat.toFixed(6)}&mlon=${l.lon.toFixed(6)}#map=18/${l.lat.toFixed(6)}/${l.lon.toFixed(6)}`;

/**
 * Lo que se escribe en el chat al elegir un sitio.
 *
 * Se deja EN LA CAJA DE ESCRIBIR, sin mandarlo. Proponer un sitio para
 * verse es una decisión, no un botón: quien lo manda tiene que poder
 * cambiar la hora, el día, o pensárselo otra vez.
 */
export function propuesta(l, { max = 1000 } = {}) {
  if (!l) return '';
  const partes = [`¿Nos vemos en ${l.nombre}?`];
  if (l.calle) partes.push(`(${l.calle})`);
  const frase = partes.join(' ');
  const mapa = enlaceMapa(l);
  /* Si el enlace no cabe, se va el enlace y se queda el nombre: el
     nombre sirve sin el mapa y el mapa no sirve sin el nombre. */
  return `${frase}\n${mapa}`.length <= max ? `${frase}\n${mapa}` : frase.slice(0, max);
}

/* ── CUANDO NO SE PUEDE ──────────────────────────────────────── */

/* Los mismos dos mensajes de siempre y por la misma razón que en la
   búsqueda de libros: «no hay cafeterías en tu ciudad» y «no hemos
   podido preguntar» son cosas distintas, y contar la segunda como la
   primera hace que quien lo lee deje de buscar. */
export const MOTIVOS = {
  'sin-ciudad': 'Para buscar sitios hace falta que digas en qué ciudad estás. '
    + 'No se pide la dirección: solo la ciudad.',
  'ciudad-desconocida': 'No hemos podido situar esa ciudad en el mapa. '
    + 'Prueba a escribirla completa, o quedad como veníais haciendo.',
  'servicio-caido': 'El mapa no contesta ahora mismo. Vuelve a intentarlo en un rato: '
    + 'no es que no haya sitios, es que no hemos podido preguntar.',
  'sin-resultados': 'No encontramos cafeterías, librerías ni bibliotecas por el centro '
    + 'de tu ciudad. El mapa lo mantiene gente voluntaria y a veces falta.',
};

/* De dónde salen los datos. Va en pantalla porque la licencia lo pide y
   porque está bien decir quién ha hecho el trabajo. */
export const CREDITO = 'Sitios de OpenStreetMap, que mantiene gente voluntaria.';
