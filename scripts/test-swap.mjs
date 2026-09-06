/* ─────────────────────────────────────────────────────────────
   PRUEBAS DEL INTERCAMBIO: SITIO Y PUBLICACIÓN

   El grupo que manda es «NUNCA SE GUARDA DÓNDE VIVES». En el resto de
   la app una fuga es un dato de más; aquí la gente queda en persona.
   Por eso se comprueba contra el documento crudo que no hay ni
   latitud, ni longitud, ni dirección — y que el geohash está recortado
   de verdad, no solo por convenio.
   ───────────────────────────────────────────────────────────── */

import {
  geohash, PRECISION, letrasComunes, cercania, CERCANIA,
  normalizarLugar, mismoLugar, placeDoc, PLACE_FIELDS, placeTexto,
  tieneCiudad, SIN_CIUDAD, PROMESA,
} from '../src/place-core.js';
import {
  ESTADOS, esEstado, MIN_DIAS_CUENTA, MIN_LIBROS, MAX_ACTIVAS,
  puedePublicar, puedeExplorar, swapDoc, SWAP_FIELDS, resumenPublicacion,
  puedePublicarseEste, MOTIVO_NO_LEIDO, pesoDataUrl, fotoCabe, MAX_FOTO_BYTES,
} from '../src/swap-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

/* ── LO QUE MÁS IMPORTA ──────────────────────────────────────── */

grupo('NUNCA SE GUARDA DÓNDE VIVES');
{
  const p = placeDoc({ country: 'Colombia', city: 'Bogotá', area: 'Chapinero', lat: 4.6533, lon: -74.0836 });
  const sobran = Object.keys(p).filter((k) => !PLACE_FIELDS.includes(k));
  igual('nada fuera de la lista', sobran, []);
  const crudo = JSON.stringify(p);
  ok('no hay latitud', !('lat' in p) && !crudo.includes('4.65'));
  ok('no hay longitud', !('lon' in p) && !crudo.includes('74.08'));
  ok('no hay dirección ni código postal', !crudo.includes('direccion') && !crudo.includes('postal'));
  ok('el geohash está recortado a la precisión pactada', p.geohash.length === PRECISION);
  ok('y no se puede afinar después: solo se guardó eso', p.geohash.length < 12);
}

grupo('SIN COORDENADAS TAMPOCO PASA NADA');
{
  const p = placeDoc({ country: 'España', city: 'Madrid' });
  ok('se puede poner la ciudad a mano', p.city === 'Madrid');
  ok('y el geohash queda a null', p.geohash === null);
  ok('sin ciudad no hay sitio, y eso es una opción válida',
    placeDoc({ country: 'España' }) === null);
  ok('la app lo explica en vez de exigirlo', SIN_CIUDAD.includes('se pide'));
  ok('y hay una promesa escrita', PROMESA.includes('Nunca se guarda tu dirección'));
}

/* ── EL GEOHASH ──────────────────────────────────────────────── */

grupo('EL GEOHASH');
ok('Bogotá empieza por d2g', geohash(4.6533, -74.0836).startsWith('d2g'));
ok('Madrid empieza por ezj', geohash(40.4168, -3.7038).startsWith('ezj'));
ok('dos puntos cercanos comparten principio',
  letrasComunes(geohash(4.6533, -74.0836), geohash(4.6540, -74.0840)) >= 5);
ok('dos ciudades distintas, no',
  letrasComunes(geohash(4.6533, -74.0836), geohash(40.4168, -3.7038)) === 0);
ok('una latitud imposible da null', geohash(95, 0) === null);
ok('una longitud imposible también', geohash(0, 200) === null);
ok('sin números, null', geohash(null, null) === null);
ok('la precisión se puede pedir más corta', geohash(4.65, -74.08, 3).length === 3);

grupo('LA CERCANÍA ES UN ESCALÓN, NO UNA DISTANCIA');
{
  ok('nunca devuelve kilómetros: dar la distancia exacta permite triangular',
    CERCANIA.every((c) => !/\d/.test(c.texto)));
  ok('mismo geohash entero, a un paseo', cercania('d2g6fd', 'd2g6fd').texto === 'A un paseo');
  ok('cinco letras, cerca', cercania('d2g6fd', 'd2g6fx').texto === 'Cerca');
  ok('tres letras, en tu ciudad', cercania('d2g6fd', 'd2gxxx').texto === 'En tu ciudad');
  ok('cuatro letras, en tu zona', cercania('d2g6fd', 'd2g6xx').texto === 'En tu zona');
  ok('nada en común, lejos', cercania('d2g6fd', 'ezjxxx').texto === 'Lejos');
  ok('sin geohash, null', cercania(null, 'd2g') === null);
}

