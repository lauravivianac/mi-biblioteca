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

import { clavesParaBuscar } from './search-core.js';

/* ── LO QUE SE ENSEÑA Y LO QUE SE ENTREGA  ·  el arreglo ──────
   «Cuando alguien me agrega como amiga se lleva toda mi biblioteca a
    esa persona, eso está mal.»

   Tenía razón, y por un camino peor del que ella creía: no hacía falta
   ser amiga. `sugerible` venía ENCENDIDA de fábrica, y lo que publica
   no es un resumen — es el identificador de CADA libro que has leído y
   la nota que le pusiste a cada uno, dentro de `profiles/{uid}`, que
   es un documento que lee cualquiera SIN SIQUIERA TENER CUENTA.
   Medido con una biblioteca de 30 leídos: 30 identificadores y 30
   puntuaciones. Eso es la biblioteca entera, no una señal de gusto.

   Y el fallo no está en publicar eso —hace falta para cruzar lecturas
   (#47, #67) y quien lo quiera puede quererlo—: está en el POR
   DEFECTO. «Apagar es una decisión, encender no» es una buena regla
   para lo que se ENSEÑA en una tarjeta; es la regla equivocada para lo
   que se ENTREGA en una lista, porque nadie lee ocho interruptores
   antes de estrenar una app.

   Así que las secciones son de dos clases, y la clase la lleva escrita
   cada una:

   - las de la tarjeta (`opt` ausente) se ven salvo que las apagues —
     un perfil recién hecho tiene que enseñar algo;
   - las que ENTREGAN UNA LISTA de tus datos (`opt: true`) están
     apagadas hasta que las enciendas a mano. Sin excepciones y sin
     «pero es que la función queda coja»: una función que necesita
     publicar tu biblioteca sin preguntar no está coja, está mal.

   Nota sobre `actividad`: no es de esta clase —publica un suceso cada
   vez, no una lista—, pero su pista prometía «el feed de quien te
   sigue» y la colección `activity` la lee cualquiera CON cuenta. La
   pista dice ahora lo que de verdad pasa; apretarlo en las reglas es
   otro trabajo y no se disimula aquí. */

/** Las secciones que se pueden encender y apagar. */
export const SECCIONES = [
  { id: 'leyendo', label: 'Qué estoy leyendo', hint: 'Los libros que tienes empezados' },
  { id: 'numeros', label: 'Mis números', hint: 'Leídos este año, páginas y racha' },
  { id: 'generos', label: 'Mis géneros', hint: 'Lo que más lees' },
  { id: 'estanterias', label: 'Mis estanterías', hint: 'Solo las que marques como públicas' },
  { id: 'resenas', label: 'Mis reseñas', hint: 'Solo las que ya publicaste' },
  { id: 'mascota', label: 'Quien lee conmigo', hint: 'Tu bicho, tal y como lo tienes' },
  { id: 'actividad', label: 'Lo que voy leyendo', hint: 'Cada libro que empiezas y terminas sale en el feed. Lo ve quien te sigue, y puede verlo cualquiera con cuenta' },
  {
    id: 'sugerible',
    label: 'Que me encuentren por mis libros',
    hint: 'Publica la LISTA COMPLETA de lo que has leído y con cuántas estrellas, para que te sugieran a quien lee parecido. La puede leer cualquiera, tenga cuenta o no',
    opt: true,
  },
];

export const IDS_SECCION = SECCIONES.map((s) => s.id);

/** Las que están apagadas hasta que se encienden a mano. */
export const SECCIONES_OPT = SECCIONES.filter((s) => s.opt).map((s) => s.id);

export const esOpt = (id) => SECCIONES_OPT.includes(id);
/* ── CUENTA PRIVADA  ·  historia #52 ──────────────────────────
   Con la cuenta privada, quien no te sigue ve SOLO tu avatar, tu
   nombre y tu bio. Y como las reglas de Firestore conceden documentos
   enteros, eso no se puede hacer escondiendo campos: lo demás tiene
   que estar en OTRO documento, al que solo llegan tus seguidoras.

   Así que un perfil privado publica dos cosas: la tarjeta —que lee
   cualquiera— y el resto en profiles/{uid}/full/data, cuya regla
   comprueba que quien lee tenga una flecha de seguimiento aprobada.

   Consecuencia buscada: una cuenta privada NO aparece en «quizá
   conozcas», porque sus libros ya no están en el documento por el que
   busca esa consulta. Es lo correcto — quien se pone en privado no
   quiere que la encuentren por lo que lee. */
export const esPrivada = (settings = {}) => settings.privada === true;

export function seccionVisible(settings = {}, id) {
  /* Las de entregar lista viven en la lista de ENCENDIDAS, no en la de
     apagadas, y esa vuelta del revés es todo el arreglo: un ajuste que
     no está guardado significa «no», no «sí». Un fichero de ajustes
     vacío —una cuenta nueva, o la de alguien que nunca abrió esta
     pantalla— ya no publica nada de esto. */
  if (esOpt(id)) {
    const on = settings.profileShown;
    return Array.isArray(on) && on.includes(id);
  }
  const off = settings.profileHidden;
  if (!Array.isArray(off)) return true;
  return !off.includes(id);
}

/**
 * Le da la vuelta a una sección.
 *
 * Devuelve el PARCHE de ajustes, no un array: las dos clases de
 * sección se guardan en campos distintos, y que quien llama tenga que
 * saber en cuál es justo la forma de equivocarse —escribir
 * `profileHidden` con el id de una `opt` la dejaría encendida para
 * siempre, en silencio.
 */
