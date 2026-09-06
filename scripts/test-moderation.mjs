/* ─────────────────────────────────────────────────────────────
   PRUEBAS DE COMENTARIOS Y MODERACIÓN

   El grupo que más importa es «EL FILTRO NO PUEDE PILLAR A QUIEN NO
   HIZO NADA». Un filtro que se salta con un acento no filtra; pero uno
   que censura «disputa» porque contiene «puta» es peor, porque se nota
   y se nota en gente inocente. Las dos cosas se prueban aquí.
   ───────────────────────────────────────────────────────────── */

import {
  normalizar, tieneInsulto, MENSAJE_FILTRO, MOTIVOS, TIPOS_REPORTABLES,
  reportDoc, REPORT_FIELDS, blockId, puedeBloquear, blockDoc,
  flechasARomper, EXPLICACION, filtrarFuera, SOPORTE, mailtoSoporte,
} from '../src/moderation-core.js';
import {
  MAX, REACCIONES, limpiar, validarComentario, commentDoc, COMMENT_FIELDS,
  puedeBorrar, ordenar, contar, contarReacciones, alternarReaccion,
  miReaccion, comentariosCerrados, MENSAJE_CERRADO, AVISO_SPOILER,
} from '../src/comments-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

/* ── EL FILTRO ───────────────────────────────────────────────── */

grupo('EL FILTRO NO SE SALTA CON TRUCOS');
ok('un insulto se pilla', tieneInsulto('eres una idiota'));
ok('con tildes puestas también', tieneInsulto('eres una idiòta'));
ok('en mayúsculas', tieneInsulto('ERES UNA IDIOTA'));
ok('con números por letras: 1d10t4', tieneInsulto('eres una 1d10t4'));
ok('con asteriscos: i*d*i*o*t*a', tieneInsulto('eres una i*d*i*o*t*a'));
ok('con letras repetidas: idiotaaaaa', tieneInsulto('eres una idiotaaaaa'));
ok('una frase entera', tieneInsulto('ojala te mueras'));

grupo('EL FILTRO NO PILLA A QUIEN NO HIZO NADA');
ok('«disputa» lleva «puta» dentro y NO es un insulto', !tieneInsulto('hubo una disputa en el club'));
ok('«diputada» tampoco', !tieneInsulto('la diputada presentó el libro'));
ok('«reputación» tampoco', !tieneInsulto('tiene buena reputación'));
ok('«computadora» tampoco', !tieneInsulto('lo leí en la computadora'));
ok('un libro puede parecerte una mierda', !tieneInsulto('me pareció una mierda de libro'));
ok('y puedes decir que lo odiaste', !tieneInsulto('odié este libro con toda mi alma'));
ok('un comentario normal pasa', !tieneInsulto('me encantó, lloré al final'));
ok('vacío no es insulto', !tieneInsulto(''));
ok('un insulto DENTRO de una excepción sí se pilla',
  tieneInsulto('la diputada es una idiota'));

grupo('NORMALIZAR ES SOLO PARA MIRAR, NO PARA GUARDAR');
ok('quita tildes', normalizar('canción') === 'cancion');
ok('baja mayúsculas', normalizar('HOLA') === 'hola');
ok('la eñe se respeta: es una letra, no un acento', normalizar('año') === 'año');
ok('junta repeticiones hasta una letra', normalizar('holaaaaa') === 'hola');
ok('pero «perro» no se convierte en «pero»', normalizar('perro') === 'perro');
ok('quita puntuación', normalizar('¡hola, qué tal!') === 'hola que tal');

/* ── REPORTAR ────────────────────────────────────────────────── */

grupo('REPORTAR');
{
  const r = reportDoc({ de: 'u1', sobre: 'c9', tipo: 'comentario', motivo: 'acoso', detalle: 'Me insultó', copia: 'texto malo' });
  const sobran = Object.keys(r).filter((k) => !REPORT_FIELDS.includes(k));
  igual('nada fuera de la lista', sobran, []);
  ok('nace pendiente de revisar', r.estado === 'pendiente');
  ok('LLEVA COPIA DEL TEXTO: si se borra el original, el reporte no se queda sin pruebas',
    r.copia === 'texto malo');
  ok('sin motivo válido, null', reportDoc({ de: 'u1', sobre: 'c9', tipo: 'comentario', motivo: 'porque si' }) === null);
  ok('sin tipo válido, null', reportDoc({ de: 'u1', sobre: 'c9', tipo: 'cancion', motivo: 'acoso' }) === null);
  ok('sin quién reporta, null', reportDoc({ sobre: 'c9', tipo: 'comentario', motivo: 'acoso' }) === null);
  ok('el detalle se corta', reportDoc({ de: 'u1', sobre: 'c9', tipo: 'comentario', motivo: 'acoso', detalle: 'x'.repeat(900) }).detalle.length === 500);
  ok('hay motivos para elegir', MOTIVOS.length >= 5);
  ok('todos con id y etiqueta', MOTIVOS.every((m) => m.id && m.label));
  ok('se puede reportar un perfil, un comentario, una reseña y un intercambio',
    ['perfil', 'comentario', 'resena', 'intercambio'].every((t) => TIPOS_REPORTABLES.includes(t)));
}

