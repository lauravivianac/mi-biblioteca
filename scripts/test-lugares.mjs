/* ─────────────────────────────────────────────────────────────
   DÓNDE LEER, COMPRAR Y QUEDAR  ·  historia #157

     npm run test:lugares

   La misma lista de sitios sirve para dos cosas distintas: quedar con
   alguien para intercambiar un libro, y buscar dónde ir a leer o a
   comprar el siguiente. Se comprueban las dos, y una tercera que
   importa más que las otras dos juntas.

   La primera es la corriente: que lo que devuelve el mapa se lea bien,
   que no salgan sitios repetidos, que una cadena con seis sucursales no
   se coma la lista, y que «no hay cafeterías» no se confunda nunca con
   «no hemos podido preguntar».

   ── Y LA SEGUNDA: QUE NO VUELVA EL PUNTO MEDIO ──────────────

   La idea evidente para «dónde quedamos» es proponer sitios a mitad de
   camino entre las dos personas. Suena justo y es un agujero:

     si a Laura le enseño el punto medio entre ella y Rafael, Laura sabe
     dónde está ella, así que Rafael está exactamente al otro lado —
     Rafael = 2 × punto_medio − Laura.

   O sea que un punto medio CONVIERTE el geohash recortado a un
   kilómetro de la historia #81 en la posición exacta de la otra
   persona. Toda la cautela de aquella historia se perdería aquí.

   Por eso la búsqueda se hace por CIUDAD y se ordena por distancia al
   CENTRO, que es público y el mismo para las dos. La prueba de abajo
   hace la resta: coge dos posiciones, calcula lo que se enseña, e
   intenta despejar la de la otra persona. Si algún día alguien mete el
   punto medio «porque es más útil», esa prueba se pone roja.
   ───────────────────────────────────────────────────────────── */

