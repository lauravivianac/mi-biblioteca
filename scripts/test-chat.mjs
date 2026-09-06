/* El chat, la seguridad y la reputación · #85, #86, #87 y #88 */

import {
  chatId, partesDe, chatDoc, mensajeDoc, detectaDatosPersonales,
  avisoAntesDeMandar, AVISOS_DATOS, AVISO_CABECERA, RECOMENDACIONES,
  PUNTOS_SUGERIDOS, primeraVez, puedeEscribir, mensajesOrdenados, MAX_MENSAJE,
} from '../src/chat-core.js';
import {
  confirmar, heConfirmado, faltaLaOtra, estadoConfirmacion, puedeCancelarse,
  EJES, ratingId, ratingDoc, puedeValorar, reputacion, porEje, insignia,
  MIN_PARA_PROMEDIO,
} from '../src/trust-core.js';

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

const ACEPTADA = {
  id: 'bea_s1', de: 'bea', para: 'ana', swapId: 's1',
  bookId: 'b1', title: 'Dune', author: 'Herbert', estado: 'aceptada',
};

console.log('\nEL CHAT SE ABRE SOLO SOBRE UN TRATO ACEPTADO');
test('el chat se llama como la solicitud', () => {
  igual(chatId('bea_s1'), 'bea_s1');
});
test('las partes van ordenadas, mire quien mire', () => {
  igual(partesDe('bea', 'ana'), partesDe('ana', 'bea'));
});
test('con la solicitud aceptada, se abre', () => {
  const c = chatDoc({ solicitud: ACEPTADA });
  cierto(c !== null);
  igual(c.partes, ['ana', 'bea']);
  igual(c.dueño, 'ana', 'quien ofrecía el libro');
  igual(c.recibe, 'bea', 'quien lo pidió');
});
test('SIN aceptar, no se abre', () => {
  for (const e of ['pendiente', 'rechazada', 'contrapropuesta', 'cancelada']) {
    igual(chatDoc({ solicitud: { ...ACEPTADA, estado: e } }), null, e);
  }
});
test('sin solicitud tampoco', () => {
  igual(chatDoc({ solicitud: null }), null);
});
test('nace sin confirmar y sin cerrar', () => {
  const c = chatDoc({ solicitud: ACEPTADA });
  igual(c.confirmadoPor, []);
  falso(c.completado);
  falso(c.cerrado);
});

console.log('\nMENSAJES');
test('un mensaje vacío no existe', () => {
  igual(mensajeDoc({ de: 'ana', texto: '   ' }), null);
});
test('se recorta al máximo', () => {
  igual(mensajeDoc({ de: 'ana', texto: 'x'.repeat(9999) }).texto.length, MAX_MENSAJE);
});
test('se ordenan por hora, no por como lleguen', () => {
  const o = mensajesOrdenados([{ at: 300 }, { at: 100 }, { at: 200 }]);
  igual(o.map((m) => m.at), [100, 200, 300]);
});

console.log('\nAVISAR SIN IMPEDIR  ·  #85');
test('un teléfono se detecta escrito de cualquier forma', () => {
  for (const t of ['615223344', '615 22 33 44', '615-22-33-44', '(615) 223344', '+34 615223344']) {
    cierto(detectaDatosPersonales(`llámame al ${t}`).includes('telefono'), t);
  }
});
test('un correo se detecta', () => {
  cierto(detectaDatosPersonales('escríbeme a laura@ejemplo.com').includes('correo'));
});
test('una dirección con número se detecta', () => {
  cierto(detectaDatosPersonales('vivo en la calle Mayor 7').includes('direccion'));
  cierto(detectaDatosPersonales('Carrera 15 #93').includes('direccion'));
});
test('«nos vemos en la calle» NO es una dirección', () => {
  igual(detectaDatosPersonales('nos vemos en la calle'), []);
});
test('un año o una página no son un teléfono', () => {
  igual(detectaDatosPersonales('lo leí en 2019, por la página 240'), []);
});
test('un mensaje normal no dispara nada', () => {
  igual(detectaDatosPersonales('¿Te va bien el sábado por la mañana?'), []);
});
test('EL AVISO NUNCA BLOQUEA: es un aviso', () => {
  const a = avisoAntesDeMandar('mi móvil es 615223344');
  cierto(a !== null);
  falso(a.bloquea, 'un aviso que bloquea es un filtro, y la historia pide lo contrario');
});
test('se enseña un solo aviso, no tres a la vez', () => {
  const a = avisoAntesDeMandar('615223344 y laura@ejemplo.com, calle Mayor 7');
  cierto(a.tipos.length > 1, 'ha visto varias cosas');
  igual(a.texto, AVISOS_DATOS[a.tipos[0]], 'pero enseña una');
});
test('sin nada que decir, no se dice nada', () => {
  igual(avisoAntesDeMandar('hola'), null);
});

