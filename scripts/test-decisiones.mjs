/* ─────────────────────────────────────────────────────────────
   LO QUE LE CONTESTAS A LA MASCOTA, ¿SE GUARDA?

     npm run test:decisiones

   POR QUÉ EXISTE:

     «Ya le dije a Rita que lo dejó, pero queda en mi biblioteca. No se
      guarda mi decisión y sigue preguntando lo mismo, y no habilita el
      chat. Como que esas acciones no se están guardando.»

   Y no se guardaban. Dos de las tres respuestas no hacían nada útil, y
   el motivo es una confusión entre dos campos que se parecen:

     · `pinnedMonth` es la CHINCHETA: dice si el generador del plan
       puede mover el libro de mes.
     · `month` / `year` son el MES.

   Quien decide si un libro está atrasado es `stalledBooks`, y mira el
   MES. Así que quitar la chincheta —que es lo único que hacían «más
   adelante» y «traerlo a este mes»— no sacaba el libro de la lista de
   atrasados. Para el plan seguía siendo el libro de agosto, y al día
   siguiente la mascota volvía a preguntar exactamente lo mismo.

   ── Y POR ESO TAMPOCO SE PODÍA HABLAR CON ELLA ──────────────

   Con el ánimo en «rescatando» o «preguntando», tocar a la mascota
   abre la hoja de la pregunta y NUNCA el chat (ver `screens.js`). O
   sea que el mismo fallo cerraba las dos puertas: la mascota se
   quedaba clavada preguntando, y el chat quedaba detrás de una
   pregunta que no había forma de contestar para siempre.

   ── LA PARTE QUE SOLO SE VE RECARGANDO ──────────────────────

   Borrar el mes en memoria no basta. Los libros de la semilla traen su
   mes escrito en el código, así que al recargar la app vuelve solo — y
   con él vuelve la pregunta. Por eso la decisión se guarda como una
   MARCA (`sinPlan`) y se vuelve a aplicar al cargar. Aquí se comprueba
   simulando esa recarga.
   ───────────────────────────────────────────────────────────── */

/* Un DOM y un almacén de mentira, para poder importar la app de verdad
   al final. Igual que en test:seguir. */
const almacen = new Map();
globalThis.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: (k) => almacen.delete(k), clear: () => almacen.clear(),
};
globalThis.location = { hostname: 'localhost', href: 'http://localhost/', origin: 'http://localhost' };
globalThis.window = { addEventListener() {}, removeEventListener() {}, location: globalThis.location };
globalThis.document = {
  visibilityState: 'visible', addEventListener() {},
  getElementById: () => null, querySelectorAll: () => [], querySelector: () => null,
};

