/* ─────────────────────────────────────────────────────────────
   BUSCAR PERSONAS · la parte que se puede probar  ·  historia #47

   Esta historia y la #48 son el reemplazo de «buscar amigos por
   Instagram», que no se puede hacer: la API de Meta no devuelve la
   lista de seguidores de nadie. La nota de la historia dice algo mejor
   —y tiene razón—: buscar por LIBROS EN COMÚN encuentra gente por
   gusto literario, que para una app de libros vale más que saber quién
   te sigue en otra red.

   DOS BÚSQUEDAS DISTINTAS, Y CONVIENE NO MEZCLARLAS:

   - Por @usuario es EXACTA. Un nombre de usuaria es una dirección: o
     es esa o no es. Se resuelve con una lectura directa.
   - Por nombre es POR PRINCIPIO de palabra. Firestore no sabe buscar
     «contiene», solo rangos; y como el nombre se publica también en
     minúsculas, el rango [q, q+] da todos los que empiezan por q.

   Escribir «@laura» tiene que encontrar a laura aunque la arroba no
   forme parte del nombre, y escribir «Laura» tiene que encontrarla
   aunque el índice esté en minúsculas. Las dos cosas se arreglan aquí,
   antes de tocar la base.
   ───────────────────────────────────────────────────────────── */

/** El rango que Firestore entiende como «empieza por». */
export const RANGE_END = '';

/** [desde, hasta] para buscar «empieza por q». */
export const prefixRange = (q) => [q, q + RANGE_END];

/**
 * Lo que se escribió, entendido.
 *
 * `handle` es lo que se buscaría como @usuario; `texto`, lo que se
 * buscaría como nombre. Casi siempre son lo mismo, pero no cuando
 * alguien escribe la arroba o un espacio de más.
 */
export function parseQuery(q) {
  const bruto = String(q ?? '').replace(/\s+/g, ' ').trim();
  const sinArroba = bruto.replace(/^@+/, '');
  const texto = sinArroba.toLowerCase();
  /* Un @usuario válido son minúsculas, números, punto y guion bajo. Si
     lo que se escribió no cabe ahí, no tiene sentido ir a buscarlo como
     nombre de usuaria. */
  const handle = /^[a-z0-9_.]{3,20}$/.test(texto) ? texto : null;
  return { bruto, texto, handle, vacio: texto.length === 0 };
}

/** ¿Merece la pena ir a la base? Con una letra el resultado no dice nada. */
export const buscable = (q) => parseQuery(q).texto.length >= 2;

/**
 * Ordenar lo encontrado.
 *
 * El @usuario exacto primero SIEMPRE: quien escribe un nombre de
 * usuaria completo sabe a quién busca, y enterrarlo entre parecidos es
 * la peor forma de contestar una pregunta concreta.
 */
export function rankPeople(gente = [], q) {
  const { texto } = parseQuery(q);
  const peso = (p) => {
    const u = String(p.username || '').toLowerCase();
    const n = String(p.nameLower || p.name || '').toLowerCase();
    if (u === texto) return 0;                 // es exactamente quien buscas
    if (u.startsWith(texto)) return 1;
    if (n.startsWith(texto)) return 2;
    if (n.includes(texto)) return 3;
    return 4;
  };
  return [...gente]
    .map((p, i) => ({ p, i, w: peso(p) }))
    .sort((a, b) => a.w - b.w || a.i - b.i)     // empate: se respeta el orden que vino
    .map((x) => x.p);
}

/** Sin repetidos por uid, conservando el primero que llegó. */
export function dedupe(gente = []) {
  const vistos = new Set();
  const out = [];
  for (const p of gente) {
    if (!p?.uid || vistos.has(p.uid)) continue;
    vistos.add(p.uid);
    out.push(p);
  }
  return out;
}

/** Fuera yo misma: buscarme a mí no es encontrar a nadie. */
export const sinMi = (gente = [], miUid) => gente.filter((p) => p.uid !== miUid);

/* ── QUIZÁ CONOZCAS ──────────────────────────────────────────── */

/**
 * Libros que dos personas han leído las dos.
 *
 * Se compara por identificador, que para los 73 de la semilla es el
 * mismo en todas las cuentas. Dos ejemplares del mismo libro añadidos
 * a mano no se cruzan, y está bien: preferimos no sugerir a sugerir mal.
 */
export function commonBooks(mios = [], suyos = []) {
  const set = new Set(mios);
  return [...new Set(suyos)].filter((id) => set.has(id));
}

/**
 * Por qué se sugiere a alguien.
 *
 * Una sugerencia sin motivo se lee como publicidad. Con motivo se lee
 * como una presentación, que es lo que es.
 */
export function porQue({ comunes = 0, ciudad = null, miCiudad = null } = {}) {
  if (comunes >= 3) return `Habéis leído ${comunes} libros en común`;
  if (comunes === 2) return 'Habéis leído 2 libros en común';
  if (comunes === 1) return 'Habéis leído el mismo libro';
  if (ciudad && miCiudad && ciudad.toLowerCase() === miCiudad.toLowerCase()) return `También lee en ${ciudad}`;
  return 'Puede que os llevéis bien';
}

/**
 * Ordenar sugerencias: más libros en común, primero.
 *
 * `perfiles` trae ya `comunes` calculado. A igualdad, quien tenga más
 * leídos, porque un perfil con vida se explora mejor que uno vacío.
 */
export function rankSuggestions(perfiles = [], tope = 12) {
  return [...perfiles]
    .filter((p) => p && p.uid)
    .sort((a, b) => (b.comunes || 0) - (a.comunes || 0)
      || (b.numeros?.leidosTotal || 0) - (a.numeros?.leidosTotal || 0))
    .slice(0, tope);
}

/**
 * Qué mandar a `array-contains-any`, que tiene tope.
 *
 * Se cogen los últimos, no los primeros: lo que acabas de leer te
 * describe mejor que lo que leíste hace tres años.
 */
export const MAX_EN_CONSULTA = 30;
export const clavesParaBuscar = (ids = []) => ids.slice(-MAX_EN_CONSULTA);