/* ── LOS NOMBRES DE SITIO ────────────────────────────────────── */

grupo('«BOGOTÁ» Y «BOGOTA D.C.» SON EL MISMO SITIO');
ok('las tildes dan igual', mismoLugar('Bogotá', 'bogota'));
ok('el D.C. sobra', mismoLugar('Bogotá', 'Bogota D.C.'));
ok('«Ciudad de México» es «México»', mismoLugar('Ciudad de México', 'mexico'));
ok('«CDMX» y «Ciudad de México» son el mismo sitio', mismoLugar('CDMX', 'Ciudad de México'));
ok('y «DF» también', mismoLugar('DF', 'mexico'));
ok('las mayúsculas dan igual', mismoLugar('MADRID', 'madrid'));
ok('los espacios de sobra, también', mismoLugar('  Buenos   Aires ', 'buenos aires'));
ok('DOS CIUDADES DISTINTAS SIGUEN SIENDO DISTINTAS', !mismoLugar('Bogotá', 'Medellín'));
ok('«Santiago» no es «Santiago de Chile»… pero casi: se normaliza igual el prefijo',
  normalizarLugar('Santiago') === 'santiago');
ok('vacío no es igual a vacío: sin ciudad no hay coincidencia', !mismoLugar('', ''));
ok('LA EÑE SE RESPETA: «La Coruña» no puede acabar siendo «La Coruna»',
  normalizarLugar('La Coruña') === 'la coruña');
ok('y dos sitios que solo se distinguen por la eñe siguen siendo dos',
  !mismoLugar('Coruña', 'Coruna'));

grupo('CÓMO SE LEE UN SITIO');
ok('con zona', placeTexto({ area: 'Chapinero', city: 'Bogotá', country: 'Colombia' }) === 'Chapinero · Bogotá · Colombia');
ok('sin zona no deja huecos', placeTexto({ city: 'Madrid', country: 'España' }) === 'Madrid · España');
ok('vacío es vacío', placeTexto({}) === '');
ok('tieneCiudad distingue', tieneCiudad({ city: 'X' }) && !tieneCiudad({ city: '  ' }));

/* ── LOS REQUISITOS PARA PUBLICAR  ·  #89 ────────────────────── */

const CUMPLE = {
  emailVerified: true,
  createdAt: Date.now() - 10 * 86400000,
  libros: 5,
  activas: 0,
  ciudad: true,
};

grupo('QUIÉN PUEDE PUBLICAR');
ok('quien cumple todo', puedePublicar(CUMPLE).puede);
ok('sin correo verificado, no', !puedePublicar({ ...CUMPLE, emailVerified: false }).puede);
ok('con la cuenta recién hecha, no', !puedePublicar({ ...CUMPLE, createdAt: Date.now() }).puede);
ok('sin libros, no', !puedePublicar({ ...CUMPLE, libros: 0 }).puede);
ok('sin ciudad, no', !puedePublicar({ ...CUMPLE, ciudad: false }).puede);
ok('sin nada de nada, tampoco', !puedePublicar({}).puede);

grupo('SE DICE QUÉ FALTA, NO UN «NO PUEDES» SECO');
{
  const r = puedePublicar({ ...CUMPLE, emailVerified: false, libros: 1 });
  ok('salen los dos que faltan', r.faltan.length === 2);
  ok('cada uno dice cómo se arregla', r.faltan.every((f) => f.comoSeArregla.length > 0));
  ok('el de los libros dice cuántos llevas', r.faltan.find((f) => f.id === 'libros').comoSeArregla.includes('1'));
  ok('los que ya cumple se marcan, para ver que vas por buen camino',
    r.requisitos.filter((x) => x.ok).length === 2);
  const nueva = puedePublicar({ ...CUMPLE, createdAt: Date.now() - 86400000 });
  ok('la antigüedad dice cuánto queda',
    nueva.faltan.find((f) => f.id === 'antiguedad').comoSeArregla.includes('2 días'));
  const casi = puedePublicar({ ...CUMPLE, createdAt: Date.now() - 2 * 86400000 });
  ok('y en singular cuando queda uno',
    casi.faltan.find((f) => f.id === 'antiguedad').comoSeArregla.includes('queda 1 día'));
}

grupo('EL TOPE DE PUBLICACIONES ES OTRA COSA');
{
  const r = puedePublicar({ ...CUMPLE, activas: MAX_ACTIVAS });
  ok('con el tope lleno no se puede publicar', !r.puede);
  ok('pero no aparece como un requisito que no cumples', r.faltan.length === 0);
  ok('se explica que hay que retirar alguno', r.mensajeTope.includes('Retira'));
  ok('con uno menos, sí', puedePublicar({ ...CUMPLE, activas: MAX_ACTIVAS - 1 }).puede);
}