const { stalledBooks } = await import('../src/plan-core.js');
const { estadoMascota } = await import('../src/pet-core.js');

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
const ok = (nombre, condicion, detalle = '') => {
  if (condicion) { pasaron += 1; console.log(`  ✓ ${nombre}`); }
  else { fallaron += 1; console.log(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ''}`); }
};

const HOY = new Date('2026-09-08T12:00:00Z');

/* «Mi Historia», apartado desde agosto: el de la pantalla de Laura. */
const SEMILLA = { id: 'mi-historia', title: 'Mi Historia', year: 2026, month: 'Agosto', pages: '426' };

/**
 * Una app de mentira con un libro y su entrada.
 *
 * `recargar()` es la pieza que importa: rehace el libro DESDE LA
 * SEMILLA —como hace la app al arrancar— y le vuelve a aplicar la
 * entrada guardada. Si una decisión solo vive en memoria, ahí se
 * pierde.
 */
function app(entrada = { status: 'pending' }) {
  const estado = { libro: { ...SEMILLA }, entrada: { ...entrada } };

  /* La misma lógica que `applyPlannedMonths` en store.js. */
  const aplicar = () => {
    const { libro, entrada: e } = estado;
    if (e.sinPlan) { libro.month = ''; libro.year = null; return; }
    if (e.plannedMonth) libro.month = e.plannedMonth;
    if (e.plannedYear) libro.year = e.plannedYear;
  };

  return {
    estado,
    recargar() { estado.libro = { ...SEMILLA }; aplicar(); },

    /* Las tres respuestas, tal y como las escribe petask.js. */
    quitarDelPlan() {
      estado.libro.year = null;
      estado.libro.month = '';
      Object.assign(estado.entrada, {
        plannedYear: null, plannedMonth: null, pinnedMonth: null, sinPlan: true,
      });
    },
    placeInMonth(year, month) {
      estado.libro.year = year;
      estado.libro.month = month;
      Object.assign(estado.entrada, {
        plannedYear: year, plannedMonth: month, pinnedMonth: month, sinPlan: false,
      });
    },
    set(patch) { Object.assign(estado.entrada, patch); },

    /* Y lo que sale por pantalla. */
    mirar() {
      const ctx = {
        books: [estado.libro],
        statusOf: () => estado.entrada.status,
        pagesRead: () => estado.entrada.page || 0,
      };
      const atrasados = stalledBooks(ctx, HOY);
      const e = estadoMascota([{
        id: estado.libro.id,
        title: estado.libro.title,
        total: 426,
        page: estado.entrada.page || 0,
        status: estado.entrada.status,
        pct: 0,
        lastReadAt: estado.entrada.lastReadAt || 0,
        finishedAt: 0,
        mes: estado.libro.month || '',
        atrasadoMeses: atrasados.find((b) => b.id === estado.libro.id)?.monthsLate || 0,
        aplazado: false,
      }], HOY.getTime());
      return { atrasado: atrasados.length > 0, mood: e.mood };
    },
  };
}

/* Con el ánimo así, tocar a la mascota abre la pregunta y no el chat. */
const clavada = (mood) => mood === 'rescatando' || mood === 'preguntando';

/* ── DE PARTIDA ──────────────────────────────────────────────── */

grupo('EL LIBRO DE AGOSTO, EN SEPTIEMBRE');

const antes = app().mirar();
ok('está atrasado, y con razón', antes.atrasado);
ok('y la mascota pregunta por él', antes.mood === 'rescatando', antes.mood);
ok('así que tocarla abre la pregunta y NO el chat', clavada(antes.mood));

/* ── «MÁS ADELANTE» ──────────────────────────────────────────── */

grupo('«LO DEJO ESPERANDO, SIN FECHA»');

const a = app();
a.quitarDelPlan();
a.set({ status: 'pending' });
const tras = a.mirar();

ok('DEJA DE ESTAR ATRASADO', !tras.atrasado);
ok('y la mascota deja de preguntar por él', tras.mood !== 'rescatando', tras.mood);
ok('con lo que el chat vuelve a abrirse al tocarla', !clavada(tras.mood));
ok('el libro sigue en la biblioteca, que es lo que se prometió',
  a.estado.entrada.status === 'pending');
ok('y sin fecha, como dice el mensaje',
  !a.estado.libro.month && !a.estado.libro.year);

/* LA PARTE QUE SOLO SE VE RECARGANDO. */
a.recargar();
const trasRecargar = a.mirar();
ok('Y AL RECARGAR LA APP SIGUE SIN ESTAR ATRASADO',
  !trasRecargar.atrasado,
  'el mes de los libros de la semilla vive en el código y vuelve solo');
ok('la mascota tampoco vuelve a preguntar', trasRecargar.mood !== 'rescatando');

/* ── «TRAERLO A ESTE MES» ────────────────────────────────────── */

grupo('«TRAERLO A ESTE MES»');

const b = app();
b.placeInMonth(2026, 'Septiembre');
b.set({ status: 'reading', startedAt: HOY.getTime() });
const rescatado = b.mirar();

ok('el libro pasa de verdad al mes en curso',
  b.estado.libro.month === 'Septiembre' && b.estado.libro.year === 2026);
ok('YA NO ESTÁ ATRASADO', !rescatado.atrasado,
  'rescatarlo y que siga atrasado es no haberlo rescatado');
ok('y no se vuelve a preguntar por él', rescatado.mood !== 'rescatando', rescatado.mood);

b.recargar();
ok('al recargar sigue en septiembre',
  b.estado.libro.month === 'Septiembre' && !b.mirar().atrasado);

/* ── «LO DEJO» ───────────────────────────────────────────────── */

grupo('«LO DEJO»');

const c = app();
c.quitarDelPlan();
c.set({ status: 'abandoned' });
ok('sale de los atrasados', !c.mirar().atrasado);
ok('y sigue en la biblioteca, como dice el mensaje',
  c.estado.entrada.status === 'abandoned');

/* Y si algún día vuelve, que no vuelva siendo el libro atrasado de
   agosto: eso sería la peor bienvenida posible. */
c.set({ status: 'pending' });
c.recargar();
ok('AL RETOMARLO NO VUELVE ATRASADO DE AGOSTO', !c.mirar().atrasado);

/* ── LO QUE SEPARA LAS DOS COSAS ─────────────────────────────── */

grupo('LA CHINCHETA NO ES EL MES');

/* Esto es exactamente lo que hacía el código roto: quitar solo la
   chincheta. Se deja escrito como prueba para que, si alguien vuelve a
   confundirlas, esta línea explique por qué no vale. */
const d = app();
d.set({ status: 'pending', pinnedMonth: null });
ok('quitar solo la chincheta NO saca al libro de los atrasados',
  d.mirar().atrasado,
  'y por eso «más adelante» no servía de nada');
ok('quitarle el mes, sí', (() => { d.quitarDelPlan(); return !d.mirar().atrasado; })());

/* ── Y AHORA CON LA APP DE VERDAD ────────────────────────────

   Todo lo de arriba usa una COPIA de lo que hace `applyPlannedMonths`
   en store.js, y una copia enseña lo que uno cree que escribió, no lo
   que escribió — ya pasó una vez en este repo con una prueba visual.
   Así que la parte que de verdad importa —que la decisión sobreviva a
   recargar— se comprueba contra el módulo de verdad. */

grupo('CONTRA EL STORE DE VERDAD');

const store = await import('../src/store.js');
const gaps = await import('../src/gaps.js');

await store.loadStore('uid-prueba');

/* Un libro de la semilla con mes en el pasado, que es el caso. */
const ESTE_ANIO = new Date().getFullYear();
const candidato = store.allBooks().find((b) => b.month && b.year && b.year <= ESTE_ANIO);
ok('hay un libro de la semilla con mes asignado', Boolean(candidato),
  'sin eso no se puede comprobar nada de esto');

if (candidato) {
  const mesOriginal = candidato.month;
  gaps.quitarDelPlan(candidato.id);
  ok('quitarDelPlan le quita el mes al libro',
    !store.findBook(candidato.id).month,
    `sigue en ${store.findBook(candidato.id).month}`);
  ok('y lo deja escrito en la entrada como decisión',
    store.entry(candidato.id).sinPlan === true);

  /* LA RECARGA DE VERDAD: `loadStore` rehace los libros desde la
     semilla y vuelve a aplicar las entradas. */
  await store.loadStore('uid-prueba');
  ok('Y AL RECARGAR NO LE VUELVE EL MES DE LA SEMILLA',
    !store.findBook(candidato.id).month,
    `volvió a ${store.findBook(candidato.id).month} (era ${mesOriginal})`);

  /* Y al revés: darle mes otra vez deshace la decisión. */
  gaps.placeInMonth(candidato.id, ESTE_ANIO, mesOriginal);
  await store.loadStore('uid-prueba');
  ok('darle mes otra vez deshace el «sin fecha»',
    store.findBook(candidato.id).month === mesOriginal,
    store.findBook(candidato.id).month);
}

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.\n`);
process.exit(fallaron ? 1 : 0);
