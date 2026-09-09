/* ─────────────────────────────────────────────────────────────
   DÓNDE LEER, COMPRAR Y QUEDAR · la pantalla  ·  historia #157

   La misma hoja sirve para dos cosas que se parecen y no son iguales:

     · QUEDAR con alguien para intercambiar un libro. Se abre desde la
       conversación, y elegir un sitio escribe la propuesta en la caja
       del chat.

     · IR A LEER O A COMPRAR LIBROS, que es cosa de una y de nadie más.
       Se abre desde la Biblioteca:

         «Quiero esa funcionalidad también para cuando quiera ir a leer
          a un cafesito: que me dé opciones, no solo para el intercambio
          de libros, sino saber dónde puedo leer y comprar libros.»

   La diferencia que importa no es el título: es que solo en el segundo
   se ofrece BUSCAR CERCA DE TI. Quedando, la lista acaba convertida en
   una propuesta que ve la otra persona, así que cuanto menos dependa de
   dónde estás, mejor. Leyendo no hay nadie al otro lado a quien
   contárselo.

   ELEGIR UN SITIO NO LO MANDA, cuando se está quedando. Deja la frase
   escrita en la caja del chat y ahí se queda: proponer un sitio para
   verse es una decisión, no un botón, y quien lo manda tiene que poder
   añadir la hora, el día, o pensárselo otra vez.
   ───────────────────────────────────────────────────────────── */

import {
  buscarSitios, olvidarSitios, dondeEstoy, permisoDeUbicacion, olvidarDondeEstoy,
  situarSitio, olvidarSitiosBuscados,
} from './lugares.js';
import {
  distanciaTexto, enlaceMapa, propuesta, textoMotivo, CREDITO, PROPOSITOS,
  sePuedeReintentar, FOCOS, PESTANAS, nombresDe, conMayuscula,
  DISTANCIAS, DISTANCIA_POR_DEFECTO, cercaniaTexto,
} from './lugares-core.js';
import { tieneCiudad } from './place-core.js';
import { MAX_MENSAJE } from './chat-core.js';
import { myPlace } from './store.js';
import { $, esc, toast, openSheet, closeSheet } from './ui.js';
import { ico } from './icons.js';

let grupos = [];
let ciudad = null;
let cargando = false;
let proposito = 'quedar';
/* Tu posición mientras la hoja está abierta, y NADA MÁS. No se guarda
   en el almacén, ni en los ajustes, ni en el servidor: se va con la
   hoja. Lo que no está guardado no se puede filtrar. */
let aqui = null;
/* Lo que dijo el servicio al fallar. Se enseña en letra pequeña: sin
   esto, lo unico que se puede contar de vuelta es «no funciona», y con
   eso no se arregla nada. */
let detalle = '';
/* A qué se entró: todo, cafés o librerías. Cada botón del margen abre
   lo suyo — un atajo que te deja delante de una lista donde todavía hay
   que buscar no es un atajo. */
let foco = 'todo';
/* Hasta dónde mirar alrededor de ti. Empieza en el paseo y lo cambia
   quien busca — el porqué está en lugares-core.js, junto a DISTANCIAS.
   Solo significa algo buscando cerca de ti: por el centro de la ciudad
   el radio lo decide la clase de sitio. */
let distancia = DISTANCIA_POR_DEFECTO;
/* EL BARRIO O EL SITIO QUE SE ESCRIBIÓ, si se escribió alguno.
   `{ texto, lat, lon, nombre }`. Manda sobre tu posición: si te has
   molestado en escribir dónde quieres buscar, es que quieres buscar
   ahí y no donde estás.
   Tampoco se guarda en el disco, y el porqué está en lugares.js: desde
   aquí no se sabe si lo escrito es un barrio o tu propia calle. */
let sitio = null;
/* Lo último que se escribió en la caja, para que siga ahí después de
   repintar. `pintar()` rehace el HTML entero, así que sin esto la caja
   se vaciaría sola en cuanto llegara la respuesta — y quien quisiera
   corregir una letra tendría que escribirlo todo otra vez. */
let escrito = '';
/* Mientras se busca el sitio escrito en el mapa. Es una espera distinta
   de la del mapa y de la del permiso, y por lo mismo: es lo único que
   hay en pantalla mientras dura. */
let situandoSitio = false;
/* Mientras el navegador tiene la ventana del permiso en pantalla. Es
   una espera distinta de la del mapa y tiene que decirlo: si mientras
   se pregunta «¿permites saber dónde estás?» debajo pone «buscando
   sitios por Bogotá», la ventana parece de otra cosa y se cierra. */
