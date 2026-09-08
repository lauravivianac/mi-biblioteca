/* ─────────────────────────────────────────────────────────────
   ¿SE BUSCA CERCA DE TI, O TODA LA CIUDAD?

     npm run test:cerca

   POR QUÉ EXISTE:

     «Se queda cargando. No me está pidiendo acceso a mi ubicación para
      buscar las cafeterías ni las tiendas. Debería funcionar de esa
      forma, así no me da todas las cafeterías de Bogotá.»

   Las dos mitades de esa frase eran EL MISMO FALLO. Al tocar la taza se
   buscaba siempre alrededor del centro de la ciudad y con 4 km de
   radio, o sea todas las cafeterías en 50 km² del centro de Bogotá —una
   de las zonas más cartografiadas del mundo—. Esa consulta es la que se
   queda pensando hasta que se acaba la espera, y si llega a contestar,
   contesta con una lista de sitios a los que no vas a ir.

   Pedir la ubicación al abrir arregla las dos cosas a la vez: la
   respuesta sirve, y la consulta es pequeña.

   ── LO QUE SE COMPRUEBA AQUÍ ────────────────────────────────

   No la lógica pura —de eso va test:lugares— sino LA SECUENCIA: quién
   pregunta qué y en qué orden al abrir la hoja. Por eso se importa
   `lugaresui.js` de verdad, con un DOM de mentira y un `fetch` de
   mentira que apunta todo lo que se le pide, igual que en test:seguir.

   La red no se toca: si esta prueba necesitara internet para pasar,
   sería roja en cualquier sitio donde el mapa esté caído, que es
   exactamente el día en que más falta hace.
   ───────────────────────────────────────────────────────────── */

const almacen = new Map();
globalThis.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: (k) => almacen.delete(k), clear: () => almacen.clear(),
};
globalThis.location = { hostname: 'localhost', href: 'http://localhost/', origin: 'http://localhost' };
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, location: globalThis.location, open() {},
};

/* Un nodo del tamaño justo para lo que tocan `openSheet` y `closeSheet`:
   clases, estilo y contenido. Nada más. */
const nodos = new Map();
const hueco = (id) => {
  const clases = new Set();
  nodos.set(id, {
    id,
    innerHTML: '',
    textContent: '',
    style: {},
    classList: {
      add: (c) => clases.add(c),
      remove: (c) => clases.delete(c),
      contains: (c) => clases.has(c),
    },
  });
};
['lugares-overlay', 'lugares-body', 'lugares-titulo'].forEach(hueco);
globalThis.document = {
  visibilityState: 'visible', addEventListener() {},
  getElementById: (id) => nodos.get(id) || null,
  querySelectorAll: () => [], querySelector: () => null,
  body: { classList: { add() {}, remove() {} } },
};

/* ── LOS DOS SERVICIOS, DE MENTIRA ───────────────────────────
   `navigator` lo montamos nosotros, así que la ventana del permiso no
   existe y podemos decidir qué contesta. */

const pedidos = [];          // todo lo que se le pidió a la red, en orden
let permiso = 'prompt';
let posicion = { lat: 4.6510, lon: -74.0550 };   // Chapinero, no el centro
let veces = 0;               // cuántas veces se preguntó DÓNDE ESTÁS

/* `defineProperty` y no una asignación: Node ya trae su propio
   `navigator` y solo tiene lectura. Se conserva lo que traía —hay
   módulos que miran `userAgent`— y se le añade lo de aquí. */
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  writable: true,
  value: {
    ...globalThis.navigator,
    userAgent: globalThis.navigator?.userAgent || 'node',
    onLine: true,
    permissions: { query: async () => ({ state: permiso }) },
    geolocation: {
      getCurrentPosition(bien, mal) {
        veces += 1;
        if (permiso === 'denied' || !posicion) { mal({ code: 1 }); return; }
        bien({ coords: { latitude: posicion.lat, longitude: posicion.lon } });
      },
    },
  },
});

