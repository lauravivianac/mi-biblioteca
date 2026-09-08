/* ─────────────────────────────────────────────────────────────
   MANDAR UNA NOTIFICACIÓN WEB PUSH  ·  historia #95

   Esto es criptografía y no se puede escribir «a ojo»: o los bytes son
   exactamente los que dice la norma, o el navegador descarta el mensaje
   sin decir por qué. Dos normas:

     · RFC 8292 (VAPID) — quién manda. Un JWT firmado con la clave
       privada, que el servicio de push comprueba con la pública.
     · RFC 8291 (Message Encryption) — qué se manda. El cuerpo va
       cifrado de extremo a extremo: ni Google ni Apple, que son quienes
       lo transportan, pueden leerlo.

   NO SE USA UNA LIBRERÍA porque en un Worker no hay Node: `web-push`
   depende de `crypto` de Node y no arranca. Todo lo de aquí es Web
   Crypto, que sí está.

   ── LO QUE NO SE PUDO COMPROBAR ─────────────────────────────

   Esto no se ha probado contra un servicio de push de verdad. La
   batería hace el viaje de ida y vuelta —cifra con este código y
   descifra con una implementación independiente del lado del
   navegador— y comprueba la forma exacta de las cabeceras contra la
   norma, que es lo que caza un byte fuera de sitio. Pero un `201` de
   Google no lo ha visto nadie todavía.
   ───────────────────────────────────────────────────────────── */

/* ── BASE64URL ───────────────────────────────────────────────
   Sin relleno y con - _ en vez de + /. Todo lo que entra y sale de
   aquí va en este formato: las claves, el JWT y el cuerpo. */

export function b64urlABytes(s) {
  const relleno = '='.repeat((4 - (s.length % 4)) % 4);
  const base64 = (s + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const crudo = atob(base64);
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

export function bytesAB64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const unir = (...trozos) => {
  const total = trozos.reduce((n, t) => n + t.length, 0);
  const salida = new Uint8Array(total);
  let i = 0;
  for (const t of trozos) { salida.set(t, i); i += t.length; }
  return salida;
};

const texto = (s) => new TextEncoder().encode(s);

/* ── HKDF, a mano ────────────────────────────────────────────
   Web Crypto trae HKDF, pero pide importar la clave con `deriveBits` y
   el material de entrada aquí cambia en cada paso. Con HMAC directo son
   cuatro líneas y se lee igual que la norma, que es lo que importa
   cuando lo que se persigue es un byte descolocado. */

async function hmac(clave, datos) {
  const k = await crypto.subtle.importKey(
    'raw', clave, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, datos));
}

/** HKDF con una sola vuelta: nada de lo que se deriva aquí pasa de 32 bytes. */
async function hkdf(salt, ikm, info, largo) {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, unir(info, Uint8Array.of(1)));
  return okm.slice(0, largo);
}

/* ── 1 · QUIÉN MANDA: el JWT de VAPID ────────────────────────── */

/**
 * La clave privada, tal y como la da `web-push generate-vapid-keys`:
 * 32 bytes en base64url. Web Crypto no importa eso tal cual, así que se
 * arma un JWK con la privada (`d`) y las dos mitades de la pública
 * (`x` e `y`), que son los bytes 1..33 y 33..65 de la pública sin
 * comprimir.
 */