let situando = false;

/** Para quedar con alguien: se abre desde la conversación. */
export const openLugares = () => abrir('quedar');

/** Los tres caminos de «salir de casa». Los dos primeros son los
    botones del margen; el tercero, el de la Biblioteca. */
export const openDondeTomarCafe = () => abrir('leer', 'cafe');
export const openDondeComprar = () => abrir('leer', 'comprar');
export const openDondeLeer = () => abrir('leer', 'todo');

/** Cambiar de idea sin salir de la hoja. */
export function verLugares(cual) {
  foco = cual;
  const titulo = $('lugares-titulo');
  if (titulo) titulo.textContent = FOCOS[foco]?.titulo || FOCOS.todo.titulo;
  /* Se DEVUELVE la promesa. Al `onclick` le da igual, pero sin esto no
     hay forma de esperar a que termine —ni desde una prueba ni desde
     ningún sitio— y lo que no se puede esperar solo se puede comprobar
     con suerte. */
  return cargar();
}

async function abrir(cual, cualFoco = 'todo') {
  proposito = cual;
  foco = proposito === 'quedar' ? 'todo' : cualFoco;
  ciudad = myPlace();
  grupos = [];
  aqui = null;
  detalle = '';
  sitio = null;
  escrito = '';
  /* Al abrir se vuelve al paseo: ampliar a 8 km es una consulta cara y
     una decisión de ese momento, no un ajuste que se queda puesto. */
  distancia = DISTANCIA_POR_DEFECTO;
  const titulo = $('lugares-titulo');
  if (titulo) {
    titulo.textContent = proposito === 'quedar'
      ? PROPOSITOS.quedar.titulo
      : (FOCOS[foco]?.titulo || FOCOS.todo.titulo);
  }
  openSheet('lugares-overlay');
  pintar();

  /* PRIMERO DÓNDE ESTÁS, Y DESPUÉS LA CIUDAD.
     ─────────────────────────────────────────

       «No me está pidiendo acceso a mi ubicación para buscar las
        cafeterías ni las tiendas. Debería funcionar de esa forma, así
        no me da todas las cafeterías de Bogotá.»

     Y tenía razón en las dos mitades de la frase. El permiso estaba
     detrás de un botón dentro de la hoja, o sea que el primer resultado
     —el único que mucha gente va a ver— eran siempre los sitios del
     centro. En un pueblo eso da igual. En Bogotá el centro está a hora
     y media de casi todo el mundo, y una lista de cafés del centro no
     es una respuesta a «dónde me tomo un café»: es una lista de sitios
     a los que no vas a ir.

     Buscar cerca de ti es LO NORMAL cuando se busca dónde leer, así que
     se pide al abrir. Se sigue pidiendo solo aquí y nunca al arrancar
     la app, y quedando con alguien no se pide nunca —eso lo decide
     `cercaDeMi` en `PROPOSITOS`, y el porqué está en lugares-core.js.

     Si dice que no, o si el teléfono no sabe situarse, se cae a los del
     centro sin ruido y sin bloquear nada: era lo único que había antes,
     así que perder el permiso no puede dejar la hoja peor que estaba. */
  if (PROPOSITOS[proposito].cercaDeMi && await mereceLaPenaPreguntar()) {
    situando = true;
    pintar();
    try { aqui = await dondeEstoy(); } catch { aqui = null; }
    situando = false;
  }

  /* La ciudad solo hace falta si NO sabemos dónde estás. Antes se
     miraba antes de nada, y eso dejaba fuera de los cafés a quien no
     había puesto su ciudad aunque el teléfono supiera perfectamente
     dónde estaba. */
  if (!aqui && !tieneCiudad(ciudad)) { pintar('sin-ciudad'); return; }
  await cargar();
}

/* No preguntar cuando ya sabemos la respuesta: con el permiso denegado,
   `getCurrentPosition` no enseña ninguna ventana —el navegador contesta
   que no por su cuenta— y lo único que se consigue es esperar. */
async function mereceLaPenaPreguntar() {
  return (await permisoDeUbicacion()) !== 'denied';
}

