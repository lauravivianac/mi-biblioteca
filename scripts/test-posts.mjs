/* Escribir, la visibilidad y ordenar notas · #72, #73 y #74 */

import {
  TIPOS, esTipo, tipoLabel, seAncla, VISIBILIDADES, POR_DEFECTO, esVisibilidad,
  sePublica, visibilidadesQuePuedoLeer, postDoc, publicPostDoc, aHtml, adelanto,
  citaComoTexto, tocaGuardar, hayQueRecuperar, plantillaDesdeNotas, porTrozos,
  TROZO_NOTAS, porFecha, MAX_LIBROS, MAX_TITULO,
} from '../src/posts-core.js';

let pasan = 0; const fallos = [];
const test = (nombre, fn) => {
  try { fn(); pasan++; console.log(`  ✓ ${nombre}`); } catch (e) {
    fallos.push(nombre); console.log(`  ✗ ${nombre}\n      ${e.message}`);
  }
};
const igual = (a, b, m = '') => {
  const x = JSON.stringify(a); const y = JSON.stringify(b);
  if (x !== y) throw new Error(`${m}\n      esperaba ${y}\n      salió    ${x}`);
};
const cierto = (v, m) => { if (!v) throw new Error(m || 'esperaba cierto'); };
const falso = (v, m) => { if (v) throw new Error(m || 'esperaba falso'); };

console.log('\nLOS TIPOS DE ENTRADA  ·  #72');
test('los tres que pide la historia', () => {
  igual(TIPOS.map((t) => t.id), ['nota', 'resena', 'lista']);
});
test('solo las notas se anclan a una página', () => {
  cierto(seAncla('nota'));
  falso(seAncla('resena'), 'una reseña no va por página');
  falso(seAncla('lista'));
});
test('un tipo inventado se cae al de por defecto', () => {
  igual(postDoc({ uid: 'a', tipo: 'loQueSea', cuerpo: 'x' }).tipo, 'nota');
  falso(esTipo('loQueSea'));
  cierto(tipoLabel('resena').length > 0);
});

console.log('\nLA VISIBILIDAD  ·  #73');
test('los tres niveles', () => {
  igual(VISIBILIDADES.map((v) => v.id), ['privada', 'seguidoras', 'publica']);
});
test('POR DEFECTO ES PRIVADA', () => {
  igual(POR_DEFECTO, 'privada');
  igual(postDoc({ uid: 'a', cuerpo: 'x' }).visibilidad, 'privada');
});
test('una visibilidad inventada cae a privada, no a pública', () => {
  igual(postDoc({ uid: 'a', cuerpo: 'x', visibilidad: 'todoelmundo' }).visibilidad, 'privada');
  falso(esVisibilidad('todoelmundo'));
});
test('LO PRIVADO NO SE COPIA FUERA', () => {
  falso(sePublica('privada'));
  igual(publicPostDoc({ uid: 'a', cuerpo: 'x', visibilidad: 'privada' }), null);
});
test('lo demás sí', () => {
  for (const v of ['seguidoras', 'publica']) {
    cierto(sePublica(v), v);
    cierto(publicPostDoc({ uid: 'a', cuerpo: 'x', visibilidad: v }) !== null, v);
  }
});
test('la copia lleva el @usuario, para poder pintarla sin otra lectura', () => {
  const d = publicPostDoc({ uid: 'a', cuerpo: 'x', visibilidad: 'publica' }, { username: 'ANITA' });
  igual(d.username, 'anita');
});
test('cada nivel dice qué significa, no solo cómo se llama', () => {
  for (const v of VISIBILIDADES) cierto(v.sub.length > 15, v.id);
});

console.log('\nQUÉ PUEDO PEDIRLE AL SERVIDOR');
test('lo mío, todo', () => {
  igual(visibilidadesQuePuedoLeer({ soyYo: true }), ['privada', 'seguidoras', 'publica']);
});
test('de quien sigo, lo suyo menos lo privado', () => {
  igual(visibilidadesQuePuedoLeer({ laSigo: true }), ['seguidoras', 'publica']);
});
test('de una desconocida, solo lo público', () => {
  igual(visibilidadesQuePuedoLeer({}), ['publica']);
});
test('NUNCA sale «privada» de otra persona en la lista', () => {
  for (const caso of [{}, { laSigo: true }]) {
    falso(visibilidadesQuePuedoLeer(caso).includes('privada'), JSON.stringify(caso));
  }
});

