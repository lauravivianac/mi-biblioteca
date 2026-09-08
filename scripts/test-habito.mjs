/* ─────────────────────────────────────────────────────────────
   ¿A QUÉ HORA SUELE LEER, Y TOCA AVISAR?  ·  historia #69

     npm run test:habito

     «Quiero que me recuerden leer cuando suelo hacerlo, para que se me
      haga costumbre.»

   Lo que se comprueba aquí son las dos decisiones que no dependen de
   las notificaciones: DEDUCIR LA HORA y DECIDIR SI HOY TOCA. Ambas son
   lógica pura, así que se prueban sin navegador y sin red.

   ── LA TRAMPA QUE TIENE ESTO ────────────────────────────────

   Las horas son un círculo. Quien lee a las 23:00 y a la 1:00 tiene una
   media aritmética de las 12:00 — mediodía, justo la hora a la que no
   lee. Ese error no se ve leyendo el código: hay que probarlo con el
   caso que lo destapa, y por eso está el primero del grupo.
   ───────────────────────────────────────────────────────────── */

import {
  apuntarHora, horaHabitual, horaLegible, horaDe, tocaAvisar, claveDia,
  resumenRecordatorio, POR_QUE_NO, MUESTRAS, MINIMO,
  RECORDATORIO_POR_DEFECTO, TODOS_LOS_DIAS, DIAS,
} from '../src/habito-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
const ok = (nombre, condicion, detalle = '') => {
  if (condicion) { pasaron += 1; console.log(`  ✓ ${nombre}`); } else {
    fallaron += 1; console.log(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  }
};

/** Un día cualquiera a esa hora. El 8 de septiembre de 2026 es martes. */
const alas = (h, m = 0, dia = 8) => new Date(2026, 8, dia, h, m, 0);

/* ── DEDUCIR LA HORA ─────────────────────────────────────────── */

grupo('LA MEDIA DE UN CÍRCULO NO ES LA MEDIA DE UNOS NÚMEROS');

/* EL CASO QUE LO DESTAPA TODO. Con una media normal esto da las 12:00
   —mediodía— y el aviso llegaría siempre a la hora a la que no lee. */
const nocturna = [23, 23.5, 0.5, 1, 23.8, 0.2, 0];
const r1 = horaHabitual(nocturna);
ok('quien lee de noche NO tiene su hora al mediodía',
  r1.hora > 22 || r1.hora < 2,
  `salió ${horaLegible(r1.hora)} — la media aritmética habría dado 13:14`);
ok('y sale sobre la medianoche, que es cuando lee de verdad',
  horaLegible(r1.hora) === '00:00' || horaLegible(r1.hora) === '23:30',
  horaLegible(r1.hora));

grupo('UNA COSTUMBRE NORMAL');

const tarde = [19, 19.5, 20, 19.2, 19.8, 20.1, 19.6];
const r2 = horaHabitual(tarde);
ok('sale la hora a la que lee', horaLegible(r2.hora) === '19:30', horaLegible(r2.hora));
ok('y con constancia alta', r2.constancia > 0.9, String(r2.constancia));
ok('se dice de cuántas lecturas sale', r2.muestras === 7);

grupo('CUÁNDO NO HAY QUE INVENTARSE NADA');

ok(`con menos de ${MINIMO} lecturas no se deduce`,
  horaHabitual([19, 19.5, 20]).hora === null);
ok('y se dice por qué', horaHabitual([19, 19.5]).motivo === 'pocas-lecturas');

/* Quien lee a cualquier hora no tiene una hora habitual. Decirle una
   sería inventarla, y encima se acepta sin pensar. */
const dispersa = [3, 8, 11, 14, 17, 20, 23, 6, 12, 19];
ok('QUIEN LEE A CUALQUIER HORA NO TIENE UNA HORA',
  horaHabitual(dispersa).hora === null,
  `salió ${horaLegible(horaHabitual(dispersa).hora)}`);
ok('y el motivo lo distingue de «pocas lecturas»',
  horaHabitual(dispersa).motivo === 'sin-hora-clara');

ok('sin datos tampoco', horaHabitual([]).hora === null);
ok('y la basura no cuenta como muestra',
  horaHabitual([19, 19.5, 20, 19.2, 19.8, null, 'x', 99, -3]).muestras === 5);

grupo('CÓMO SE ESCRIBE');

ok('se redondea a la media hora', horaLegible(19.6) === '19:30');
ok('y hacia arriba cuando toca', horaLegible(19.8) === '20:00');
ok('con dos cifras', horaLegible(7.1) === '07:00');
ok('la medianoche es 00:00 y no 24:00', horaLegible(23.9) === '00:00');
ok('sin hora no se escribe nada', horaLegible(null) === '');

/* ── APUNTAR ─────────────────────────────────────────────────── */

grupo('APUNTAR UNA HORA');

ok('la hora sale del reloj, con minutos', horaDe(alas(19, 30)) === 19.5);
ok('se añade al final', apuntarHora([1, 2], alas(19, 30)).at(-1) === 19.5);
ok('sin tocar la lista de antes', (() => {
  const antes = [1, 2];
  apuntarHora(antes, alas(19, 30));
  return antes.length === 2;
})());
ok('se redondea a un decimal, para no guardar ruido',
  apuntarHora([], alas(19, 31)).at(-1) === 19.5,
  String(apuntarHora([], alas(19, 31)).at(-1)));

/* Que no crezca sin fin es lo que hace que esto se pueda guardar en un
   documento que se sincroniza. */
let muchas = [];
for (let i = 0; i < 100; i += 1) muchas = apuntarHora(muchas, alas(i % 24));
ok(`NUNCA PASA DE ${MUESTRAS}`, muchas.length === MUESTRAS, `son ${muchas.length}`);
ok('y las que quedan son las últimas',
  muchas.at(-1) === horaDe(alas(99 % 24)));

/* ── ¿TOCA AVISAR? ───────────────────────────────────────────── */

const CONFIG = { activo: true, dias: TODOS_LOS_DIAS, hora: 19 };
const HORAS = tarde;

grupo('LOS CRITERIOS DE LA HISTORIA');

ok('a su hora, avisa',
  tocaAvisar(CONFIG, { horas: HORAS, ahora: alas(19, 5) }).avisar);

ok('NO LLEGA SI YA LEÍ HOY',
  tocaAvisar(CONFIG, {
    horas: HORAS, ahora: alas(19, 5), diasLeidos: [claveDia(alas(19, 5))],
  }).motivo === 'ya-leiste-hoy',
  'es lo que separa un recordatorio de una alarma');

ok('COMO MÁXIMO UNO AL DÍA',
  tocaAvisar(CONFIG, {
    horas: HORAS, ahora: alas(19, 5), ultimoAviso: claveDia(alas(19, 5)),
  }).motivo === 'ya-avisamos-hoy');

ok('pero mañana sí',
  tocaAvisar(CONFIG, {
    horas: HORAS, ahora: alas(19, 5, 9), ultimoAviso: claveDia(alas(19, 5, 8)),
  }).avisar);

ok('apagado no avisa nunca',
  tocaAvisar({ ...CONFIG, activo: false }, { horas: HORAS, ahora: alas(19, 5) })
    .motivo === 'apagado');

grupo('LOS DÍAS QUE ELIJAS');

/* El 8 de septiembre de 2026 es martes; el 12, sábado. */
ok('el martes es martes', alas(19).getDay() === 2);
const soloFinde = { activo: true, dias: [6, 0], hora: 19 };
ok('un martes con «solo fines de semana» no avisa',
  tocaAvisar(soloFinde, { horas: HORAS, ahora: alas(19, 5) }).motivo === 'hoy-no-toca');
ok('y el sábado sí',
  tocaAvisar(soloFinde, { horas: HORAS, ahora: alas(19, 5, 12) }).avisar);
ok('sin días elegidos se entiende «todos»',
  tocaAvisar({ activo: true, dias: [], hora: 19 }, { horas: HORAS, ahora: alas(19, 5) }).avisar);

grupo('LA VENTANA DE LA HORA');

ok('antes de la hora, todavía no',
  tocaAvisar(CONFIG, { horas: HORAS, ahora: alas(18, 30) }).motivo === 'todavia-no');
ok('justo a la hora, sí', tocaAvisar(CONFIG, { horas: HORAS, ahora: alas(19, 0) }).avisar);
ok('media hora después, todavía',
  tocaAvisar(CONFIG, { horas: HORAS, ahora: alas(19, 29) }).avisar,
  'sin margen, un aviso que llega diez minutos tarde no llega nunca');
ok('una hora después ya no',
  !tocaAvisar(CONFIG, { horas: HORAS, ahora: alas(20, 30) }).avisar);

/* La ventana también es un círculo: un aviso de las 23:50 tiene que
   seguir valiendo a las 00:10, no perderse en el cambio de día. */
const nocturno = { activo: true, dias: TODOS_LOS_DIAS, hora: 23.833 };
ok('UN RECORDATORIO DE LAS 23:50 SIGUE VALIENDO A LAS 00:10',
  tocaAvisar(nocturno, { horas: HORAS, ahora: alas(0, 10, 9) }).avisar,
  'si la ventana no fuera circular, se perdería cada noche');

grupo('SI NO SE SABE LA HORA');

ok('sin hora fija y sin bastantes lecturas, no se avisa a ciegas',
  tocaAvisar({ activo: true, dias: TODOS_LOS_DIAS, hora: null },
    { horas: [19, 20], ahora: alas(19, 5) }).motivo === 'sin-hora');

ok('pero con lecturas suficientes se usa la deducida',
  tocaAvisar({ activo: true, dias: TODOS_LOS_DIAS, hora: null },
    { horas: HORAS, ahora: alas(19, 40) }).avisar,
  'la hora deducida de esas lecturas son las 19:30');

ok('y la hora que elijas MANDA sobre la deducida',
  tocaAvisar({ activo: true, dias: TODOS_LOS_DIAS, hora: 7 },
    { horas: HORAS, ahora: alas(7, 5) }).avisar);

grupo('CADA «NO» SE PUEDE EXPLICAR EN PANTALLA');

const motivos = ['apagado', 'ya-leiste-hoy', 'ya-avisamos-hoy', 'hoy-no-toca', 'sin-hora', 'todavia-no'];
ok('todos los motivos tienen su frase',
  motivos.every((m) => typeof POR_QUE_NO[m] === 'string' && POR_QUE_NO[m].length > 10),
  motivos.filter((m) => !POR_QUE_NO[m]).join(', '));
ok('y ninguno dice solo «no»',
  motivos.every((m) => POR_QUE_NO[m].split(' ').length > 3));

grupo('CÓMO SE RESUME EN AJUSTES');

ok('apagado lo dice y ya', resumenRecordatorio(RECORDATORIO_POR_DEFECTO) === 'Apagado');
ok('con hora fija, la hora y los días',
  resumenRecordatorio(CONFIG, HORAS) === '19:00, todos los días',
  resumenRecordatorio(CONFIG, HORAS));
ok('de lunes a viernes se dice así, no con cinco letras',
  resumenRecordatorio({ activo: true, dias: [1, 2, 3, 4, 5], hora: 19 }, HORAS)
    === '19:00, de lunes a viernes',
  resumenRecordatorio({ activo: true, dias: [1, 2, 3, 4, 5], hora: 19 }, HORAS));
ok('otros días se listan',
  resumenRecordatorio(soloFinde, HORAS) === '19:00, S D',
  resumenRecordatorio(soloFinde, HORAS));
ok('la hora deducida se dice que es deducida',
  /tu hora habitual/.test(resumenRecordatorio({ activo: true, dias: TODOS_LOS_DIAS, hora: null }, HORAS)),
  resumenRecordatorio({ activo: true, dias: TODOS_LOS_DIAS, hora: null }, HORAS));
ok('y mientras aprende, lo dice en vez de mentir',
  resumenRecordatorio({ activo: true, dias: TODOS_LOS_DIAS, hora: null }, [19, 20])
    === 'Encendido · aprendiendo tu hora');

grupo('LOS DÍAS DE LA SEMANA');

ok('son siete', DIAS.length === 7);
ok('empiezan en lunes, como se leen en español', DIAS[0].nombre === 'lunes');
ok('y terminan en domingo', DIAS.at(-1).nombre === 'domingo');
ok('el índice es el de getDay(), que empieza en domingo',
  DIAS.at(-1).i === 0 && DIAS[0].i === 1);

/* ── Y CONTRA EL ALMACÉN DE VERDAD ───────────────────────────
   Todo lo de arriba es lógica pura. Que la hora se APUNTE de verdad
   cuando registras lectura es otra cosa, y se comprueba contra
   store.js: una copia enseña lo que uno cree que escribió. */

grupo('CONTRA EL ALMACÉN DE VERDAD');

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

const store = await import('../src/store.js');
await store.loadStore('uid-prueba');

ok('de partida no hay horas apuntadas', store.horasDeLectura().length === 0);

store.recordReadingDay(alas(19, 30));
ok('registrar lectura APUNTA LA HORA', store.horasDeLectura().at(-1) === 19.5,
  JSON.stringify(store.horasDeLectura()));

/* La parte que se olvida: dos ratos el mismo día son dos muestras. */
store.recordReadingDay(alas(22, 0));
ok('DOS RATOS EL MISMO DÍA SON DOS MUESTRAS',
  store.horasDeLectura().length === 2,
  'poner el apunte después del corte del día habría tirado la mitad de los datos');

ok('y el día solo se apunta una vez, que es lo de la racha',
  store.readingDays().filter((d) => d === claveDia(alas(19, 30))).length === 1);

ok('el recordatorio empieza apagado', store.miRecordatorio().activo === false);
store.setRecordatorio({ activo: true, hora: 7 });
ok('se puede encender y elegir hora',
  store.miRecordatorio().activo === true && store.miRecordatorio().hora === 7);
ok('sin perder lo que no se tocó',
  store.miRecordatorio().dias.length === 7);

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.\n`);
process.exit(fallaron ? 1 : 0);