export const closeLugares = (e) => {
  if (e && e.target !== $('lugares-overlay')) return;
  closeSheet('lugares-overlay');
  /* Al cerrar, tu posición se va con la hoja: la variable de aquí y la
     lista que se recordó en lugares.js. Es la promesa que hace el pie
     de la pantalla mientras se pide el permiso, y una promesa así se
     cumple borrando, no diciéndolo. */
  aqui = null;
  sitio = null;
  escrito = '';
  olvidarDondeEstoy();
  /* Y lo que se escribió también se va, por la misma razón y con más
     motivo: desde aquí no se sabe si era un barrio o tu propia calle. */
  olvidarSitiosBuscados();
  /* Y la búsqueda que iba de camino deja de mandar: si no, al volver
     pintaría sobre una hoja cerrada, y la siguiente vez que se abriera
     se encontraría un «cargando» que ya no carga nada. */
  cargaActual += 1;
  cargando = false;
};

/** Volver a preguntar cuando el mapa estaba caído. */
export async function reintentarLugares() {
  /* Lo que falló fue SITUAR EL SITIO que se escribió, así que reintentar
     es volver a situarlo. Sin esto, «volver a intentarlo» buscaría
     alrededor del centro de antes y el barrio escrito se quedaría sin
     estrenar, con la caja llena y sin que pasara nada. */
  if (escrito && !sitio) { await buscarPorSitio(escrito); return; }

  /* Reintentar tiene que tirar lo cacheado, o «volver a intentarlo»
     vuelve a enseñar exactamente lo mismo sin preguntar nada. */
  if (aqui || sitio) olvidarDondeEstoy();
  else if (ciudad?.city) olvidarSitios(ciudad.city);
  await cargar();
}

/**
 * Buscar alrededor de donde estás.
 *
 * El permiso se pide AQUÍ y no al abrir la app: quien no toque este
 * botón no ve nunca la ventana del navegador pidiendo la ubicación, y
 * la hoja funciona igual sin ella.
 */
export async function buscarCercaDeMi() {
  if (cargando) return;
  cargando = true;
  pintar();
  try {
    aqui = await dondeEstoy();
  } catch (e) {
    cargando = false;
    aqui = null;
    toast(e?.message === 'permiso-denegado'
      ? 'Sin permiso de ubicación. Se siguen viendo los sitios del centro.'
      : 'No hemos podido saber dónde estás. Se siguen viendo los del centro.', 'error');
    pintar();
    return;
  }
  cargando = false;
  await cargar();
}

/**
 * Buscar por un barrio, una calle o un sitio escrito a mano.
 *
 *   «Me gustaría que las personas pudieran decidir dónde buscar:
 *    ponerle un sitio, un barrio, o decir cerca mío.»
 *
 * Es el tercer centro posible, y el único que no elige la app: ni tu
 * ciudad ni el GPS sirven para «voy a estar por Chapinero el sábado».
 *
 * Manda sobre tu posición mientras esté puesto — quien se molesta en
 * escribir dónde quiere buscar, quiere buscar ahí.
 */
export async function buscarPorSitio(texto) {
  const q = String(texto ?? '').trim();
  if (!q) { toast('Escribe un barrio, una calle o un sitio.', 'error'); return; }

  situandoSitio = true;
  escrito = q;
  pintar();

  let punto;
  try {
    punto = await situarSitio(q, ciudad || {});
  } catch (e) {
    situandoSitio = false;
    /* «No pudimos preguntar» y «no existe» son cosas distintas y se
       arreglan de forma distinta: una volviendo a intentarlo y la otra
       escribiéndolo de otra forma. */
    detalle = String(e?.message || e);
    pintar('sitio-caido');
    return;
  }
  situandoSitio = false;

  if (!punto) { pintar('sitio-desconocido'); return; }

  sitio = { texto: q, ...punto };
  /* Tu posición se suelta al buscar por un sitio: no se está usando
     para nada y lo que no hace falta no se guarda. */
  aqui = null;
  await cargar();
}

/** Quitar el sitio escrito y volver a lo de antes. */
export async function quitarSitio() {
  sitio = null;
  escrito = '';
  await cargar();
}

/** Volver a los sitios del centro, y olvidar tu posición y el sitio. */
export async function volverAlCentro() {
  aqui = null;
  sitio = null;
  escrito = '';
  await cargar();
}

/**
 * El punto alrededor del cual se busca, y cómo se llama en una frase.
 *
 * Tres, y en este orden: lo que escribiste, dónde estás, y el centro de
 * tu ciudad. El orden es el de cuánto lo has elegido tú.
 */
