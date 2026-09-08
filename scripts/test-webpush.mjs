/* ─────────────────────────────────────────────────────────────
   LA CRIPTOGRAFÍA DE WEB PUSH  ·  historia #95

     npm run test:webpush

   Esto no se puede probar «leyéndolo»: o los bytes son exactamente los
   de la norma, o el navegador descarta el mensaje SIN DECIR NADA. No
   hay error, no hay log, no llega la notificación y no se sabe por qué.

   ── CÓMO SE PRUEBA SIN UN SERVICIO DE PUSH ──────────────────

   Con el viaje de ida y vuelta: se cifra con `worker/push.js` y se
   DESCIFRA aquí con una implementación del lado del navegador escrita
   aparte, siguiendo la RFC 8291 desde el otro extremo. Si el mensaje
   vuelve a salir legible, las dos mitades coinciden.

   Pero una ida y vuelta sola es débil: si las dos mitades comparten mi
   error —por ejemplo intercambiar las dos claves en `key_info`— el
   viaje funciona igual y la prueba pasa mientras el navegador de verdad
   descarta el mensaje. Así que además se comprueba, por separado y
   contra el texto de la norma:

     · las tres cadenas de `info`, letra por letra;
     · el orden de las dos claves dentro de `key_info`;
     · la forma exacta de la cabecera del cuerpo, byte a byte;
     · y el JWT de VAPID, verificado con la clave PÚBLICA — que es una
       comprobación de verdad independiente, no un espejo.

   ── LO QUE SIGUE SIN COMPROBARSE ────────────────────────────

   Un 201 de un servicio de push real. Eso no lo puede dar esta batería.
   ───────────────────────────────────────────────────────────── */

import { webcrypto } from 'node:crypto';
import {
  cifrar, cabeceraVapid, b64urlABytes, bytesAB64url,
  INFO_CLAVE, INFO_CEK, INFO_NONCE, TAMANO_REGISTRO,
} from '../worker/push.js';

/* En un Worker `crypto` es global. En Node hay que ponerlo. */
if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.atob) globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
if (!globalThis.btoa) globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
const ok = (nombre, condicion, detalle = '') => {
  if (condicion) { pasaron += 1; console.log(`  ✓ ${nombre}`); } else {
    fallaron += 1; console.log(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  }
};

const texto = (s) => new TextEncoder().encode(s);
const unir = (...t) => {
  const total = t.reduce((n, x) => n + x.length, 0);
  const s = new Uint8Array(total);
  let i = 0;
  for (const x of t) { s.set(x, i); i += x.length; }
  return s;
};

/* ── LAS CADENAS DE LA NORMA, LITERALES ──────────────────────── */

grupo('LAS CADENAS DE «INFO», LETRA POR LETRA');

/* Copiadas de la RFC 8291 §3.4 y de la RFC 8188 §2.2. Se comparan con
   las del código: si alguien las «arregla» quitando el \0 del final o
   cambiando una mayúscula, esto se pone rojo antes de que nadie se
   pregunte por qué no llegan las notificaciones. */
ok('la de la clave es «WebPush: info» y termina en NUL',
  INFO_CLAVE === 'WebPush: info\0', JSON.stringify(INFO_CLAVE));
ok('la del cifrado nombra aes128gcm',
  INFO_CEK === 'Content-Encoding: aes128gcm\0', JSON.stringify(INFO_CEK));
ok('y la del nonce, nonce',
  INFO_NONCE === 'Content-Encoding: nonce\0', JSON.stringify(INFO_NONCE));
ok('el tamaño de registro es 4096', TAMANO_REGISTRO === 4096);

/* ── BASE64URL ───────────────────────────────────────────────── */

grupo('BASE64URL, SIN RELLENO Y CON - _');

ok('ida y vuelta', bytesAB64url(b64urlABytes('SGVsbG8')) === 'SGVsbG8');
ok('no lleva relleno', !bytesAB64url(Uint8Array.of(1, 2, 3, 4, 5)).includes('='));
ok('ni + ni /', !/[+/]/.test(bytesAB64url(Uint8Array.of(251, 255, 190, 255))));
ok('y lo que tenía + / se lee igual',
  b64urlABytes('-_8').length === 2);

/* ── EL VIAJE DE IDA Y VUELTA ────────────────────────────────── */

/* El lado del NAVEGADOR, escrito aparte siguiendo la RFC 8291 desde el
   otro extremo. No comparte una sola línea con `worker/push.js`. */
async function descifrarComoElNavegador(cuerpo, privadaUa, publicaUa, authSecreto) {
  const sal = cuerpo.slice(0, 16);
  const idlen = cuerpo[20];
  const asPublica = cuerpo.slice(21, 21 + idlen);
  const cifrado = cuerpo.slice(21 + idlen);

  const suClave = await crypto.subtle.importKey(
    'raw', asPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  );
  const compartido = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: suClave }, privadaUa, 256,
  ));

  const hmac = async (k, d) => new Uint8Array(await crypto.subtle.sign('HMAC',
    await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), d));
  const hkdf = async (salt, ikm, info, n) =>
    (await hmac(await hmac(salt, ikm), unir(info, Uint8Array.of(1)))).slice(0, n);

  const ikm = await hkdf(authSecreto, compartido,
    unir(texto('WebPush: info\0'), publicaUa, asPublica), 32);
  const cek = await hkdf(sal, ikm, texto('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sal, ikm, texto('Content-Encoding: nonce\0'), 12);

  const clave = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const claro = new Uint8Array(await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 }, clave, cifrado,
  ));
  /* Fuera el delimitador de relleno del final. */
  return new TextDecoder().decode(claro.slice(0, -1));
}

