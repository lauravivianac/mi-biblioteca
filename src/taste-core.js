/* ─────────────────────────────────────────────────────────────
   TU GUSTO, DEDUCIDO  ·  historia #62

   Hasta ahora la app sabía reaccionar al ÚLTIMO libro que
   terminaste (#64). Eso es una foto; esto es la película: qué géneros
   lees de verdad y cuáles solo dices que lees, qué autores repites,
   qué longitud terminas y cuál abandonas.

   No hay IA aquí, y es a propósito: los 73 libros del plan ya vienen
   con género, con rol y con bloques temáticos evidentes. Eso es un
   perfil de gusto casi hecho, disponible desde el primer día, gratis,
   sin conexión y sin gastar un solo token. La IA, cuando llegue, es
   la que lo cuenta bonito (#66), no la que lo calcula.

   DOS COSAS QUE ESTE MÓDULO SE NIEGA A HACER:

   1. Tratar «leído» como sinónimo de «me gustó». Un libro terminado
      con dos estrellas es una señal NEGATIVA, y un género que
      abandonas tres veces lo es más todavía. La tentación al escribir
      esto es contar libros; contar libros te recomienda más de lo
      que sufriste.

   2. Callarse cuando hay pocos datos. Con tres libros leídos no se
      puede deducir un gusto —pero sí se puede proponer algo honesto,
      y decir que es provisional. Una pantalla en blanco es peor.

   Sin Firebase, como plan-core.js: se prueba en Node.
   ───────────────────────────────────────────────────────────── */

import { pagesOf, fold } from './suggest-core.js';

/** Lo que cuenta como señal: lo terminado y lo abandonado. */
const LEIDO = 'read';
const ABANDONADO = 'abandoned';

/* Cuántos libros con señal hacen falta para fiarse. Por debajo de
   CIERTA, el perfil se usa igual pero diciendo que es provisional. */
const POCA = 3;
const CIERTA = 8;

const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const mediana = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/**
 * Cuánto vale un libro leído como señal de gusto.
 *
 * Sin estrellas vale poco y en positivo: terminarlo dice algo, pero
 * mucho menos que decir que te encantó. Con dos o una, negativo — y
 * aquí es donde se rompería el módulo si alguien decidiera que «leído
 * es leído».
 */
export function signalOf(rating) {
  if (rating >= 5) return 1;
  if (rating === 4) return 0.6;
  if (rating === 3) return 0.1;
  if (rating === 2) return -0.6;
  if (rating === 1) return -1;
  return 0.25;                      // terminado sin puntuar
}

/**
 * El perfil de gusto, a partir de tus propios libros.
 *
 * `libros` son entradas ya fusionadas: {id, title, author, genre,
 * pages, status, rating, startedAt, finishedAt, month}.
 */
export function tasteProfile(libros = []) {
  const conSenal = libros.filter((b) => [LEIDO, ABANDONADO].includes(b.status));
  const leidos = conSenal.filter((b) => b.status === LEIDO);
  const abandonados = conSenal.filter((b) => b.status === ABANDONADO);

  return {
    muestras: conSenal.length,
    confianza: conSenal.length >= CIERTA ? 'buena' : conSenal.length >= POCA ? 'poca' : 'ninguna',
    generos: porGenero(leidos, abandonados),
    autores: porAutor(leidos),
    longitud: porLongitud(leidos, abandonados),
    ritmo: ritmoReciente(leidos),
  };
}

/* ── GÉNEROS ─────────────────────────────────────────────────── */

function porGenero(leidos, abandonados) {
  const nombres = new Set([...leidos, ...abandonados].map((b) => b.genre).filter(Boolean));
  return [...nombres].map((genre) => {
    const l = leidos.filter((b) => b.genre === genre);
    const a = abandonados.filter((b) => b.genre === genre);
    const puntuados = l.filter((b) => b.rating > 0).map((b) => b.rating);

    /* La señal media de lo leído: es lo que distingue «leo mucho
       thriller y me encanta» de «leo mucho thriller y me deja frío». */
    const senal = media(l.map((b) => signalOf(b.rating)));

    /* Y la penalización por abandono, que la historia pide expresamente.
       Abandonar es la crítica más sincera que existe: nadie abandona
       un libro que le está gustando. */
    const total = l.length + a.length;
    const tasaAbandono = total ? a.length / total : 0;

    const score = Math.round(
      senal * 45                       // te gustó o no
      + Math.min(l.length, 5) * 5      // y lo lees a menudo
      - tasaAbandono * 55,             // pero lo dejas a medias
    );

    return {
      genre,
      leidos: l.length,
      abandonados: a.length,
      mediaEstrellas: puntuados.length ? Number(media(puntuados).toFixed(1)) : null,
      tasaAbandono,
      score,
    };
  }).sort((x, y) => y.score - x.score);
}