function centroElegido() {
  if (sitio) return { punto: { lat: sitio.lat, lon: sitio.lon }, desde: 'sitio', nombre: sitio.nombre || sitio.texto };
  if (aqui) return { punto: aqui, desde: 'ti', nombre: 'donde estás' };
  return { punto: null, desde: 'centro', nombre: `el centro de ${ciudad?.city || 'tu ciudad'}` };
}

/**
 * Hasta dónde mirar.
 *
 * Cambiar la distancia es OTRA búsqueda, no un filtro de la que ya está:
 * los sitios de 8 km no estaban en la respuesta de 1,2 km, así que
 * recortar la lista de antes solo podría enseñar menos. Se vuelve a
 * preguntar, y `lugares.js` guarda cada radio por separado para que ir
 * y volver entre dos distancias no pregunte dos veces por lo mismo.
 */
export async function verHasta(cual) {
  if (cual === distancia) return;
  distancia = cual;
  await cargar();
}

/* CUÁL DE LAS BÚSQUEDAS MANDA.
   ────────────────────────────
   Antes esto era `if (cargando) return`, y eso hacía dos cosas malas a
   la vez. La de fuera: cerrar la hoja mientras buscaba y volver a
   abrirla no buscaba nada —había una búsqueda en marcha, así que la
   nueva se descartaba— y quedaba una ruedecita eterna que acababa
   enseñando la lista de la vez anterior. La de dentro: cambiar de
   pestaña o de distancia mientras cargaba tampoco hacía nada.

   La respuesta correcta no es «no dejar empezar otra»: es que la
   ÚLTIMA es la que manda. Cada búsqueda se lleva su número y, al
   volver, la que ya no es la última se calla y no pinta. */
let cargaActual = 0;

async function cargar() {
  const mia = cargaActual + 1;
  cargaActual = mia;
  cargando = true;
  pintar();
  /* El centro puede ser lo que escribiste, dónde estás o el de tu
     ciudad. Los dos primeros son «un punto y ya», que es justo lo que
     `desdeAqui` significa aquí abajo: busca alrededor de ESTO, con el
     radio que se haya elegido, y no lo guardes en el disco. */
  const { punto } = centroElegido();
  const r = await buscarSitios(ciudad, { desdeAqui: punto, foco, distancia });
  /* Llegó tarde: mientras iba, se cambió de pestaña, de distancia, o se
     cerró la hoja. Pintar ahora sería enseñar la respuesta a una
     pregunta que ya nadie hizo. */
  if (mia !== cargaActual) return;
  cargando = false;
  grupos = r.grupos;
  detalle = r.detalle || '';
  pintar(r.motivo);
}

/* ── PANTALLA ────────────────────────────────────────────────── */