/* ── BLOQUEAR ────────────────────────────────────────────────── */

grupo('BLOQUEAR');
ok('a ti misma no', !puedeBloquear('u1', 'u1'));
ok('a otra sí', puedeBloquear('u1', 'u2'));
ok('el documento lleva quién y a quién', blockDoc({ de: 'u1', a: 'u2', at: 5 }).a === 'u2');
ok('bloquearte a ti misma no da documento', blockDoc({ de: 'u1', a: 'u1' }) === null);
igual('rompe el seguimiento EN LAS DOS DIRECCIONES',
  flechasARomper('u1', 'u2'), ['u1_u2', 'u2_u1']);
ok('el identificador es direccional', blockId('u1', 'u2') !== blockId('u2', 'u1'));

grupo('SILENCIAR NO ES BLOQUEAR, Y SE EXPLICA');
ok('bloquear dice que os dejáis de seguir', EXPLICACION.bloquear.includes('seguir'));
ok('silenciar dice que ella no se entera', EXPLICACION.silenciar.includes('no se entera'));
ok('son textos distintos', EXPLICACION.bloquear !== EXPLICACION.silenciar);

grupo('LO DE QUIEN BLOQUEASTE NO SE VE');
{
  const items = [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }];
  igual('fuera lo de bloqueadas', filtrarFuera(items, { bloqueados: ['b'] }).map((i) => i.uid), ['a', 'c']);
  igual('y lo de silenciadas', filtrarFuera(items, { silenciados: ['a'] }).map((i) => i.uid), ['b', 'c']);
  igual('las dos cosas a la vez',
    filtrarFuera(items, { bloqueados: ['a'], silenciados: ['c'] }).map((i) => i.uid), ['b']);
  igual('sin nada que filtrar, todo pasa', filtrarFuera(items).map((i) => i.uid), ['a', 'b', 'c']);
}

grupo('EL SOPORTE, QUE LA GUÍA 1.2 EXIGE QUE SEA VISIBLE');
ok('hay un correo', SOPORTE.correo.includes('@'));
ok('el enlace se puede pulsar', mailtoSoporte().startsWith('mailto:'));
ok('lleva asunto', mailtoSoporte().includes('subject='));
ok('y se le puede meter cuerpo', mailtoSoporte('hola').includes('body='));

/* ── COMENTARIOS ─────────────────────────────────────────────── */

grupo('ESCRIBIR UN COMENTARIO');
ok('uno normal vale', validarComentario('Me encantó el final').ok);
ok('vacío no', !validarComentario('   ').ok);
ok('y lo dice', validarComentario('').error.includes('Escribe'));
ok('demasiado largo no', !validarComentario('x'.repeat(MAX + 1)).ok);
ok('justo en el límite sí', validarComentario('x'.repeat(MAX)).ok);
ok('con insulto no', !validarComentario('eres idiota').ok);
ok('y el mensaje explica en vez de regañar', validarComentario('eres idiota').error === MENSAJE_FILTRO);
ok('los espacios de sobra se van', validarComentario('  hola   qué tal  ').texto === 'hola qué tal');
ok('limpiar aplana saltos de línea', limpiar('a\n\nb') === 'a b');

