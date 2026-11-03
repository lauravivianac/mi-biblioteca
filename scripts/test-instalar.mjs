/* ─────────────────────────────────────────────────────────────
   ¿A QUIÉN SE LE OFRECE INSTALARLA, Y QUÉ SE LE DICE?

     npm run test:instalar

   POR QUÉ EXISTE:

     «¿Cómo hacemos para que cuando se abra el sitio se instale en el
      Home automáticamente, o saque un pop-up donde la gente sepa qué
      hacer?»

   Automáticamente no se puede en ningún navegador, así que todo lo
   que queda es decir lo correcto a cada quien. Y «lo correcto»
   cambia tres veces:

     · en Android y escritorio hay un diálogo de verdad;
     · en Safari de iPhone hay que explicar dos toques;
     · en el navegador de Instagram esos dos toques NO EXISTEN, y
       enseñarlos manda a buscar un menú que no está.

   Ese tercer caso es el que esta batería existe para no perder. Para
   una app que se promociona con enlaces en redes es probablemente el
   camino más transitado, y es invisible desde un escritorio: quien
   programa esto nunca lo ve, y quien lo sufre no tiene cómo contarlo.

   ── Y EL ERROR SIMÉTRICO ───────────────────────────────────

   Pasarse. Ofrecerle instalar a quien ya la tiene instalada, o
   volver a sacar el cartel a quien acaba de decir «ahora no», son el
   mismo fallo con otra cara: un aviso que aparece cuando no toca se
   aprende a descartar sin leerlo, y entonces tampoco sirve cuando sí
   toca.
   ───────────────────────────────────────────────────────────── */