async function claveDeFirma(privadaB64, publicaB64) {
  const pub = b64urlABytes(publicaB64);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('la clave pública no es una P-256 sin comprimir');

  return crypto.subtle.importKey('jwk', {
    kty: 'EC',
    crv: 'P-256',
    d: privadaB64,
    x: bytesAB64url(pub.slice(1, 33)),
    y: bytesAB64url(pub.slice(33, 65)),
    ext: true,
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

/* Doce horas. La norma permite hasta veinticuatro; con doce, un reloj
   mal puesto en el servicio de push tiene margen por los dos lados. */
const VIDA_JWT = 12 * 3600;

/**
 * El encabezado `Authorization` de VAPID.
 *
 * `aud` es el ORIGEN del endpoint, no el endpoint entero: firmar el
 * endpoint completo es un error habitual y el servicio lo rechaza con
 * un 401 que no explica nada.
 */
export async function cabeceraVapid(endpoint, { publica, privada, contacto }) {
  const aud = new URL(endpoint).origin;
  const cabecera = { typ: 'JWT', alg: 'ES256' };
  const cuerpo = {
    aud,
    exp: Math.floor(Date.now() / 1000) + VIDA_JWT,
    sub: contacto,
  };

  const sinFirmar = `${bytesAB64url(texto(JSON.stringify(cabecera)))}`
    + `.${bytesAB64url(texto(JSON.stringify(cuerpo)))}`;

  const clave = await claveDeFirma(privada, publica);
  /* ECDSA en Web Crypto devuelve ya r||s, que es justo lo que quiere
     JWS. Con OpenSSL habría que desenvolver un DER; aquí no. */
  const firma = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, clave, texto(sinFirmar),
  );

  return `vapid t=${sinFirmar}.${bytesAB64url(firma)}, k=${publica}`;
}

/* ── 2 · QUÉ SE MANDA: el cuerpo cifrado ─────────────────────── */

/* Las cadenas de la norma, literales. Van aparte y con su nombre
   porque son EXACTAMENTE lo que no se puede improvisar: una letra
   distinta y el navegador descarta el mensaje sin un solo aviso. */
export const INFO_CLAVE = 'WebPush: info\0';
export const INFO_CEK = 'Content-Encoding: aes128gcm\0';
export const INFO_NONCE = 'Content-Encoding: nonce\0';

/* El tamaño de registro. 4096 sobra para cualquier notificación —el
   cuerpo son dos frases— y es lo que usa todo el mundo. */
export const TAMANO_REGISTRO = 4096;

/**
 * Cifrar el mensaje para UNA suscripción.
 *
 * Devuelve el cuerpo entero, cabecera incluida, listo para mandar.
 * `efimera` y `salt` se pasan solo desde las pruebas: en producción se
 * generan aquí y son distintos en cada envío, que es de lo que depende
 * la seguridad de todo esto.
 */
export async function cifrar(mensaje, { p256dh, auth }, { efimera, salt } = {}) {
  const uaPublica = b64urlABytes(p256dh);
  const authSecreto = b64urlABytes(auth);

  const par = efimera || await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  );
  const asPublica = new Uint8Array(
    await crypto.subtle.exportKey('raw', par.publicKey),
  );

  /* El secreto compartido: nuestra privada efímera contra su pública.
     Es lo que hace que solo ese navegador pueda leerlo. */
  const suClave = await crypto.subtle.importKey(
    'raw', uaPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  );
  const compartido = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: suClave }, par.privateKey, 256,
  ));

  /* El `auth_secret` de la suscripción entra como SAL de este primer
     paso. Es lo que ata el cifrado a esta suscripción concreta: sin él,
     cualquiera con la clave pública podría montar un mensaje válido. */
  const ikm = await hkdf(
    authSecreto,
    compartido,
    unir(texto(INFO_CLAVE), uaPublica, asPublica),
    32,
  );

  const sal = salt || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(sal, ikm, texto(INFO_CEK), 16);
  const nonce = await hkdf(sal, ikm, texto(INFO_NONCE), 12);

  /* El 0x02 del final es el delimitador de relleno del último registro.
     No es opcional: sin él, el navegador descarta el mensaje. */
  const claro = unir(texto(mensaje), Uint8Array.of(2));

  const clave = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 }, clave, claro,
  ));

  /* La cabecera del formato aes128gcm, en el orden exacto de la norma:
     sal (16) · tamaño de registro (4, big endian) · largo de la clave
     (1) · nuestra pública (65) · y detrás lo cifrado. */
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, TAMANO_REGISTRO, false);

  return unir(sal, rs, Uint8Array.of(asPublica.length), asPublica, cifrado);
}

/* ── 3 · MANDARLO ────────────────────────────────────────────── */

/**
 * Mandar un aviso a una suscripción.
 *
 * Devuelve `{ ok, estado, caducada }`. `caducada` es la que importa
 * para el que llama: un 404 o un 410 significan que esa suscripción ya
 * no existe —el navegador se desinstaló, se limpiaron los datos— y hay
 * que BORRARLA, no reintentarla. Sin eso, la lista de suscripciones
 * crece para siempre con direcciones muertas a las que se sigue
 * llamando todos los días.
 */
export async function mandarAviso(sub, carga, vapid, { ttl = 3600 } = {}) {
  let cuerpo;
  let auth;
  try {
    cuerpo = await cifrar(JSON.stringify(carga), sub);
    auth = await cabeceraVapid(sub.endpoint, vapid);
  } catch (e) {
    return { ok: false, estado: 0, caducada: false, error: String(e?.message || e) };
  }

  let r;
  try {
    r = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: String(ttl),
      },
      body: cuerpo,
    });
  } catch (e) {
    return { ok: false, estado: 0, caducada: false, error: String(e?.message || e) };
  }

  return {
    ok: r.ok,
    estado: r.status,
    caducada: r.status === 404 || r.status === 410,
  };
}