import {
  TIPOS, TOPE_POR_TIPO, consultaOverpass, leerRespuesta, distanciaKm,
  quitarRepetidos, agrupar, cuantos, distanciaTexto, enlaceMapa, propuesta,
  MOTIVOS, PROPOSITOS, sePuedeReintentar, FOCOS, PESTANAS, enFoco,
} from '../src/lugares-core.js';
import { geohash, PRECISION } from '../src/place-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
const ok = (nombre, condicion, detalle = '') => {
  if (condicion) { pasaron += 1; console.log(`  ✓ ${nombre}`); }
  else { fallaron += 1; console.log(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ''}`); }
};

/* Bogotá, que es donde vive quien pidió esto. */
const CENTRO = { lat: 4.7110, lon: -74.0721 };

const nodo = (id, tags, lat, lon) => ({ type: 'node', id, lat, lon, tags });

/* ── LA CONSULTA ─────────────────────────────────────────────── */

grupo('LO QUE SE LE PIDE AL MAPA');

const q = consultaOverpass(CENTRO);
ok('pide las tres clases de sitio',
  q.includes('"amenity"="library"') && q.includes('"shop"="books"') && q.includes('"amenity"="cafe"'));
ok('pregunta por puntos Y por edificios',
  q.includes('node[') && q.includes('way['),
  'una biblioteca suele estar dibujada como el contorno del edificio');
ok('pide el centro de los edificios, o volverían sin coordenadas',
  q.includes('out center'));
ok('lleva un tope de tiempo, para no quedarse colgada', q.includes('timeout'));
/* El tope de la consulta es lo que Overpass se permite tardar
   EJECUTÁNDOLA. El nuestro tiene que ser mayor, porque el tiempo que
   pasa de verdad es la cola MÁS la ejecución: estaban los dos en 20
   segundos y así cortábamos siempre justo cuando el otro terminaba. */
ok('y ese tope se puede ajustar desde fuera',
  consultaOverpass(CENTRO, { espera: 33 }).includes('[timeout:33]'));
ok('sin centro no hay consulta', consultaOverpass(null) === null);
ok('ni con coordenadas que no son números',
  consultaOverpass({ lat: 'x', lon: 2 }) === null);

/* ── LO QUE VUELVE ───────────────────────────────────────────── */

grupo('LO QUE VUELVE DEL MAPA');

const crudo = {
  elements: [
    nodo(1, { amenity: 'cafe', name: 'Café Pasaje', 'addr:street': 'Carrera 6', 'addr:housenumber': '10-20', opening_hours: 'Mo-Sa 08:00-20:00' }, 4.5980, -74.0760),
    nodo(2, { amenity: 'library', name: 'Biblioteca Luis Ángel Arango' }, 4.5965, -74.0730),
    { type: 'way', id: 3, center: { lat: 4.6000, lon: -74.0700 }, tags: { shop: 'books', name: 'Librería Lerner' } },
    nodo(4, { amenity: 'cafe' }, 4.60, -74.07),                       // sin nombre
    nodo(5, { amenity: 'pharmacy', name: 'Farmacia' }, 4.60, -74.07), // no es de las nuestras
    nodo(6, { amenity: 'cafe', name: 'Sin sitio' }, undefined, undefined), // sin coordenadas
  ],
};
const leidos = leerRespuesta(crudo);

ok('se queda con los tres que sirven', leidos.length === 3, `salieron ${leidos.length}`);
ok('un sitio SIN NOMBRE no entra: no se puede proponer',
  !leidos.some((l) => !l.nombre));
ok('una farmacia no entra', !leidos.some((l) => l.nombre === 'Farmacia'));
ok('un sitio sin coordenadas no entra', !leidos.some((l) => l.nombre === 'Sin sitio'));
ok('un edificio entra con su centro',
  leidos.find((l) => l.nombre === 'Librería Lerner')?.lat === 4.6);
ok('la dirección se junta con el número',
  leidos.find((l) => l.tipo === 'cafe')?.calle === 'Carrera 6 10-20');
ok('y el horario se conserva',
  leidos.find((l) => l.tipo === 'cafe')?.horario === 'Mo-Sa 08:00-20:00');
ok('cada clase se reconoce por su etiqueta',
  leidos.map((l) => l.tipo).sort().join() === 'biblioteca,cafe,libreria');
ok('una respuesta rota no revienta nada',
  leerRespuesta(null).length === 0 && leerRespuesta({}).length === 0);

/* ── REPETIDOS ───────────────────────────────────────────────── */

grupo('SIN REPETIRSE');

const dosVeces = [
  { id: 'node/1', tipo: 'cafe', nombre: 'Juan Valdez', lat: 4.6000, lon: -74.0700 },
  { id: 'way/2', tipo: 'cafe', nombre: 'Juan Valdez', lat: 4.60005, lon: -74.07005 }, // el mismo local
  { id: 'node/3', tipo: 'cafe', nombre: 'Juan Valdez', lat: 4.6500, lon: -74.1000 },  // otra sucursal
];
const unicos = quitarRepetidos(dosVeces);
ok('el mismo local dibujado dos veces cuenta una',
  unicos.length === 2, `quedaron ${unicos.length}`);
ok('pero dos sucursales de verdad sobreviven las dos',
  unicos.some((l) => l.lat === 4.65));

/* ── AGRUPAR Y ORDENAR ───────────────────────────────────────── */

grupo('LA LISTA QUE SE VE');

/* Nueve cafeterías: si no hubiera tope, se comerían la pantalla y las
   dos bibliotecas de la ciudad no se verían nunca. */
const muchas = [
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `node/c${i}`, tipo: 'cafe', nombre: `Café ${i}`,
    lat: CENTRO.lat + (i + 1) * 0.004, lon: CENTRO.lon,
  })),
  { id: 'node/b1', tipo: 'biblioteca', nombre: 'Biblioteca lejos', lat: CENTRO.lat + 0.05, lon: CENTRO.lon },
  { id: 'node/b2', tipo: 'biblioteca', nombre: 'Biblioteca cerca', lat: CENTRO.lat + 0.002, lon: CENTRO.lon },
];
const grupos = agrupar(muchas, CENTRO);

ok('las bibliotecas van primero, que son el mejor sitio para verse',
  grupos[0].id === 'biblioteca');
ok('las cafeterías tienen tope',
  grupos.find((g) => g.id === 'cafe').lugares.length === TOPE_POR_TIPO);
ok('dentro de cada clase, lo más céntrico primero',
  grupos[0].lugares[0].nombre === 'Biblioteca cerca');
ok('una clase sin sitios no deja un título vacío',
  !grupos.some((g) => g.lugares.length === 0));
ok('y se pueden contar', cuantos(grupos) === TOPE_POR_TIPO + 2);
ok('cada sitio lleva su distancia calculada',
  grupos[0].lugares.every((l) => Number.isFinite(l.km)));

/* ── QUE SE ENTIENDA ─────────────────────────────────────────── */

grupo('CÓMO SE LEE');

ok('cerca se dice en metros', distanciaTexto(0.42) === 'A 400 m del centro');
ok('lejos, en kilómetros y con coma', distanciaTexto(2.13) === 'A 2,1 km del centro');
/* De dónde se mide va SIEMPRE escrito, y no es un detalle de estilo:
   «a 400 m» a secas lo entiende cualquiera como «de ti», y si la lista
   está medida desde el centro esa frase estaría dando a entender que la
   app sabe dónde estás. */
ok('por defecto mide desde el centro, y lo dice',
  distanciaTexto(0.3).includes('del centro') && distanciaTexto(9).includes('del centro'));
ok('y si de verdad mide desde ti, lo dice también',
  distanciaTexto(0.42, 'ti') === 'A 400 m de ti');
ok('un origen que no existe no inventa nada raro',
  distanciaTexto(0.42, 'marte') === 'A 400 m del centro');

const sitio = { id: 'node/1', nombre: 'Café Pasaje', calle: 'Carrera 6 10-20', lat: 4.598, lon: -74.076 };
ok('el enlace del mapa es de OpenStreetMap',
  enlaceMapa(sitio).startsWith('https://www.openstreetmap.org/'));
ok('y lleva las coordenadas del sitio',
  enlaceMapa(sitio).includes('4.598000') && enlaceMapa(sitio).includes('-74.076000'));

const frase = propuesta(sitio);
ok('la propuesta pregunta, no ordena', frase.startsWith('¿Nos vemos en Café Pasaje?'));
ok('lleva la dirección', frase.includes('Carrera 6 10-20'));
ok('y el mapa', frase.includes('openstreetmap.org'));
ok('si no cabe, se va el enlace y se queda el nombre',
  propuesta(sitio, { max: 40 }).includes('Café Pasaje')
  && !propuesta(sitio, { max: 40 }).includes('openstreetmap'));
ok('sin sitio no hay frase', propuesta(null) === '');

/* ── LOS DOS FRACASOS, QUE NO SON EL MISMO ───────────────────── */

grupo('CUANDO NO SE PUEDE');

ok('«no hay sitios» y «no pudimos preguntar» son mensajes distintos',
  MOTIVOS['sin-resultados'] !== MOTIVOS['mapa-caido']);
ok('y el del mapa caído dice que NO es que no haya sitios',
  /no es que no haya sitios/i.test(MOTIVOS['mapa-caido']));
ok('sin ciudad se explica qué falta, sin pedir la dirección',
  /ciudad/i.test(MOTIVOS['sin-ciudad']) && /no se pide la dirección/i.test(MOTIVOS['sin-ciudad']));
ok('hay un mensaje para cada motivo que devuelve la búsqueda',
  ['sin-ciudad', 'ciudad-desconocida', 'ciudad-caida', 'mapa-caido', 'sin-resultados']
    .every((m) => typeof MOTIVOS[m] === 'string' && MOTIVOS[m].length > 20));

/* ── DOS SERVICIOS, DOS FRACASOS ─────────────────────────────

     «No me deja ver los cafés o librerías» — con el aviso «el mapa no
      contesta ahora mismo» en pantalla.

   Y ese aviso salía tanto si falló SITUAR LA CIUDAD como si falló
   PREGUNTAR QUÉ HAY: dos servicios distintos detrás de la misma frase.
   Eso deja a ciegas a quien lo lee y también a quien lo arregla, que
   no puede saber cuál de los dos fue por lo que le cuenten.

   Y no es solo cuestión de precisión: si lo que falla es situar la
   ciudad, BUSCAR CERCA DE DONDE ESTÁS SÍ FUNCIONA, porque ese camino
   no pasa por ahí. */
ok('SITUAR LA CIUDAD y PREGUNTAR QUÉ HAY fallan con mensajes distintos',
  MOTIVOS['ciudad-caida'] !== MOTIVOS['mapa-caido']);
ok('y el de la ciudad propone el camino que sí funciona',
  /cerca de donde estás/i.test(MOTIVOS['ciudad-caida']));
ok('los dos se pueden reintentar',
  sePuedeReintentar('ciudad-caida') && sePuedeReintentar('mapa-caido'));
ok('pero «no hay nada cartografiado» no: reintentar no lo cambia',
  !sePuedeReintentar('sin-resultados') && !sePuedeReintentar('sin-ciudad'));

/* ── LA PRUEBA QUE IMPORTA ───────────────────────────────────── */

grupo('EL PUNTO MEDIO NO PUEDE VOLVER');

/* Dos personas de la misma ciudad, a kilómetros la una de la otra. */
const LAURA = { lat: 4.6700, lon: -74.0550 };
const RAFAEL = { lat: 4.7450, lon: -74.0900 };

/* Lo que la app calcula: la lista sale del CENTRO DE LA CIUDAD y de
   nada más. `agrupar` ni siquiera recibe a las personas. */
const catalogo = Array.from({ length: 12 }, (_, i) => ({
  id: `node/x${i}`, tipo: 'cafe', nombre: `Café ${i}`,
  lat: CENTRO.lat + (i - 6) * 0.006, lon: CENTRO.lon + (i - 6) * 0.004,
}));
const paraLaura = agrupar(catalogo, CENTRO);
const paraRafael = agrupar(catalogo, CENTRO);

const enTexto = (g) => JSON.stringify(g.map((x) => x.lugares.map((l) => l.id)));
ok('LAS DOS VEN EXACTAMENTE LA MISMA LISTA',
  enTexto(paraLaura) === enTexto(paraRafael),
  'si dependiera de quién mira, dependería de dónde está');

/* LA COMPROBACIÓN DE VERDAD, y merece explicarse porque el primer
   intento medía otra cosa.

   Lo primero que escribí fue: coger cada sitio de la lista, tratarlo
   como si fuera un punto medio, despejar y ver si alguno cae encima de
   Rafael. Salió rojo — y estaba mal la prueba, no el código: con doce
   cafeterías repartidas por la ciudad, que UNA caiga por casualidad
   cerca del punto medio no delata nada, porque nadie sabe cuál es y
   porque la lista no ha mirado a Rafael para nada.

   Lo que de verdad hay que medir no es dónde caen los sitios, sino si
   la posición de Rafael INFLUYE en lo que ve Laura. Y eso se mide
   moviendo a Rafael por toda la ciudad: si la lista de Laura no cambia
   ni un byte, no hay ninguna información de Rafael dentro de ella.
   Ninguna, ni poca ni sutil.

   Una implementación con punto medio suspende esta prueba en el primer
   movimiento. */
const referencia = enTexto(agrupar(catalogo, CENTRO));
let cambios = 0;
for (let dLat = -0.08; dLat <= 0.08; dLat += 0.02) {
  for (let dLon = -0.08; dLon <= 0.08; dLon += 0.02) {
    const rafaelSeMueve = { lat: RAFAEL.lat + dLat, lon: RAFAEL.lon + dLon };
    /* Se le pasa a la función TODO lo que la app sabe de la otra
       persona. Si algún día `agrupar` lo aceptara y lo usara, esto
       cambiaría. */
    const lista = enTexto(agrupar(catalogo, CENTRO, { otra: rafaelSeMueve }));
    if (lista !== referencia) cambios += 1;
  }
}
ok('MOVER A LA OTRA PERSONA POR TODA LA CIUDAD NO CAMBIA LA LISTA',
  cambios === 0,
  `cambió en ${cambios} de 81 posiciones — algo de su posición se está colando`);

/* Y la demostración de que el peligro era real y no teórico: con el
   punto medio que NO se usa, la resta acierta de lleno. */
const espejo = (punto, yo) => ({ lat: 2 * punto.lat - yo.lat, lon: 2 * punto.lon - yo.lon });
const medio = { lat: (LAURA.lat + RAFAEL.lat) / 2, lon: (LAURA.lon + RAFAEL.lon) / 2 };
ok('(con un punto medio, despejar la posición ajena es exacto — por eso no se usa)',
  distanciaKm(espejo(medio, LAURA), RAFAEL) < 0.001);

/* La lista tampoco puede depender del geohash de nadie: el de Laura y
   el de Rafael son distintos, y `agrupar` no los recibe. */
ok('el geohash que sí se comparte sigue siendo de un kilómetro',
  geohash(LAURA.lat, LAURA.lon).length === PRECISION && PRECISION === 6);
ok('y `agrupar` no acepta a ninguna persona, solo el centro',
  agrupar.length <= 3);

/* ── LOS DOS PROPÓSITOS ──────────────────────────────────────

     «Quiero esa funcionalidad también para cuando quiera ir a leer a un
      cafesito: que me dé opciones, no solo para el intercambio de
      libros, sino saber dónde puedo leer y comprar libros.»

   Los sitios son los mismos y lo que se hace con ellos no. Y hay una
   diferencia que NO es cosmética: solo buscando dónde leer se ofrece
   buscar cerca de ti. Quedando, la lista acaba convertida en una
   propuesta que ve la otra persona. */

grupo('QUEDAR Y LEER NO SON LO MISMO');

ok('hay un modo para quedar y otro para leer',
  Boolean(PROPOSITOS.quedar && PROPOSITOS.leer));
ok('y se llaman distinto en pantalla',
  PROPOSITOS.quedar.titulo !== PROPOSITOS.leer.titulo);
ok('el de leer habla de leer Y de comprar, que era lo que se pidió',
  /leer/i.test(PROPOSITOS.leer.titulo) && /comprar/i.test(PROPOSITOS.leer.titulo));
ok('QUEDANDO NO SE OFRECE BUSCAR CERCA DE TI',
  PROPOSITOS.quedar.cercaDeMi === false,
  'esa lista acaba siendo una propuesta que ve la otra persona');
ok('leyendo sí, porque no hay nadie al otro lado',
  PROPOSITOS.leer.cercaDeMi === true);
ok('los dos explican qué pasa al tocar un sitio',
  PROPOSITOS.quedar.pie.length > 10 && PROPOSITOS.leer.pie.length > 10);
ok('y quedando se avisa de que no se manda solo',
  /no se manda/i.test(PROPOSITOS.quedar.pie));
ok('cada uno sabe presentarse con el nombre de la ciudad',
  PROPOSITOS.leer.lede('Bogotá').includes('Bogotá')
  && PROPOSITOS.quedar.lede('Bogotá').includes('Bogotá'));

/* ── LOS DOS ATAJOS DEL MARGEN ───────────────────────────────

     «Esa funcionalidad está muy oculta. Me gustaría que fuera más
      intuitiva, como un botón del lado izquierdo en el margen, con una
      taza de café y una como una tienda, así pudiera abrir dónde tomar
      café y dónde comprar.»

   Estaba detrás de un botón dentro de la Biblioteca, entre otros dos.
   Ahora hay dos botones en el margen, y cada uno abre LO SUYO: un
   atajo que te deja delante de una lista donde todavía hay que buscar
   no es un atajo. */

grupo('CAFÉ Y TIENDA, CADA UNO A LO SUYO');

ok('el atajo del café enseña cafeterías y nada más',
  FOCOS.cafe.tipos.join() === 'cafe');
ok('el de la tienda, librerías y nada más',
  FOCOS.comprar.tipos.join() === 'libreria');
ok('y «todo» no filtra nada', FOCOS.todo.tipos === null);
ok('cada uno se llama por lo que hace',
  /caf/i.test(FOCOS.cafe.titulo) && /comprar/i.test(FOCOS.comprar.titulo));

ok('una cafetería entra en el foco del café', enFoco('cafe', 'cafe'));
ok('y una librería no', !enFoco('libreria', 'cafe'));
ok('en «todo» entra todo',
  ['cafe', 'libreria', 'biblioteca'].every((t) => enFoco(t, 'todo')));
ok('un foco que no existe no esconde nada', enFoco('biblioteca', 'marte'));

/* Filtrar de verdad la lista, no solo el título. */
const soloCafes = agrupar(muchas, CENTRO, { foco: 'cafe' });
ok('AL ENTRAR POR EL CAFÉ, la lista trae solo cafeterías',
  soloCafes.length === 1 && soloCafes[0].id === 'cafe');
ok('y por la tienda, ninguna cafetería se cuela',
  !agrupar(muchas, CENTRO, { foco: 'comprar' }).some((g) => g.id === 'cafe'));

/* Pero un atajo no puede ser un callejón. */
ok('desde dentro se puede volver a verlo todo',
  PESTANAS.some((p) => p.id === 'todo'));
ok('y llegar a los otros dos sin salir de la hoja',
  PESTANAS.some((p) => p.id === 'cafe') && PESTANAS.some((p) => p.id === 'comprar'));
ok('cada pestaña corresponde a un foco de verdad',
  PESTANAS.every((p) => FOCOS[p.id]));

/* Los iconos son del pliego de la app, no emojis. `src/icons.js`
   explica por qué: un emoji lo dibuja el teléfono, cada uno el suyo, y
   una fila de ellos es lo que hace que una app parezca hecha por una
   máquina. Que el símbolo exista en el HTML lo comprueba
   `test:pantallas`, que busca iconos huérfanos. */
ok('las tres clases usan iconos dibujados, no emojis',
  TIPOS.every((t) => /^[a-z]+$/.test(t.icono)),
  TIPOS.map((t) => t.icono).join(', '));

/* ── LO QUE SE PROMETE ───────────────────────────────────────── */

grupo('LAS TRES CLASES DE SITIO');

ok('son las que ya recomienda la hoja de seguridad',
  TIPOS.map((t) => t.id).sort().join() === 'biblioteca,cafe,libreria');
ok('cada una con su icono y su nombre',
  TIPOS.every((t) => t.icono && t.label && t.consulta.length));

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.\n`);
process.exit(fallaron ? 1 : 0);
