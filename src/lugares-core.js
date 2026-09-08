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
/* CADA UNA CON SU RADIO, Y NO ES UN CAPRICHO.

   De bibliotecas hay tres en una ciudad; de cafeterías, seiscientas. Si
   se le pide al mapa el mismo círculo para las tres, la parte de los
   cafés se lleva prácticamente todo el trabajo: en 4 km del centro de
   Bogotá son miles de locales que hay que encontrar, ordenar y devolver
   para quedarse con seis.

   Y eso no es una lentitud teórica: es lo que se leyó en el detalle
   técnico de la pantalla. `overpass-api.de: Load failed` es que la
   conexión se cayó, y los otros dos `Fetch is aborted` son nuestra
   propia espera agotándose. Dos minutos para no decir nada.

   Así que el círculo se ajusta a lo que se busca. Para un café, 1,5 km
   —hay uno en cada esquina, no hace falta mirar más lejos—; para una
   librería o una biblioteca, los 4 km, porque puede que solo haya una y
   esté al otro lado. Es a la vez la respuesta más útil y, con mucho, la
   consulta más barata. */
export const RADIO_RARO = 4000;    // bibliotecas y librerías: puede haber una sola
export const RADIO_CAFE = 1500;    // cafeterías: hay una en cada esquina

export const TIPOS = [
  { id: 'biblioteca', icono: 'fichas', label: 'Bibliotecas', consulta: ['"amenity"="library"'], radio: RADIO_RARO },
  { id: 'libreria', icono: 'tienda', label: 'Librerías', consulta: ['"shop"="books"'], radio: RADIO_RARO },
  { id: 'cafe', icono: 'taza', label: 'Cafeterías', consulta: ['"amenity"="cafe"'], radio: RADIO_CAFE },
];

/* ── A QUÉ SE ENTRA ──────────────────────────────────────────

     «Esa funcionalidad está muy oculta. Me gustaría que fuera más
      intuitiva, como un botón del lado izquierdo en el margen, con una
      taza de café y una como una tienda, así pudiera abrir dónde tomar
      café y dónde comprar.»

   Los dos botones del margen no abren la misma pantalla: cada uno
   abre LO SUYO. Un atajo que te deja delante de una lista donde
   todavía hay que buscar no es un atajo.

   Pero tampoco es un callejón: dentro se puede cambiar de idea sin
   volver a salir, con las pestañas de arriba. */
export const FOCOS = {
  cafe: { titulo: 'Dónde tomar café', tipos: ['cafe'] },
  comprar: { titulo: 'Dónde comprar libros', tipos: ['libreria'] },
  todo: { titulo: 'Dónde leer y comprar libros', tipos: null },
};

/** Las pestañas de dentro, para poder cambiar de idea. */
export const PESTANAS = [
  { id: 'todo', label: 'Todo' },
  { id: 'cafe', label: 'Cafés' },
  { id: 'comprar', label: 'Librerías' },
];

/** ¿Entra este tipo de sitio en el foco elegido? */
export function enFoco(tipo, foco = 'todo') {
  const f = FOCOS[foco] || FOCOS.todo;
  return !f.tipos || f.tipos.includes(tipo);
}

/**
 * Las clases que hay que pedirle al mapa para este foco.
 *
 * Se preguntaba SIEMPRE por las tres y luego se tiraban dos tercios.
 * Cómodo para la caché —una lista servía para las tres pestañas— y
 * carísimo donde importa: al tocar «dónde comprar libros», que son
 * cuatro librerías, se le estaba pidiendo al mapa todas las cafeterías
 * de la ciudad para no enseñar ninguna.
 *
 * Ahora se pide lo que se va a enseñar y se guarda por separado. Son
 * tres consultas pequeñas en vez de una enorme, y si una falla las
 * otras dos siguen funcionando.
 */
export const tiposDe = (foco = 'todo') => TIPOS.filter((t) => enFoco(t.id, foco));

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

