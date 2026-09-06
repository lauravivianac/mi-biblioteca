/* ─────────────────────────────────────────────────────────────
   EL PERFIL PÚBLICO · la parte que se puede probar  ·  historia #45

   Es la carta de presentación de la app hacia afuera: lo que se abre
   desde una invitación, y muchas veces lo primero que alguien ve.

   LA REGLA QUE MANDA AQUÍ ES LA MISMA DE LAS RESEÑAS (#28): las reglas
   de Firestore conceden documentos ENTEROS. No existe «puede leer este
   documento pero no el campo `bio`». Así que el perfil público no puede
   ser users/{uid} con unos campos marcados: abrirlo para que se vea tu
   nombre lo abriría con tus ajustes, tus metas, tus días de lectura y
   tus reseñas privadas dentro.

   Publicar es COPIAR a otro sitio, y aquí se decide qué se copia.
   Lista blanca, nunca lista negra: lo que no está nombrado abajo no
   sale. Añadir un campo nuevo a los ajustes mañana no lo publica solo.

   Y de ahí sale la consecuencia que más fácil es equivocar: APAGAR UNA
   SECCIÓN TIENE QUE QUITAR SUS DATOS DEL DOCUMENTO, no dejar de
   pintarlos. Un perfil que trae los números y no los enseña es un
   perfil que los enseña, porque cualquiera puede leer el documento.
   Ocultar en la pantalla no es ocultar.
   ───────────────────────────────────────────────────────────── */

/** Las secciones que se pueden encender y apagar. */
export const SECCIONES = [
  { id: 'leyendo', label: 'Qué estoy leyendo', hint: 'Los libros que tienes empezados' },
  { id: 'numeros', label: 'Mis números', hint: 'Leídos este año, páginas y racha' },
  { id: 'generos', label: 'Mis géneros', hint: 'Lo que más lees' },
  { id: 'estanterias', label: 'Mis estanterías', hint: 'Solo las que marques como públicas' },
  { id: 'resenas', label: 'Mis reseñas', hint: 'Solo las que ya publicaste' },
  { id: 'mascota', label: 'Mi mascota', hint: 'Tu bicho, tal y como lo tienes' },
];

export const IDS_SECCION = SECCIONES.map((s) => s.id);

/* Por defecto se ve todo menos nada: quien abre un perfil recién hecho
   tiene que ver algo. Apagar es una decisión, encender no. */
export function seccionVisible(settings = {}, id) {
  const off = settings.profileHidden;
  if (!Array.isArray(off)) return true;
  return !off.includes(id);
}

export function toggleSeccion(settings = {}, id) {
  const off = Array.isArray(settings.profileHidden) ? settings.profileHidden : [];
  return off.includes(id) ? off.filter((x) => x !== id) : [...off, id];
}

const texto = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export const limpiarBio = (v) => texto(v, 160);
export const limpiarCiudad = (v) => texto(v, 40);

/** La letra del avatar. Sin nombre, un símbolo antes que un hueco. */
export const inicial = (nombre) => {
  const c = String(nombre ?? '').trim().charAt(0);
  return c ? c.toUpperCase() : '✦';
};

/**
 * Los números del perfil.
 *
 * `libros` viene con status, rating y finishedAt ya resueltos —el core
 * no toca el store—.
 */
export function profileStats(libros = [], { year = new Date().getFullYear(), racha = 0 } = {}) {
  const leidos = libros.filter((b) => b.status === 'read');
  const esteAnio = leidos.filter((b) => {
    if (!b.finishedAt) return false;
    return new Date(b.finishedAt).getFullYear() === year;
  });
  const paginas = esteAnio.reduce((a, b) => a + (Number(b.pages) || 0), 0);
  return {
    anio: year,
    leidosEsteAnio: esteAnio.length,
    leidosTotal: leidos.length,
    paginas,
    racha: Number(racha) || 0,
  };
}

/** Los géneros que más pesan, de más a menos. */
export function generosFavoritos(libros = [], tope = 3) {
  const cuenta = new Map();
  for (const b of libros) {
    if (b.status !== 'read' || !b.genre) continue;
    cuenta.set(b.genre, (cuenta.get(b.genre) || 0) + 1);
  }
  return [...cuenta.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, tope)
    .map(([genre, n]) => ({ genre, n }));
}

