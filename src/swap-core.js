/* ─────────────────────────────────────────────────────────────
   PONER UN LIBRO PARA INTERCAMBIO  ·  historias #82 y #89

   SIN PAGOS: ES TRUEQUE. La épica lo decide y conviene repetirlo aquí,
   donde se escribe el dato: meter dinero abriría requisitos legales y
   de tienda mucho mayores, y sobre todo abriría la puerta a las
   estafas, que es el mayor riesgo de una función así. Por eso no hay
   ningún campo de precio, ni lo habrá por accidente: si alguien pide
   dinero, es en el texto, y ese texto se puede reportar.

   LA BARRERA PARA PUBLICAR ES BAJA A PROPÓSITO (#89). Pedir demasiado
   mata la función antes de que arranque, y una comunidad de
   intercambio vacía no sirve de nada. Correo verificado, unos días de
   cuenta y un par de libros registrados bastan para filtrar cuentas
   desechables — y explorar y solicitar no piden nada de eso: la
   barrera es solo para publicar.
   ───────────────────────────────────────────────────────────── */

export const ESTADOS = [
  { id: 'nuevo', label: 'Como nuevo', hint: 'Parece sin abrir' },
  { id: 'bueno', label: 'Buen estado', hint: 'Se nota leído, poco más' },
  { id: 'usado', label: 'Usado', hint: 'Marcas de uso, se lee perfectamente' },
  { id: 'muy-usado', label: 'Muy usado', hint: 'Subrayados, lomo cascado, alguna hoja suelta' },
];

export const esEstado = (id) => ESTADOS.some((e) => e.id === id);

/* ── LOS REQUISITOS PARA PUBLICAR  ·  #89 ────────────────────── */

export const MIN_DIAS_CUENTA = 3;
export const MIN_LIBROS = 3;
export const MAX_ACTIVAS = 10;

const DIA = 24 * 60 * 60 * 1000;

/**
 * ¿Puede publicar? Y si no, QUÉ LE FALTA exactamente.
 *
 * Devolver «no puedes» a secas es la forma más rápida de que alguien
 * cierre la app y no vuelva. Cada cosa que falta se dice con lo que
 * hay que hacer para arreglarla, y las que ya cumple se marcan: ver
 * que llevas tres de cuatro anima a hacer la cuarta.
 */
export function puedePublicar({
  emailVerified = false, createdAt = null, libros = 0, activas = 0, ciudad = false,
  ahora = Date.now(),
} = {}) {
  const dias = createdAt ? Math.floor((ahora - createdAt) / DIA) : 0;

  const requisitos = [
    {
      id: 'email',
      ok: emailVerified === true,
      texto: 'Verifica tu correo',
      comoSeArregla: 'Te mandamos un enlace al registrarte; puedes pedir otro.',
    },
    {
      id: 'antiguedad',
      ok: dias >= MIN_DIAS_CUENTA,
      texto: `La cuenta tiene que tener ${MIN_DIAS_CUENTA} días`,
      comoSeArregla: dias >= 0 && createdAt
        ? `Te ${MIN_DIAS_CUENTA - dias === 1 ? 'queda 1 día' : `quedan ${MIN_DIAS_CUENTA - dias} días`}.`
        : 'Vuelve en unos días.',
    },
    {
      id: 'libros',
      ok: libros >= MIN_LIBROS,
      texto: `Registra ${MIN_LIBROS} libros`,
      comoSeArregla: `Llevas ${libros}. Marca alguno como leído o empezado.`,
    },
    {
      id: 'ciudad',
      ok: ciudad === true,
      texto: 'Di en qué ciudad estás',
      comoSeArregla: 'Solo la ciudad. La dirección no se pide nunca.',
    },
  ];

  const faltan = requisitos.filter((r) => !r.ok);
  /* El tope de publicaciones activas no es un requisito de entrada:
     no se «cumple», se libera retirando alguna. Por eso va aparte. */
  const tope = activas >= MAX_ACTIVAS;

  return {
    puede: faltan.length === 0 && !tope,
    requisitos,
    faltan,
    tope,
    mensajeTope: tope
      ? `Tienes ${activas} libros publicados, que es el máximo. Retira alguno para poner otro.`
      : '',
  };
}

/** Explorar y solicitar NO piden nada de esto. La barrera es publicar. */
export const puedeExplorar = () => true;

/* ── LA PUBLICACIÓN ──────────────────────────────────────────── */

const limpio = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * El documento que se publica.
 *
 * Lleva una copia del título y del autor porque quien lo mira no tiene
 * acceso a la biblioteca de quien lo publica — y lleva el sitio ya
 * recortado, nunca coordenadas.
 */
export function swapDoc({
  uid, username = '', name = '', book = null, estado = 'bueno',
  nota = '', foto = null, aCambioDe = '', suelto = false,
  place = null, at = Date.now(),
} = {}) {
  if (!uid || !book?.id || !place?.city) return null;
  return {
    uid,
    username: limpio(username, 20).toLowerCase(),
    name: limpio(name, 60),
    bookId: String(book.id),
    title: limpio(book.title, 120),
    author: limpio(book.author, 80),
    genre: limpio(book.genre, 60),
    cover: typeof book.cover === 'string' && book.cover ? book.cover : null,
    estado: esEstado(estado) ? estado : 'bueno',
    nota: limpio(nota, 200),
    /* Una sola foto y ya comprimida. No es una tienda: la portada ya
       se ve, y esto es para enseñar el estado real —un subrayado, el
       lomo—, que con una foto se enseña de sobra. */
    foto: typeof foto === 'string' && foto.startsWith('data:image/') ? foto : null,
    /* Trueque, nunca dinero: o pides algo a cambio, o lo das suelto. */
    suelto: suelto === true,
    aCambioDe: suelto ? '' : limpio(aCambioDe, 200),
    country: place.country || '',
    city: place.city,
    cityKey: place.cityKey || '',
    area: place.area || '',
    geohash: place.geohash || null,
    activa: true,
    at,
  };
}

export const SWAP_FIELDS = [
  'uid', 'username', 'name', 'bookId', 'title', 'author', 'genre', 'cover',
  'estado', 'nota', 'foto', 'suelto', 'aCambioDe',
  'country', 'city', 'cityKey', 'area', 'geohash', 'activa', 'at',
];

/** Lo que se lee bajo el título en la lista. */
export function resumenPublicacion(p = {}) {
  const partes = [];
  const e = ESTADOS.find((x) => x.id === p.estado);
  if (e) partes.push(e.label);
  partes.push(p.suelto ? 'Lo doy suelto' : 'Busco algo a cambio');
  return partes.join(' · ');
}

/**
 * Solo se puede publicar un libro LEÍDO.
 *
 * Ofrecer algo que no has leído es ofrecer algo que no puedes describir
 * —y la mitad del valor de un trueque es que alguien te cuente cómo
 * está el ejemplar de verdad—.
 */
export const puedePublicarseEste = (status) => status === 'read';
export const MOTIVO_NO_LEIDO = 'Solo puedes ofrecer libros que ya hayas leído.';

/** El tamaño máximo de la foto, ya comprimida. */
export const MAX_FOTO_BYTES = 140 * 1024;

/** Cuánto ocupa un data URL de verdad, sin contar la cabecera. */
export function pesoDataUrl(dataUrl) {
  const s = String(dataUrl ?? '');
  const coma = s.indexOf(',');
  if (coma < 0) return 0;
  const b64 = s.slice(coma + 1);
  return Math.floor((b64.length * 3) / 4);
}

export const fotoCabe = (dataUrl) => pesoDataUrl(dataUrl) <= MAX_FOTO_BYTES;
