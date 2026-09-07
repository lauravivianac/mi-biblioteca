/* ─────────────────────────────────────────────────────────────
   EL CHAT DEL INTERCAMBIO  ·  historias #85, #87 y #88

   Esta es la parte donde dos desconocidas quedan en persona, así que
   las decisiones aquí pesan más que en el resto de la app.

   SE AVISA, NO SE IMPIDE. La nota de la #85 lo dice con estas
   palabras: «advertir sin bloquear es el equilibrio correcto.
   Compartir el teléfono con alguien de confianza es legítimo; hacerlo
   sin pensar, en el primer mensaje y con una desconocida, es lo que
   conviene que dé un segundo de pausa». Una app que decide por ti qué
   puedes escribir se siente rota y se acaba esquivando escribiendo
   «seis-uno-cinco»; una que te da un segundo de pausa, no.

   Y SIN PAGOS, otra vez y donde más importa: el aviso de la cabecera
   dice que por esta app no se paga nunca. Es el mayor riesgo de una
   función así, y quien lo sepa de antemano reconoce la estafa cuando
   la vea.
   ───────────────────────────────────────────────────────────── */

import { sinTildes, unSoloEspacio } from './text-core.js';

export const MAX_MENSAJE = 1000;

const limpio = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/* ── QUIÉN HABLA CON QUIÉN ───────────────────────────────────── */

/**
 * El chat se llama igual que la solicitud que lo abrió.
 *
 * No hace falta inventar otro identificador: un chat es exactamente
 * «esta persona, este libro», que es lo que ya nombra la solicitud. Y
 * así no puede haber dos chats para el mismo intercambio.
 */
export const chatId = (solicitudId) => String(solicitudId ?? '');

/** Las dos partes, siempre ordenadas: así la lista no depende de quién mire. */
export const partesDe = (a, b) => [String(a), String(b)].sort();

export function chatDoc({ solicitud = null, at = Date.now() } = {}) {
  if (!solicitud?.id || !solicitud.de || !solicitud.para) return null;
  /* Solo se abre cuando está aceptada: un chat con quien no aceptó
     nada es exactamente el mensaje no pedido que esto no quiere ser. */
  if (solicitud.estado !== 'aceptada') return null;
  return {
    partes: partesDe(solicitud.de, solicitud.para),
    solicitudId: solicitud.id,
    swapId: solicitud.swapId,
    bookId: solicitud.bookId || '',
    title: limpio(solicitud.title, 120),
    author: limpio(solicitud.author, 80),
    /* Quién ofrecía el libro: hace falta para saber en la biblioteca de
       quién entra al confirmar (#86). */
    dueño: solicitud.para,
    recibe: solicitud.de,
    confirmadoPor: [],
    completado: false,
    cerrado: false,
    at,
    ultimoAt: at,
  };
}

export function mensajeDoc({ de, texto, at = Date.now() } = {}) {
  const t = limpio(texto, MAX_MENSAJE);
  if (!de || !t) return null;
  return { de, texto: t, at };
}

/* ── LO QUE CONVIENE PENSAR DOS VECES  ·  #85 ────────────────── */

/**
 * ¿Hay aquí un teléfono, una dirección o un correo?
 *
 * No es un filtro: es un aviso. Devuelve qué ha visto para poder
 * decirlo con palabras («parece un teléfono») en vez de con un «texto
 * no permitido», que además sería mentira porque sí se permite.
 *
 * Se busca sobre el texto con los separadores quitados, porque
 * «615 22 33 44», «615-22-33-44» y «615223344» son el mismo teléfono y
 * un aviso que solo salta con uno de los tres no sirve para nada.
 */
const SEPARADORES = /[\s.\-()/]/g;

export function detectaDatosPersonales(texto = '') {
  const bruto = String(texto ?? '');
  const pegado = bruto.replace(SEPARADORES, '');
  const encontrado = [];

  /* Siete dígitos seguidos ya es un teléfono en casi todas partes, y
     por debajo de eso empiezan a saltar los años y los números de
     página. El prefijo internacional entra en la misma cuenta. */
  if (/(\+?\d{7,15})/.test(pegado)) encontrado.push('telefono');

  if (/[\w.+-]+@[\w-]+\.[\w.]{2,}/.test(bruto)) encontrado.push('correo');

  /* Una calle con número. No se buscan calles a secas: «nos vemos en
     la calle» no es una dirección, y avisar de eso enseña a ignorar
     los avisos. */
  const sinTilde = unSoloEspacio(sinTildes(bruto));
  if (/\b(calle|carrera|avenida|avda|c\/|cra|diagonal|transversal|piso|portal|numero|num|nro)\b[^.]{0,24}\d/.test(sinTilde)) {
    encontrado.push('direccion');
  }

  return encontrado;
}

export const AVISOS_DATOS = {
  telefono: 'Parece que vas a mandar un teléfono. Puedes hacerlo, pero no hace'
    + ' falta para quedar: aquí dentro os escribís sin darlo.',
  correo: 'Parece que vas a mandar un correo. No hace falta para quedar.',
  direccion: 'Parece una dirección. Quedad mejor en un sitio público:'
    + ' la casa de nadie es un buen primer encuentro.',
};

