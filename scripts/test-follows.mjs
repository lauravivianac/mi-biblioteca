/* ─────────────────────────────────────────────────────────────
   PRUEBAS DE SEGUIR Y DE BUSCAR PERSONAS

   Lo que más importa aquí es que el modelo sea ASIMÉTRICO de verdad:
   una flecha por sentido, y seguir a alguien no le hace seguirme. El
   error clásico es guardar «pareja» en vez de «flecha», y entonces
   dejar de seguir borra también el seguimiento contrario.
   ───────────────────────────────────────────────────────────── */

import {
  followId, splitFollowId, canFollow, followDoc, followButton, followBadge,
  cuenta, seguidorasTexto, siguiendoTexto, followNotice, NOTICE_FIELDS,
  noticeText, unread, byNewest,
} from '../src/follows-core.js';
import {
  parseQuery, buscable, rankPeople, dedupe, sinMi,
  commonBooks, porQue, rankSuggestions, clavesParaBuscar, MAX_EN_CONSULTA,
} from '../src/search-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

/* ── LA FLECHA ───────────────────────────────────────────────── */

grupo('UNA FLECHA POR SENTIDO, NO UNA PAREJA');
ok('el identificador lleva el orden dentro', followId('ana', 'bea') === 'ana_bea');
ok('y al revés es OTRO documento', followId('bea', 'ana') !== followId('ana', 'bea'));
igual('se puede leer de vuelta', splitFollowId('ana_bea'), { follower: 'ana', following: 'bea' });
ok('un uid con guion bajo dentro no rompe la lectura',
  splitFollowId('a_b_c')?.following === 'b_c');
ok('sin guion bajo, null', splitFollowId('anabea') === null);
ok('un guion al principio no es un id', splitFollowId('_bea') === null);
ok('ni al final', splitFollowId('ana_') === null);

grupo('A TI MISMA NO');
ok('no puedes seguirte', !canFollow('ana', 'ana'));
ok('ni seguir a nadie', !canFollow('ana', null));
ok('ni seguir sin sesión', !canFollow(null, 'bea'));
ok('a otra persona sí', canFollow('ana', 'bea'));
ok('el documento de seguirte a ti misma no existe', followDoc({ follower: 'ana', following: 'ana' }) === null);

grupo('EL DOCUMENTO');
{
  const d = followDoc({ follower: 'ana', following: 'bea', at: 7 });
  igual('lleva los dos uid y la fecha', d, { follower: 'ana', following: 'bea', at: 7 });
  ok('los uid van DENTRO además de en el camino, para poder consultarlos',
    d.follower === 'ana' && d.following === 'bea');
}

/* ── EL BOTÓN ────────────────────────────────────────────────── */

grupo('EL BOTÓN DICE LO QUE HARÍA');
igual('sin seguir: Seguir', followButton({ sigo: false }),
  { texto: 'Seguir', accion: 'seguir', activo: false });
igual('siguiendo: Siguiendo', followButton({ sigo: true }),
  { texto: 'Siguiendo', accion: 'dejar', activo: true });
ok('que me siga no cambia mi botón',
  followButton({ sigo: false }).texto === 'Seguir');

grupo('«TE SIGUE» VA APARTE DEL BOTÓN');
ok('si me sigue y no la sigo', followBadge({ sigo: false, meSigue: true }) === 'Te sigue');
ok('si nos seguimos', followBadge({ sigo: true, meSigue: true }) === 'Os seguís');
ok('si solo la sigo yo, nada', followBadge({ sigo: true, meSigue: false }) === '');
ok('si no hay nada, nada', followBadge({}) === '');

grupo('LOS CONTADORES SE LEEN EN CASTELLANO');
ok('una seguidora', seguidorasTexto(1) === '1 seguidora');
ok('dos seguidoras', seguidorasTexto(2) === '2 seguidoras');
ok('cero también en plural', seguidorasTexto(0) === '0 seguidoras');
ok('siguiendo a', siguiendoTexto(5) === 'siguiendo a 5');
ok('cuenta sirve para cualquier par', cuenta(1, 'libro', 'libros') === '1 libro');

/* ── LOS AVISOS ──────────────────────────────────────────────── */

grupo('EL AVISO DE QUE ALGUIEN TE SIGUE');
{
  const n = followNotice({ from: 'ana', fromName: 'Ana', fromUsername: 'ana.p', to: 'bea', at: 3 });
  const sobran = Object.keys(n).filter((k) => !NOTICE_FIELDS.includes(k));
  igual('no lleva nada fuera de la lista', sobran, []);
  ok('lleva quién avisa, que es lo que comprueban las reglas', n.from === 'ana');
  ok('nace sin leer', n.leido === false);
  ok('a ti misma no te avisas', followNotice({ from: 'ana', to: 'ana' }) === null);
  ok('se lee con el @usuario', noticeText(n) === '@ana.p te sigue');
  ok('sin @usuario, con el nombre',
    noticeText({ tipo: 'follow', fromName: 'Ana' }) === 'Ana te sigue');
  ok('sin nada, «Alguien»', noticeText({ tipo: 'follow' }) === 'Alguien te sigue');
  ok('un nombre larguísimo se corta',
    followNotice({ from: 'a', to: 'b', fromName: 'x'.repeat(200) }).fromName.length === 60);
}

grupo('DEJAR DE SEGUIR NO AVISA');
ok('no hay forma de construir un aviso de «dejó de seguirte»: no existe el tipo',
  noticeText({ tipo: 'unfollow', fromName: 'Ana' }) === 'Ana hizo algo');