function pintar(motivo = null) {
  const cuerpo = $('lugares-body');
  if (!cuerpo) return;

  if (situando || situandoSitio || cargando) {
    cuerpo.innerHTML = `
      <div class="trabajo">
        <span class="trabajo-giro" aria-hidden="true"></span>
        <span class="trabajo-txt">${esc(esperando())}</span>
      </div>
      <div class="trabajo-bar sin-fin"><i></i></div>
      ${situando ? '<p class="set-fineprint lugares-intro">Solo mientras esta hoja está abierta. No se guarda en ningún sitio.</p>' : ''}`;
    return;
  }

  if (motivo) {
    /* AQUÍ SE ESCONDÍA LA SALIDA. La pantalla de error solo ofrecía
       «volver a intentarlo», y se llevaba por delante el botón de
       buscar cerca de ti — que es justo el camino que NO pasa por el
       servicio que acaba de fallar cuando lo que falla es situar la
       ciudad. O sea que la única alternativa que podía funcionar
       desaparecía exactamente cuando hacía falta.

       «No hay nada cartografiado» sigue sin tener arreglo, así que ahí
       no se ofrece reintentar: un botón que no puede cambiar nada es
       peor que ninguno. */
    const modoError = PROPOSITOS[proposito];
    const { punto, nombre } = centroElegido();
    cuerpo.innerHTML = `
      <p class="planner-hint">${esc(textoMotivo(motivo, foco, distancia, nombre))}</p>
      ${/* Que no salga nada NO puede dejar sin la caja de buscar: si
            «Chapinero» no existe, lo que hace falta es poder escribir
            otra cosa, no un botón de reintentar lo mismo. */''}
      ${modoError.cercaDeMi && motivo !== 'sin-ciudad' ? cajaDeSitio() : ''}
      ${/* Buscando alrededor de un punto, «no hay nada» casi nunca es el
            final: casi siempre es que el círculo era pequeño. Ofrecer
            ampliar aquí es más útil que reintentar lo mismo. */''}
      ${punto && motivo === 'sin-resultados-cerca' ? distanciasChips() : ''}
      ${sePuedeReintentar(motivo)
    ? '<button class="btn-ghost full" onclick="reintentarLugares()">Volver a intentarlo</button>'
    : ''}
      ${modoError.cercaDeMi && !aqui && motivo !== 'sin-ciudad'
    ? `<button class="btn-magic full" style="margin-top:8px" onclick="buscarCercaDeMi()">
         📍 Buscar cerca de donde estoy
       </button>` : ''}
      ${punto && tieneCiudad(ciudad)
    ? `<button class="btn-magic full" style="margin-top:8px" onclick="volverAlCentro()">
         Ver los del centro de ${esc(ciudad.city)}
       </button>` : ''}
      ${motivo === 'sin-ciudad'
    ? '<button class="btn-magic full" style="margin-top:8px" onclick="openPlace()">Decir en qué ciudad estoy</button>'
    : ''}
      ${detalle ? `<p class="set-fineprint lugares-detalle">Detalle técnico: ${esc(detalle)}</p>` : ''}`;
    return;
  }

  const modo = PROPOSITOS[proposito];
  const { punto, nombre } = centroElegido();
  cuerpo.innerHTML = `
    <p class="planner-lede">${esc(punto
    ? `${conMayuscula(nombresDe(foco))} ${cercaniaTexto(distancia, nombre)}.`
    : modo.lede(ciudad?.city || 'tu ciudad', foco))}</p>
    <p class="set-fineprint lugares-intro">${esc(modo.pie)}</p>
    ${modo.cercaDeMi ? pestanas() : ''}
    ${modo.cercaDeMi ? cajaDeSitio() : ''}
    ${punto ? distanciasChips() : ''}
    ${modo.cercaDeMi ? cambiarDeCentro() : ''}
    ${grupos.map((g) => `
      <div class="prof-sec">
        <h4 class="prof-sec-title">${ico(g.icono, 'ico-sm')} ${esc(g.label)}</h4>
        ${g.lugares.map(fila).join('')}
      </div>`).join('')}
    <p class="set-fineprint">${esc(CREDITO)}</p>`;
}

/* Tres esperas y no una, porque son tres cosas y la de en medio es la
   única en la que hay que hacer algo: contestar a la ventana del
   navegador. Un «cargando…» genérico ahí deja la ventana del permiso
   pareciendo un aviso de otra cosa. */
const esperando = () => {
  if (situando) return 'Mirando dónde estás…';
  if (situandoSitio) return `Buscando «${escrito}» en el mapa…`;
  /* «Buscando sitios» era demasiado vago para el único momento en que
     el texto es lo ÚNICO que hay en pantalla. Si se entró por la taza,
     que diga cafeterías. */
  const que = proposito === 'quedar' ? 'sitios' : nombresDe(foco);
  if (sitio) return `Buscando ${que} por ${sitio.nombre || sitio.texto}…`;
  if (aqui) return `Buscando ${que} cerca de ti…`;
  return `Buscando ${que} por ${ciudad?.city || 'tu ciudad'}…`;
};

/* ── DECIR DÓNDE BUSCAR ──────────────────────────────────────
   Tres caminos, y el orden en pantalla es el de cuánto los eliges tú:
   escribir un barrio, decir «cerca de mí», o el centro de tu ciudad.

   La caja va ARRIBA del todo, encima de las distancias, porque primero
   se decide dónde y luego hasta dónde. Al revés no se entiende: un
   «8 km» solo significa algo cuando ya sabes 8 km de qué.

   El valor se vuelve a poner en cada repintado —`pintar()` rehace el
   HTML entero— o la caja se vaciaría sola en cuanto llegara la
   respuesta, y corregir una letra obligaría a escribirlo todo otra
   vez. */
const cajaDeSitio = () => `
  <div class="lugares-donde">
    <div class="lugares-donde-caja">
      <input class="finput" id="lugares-sitio" autocomplete="off" enterkeyhint="search"
             placeholder="Un barrio, una calle, un sitio…"
             aria-label="Dónde quieres buscar"
             value="${esc(escrito)}"
             onkeydown="if(event.key==='Enter'){event.preventDefault();buscarPorSitio(this.value)}">
      <button class="btn-mini" onclick="buscarPorSitio(document.getElementById('lugares-sitio').value)">
        Buscar
      </button>
    </div>
    ${sitio ? `
      <p class="set-fineprint lugares-donde-pie">
        Buscando por ${esc(sitio.nombre || sitio.texto)}.
        <button class="lugares-quitar" onclick="quitarSitio()">Quitar</button>
      </p>` : `
      <p class="set-fineprint lugares-donde-pie">
        No se guarda: vive mientras esta hoja está abierta.
      </p>`}
  </div>`;

