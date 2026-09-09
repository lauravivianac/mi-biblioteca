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
const {
  RADIO, RADIO_CERCA, RADIO_CAFE, RADIO_RARO, MOTIVOS,
  DISTANCIAS, DISTANCIA_POR_DEFECTO, metrosDe,
} = await import('../src/lugares-core.js');

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
const ultimaConsulta = () => alMapa().at(-1)?.consulta || '';
const radioDe = (p) => Number(/around:(\d+)/.exec(p.consulta || '')?.[1]);
/* Todos los radios de una consulta, en orden y sin repetir el de `node`
   y el de `way`: ahora cada clase de sitio lleva el suyo. */
const radiosDe = (p) => [...new Set(
  [...String(p.consulta || '').matchAll(/around:(\d+)/g)].map((m) => Number(m[1])),
)];

/* SOLO LA PROSA, no la hoja entera.
   La primera versión buscaba «librerías» en todo el HTML y se ponía roja
   por la PESTAÑA que se llama así — que es un botón para cambiar de
   idea, no una afirmación de lo que se está buscando. Lo que se mide
   aquí es lo que la pantalla DICE: el párrafo de debajo del título y el
   aviso cuando algo falla. */
const prosa = (html) => [...String(html).matchAll(/<p class="planner-(?:lede|hint)">(.*?)<\/p>/gs)]
  .map((m) => m[1]).join(' ');

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

/* ── LO QUE SE LE PIDE AL MAPA, Y LO QUE NO ──────────────────── */

grupo('CADA ATAJO PIDE SOLO LO QUE VA A ENSEÑAR');

/* Esta es la pantalla que se envió: «Dónde comprar libros», el mapa sin
   contestar y tres servidores caídos en el detalle técnico. Se le
   estaba pidiendo al mapa TODAS LAS CAFETERÍAS DE BOGOTÁ para enseñar
   cuatro librerías y ninguna cafetería. */
await abrir('openDondeComprar', { estado: 'denied' });
const paraComprar = ultimaConsulta();

ok('«dónde comprar libros» pide librerías', paraComprar.includes('"shop"="books"'));
ok('Y NO PIDE NINGUNA CAFETERÍA', !paraComprar.includes('"amenity"="cafe"'),
  'era la parte cara de la consulta, y ni siquiera se iba a enseñar');
ok('ni bibliotecas', !paraComprar.includes('"amenity"="library"'));

await abrir('openDondeTomarCafe', { estado: 'denied' });
const paraCafe = ultimaConsulta();
ok('y «dónde tomar café» pide cafeterías', paraCafe.includes('"amenity"="cafe"'));
ok('y nada más', !paraCafe.includes('"shop"="books"'));

/* ── Y LO QUE DICE LA PANTALLA ───────────────────────────────── */

grupo('SI PREGUNTAS POR CAFÉ, NO TE HABLA DE TIENDAS');

/*   «Le pregunto por cafetería, me dice buscando tiendas.»

   El foco filtraba los resultados pero NO LAS PALABRAS. La lista salía
   bien, pero la frase de debajo del título seguía siendo «cafeterías,
   librerías y bibliotecas de Bogotá», y el aviso de cuando no hay nada
   nombraba las tres. Mientras carga y cuando falla, el texto es todo lo
   que hay en pantalla: si dice otra cosa, la app está buscando otra
   cosa. Es lo único que se puede concluir desde fuera. */

const conCafe = prosa(await abrir('openDondeTomarCafe', { estado: 'denied' }));
ok('la pantalla del café habla de cafeterías', /cafeterías/i.test(conCafe));
ok('Y NO NOMBRA LIBRERÍAS', !/librerías/i.test(conCafe), conCafe);
ok('ni bibliotecas', !/bibliotecas/i.test(conCafe), conCafe);

const conTienda = prosa(await abrir('openDondeComprar', { estado: 'denied' }));
ok('la de comprar libros habla de librerías', /librerías/i.test(conTienda));
ok('y no nombra cafeterías', !/cafeterías/i.test(conTienda), conTienda);

