/* Explorar y solicitar · historias #83 y #84
   Lógica pura, sin Firestore: qué se ve, en qué orden, y quién puede
   hacer qué con una solicitud. */

import {
  AMBITOS, ambitoSiguiente, ambitoLabel, claveLibro, indiceDeMisLibros,
  miEstadoCon, marcaDe, distanciaTexto, puntosDeCercania, filtrar, ordenar,
  opcionesDe, hayFiltros, vacio,
} from '../src/explore-core.js';
import {
  MAX_OFRECIDOS, MAX_POR_DIA, requestId, requestDoc, contraofertaDoc,
  requestNotice, estadoTexto, estaViva, puedeResponder, puedeCerrarContra,
  puedeCancelar, transicionValida, puedeSolicitar, enviadasHoy, resumenOferta,
  porAtender,
} from '../src/requests-core.js';

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

console.log('\nHASTA DÓNDE MIRO');
test('los ámbitos se abren en cadena', () => {
  igual(ambitoSiguiente('ciudad'), 'pais');
  igual(ambitoSiguiente('pais'), 'todo');
  igual(ambitoSiguiente('todo'), null, 'el último no amplía a nada');
});
test('cada ámbito tiene su nombre', () => {
  for (const a of AMBITOS) cierto(ambitoLabel(a.id).length > 0);
});

console.log('\nRECONOCER UN LIBRO ENTRE DOS BIBLIOTECAS');
test('la clave ignora tildes y mayúsculas', () => {
  igual(claveLibro('Pedro Páramo', 'Juan RULFO'), claveLibro('pedro paramo', 'juan rulfo'));
});
test('la eñe sobrevive: «El Año» y «El Ano» no son el mismo libro', () => {
  cierto(claveLibro('El Año del Pensamiento', 'X') !== claveLibro('El Ano del Pensamiento', 'X'));
});
test('un libro añadido a mano se reconoce por título y autor', () => {
  const idx = indiceDeMisLibros([{ id: 'mio-7', title: 'Rayuela', author: 'Cortázar', status: 'pending' }]);
  igual(miEstadoCon({ bookId: 'suyo-99', title: 'rayuela', author: 'cortazar' }, idx), 'pending');
});
test('y por identificador cuando lo comparten', () => {
  const idx = indiceDeMisLibros([{ id: 'seed-3', title: 'Otro', author: 'Otra', status: 'read' }]);
  igual(miEstadoCon({ bookId: 'seed-3', title: 'No importa', author: '' }, idx), 'read');
});
test('lo que no tengo no lleva marca', () => {
  igual(miEstadoCon({ bookId: 'x', title: 'Nada', author: '' }, indiceDeMisLibros([])), null);
  igual(marcaDe(null), null);
});
test('cada estado tiene su frase', () => {
  for (const e of ['pending', 'reading', 'read']) cierto(marcaDe(e).texto.length > 0);
});

console.log('\nLA CERCANÍA, SIN DECIR DÓNDE VIVE NADIE');
test('mismo geohash largo = a un paseo', () => {
  igual(distanciaTexto({ geohash: 'd2g6xp' }, 'd2g6xp'), 'A un paseo');
});
test('sin geohash se cae a la ciudad', () => {
  igual(distanciaTexto({ cityKey: 'bogota', city: 'Bogotá' }, null, 'bogota'), 'En tu ciudad');
});
test('otra ciudad se nombra, no se miente', () => {
  igual(distanciaTexto({ cityKey: 'cali', city: 'Cali' }, null, 'bogota'), 'En Cali');
});
test('NUNCA se devuelve una distancia en kilómetros', () => {
  const t = distanciaTexto({ geohash: 'd2g6xp' }, 'd2g6xq');
  falso(/\d/.test(t), `«${t}» lleva un número dentro`);
});
test('más letras compartidas puntúa más', () => {
  const a = puntosDeCercania({ geohash: 'd2g6xp' }, 'd2g6xp');
  const b = puntosDeCercania({ geohash: 'd2g6zz' }, 'd2g6xp');
  cierto(a > b);
});

