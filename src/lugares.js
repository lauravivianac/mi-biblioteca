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

import {
  consultaOverpass, leerRespuesta, agrupar, tiposDe, FOCOS,
  metrosDe, DISTANCIA_POR_DEFECTO, nombreCorto,
} from './lugares-core.js';
import { sinTildes } from './text-core.js';
import { normalizarLugar } from './place-core.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/* VARIOS SERVIDORES DE OVERPASS, y por la misma razón que hay dos
   catálogos de libros: para que uno pueda faltar. El primero es el
   oficial y también el más cargado del mundo —devuelve 429 y 504 con
   toda naturalidad a media tarde—, y los demás son espejos públicos que
   sirven exactamente los mismos datos.

   ── POR QUÉ CINCO Y NO TRES ─────────────────────────────────

   Desde un teléfono en Bogotá, con los tres de antes, salía esto:

     overpass-api.de: Load failed · overpass.kumi.systems: Fetch is
     aborted · se agotó la espera

   «Load failed» en Safari es un fallo de RED, no un código de error, y
   es lo que se ve cuando un servidor contesta 429 sin las cabeceras de
   CORS: el navegador ni siquiera deja leer la respuesta, así que desde
   aquí un «estás preguntando demasiado» y un «no existe ese servidor»
   son indistinguibles.

   Con tres espejos y uno de ellos siempre saturado, quedan dos. Con
   cinco, la probabilidad de quedarse sin ninguno baja mucho y no cuesta
   nada: solo se le pregunta al siguiente si los anteriores no han
   contestado todavía. Un día bueno se sigue gastando UNA consulta.

   Los dos últimos no los he podido probar desde donde escribo esto
   —aquí los espejos están bloqueados—, así que van al final: si alguno
   no sirviera, solo se le llama cuando ya no queda nada mejor, y el
   detalle técnico de la pantalla dirá exactamente qué contestó. */
export const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.osm.jp/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];

/* ── LAS ESPERAS, DESPUÉS DE MEDIRLAS ────────────────────────

     «Se está demorando muchísimo, casi 5 minutos buscando librerías y
      cafés.»

   Y salía la cuenta: 12 s de geolocalización + tres servidores EN SERIE
   con hasta 60 s de techo = 72 s por búsqueda. Y como cada pestaña
   consulta lo suyo —eso lo cambié yo, para no pedir las tres clases
   cuando solo se enseña una— tocar las tres pestañas eran tres
   búsquedas. Tres minutos y medio, más un reintento, son los cinco
   minutos que contó.

   El error de fondo era tratar la espera como si el problema fuera «no
   darle tiempo». No lo es: Overpass sano contesta una consulta pequeña
   en uno o dos segundos. Si a los doce no ha contestado, está encolado,
   y esperar más rara vez cambia el resultado — solo cambia cuánto rato
   se mira una ruedecita. */
const ESPERA_CONSULTA = 10;        // segundos, dentro de la consulta
const ESPERA_RED = 20000;          // milisegundos, lo que se le da a UN servidor
/* Y A LA BÚSQUEDA ENTERA, CONTANDO DESDE EL PRINCIPIO.
   Antes este reloj se ponía en marcha DESPUÉS de lanzar el último
   espejo, así que los veinticinco segundos empezaban en el segundo
   ocho y en realidad eran treinta y tres. La cuenta de arriba estaba
   mal por ese lado, y encima el número escrito aquí no era el que se
   cumplía — que es lo peor que puede hacer una constante. */
const ESPERA_TOTAL = 25000;
const ESPERA_CIUDAD = 10000;       // situar una ciudad es una consulta pequeña

/* Cuánto se espera a un servidor antes de preguntarle TAMBIÉN al
   siguiente. No es reintentar: el primero sigue vivo y vale si acaba
   contestando; simplemente deja de ser el único.

   Así el caso normal sigue costando UNA consulta —contesta en dos
   segundos y nadie más se entera— y el caso malo deja de costar un
   minuto. Es lo que hace todo el mundo con réplicas lentas, y con
   consultas tan pequeñas como estas no es abusar de un servicio
   gratuito: es no tener a alguien esperando por una máquina que hoy va
   mal. */
const ADELANTAR = 4000;

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