grupo('EL DOCUMENTO DEL COMENTARIO');
{
  const c = commentDoc({ uid: 'u1', username: 'ANA', name: 'Ana', target: 'act1', targetOwner: 'u9', texto: 'Qué bueno', at: 3 });
  const sobran = Object.keys(c).filter((k) => !COMMENT_FIELDS.includes(k));
  igual('nada fuera de la lista', sobran, []);
  ok('el @usuario en minúsculas', c.username === 'ana');
  ok('lleva de quién es la publicación, para poder moderarla', c.targetOwner === 'u9');
  ok('no es spoiler si no se dice', c.spoiler === false);
  ok('un «casi sí» no cuenta como spoiler',
    commentDoc({ uid: 'u1', target: 't', texto: 'x', spoiler: 'si' }).spoiler === false);
  ok('con insulto no se crea documento',
    commentDoc({ uid: 'u1', target: 't', texto: 'eres idiota' }) === null);
  ok('sin target no se crea', commentDoc({ uid: 'u1', texto: 'hola' }) === null);
}

grupo('QUIÉN PUEDE BORRAR');
ok('quien lo escribió', puedeBorrar({ uid: 'u1', targetOwner: 'u9' }, 'u1'));
ok('la dueña de la publicación, aunque no lo escribiera',
  puedeBorrar({ uid: 'u1', targetOwner: 'u9' }, 'u9'));
ok('nadie más', !puedeBorrar({ uid: 'u1', targetOwner: 'u9' }, 'u5'));
ok('sin sesión, no', !puedeBorrar({ uid: 'u1' }, null));

/* ── LA CONVERSACIÓN ─────────────────────────────────────────── */

grupo('EL HILO SE LEE EN ORDEN');
{
  const cs = [
    { id: 'c2', at: 200 },
    { id: 'c1', at: 100 },
    { id: 'r1', at: 150, replyTo: 'c1' },
    { id: 'r2', at: 120, replyTo: 'c1' },
  ];
  const o = ordenar(cs);
  igual('las respuestas van pegadas a su comentario y en orden',
    o.map((c) => c.id), ['c1', 'r2', 'r1', 'c2']);
  ok('las respuestas se marcan con nivel', o[1].nivel === 1 && o[0].nivel === 0);
  ok('el contador cuenta todo', contar(cs) === 4);
}

grupo('UNA RESPUESTA NO SE PIERDE SI BORRAN A SU PADRE');
{
  const o = ordenar([{ id: 'r1', at: 10, replyTo: 'borrado' }]);
  ok('sigue estando', o.length === 1);
  ok('sube a la raíz', o[0].nivel === 0);
  ok('y se sabe que quedó huérfana', o[0].huerfano === true);
}

/* ── REACCIONES ──────────────────────────────────────────────── */

grupo('REACCIONAR SIN ESCRIBIR');
{
  ok('hay emojis para elegir', REACCIONES.length >= 4);
  const r0 = {};
  const r1 = alternarReaccion(r0, 'u1', '❤️');
  ok('poner uno', miReaccion(r1, 'u1') === '❤️');
  const r2 = alternarReaccion(r1, 'u1', '❤️');
  ok('tocarlo otra vez lo quita', miReaccion(r2, 'u1') === null);
  const r3 = alternarReaccion(r1, 'u1', '🔥');
  ok('UNA persona, UNA reacción: cambiar sustituye, no suma',
    miReaccion(r3, 'u1') === '🔥' && Object.keys(r3).length === 1);
  ok('no se toca el original', miReaccion(r1, 'u1') === '❤️');
  ok('un emoji que no está en la lista se ignora',
    alternarReaccion(r0, 'u1', '💀')['u1'] === undefined);

  const cuentas = contarReacciones({ a: '❤️', b: '❤️', c: '🔥', d: '💀' });
  igual('se cuentan por emoji, y lo raro no cuenta',
    cuentas, [{ emoji: '❤️', n: 2 }, { emoji: '🔥', n: 1 }]);
  igual('sin reacciones, lista vacía', contarReacciones({}), []);
}

/* ── SPOILERS Y COMENTARIOS CERRADOS ─────────────────────────── */

grupo('SPOILERS');
ok('un comentario puede marcarse',
  commentDoc({ uid: 'u1', target: 't', texto: 'muere al final', spoiler: true }).spoiler === true);
ok('el aviso dice qué hacer', AVISO_SPOILER.toLowerCase().includes('toca'));

grupo('APAGAR LOS COMENTARIOS DE UNA PIEZA');
ok('por defecto están abiertos', !comentariosCerrados({}));
ok('se pueden cerrar', comentariosCerrados({ comentariosOff: true }));
ok('un «casi sí» no los cierra', !comentariosCerrados({ comentariosOff: 'si' }));
ok('y se explica quién los cerró', MENSAJE_CERRADO.includes('desactivado'));

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
