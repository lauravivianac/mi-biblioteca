/* ─────────────────────────────────────────────────────────────
   PRUEBAS DEL @USUARIO

   Aviso que vale por todo el archivo: LA UNICIDAD NO SE PRUEBA AQUÍ,
   porque no se garantiza aquí. La garantizan las reglas de Firestore
   —un `create` sobre un documento que ya existe falla, y ahí no hay
   carrera que valga—. Lo que se prueba aquí es la forma del nombre y
   los mensajes; creerse que el cliente garantiza unicidad es
   exactamente el error que la nota técnica de la historia avisa.
   ───────────────────────────────────────────────────────────── */

import {
  validateUsername, normalize, canChangeUsername, displayHandle,
  suggestUsername, RESERVADOS, MIN, MAX, DIAS_ENTRE_CAMBIOS,
} from '../src/username-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

const vale = (u) => validateUsername(u).ok;
const error = (u) => validateUsername(u).error;

/* ── MAYÚSCULAS ──────────────────────────────────────────────── */

grupo('«LAURA» Y «laura» SON LA MISMA PERSONA');
igual('todo se guarda en minúsculas', validateUsername('Laura').username, 'laura');
igual('y se compara igual', normalize('  LAURA  '), 'laura');
ok('dejar que sean dos cuentas sería regalar la suplantación',
  validateUsername('LAURA').username === validateUsername('laura').username);

/* ── LA FORMA ────────────────────────────────────────────────── */

grupo('QUÉ SE PUEDE ESCRIBIR');
ok('letras y números', vale('laura23'));
ok('guion bajo', vale('laura_v'));
ok('punto en medio', vale('laura.v'));
ok('tres caracteres justos', vale('abc'));
ok('veinte justos', vale('a'.repeat(MAX)));

grupo('QUÉ NO');
ok('vacío, no', !vale(''));
ok('dos caracteres, no', !vale('ab'));
ok('veintiuno, no', !vale('a'.repeat(MAX + 1)));
ok('espacios, no', !vale('laura viviana'));
ok('tildes, no', !vale('laurá'));
ok('la eñe tampoco, aunque duela', !vale('mañana'));
ok('emojis, no', !vale('laura🔥'));
ok('arroba dentro, no', !vale('lau@ra'));
ok('guion normal, no', !vale('laura-v'));
ok('empezar por punto, no', !vale('.laura'));
ok('terminar en punto, no', !vale('laura.'));
ok('dos puntos seguidos, no', !vale('lau..ra'));

grupo('CADA ERROR DICE QUÉ ARREGLAR');
ok('el corto dice cuántos faltan', /3 caracteres/.test(error('ab')), error('ab'));
ok('el largo dice el tope', /20/.test(error('a'.repeat(30))), error('a'.repeat(30)));
ok('el de forma enumera lo que sí vale', /guion bajo y punto/.test(error('laura-v')), error('laura-v'));
ok('el del punto final lo dice claro', /punto/.test(error('laura.')), error('laura.'));
ok('ninguno es un «no válido» a secas',
  ['ab', 'a'.repeat(30), 'laura-v', '.laura', 'admin'].every((u) => error(u).length > 12));

/* ── NOMBRES RESERVADOS ──────────────────────────────────────── */

grupo('LOS QUE NO PUEDE LLEVARSE NADIE');
ok('admin, no', !vale('admin'));
ok('soporte, no', !vale('soporte'));
ok('ayuda, no', !vale('ayuda'));
ok('ni en mayúsculas: se normaliza antes de mirar', !vale('ADMIN'));
ok('el motivo lo dice', /reservado/i.test(error('admin')), error('admin'));
ok('están los que puede usar quien quiera engañar',
  ['soporte', 'oficial', 'staff', 'moderador'].every((u) => RESERVADOS.has(u)));
ok('y las rutas que la app usará algún día',
  ['ajustes', 'perfil', 'buscar', 'api'].every((u) => RESERVADOS.has(u)));
ok('pero uno normal que los contenga sí vale', vale('adminlaura'));

/* ── CAMBIAR DE NOMBRE ───────────────────────────────────────── */

grupo('CAMBIARLO, CON LÍMITE');
const AHORA = Date.now();
const DIA = 86400000;
ok('el primero es gratis', canChangeUsername({}, AHORA).ok);
ok('sin fecha guardada, también', canChangeUsername({ username: 'laura' }, AHORA).ok);
ok('recién cambiado, no',
  !canChangeUsername({ username: 'laura', usernameChangedAt: AHORA - 2 * DIA }, AHORA).ok);
ok('y dice cuánto falta',
  /28 días/.test(canChangeUsername({ username: 'laura', usernameChangedAt: AHORA - 2 * DIA }, AHORA).error),
  canChangeUsername({ username: 'laura', usernameChangedAt: AHORA - 2 * DIA }, AHORA).error);
ok('a un día, se dice «mañana» y no «1 días»',
  /mañana/.test(canChangeUsername({ username: 'laura', usernameChangedAt: AHORA - 29 * DIA }, AHORA).error),
  canChangeUsername({ username: 'laura', usernameChangedAt: AHORA - 29 * DIA }, AHORA).error);
ok('pasados treinta días, sí',
  canChangeUsername({ username: 'laura', usernameChangedAt: AHORA - 31 * DIA }, AHORA).ok);
igual('el plazo está donde dice', DIAS_ENTRE_CAMBIOS, 30);

/* ── CÓMO SE ENSEÑA ──────────────────────────────────────────── */

grupo('CON ARROBA, SIEMPRE');
igual('se pinta con arroba', displayHandle('laura'), '@laura');
igual('y en minúsculas aunque venga en mayúsculas', displayHandle('LAURA'), '@laura');
igual('sin nombre, nada — ni una arroba suelta', displayHandle(''), '');
igual('ni con null', displayHandle(null), '');

/* ── LA SUGERENCIA ───────────────────────────────────────────── */

grupo('NO DEJAR EL CAMPO EN BLANCO MIRÁNDOTE');
igual('del nombre, limpiando', suggestUsername('Laura Viviana'), 'lauraviviana');
igual('las tildes se quitan, no rompen', suggestUsername('José Martínez'), 'josemartinez');
igual('del correo si no hay nombre', suggestUsername('', 'lauraviviana177@gmail.com'), 'lauraviviana177');
ok('lo sugerido siempre es válido',
  ['Laura Viviana', 'José Martínez', 'Ana', 'Bo'].every((n) => {
    const s = suggestUsername(n);
    return !s || validateUsername(s).ok;
  }),
  JSON.stringify(['Laura Viviana', 'José Martínez', 'Ana', 'Bo'].map(suggestUsername)));
ok('un nombre corto se completa en vez de salir inválido',
  validateUsername(suggestUsername('Bo')).ok, suggestUsername('Bo'));
igual('sin nada, no se inventa nada', suggestUsername('', ''), '');
ok('no sugiere un reservado', !RESERVADOS.has(suggestUsername('Admin')), suggestUsername('Admin'));

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