console.log('\nSEGURIDAD  ·  #88');
test('el aviso de cabecera dice las dos cosas que importan', () => {
  cierto(/p[úu]blico/i.test(AVISO_CABECERA), 'sitio público');
  cierto(/no se paga|nunca se paga/i.test(AVISO_CABECERA), 'que no se paga');
});
test('las recomendaciones cubren lo que pide la historia', () => {
  const ids = RECOMENDACIONES.map((r) => r.id);
  for (const id of ['publico', 'dia', 'avisa', 'direccion', 'dinero']) {
    cierto(ids.includes(id), `falta ${id}`);
  }
});
test('cada recomendación explica, no solo titula', () => {
  for (const r of RECOMENDACIONES) cierto(r.texto.length > 30, r.id);
});
test('los puntos sugeridos son categorías, no sitios inventados', () => {
  cierto(PUNTOS_SUGERIDOS.length >= 4);
  for (const p of PUNTOS_SUGERIDOS) cierto(p.texto.length > 5);
});
test('la primera vez se enseñan enteras; después no', () => {
  cierto(primeraVez({ vistoSeguridad: [] }, 'ana'));
  falso(primeraVez({ vistoSeguridad: ['ana'] }, 'ana'));
  cierto(primeraVez({ vistoSeguridad: ['bea'] }, 'ana'), 'lo que vio ella no cuenta por mí');
});

console.log('\n¿SE PUEDE ESCRIBIR AQUÍ?');
const CHAT = { partes: ['ana', 'bea'], cerrado: false };
test('las dos partes sí', () => {
  cierto(puedeEscribir({ chat: CHAT, yo: 'ana' }).puede);
  cierto(puedeEscribir({ chat: CHAT, yo: 'bea' }).puede);
});
test('quien no es parte, no', () => {
  falso(puedeEscribir({ chat: CHAT, yo: 'cris' }).puede);
});
test('a quien bloqueé, no — y se dice por qué', () => {
  const r = puedeEscribir({ chat: CHAT, yo: 'ana', bloqueados: ['bea'] });
  falso(r.puede);
  cierto(/desbloqu/i.test(r.motivo));
});
test('quien me bloqueó: no se puede, y NO se dice que me bloqueó', () => {
  const r = puedeEscribir({ chat: CHAT, yo: 'ana', meBloquearon: true });
  falso(r.puede);
  falso(/bloque/i.test(r.motivo), `«${r.motivo}» convierte el bloqueo en un mensaje`);
});
test('cerrado el intercambio, se lee pero no se escribe', () => {
  const r = puedeEscribir({ chat: { ...CHAT, cerrado: true }, yo: 'ana' });
  falso(r.puede);
  cierto(/guardad|cerrad/i.test(r.motivo));
});

console.log('\nCONFIRMAR  ·  #86');
test('hacen falta LAS DOS', () => {
  const uno = confirmar({ partes: ['ana', 'bea'], confirmadoPor: [] }, 'ana');
  igual(uno.confirmadoPor, ['ana']);
  falso(uno.completado, 'con una sola no está hecho');

  const dos = confirmar({ partes: ['ana', 'bea'], confirmadoPor: ['ana'] }, 'bea');
  cierto(dos.completado);
  cierto(dos.cerrado, 'y se cierra');
});
test('confirmar dos veces no cuenta dos veces', () => {
  igual(confirmar({ partes: ['ana', 'bea'], confirmadoPor: ['ana'] }, 'ana'), null);
});
test('quien no es parte no confirma', () => {
  igual(confirmar({ partes: ['ana', 'bea'], confirmadoPor: [] }, 'cris'), null);
});
test('se dice por dónde va', () => {
  igual(estadoConfirmacion({ partes: ['ana', 'bea'], confirmadoPor: [], completado: false }, 'ana'), '');
  cierto(faltaLaOtra({ partes: ['ana', 'bea'], confirmadoPor: ['ana'], completado: false }, 'ana'));
  cierto(estadoConfirmacion({ completado: true }, 'ana').includes('hecho'));
});
test('lo que no se completó se puede cancelar', () => {
  cierto(puedeCancelarse({ completado: false, cerrado: false }));
  falso(puedeCancelarse({ completado: true }));
});
test('heConfirmado no se confunde de persona', () => {
  cierto(heConfirmado({ confirmadoPor: ['ana'] }, 'ana'));
  falso(heConfirmado({ confirmadoPor: ['ana'] }, 'bea'));
});

