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
} from './lugares.js';
import {
  distanciaTexto, enlaceMapa, propuesta, MOTIVOS, CREDITO, PROPOSITOS,
  sePuedeReintentar, FOCOS, PESTANAS,
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
  cargar();
}

async function abrir(cual, cualFoco = 'todo') {
  proposito = cual;
  foco = proposito === 'quedar' ? 'todo' : cualFoco;
  ciudad = myPlace();
  grupos = [];
  aqui = null;
  detalle = '';
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
  olvidarDondeEstoy();
};

/** Volver a preguntar cuando el mapa estaba caído. */
export async function reintentarLugares() {
  /* Reintentar tiene que tirar lo cacheado, o «volver a intentarlo»
     vuelve a enseñar exactamente lo mismo sin preguntar nada. */
  if (aqui) olvidarDondeEstoy();
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

/** Volver a los sitios del centro, y olvidar tu posición. */
export async function volverAlCentro() {
  aqui = null;
  await cargar();
}

async function cargar() {
  if (cargando) return;
  cargando = true;
  pintar();
  const r = await buscarSitios(ciudad, { desdeAqui: aqui, foco });
  cargando = false;
  grupos = r.grupos;
  detalle = r.detalle || '';
  pintar(r.motivo);
}

/* ── PANTALLA ────────────────────────────────────────────────── */

function pintar(motivo = null) {
  const cuerpo = $('lugares-body');
  if (!cuerpo) return;

  if (situando || cargando) {
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
    cuerpo.innerHTML = `
      <p class="planner-hint">${esc(MOTIVOS[motivo] || MOTIVOS['sin-resultados'])}</p>
      ${sePuedeReintentar(motivo)
    ? '<button class="btn-ghost full" onclick="reintentarLugares()">Volver a intentarlo</button>'
    : ''}
      ${modoError.cercaDeMi && !aqui && motivo !== 'sin-ciudad'
    ? `<button class="btn-magic full" style="margin-top:8px" onclick="buscarCercaDeMi()">
         📍 Buscar cerca de donde estoy
       </button>` : ''}
      ${aqui && tieneCiudad(ciudad)
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
  cuerpo.innerHTML = `
    <p class="planner-lede">${esc(aqui
    ? 'Cafeterías, librerías y bibliotecas a un paseo de donde estás.'
    : modo.lede(ciudad?.city || 'tu ciudad'))}</p>
    <p class="set-fineprint lugares-intro">${esc(modo.pie)}</p>
    ${modo.cercaDeMi ? pestanas() : ''}
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
  if (aqui) return 'Buscando sitios cerca de ti…';
  return `Buscando sitios por ${ciudad?.city || 'tu ciudad'}…`;
};

/* Entrar por el atajo del café no puede dejarte encerrada en los cafés:
   aquí se cambia de idea sin volver a salir. */
const pestanas = () => `
  <div class="auth-tabs lugares-tabs">
    ${PESTANAS.map((p) => `
      <button class="auth-tab ${foco === p.id ? 'active' : ''}" onclick="verLugares('${p.id}')">
        ${esc(p.label)}
      </button>`).join('')}
  </div>`;

/* Un botón y no un interruptor permanente: pedir la ubicación es algo
   que se hace cuando hace falta, no un ajuste que se queda encendido. */
const cambiarDeCentro = () => (aqui
  ? `<button class="btn-ghost full" style="margin-bottom:14px" onclick="volverAlCentro()">
       Ver los del centro de ${esc(ciudad?.city || 'la ciudad')}
     </button>`
  : `<button class="btn-ghost full" style="margin-bottom:14px" onclick="buscarCercaDeMi()">
       📍 Buscar cerca de donde estoy
     </button>`);

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