export function toggleSeccion(settings = {}, id) {
  if (esOpt(id)) {
    const on = Array.isArray(settings.profileShown) ? settings.profileShown : [];
    return {
      profileShown: on.includes(id) ? on.filter((x) => x !== id) : [...on, id],
    };
  }
  const off = Array.isArray(settings.profileHidden) ? settings.profileHidden : [];
  return {
    profileHidden: off.includes(id) ? off.filter((x) => x !== id) : [...off, id],
  };
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

  const privada = esPrivada(settings);
  /* En privado no se enseña ninguna sección al mundo: se apagan todas
     a la vez, y por el mismo camino que las apaga la usuaria a mano —
     así no hay dos formas distintas de no publicar algo. */
  const ve = (id) => !privada && seccionVisible(settings, id);
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
    privada,
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

  /* ── LA MASCOTA VIAJA TAL CUAL, O NO VIAJA ────────────────
     «¿Cómo quedamos con la mascota cuando agregue amigos? Te la estás
      inventando, es un dato que ya deberías estar guardando.»

     Se guarda, y esto es lo que se guarda. Pero aquí había un
     `String(p.species || 'gato')`: sin especie, el perfil publicaba
     UN GATO. Es el tercer sitio de la app donde aparece el mismo
     respaldo silencioso —ya estaba en `petSvg` y en `petConfig`— y
     aquí es el más dañino de los tres, porque no falla al dibujar:
     ESCRIBE el dato falso en el documento público. Después ya no hay
     forma de distinguir «tiene un gato» de «no sabíamos cuál tenía».

     Sin especie no se publica mascota. Ausente es verdad; un gato
     inventado no lo es. `fur` y `accessory` sí pueden faltar sin
     mentir: son adornos de las especies dibujadas, y las ilustradas
     ni los usan. */
  const especie = String(settings.pet?.species || '').trim();
  if (ve('mascota') && settings.pet && !settings.pet.hidden && especie) {
    const p = settings.pet;
    doc.mascota = {
      species: especie,
      fur: String(p.fur || 'clasico'),
      accessory: p.accessory ? String(p.accessory) : null,
      name: texto(p.name, 24),
    };
  }

  /* «Quizá conozcas» (#47) cruza los libros que habéis leído las dos, y
     para cruzarlos hay que publicar CUÁLES. Es más concreto que un
     recuento de géneros, así que lleva su propio interruptor: nadie
     debería aparecer en las sugerencias de otra persona sin haberlo
     encendido. Solo van los identificadores, nunca lo que opinas. */
  if (ve('sugerible')) {
    const leidos = books.filter((b) => b.status === 'read');
    doc.librosLeidos = clavesParaBuscar(leidos.map((b) => String(b.id)));
    /* Y con cuántas estrellas  ·  historia #67
       «Se prioriza a quienes valoran parecido a mí, no solo a quienes
       leen lo mismo», dice la historia — y sin las puntuaciones eso no
       se puede calcular. Van solo las de los libros que ya se publican
       aquí, y solo con este interruptor encendido, que por eso dice
       exactamente lo que publica. Las reseñas escritas siguen sin
       salir: una puntuación no es una reseña. */
    doc.valorados = {};
    for (const b of leidos) {
      if (!doc.librosLeidos.includes(String(b.id))) continue;
      if (Number.isFinite(b.rating) && b.rating > 0) doc.valorados[String(b.id)] = b.rating;
    }
  }

  return doc;
}

/**
 * Los campos que salen. Está aquí para poder PROBARLO: la prueba
 * compara las claves del documento contra esta lista, así que un campo
 * nuevo que se cuele rompe una prueba en vez de filtrarse callando.
 */
export const CAMPOS_PUBLICOS = [
  'uid', 'username', 'name', 'nameLower', 'bio', 'city', 'secciones', 'privada',
  'updatedAt', 'leyendo', 'numeros', 'generos', 'estanterias', 'mascota', 'librosLeidos', 'valorados',
];

/**
 * Lo que solo ven tus seguidoras, cuando la cuenta es privada.
 *
 * Es exactamente lo que publicaría una cuenta pública, menos la
 * tarjeta: se construye con el mismo código, quitándole la marca de
 * privada. Hacerlo así evita que las dos versiones se separen con el
 * tiempo y acabe enseñándose de más en una de ellas.
 *
 * Devuelve null si la cuenta no es privada: entonces todo va en el
 * documento de siempre y este sobra.
 */
export function followersOnlyDoc(datos = {}) {
  if (!esPrivada(datos.settings || {})) return null;
  const abierto = publicProfileDoc({
    ...datos,
    settings: { ...(datos.settings || {}), privada: false },
  });
  if (!abierto) return null;
  const { uid, username, name, nameLower, bio, city, privada, ...resto } = abierto;
  return { uid, ...resto };
}

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

/* Lo que se dice de quien todavía no ha publicado nada. Es una
   CONSTANTE y no un literal suelto porque hay pantallas que necesitan
   saber si el resumen dice algo o no dice nada, y compararse contra una
   frase copiada a mano se rompe en cuanto alguien la retoca. */
export const SIN_DATOS = 'Acaba de llegar.';

/** Una frase para el perfil vacío: con pocos libros también tiene que verse bien. */
export function resumenCorto(doc = {}) {
  const partes = [];
  const n = doc.numeros;
  if (n?.leidosEsteAnio) partes.push(`${n.leidosEsteAnio} ${n.leidosEsteAnio === 1 ? 'libro' : 'libros'} en ${n.anio}`);
  if (n?.racha > 1) partes.push(`${n.racha} días seguidos`);
  if (doc.generos?.length) partes.push(`sobre todo ${doc.generos[0].genre}`);
  if (!partes.length) return SIN_DATOS;
  return partes.join(' · ');
}