const conTodo = prosa(await abrir('openDondeLeer', { estado: 'denied' }));
ok('y entrando por «todo» sí se nombran las tres',
  /cafeterías/i.test(conTodo) && /librerías/i.test(conTodo) && /bibliotecas/i.test(conTodo),
  conTodo);

/* Pero la pestaña para cambiar de idea SIGUE ESTANDO: que la pantalla
   no te hable de librerías no puede significar que no puedas ir a
   verlas. Es la diferencia entre lo que se afirma y lo que se ofrece. */
const hojaDelCafe = await abrir('openDondeTomarCafe', { estado: 'denied' });
ok('y aun así se puede saltar a las librerías desde la pestaña',
  hojaDelCafe.includes("verLugares('comprar')"));

/* También cuando no hay nada que enseñar, que es cuando el texto es lo
   único que queda. */
overpassResponde = () => ({ elements: [] });
const nadaDeCafe = prosa(await abrir('openDondeTomarCafe', { estado: 'denied' }));
ok('sin resultados, el aviso habla de cafeterías', /cafeterías/i.test(nadaDeCafe));
ok('Y TAMPOCO AHÍ NOMBRA LIBRERÍAS', !/librerías/i.test(nadaDeCafe), nadaDeCafe);
overpassResponde = () => ({
  elements: [
    { type: 'node', id: 1, lat: 4.6512, lon: -74.0551, tags: { amenity: 'cafe', name: 'Café de al lado' } },
    { type: 'node', id: 2, lat: 4.6515, lon: -74.0553, tags: { shop: 'books', name: 'Librería de al lado' } },
  ],
});

/* ── LA SALIDA QUE NO LLEVABA A NINGUNA PARTE ────────────────── */

grupo('CON EL MAPA CAÍDO, NO SE PROMETE LO QUE NO SE PUEDE DAR');

/*   «Esa opción está apareciendo, pero cuando no encuentra nada a la
      primera igual no funciona.»

   Buscar cerca de ti se salta a Nominatim, pero le pregunta al MISMO
   Overpass. Ofrecerlo como si fuera otro camino era mandar a la gente
   contra la misma pared. */
overpassResponde = () => new Error('caído');
const caido = await abrir('openDondeComprar', { estado: 'denied' });

ok('se dice que no se ha podido preguntar', caido.includes('no hemos podido preguntar'));
ok('SE AVISA DE QUE CERCA DE TI PREGUNTA A LO MISMO',
  caido.includes('le pregunta') && caido.includes('a lo mismo'),
  'no puede parecer otro servicio, porque no lo es');
ok('y aun así se ofrece, porque la consulta pequeña sí puede pasar',
  caido.includes('buscarCercaDeMi()'));
ok('con el detalle técnico, que es lo que permitió arreglar esto',
  caido.includes('Detalle técnico'));

overpassResponde = () => ({
  elements: [
    { type: 'node', id: 1, lat: 4.6512, lon: -74.0551, tags: { amenity: 'cafe', name: 'Café de al lado' } },
    { type: 'node', id: 2, lat: 4.6515, lon: -74.0553, tags: { shop: 'books', name: 'Librería de al lado' } },
  ],
});

/* ── SIN PERMISO NO SE ROMPE NADA ────────────────────────────── */

grupo('SI DICE QUE NO, LOS DEL CENTRO COMO SIEMPRE');

const sinPermiso = await abrir('openDondeTomarCafe', { estado: 'denied' });

ok('NO se enseña la ventana del permiso otra vez', veces === 0,
  'con el permiso bloqueado el navegador no la enseña: solo se espera');