/* EL RADIO NO PUEDE SER EL MISMO EN LOS DOS CASOS.

   Alrededor del CENTRO de la ciudad hacen falta 4 km: el centro es un
   punto convenido, no donde estás, y a 500 m de la Plaza de Bolívar no
   hay por qué encontrar nada que te sirva.

   Alrededor de TI, 4 km es absurdo por los dos lados. Por el de quien
   lee, porque «un café a 4 km» no es un café al que se va andando, que
   es lo único que se pregunta al tocar la taza. Y por el del mapa,
   porque pedir todas las cafeterías en 50 km² del centro de Bogotá
   —una de las zonas más cartografiadas que hay— es la consulta que se
   queda pensando hasta que se acaba la espera. Los dos síntomas que se
   contaron, «se queda cargando» y «me da todas las cafeterías de
   Bogotá», eran esta misma línea.

   1,2 km es un paseo de quince minutos. */
export const RADIO = 4000;
export const RADIO_CERCA = 1200;

/* ── LA CONSULTA ─────────────────────────────────────────────── */

/**
 * La consulta de Overpass, en su propio lenguaje.
 *
 * `out center` y no `out`: una biblioteca suele estar dibujada como el
 * contorno del edificio y no como un punto, y sin `center` esos vuelven
 * sin coordenadas y no se pueden poner en un mapa.
 */