/* ── Y LA DE CERCA DE TI, QUE NO ES UNA DESPENSA ─────────────

   Los sitios de alrededor de tu posición NO PUEDEN IR A `localStorage`:
   una lista guardada en el disco del teléfono bajo «cerca de mí» es tu
   posición escrita con otro nombre, y la regla de place-core.js es que
   eso no se guarda.

   Pero tampoco se puede preguntar tres veces seguidas por lo mismo. Con
   las pestañas de arriba —Todo · Cafés · Librerías— tocar las tres eran
   tres consultas idénticas al mapa para enseñar tres recortes de la
   misma respuesta. Así que se recuerda UNA, en una variable, sin fecha
   y sin disco: se va al recargar la página, como tiene que irse. */
const ultimas = new Map();   // `${foco}|${radio}|${lat}|${lon}` → lugares

/* UNA BÚSQUEDA QUE SALIÓ ANTES DE CERRAR NO PUEDE ESCRIBIR DESPUÉS.
   ─────────────────────────────────────────────────────────────
   Cerrar la hoja borra tu posición y la lista de alrededor. Pero una
   consulta lanzada antes de cerrar sigue viva, y al llegar guardaba lo
   suyo — o sea, volvía a dejar en memoria justo lo que se acababa de
   borrar, unos milisegundos después y sin que nadie lo pidiera.
   Con la red de un teléfono ese hueco no es teórico.

   Así que cada búsqueda se lleva apuntado en qué generación salió, y al
   volver solo escribe si sigue siendo la de ahora. Olvidar sube el
   contador, y todo lo que venía de camino se cae solo. */
let generacion = 0;

/* QUÉ ENTRA EN LA CLAVE, Y POR QUÉ CADA COSA.
   El radio, porque ampliar de 1,2 a 8 km es OTRA búsqueda y sin esto
   ampliar habría devuelto la lista corta de antes. Y el punto, porque
   ahora el centro puede ser lo que escribiste: sin él, ir de Chapinero
   a «cerca de mí» y volver preguntaría las dos veces por lo mismo.

   Redondeado a tres decimales, unos 100 metros: moverse un poco por la
   calle no vuelve a preguntar, y cruzar el barrio sí. */
const enClave = (punto, foco, radio) =>
  `${foco}|${radio}|${punto.lat.toFixed(3)}|${punto.lon.toFixed(3)}`;

const enMemoria = (punto, foco, radio) =>
  (punto ? ultimas.get(enClave(punto, foco, radio)) ?? null : null);

const recordar = (punto, foco, radio, lugares, gen) => {
  if (!punto || gen !== generacion) return;
  ultimas.set(enClave(punto, foco, radio), lugares);
};

