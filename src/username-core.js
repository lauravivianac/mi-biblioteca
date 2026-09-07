/* ─────────────────────────────────────────────────────────────
   EL @USUARIO · el núcleo  ·  historia #44

   El nombre con el que te encuentran. Es la primera pieza de todo lo
   social: sin él no hay perfil público, ni seguir a nadie, ni tarjeta
   para compartir que lleve tu nombre.

   LA UNICIDAD NO LA GARANTIZA ESTE ARCHIVO, Y ESO ES LO IMPORTANTE.
   Aquí se valida la forma —lo que se puede escribir— y se dan los
   mensajes. Que dos personas no puedan quedarse el mismo nombre lo
   garantizan las REGLAS DE FIRESTORE, porque el cliente siempre se
   puede saltar: comprobar disponibilidad y luego escribir son dos
   momentos distintos, y entre uno y otro cabe otra persona. La nota
   técnica de la historia lo dice con esas palabras.

   Todo se guarda y se compara en minúsculas. «Laura» y «laura» son la
   misma persona buscándose, y dejar que sean dos cuentas distintas es
   regalar la suplantación más fácil que hay.

   Sin Firebase: se prueba en Node.
   ───────────────────────────────────────────────────────────── */

export const MIN = 3;
export const MAX = 20;

/** Cada cuánto se puede cambiar. Ni cárcel, ni puerta giratoria. */
export const DIAS_ENTRE_CAMBIOS = 30;

/**
 * Nombres que no puede llevarse nadie.
 *
 * No es paranoia: quien se llame «soporte» puede pedirle la contraseña
 * a cualquiera y le van a creer. Van también los de las rutas que la
 * app usará algún día, para no tener que quitárselos a alguien
 * después.
 */
export const RESERVADOS = new Set([
  'admin', 'administrador', 'soporte', 'support', 'ayuda', 'help',
  'root', 'sistema', 'system', 'oficial', 'staff', 'moderador',
  'mibiblioteca', 'biblioteca', 'library', 'app', 'api', 'www', 'about', 'acerca',
  'ajustes', 'settings', 'perfil', 'profile', 'buscar', 'search',
  'nuevo', 'new', 'null', 'undefined', 'anonimo', 'anonymous',
]);

/** Tal y como se guarda: minúsculas y sin espacios alrededor. */
export const normalize = (s) => String(s ?? '').trim().toLowerCase();

const FORMA = /^[a-z0-9_.]+$/;

/**
 * ¿Se puede usar este nombre? Devuelve el motivo, no un booleano.
 *
 * Un «no válido» a secas deja a la persona probando a ciegas: cuál de
 * las seis reglas he roto. Cada error dice qué arreglar.
 */
export function validateUsername(raw) {
  const u = normalize(raw);

  if (!u) return { ok: false, error: 'Escribe un nombre.' };
  if (u.length < MIN) return { ok: false, error: `Al menos ${MIN} caracteres.` };
  if (u.length > MAX) return { ok: false, error: `Como mucho ${MAX} caracteres.` };
  if (!FORMA.test(u)) {
    return { ok: false, error: 'Solo letras sin tilde, números, guion bajo y punto.' };
  }
  /* Un nombre que empieza o acaba en punto se lee fatal y se copia
     peor: «@laura.» pierde el punto en cuanto alguien lo escribe en
     una frase. */
  if (u.startsWith('.') || u.endsWith('.')) {
    return { ok: false, error: 'No puede empezar ni terminar en punto.' };
  }
  if (u.includes('..')) return { ok: false, error: 'Dos puntos seguidos, no.' };
  if (RESERVADOS.has(u)) return { ok: false, error: 'Ese nombre está reservado.' };

  return { ok: true, username: u };
}

/**
 * ¿Puede cambiarlo ya?
 *
 * La historia pide «un límite razonable». Uno cada treinta días lo es:
 * deja rectificar el que elegiste con prisa el primer día, y evita que
 * alguien vaya soltando y pillando nombres para revenderlos o para
 * confundir a quien le sigue.
 */
export function canChangeUsername({ username, usernameChangedAt } = {}, now = Date.now()) {
  if (!username) return { ok: true };                 // el primero es gratis
  if (!usernameChangedAt) return { ok: true };

  const dias = (now - usernameChangedAt) / 86400000;
  if (dias >= DIAS_ENTRE_CAMBIOS) return { ok: true };

  const faltan = Math.ceil(DIAS_ENTRE_CAMBIOS - dias);
  return {
    ok: false,
    error: faltan === 1
      ? 'Podrás cambiarlo mañana.'
      : `Podrás cambiarlo dentro de ${faltan} días.`,
  };
}

/** Cómo se enseña: siempre con arroba, siempre en minúsculas. */
export const displayHandle = (u) => (u ? `@${normalize(u)}` : '');

/**
 * Una sugerencia a partir del nombre o del correo, para no dejar el
 * campo en blanco mirándote. Se limpia todo lo que no vale en vez de
 * rechazarlo: «Laura Viviana» → «lauraviviana».
 */
export function suggestUsername(nombre = '', correo = '') {
  const base = String(nombre || correo.split('@')[0] || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // fuera las tildes
    .replace(/[^a-z0-9_.]+/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, MAX);

  if (base.length >= MIN && !RESERVADOS.has(base)) return base;
  if (!base) return '';
  /* Corto o reservado: se completa en vez de devolver algo inválido. */
  return `${base}${'123'.slice(0, Math.max(1, MIN - base.length))}`.slice(0, MAX);
}
