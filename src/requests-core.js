/* ─────────────────────────────────────────────────────────────
   SOLICITAR UN INTERCAMBIO  ·  historia #84

   Una solicitud es una conversación corta con cuatro finales posibles:
   la aceptas, la rechazas, contrapropones, o quien la mandó la retira.
   Nada más. Todo lo que venga después —quedar, confirmar— es de las
   historias siguientes.

   SIGUE SIN HABER DINERO. Igual que en la publicación (#82): no hay
   campo de precio y la regla del servidor lo rechaza aunque alguien lo
   mande a mano. Se ofrecen libros, o se pide suelto.

   EL IDENTIFICADOR ES `{quienPide}_{publicación}` Y ESO ES LO QUE
   IMPIDE EL SPAM. No hace falta contar nada: una persona no puede
   tener dos solicitudes sobre el mismo libro porque sería el mismo
   documento. El límite diario de la historia se suma a eso, para que
   nadie pida a cincuenta personas distintas en una tarde.
   ───────────────────────────────────────────────────────────── */

const limpio = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/* ── LÍMITES ─────────────────────────────────────────────────── */

export const MAX_OFRECIDOS = 3;
export const MAX_MENSAJE = 300;

/**
 * El tope diario.
 *
 * Es contra el spam, no contra ti: quien de verdad quiere intercambiar
 * manda dos o tres solicitudes, no quince. Y se comprueba en la app y
 * no en la regla porque contar documentos dentro de una regla no se
 * puede — se dice claro aquí en vez de fingir que es una barrera de
 * seguridad. La que sí lo es, la del identificador, está arriba.
 */
export const MAX_POR_DIA = 15;

const DIA = 24 * 60 * 60 * 1000;

export const requestId = (dePersona, swapId) => `${dePersona}_${swapId}`;

/* ── LOS ESTADOS ─────────────────────────────────────────────── */

export const ESTADOS_SOLICITUD = ['pendiente', 'aceptada', 'rechazada', 'contrapropuesta', 'cancelada'];

/**
 * Cómo se lee el estado, y NO ES IGUAL PARA LAS DOS.
 *
 * «Rechazada» no significa lo mismo si la rechazaste tú que si te la
 * rechazaron, y una lista que usa la misma frase para las dos se lee
 * mal justo cuando importa. Por eso hay dos textos por estado.
 */
const TEXTOS = {
  pendiente: { mia: 'Esperando respuesta', suya: 'Te lo ha pedido' },
  aceptada: { mia: '¡Aceptada!', suya: 'La aceptaste' },
  rechazada: { mia: 'No pudo ser', suya: 'La rechazaste' },
  contrapropuesta: { mia: 'Te propone otra cosa', suya: 'Le propusiste otra cosa' },
  cancelada: { mia: 'La retiraste', suya: 'La retiró' },
};

export function estadoTexto(sol = {}, yo = '') {
  const t = TEXTOS[sol.estado];
  if (!t) return '';
  return sol.de === yo ? t.mia : t.suya;
}

export const esMia = (sol = {}, yo = '') => sol.de === yo;
export const esParaMi = (sol = {}, yo = '') => sol.para === yo;

/* ── QUÉ PUEDE HACER CADA UNA, Y CUÁNDO ──────────────────────── */

/** Quien recibe contesta, y solo mientras esté pendiente. */
export const puedeResponder = (sol = {}, yo = '') =>
  esParaMi(sol, yo) && sol.estado === 'pendiente';

/** Quien pidió cierra la contrapropuesta: la acepta o la rechaza. */
export const puedeCerrarContra = (sol = {}, yo = '') =>
  esMia(sol, yo) && sol.estado === 'contrapropuesta';

/** Retirar la propia, mientras siga viva. */
export const puedeCancelar = (sol = {}, yo = '') =>
  esMia(sol, yo) && (sol.estado === 'pendiente' || sol.estado === 'contrapropuesta');

/** Una solicitud viva es la que todavía espera algo de alguien. */
export const estaViva = (sol = {}) =>
  sol.estado === 'pendiente' || sol.estado === 'contrapropuesta';

/**
 * ¿Vale este cambio de estado, viniendo de quien viene?
 *
 * La misma tabla que la regla del servidor, escrita una vez aquí para
 * que la pantalla no ofrezca botones que el servidor va a rechazar.
 */
export function transicionValida({ sol = {}, yo = '', nuevo = '' } = {}) {
  if (!ESTADOS_SOLICITUD.includes(nuevo)) return false;
  if (puedeResponder(sol, yo)) return ['aceptada', 'rechazada', 'contrapropuesta'].includes(nuevo);
  if (puedeCerrarContra(sol, yo)) return ['aceptada', 'rechazada'].includes(nuevo);
  if (puedeCancelar(sol, yo)) return nuevo === 'cancelada';
  return false;
}

/* ── ¿PUEDO PEDIR ESTO? ──────────────────────────────────────── */

/**
 * Antes de abrir el formulario, no después.
 *
 * Explorar y solicitar no piden correo verificado ni antigüedad —eso
 * es solo para publicar (#89)—, así que aquí solo se comprueban las
 * cosas que no tendrían sentido: pedirte a ti misma, pedir algo
 * retirado, o repetir una solicitud que ya está viva.
 */
