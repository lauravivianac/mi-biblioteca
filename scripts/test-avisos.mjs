/* ─────────────────────────────────────────────────────────────
   QUÉ AVISOS LLEGAN Y CUÁNDO NO  ·  historia #95

     npm run test:avisos

   Del cuerpo de la historia:

     «Las notificaciones son la vía más rápida para que desinstalen una
      app. Que sean pocas, agrupadas y desactivables una por una no es
      amabilidad: es supervivencia.»

   ── LA TRAMPA ──────────────────────────────────────────────

   El horario de silencio cruza la medianoche, y la comprobación obvia
   —`h >= desde && h < hasta`— es FALSA SIEMPRE cuando desde=23 y
   hasta=8, porque 23 es mayor que 8. El ajuste se ve encendido en
   pantalla y los avisos siguen llegando de madrugada, que es
   exactamente el fallo que la historia dice que hace que desinstalen la
   app.

   Es el mismo error de círculo que la hora habitual en #69, en otro
   sitio. Va el primero del fichero por eso.
   ───────────────────────────────────────────────────────────── */

import {
  TIPOS_AVISO, AVISOS_POR_DEFECTO, SILENCIO_POR_DEFECTO, avisosCompletos,
  enSilencio, silencioLegible, sePuedeAvisar, POR_QUE_NO_LLEGA, agruparAvisos, ES_TIPO,
  resumenAvisos,
} from '../src/push-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
const ok = (nombre, condicion, detalle = '') => {
  if (condicion) { pasaron += 1; console.log(`  ✓ ${nombre}`); } else {
    fallaron += 1; console.log(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  }
};

const alas = (h, m = 0) => new Date(2026, 8, 8, h, m, 0);

/* ── EL SILENCIO QUE CRUZA LA MEDIANOCHE ─────────────────────── */

grupo('DE 23 A 8 NO ES «ENTRE 23 Y 8»');

const noche = { activo: true, desde: 23, hasta: 8 };

ok('A LAS 3 DE LA MAÑANA HAY SILENCIO', enSilencio(noche, alas(3)),
  'con la comprobación obvia esto es falso y los avisos llegan de madrugada');
ok('a las 23:30 también', enSilencio(noche, alas(23, 30)));
ok('a las 00:01 también', enSilencio(noche, alas(0, 1)));
ok('justo a las 23:00 empieza', enSilencio(noche, alas(23, 0)));
ok('y a las 8:00 se acaba', !enSilencio(noche, alas(8, 0)));
ok('a las 7:59 todavía no', enSilencio(noche, alas(7, 59)));
ok('al mediodía, ninguno', !enSilencio(noche, alas(12)));
ok('a las 22:59 tampoco', !enSilencio(noche, alas(22, 59)));

grupo('Y UNA FRANJA QUE NO CRUZA TAMBIÉN VALE');

/* Quien duerme de día. La misma función tiene que servir. */
const dia = { activo: true, desde: 9, hasta: 17 };
ok('a las 12 hay silencio', enSilencio(dia, alas(12)));
ok('a las 8 no', !enSilencio(dia, alas(8)));
ok('a las 18 tampoco', !enSilencio(dia, alas(18)));
ok('a las 3 de la mañana, tampoco', !enSilencio(dia, alas(3)));

grupo('CUANDO EL AJUSTE NO DICE NADA');

ok('apagado no silencia', !enSilencio({ activo: false, desde: 23, hasta: 8 }, alas(3)));
ok('la misma hora de inicio y fin no silencia el día entero',
  !enSilencio({ activo: true, desde: 8, hasta: 8 }, alas(12)),
  'es un ajuste a medias, no «silencio siempre»');
ok('y con basura no se silencia', !enSilencio({ activo: true, desde: 'x', hasta: 8 }, alas(3)));

grupo('CÓMO SE LEE');

ok('se escribe con dos cifras', silencioLegible(noche) === 'De 23:00 a 08:00', silencioLegible(noche));
ok('y apagado lo dice', silencioLegible({ activo: false }) === 'Apagado');

/* ── LOS TIPOS ───────────────────────────────────────────────── */

grupo('CADA TIPO SE APAGA POR SU CUENTA');

ok('son los seis que nombra la historia', TIPOS_AVISO.length === 6);
const ids = TIPOS_AVISO.map((t) => t.id);
for (const q of ['seguidor', 'comentario', 'intercambio', 'mensaje', 'recordatorio', 'logro']) {
  ok(`está «${q}»`, ids.includes(q));
}
ok('todos con etiqueta y explicación',
  TIPOS_AVISO.every((t) => t.label && t.sub && t.sub.length > 10));

grupo('LO QUE VIENE ENCENDIDO DE FÁBRICA');

/* No es «todo encendido». Encendidos van los que contestan algo que
   empezaste tú; apagados los que son sobre ti sin haberlos pedido. */
const deFabrica = AVISOS_POR_DEFECTO.tipos;
ok('los mensajes, sí', deFabrica.mensaje === true);
ok('los intercambios, sí', deFabrica.intercambio === true);
ok('el recordatorio, sí — es el único que se pide a propósito',
  deFabrica.recordatorio === true);
ok('QUE TE SIGAN, NO', deFabrica.seguidor === false,
  'puede esperar a que abras la app');
ok('los comentarios, no', deFabrica.comentario === false);
ok('los logros, no', deFabrica.logro === false);
ok('o sea que NO es «todo encendido»',
  Object.values(deFabrica).filter(Boolean).length < TIPOS_AVISO.length);

ok('y el silencio viene ENCENDIDO', SILENCIO_POR_DEFECTO.activo === true,
  'tenerlo no debería ser una decisión; quitarlo sí');

grupo('LA CONFIGURACIÓN GUARDADA SE COMPLETA');

const parcial = avisosCompletos({ tipos: { seguidor: true } });
ok('lo que guardaste manda', parcial.tipos.seguidor === true);
ok('y lo que falta viene de fábrica', parcial.tipos.mensaje === true);
ok('un tipo nuevo aparece con su valor de fábrica', parcial.tipos.logro === false);
ok('sin nada guardado, todo de fábrica',
  JSON.stringify(avisosCompletos()) === JSON.stringify(AVISOS_POR_DEFECTO));
ok('el silencio también se completa', avisosCompletos({}).silencio.desde === 23);

/* ── LA DECISIÓN ─────────────────────────────────────────────── */

grupo('¿SE MANDA O NO?');

ok('un tipo encendido, fuera del silencio, sí',
  sePuedeAvisar('mensaje', {}, alas(12)).mandar);
ok('un tipo apagado, no',
  sePuedeAvisar('seguidor', {}, alas(12)).motivo === 'tipo-apagado');
ok('y encendido a mano, sí',
  sePuedeAvisar('seguidor', { tipos: { seguidor: true } }, alas(12)).mandar);
ok('dentro del silencio, no',
  sePuedeAvisar('mensaje', {}, alas(3)).motivo === 'en-silencio');
ok('un tipo que no existe, no',
  sePuedeAvisar('loquesea', {}, alas(12)).motivo === 'tipo-desconocido');

grupo('EL RECORDATORIO SE SALTA EL SILENCIO');

/* Y es a propósito: es el único aviso cuya hora la eliges tú. Quien lo
   pone a las 23:30 porque lee antes de dormir lo ha pedido; callárselo
   por el horario de silencio sería desobedecer el ajuste concreto
   usando el general. */
ok('a las 23:30, con silencio activo, el recordatorio SÍ llega',
  sePuedeAvisar('recordatorio', {}, alas(23, 30)).mandar,
  'lo pediste tú a esa hora');
ok('pero un mensaje a esa hora, no',
  !sePuedeAvisar('mensaje', {}, alas(23, 30)).mandar);
ok('y si apagas el recordatorio, tampoco llega',
  sePuedeAvisar('recordatorio', { tipos: { recordatorio: false } }, alas(23, 30))
    .motivo === 'tipo-apagado');

grupo('CADA «NO» SE PUEDE EXPLICAR');

const motivos = ['tipo-desconocido', 'tipo-apagado', 'en-silencio'];
ok('todos tienen su frase',
  motivos.every((m) => POR_QUE_NO_LLEGA[m]?.length > 10),
  motivos.filter((m) => !POR_QUE_NO_LLEGA[m]).join(', '));

/* ── AGRUPAR ─────────────────────────────────────────────────── */

grupo('CINCO COMENTARIOS SON UN AVISO, NO CINCO');

ok('sin nada pendiente, no hay aviso', agruparAvisos([]) === null);

const uno = agruparAvisos([{ tipo: 'mensaje', de: 'Rafael', cuerpo: 'Hola' }]);
ok('uno solo se deja como está', uno.cuerpo === 'Hola' && uno.cuantos === 1);

const cinco = agruparAvisos([
  { tipo: 'comentario', de: 'Rafael', cuerpo: 'a' },
  { tipo: 'comentario', de: 'Ana', cuerpo: 'b' },
  { tipo: 'comentario', de: 'Luis', cuerpo: 'c' },
  { tipo: 'comentario', de: 'Marta', cuerpo: 'd' },
  { tipo: 'comentario', de: 'Sara', cuerpo: 'e' },
]);
ok('CINCO SE CONVIERTEN EN UNO', cinco.cuantos === 5);
ok('y no se listan los cinco nombres',
  !cinco.cuerpo.includes('Marta') && !cinco.cuerpo.includes('Sara'), cinco.cuerpo);
ok('se dice el primero y cuántos más',
  cinco.de === 'Rafael y 4 más', cinco.de);

const dos = agruparAvisos([
  { tipo: 'comentario', de: 'Rafael', cuerpo: 'a' },
  { tipo: 'comentario', de: 'Ana', cuerpo: 'b' },
]);
ok('dos personas se nombran las dos', dos.de === 'Rafael y Ana', dos.de);

/* Dos avisos de la MISMA persona no son dos personas. */
const mismaPersona = agruparAvisos([
  { tipo: 'mensaje', de: 'Rafael', cuerpo: 'a' },
  { tipo: 'mensaje', de: 'Rafael', cuerpo: 'b' },
  { tipo: 'mensaje', de: 'Rafael', cuerpo: 'c' },
]);
ok('TRES MENSAJES DE RAFAEL SON DE RAFAEL, no de «Rafael y 2 más»',
  mismaPersona.de === 'Rafael', mismaPersona.de);
ok('y se dice cuántos son', /3 mensajes/.test(mismaPersona.cuerpo), mismaPersona.cuerpo);

ok('sin nombres no se inventa ninguno',
  /2 personas/.test(agruparAvisos([
    { tipo: 'comentario', cuerpo: 'a' }, { tipo: 'comentario', cuerpo: 'b' },
  ]).cuerpo));

grupo('CÓMO SE RESUME EN AJUSTES');

ok('apagado en este dispositivo lo dice',
  resumenAvisos({}, { encendido: false }) === 'Apagados en este dispositivo');
ok('encendido, lista los tipos elegidos',
  /mensajes/i.test(resumenAvisos({}, { encendido: true })),
  resumenAvisos({}, { encendido: true }));
ok('y dice el horario de silencio',
  /silencio/i.test(resumenAvisos({}, { encendido: true })),
  resumenAvisos({}, { encendido: true }));
ok('con todos encendidos dice «todos», no los seis nombres',
  resumenAvisos({ tipos: Object.fromEntries(TIPOS_AVISO.map((t) => [t.id, true])) },
    { encendido: true }).startsWith('Todos'));
ok('ENCENDIDO SIN NINGÚN TIPO LO DICE, en vez de mentir con una lista vacía',
  resumenAvisos({ tipos: Object.fromEntries(TIPOS_AVISO.map((t) => [t.id, false])) },
    { encendido: true }) === 'Encendidos, pero sin ningún tipo elegido');

grupo('Y LA CLAVE PÚBLICA SIGUE SIENDO LA PÚBLICA');

/* Vive en push.js y ya la comprueba test:push. Aquí solo se ata el cabo:
   sin clave, nada de lo de arriba llega a ningún sitio. */
ok('ES_TIPO distingue los tipos de verdad de los inventados',
  ES_TIPO('mensaje') && !ES_TIPO('mensajito'));

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.\n`);
process.exit(fallaron ? 1 : 0);