grupo('LA BARRERA ES SOLO PARA PUBLICAR');
ok('explorar no pide nada', puedeExplorar());
ok('y los mínimos son bajos a propósito',
  MIN_DIAS_CUENTA <= 7 && MIN_LIBROS <= 5);

/* ── LA PUBLICACIÓN  ·  #82 ──────────────────────────────────── */

const LIBRO = { id: 'b1', title: 'Rayuela', author: 'Julio Cortázar', genre: 'Latinoamérica', cover: 'https://x/r.jpg' };
const SITIO = placeDoc({ country: 'Colombia', city: 'Bogotá', area: 'Chapinero', lat: 4.65, lon: -74.08 });
const pub = (extra = {}) => swapDoc({
  uid: 'u1', username: 'laura.v', name: 'Laura', book: LIBRO,
  estado: 'bueno', place: SITIO, at: 1000, ...extra,
});

grupo('SIN PAGOS: ES TRUEQUE');
{
  const d = pub({ aCambioDe: 'Algo de terror' });
  const sobran = Object.keys(d).filter((k) => !SWAP_FIELDS.includes(k));
  igual('nada fuera de la lista', sobran, []);
  ok('NO HAY CAMPO DE PRECIO, y no puede aparecer por accidente',
    !('precio' in d) && !('price' in d) && !SWAP_FIELDS.includes('precio'));
  ok('o pides algo a cambio…', d.aCambioDe === 'Algo de terror');
  ok('…o lo das suelto', pub({ suelto: true }).suelto === true);
  ok('y si lo das suelto, no se guarda lo que pedías',
    pub({ suelto: true, aCambioDe: 'un libro' }).aCambioDe === '');
}

grupo('LA PUBLICACIÓN LLEVA EL SITIO YA RECORTADO');
{
  const d = pub();
  ok('la ciudad sí', d.city === 'Bogotá');
  ok('la zona sí', d.area === 'Chapinero');
  ok('el geohash recortado sí', d.geohash.length === PRECISION);
  ok('coordenadas NO', !('lat' in d) && !('lon' in d));
}

grupo('LO QUE NO SE PUEDE PUBLICAR');
ok('sin libro, null', swapDoc({ uid: 'u1', place: SITIO }) === null);
ok('sin sitio, null', swapDoc({ uid: 'u1', book: LIBRO }) === null);
ok('sin ciudad en el sitio, null', swapDoc({ uid: 'u1', book: LIBRO, place: { country: 'X' } }) === null);
ok('sin uid, null', swapDoc({ book: LIBRO, place: SITIO }) === null);
ok('un libro sin leer no se ofrece', !puedePublicarseEste('reading'));
ok('ni uno pendiente', !puedePublicarseEste('pending'));
ok('uno leído sí', puedePublicarseEste('read'));
ok('y se dice por qué', MOTIVO_NO_LEIDO.includes('ya hayas leído'));

grupo('EL ESTADO DEL LIBRO');
ok('hay cuatro', ESTADOS.length === 4);
ok('todos con etiqueta y ejemplo', ESTADOS.every((e) => e.label && e.hint));
ok('un estado inventado cae a «bueno»', pub({ estado: 'destrozado' }).estado === 'bueno');
ok('uno válido se respeta', pub({ estado: 'muy-usado' }).estado === 'muy-usado');
ok('esEstado los reconoce', esEstado('nuevo') && !esEstado('nuevecito'));
ok('el resumen dice estado y si es suelto',
  resumenPublicacion({ estado: 'nuevo', suelto: true }) === 'Como nuevo · Lo doy suelto');
ok('y si busca algo a cambio',
  resumenPublicacion({ estado: 'usado' }).includes('Busco algo a cambio'));

grupo('LA FOTO');
{
  const dataUrl = `data:image/jpeg;base64,${'A'.repeat(1000)}`;
  ok('una foto normal entra', pub({ foto: dataUrl }).foto === dataUrl);
  ok('un texto cualquiera NO se guarda como foto', pub({ foto: 'https://x/y.jpg' }).foto === null);
  ok('ni un script disfrazado', pub({ foto: 'javascript:alert(1)' }).foto === null);
  ok('sin foto, null', pub().foto === null);
  ok('el peso se calcula del base64, no de la cadena entera',
    pesoDataUrl(dataUrl) === 750);
  ok('una foto pequeña cabe', fotoCabe(dataUrl));
  ok('una enorme no', !fotoCabe(`data:image/jpeg;base64,${'A'.repeat(MAX_FOTO_BYTES * 2)}`));
  ok('algo que no es data URL pesa cero', pesoDataUrl('hola') === 0);
}

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