/* ── AUTORES ─────────────────────────────────────────────────── */

/**
 * Un autor solo cuenta si lo has repetido o si te encantó.
 *
 * «Te encantó» aquí son las cinco estrellas y solo ellas. Con cuatro
 * la app diría «te gustó mucho» de un único libro, y eso ya es ponerle
 * palabras que no dijiste: cuatro estrellas es «estuvo muy bien», no
 * «tráeme más de este autor». Con dos libros del mismo, en cambio, la
 * repetición habla por sí sola.
 */
function porAutor(leidos) {
  const nombres = new Set(leidos.map((b) => fold(b.author)).filter(Boolean));
  return [...nombres].map((clave) => {
    const suyos = leidos.filter((b) => fold(b.author) === clave);
    const senal = media(suyos.map((b) => signalOf(b.rating)));
    return {
      author: suyos[0].author,
      leidos: suyos.length,
      senal,
      score: Math.round(senal * 50 + (suyos.length - 1) * 25),
    };
  })
    .filter((a) => (a.leidos > 1 || a.senal >= 1) && a.score > 0)
    .sort((x, y) => y.score - x.score);
}

/* ── LONGITUD ────────────────────────────────────────────────── */

/**
 * La longitud que de verdad terminas.
 *
 * Es el dato que más gente descubre de sí misma con sorpresa: quien
 * abandona sistemáticamente por encima de las 500 páginas cree que
 * «no tiene tiempo», cuando lo que pasa es que los tomos largos no le
 * están funcionando. Solo se afirma si hay con qué: dos abandonos
 * largos no son una tendencia.
 */
function porLongitud(leidos, abandonados) {
  const term = leidos.map((b) => pagesOf(b.pages)).filter(Boolean);
  const dej = abandonados.map((b) => pagesOf(b.pages)).filter(Boolean);
  const largo = (p) => p >= 450;

  const largosTerminados = term.filter(largo).length;
  const largosAbandonados = dej.filter(largo).length;
  const largosTotales = largosTerminados + largosAbandonados;

  return {
    tipica: mediana(term),
    maxTerminada: term.length ? Math.max(...term) : null,
    /* Hace falta una muestra Y una mayoría clara: si de cuatro tomos
       largos abandonaste tres, eso ya es una forma de leer. */
    abandonaLargos: largosTotales >= 3 && largosAbandonados / largosTotales > 0.5,
    largosTerminados,
    largosAbandonados,
  };
}

/* ── RITMO ───────────────────────────────────────────────────── */

/** Cuánto lees últimamente. Medio año, que es donde la vida cambia. */
function ritmoReciente(leidos, ahora = Date.now()) {
  const VENTANA = 182 * 86400000;
  const recientes = leidos.filter((b) => b.finishedAt && ahora - b.finishedAt <= VENTANA);
  const meses = 6;
  return {
    librosPorMes: Number((recientes.length / meses).toFixed(1)),
    paginasPorMes: Math.round(
      recientes.reduce((a, b) => a + (pagesOf(b.pages) || 0), 0) / meses,
    ),
    muestra: recientes.length,
  };
}

/* ── PUNTUAR UN CANDIDATO ────────────────────────────────────── */

/**
 * Qué tal encaja un libro con el perfil, y POR QUÉ.
 *
 * El porqué no es decoración: una recomendación que no se explica no
 * se puede corregir. Si dice «porque tus dos de Rulfo te encantaron»,
 * tú sabes si eso es cierto y, si no lo es, sabes qué arreglar.
 */
export function scoreByTaste(cand, perfil) {
  if (!perfil || perfil.confianza === 'ninguna') return { score: 0, porque: null };

  let score = 0;
  let porque = null;

  const autor = perfil.autores.find((a) => fold(a.author) === fold(cand.author));
  if (autor) {
    score += Math.min(autor.score, 70);
    porque = autor.leidos > 1
      ? `Has leído ${autor.leidos} de ${autor.author} y te gustaron`
      : `${autor.author} te gustó mucho`;
  }

  const g = perfil.generos.find((x) => x.genre === cand.genre);
  if (g) {
    score += Math.max(-60, Math.min(60, g.score));
    if (!porque) {
      if (g.score >= 25) {
        porque = g.mediaEstrellas
          ? `${g.genre} es lo tuyo: ${g.leidos} leídos, ${g.mediaEstrellas} de media`
          : `${g.genre} es de lo que más lees`;
      } else if (g.score <= -25 && g.abandonados) {
        porque = `Ojo: has dejado a medias ${g.abandonados} de ${g.genre}`;
      }
    }
  }

  /* La longitud pesa, pero casi nunca se dice.
     «Este es de los largos y se te atragantan» es un aviso útil: te
     hace mirar el libro de otra manera. «Este es corto» no explica
     nada, porque la mitad de tu biblioteca también lo es —y si se
     narra, media pantalla acaba repitiendo la misma frase, que es
     como no decir nada pero con más letras. Puntúa igual; se calla. */
  const p = pagesOf(cand.pages);
  if (p && perfil.longitud.abandonaLargos) {
    if (p >= 450) {
      score -= 35;
      if (!porque) porque = 'Es de los largos, y esos se te suelen atragantar';
    } else {
      score += 20;
    }
  }

  return { score: Math.round(score), porque };
}