/** Una suscripción de mentira, con claves de verdad. */
async function suscripcionDeMentira() {
  const par = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  );
  const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    sub: {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      p256dh: bytesAB64url(publica),
      auth: bytesAB64url(auth),
    },
    privada: par.privateKey,
    publica,
    authSecreto: auth,
  };
}

grupo('LO QUE SE CIFRA, SE PUEDE DESCIFRAR');

const d = await suscripcionDeMentira();
const MENSAJE = JSON.stringify({ titulo: 'Cleo', cuerpo: '¿Por dónde vas con Bartleby?' });
const cuerpo = await cifrar(MENSAJE, d.sub);

ok('el navegador puede leerlo',
  (await descifrarComoElNavegador(cuerpo, d.privada, d.publica, d.authSecreto)) === MENSAJE,
  'las dos mitades tienen que coincidir byte a byte');

/* Con acentos y emoji, que es lo que va a llevar de verdad. */
const CONACENTOS = JSON.stringify({ titulo: 'Cleo 🦊', cuerpo: '¿Seguimos con «El Aleph»? Vas por la página 92.' });
ok('con acentos, comillas y emoji también',
  (await descifrarComoElNavegador(await cifrar(CONACENTOS, d.sub),
    d.privada, d.publica, d.authSecreto)) === CONACENTOS);

grupo('Y CADA ENVÍO ES DISTINTO');

/* La sal y la clave efímera se generan en cada envío. Dos cuerpos
   idénticos para el mismo mensaje significarían que no, y eso es un
   agujero: permite saber que se mandó el mismo aviso dos veces. */
const a = await cifrar(MENSAJE, d.sub);
const b = await cifrar(MENSAJE, d.sub);
ok('DOS ENVÍOS DEL MISMO MENSAJE NO DAN LOS MISMOS BYTES',
  bytesAB64url(a) !== bytesAB64url(b));
ok('ni la misma sal', bytesAB64url(a.slice(0, 16)) !== bytesAB64url(b.slice(0, 16)));
ok('ni la misma clave efímera',
  bytesAB64url(a.slice(21, 86)) !== bytesAB64url(b.slice(21, 86)));
ok('pero los dos se leen igual',
  (await descifrarComoElNavegador(b, d.privada, d.publica, d.authSecreto)) === MENSAJE);

/* ── LA FORMA DE LA CABECERA, BYTE A BYTE ────────────────────── */

grupo('LA CABECERA DEL CUERPO, CONTRA LA RFC 8188');

/* Esto es lo que una ida y vuelta NO puede comprobar: si el orden fuera
   otro, mi cifrador y mi descifrador se entenderían igual y el
   navegador de verdad no. */
ok('empieza con 16 bytes de sal, y no son cero',
  cuerpo.slice(0, 16).some((x) => x !== 0));
ok('luego el tamaño de registro, 4 bytes en big endian',
  new DataView(cuerpo.buffer, cuerpo.byteOffset + 16, 4).getUint32(0, false) === 4096,
  String(new DataView(cuerpo.buffer, cuerpo.byteOffset + 16, 4).getUint32(0, false)));
ok('luego un byte con el largo de la clave: 65',
  cuerpo[20] === 65, String(cuerpo[20]));
ok('y esos 65 bytes son un punto P-256 sin comprimir (empieza por 0x04)',
  cuerpo[21] === 4, `0x${cuerpo[21].toString(16)}`);
ok('el cuerpo cifrado va detrás y no está vacío', cuerpo.length > 86);
/* EN BYTES, NO EN CARACTERES. La primera versión usó `MENSAJE.length` y
   se puso roja con el código correcto: el mensaje lleva «¿» y «ó», que
   ocupan dos bytes cada uno en UTF-8. Es el mismo despiste que hace que
   un contador de caracteres corte un texto por la mitad de una letra. */
const bytesDelMensaje = texto(MENSAJE).length;
ok('y lleva los 16 bytes del tag de AES-GCM',
  cuerpo.length === 86 + (bytesDelMensaje + 1) + 16,
  `${cuerpo.length} bytes para un mensaje de ${bytesDelMensaje} bytes`);
ok('que en UTF-8 no son los mismos que caracteres',
  bytesDelMensaje > MENSAJE.length,
  'si fueran iguales, la comprobación de arriba no distinguiría las dos cosas');

grupo('EL ORDEN DE LAS DOS CLAVES EN «key_info»');