ok('se sitúa la ciudad', pedidos.some((p) => p.que === 'ciudad'));
ok('y se busca por el centro, con el radio del café',
  radioDe(alMapa()[0]) === RADIO_CAFE, `salió ${radioDe(alMapa()[0])}`);
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
ok('y se busca por el centro, con los radios de cada clase',
  radiosDe(alMapa()[0]).join() === [RADIO_RARO, RADIO_CAFE].join(),
  radiosDe(alMapa()[0]).join(' · '));

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

/* Cada pestaña pide LO SUYO —esa es la mitad del arreglo— pero volver a
   una ya vista no puede preguntar otra vez: eso sería machacar un
   servicio gratuito para enseñar algo que ya teníamos. */
grupo('CADA PESTAÑA PIDE LO SUYO, Y SOLO UNA VEZ');

const trasCafe = alMapa().length;
await lugaresui.verLugares('comprar');
ok('la pestaña de librerías es otra consulta', alMapa().length === trasCafe + 1);
ok('Y NO ARRASTRA LAS CAFETERÍAS', !ultimaConsulta().includes('"amenity"="cafe"'),
  ultimaConsulta().replace(/\n/g, ' '));

await lugaresui.verLugares('todo');
const trasTodo = alMapa().length;
await lugaresui.verLugares('cafe');
await lugaresui.verLugares('comprar');
ok('volver a una pestaña ya vista no vuelve a preguntar',
  alMapa().length === trasTodo, `${alMapa().length - trasTodo} consultas de más`);

/* Y al cerrar, se olvida: es lo que promete el pie de la pantalla
   mientras se pide el permiso. */
grupo('AL CERRAR LA HOJA SE OLVIDA');

lugaresui.closeLugares();
pedidos.length = 0;
await lugaresui.openDondeTomarCafe();
ok('volver a abrirla vuelve a preguntar dónde estás', veces > 0);
ok('y vuelve a preguntarle al mapa', alMapa().length > 0,
  'si no, la lista de antes seguiría viva después de cerrar');

/* ─────────────────────────────────────────────────────────────
   HASTA DÓNDE MIRAR  ·  «no se puede parametrizar dónde quiero buscar»
   ───────────────────────────────────────────────────────────── */

grupo('EL CÍRCULO LO ELIGE QUIEN BUSCA');

const cerquita = await abrir('openDondeTomarCafe');

ok('los botones de distancia están, buscando cerca de ti',
  DISTANCIAS.every((d) => cerquita.includes(`verHasta('${d.id}')`)),
  cerquita.slice(0, 200));
ok('se empieza por el paseo, que es la consulta barata',
  radioDe(alMapa()[0]) === metrosDe(DISTANCIA_POR_DEFECTO),
  `salió ${radioDe(alMapa()[0])}`);

const antesDeAmpliar = alMapa().length;
await lugaresui.verHasta('lejos');
ok('AMPLIAR PREGUNTA OTRA VEZ, con el círculo grande',
  alMapa().length === antesDeAmpliar + 1
    && radioDe(alMapa().at(-1)) === metrosDe('lejos'),
  `${alMapa().length - antesDeAmpliar} consultas · radio ${radioDe(alMapa().at(-1))}`);

/* Y la lista de 8 km no puede sobrescribir la de 1,2: son dos
   respuestas distintas a dos preguntas distintas. */
const trasAmpliar = alMapa().length;
await lugaresui.verHasta('paseo');
ok('y volver al paseo no vuelve a preguntar: cada radio guarda lo suyo',
  alMapa().length === trasAmpliar, `${alMapa().length - trasAmpliar} consultas de más`);
ok('pero sí vuelve a enseñar el paseo',
  nodos.get('lugares-body').innerHTML.includes('a un paseo de donde estás'));

/* Tocar el que ya está puesto no es una búsqueda nueva. */
const trasVolver = alMapa().length;
await lugaresui.verHasta('paseo');
ok('tocar la distancia que ya está no pregunta nada', alMapa().length === trasVolver);

/* Por el CENTRO de la ciudad el radio lo decide la clase de sitio —de
   bibliotecas hay tres y de cafeterías seiscientas—, así que aquí un
   control de distancia no mandaría sobre nada: enseñarlo sería mentir
   con tres botones. */