/**
 * Las mejores recomendaciones entre TUS libros, según el perfil.
 *
 * Con pocos datos no se queda en blanco: propone de lo que ya está en
 * el plan y de los deseados, y lo dice. Prometer menos y cumplir es
 * mejor que una pantalla vacía o una recomendación inventada.
 */
export function recommendByTaste(libros = [], { limit = 5, exclude = [] } = {}) {
  const perfil = tasteProfile(libros);
  const fuera = new Set(exclude);
  const candidatos = libros
    .filter((b) => ['pending', 'wished'].includes(b.status))
    .filter((b) => !fuera.has(b.id));

  const puntuados = candidatos.map((b) => {
    const { score, porque } = scoreByTaste(b, perfil);
    return { ...b, score: score + respaldo(b), porque: porque || respaldoPorque(b) };
  });

  return {
    perfil,
    sugerencias: puntuados
      .sort((a, b) => b.score - a.score)
      .slice(0, limit),
  };
}

/* Lo que vale un candidato aunque no se sepa nada de tu gusto. No es
   un relleno: que lo pusieras en el plan o en deseados ES información,
   solo que la pusiste tú a mano en vez de deducirla la app. */
const respaldo = (b) => (b.month ? 12 : 0) + (b.status === 'wished' ? 10 : 0);

const respaldoPorque = (b) => {
  if (b.month) return `Lo tenías en el plan de ${b.month}`;
  if (b.status === 'wished') return 'Lo tenías en deseados';
  return 'De tus pendientes';
};

/* ── DECIRLO EN UNA FRASE ────────────────────────────────────── */

/**
 * El perfil, en lenguaje de persona.
 *
 * Enseñarlo es parte de que la recomendación sea explicable: si la app
 * cree que te encanta la poesía y es mentira, quieres poder verlo tú
 * misma en vez de deducirlo de sugerencias raras.
 */
export function describeTaste(perfil) {
  if (!perfil || perfil.confianza === 'ninguna') {
    return `Con ${perfil?.muestras || 0} ${perfil?.muestras === 1 ? 'libro' : 'libros'} `
      + 'todavía no puedo deducir tu gusto. Marca unos cuantos como leídos '
      + '—y ponles estrellas, que es lo que más dice— y esto se irá afinando.';
  }

  const partes = [];
  const top = perfil.generos.filter((g) => g.score >= 20).slice(0, 2);
  if (top.length) partes.push(`Lees sobre todo ${top.map((g) => g.genre).join(' y ')}`);

  const mal = perfil.generos.find((g) => g.abandonados >= 2 && g.score < 0);
  if (mal) partes.push(`sueles dejar a medias los de ${mal.genre}`);

  if (perfil.autores.length) {
    partes.push(`repites a ${perfil.autores.slice(0, 2).map((a) => a.author).join(' y ')}`);
  }

  if (perfil.longitud.abandonaLargos) {
    partes.push('los tomos de más de 450 páginas se te atragantan');
  } else if (perfil.longitud.tipica) {
    partes.push(`tus libros rondan las ${perfil.longitud.tipica} páginas`);
  }

  /* El ritmo, solo si hay con qué —y en libros enteros. «Terminas 0,5
     libros al mes» es aritméticamente correcto y humanamente inútil:
     nadie termina medio libro. Se dice lo que de verdad pasó. */
  if (perfil.ritmo.muestra >= 3) {
    partes.push(`has terminado ${perfil.ritmo.muestra} libros en los últimos seis meses`);
  }

  /* Unir con comas y una «y» al final. Ojo: esto se hacía con un
     reemplazo sobre la última coma de la cadena, y el día que una
     parte trajo un decimal —«0,5»— se comió esa coma y salió «05».
     Uniendo por piezas no hay forma de que vuelva a pasar. */
  const frase = partes.length > 1
    ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`
    : (partes[0] || '');

  return `${frase.charAt(0).toUpperCase()}${frase.slice(1)}.`
    + (perfil.confianza === 'poca' ? ' Con tan pocos libros esto es provisional.' : '');
}