grupo('LA BANDEJA');
{
  const avisos = [
    { at: 1, leido: true }, { at: 3, leido: false }, { at: 2, leido: false },
  ];
  ok('el punto rojo cuenta solo lo no leído', unread(avisos) === 2);
  igual('se ordenan de más nuevo a más viejo', byNewest(avisos).map((a) => a.at), [3, 2, 1]);
  ok('ordenar no toca el original', avisos[0].at === 1);
  ok('sin avisos, cero', unread([]) === 0);
}

/* ── BUSCAR ──────────────────────────────────────────────────── */

grupo('LO QUE SE ESCRIBE, ENTENDIDO');
ok('la arroba no forma parte del nombre', parseQuery('@laura').handle === 'laura');
ok('varias arrobas tampoco', parseQuery('@@laura').handle === 'laura');
ok('las mayúsculas se bajan', parseQuery('Laura').texto === 'laura');
ok('los espacios de los lados se van', parseQuery('  laura  ').texto === 'laura');
ok('los espacios de dentro se aplanan', parseQuery('ana   maría').texto === 'ana maría');
ok('un nombre con espacio no es un @usuario', parseQuery('ana maría').handle === null);
ok('con acento tampoco', parseQuery('maría').handle === null);
ok('dos letras no son un @usuario válido', parseQuery('ab').handle === null);
ok('vacío se nota', parseQuery('   ').vacio);
ok('con una letra no se va a la base', !buscable('a'));
ok('con dos, sí', buscable('an'));
ok('vacío, no', !buscable(''));

grupo('EL @USUARIO EXACTO VA PRIMERO');
{
  const gente = [
    { uid: '1', username: 'lauravi', nameLower: 'laura vi' },
    { uid: '2', username: 'ana', nameLower: 'laura ana' },
    { uid: '3', username: 'laura', nameLower: 'otra' },
  ];
  igual('quien buscabas, arriba', rankPeople(gente, 'laura').map((p) => p.uid), ['3', '1', '2']);
  igual('con arroba, igual', rankPeople(gente, '@laura').map((p) => p.uid), ['3', '1', '2']);
  ok('un empate respeta el orden que vino',
    rankPeople([{ uid: 'a', username: 'zzz', nameLower: 'x' }, { uid: 'b', username: 'yyy', nameLower: 'x' }], 'q')[0].uid === 'a');
}

grupo('SIN REPETIDOS Y SIN MÍ');
igual('el mismo uid no sale dos veces',
  dedupe([{ uid: '1' }, { uid: '1' }, { uid: '2' }]).map((p) => p.uid), ['1', '2']);
ok('sin uid no cuenta', dedupe([{}, { uid: '1' }]).length === 1);
igual('buscarme a mí no me encuentra',
  sinMi([{ uid: 'yo' }, { uid: 'otra' }], 'yo').map((p) => p.uid), ['otra']);

/* ── QUIZÁ CONOZCAS ──────────────────────────────────────────── */

grupo('LIBROS EN COMÚN');
igual('los que están en las dos listas', commonBooks(['a', 'b', 'c'], ['b', 'c', 'd']), ['b', 'c']);
igual('sin nada en común, vacío', commonBooks(['a'], ['b']), []);
igual('una lista vacía, vacío', commonBooks([], ['b']), []);
ok('un repetido no cuenta dos veces', commonBooks(['a'], ['a', 'a']).length === 1);

grupo('POR QUÉ SE SUGIERE');
ok('con tres o más, se dicen', porQue({ comunes: 4 }) === 'Habéis leído 4 libros en común');
ok('con dos', porQue({ comunes: 2 }) === 'Habéis leído 2 libros en común');
ok('con uno, en singular', porQue({ comunes: 1 }) === 'Habéis leído el mismo libro');
ok('sin libros pero misma ciudad',
  porQue({ comunes: 0, ciudad: 'Bogotá', miCiudad: 'bogotá' }) === 'También lee en Bogotá');
ok('sin nada, algo se dice igual', porQue({}) === 'Puede que os llevéis bien');
ok('nunca se queda sin motivo', porQue({ comunes: 0, ciudad: 'X', miCiudad: 'Y' }).length > 0);

grupo('EL ORDEN DE LAS SUGERENCIAS');
{
  const p = [
    { uid: 'a', comunes: 1, numeros: { leidosTotal: 50 } },
    { uid: 'b', comunes: 5, numeros: { leidosTotal: 2 } },
    { uid: 'c', comunes: 5, numeros: { leidosTotal: 30 } },
  ];
  igual('más libros en común primero', rankSuggestions(p).map((x) => x.uid), ['c', 'b', 'a']);
  ok('el tope se respeta', rankSuggestions(p, 2).length === 2);
  ok('sin uid no entra', rankSuggestions([{ comunes: 9 }]).length === 0);
}

grupo('EL TOPE DE LA CONSULTA');
ok('Firestore no acepta más de 30 en array-contains-any',
  clavesParaBuscar(Array.from({ length: 100 }, (_, i) => i)).length === MAX_EN_CONSULTA);
ok('se cogen los ÚLTIMOS, que describen mejor lo que lees ahora',
  clavesParaBuscar([1, 2, 3, 4]).at(-1) === 4);
igual('con pocos, todos', clavesParaBuscar([1, 2]), [1, 2]);

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