const porElCentro = await abrir('openDondeTomarCafe', { estado: 'denied' });
ok('POR EL CENTRO NO SE ENSEÑAN, que ahí no mandarían sobre nada',
  !porElCentro.includes('verHasta('), porElCentro.slice(0, 200));

/* ─────────────────────────────────────────────────────────────
   UNA RESPUESTA QUE LLEGA TARDE NO MANDA

   Antes esto era `if (cargando) return`, y hacía dos cosas malas: una
   búsqueda en marcha impedía empezar otra —cerrar y volver a abrir
   dejaba una ruedecita eterna— y la que llegaba pintaba encima aunque
   ya se hubiera cambiado de pestaña.
   ───────────────────────────────────────────────────────────── */

grupo('LA ÚLTIMA BÚSQUEDA ES LA QUE MANDA');

/* Un mapa que tarda: la respuesta se queda retenida hasta que se
   suelta a mano. Sin esto no hay forma de tener dos búsquedas vivas a
   la vez, que es justo el caso que se rompía. */
let soltar = null;
overpassResponde = () => ({
  elements: [
    { type: 'node', id: 9, lat: 4.6512, lon: -74.0551, tags: { amenity: 'cafe', name: 'Café lento' } },
  ],
});
const lento = new Promise((r) => { soltar = r; });
const fetchNormal = globalThis.fetch;
globalThis.fetch = async (url, opciones) => {
  const r = await fetchNormal(url, opciones);
  if (String(url).includes('nominatim')) return r;
  await lento;
  return r;
};

/* En limpio y CON permiso: la prueba de antes lo dejó denegado, y sin
   ubicación esto mediría la búsqueda por el centro, que es otra cosa.
   No se puede usar `abrir()` aquí porque espera a que termine, y lo que
   hay que provocar es justo una búsqueda a medias. */
lugaresui.closeLugares();
almacen.clear();
pedidos.length = 0;
veces = 0;
permiso = 'prompt';
posicion = { lat: 4.6510, lon: -74.0550 };
const enMarcha = lugaresui.openDondeTomarCafe();

/* HAY QUE ESPERAR A QUE LA CONSULTA HAYA SALIDO DE VERDAD.
   La primera versión de esto cerraba la hoja en la línea de después de
   abrirla, y eso no medía nada: la búsqueda todavía estaba pidiendo el
   permiso de ubicación, así que se cerraba ANTES de empezar y lo que
   venía después era una búsqueda normal y corriente. Se cierra cuando
   la pregunta ya está en el aire, que es el caso que se rompía. */
const hastaQue = async (cond, ms = 2000) => {
  const fin = Date.now() + ms;
  while (!cond() && Date.now() < fin) await new Promise((r) => { setTimeout(r, 5); });
  return cond();
};
ok('la consulta sale antes de cerrar (si no, esta prueba no mide nada)',
  await hastaQue(() => alMapa().length > 0), `${alMapa().length} consultas`);

/* Ahora sí: se cierra la hoja MIENTRAS busca. Lo que venga de camino ya
   no es de nadie: ni se pinta, ni —sobre todo— se queda en memoria. */
lugaresui.closeLugares();
soltar();
await enMarcha;

/* Lo primero, que no haya pintado sobre una hoja cerrada. */
ok('la respuesta que llegó tarde NO pinta en la hoja cerrada',
  !nodos.get('lugares-body').innerHTML.includes('Café lento'),
  nodos.get('lugares-body').innerHTML.slice(0, 160));

/* Y lo segundo, que es otra cosa: que tampoco se haya quedado
   guardada. Se mide con un mapa que ahora contesta OTRA cosa — si la
   lista de antes siguiera en memoria, saldría «Café lento» y no habría
   consulta ninguna. */