export function puedeSolicitar({
  yo = '', publicacion = null, yaSolicitado = null, enviadasHoy = 0,
} = {}) {
  if (!yo) return { puede: false, motivo: 'Necesitas iniciar sesión.' };
  if (!publicacion?.id) return { puede: false, motivo: 'Esa publicación ya no está.' };
  if (publicacion.uid === yo) return { puede: false, motivo: 'Este libro lo ofreces tú.' };
  if (publicacion.activa === false) {
    return { puede: false, motivo: 'Ese libro ya no está disponible.' };
  }
  if (yaSolicitado && estaViva(yaSolicitado)) {
    return { puede: false, motivo: 'Ya se lo pediste. Está en «Mis intercambios».', yaEsta: true };
  }
  if (enviadasHoy >= MAX_POR_DIA) {
    return {
      puede: false,
      motivo: `Has mandado ${enviadasHoy} solicitudes hoy, que es el máximo.`
        + ' Mañana puedes seguir.',
    };
  }
  return { puede: true, motivo: '' };
}

/** Las de hoy, para el tope. Se cuenta sobre lo que ya está descargado. */
export function enviadasHoy(lista = [], ahora = Date.now()) {
  const desde = ahora - DIA;
  return lista.filter((s) => (s.at || 0) >= desde).length;
}

/* ── LOS DOCUMENTOS ──────────────────────────────────────────── */

/** Un libro ofrecido, con lo justo para que se entienda sin ir a buscarlo. */
const libroOfrecido = (b) => ({
  bookId: String(b?.id ?? ''),
  title: limpio(b?.title, 120),
  author: limpio(b?.author, 80),
});

/**
 * La solicitud.
 *
 * Lleva copia del libro pedido porque quien la mira en su lista no
 * tiene por qué seguir teniendo la publicación delante — y porque una
 * publicación retirada no debe dejar la conversación hablando de algo
 * que ya no se puede nombrar (la misma razón por la que retirar marca
 * en vez de borrar, ver swap.js).
 */
export function requestDoc({
  de, deNombre = '', deUsuario = '',
  para, publicacion = null,
  ofrezco = [], suelto = false, mensaje = '', at = Date.now(),
} = {}) {
  if (!de || !para || de === para || !publicacion?.id) return null;

  const libros = (Array.isArray(ofrezco) ? ofrezco : [])
    .filter((b) => b?.id && b?.title)
    .slice(0, MAX_OFRECIDOS)
    .map(libroOfrecido);

  /* O pides algo a cambio o lo pides suelto: sin libros y sin marcar
     «suelto», la otra persona no sabe qué le estás proponiendo. */
  const pidoSuelto = suelto === true || libros.length === 0;

  return {
    de,
    deNombre: limpio(deNombre, 60),
    deUsuario: limpio(deUsuario, 20).toLowerCase(),
    para,
    swapId: String(publicacion.id),
    bookId: String(publicacion.bookId ?? ''),
    title: limpio(publicacion.title, 120),
    author: limpio(publicacion.author, 80),
    cover: typeof publicacion.cover === 'string' && publicacion.cover ? publicacion.cover : null,
    ofrezco: pidoSuelto ? [] : libros,
    suelto: pidoSuelto,
    mensaje: limpio(mensaje, MAX_MENSAJE),
    estado: 'pendiente',
    at,
    actualizado: at,
  };
}

export const REQUEST_FIELDS = [
  'de', 'deNombre', 'deUsuario', 'para', 'swapId', 'bookId', 'title', 'author',
  'cover', 'ofrezco', 'suelto', 'mensaje', 'estado', 'at', 'actualizado',
  'contraoferta',
];

/**
 * La contrapropuesta.
 *
 * Quien recibe puede decir «este no, pero ¿me cambias por aquel?». Va
 * como un campo aparte y no pisando `ofrezco`, para que las dos partes
 * sigan viendo qué se pidió al principio: si la contrapropuesta
 * borrara la oferta original, aceptar sería aceptar algo que ya no se
 * puede leer.
 */
export function contraofertaDoc({ pido = [], mensaje = '', at = Date.now() } = {}) {
  const libros = (Array.isArray(pido) ? pido : [])
    .filter((b) => b?.id && b?.title)
    .slice(0, MAX_OFRECIDOS)
    .map(libroOfrecido);
  if (!libros.length && !limpio(mensaje, MAX_MENSAJE)) return null;
  return { pido: libros, mensaje: limpio(mensaje, MAX_MENSAJE), at };
}

/* ── CÓMO SE LEE ─────────────────────────────────────────────── */

/** Lo que se ofrece, en una línea. */
export function resumenOferta(sol = {}) {
  if (sol.suelto) return 'Lo pide suelto';
  const libros = sol.ofrezco || [];
  if (!libros.length) return 'Lo pide suelto';
  if (libros.length === 1) return `Ofrece «${libros[0].title}»`;
  return `Ofrece ${libros.length} libros`;
}

/** El aviso que se deja en la bandeja de la otra persona. */
export function requestNotice({ de, deNombre = '', deUsuario = '', tipo = 'swapreq', at = Date.now() } = {}) {
  if (!de || (tipo !== 'swapreq' && tipo !== 'swapres')) return null;
  return {
    tipo,
    from: de,
    fromName: limpio(deNombre, 60),
    fromUsername: limpio(deUsuario, 20).toLowerCase(),
    at,
    leido: false,
  };
}

/** Ordenar: lo vivo primero, y dentro de eso lo más reciente. */
export const porAtender = (lista = []) => [...lista].sort((a, b) =>
  (estaViva(b) ? 1 : 0) - (estaViva(a) ? 1 : 0)
  || (b.actualizado || b.at || 0) - (a.actualizado || a.at || 0));

/** Lo que se dice cuando no hay ninguna. */
export const VACIO_ENVIADAS = {
  rune: '📤',
  texto: 'No has pedido ningún libro todavía',
  detalle: 'Cuando encuentres algo en «Explorar», pídelo y aparecerá aquí.',
};

export const VACIO_RECIBIDAS = {
  rune: '📥',
  texto: 'Nadie te ha pedido nada todavía',
  detalle: 'Cuantos más libros ofrezcas, más fácil es que alguien te escriba.',
};