/** El aviso que se enseña antes de mandar, o null si no hay nada que decir. */
export function avisoAntesDeMandar(texto = '') {
  const visto = detectaDatosPersonales(texto);
  if (!visto.length) return null;
  return {
    tipos: visto,
    /* Se enseña UN aviso, el del primero que se vio. Tres avisos a la
       vez se leen como un error del sistema y no como un consejo. */
    texto: AVISOS_DATOS[visto[0]],
    /* Y se puede mandar igual: eso es lo que lo hace un aviso. */
    bloquea: false,
  };
}

/* ── LOS AVISOS DE SEGURIDAD  ·  #88 ─────────────────────────── */

/** Fijo en la cabecera. Se puede encoger, no quitar. */
export const AVISO_CABECERA = 'Quedad en un sitio público. Por esta app no se paga nunca.';

export const RECOMENDACIONES = [
  {
    id: 'publico',
    titulo: 'En un sitio público y con gente',
    texto: 'Una biblioteca, una cafetería céntrica, la entrada de un centro'
      + ' comercial o una estación. Nunca en casa de nadie, ni la primera vez ni la quinta.',
  },
  {
    id: 'dia',
    titulo: 'De día',
    texto: 'Y si puede ser, a una hora en la que haya gente alrededor.',
  },
  {
    id: 'avisa',
    titulo: 'Dile a alguien dónde vas',
    texto: 'A qué hora, con quién y dónde. Es lo que hace que un mal rato no'
      + ' se convierta en algo peor.',
  },
  {
    id: 'direccion',
    titulo: 'No des tu dirección',
    texto: 'Ni tu teléfono si no te apetece: para quedar basta con esto de aquí.'
      + ' La app no guarda tu dirección en ningún sitio.',
  },
  {
    id: 'dinero',
    titulo: 'Nunca se paga',
    texto: 'Esto es trueque. Si alguien te pide dinero, una transferencia o los'
      + ' datos de tu tarjeta, es una estafa. Repórtalo.',
  },
  {
    id: 'incomodo',
    titulo: 'Si algo no te cuadra, no vayas',
    texto: 'No hace falta explicarlo ni quedar bien. Cancelar es gratis y'
      + ' bloquear también.',
  },
];

/**
 * Sitios donde quedar.
 *
 * Categorías y no nombres propios: la app no sabe qué cafeterías hay en
 * tu ciudad, y una lista inventada de sitios reales sería peor que no
 * dar ninguna. Que la elección concreta la hagáis vosotras.
 */
export const PUNTOS_SUGERIDOS = [
  { icono: '📚', texto: 'Una biblioteca pública' },
  { icono: '☕', texto: 'Una cafetería del centro' },
  { icono: '🚇', texto: 'La entrada de una estación de metro o tren' },
  { icono: '🛍', texto: 'La entrada de un centro comercial' },
  { icono: '🏛', texto: 'Una plaza principal, de día' },
  { icono: '📖', texto: 'Una librería' },
];

/** Al abrir el primer chat se enseñan enteras; después, encogidas. */
export const primeraVez = (chat = {}, yo = '') =>
  !(chat.vistoSeguridad || []).includes(yo);

/* ── CÓMO SE LEE LA CONVERSACIÓN ─────────────────────────────── */

export const mensajesOrdenados = (lista = []) =>
  [...lista].sort((a, b) => (a.at || 0) - (b.at || 0));

/**
 * ¿Se puede escribir aquí?
 *
 * Bloquear cierra el chat POR LOS DOS LADOS, que es lo que pide la
 * historia: si solo se cerrara por un lado, quien bloquea seguiría
 * recibiendo. La otra mitad la aplica la regla del servidor, porque el
 * cliente se puede modificar.
 */
export function puedeEscribir({ chat = null, yo = '', bloqueados = [], meBloquearon = false } = {}) {
  if (!chat || !yo) return { puede: false, motivo: '' };
  if (!(chat.partes || []).includes(yo)) return { puede: false, motivo: 'Este chat no es tuyo.' };
  if (chat.cerrado) {
    return { puede: false, motivo: 'Este intercambio está cerrado. La conversación queda guardada.' };
  }
  const otra = (chat.partes || []).find((p) => p !== yo);
  if (bloqueados.includes(otra)) {
    return { puede: false, motivo: 'La bloqueaste. Desbloquéala si quieres seguir hablando.' };
  }
  if (meBloquearon) {
    /* No se dice «te ha bloqueado»: eso convierte el bloqueo en un
       mensaje, y quien bloquea no quiere mandar ninguno. */
    return { puede: false, motivo: 'Ya no se puede escribir en esta conversación.' };
  }
  return { puede: true, motivo: '' };
}

/** Lo que se dice cuando la conversación está vacía. */
export const VACIO_CHAT = {
  rune: 'sobre',
  texto: 'Aún no os habéis escrito',
  detalle: 'Un «hola, ¿cómo quedamos?» basta. No hace falta dar el teléfono.',
};