export function consultaOverpass(centro, { radio = null, tipos = TIPOS, espera = 25 } = {}) {
  if (!centro || !Number.isFinite(centro.lat) || !Number.isFinite(centro.lon)) return null;
  const lat = centro.lat.toFixed(5);
  const lon = centro.lon.toFixed(5);
  /* Un `radio` de fuera MANDA sobre el de cada clase: es lo que pasa
     buscando cerca de ti, donde el círculo lo decide el paseo y no la
     rareza de lo que se busca. Sin él, cada clase usa el suyo. */
  const cuerpo = tipos
    .flatMap((t) => {
      const r = radio ?? t.radio ?? RADIO;
      return t.consulta.flatMap((filtro) => ['node', 'way']
        .map((q) => `  ${q}[${filtro}](around:${r},${lat},${lon});`));
    })
    .join('\n');
  return `[out:json][timeout:${espera}];\n(\n${cuerpo}\n);\nout center 300;`;
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
export function agrupar(lugares, centro, { tope = TOPE_POR_TIPO, foco = 'todo' } = {}) {
  const limpios = quitarRepetidos(lugares);
  return TIPOS.filter((t) => enFoco(t.id, foco)).map((t) => ({
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

/* Desde dónde se mide, y por qué se dice siempre.

   «A 400 m» a secas lo entiende cualquiera como «de ti». Si la lista
   está medida desde el centro de la ciudad —que es lo que pasa cuando
   se busca un sitio para quedar con alguien— esa frase estaría dando a
   entender que la app sabe dónde estás, que es justo lo que no hace.
   Así que el origen va escrito en la frase, siempre, y cambia cuando
   cambia de verdad. */
export const DESDE = {
  centro: 'del centro',
  ti: 'de ti',
};

/** «A 400 m del centro», «A 2,1 km de ti». */
export function distanciaTexto(km, desde = 'centro') {
  if (!Number.isFinite(km)) return '';
  const cola = DESDE[desde] || DESDE.centro;
  if (km < 1) return `A ${Math.max(1, Math.round(km * 10)) * 100} m ${cola}`;
  return `A ${km.toFixed(1).replace('.', ',')} km ${cola}`;
}

/* ── PARA QUÉ SE ABRE LA HOJA ────────────────────────────────

     «Quiero esa funcionalidad también para cuando quiera ir a leer a un
      cafesito: que me dé opciones, no solo para el intercambio de
      libros, sino saber dónde puedo leer y comprar libros.»

   Y tiene razón: los sitios son los mismos, pero lo que se va a hacer
   con ellos no. Quedar con alguien es una cosa —hay otra persona
   esperando una propuesta— y buscar dónde pasar una tarde leyendo es
   otra, sin nadie al otro lado.

   La diferencia que importa está en la última línea de cada uno:

     · QUEDAR mide siempre desde el centro de la ciudad, terreno neutral
       y el mismo para las dos personas. Ahí NO se ofrece buscar cerca
       de ti, y no por falta de ganas: la lista que se enseña acaba
       convertida en una propuesta que ve la otra persona, así que
       cuanto menos dependa de dónde estás, mejor.

     · LEER es cosa tuya y de nadie más. Ahí sí se puede buscar cerca de
       ti, porque no hay nadie a quien contárselo. */
export const PROPOSITOS = {
  quedar: {
    titulo: 'Dónde quedar',
    lede: (ciudad) => `Sitios públicos por el centro de ${ciudad}.`,
    pie: 'Toca uno y se escribe la propuesta en la conversación. '
      + 'No se manda hasta que le des a Enviar.',
    cercaDeMi: false,
  },
  leer: {
    titulo: 'Dónde leer y comprar libros',
    lede: (ciudad) => `Cafeterías, librerías y bibliotecas de ${ciudad}.`,
    pie: 'Toca uno para verlo en el mapa.',
    cercaDeMi: true,
  },
};

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
  /* DOS SERVICIOS, DOS AVISOS. Antes los dos caían en el mismo —«el
     mapa no contesta»— y eso dejaba a todo el mundo a ciegas: ni quien
     lo lee sabe qué falló, ni quien lo arregla puede saberlo por lo que
     le cuenten. Es el mismo error que ya se había arreglado en la
     búsqueda de libros y que aquí volví a cometer.

     Y hay una diferencia práctica, no solo de precisión: si lo que
     falla es SITUAR LA CIUDAD, buscar cerca de donde estás sí funciona,
     porque ese camino no pasa por ahí. */
  'ciudad-caida': 'No hemos podido situar tu ciudad en el mapa ahora mismo. '
    + 'Si estás fuera de casa, prueba a buscar cerca de donde estás: '
    + 'ese camino no necesita este paso.',
  /* AQUÍ SE PROMETÍA UNA SALIDA QUE DABA AL MISMO MURO.

       «Esa opción está apareciendo, pero cuando no encuentra nada a la
        primera igual no funciona.»

     Y tenía toda la razón. Debajo de este aviso se ofrecía «buscar cerca
     de donde estoy» como si fuera otro camino, y no lo es: buscar cerca
     de ti se salta a Nominatim —el que sitúa la ciudad— pero le pregunta
     al MISMO Overpass que acaba de no contestar. Ofrecerlo aquí era
     mandar a la gente contra la misma pared, con un botón bonito.

     No es inútil del todo: la búsqueda de cerca es mucho más pequeña
     —1,2 km alrededor de ti contra 4 km del centro— y una consulta
     pequeña sí puede pasar donde la grande se atragantó. Pero eso hay
     que DECIRLO, no dejar que se entienda que es otro servicio. */
  'mapa-caido': 'El mapa no contesta ahora mismo. No es que no haya sitios: '
    + 'es que no hemos podido preguntar. Buscar cerca de donde estás le pregunta '
    + 'a lo mismo, pero mucho menos, y a veces por ahí sí pasa.',
  'sin-resultados': 'No encontramos cafeterías, librerías ni bibliotecas por el centro '
    + 'de tu ciudad. El mapa lo mantiene gente voluntaria y a veces falta.',
  /* «Aquí no hay nada» y «en esta ciudad no hay nada» no son lo mismo, y
     confundirlos deja a quien lee en un callejón: buscando a un paseo de
     donde está es normalísimo que no salga nada —un barrio de casas a
     las diez de la noche— y decirle que su ciudad no tiene cafeterías es
     mentira y además no le deja ningún sitio a donde ir. Así que este
     aviso dice que se ha mirado cerca, y la pantalla ofrece el centro. */
  'sin-resultados-cerca': 'No hay cafeterías, librerías ni bibliotecas '
    + 'a un paseo de donde estás, o el mapa no las tiene todavía.',
};

/** ¿Este fracaso se arregla volviendo a intentarlo? */
export const sePuedeReintentar = (motivo) => motivo === 'mapa-caido' || motivo === 'ciudad-caida';

/* De dónde salen los datos. Va en pantalla porque la licencia lo pide y
   porque está bien decir quién ha hecho el trabajo. */
export const CREDITO = 'Sitios de OpenStreetMap, que mantiene gente voluntaria.';