console.log('\nVALORAR  ·  #86');
const HECHO = { partes: ['ana', 'bea'], completado: true };
test('los tres ejes que pide la historia', () => {
  igual(EJES.map((e) => e.id), ['puntualidad', 'estado', 'trato']);
});
test('el identificador es uno por intercambio y persona', () => {
  igual(ratingId('bea_s1', 'ana'), 'bea_s1_ana');
});
test('NO se puede valorar sin haber intercambiado', () => {
  const r = puedeValorar({ chat: { partes: ['ana', 'bea'], completado: false }, yo: 'ana' });
  falso(r.puede);
  cierto(r.motivo.length > 10);
});
test('ni quien no participó', () => {
  falso(puedeValorar({ chat: HECHO, yo: 'cris' }).puede);
});
test('ni dos veces', () => {
  falso(puedeValorar({ chat: HECHO, yo: 'ana', yaValoro: true }).puede);
});
test('completado y siendo parte, sí', () => {
  cierto(puedeValorar({ chat: HECHO, yo: 'ana' }).puede);
});
test('la valoración guarda su propia media', () => {
  const d = ratingDoc({ de: 'ana', sobre: 'bea', chatIdent: 'c1', puntualidad: 5, estado: 4, trato: 3 });
  igual(d.media, 4);
});
test('sin puntuar los tres ejes no vale', () => {
  igual(ratingDoc({ de: 'ana', sobre: 'bea', chatIdent: 'c1', puntualidad: 5, estado: 0, trato: 3 }), null);
});
test('no se valora a una misma', () => {
  igual(ratingDoc({ de: 'ana', sobre: 'ana', chatIdent: 'c1', puntualidad: 5, estado: 5, trato: 5 }), null);
});
test('lo que se pasa de cinco se recorta a cinco', () => {
  const d = ratingDoc({ de: 'ana', sobre: 'bea', chatIdent: 'c1', puntualidad: 99, estado: 4, trato: 3 });
  igual(d.puntualidad, 5);
});
test('UN EJE SIN PUNTUAR NO SE CONVIERTE EN UNA ESTRELLA', () => {
  /* Estaba escrito con un Math.max(1, …) que subía el cero hasta uno:
     un eje sin tocar le ponía a alguien la peor nota, y una valoración
     no se puede corregir después. */
  for (const sinPuntuar of [0, -4, null, undefined, NaN]) {
    igual(
      ratingDoc({ de: 'ana', sobre: 'bea', chatIdent: 'c1', puntualidad: 5, estado: sinPuntuar, trato: 3 }),
      null,
      `con estado=${sinPuntuar} debería no valer`,
    );
  }
});

console.log('\nLA REPUTACIÓN · lo que la historia pide de verdad');
const val = (m) => ({ media: m, puntualidad: m, estado: m, trato: m });

test('sin valoraciones no es una mancha', () => {
  const r = reputacion([]);
  igual(r.n, 0);
  igual(r.promedio, null);
  cierto(/primera/i.test(r.detalle), 'alguien tiene que ser la primera');
});
test('CON UNA SOLA NO SE ENSEÑA EL PROMEDIO', () => {
  const r = reputacion([val(5)]);
  igual(r.n, 1);
  falso(r.fiable);
  falso(r.texto.includes('5 ★'), `«${r.texto}» presenta un 5 perfecto como si dijera algo`);
  cierto(r.texto.includes('1'), 'pero sí se dice cuántos');
});
test('con dos, tampoco', () => {
  falso(reputacion([val(5), val(5)]).fiable);
});
test('a partir de tres, sí', () => {
  const r = reputacion([val(5), val(4), val(3)]);
  cierto(r.fiable);
  igual(r.promedio, 4);
  cierto(r.texto.includes('★'));
});
test('el mínimo es el que dice el módulo, no un número suelto', () => {
  falso(reputacion(Array(MIN_PARA_PROMEDIO - 1).fill(val(5))).fiable);
  cierto(reputacion(Array(MIN_PARA_PROMEDIO).fill(val(5))).fiable);
});
test('el desglose por eje solo cuando hay algo', () => {
  igual(porEje([]), []);
  igual(porEje([val(4), val(2)])[0].valor, 3);
});
test('la insignia es corta y no miente', () => {
  igual(insignia(reputacion([])), 'Nueva');
  igual(insignia(reputacion([val(5)])), '1 ✓', 'con una, el número; nunca las estrellas');
  cierto(insignia(reputacion([val(5), val(5), val(5)])).includes('★'));
});

console.log(`\n${pasan} pruebas pasaron, ${fallos.length} fallaron.\n`);
process.exit(fallos.length ? 1 : 0);