/**
 * El documento que se publica.
 *
 * Devuelve null sin `uid` o sin `username`: un perfil sin nombre de
 * usuaria no se puede enlazar ni encontrar, así que no se publica.
 *
 * Cada sección apagada no aparece. Ni vacía, ni a null: AUSENTE.
 */
export function publicProfileDoc({
  uid, username, name = '', settings = {}, books = [],
  racha = 0, year = new Date().getFullYear(), at = Date.now(),
} = {}) {
  if (!uid || !username) return null;

  const ve = (id) => seccionVisible(settings, id);
  const doc = {
    uid,
    username: String(username).toLowerCase(),
    name: texto(name, 60),
    /* En minúsculas y aparte, porque es por donde busca la historia
       #47: Firestore no sabe comparar sin distinguir mayúsculas. */
    nameLower: texto(name, 60).toLowerCase(),
    bio: limpiarBio(settings.bio),
    city: limpiarCiudad(settings.city),
    secciones: IDS_SECCION.filter(ve),
    updatedAt: at,
  };

  if (ve('leyendo')) {
    doc.leyendo = books
      .filter((b) => b.status === 'reading')
      .slice(0, 3)
      .map((b) => ({
        title: texto(b.title, 120),
        author: texto(b.author, 80),
        cover: typeof b.cover === 'string' && b.cover ? b.cover : null,
        pct: Number.isFinite(b.pct) ? Math.max(0, Math.min(100, Math.round(b.pct))) : 0,
      }));
  }

  if (ve('numeros')) doc.numeros = profileStats(books, { year, racha });
  if (ve('generos')) doc.generos = generosFavoritos(books);

  if (ve('estanterias')) {
    /* Solo las marcadas. Una estantería puede llamarse «regalos para
       Ana» y no ser asunto de nadie más. */
    doc.estanterias = (settings.shelves || [])
      .filter((s) => s && s.public === true)
      .map((s) => ({
        id: String(s.id),
        name: texto(s.name, 32),
        emoji: String(s.emoji || '🔖'),
        color: String(s.color || 'gold'),
        n: books.filter((b) => (b.shelfIds || []).includes(s.id)).length,
      }));
  }

  if (ve('mascota') && settings.pet && !settings.pet.hidden) {
    const p = settings.pet;
    doc.mascota = {
      species: String(p.species || 'gato'),
      fur: String(p.fur || 'clasico'),
      accessory: p.accessory ? String(p.accessory) : null,
      name: texto(p.name, 24),
    };
  }

  return doc;
}

/**
 * Los campos que salen. Está aquí para poder PROBARLO: la prueba
 * compara las claves del documento contra esta lista, así que un campo
 * nuevo que se cuele rompe una prueba en vez de filtrarse callando.
 */
export const CAMPOS_PUBLICOS = [
  'uid', 'username', 'name', 'nameLower', 'bio', 'city', 'secciones', 'updatedAt',
  'leyendo', 'numeros', 'generos', 'estanterias', 'mascota',
];

/** El link del perfil, que es lo que se pega en WhatsApp. */
export function profileUrl(username, origin = '') {
  if (!username) return '';
  const base = String(origin).replace(/\/+$/, '');
  return `${base}/#/u/${String(username).toLowerCase()}`;
}

/** Leer un `#/u/laura` de la barra de direcciones. Devuelve null si no lo es. */
export function usernameFromHash(hash = '') {
  const m = String(hash).match(/^#\/u\/([a-z0-9_.]{3,20})$/i);
  return m ? m[1].toLowerCase() : null;
}

/** Una frase para el perfil vacío: con pocos libros también tiene que verse bien. */
export function resumenCorto(doc = {}) {
  const partes = [];
  const n = doc.numeros;
  if (n?.leidosEsteAnio) partes.push(`${n.leidosEsteAnio} ${n.leidosEsteAnio === 1 ? 'libro' : 'libros'} en ${n.anio}`);
  if (n?.racha > 1) partes.push(`${n.racha} días seguidos`);
  if (doc.generos?.length) partes.push(`sobre todo ${doc.generos[0].genre}`);
  if (!partes.length) return 'Acaba de llegar.';
  return partes.join(' · ');
}
