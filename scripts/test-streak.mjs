/* ─────────────────────────────────────────────────────────────
   PRUEBAS DE LA RACHA

   Dos grupos mandan:

     · «LAS CONGELACIONES» — son la diferencia entre una racha que
       motiva y una que estresa, y el sitio donde es más fácil hacer
       trampa sin querer: si una congelación SUMA día, la app te está
       contando días que no leíste.

     · «LA ZONA HORARIA» — una racha que se rompe a las nueve de la
       noche porque el servidor ya está en mañana es un fallo que
       nadie te va a saber explicar.
   ───────────────────────────────────────────────────────────── */

import {
  streakInfo, dayKey, nextDay, prevDay, addDay, freezeNotice, streakLine,
  CONGELACIONES_POR_MES,
} from '../src/streak-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

/** Días consecutivos terminando en `hasta`, hacia atrás. */
function seguidos(hasta, n) {
  const dias = [];
  let d = hasta;
  for (let i = 0; i < n; i++) { dias.unshift(d); d = prevDay(d); }
  return dias;
}

const HOY = new Date(2026, 8, 15);      // 15 de septiembre de 2026, local
const hoy = dayKey(HOY);

/* ── FECHAS LOCALES ──────────────────────────────────────────── */

grupo('LA ZONA HORARIA ES LA TUYA, NO LA DEL SERVIDOR');
igual('una fecha local se escribe así', dayKey(new Date(2026, 0, 5)), '2026-01-05');
ok('a las 23:30 sigue siendo hoy, no mañana',
  dayKey(new Date(2026, 8, 15, 23, 30)) === '2026-09-15');
ok('y a las 00:30 ya es el día siguiente',
  dayKey(new Date(2026, 8, 16, 0, 30)) === '2026-09-16');
igual('el día siguiente cruza bien el fin de mes', nextDay('2026-01-31'), '2026-02-01');
igual('y el anterior también', prevDay('2026-03-01'), '2026-02-28');
igual('el año bisiesto no se inventa nada', nextDay('2028-02-28'), '2028-02-29');

/* ── LO BÁSICO ───────────────────────────────────────────────── */

grupo('CONTAR DÍAS SEGUIDOS');
const cinco = streakInfo(seguidos(hoy, 5), { today: HOY });
igual('cinco días seguidos son cinco', cinco.actual, 5);
igual('y también la mejor marca', cinco.masLarga, 5);
ok('hoy cuenta', cinco.hoyCuenta);
ok('y no está en peligro', !cinco.enPeligro);

igual('sin días, cero', streakInfo([], { today: HOY }).actual, 0);
igual('sin argumentos no revienta', streakInfo().actual, 0);

grupo('BASTA CON ANOTAR ALGO: NO HAY MÍNIMO CASTIGADOR');
ok('un día es un día, sin mirar cuántas páginas',
  streakInfo([hoy], { today: HOY }).actual === 1);

/* ── HOY TODAVÍA NO HA TERMINADO ─────────────────────────────── */

grupo('HOY NUNCA CUENTA COMO DÍA PERDIDO');
const hastaAyer = streakInfo(seguidos(prevDay(hoy), 4), { today: HOY });
igual('la racha de ayer sigue viva', hastaAyer.actual, 4);
ok('pero hoy todavía no cuenta', !hastaAyer.hoyCuenta);
ok('y se avisa de que está en peligro', hastaAyer.enPeligro);
ok('el texto lo dice sin dramatizar',
  /te quedan horas/.test(streakLine(hastaAyer)), streakLine(hastaAyer));
igual('y hoy NO ha gastado congelación', hastaAyer.congeladasEsteMes, 0);

/* ── EL CORAZÓN DE LA HISTORIA ───────────────────────────────── */

grupo('LAS CONGELACIONES SALVAN LA RACHA');
/* Leyó 10 días, faltó uno, y siguió leyendo 3 más hasta hoy. */
const conHueco = [...seguidos(prevDay(prevDay(prevDay(prevDay(hoy)))), 10), ...seguidos(hoy, 3)];
const salvada = streakInfo(conHueco, { today: HOY });
ok('un día perdido NO rompe la racha', salvada.actual > 3, `dio ${salvada.actual}`);
igual('se gastó una congelación', salvada.congeladasEsteMes, 1);
igual('y queda una', salvada.congelacionesRestantes, 1);

grupo('PERO NO REGALAN DÍAS');
igual('la racha suma los días LEÍDOS, no el congelado', salvada.actual, 13);
ok('trece leídos, no catorce: ese día no leíste', salvada.actual === 10 + 3);