/* La norma dice: primero la del NAVEGADOR, después la del SERVIDOR.
   Intercambiarlas es el error que una ida y vuelta no detecta nunca, y
   se comprueba aquí derivando a mano las dos formas y viendo cuál
   coincide con lo que produjo el cifrador. */
const suPublica = cuerpo.slice(21, 86);
const hmac = async (k, x) => new Uint8Array(await crypto.subtle.sign('HMAC',
  await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), x));
const hkdf = async (salt, ikm, info, n) =>
  (await hmac(await hmac(salt, ikm), unir(info, Uint8Array.of(1)))).slice(0, n);

const suClave = await crypto.subtle.importKey(
  'raw', suPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
);
const compartido = new Uint8Array(await crypto.subtle.deriveBits(
  { name: 'ECDH', public: suClave }, d.privada, 256,
));

const bienOrdenado = await hkdf(d.authSecreto, compartido,
  unir(texto(INFO_CLAVE), d.publica, suPublica), 32);
const alReves = await hkdf(d.authSecreto, compartido,
  unir(texto(INFO_CLAVE), suPublica, d.publica), 32);

const cekBien = await hkdf(cuerpo.slice(0, 16), bienOrdenado, texto(INFO_CEK), 16);
const claveBien = await crypto.subtle.importKey('raw', cekBien, 'AES-GCM', false, ['decrypt']);
const nonceBien = await hkdf(cuerpo.slice(0, 16), bienOrdenado, texto(INFO_NONCE), 12);
let seDescifraConElOrdenBueno = false;
try {
  await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonceBien, tagLength: 128 },
    claveBien, cuerpo.slice(86));
  seDescifraConElOrdenBueno = true;
} catch { /* no */ }

ok('NAVEGADOR PRIMERO, SERVIDOR DESPUÉS — como dice la RFC 8291 §3.4',
  seDescifraConElOrdenBueno,
  'si esto falla, las claves están intercambiadas y el navegador descartará el mensaje');
ok('y el orden contrario da otra cosa',
  bytesAB64url(bienOrdenado) !== bytesAB64url(alReves),
  'si fueran iguales, esta comprobación no estaría comprobando nada');

/* ── EL JWT DE VAPID ─────────────────────────────────────────── */

grupo('EL JWT DE VAPID, VERIFICADO CON LA PÚBLICA');

const parVapid = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'],
);
const jwkPriv = await crypto.subtle.exportKey('jwk', parVapid.privateKey);
const publicaVapid = bytesAB64url(
  new Uint8Array(await crypto.subtle.exportKey('raw', parVapid.publicKey)),
);

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123?query=1';
const cabecera = await cabeceraVapid(ENDPOINT, {
  publica: publicaVapid, privada: jwkPriv.d, contacto: 'mailto:soporte@ejemplo.com',
});

ok('el esquema es «vapid»', cabecera.startsWith('vapid t='), cabecera.slice(0, 20));
ok('y lleva la clave pública en k=', cabecera.includes(`k=${publicaVapid}`));

const jwt = cabecera.slice('vapid t='.length).split(', k=')[0];
const [cab, cue, firma] = jwt.split('.');
const cabJson = JSON.parse(new TextDecoder().decode(b64urlABytes(cab)));
const cueJson = JSON.parse(new TextDecoder().decode(b64urlABytes(cue)));

ok('el algoritmo es ES256', cabJson.alg === 'ES256', cabJson.alg);
ok('EL «aud» ES EL ORIGEN, no el endpoint entero',
  cueJson.aud === 'https://fcm.googleapis.com', cueJson.aud);
ok('lleva el contacto en «sub»', cueJson.sub === 'mailto:soporte@ejemplo.com');
ok('y caduca en el futuro, pero antes de 24 h',
  cueJson.exp > Date.now() / 1000 && cueJson.exp < Date.now() / 1000 + 24 * 3600);

/* LA COMPROBACIÓN INDEPENDIENTE: verificar la firma con la clave
   pública. No es un espejo de lo que hace el firmador — es lo mismo que
   va a hacer el servicio de push. */
ok('LA FIRMA SE VERIFICA CON LA CLAVE PÚBLICA',
  await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' },
    parVapid.publicKey, b64urlABytes(firma), texto(`${cab}.${cue}`)),
  'esto es exactamente lo que comprueba Google al recibirlo');

/* Y que no verifique con OTRA clave, para saber que la de arriba
   comprueba algo. */
const otroPar = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'],
);
ok('y NO se verifica con otra clave distinta',
  !(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' },
    otroPar.publicKey, b64urlABytes(firma), texto(`${cab}.${cue}`))),
  'si esto pasara, la verificación de arriba no estaría verificando nada');

grupo('Y UNA CLAVE MAL FORMADA SE RECHAZA');

let cazada = false;
try {
  await cabeceraVapid(ENDPOINT, { publica: 'demasiadocorta', privada: jwkPriv.d, contacto: 'mailto:x@y.z' });
} catch { cazada = true; }
ok('una clave pública que no es una P-256 no pasa de aquí', cazada,
  'mejor un error claro que un 401 del servicio de push sin explicación');

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.\n`);
process.exit(fallaron ? 1 : 0);