globalThis.fetch = fetchNormal;
overpassResponde = () => ({
  elements: [
    { type: 'node', id: 10, lat: 4.6512, lon: -74.0551, tags: { amenity: 'cafe', name: 'Café nuevo' } },
  ],
});

pedidos.length = 0;
await lugaresui.openDondeTomarCafe();
ok('cerrar mientras busca no deja la hoja atascada: se vuelve a buscar',
  alMapa().length > 0,
  'antes la búsqueda en marcha impedía empezar otra y quedaba una ruedecita eterna');
ok('Y LA QUE LLEGÓ TARDE NO SE QUEDÓ EN MEMORIA',
  nodos.get('lugares-body').innerHTML.includes('Café nuevo')
    && !nodos.get('lugares-body').innerHTML.includes('Café lento'),
  nodos.get('lugares-body').innerHTML.slice(0, 200));

/* ─────────────────────────────────────────────────────────────
   Y EL OTRO CASO, QUE NO SE ARREGLA SOLO CON CERRAR BIEN:
   CAMBIAR DE DISTANCIA MIENTRAS BUSCA.

   La hoja sigue abierta, así que nadie ha limpiado nada. Con el viejo
   `if (cargando) return`, tocar «más lejos» mientras cargaba el paseo
   no hacía NADA: ni preguntaba ni avisaba, y al llegar la respuesta del
   paseo pintaba la lista corta debajo de un botón de 8 km encendido.

   Aquí hacen falta dos consultas vivas a la vez, así que el mapa lento
   ya no es una promesa sola: cada consulta se queda colgada hasta que
   se la suelta a mano, y se sueltan AL REVÉS —primero la de 8 km y
   después la del paseo— para que la que llega tarde sea la vieja.
   ───────────────────────────────────────────────────────────── */

grupo('CAMBIAR DE DISTANCIA MIENTRAS BUSCA');

const colgadas = [];
globalThis.fetch = async (url, opciones) => {
  const r = await fetchNormal(url, opciones);
  if (String(url).includes('nominatim')) return r;
  await new Promise((soltarla) => { colgadas.push(soltarla); });
  return r;
};
/* Cada radio contesta un café distinto, que es lo que permite mirar la
   pantalla y saber CUÁL de las dos respuestas mandó. */
overpassResponde = () => {
  const r = radioDe(alMapa().at(-1));
  return {
    elements: [
      { type: 'node', id: r, lat: 4.6512, lon: -74.0551, tags: { amenity: 'cafe', name: `Café de ${r}` } },
    ],
  };
};

lugaresui.closeLugares();
almacen.clear();
pedidos.length = 0;
permiso = 'prompt';
posicion = { lat: 4.6510, lon: -74.0550 };

const elPaseo = lugaresui.openDondeTomarCafe();
ok('sale la consulta del paseo', await hastaQue(() => colgadas.length === 1),
  `${colgadas.length} consultas colgadas`);

/* Sin soltar la primera: se toca «más lejos». */
const masLejos = lugaresui.verHasta('lejos');
ok('TOCAR «MÁS LEJOS» MIENTRAS CARGA SÍ PREGUNTA',
  await hastaQue(() => colgadas.length === 2),
  'con el viejo «if (cargando) return» esto no hacía absolutamente nada');

/* Al revés: primero la de 8 km, y la del paseo llega después. */
colgadas[1]();
colgadas[0]();
await Promise.all([elPaseo, masLejos]);

const alFinal = nodos.get('lugares-body').innerHTML;
ok('Y MANDA LA ÚLTIMA, aunque la vieja llegue después',
  alFinal.includes(`Café de ${metrosDe('lejos')}`)
    && !alFinal.includes(`Café de ${metrosDe('paseo')}`),
  alFinal.slice(0, 200));
ok('el botón encendido y la lista dicen lo mismo',
  alFinal.includes('aria-pressed="true"') && alFinal.includes(`verHasta('lejos')`),
  nodos.get('lugares-body').innerHTML.slice(0, 200));

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.\n`);
process.exit(fallaron ? 1 : 0);