/* Un `fetch` que no sale de aquí. Nominatim contesta el centro de
   Bogotá; Overpass contesta dos sitios, uno de cada clase. */
const CENTRO = { lat: 4.7110, lon: -74.0721 };
let overpassResponde = () => ({
  elements: [
    { type: 'node', id: 1, lat: 4.6512, lon: -74.0551, tags: { amenity: 'cafe', name: 'Café de al lado' } },
    { type: 'node', id: 2, lat: 4.6515, lon: -74.0553, tags: { shop: 'books', name: 'Librería de al lado' } },
  ],
});

globalThis.fetch = async (url, opciones = {}) => {
  const dir = String(url);
  if (dir.includes('nominatim')) {
    pedidos.push({ que: 'ciudad', url: dir });
    return { ok: true, status: 200, json: async () => [{ lat: CENTRO.lat, lon: CENTRO.lon }] };
  }
  pedidos.push({ que: 'mapa', url: dir, consulta: String(opciones.body || '') });
  const cuerpo = overpassResponde();
  if (cuerpo instanceof Error) throw cuerpo;
  return { ok: true, status: 200, json: async () => cuerpo };
};

const store = await import('../src/store.js');
const lugaresui = await import('../src/lugaresui.js');
const { RADIO, RADIO_CERCA, MOTIVOS } = await import('../src/lugares-core.js');

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
const ok = (nombre, condicion, detalle = '') => {
  if (condicion) { pasaron += 1; console.log(`  ✓ ${nombre}`); } else {
    fallaron += 1; console.log(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  }
};

await store.loadStore('uid-laura');
store.setPlace({ city: 'Bogotá', country: 'Colombia' });

/* Cada escenario empieza en limpio: sin caché, sin cuentas y con la
   hoja cerrada, o el segundo mediría los restos del primero. */
async function abrir(cual, { estado = 'prompt', donde = { lat: 4.6510, lon: -74.0550 } } = {}) {
  lugaresui.closeLugares();
  almacen.clear();
  pedidos.length = 0;
  veces = 0;
  permiso = estado;
  posicion = donde;
  await lugaresui[cual]();
  return nodos.get('lugares-body').innerHTML;
}

const alMapa = () => pedidos.filter((p) => p.que === 'mapa');
const radioDe = (p) => Number(/around:(\d+)/.exec(p.consulta || '')?.[1]);

/* ── LO QUE SE PIDIÓ ─────────────────────────────────────────── */

grupo('AL TOCAR LA TAZA, PRIMERO PREGUNTA DÓNDE ESTÁS');

const pantalla = await abrir('openDondeTomarCafe');

ok('SE PIDE LA UBICACIÓN, que era lo que no pasaba', veces === 1);
ok('y se pide ANTES de preguntarle al mapa',
  alMapa().length === 1 && veces === 1,
  `${veces} veces la ubicación, ${alMapa().length} al mapa`);
ok('sabiendo dónde estás, NO se le pregunta la ciudad a Nominatim',
  !pedidos.some((p) => p.que === 'ciudad'),
  'situar la ciudad es una consulta que ya no hace falta hacer');

grupo('Y SE BUSCA ALREDEDOR DE TI, NO DEL CENTRO');

const consulta = alMapa()[0];
ok('la consulta va centrada en donde estás',
  consulta.consulta.includes('4.65100') && consulta.consulta.includes('-74.05500'),
  consulta.consulta.split('\n')[1]);
ok('NO en el centro de Bogotá', !consulta.consulta.includes('4.71100'));
ok(`y con el radio corto (${RADIO_CERCA} m, no ${RADIO})`,
  radioDe(consulta) === RADIO_CERCA, `salió ${radioDe(consulta)}`);
ok('que es de verdad mucho más pequeño', RADIO_CERCA * 2 < RADIO);
ok('la pantalla dice desde dónde está midiendo',
  pantalla.includes('de donde estás'), pantalla.slice(0, 120));

/* Y el porqué del radio corto, con números: el área crece con el
   CUADRADO del radio, así que no es «tres veces menos mapa». */
grupo('POR QUÉ ESO ARREGLA LO DE «SE QUEDA CARGANDO»');

const area = (r) => Math.PI * (r / 1000) ** 2;
ok(`4 km alrededor del centro son ${area(RADIO).toFixed(0)} km² de Bogotá`,
  area(RADIO) > 45);
ok(`y un paseo son ${area(RADIO_CERCA).toFixed(1)} km²`, area(RADIO_CERCA) < 5);
ok('O SEA MÁS DE DIEZ VECES MENOS MAPA que mirar',
  area(RADIO) / area(RADIO_CERCA) > 10,
  'el área va con el cuadrado del radio, no con el radio');

/* ── SIN PERMISO NO SE ROMPE NADA ────────────────────────────── */

grupo('SI DICE QUE NO, LOS DEL CENTRO COMO SIEMPRE');

const sinPermiso = await abrir('openDondeTomarCafe', { estado: 'denied' });

ok('NO se enseña la ventana del permiso otra vez', veces === 0,
  'con el permiso bloqueado el navegador no la enseña: solo se espera');
ok('se sitúa la ciudad', pedidos.some((p) => p.que === 'ciudad'));
ok('y se busca por el centro', radioDe(alMapa()[0]) === RADIO);
ok('salen sitios igual, que es lo que había antes',
  sinPermiso.includes('Café de al lado'));
ok('y sigue estando el botón para intentarlo cuando se pueda',
  sinPermiso.includes('buscarCercaDeMi()'));

/* Que el teléfono no sepa situarse no es lo mismo que decir que no, y
   tiene que acabar igual de bien. */
grupo('SI EL TELÉFONO NO SABE SITUARSE, TAMBIÉN');

const sinGps = await abrir('openDondeTomarCafe', { donde: null });
ok('se intentó', veces === 1);
ok('y aun así hay sitios en pantalla', sinGps.includes('Café de al lado'));
ok('medidos desde el centro', sinGps.includes('del centro'));

/* ── QUEDANDO CON ALGUIEN, NUNCA ─────────────────────────────── */

grupo('QUEDANDO NO SE PIDE LA UBICACIÓN, NI AL ABRIR NI NUNCA');

/* La regla entera está en lugares-core.js: la lista acaba siendo una
   propuesta que ve la otra persona, así que cuanto menos dependa de
   dónde estás, mejor. Esto es lo que impide que este arreglo se la
   lleve por delante de propina. */
await abrir('openLugares');

ok('NO SE PIDE LA UBICACIÓN', veces === 0);
ok('se sitúa la ciudad, como siempre', pedidos.some((p) => p.que === 'ciudad'));
ok('y se busca por el centro, con el radio de siempre',
  radioDe(alMapa()[0]) === RADIO);

/* ── SIN CIUDAD PERO CON GPS ─────────────────────────────────── */

grupo('Y AHORA SÍ SE PUEDE BUSCAR SIN HABER DICHO LA CIUDAD');

store.clearPlace();
const sinCiudad = await abrir('openDondeTomarCafe');

ok('el teléfono sabe dónde está, así que se busca', alMapa().length === 1);
ok('y salen sitios', sinCiudad.includes('Café de al lado'));
ok('NO se enseña «dinos en qué ciudad estás»',
  !sinCiudad.includes(MOTIVOS['sin-ciudad'].slice(0, 40)),
  'antes esto bloqueaba la hoja aunque el teléfono supiera dónde estabas');

/* Pero sin ninguna de las dos, hay que decirlo. */
const aCiegas = await abrir('openDondeTomarCafe', { estado: 'denied' });
ok('sin ciudad Y sin ubicación, sí se pide la ciudad',
  aCiegas.includes(MOTIVOS['sin-ciudad'].slice(0, 40)));
ok('y no se le pregunta nada al mapa', alMapa().length === 0);

store.setPlace({ city: 'Bogotá', country: 'Colombia' });

/* ── NO HAY NADA CERCA: NO PUEDE SER UN CALLEJÓN ─────────────── */

grupo('SI NO HAY NADA A UN PASEO, HAY POR DÓNDE SALIR');

overpassResponde = () => ({ elements: [] });
const vacio = await abrir('openDondeTomarCafe');

ok('se dice que se ha mirado CERCA, no que la ciudad no tenga nada',
  vacio.includes('a un paseo de donde estás'), vacio.slice(0, 160));
ok('Y SE OFRECE VER LOS DEL CENTRO', vacio.includes('volverAlCentro()'),
  'sin esto, buscar cerca y no encontrar nada es un callejón sin salida');
overpassResponde = () => ({
  elements: [
    { type: 'node', id: 1, lat: 4.6512, lon: -74.0551, tags: { amenity: 'cafe', name: 'Café de al lado' } },
  ],
});

/* ── LA DESPENSA NO GUARDA DÓNDE ESTÁS ───────────────────────── */

grupo('TU POSICIÓN NO SE ESCRIBE EN EL DISCO');

/* OJO CON CÓMO SE MIDE ESTO. La primera versión buscaba «4.651» en lo
   guardado, y eso no medía nada: el café de mentira está en 4.6512, o
   sea que la cadena aparecía viniera de donde viniera. Es el mismo
   error que ya se documentó en la prueba del punto medio, cometido otra
   vez treinta líneas más abajo.
   Lo que hay que mirar no es un número suelto, sino QUÉ CLAVES SE
   ESCRIBEN: la lista de cerca de ti no puede llegar al disco de ninguna
   forma, y lo único que sí se guarda —el centro de la ciudad— es un
   dato público que no dice nada de nadie. */
await abrir('openDondeTomarCafe');
const claves = [...almacen.keys()];

ok('BUSCANDO CERCA DE TI NO SE GUARDA NINGUNA LISTA',
  !claves.some((k) => k.includes('sitios')), claves.join(', '));
ok('y no se guarda absolutamente nada más',
  claves.length === 0, claves.join(', '));

/* Y por contraste, para que se vea que la prueba distingue: buscando
   por el centro sí se guarda, y lo que se guarda es la ciudad. */
await abrir('openDondeTomarCafe', { estado: 'denied' });
const conCentro = [...almacen.keys()];
ok('por el centro sí se guarda, que para eso está la despensa',
  conCentro.some((k) => k.includes('sitios')), conCentro.join(', '));
ok('y lo guardado es el centro público de Bogotá, no tu posición',
  String(almacen.get('lugares.centro.bogota|colombia')).includes('4.711'),
  almacen.get('lugares.centro.bogota|colombia'));

await abrir('openDondeTomarCafe');

/* Pero tampoco se puede preguntar tres veces por lo mismo al cambiar de
   pestaña: eso es machacar un servicio gratuito para enseñar tres
   recortes de una respuesta que ya teníamos. */
grupo('CAMBIAR DE PESTAÑA NO VUELVE A PREGUNTARLE AL MAPA');

const antes = alMapa().length;
await lugaresui.verLugares('comprar');
await lugaresui.verLugares('todo');
ok('tres pestañas, una sola consulta', alMapa().length === antes,
  `${alMapa().length - antes} consultas de más`);

/* Y al cerrar, se olvida: es lo que promete el pie de la pantalla
   mientras se pide el permiso. */
grupo('AL CERRAR LA HOJA SE OLVIDA');

lugaresui.closeLugares();
pedidos.length = 0;
await lugaresui.openDondeTomarCafe();
ok('volver a abrirla vuelve a preguntar dónde estás', veces > 0);
ok('y vuelve a preguntarle al mapa', alMapa().length > 0,
  'si no, la lista de antes seguiría viva después de cerrar');

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.\n`);
process.exit(fallaron ? 1 : 0);
