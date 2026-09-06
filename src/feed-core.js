/* ─────────────────────────────────────────────────────────────
   EL FEED · la parte que se puede probar  ·  historia #49

   «Descubrir libros por gente y no por algoritmo», dice la historia.
   Eso no es una frase bonita: decide que el feed sea CRONOLÓGICO y
   nada más. Sin orden por interés, sin «quizá te perdiste esto». Lo
   último que hizo alguien a quien sigues, arriba.

   LA NOTA TÉCNICA TAMBIÉN DECIDE LA FORMA. Con pocas usuarias, leer al
   vuelo la actividad de a quién sigo es más simple y más barato que
   repartir una copia a cada seguidora. Así que no hay reparto: hay una
   colección de actividad y una consulta. Cuando repartir haga falta de
   verdad se notará, y entonces se cambia; adelantarlo ahora sería
   pagar complejidad por un problema que no existe.

   QUÉ SE PUBLICA Y QUÉ NO. Una entrada del feed es una COPIA con lo
   justo, igual que el perfil (#45) y las reseñas (#28), y por lo mismo:
   las reglas de Firestore conceden documentos enteros. Aquí solo va lo
   que se enseña en la tarjeta.
   ───────────────────────────────────────────────────────────── */

export const TIPOS = ['empezo', 'termino', 'resena', 'logro'];

/** Cuántas entradas se traen por página. */
export const PAGINA = 20;

const texto = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * El identificador de una entrada.
 *
 * Lleva dentro de quién es y de qué va, y eso NO es decoración: hace
 * que empezar el mismo libro dos veces —dejarlo y retomarlo— pise la
 * entrada anterior en vez de llenar el feed de repeticiones. Un feed
 * que repite es un feed que se deja de abrir.
 */
export const activityId = (uid, tipo, sobre) => `${uid}_${tipo}_${sobre}`;

/**
 * La copia que se publica.
 *
 * Devuelve null si falta lo imprescindible: sin autora, sin tipo o sin
 * de qué habla, la tarjeta no se puede pintar y es mejor no escribirla
 * que escribir una entrada rota que alguien tendrá que filtrar luego.
 */
export function activityDoc({
  uid, username = '', name = '', tipo, book = null,
  rating = 0, review = '', logro = '', at = Date.now(),
} = {}) {
  if (!uid || !TIPOS.includes(tipo)) return null;
  if (tipo === 'logro' ? !logro : !book?.id) return null;

  const d = {
    uid,
    username: texto(username, 20).toLowerCase(),
    name: texto(name, 60),
    tipo,
    at,
  };

  if (tipo === 'logro') {
    d.logro = texto(logro, 60);
    return d;
  }

  d.bookId = String(book.id);
  d.title = texto(book.title, 120);
  d.author = texto(book.author, 80);
  d.cover = typeof book.cover === 'string' && book.cover ? book.cover : null;

  /* La valoración solo cuando se terminó: una estrella junto a
     «empezó a leer» no significa nada todavía. */
  if (tipo === 'termino' && Number.isFinite(rating) && rating > 0) {
    d.rating = Math.max(1, Math.min(5, Math.round(rating)));
  }
  /* De la reseña va un trozo, no entera: la tarjeta enseña un adelanto
     y el resto está en su perfil. */
  if (tipo === 'resena') d.review = texto(review, 240);

  return d;
}

export const ACTIVITY_FIELDS = [
  'uid', 'username', 'name', 'tipo', 'at',
  'bookId', 'title', 'author', 'cover', 'rating', 'review', 'logro',
];

/** Lo que dice la tarjeta arriba, en una línea. */
export function activityLine(a = {}) {
  const quien = a.username ? `@${a.username}` : (a.name || 'Alguien');
  switch (a.tipo) {
    case 'empezo': return `${quien} empezó a leer`;
    case 'termino': return `${quien} terminó`;
    case 'resena': return `${quien} escribió sobre`;
    case 'logro': return `${quien} consiguió un logro`;
    default: return quien;
  }
}

/** «hace 2 h», «ayer», «el 3 de marzo». Un feed sin tiempo no es un feed. */
export function cuandoTexto(at, ahora = Date.now()) {
  const ms = Math.max(0, ahora - (at || 0));
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  return new Date(at).toLocaleDateString('es', { day: 'numeric', month: 'long' });
}

/**
 * Ordenar y recortar.
 *
 * Se ordena aquí además de en la consulta porque el feed se arma con
 * VARIAS consultas —Firestore solo admite 30 valores en un `in`, así
 * que a partir de 30 seguidas hay que trocear— y cada trozo viene
 * ordenado por su cuenta. Sin esto, el feed saldría por bloques.
 */
export function mergeFeed(...listas) {
  const vistos = new Set();
  const todas = [];
  /* `flat(Infinity)` y no `flat()`: se llama de las dos formas —con las
     listas sueltas y con un array de listas, que es como salen de un
     Promise.all— y aplanar solo un nivel dejaba caer TODAS las entradas
     en el segundo caso, en silencio y sin error. El feed salía vacío
     con datos delante. */
  for (const e of listas.flat(Infinity)) {
    if (!e?.id || vistos.has(e.id)) continue;
    vistos.add(e.id);
    todas.push(e);
  }
  return todas.sort((a, b) => (b.at || 0) - (a.at || 0));
}

/** Los trozos de 30 que admite un `in` de Firestore. */
export const MAX_EN_IN = 30;
export function chunk(lista = [], tam = MAX_EN_IN) {
  const out = [];
  for (let i = 0; i < lista.length; i += tam) out.push(lista.slice(i, i + tam));
  return out;
}

/**
 * Qué se enseña cuando el feed está vacío.
 *
 * La historia lo pide expresamente: sugerir a quién seguir en vez de
 * una pantalla en blanco. Y distingue dos vacíos que NO son el mismo
 * problema — no sigues a nadie, o sigues a gente que no ha hecho nada—
 * porque la salida es distinta en cada caso.
 */
export function estadoVacio({ siguiendo = 0, entradas = 0 } = {}) {
  if (entradas > 0) return null;
  if (siguiendo === 0) {
    return {
      titulo: 'Aquí verás lo que leen tus amigas',
      texto: 'Todavía no sigues a nadie. Busca a alguien por su @usuario, o mira quién ha leído lo mismo que tú.',
      accion: 'buscar',
    };
  }
  return {
    titulo: 'Silencio por ahora',
    texto: 'Quien sigues no ha empezado ni terminado nada últimamente. Puedes seguir a más gente.',
    accion: 'buscar',
  };
}