import {
  comoInstalar, navegadorIOS, esIOS, QUE_HACER, DIAS_DE_CALMA,
} from '../src/instalar-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
const ok = (nombre, condicion, detalle = '') => {
  if (condicion) { pasaron += 1; console.log(`  ✓ ${nombre}`); }
  else { fallaron += 1; console.log(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ''}`); }
};

const DIA = 24 * 60 * 60 * 1000;
const AHORA = Date.parse('2026-11-03T04:00:00Z');

/* User agents de verdad, copiados tal cual. Inventarlos es la forma
   más fácil de escribir una prueba que pasa y un código que falla. */
const UA = {
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
  iosInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Mobile/15E148 Instagram 339.0.0.30.113',
  iosFacebook: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone15,2]',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) '
    + 'Chrome/130.0.0.0 Mobile Safari/537.36',
  escritorio: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
    + '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};

const pedir = (extra = {}) => comoInstalar({ ahora: AHORA, ...extra });

/* ── QUIÉN ES QUIÉN ──────────────────────────────────────────── */

grupo('DISTINGUIR SAFARI DE UN NAVEGADOR PRESTADO');

ok('el Safari de verdad', navegadorIOS(UA.iosSafari) === 'safari');
/* Todos estos llevan «Safari» dentro del user agent. Si se mirara
   esa palabra primero, los cuatro pasarían por Safari y a los cuatro
   se les enseñarían unos toques que no pueden dar. */
ok('Chrome en iPhone NO es Safari', navegadorIOS(UA.iosChrome) === 'otro',
  'lleva «Safari» en el user agent: por eso se mira CriOS primero');
ok('EL NAVEGADOR DE INSTAGRAM TAMPOCO', navegadorIOS(UA.iosInstagram) === 'otro',
  'es por donde llega quien pincha un enlace en redes, y ahí no hay Compartir de Safari');
ok('ni el de Facebook', navegadorIOS(UA.iosFacebook) === 'otro');

ok('un iPhone es iOS', esIOS({ userAgent: UA.iosSafari, platform: 'iPhone' }));
ok('Y UN IPAD, QUE SE HACE PASAR POR MAC, TAMBIÉN',
  esIOS({ userAgent: UA.escritorio, platform: 'MacIntel', maxTouchPoints: 5 }));
ok('pero un Mac de verdad no',
  !esIOS({ userAgent: UA.escritorio, platform: 'MacIntel', maxTouchPoints: 0 }));

/* ── A QUIÉN SE LE OFRECE ────────────────────────────────────── */

grupo('QUÉ SE LE OFRECE A CADA QUIEN');

{
  const r = pedir({ userAgent: UA.android, hayPrompt: true });
  ok('con diálogo del navegador, un botón de verdad',
    r.ofrecer && r.modo === 'boton', JSON.stringify(r));
  ok('y ese modo trae un botón que tocar', Boolean(QUE_HACER[r.modo].accion));
}

{
  const r = pedir({ userAgent: UA.iosSafari, platform: 'iPhone' });
  ok('en Safari de iPhone, las instrucciones de Compartir',
    r.ofrecer && r.modo === 'ios-safari', JSON.stringify(r));
  /* En iOS no hay nada que un botón pueda hacer. Poner uno sería
     prometer un diálogo que no existe. */
  ok('y AHÍ NO HAY BOTÓN, porque no hay nada que pulsar',
    QUE_HACER[r.modo].accion === null);
  ok('y se nombra el menú tal y como se llama en el teléfono',
    /Compartir/.test(QUE_HACER[r.modo].texto)
      && /pantalla de inicio/i.test(QUE_HACER[r.modo].texto));
}

{
  const r = pedir({ userAgent: UA.iosInstagram, platform: 'iPhone' });
  ok('DESDE INSTAGRAM, LO PRIMERO ES ABRIRLA EN SAFARI',
    r.ofrecer && r.modo === 'ios-otro', JSON.stringify(r));
  ok('y NO se le enseñan los toques que no puede dar',
    !/^.*Toca Compartir/.test(QUE_HACER[r.modo].texto)
      && /Safari/.test(QUE_HACER[r.modo].texto),
    'buscaría un menú que no está y pensaría que la app está rota');
}

{
  const r = pedir({ userAgent: UA.escritorio, hayPrompt: false });
  ok('sin evento y sin iOS, no se ofrece nada',
    !r.ofrecer && r.motivo === 'sin-forma-de-instalar',
    'un cartel que no lleva a ninguna parte es peor que ningún cartel');
}

/* ── CUÁNDO NO SE OFRECE ─────────────────────────────────────── */

grupo('CUÁNDO CALLARSE');

ok('YA INSTALADA: ni una palabra (standalone)',
  !pedir({ userAgent: UA.iosSafari, platform: 'iPhone', standalone: true }).ofrecer,
  'ofrecerle instalar la app a quien la abrió desde el icono que instaló');

ok('ya instalada, también por display-mode',
  !pedir({ userAgent: UA.android, hayPrompt: true, displayStandalone: true }).ofrecer);

/* Y esto gana incluso al botón de verdad: tener el evento disponible
   no es motivo para ofrecérselo a quien ya la tiene. */
ok('y eso manda sobre el diálogo del navegador',
  pedir({ userAgent: UA.android, hayPrompt: true, displayStandalone: true }).motivo === 'ya-instalada');

ok('DIJO «AHORA NO» AYER: no se insiste',
  !pedir({ userAgent: UA.iosSafari, platform: 'iPhone', descartadaEl: AHORA - DIA }).ofrecer,
  'un «ahora no» que dura un día no es un «ahora no»');

ok(`pero pasados ${DIAS_DE_CALMA} días vuelve a ofrecerse`,
  pedir({
    userAgent: UA.iosSafari, platform: 'iPhone',
    descartadaEl: AHORA - (DIAS_DE_CALMA + 1) * DIA,
  }).ofrecer,
  'un «ahora no» tampoco es un «nunca»');

ok('y el motivo dice cuál de las dos cosas fue',
  pedir({ userAgent: UA.iosSafari, platform: 'iPhone', descartadaEl: AHORA - DIA }).motivo === 'la-descarto',
  'sin motivo, «¿por qué no me sale?» se depura adivinando');

/* ── LO QUE SE DICE ──────────────────────────────────────────── */

grupo('LOS TRES TEXTOS EXISTEN Y DICEN ALGO');

for (const modo of ['boton', 'ios-safari', 'ios-otro']) {
  const d = QUE_HACER[modo];
  ok(`«${modo}» tiene título y explicación`,
    Boolean(d?.titulo) && d.texto.length > 40,
    'un modo sin texto sale como un cartel vacío');
}

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.\n`);
process.exit(fallaron ? 1 : 0);