/** Al cerrar la hoja: lo que no se recuerda no se puede filtrar. */
export function olvidarDondeEstoy() {
  ultimas.clear();
  generacion += 1;
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

/* ── Y DÓNDE ESTÁ ESO QUE HAS ESCRITO ────────────────────────

     «Me gustaría que las personas pudieran decidir dónde buscar:
      ponerle un sitio, un barrio, o decir cerca mío.»

   Hasta aquí solo había dos centros posibles, y los dos los elegía la
   app: el de tu ciudad, o donde diga el GPS. Ninguno sirve para «voy a
   estar por Chapinero el sábado», que es la pregunta normal.

   ── POR QUÉ ESTO NO SE GUARDA EN EL DISCO ───────────────────

   La ciudad sí se guarda —lleva guardándose desde el principio, es un
   dato público y lo has puesto tú en tus ajustes—. Esto no, y la razón
   es que AQUÍ NO SÉ QUÉ ME ESTÁS ESCRIBIENDO. Puede ser un barrio, y
   puede ser tu propia calle con el número. Guardar en el teléfono una
   lista de las direcciones que alguien buscó es exactamente lo que
   place-core.js promete no hacer, solo que escrito por la puerta de al
   lado.

   Así que vive en memoria mientras la hoja está abierta, igual que tu
   posición, y se va al cerrarla. Lo que no está guardado no se puede
   filtrar. */
const sitiosVistos = new Map();   // lo escrito → { lat, lon, nombre } | null

/** Lo mismo que olvidar dónde estás: se va con la hoja. */
export function olvidarSitiosBuscados() { sitiosVistos.clear(); }

async function unNominatim(consulta) {
  const url = `${NOMINATIM}?${new URLSearchParams({
    q: consulta, format: 'json', limit: '1', addressdetails: '0',
  })}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: timeout(ESPERA_CIUDAD) });
  if (!r.ok) throw new Error(`Nominatim HTTP ${r.status}`);
  const datos = await r.json();
  const uno = Array.isArray(datos) ? datos[0] : null;
  if (!uno || !Number.isFinite(Number(uno.lat)) || !Number.isFinite(Number(uno.lon))) return null;
  return {
    lat: Number(uno.lat),
    lon: Number(uno.lon),
    nombre: nombreCorto(uno.display_name || consulta),
  };
}

/**
 * Situar en el mapa un barrio, una calle o un sitio escrito a mano.
 *
 * Devuelve `{ lat, lon, nombre }`, o null si no existe. Lanza si el
 * servicio no contesta, que es otra cosa: «no encontramos ese barrio»
 * se arregla escribiéndolo de otra forma y «no pudimos preguntar» se
 * arregla volviendo a intentarlo, y confundirlos manda a corregir una
 * palabra que estaba bien escrita.
 *
 * SE PREGUNTA DOS VECES Y EN ESTE ORDEN. Primero con tu ciudad pegada
 * detrás —«Chapinero» hay uno en Bogotá y quien escribe eso no está
 * pensando en ningún otro— y, si así no sale, tal cual: si escribes
 * «Medellín» viviendo en Bogotá, «Medellín, Bogotá» no existe y el
 * segundo intento es el que te vale.
 */
export async function situarSitio(texto, pista = {}) {
  const q = String(texto ?? '').trim();
  if (!q) return null;

  const ciudad = String(pista.city ?? '').trim();
  const clave = `${normalizarLugar(q)}|${normalizarLugar(ciudad)}`;
  if (sitiosVistos.has(clave)) return sitiosVistos.get(clave);

  const intentos = [];
  if (ciudad && !sinTildes(q.toLowerCase()).includes(sinTildes(ciudad.toLowerCase()))) {
    intentos.push([q, ciudad, String(pista.country ?? '').trim()].filter(Boolean).join(', '));
  }
  intentos.push(q);

  let encontrado = null;
  for (const intento of intentos) {
    encontrado = await unNominatim(intento);
    if (encontrado) break;
  }
  /* El «no existe» también se recuerda: sin esto, darle otra vez al
     botón con la misma palabra mal escrita vuelve a preguntar. */
  sitiosVistos.set(clave, encontrado);
  return encontrado;
}

/* ── QUÉ HAY ALREDEDOR ───────────────────────────────────────── */

/** Una consulta a UN servidor. Lanza con el motivo si no puede. */
async function unServidor(servidor, consulta, señal) {
  const r = await fetch(servidor, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: consulta,
    signal: señal,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  /* Overpass contesta 200 con un texto de error cuando la consulta se
     le atraganta, así que un 200 no basta: si no hay `elements` no ha
     contestado, ha dicho que no puede. */
  const datos = await r.json();
  if (!Array.isArray(datos?.elements)) throw new Error('respuesta sin datos');
  return leerRespuesta(datos);
}

/* Cómo se llama cada estado en el detalle técnico. Son las palabras que
   se leen en la pantalla cuando algo falla, y con eso —y solo con eso—
   hay que poder decir qué pasó desde el otro lado de un teléfono. */
export const SIN_EMPEZAR = 'no hizo falta preguntarle';
export const PREGUNTANDO = 'seguía intentándolo';
export const TARDO = 'tardó demasiado';

/**
 * Preguntar al mapa, sin hacer esperar por una máquina que va mal.
 *
 * Se le pregunta al primero. Si a los cuatro segundos no ha contestado
 * —o si se muere antes, que entonces es ya mismo— se le pregunta TAMBIÉN
 * al siguiente; el anterior sigue vivo y vale si acaba llegando. Gana el
 * primero que traiga datos y los demás se abortan.
 *
 * ── LO QUE SE APRENDIÓ MIRANDO UN FALLO DE VERDAD ───────────
 *
 * Desde un teléfono en Bogotá, la pantalla decía exactamente esto:
 *
 *   overpass-api.de: Load failed · overpass.kumi.systems: Fetch is
 *   aborted · se agotó la espera
 *
 * Tres cosas ahí, y dos eran fallos de esta función:
 *
 *   1 · SOLO SALÍAN DOS ESPEJOS DE TRES. El tercero seguía preguntando
 *       cuando se acabó la espera, y como el motivo solo se apuntaba al
 *       fallar, el tercero no aparecía en ninguna parte. Leer eso es
 *       creer que solo se intentó dos veces.
 *
 *   2 · «Load failed» es inmediato, y aun así se esperaban los cuatro
 *       segundos enteros antes de preguntarle al segundo. El bucle de
 *       antes tenía un comentario diciendo que eso no pasaba. Pasaba: un
 *       fallo se convertía en una promesa que no se resolvía nunca, así
 *       que la carrera no se enteraba de que ya no quedaba nadie.
 *
 * Ahora cada espejo lleva su estado escrito, se nombran TODOS pase lo
 * que pase, y morir cuenta como noticia: si no queda nadie preguntando,
 * el siguiente sale sin esperar su turno.
 */
export async function preguntarAOverpass(centro, {
  radio = null, foco = 'todo',
  /* Las esperas se pueden cambiar desde fuera POR UNA RAZÓN: si no, la
     única forma de comprobar qué se enseña cuando se acaba el tiempo
     sería una prueba que tarda veinticinco segundos, y una prueba que
     tarda eso no se ejecuta — se comenta. Con esto se puede provocar el
     mismo caso en medio segundo. La app no le pasa nunca este
     argumento: usa los números medidos de arriba. */
  esperas = {},
} = {}) {
  const {
    red = ESPERA_RED, total = ESPERA_TOTAL, adelantar = ADELANTAR,
  } = esperas;
  const consulta = consultaOverpass(centro, {
    radio, tipos: tiposDe(foco), espera: ESPERA_CONSULTA,
  });

  /* Un renglón por espejo, siempre, desde el principio. */
  const espejos = OVERPASS.map((url) => ({
    url, nombre: new URL(url).hostname, estado: SIN_EMPEZAR,
  }));

  const abortos = [];
  let preguntando = 0;
  let ganador = null;
  /* Cómo se entera el bucle de que algo ha pasado —alguien contestó o
     alguien se murió— sin tener que ir preguntando cada poco. */
  let avisar = () => {};
  const algoPasa = () => new Promise((r) => { avisar = r; });

  const lanzar = (e) => {
    const ac = new AbortController();
    abortos.push(ac);
    preguntando += 1;
    e.estado = PREGUNTANDO;
    const corta = setTimeout(() => { e.estado = TARDO; ac.abort(); }, red);
    unServidor(e.url, consulta, ac.signal)
      .then(
        (lugares) => { e.estado = 'contestó'; if (!ganador) ganador = lugares; },
        /* Si ya lo habíamos cortado nosotros, el error que llega es el
           aborto: lo interesante es que tardó, no cómo se llama. */
        (err) => { if (e.estado === PREGUNTANDO) e.estado = String(err?.message || err); },
      )
      .finally(() => { clearTimeout(corta); preguntando -= 1; avisar(); });
  };

  const espera = (ms) => new Promise((r) => { setTimeout(r, ms); });
  const arranque = Date.now();
  const llevamos = () => Date.now() - arranque;

  try {
    lanzar(espejos[0]);
    let siguiente = 1;

    while (!ganador && llevamos() < total) {
      const quedan = siguiente < espejos.length;
      /* A los 4 s el segundo, a los 8 el tercero… o antes, si ya no hay
         nadie preguntando: esperar el turno de alguien que no existe es
         mirar la ruedecita por deporte. */
      const suTurno = siguiente * adelantar;
      if (quedan && (preguntando === 0 || llevamos() >= suTurno)) {
        lanzar(espejos[siguiente]);
        siguiente += 1;
      } else if (!quedan && preguntando === 0) {
        break;                                   // no queda nadie a quien esperar
      } else {
        /* Se espera a que pase algo, pero nunca más allá del próximo
           turno ni del final: si el aviso se perdiera por una carrera,
           el bucle se despierta igual y vuelve a mirar. */
        const hasta = Math.min(
          quedan ? suTurno - llevamos() : Infinity,
          total - llevamos(),
        );
        await Promise.race([algoPasa(), espera(Math.max(20, hasta))]);
      }
    }

    if (ganador) return ganador;
  } finally {
    for (const ac of abortos) ac.abort();
  }

  /* Los que seguían preguntando cuando se acabó el tiempo se quedan con
     su `PREGUNTANDO`, que es la verdad: no fallaron, no les dio tiempo. */
  const fallos = espejos.map((e) => `${e.nombre}: ${e.estado}`);
  fallos.push(preguntando
    ? `se agotó la espera (${Math.round(total / 100) / 10} s)`
    : 'ninguno pudo contestar');

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
export async function buscarSitios(place, {
  desdeAqui = null, foco = 'todo', distancia = DISTANCIA_POR_DEFECTO,
} = {}) {
  /* En qué generación salió esta búsqueda. Si la hoja se cierra mientras
     va de camino, lo que traiga ya no se guarda. */
  const gen = generacion;
  /* `?? {}` y no un valor por defecto en la firma: `myPlace()` devuelve
     NULL cuando no has dicho tu ciudad, y un valor por defecto solo
     cubre `undefined`. Ahora ese caso llega hasta aquí de verdad —quien
     da el permiso de ubicación no necesita haber puesto su ciudad— y
     antes no llegaba porque se cortaba antes de entrar. */
  const sitio = place ?? {};
  const city = String(sitio.city ?? '').trim();
  if (!city && !desdeAqui) return { grupos: [], centro: null, motivo: 'sin-ciudad', detalle: '' };

  let centro = desdeAqui;
  if (!centro) {
    try {
      centro = await centroDe(city, String(sitio.country ?? '').trim());
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
  /* La clave lleva el foco: cada pestaña pide lo suyo y guarda lo suyo.
     Antes había UNA lista por ciudad con las tres clases dentro, que es
     lo que obligaba a pedirlas siempre las tres. */
  const metros = metrosDe(distancia);
  const clave = desdeAqui ? null : `lugares.sitios.${normalizarLugar(city)}.${foco}`;
  let lugares = clave ? guardado(clave, SEMANA) : enMemoria(desdeAqui, foco, metros);
  if (!lugares) {
    try {
      lugares = await preguntarAOverpass(centro, {
        radio: desdeAqui ? metros : null, foco,
      });
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
    else recordar(desdeAqui, foco, metros, lugares, gen);
  }

  const grupos = agrupar(lugares, centro, { foco });
  const vacio = desdeAqui ? 'sin-resultados-cerca' : 'sin-resultados';
  return { grupos, centro, motivo: grupos.length ? null : vacio, detalle: '' };
}

/** Para las pruebas y para «volver a buscar» cuando el mapa estaba caído. */
export function olvidarSitios(city) {
  try {
    /* Las tres, no una: ahora hay una lista guardada por pestaña, y
       «volver a intentarlo» tiene que tirarlas todas o la siguiente
       pestaña seguiría enseñando lo de antes. */
    const base = `lugares.sitios.${normalizarLugar(city)}`;
    for (const foco of Object.keys(FOCOS)) localStorage.removeItem(`${base}.${foco}`);
    localStorage.removeItem(base);   // las guardadas por la versión anterior
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
/**
 * ¿Tiene sentido preguntar por la ubicación?
 *
 * Devuelve 'granted', 'denied', 'prompt' o 'desconocido'.
 *
 * Sirve para NO llamar a `getCurrentPosition` cuando ya sabemos que va
 * a fallar. Quien dijo que no una vez tiene el permiso bloqueado a
 * nivel de navegador: volver a pedirlo no enseña ninguna ventana, se
 * queda pensando hasta que expira y luego cae al centro igual. O sea,
 * doce segundos de ruedecita a cambio de nada.
 *
 * Se pregunta con `permissions`, que NO enseña ninguna ventana ni
 * cuenta como pedir la ubicación. Donde no exista —o donde no sepa de
 * geolocalización— se contesta 'desconocido' y se intenta, que es lo
 * que se hacía antes de existir esta función.
 */
export async function permisoDeUbicacion() {
  try {
    const p = await navigator.permissions?.query({ name: 'geolocation' });
    return p?.state || 'desconocido';
  } catch { return 'desconocido'; }
}

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
