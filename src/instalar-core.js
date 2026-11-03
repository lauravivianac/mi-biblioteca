/* ─────────────────────────────────────────────────────────────
   «QUE LA GENTE SEPA QUÉ HACER»  ·  instalar en la pantalla de inicio

     «¿Cómo hacemos para que cuando se abra el sitio se instale en el
      Home automáticamente, o saque un pop-up o algo donde la gente
      sepa qué hacer?»

   ── LO PRIMERO: AUTOMÁTICAMENTE NO SE PUEDE ─────────────────

   Ningún navegador deja que una página se instale sola. Es a
   propósito: si se pudiera, cualquier web que visitaras te dejaría un
   icono en el teléfono. Lo más cerca que se puede llegar son dos
   cosas distintas, y conviene no confundirlas:

     · En Android y en el escritorio, Chrome y Edge avisan con un
       evento (`beforeinstallprompt`) y dejan abrir el diálogo DE
       VERDAD, pero solo dentro de un gesto de la persona. O sea: un
       botón. No se puede lanzar al cargar.

     · En iPhone y iPad NO HAY API NINGUNA. Ni evento, ni diálogo, ni
       forma de pedirlo. Lo único posible es explicar los dos toques:
       Compartir → Añadir a pantalla de inicio.

   Así que «que se instale solo» no existe en ningún sistema, y en iOS
   —que es justo donde más falta hace, porque sin instalar no hay
   notificaciones— lo único que se puede hacer es contarlo bien.

   ── Y EL CASO QUE SE OLVIDA SIEMPRE ─────────────────────────

   En iOS, «Añadir a pantalla de inicio» vive en el menú Compartir de
   SAFARI. Quien llega desde un enlace de Instagram o de Facebook está
   dentro del navegador de esa app, donde ese menú no está. Si se le
   enseñan las instrucciones de Safari, las busca, no las encuentra y
   concluye que la app está rota.

   Ese caso tiene su propio modo (`ios-otro`) y su propio consejo:
   abrirla en Safari primero. Para una app que se va a promocionar con
   enlaces en redes, es probablemente el camino MÁS transitado de los
   tres, no un borde raro.
   ───────────────────────────────────────────────────────────── */

/** Cuántos días se respeta un «ahora no». */
export const DIAS_DE_CALMA = 14;

const DIA = 24 * 60 * 60 * 1000;

/* ── QUIÉN ES QUIÉN ──────────────────────────────────────────── */

export function esIOS({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  /* El iPad moderno se presenta como un Mac de escritorio; lo delata
     la pantalla táctil. */
  return platform === 'MacIntel' && maxTouchPoints > 1;
}

/**
 * ¿Es el Safari de verdad, o un navegador prestado?
 *
 * En iOS todos los navegadores usan el motor de Safari, así que el
 * user agent se parece muchísimo. Lo que los distingue son sus
 * marcas: `CriOS` es Chrome, `FxiOS` Firefox, `FBAN`/`FBAV` el
 * navegador de Facebook, y así. Se mira la marca ajena PRIMERO,
 * porque casi todos llevan además la palabra «Safari» dentro.
 */
export function navegadorIOS(userAgent = '') {
  if (/CriOS|FxiOS|EdgiOS|OPiOS|Brave|DuckDuckGo/i.test(userAgent)) return 'otro';
  /* Navegadores dentro de otra app: Instagram, Facebook, Messenger,
     Line, TikTok, Snapchat. Aquí no hay menú Compartir de Safari. */
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|Snapchat|Twitter/i.test(userAgent)) return 'otro';
  if (/Safari/.test(userAgent) && /Version\//.test(userAgent)) return 'safari';
  /* Sin «Version/» es un WKWebView: otra app enseñando una página. */
  return 'otro';
}

export const yaInstalada = ({ standalone = false, displayStandalone = false } = {}) =>
  standalone === true || displayStandalone === true;

/* ── LA DECISIÓN ─────────────────────────────────────────────── */

/**
 * ¿Se le ofrece instalar, y de qué manera?
 *
 * Devuelve `{ ofrecer, modo, motivo }`. `motivo` dice por qué NO,
 * siempre: sin eso, depurar «¿por qué no me sale el aviso?» es
 * adivinar, y es la pregunta que se va a hacer en cada teléfono
 * distinto.
 *
 * Modos:
 *   · `boton`      el navegador nos dio el evento: hay diálogo de verdad
 *   · `ios-safari` iPhone o iPad en Safari: se explican los dos toques
 *   · `ios-otro`   iPhone o iPad en otro navegador: primero, abrir en Safari
 */
export function comoInstalar({
  userAgent = '', platform = '', maxTouchPoints = 0,
  standalone = false, displayStandalone = false,
  hayPrompt = false,
  descartadaEl = 0,
  ahora = Date.now(),
} = {}) {
  const no = (motivo) => ({ ofrecer: false, modo: null, motivo });

  /* YA ESTÁ INSTALADA. Va lo primero de todo: ofrecerle instalar la
     app a quien la abrió DESDE el icono que instaló es la clase de
     detalle que hace pensar que nadie probó esto. */
  if (yaInstalada({ standalone, displayStandalone })) return no('ya-instalada');

  /* DIJO QUE NO HACE POCO. Un «ahora no» que no dura nada no es un
     «ahora no»: es un parpadeo, y la segunda vez ya molesta. */
  if (descartadaEl && ahora - descartadaEl < DIAS_DE_CALMA * DIA) return no('la-descarto');

  /* EL BOTÓN DE VERDAD GANA. Si el navegador nos dio el evento, hay
     diálogo nativo y no hay que explicar nada: se toca y se instala. */
  if (hayPrompt) return { ofrecer: true, modo: 'boton', motivo: null };

  if (esIOS({ userAgent, platform, maxTouchPoints })) {
    return {
      ofrecer: true,
      modo: navegadorIOS(userAgent) === 'safari' ? 'ios-safari' : 'ios-otro',
      motivo: null,
    };
  }

  /* Ni evento ni iOS: Firefox de escritorio, un navegador viejo, o
     Chrome que todavía no ha decidido que la página es instalable. No
     hay nada que ofrecer que vaya a funcionar, y un cartel que no
     lleva a ninguna parte es peor que ningún cartel. */
  return no('sin-forma-de-instalar');
}

/** Lo que se le dice a cada quien. Sin jerga y con los toques contados. */
export const QUE_HACER = {
  boton: {
    titulo: 'Tenla a mano',
    texto: 'Se instala como una app: abre más rápido, funciona sin conexión y puede avisarte.',
    accion: 'Instalar',
  },
  'ios-safari': {
    titulo: 'Añádela a tu pantalla de inicio',
    texto: 'Toca Compartir —el cuadrado con la flecha hacia arriba— y luego «Añadir a pantalla '
      + 'de inicio». En el iPhone es también la única forma de recibir recordatorios.',
    accion: null,      // en iOS no hay botón que valga: solo se explica
  },
  'ios-otro': {
    titulo: 'Ábrela en Safari',
    texto: 'Desde este navegador no se puede añadir a la pantalla de inicio. Toca los tres '
      + 'puntos y elige «Abrir en Safari»; allí sí, con Compartir → «Añadir a pantalla de inicio».',
    accion: null,
  },
};