console.log('\nEL DOCUMENTO');
test('una entrada vacía no se guarda', () => {
  igual(postDoc({ uid: 'a', cuerpo: '  ', titulo: '' }), null);
});
test('con solo título, sí: es un borrador legítimo', () => {
  cierto(postDoc({ uid: 'a', titulo: 'Sobre Rulfo' }) !== null);
});
test('sin autora, no', () => {
  igual(postDoc({ cuerpo: 'x' }), null);
});
test('la página solo se guarda en una nota', () => {
  igual(postDoc({ uid: 'a', tipo: 'nota', cuerpo: 'x', pagina: 42 }).pagina, 42);
  igual(postDoc({ uid: 'a', tipo: 'resena', cuerpo: 'x', pagina: 42 }).pagina, null);
});
test('una página absurda no se guarda', () => {
  for (const p of [0, -3, 'muchas', null]) {
    igual(postDoc({ uid: 'a', tipo: 'nota', cuerpo: 'x', pagina: p }).pagina, null, String(p));
  }
});
test('los libros se limitan', () => {
  const muchos = Array.from({ length: 20 }, (_, i) => ({ id: `b${i}`, title: `T${i}` }));
  igual(postDoc({ uid: 'a', cuerpo: 'x', libros: muchos }).libros.length, MAX_LIBROS);
});
test('el título se recorta', () => {
  igual(postDoc({ uid: 'a', cuerpo: 'x', titulo: 'T'.repeat(500) }).titulo.length, MAX_TITULO);
});

console.log('\nEL EDITOR MÍNIMO · cuatro marcas y ni una más');
test('negrita y cursiva', () => {
  igual(aHtml('esto es **fuerte**'), '<p>esto es <b>fuerte</b></p>');
  igual(aHtml('esto es _suave_'), '<p>esto es <i>suave</i></p>');
});
test('citas', () => {
  igual(aHtml('> lo dijo ella'), '<blockquote>lo dijo ella</blockquote>');
});
test('listas, agrupadas en una sola', () => {
  igual(aHtml('- uno\n- dos'), '<ul><li>uno</li><li>dos</li></ul>');
});
test('EL TEXTO ES UN DATO: no puede convertirse en marcado', () => {
  const h = aHtml('<script>alert(1)</script>');
  falso(h.includes('<script'), h);
  cierto(h.includes('&lt;script'));
});
test('ni con comillas ni con atributos', () => {
  const h = aHtml('un "truco" con <img src=x onerror=y>');
  falso(h.includes('<img'), h);
});
test('un guion bajo dentro de una palabra no es cursiva', () => {
  const h = aHtml('el fichero se llama post_core_js');
  falso(h.includes('<i>'), h);
});
test('las líneas en blanco no dejan párrafos vacíos', () => {
  igual(aHtml('uno\n\n\ndos'), '<p>uno</p><p>dos</p>');
});
test('el adelanto quita las marcas y no corta palabras', () => {
  const a = adelanto('- **Una** nota _larga_ que sigue y sigue y sigue y sigue y sigue', 30);
  falso(a.includes('**'));
  falso(a.includes('-'));
  cierto(a.endsWith('…'));
});
test('un adelanto corto no lleva puntos suspensivos', () => {
  igual(adelanto('corto'), 'corto');
});

console.log('\nMETER UNA CITA GUARDADA');
test('la cita entra como cita, con su libro y su página', () => {
  const t = citaComoTexto({ text: 'La memoria es un espejo', page: 42 }, { title: 'Rayuela' });
  cierto(t.startsWith('> '));
  cierto(t.includes('Rayuela'));
  cierto(t.includes('p. 42'));
});
test('una cita vacía no mete nada', () => {
  igual(citaComoTexto({ text: '  ' }), '');
});