/* Entrar por el atajo del café no puede dejarte encerrada en los cafés:
   aquí se cambia de idea sin volver a salir. */
const pestanas = () => `
  <div class="auth-tabs lugares-tabs">
    ${PESTANAS.map((p) => `
      <button class="auth-tab ${foco === p.id ? 'active' : ''}" onclick="verLugares('${p.id}')">
        ${esc(p.label)}
      </button>`).join('')}
  </div>`;

/* HASTA DÓNDE MIRAR, y solo cuando hay un «dónde estás» que ampliar.
   Por el centro de la ciudad el radio lo decide la clase de sitio —de
   bibliotecas hay tres y de cafeterías seiscientas— y enseñar aquí un
   control que no manda sobre eso sería mentir con tres botones.

   Cada uno dice sus metros: ampliar tiene un precio —la consulta es más
   grande y tarda más— y quien lo toca merece saber cuánto está pidiendo
   antes de esperar. */
const distanciasChips = () => `
  <div class="auth-tabs lugares-lejos">
    ${DISTANCIAS.map((d) => `
      <button class="auth-tab ${distancia === d.id ? 'active' : ''}"
              aria-pressed="${distancia === d.id}"
              onclick="verHasta('${esc(d.id)}')">
        ${esc(d.label)} <span class="lugares-lejos-km">${esc(d.sub)}</span>
      </button>`).join('')}
  </div>`;

/* Un botón y no un interruptor permanente: pedir la ubicación es algo
   que se hace cuando hace falta, no un ajuste que se queda encendido.

   Se enseña lo que NO estás viendo ya: buscando por un barrio escrito
   caben los dos —cerca de ti y el centro—, y estando en uno de esos
   dos sobra el que ya estás mirando. Un botón que te lleva donde ya
   estás no es una salida, es ruido. */
const cambiarDeCentro = () => {
  const { punto } = centroElegido();
  return `
    ${!aqui ? `
      <button class="btn-ghost full" style="margin-bottom:14px" onclick="buscarCercaDeMi()">
        📍 Buscar cerca de donde estoy
      </button>` : ''}
    ${punto && tieneCiudad(ciudad) ? `
      <button class="btn-ghost full" style="margin-bottom:14px" onclick="volverAlCentro()">
        Ver los del centro de ${esc(ciudad.city)}
      </button>` : ''}`;
};

function fila(l) {
  const desde = aqui ? 'ti' : 'centro';
  return `
    <div class="sitio">
      <button class="sitio-elegir" onclick="elegirLugar('${esc(l.id)}')">
        <span class="sitio-nombre">${esc(l.nombre)}</span>
        <span class="sitio-datos">${esc([l.calle, distanciaTexto(l.km, desde)].filter(Boolean).join(' · '))}</span>
        ${l.horario ? `<span class="sitio-horario">${esc(l.horario)}</span>` : ''}
      </button>
      <a class="btn-mini" href="${esc(enlaceMapa(l))}" target="_blank" rel="noopener noreferrer">Mapa</a>
    </div>`;
}

/**
 * Tocar un sitio.
 *
 * Quedando, la frase va a la caja del chat. Buscando dónde leer no hay
 * ninguna caja, así que se abre el mapa — que es lo único que se puede
 * querer hacer con un café cuando no hay nadie esperando una propuesta.
 */
export function elegirLugar(id) {
  const l = grupos.flatMap((g) => g.lugares).find((x) => x.id === id);
  if (!l) return;

  const campo = $('chat-texto');
  if (proposito !== 'quedar' || !campo) {
    window.open(enlaceMapa(l), '_blank', 'noopener,noreferrer');
    return;
  }

  campo.value = propuesta(l, { max: MAX_MENSAJE });
  closeSheet('lugares-overlay');
  campo.focus();
  /* El cursor al final, para poder seguir escribiendo la hora sin tener
     que colocarlo a mano. */
  campo.setSelectionRange(campo.value.length, campo.value.length);
  toast('Propuesta escrita. Añade la hora y dale a Enviar.');
}