console.log('\nFILTRAR');
const LISTA = [
  { id: '1', bookId: 'seed-1', title: 'Pedro Páramo', author: 'Juan Rulfo', genre: 'Clásico', estado: 'bueno', cityKey: 'bogota', geohash: 'd2g6xp', at: 100 },
  { id: '2', bookId: 'seed-2', title: 'Rayuela', author: 'Julio Cortázar', genre: 'Clásico', estado: 'usado', cityKey: 'bogota', geohash: 'd2g6zz', at: 200 },
  { id: '3', bookId: 'seed-3', title: 'Dune', author: 'Frank Herbert', genre: 'Ciencia ficción', estado: 'nuevo', cityKey: 'cali', geohash: 'd2xxxx', at: 300 },
];

test('la búsqueda mira título y autor a la vez', () => {
  igual(filtrar(LISTA, { texto: 'cortazar' }).map((p) => p.id), ['2']);
  igual(filtrar(LISTA, { texto: 'dune' }).map((p) => p.id), ['3']);
});
test('y le dan igual las tildes', () => {
  igual(filtrar(LISTA, { texto: 'paramo' }).map((p) => p.id), ['1']);
});
test('por género', () => {
  igual(filtrar(LISTA, { genero: 'Clásico' }).map((p) => p.id), ['1', '2']);
});
test('por estado del ejemplar', () => {
  igual(filtrar(LISTA, { estado: 'nuevo' }).map((p) => p.id), ['3']);
});
test('por cercanía mínima', () => {
  const cerca = filtrar(LISTA, { minimoCercania: 5, mio: 'd2g6xp' });
  igual(cerca.map((p) => p.id), ['1']);
});
test('solo lo que ya quiero leer', () => {
  const idx = indiceDeMisLibros([{ id: 'seed-2', title: 'Rayuela', author: 'Julio Cortázar', status: 'pending' }]);
  igual(filtrar(LISTA, { soloMiLista: true, indice: idx }).map((p) => p.id), ['2']);
});
test('sin filtros no se cae nada', () => {
  igual(filtrar(LISTA, {}).length, 3);
  falso(hayFiltros({}));
  cierto(hayFiltros({ genero: 'Clásico' }));
});

console.log('\nORDENAR · lo que ya querías leer, primero');
test('lo pendiente sube por encima de lo más cercano', () => {
  const idx = indiceDeMisLibros([{ id: 'seed-3', title: 'Dune', author: 'Frank Herbert', status: 'pending' }]);
  const orden = ordenar(LISTA, { indice: idx, mio: 'd2g6xp', miCityKey: 'bogota' });
  igual(orden[0].id, '3', 'Dune está lejos pero es el que quería leer');
});
test('a igualdad, gana lo más cerca', () => {
  const orden = ordenar(LISTA, { indice: indiceDeMisLibros([]), mio: 'd2g6xp' });
  igual(orden[0].id, '1');
});
test('lo ya leído se va al final, pero no desaparece', () => {
  const idx = indiceDeMisLibros([{ id: 'seed-1', title: 'Pedro Páramo', author: 'Juan Rulfo', status: 'read' }]);
  const orden = ordenar(LISTA, { indice: idx, mio: 'd2g6xp' });
  igual(orden[orden.length - 1].id, '1');
  igual(orden.length, 3);
});
test('las opciones salen de lo que hay, ordenadas por cuántos', () => {
  const { generos } = opcionesDe(LISTA);
  igual(generos[0], { valor: 'Clásico', n: 2 });
});

console.log('\nCUANDO NO HAY NADA, SE DICE POR QUÉ');
test('sin ciudad se ofrece ponerla', () => {
  igual(vacio({ sinCiudad: true }).accion, 'ciudad');
});
test('con filtros se ofrece quitarlos', () => {
  igual(vacio({ conFiltros: true }).accion, 'limpiar');
});
test('ciudad vacía se ofrece ampliar, y se nombra la ciudad', () => {
  const v = vacio({ ambito: 'ciudad', ciudad: 'Tunja' });
  igual(v.accion, 'ampliar');
  igual(v.siguiente, 'pais');
  cierto(v.texto.includes('Tunja'));
});
test('en el ámbito más ancho ya no se ofrece ampliar', () => {
  igual(vacio({ ambito: 'todo' }).accion, 'ofrecer');
});
test('ninguna pantalla vacía se queda en «no hay resultados»', () => {
  for (const v of [vacio({ sinCiudad: true }), vacio({ conFiltros: true }), vacio({}), vacio({ ambito: 'todo' })]) {
    cierto(v.detalle.length > 20, 'falta la explicación');
    cierto(v.accionTexto.length > 0, 'falta el botón');
  }
});

