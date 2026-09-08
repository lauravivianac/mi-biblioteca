/* ─────────────────────────────────────────────────────────────
   SEGUIR A ALGUIEN: EL BOTÓN, Y LO QUE PASA DESPUÉS

     npm run test:seguir

   POR QUÉ EXISTE. «Lo encuentra pero no lo agrega; si cierro la
   pantalla no aparece en mis amigos luego.» Y no era que no agregara:
   ES QUE MUCHAS VECES NO HABÍA BOTÓN QUE TOCAR.

   `relationSlot()` devolvía un div VACÍO y lo llenaba `pintarRelacion()`
   cuando volvían las tres consultas de la relación. Pero abrir un
   perfil repinta el cuerpo entero más de una vez —al llegar las
   reseñas— y ese repintado REESCRIBE el hueco, borrando el botón.
   Ganaba quien llegara último, y las reseñas son una lectura mientras
   la relación son tres: casi siempre ganaban ellas.

   POR QUÉ NO LO VIO NADIE. Todas las pruebas de este repo son de
   lógica pura (`*-core.js`) o de reglas contra el emulador. `socialui`
   —el módulo donde estaba el fallo— no lo importaba NINGUNA, porque
   toca el DOM y trae Firebase detrás.

   Aquí sí se importa, con el mismo cargador del circuito (mapea las
   URLs de gstatic al paquete npm) y con un DOM de mentira de tres
   líneas. No hace falta emulador: las lecturas fallan, se las traga su
   propio try/catch, y lo que se comprueba es lo de siempre — que el
   MARCADO salga aunque no salga nada más.
   ───────────────────────────────────────────────────────────── */

const almacen = new Map();
globalThis.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: (k) => almacen.delete(k), clear: () => almacen.clear(),
};
globalThis.location = { hostname: 'localhost', href: 'http://localhost/', origin: 'http://localhost' };
globalThis.window = { addEventListener() {}, removeEventListener() {}, location: globalThis.location };

/* Un DOM del tamaño justo: `pintarRelacion` busca `#rel-slot` y le
   escribe dentro. Si no lo encuentra, no hace nada — que es
   precisamente lo que pasaba de verdad tras el segundo repintado. */
const nodos = new Map();
globalThis.document = {
  visibilityState: 'visible',
  addEventListener() {},
  getElementById: (id) => nodos.get(id) || null,
  querySelectorAll: () => [],
  querySelector: () => null,
};
const crearHueco = (id) => { nodos.set(id, { innerHTML: '' }); return nodos.get(id); };

const store = await import('../src/store.js');
const socialui = await import('../src/socialui.js');

let bien = 0; let mal = 0;
const comprobar = (nombre, ok, detalle = '') => {
  if (ok) { bien += 1; console.log(`  ✓ ${nombre}`); } else {
    mal += 1; console.log(`  ✗ ${nombre}${detalle ? `\n      ${detalle}` : ''}`);
  }
};

const YO = 'uid-laura';
const OTRA = 'uid-rafael';

await store.loadStore(YO);          // sin red: se queda en local, pero fija el uid
comprobar('hay sesión, que es lo que decide si el botón existe', store.uid() === YO);

/* ── EL CASO EXACTO ──────────────────────────────────────────
   Se reproduce la secuencia real de `profileui.openProfile`. */

console.log('\n─── ABRIR UN PERFIL ───');

// 1 · primer pintado: el hueco nace, todavía sin datos de relación
crearHueco('rel-slot');
const primero = socialui.relationSlot(OTRA);
comprobar('el primer pintado no inventa una relación que no se ha pedido',
  !primero.includes('toggleFollow'), primero.slice(0, 90));

// 2 · llega la relación
await socialui.loadRelation(OTRA, false);
const trasCargar = nodos.get('rel-slot').innerHTML;
comprobar('al cargar la relación aparece el botón',
  trasCargar.includes(`toggleFollow('${OTRA}')`), trasCargar.slice(0, 120));