grupo('SE AVISA, NO ES MAGIA INVISIBLE');
ok('hay aviso', Boolean(freezeNotice(salvada)));
ok('y dice qué día se salvó', /\d+ de \w+/.test(freezeNotice(salvada)), freezeNotice(salvada));
igual('sin congelaciones no hay aviso que dar', freezeNotice(streakInfo(seguidos(hoy, 3), { today: HOY })), null);

grupo('DOS AL MES, NI UNA MÁS');
igual('el tope es dos', CONGELACIONES_POR_MES, 2);
/* Tres huecos en el mismo mes: los dos primeros se salvan, el tercero rompe. */
const tresHuecos = [
  '2026-09-01', '2026-09-02',
  /* falta el 3 */ '2026-09-04',
  /* falta el 5 */ '2026-09-06',
  /* falta el 7 */ '2026-09-08', '2026-09-09',
];
const rota = streakInfo(tresHuecos, { today: new Date(2026, 8, 9) });
igual('se gastaron las dos', rota.congeladasEsteMes, 2);
igual('no quedan', rota.congelacionesRestantes, 0);
igual('y el tercer hueco sí rompió: la racha es solo el 8 y el 9', rota.actual, 2);
igual('la mejor marca recuerda lo de antes', rota.masLarga, 4);

grupo('LAS CONGELACIONES SE RENUEVAN CADA MES');
const cruzaMes = [
  '2026-08-28', '2026-08-29', /* falta el 30 */ '2026-08-31',
  /* falta el 1 */ '2026-09-02', '2026-09-03',
];
const cruzada = streakInfo(cruzaMes, { today: new Date(2026, 8, 3) });
ok('el hueco de agosto gasta de agosto y el de septiembre de septiembre',
  cruzada.actual === 5, `dio ${cruzada.actual}`);
igual('en septiembre solo se ha gastado una', cruzada.congeladasEsteMes, 1);

grupo('LO QUE NO SE PUEDE SALVAR');
/* Un mes entero sin leer: no hay congelaciones que alcancen. */
const trasUnMes = streakInfo(['2026-07-01', '2026-07-02', hoy], { today: HOY });
igual('la racha vuelve a empezar', trasUnMes.actual, 1);
igual('pero la mejor marca no se borra', trasUnMes.masLarga, 2);
ok('y no se cuelga recorriendo meses', typeof trasUnMes.actual === 'number');

/* ── LA MEJOR MARCA ──────────────────────────────────────────── */

grupo('LA RACHA MÁS LARGA');
const conPasado = streakInfo([...seguidos('2026-05-20', 12), ...seguidos(hoy, 3)], { today: HOY });
igual('la actual es la de ahora', conPasado.actual, 3);
igual('y la más larga, la de mayo', conPasado.masLarga, 12);
ok('la más larga nunca es menor que la actual',
  streakInfo(seguidos(hoy, 7), { today: HOY }).masLarga >= 7);

/* ── APUNTAR UN DÍA ──────────────────────────────────────────── */

grupo('APUNTAR EL DÍA DE HOY');
igual('se añade', addDay([], new Date(2026, 8, 15)), ['2026-09-15']);
igual('dos veces el mismo día no duplica',
  addDay(['2026-09-15'], new Date(2026, 8, 15)), ['2026-09-15']);
ok('queda ordenado', JSON.stringify(addDay(['2026-09-20'], new Date(2026, 8, 15)))
  === JSON.stringify(['2026-09-15', '2026-09-20']));
igual('y no crece para siempre',
  addDay(Array.from({ length: 800 }, (_, i) => `2020-01-${String((i % 28) + 1).padStart(2, '0')}`),
    new Date(2026, 8, 15), 800).length, 800);

/* ── LO QUE SE LEE EN LA PANTALLA ────────────────────────────── */

grupo('CÓMO SE CUENTA');
ok('sin racha, invita a empezar', /empieza tu racha/i.test(streakLine(streakInfo([], { today: HOY }))));
ok('con racha rota pero con historia, recuerda la marca',
  /mejor marca/i.test(streakLine(streakInfo(['2026-01-01', '2026-01-02'], { today: HOY }))));
ok('un día se dice en singular, con su adjetivo',
  /^1 día seguido leyendo/.test(streakLine(streakInfo([hoy], { today: HOY }))),
  streakLine(streakInfo([hoy], { today: HOY })));
ok('y varios en plural', /^5 días seguidos/.test(streakLine(cinco)), streakLine(cinco));

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