console.log('\nSOLICITAR · el documento');
const PUB = { id: 's1', uid: 'ana', bookId: 'b1', title: 'Dune', author: 'Herbert', cover: null, activa: true };
const LIBROS = [
  { id: 'x1', title: 'Uno', author: 'A' },
  { id: 'x2', title: 'Dos', author: 'B' },
  { id: 'x3', title: 'Tres', author: 'C' },
  { id: 'x4', title: 'Cuatro', author: 'D' },
];

test('el identificador junta quién pide y qué', () => {
  igual(requestId('bea', 's1'), 'bea_s1');
});
test('lleva copia del libro pedido', () => {
  const d = requestDoc({ de: 'bea', para: 'ana', publicacion: PUB, ofrezco: [LIBROS[0]] });
  igual(d.title, 'Dune');
  igual(d.swapId, 's1');
  igual(d.estado, 'pendiente');
});
test('NO lleva ningún campo de dinero', () => {
  const d = requestDoc({ de: 'bea', para: 'ana', publicacion: PUB, mensaje: 'hola' });
  for (const k of ['precio', 'price', 'pago']) falso(k in d, `lleva ${k}`);
});
test('como mucho tres libros ofrecidos', () => {
  const d = requestDoc({ de: 'bea', para: 'ana', publicacion: PUB, ofrezco: LIBROS });
  igual(d.ofrezco.length, MAX_OFRECIDOS);
});
test('sin libros, es «suelto» aunque no se diga', () => {
  const d = requestDoc({ de: 'bea', para: 'ana', publicacion: PUB, ofrezco: [] });
  cierto(d.suelto);
});
test('no se pide a una misma', () => {
  igual(requestDoc({ de: 'ana', para: 'ana', publicacion: PUB }), null);
});
test('sin publicación no hay solicitud', () => {
  igual(requestDoc({ de: 'bea', para: 'ana', publicacion: null }), null);
});
test('el mensaje se recorta', () => {
  const d = requestDoc({ de: 'bea', para: 'ana', publicacion: PUB, mensaje: 'x'.repeat(999) });
  igual(d.mensaje.length, 300);
});

console.log('\nSOLICITAR · ¿puedo?');
test('lo mío no me lo pido', () => {
  falso(puedeSolicitar({ yo: 'ana', publicacion: PUB }).puede);
});
test('lo retirado no se pide', () => {
  falso(puedeSolicitar({ yo: 'bea', publicacion: { ...PUB, activa: false } }).puede);
});
test('no se pide dos veces lo mismo mientras siga vivo', () => {
  const r = puedeSolicitar({ yo: 'bea', publicacion: PUB, yaSolicitado: { estado: 'pendiente' } });
  falso(r.puede);
  cierto(r.yaEsta);
});
test('pero sí si la anterior se cerró', () => {
  cierto(puedeSolicitar({ yo: 'bea', publicacion: PUB, yaSolicitado: { estado: 'rechazada' } }).puede);
});
test('el tope diario corta, y lo dice con números', () => {
  const r = puedeSolicitar({ yo: 'bea', publicacion: PUB, enviadasHoy: MAX_POR_DIA });
  falso(r.puede);
  cierto(r.motivo.includes(String(MAX_POR_DIA)));
});
test('se cuentan solo las de las últimas 24 horas', () => {
  const ahora = 10 * 24 * 60 * 60 * 1000;
  const lista = [{ at: ahora - 1000 }, { at: ahora - 5 * 24 * 60 * 60 * 1000 }];
  igual(enviadasHoy(lista, ahora), 1);
});
test('cada «no» explica por qué', () => {
  for (const caso of [
    { yo: '', publicacion: PUB },
    { yo: 'ana', publicacion: PUB },
    { yo: 'bea', publicacion: { ...PUB, activa: false } },
    { yo: 'bea', publicacion: PUB, enviadasHoy: 99 },
  ]) cierto(puedeSolicitar(caso).motivo.length > 10, JSON.stringify(caso));
});

console.log('\nLA MÁQUINA DE ESTADOS');
const PEND = { id: 'bea_s1', de: 'bea', para: 'ana', estado: 'pendiente' };
const CONTRA = { ...PEND, estado: 'contrapropuesta' };