/* 3 · Y AQUÍ ESTABA EL FALLO: llegan las reseñas y `pintar()` reescribe
       el cuerpo entero, o sea que vuelve a llamar a `relationSlot()`.
       Antes devolvía un div vacío y el botón se perdía. */
const segundo = socialui.relationSlot(OTRA);
comprobar('EL REPINTADO NO SE LLEVA EL BOTÓN',
  segundo.includes(`toggleFollow('${OTRA}')`), segundo.slice(0, 160));
comprobar('y tampoco los contadores',
  segundo.includes('openFollowList'), segundo.slice(0, 160));

/* ── Y LO QUE NO DEBE PASAR ──────────────────────────────────
   El marcado se guarda en un módulo, así que hay que asegurarse de que
   no se pinta la relación de una persona en el perfil de otra. */

console.log('\n─── SIN MEZCLAR PERSONAS ───');
comprobar('en el perfil de OTRA persona no se pinta esta relación',
  socialui.relationSlot('uid-tercera') === '<div id="rel-slot"></div>',
  socialui.relationSlot('uid-tercera'));

comprobar('en mi propio perfil no hay botón de seguirme',
  !socialui.relationSlot(YO).includes('toggleFollow'));

/* ── Y DESPUÉS DE SEGUIR, ¿QUÉ? ──────────────────────────────
   «Ya seguí a Rafael pero no me dice a quién estoy siguiendo, ni me da
    un resumen del perfil para ver cuántos libros ha leído.»

   El botón funcionaba y aun así la pantalla no servía: seguías a
   alguien y la pestaña seguía sin nombrarlo. Lo que se comprueba aquí
   es la fila de esa lista, y en particular LO QUE SE PREGUNTABA —los
   libros— porque la primera versión los enseñaba solo a quien no
   estaba leyendo nada, o sea que a Rafael, que sí lee, no se le habrían
   visto nunca. */

console.log('\n─── A QUIÉN SIGUES ───');

const feedui = await import('../src/feedui.js');

const RAFA = {
  uid: 'u1', username: 'rafaelmartinez', name: 'Rafael Martinez',
  leyendo: [{ title: 'El nombre de la rosa' }],
  numeros: { anio: 2026, leidosEsteAnio: 7, racha: 4 },
};
const fila = feedui.filaDeQuienSigues(RAFA);

comprobar('sale su nombre', fila.includes('Rafael Martinez'), fila);
comprobar('y su @usuario, que es por donde se abre el perfil',
  fila.includes("openProfile('rafaelmartinez')"), fila);
comprobar('dice qué está leyendo', fila.includes('Leyendo El nombre de la rosa'), fila);
comprobar('Y CUÁNTOS LIBROS LLEVA, aunque esté leyendo algo',
  fila.includes('7 libros en 2026'), fila);
comprobar('se puede dejar de seguir desde aquí',
  fila.includes(`dejarDeSeguir('${RAFA.uid}')`), fila);
comprobar('y el botón dice qué hace, no solo «Dejar»',
  fila.includes('Dejar de seguir'), fila);

/* Quien acaba de llegar no tiene números que enseñar, y decirlo es
   mejor que dejar el hueco en blanco. */
const nuevo = feedui.filaDeQuienSigues({ uid: 'u3', username: 'juanp', name: 'Juan P.' });
comprobar('a quien acaba de llegar se le dice, no se le deja en blanco',
  nuevo.includes('Acaba de llegar'), nuevo);

/* Pero «acaba de llegar» debajo de «leyendo tal libro» se contradice. */
const leeSinPublicar = feedui.filaDeQuienSigues({
  uid: 'u4', username: 'marta', name: 'Marta', leyendo: [{ title: 'Cien años de soledad' }],
});
comprobar('y no se le dice a quien SÍ está leyendo algo',
  !leeSinPublicar.includes('Acaba de llegar'), leeSinPublicar);

console.log(`\n  ${bien} comprobaciones pasaron, ${mal} fallaron.\n`);
process.exit(mal ? 1 : 0);