console.log('\nEL BORRADOR · «perder un texto es imperdonable»');
test('sin cambios no se guarda', () => {
  falso(tocaGuardar({ actual: 'a', guardado: 'a', desde: 0, ahora: 99999 }));
});
test('con cambios y tras un momento, sí', () => {
  cierto(tocaGuardar({ actual: 'b', guardado: 'a', desde: 0, ahora: 5000 }));
});
test('no se guarda en cada tecla', () => {
  falso(tocaGuardar({ actual: 'b', guardado: 'a', desde: 1000, ahora: 1100 }));
});
test('un borrador vacío no se ofrece recuperar', () => {
  falso(hayQueRecuperar(null));
  falso(hayQueRecuperar({ cuerpo: '  ', titulo: '' }));
  cierto(hayQueRecuperar({ cuerpo: 'algo' }));
  cierto(hayQueRecuperar({ titulo: 'algo' }), 'un título solo también cuenta');
});

console.log('\nORDENAR NOTAS · el agente NO escribe  ·  #74');
const NOTAS = [
  'El narrador miente y lo sabe',
  'La estructura circular cansa a la mitad',
  'Me recordó a Pedro Páramo',
  'El final no cierra nada, y está bien',
];

test('el borrador se arma con MIS palabras, no con las suyas', () => {
  const r = plantillaDesdeNotas({
    notas: NOTAS,
    secciones: [{ titulo: 'La voz', notas: [0, 2] }, { titulo: 'La forma', notas: [1, 3] }],
  });
  for (const n of NOTAS) cierto(r.includes(n), `falta «${n}»`);
});
test('los títulos de sección son suyos y van marcados como negrita', () => {
  const r = plantillaDesdeNotas({ notas: NOTAS, secciones: [{ titulo: 'La voz', notas: [0] }] });
  cierto(r.includes('**La voz**'));
});
test('UNA NOTA INVENTADA NO PUEDE ENTRAR: el índice no existe', () => {
  const r = plantillaDesdeNotas({ notas: NOTAS, secciones: [{ titulo: 'X', notas: [99, 0] }] });
  cierto(r.includes(NOTAS[0]));
  falso(r.includes('99'));
});
test('índices repetidos no duplican una nota', () => {
  const r = plantillaDesdeNotas({
    notas: NOTAS,
    secciones: [{ titulo: 'A', notas: [0] }, { titulo: 'B', notas: [0] }],
  });
  igual(r.split(NOTAS[0]).length - 1, 1, 'la nota aparece una sola vez');
});
test('NINGUNA NOTA SE PIERDE, aunque no la coloque', () => {
  const r = plantillaDesdeNotas({ notas: NOTAS, secciones: [{ titulo: 'A', notas: [1] }] });
  for (const n of NOTAS) cierto(r.includes(n), `perdió «${n}»`);
  cierto(r.includes('Sin colocar'));
});
test('sin secciones no se pierde nada tampoco', () => {
  const r = plantillaDesdeNotas({ notas: NOTAS, secciones: [] });
  for (const n of NOTAS) cierto(r.includes(n));
});
test('índices que no son números se descartan', () => {
  const r = plantillaDesdeNotas({
    notas: NOTAS,
    secciones: [{ titulo: 'A', notas: ['uno', null, 1.5, -2, 0] }],
  });
  cierto(r.includes(NOTAS[0]));
});
test('se puede pedir por partes, no todo de golpe', () => {
  const muchas = Array.from({ length: 30 }, (_, i) => `nota ${i}`);
  const trozos = porTrozos(muchas);
  igual(trozos.length, Math.ceil(30 / TROZO_NOTAS));
  igual(trozos.flat().length, 30, 'y no se pierde ninguna al trocear');
});

console.log('\nORDENAR LA LISTA');
test('lo editado más recientemente va primero', () => {
  const o = porFecha([
    { id: 'a', at: 100, editado: null },
    { id: 'b', at: 50, editado: 900 },
  ]);
  igual(o[0].id, 'b');
});

console.log(`\n${pasan} pruebas pasaron, ${fallos.length} fallaron.\n`);
process.exit(fallos.length ? 1 : 0);