test('quien recibe contesta', () => {
  cierto(puedeResponder(PEND, 'ana'));
  falso(puedeResponder(PEND, 'bea'), 'quien pide no se contesta sola');
});
test('QUIEN PIDE NO PUEDE ACEPTARSE A SÍ MISMA', () => {
  falso(transicionValida({ sol: PEND, yo: 'bea', nuevo: 'aceptada' }));
});
test('una tercera no toca nada', () => {
  for (const e of ['aceptada', 'rechazada', 'cancelada', 'contrapropuesta']) {
    falso(transicionValida({ sol: PEND, yo: 'cris', nuevo: e }), e);
  }
});
test('quien recibe puede aceptar, rechazar o contraproponer', () => {
  for (const e of ['aceptada', 'rechazada', 'contrapropuesta']) {
    cierto(transicionValida({ sol: PEND, yo: 'ana', nuevo: e }), e);
  }
});
test('pero no puede retirar la solicitud ajena', () => {
  falso(transicionValida({ sol: PEND, yo: 'ana', nuevo: 'cancelada' }));
});
test('la contrapropuesta la cierra quien pidió, no quien la hizo', () => {
  cierto(puedeCerrarContra(CONTRA, 'bea'));
  falso(puedeCerrarContra(CONTRA, 'ana'));
  falso(transicionValida({ sol: CONTRA, yo: 'ana', nuevo: 'aceptada' }));
});
test('lo cerrado no se retoca', () => {
  const cerrada = { ...PEND, estado: 'aceptada' };
  for (const yo of ['ana', 'bea']) {
    for (const e of ['aceptada', 'rechazada', 'cancelada']) {
      falso(transicionValida({ sol: cerrada, yo, nuevo: e }), `${yo} → ${e}`);
    }
  }
});
test('retirar la propia sí, mientras siga viva', () => {
  cierto(puedeCancelar(PEND, 'bea'));
  cierto(puedeCancelar(CONTRA, 'bea'));
  falso(puedeCancelar({ ...PEND, estado: 'rechazada' }, 'bea'));
});
test('un estado inventado no cuela', () => {
  falso(transicionValida({ sol: PEND, yo: 'ana', nuevo: 'loQueSea' }));
});

console.log('\nCÓMO SE LEE');
test('el mismo estado se lee distinto según de qué lado estés', () => {
  cierto(estadoTexto(PEND, 'bea') !== estadoTexto(PEND, 'ana'));
});
test('«viva» es lo que todavía espera algo', () => {
  cierto(estaViva(PEND));
  cierto(estaViva(CONTRA));
  for (const e of ['aceptada', 'rechazada', 'cancelada']) falso(estaViva({ estado: e }), e);
});
test('la oferta se resume sin mentir', () => {
  igual(resumenOferta({ suelto: true }), 'Lo pide suelto');
  igual(resumenOferta({ ofrezco: [{ title: 'Uno' }] }), 'Ofrece «Uno»');
  igual(resumenOferta({ ofrezco: [{ title: 'Uno' }, { title: 'Dos' }] }), 'Ofrece 2 libros');
});
test('lo que espera respuesta va arriba', () => {
  const orden = porAtender([
    { id: 'a', estado: 'rechazada', at: 900 },
    { id: 'b', estado: 'pendiente', at: 100 },
  ]);
  igual(orden[0].id, 'b');
});

console.log('\nCONTRAPROPUESTA Y AVISOS');
test('vacía no se manda', () => {
  igual(contraofertaDoc({ pido: [], mensaje: '' }), null);
});
test('con mensaje solo, vale', () => {
  cierto(contraofertaDoc({ mensaje: 'ese no, ¿otro?' }) !== null);
});
test('también se limita a tres', () => {
  igual(contraofertaDoc({ pido: LIBROS }).pido.length, MAX_OFRECIDOS);
});
test('los avisos solo son de los dos tipos previstos', () => {
  cierto(requestNotice({ de: 'bea', tipo: 'swapreq' }) !== null);
  cierto(requestNotice({ de: 'bea', tipo: 'swapres' }) !== null);
  igual(requestNotice({ de: 'bea', tipo: 'loQueSea' }), null);
  igual(requestNotice({ tipo: 'swapreq' }), null);
});

console.log(`\n${pasan} pruebas pasaron, ${fallos.length} fallaron.\n`);
process.exit(fallos.length ? 1 : 0);
