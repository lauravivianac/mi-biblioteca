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

import { buscarSitios, olvidarSitios, dondeEstoy } from './lugares.js';
import {
  distanciaTexto, enlaceMapa, propuesta, MOTIVOS, CREDITO, PROPOSITOS,
  sePuedeReintentar,
} from './lugares-core.js';
import { tieneCiudad } from './place-core.js';
import { MAX_MENSAJE } from './chat-core.js';
import { myPlace } from './store.js';
import { $, esc, toast, openSheet, closeSheet } from './ui.js';

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

/** Para quedar con alguien: se abre desde la conversación. */
export const openLugares = () => abrir('quedar');

/** Para ir a leer o a comprar libros: se abre desde la Biblioteca. */
export const openDondeLeer = () => abrir('leer');

async function abrir(cual) {
  proposito = cual;
  ciudad = myPlace();
  grupos = [];
  aqui = null;
  detalle = '';
  const titulo = $('lugares-titulo');
  if (titulo) titulo.textContent = PROPOSITOS[proposito].titulo;
  openSheet('lugares-overlay');
  pintar();
  if (!tieneCiudad(ciudad)) { pintar('sin-ciudad'); return; }
  await cargar();
}

export const closeLugares = (e) => {
  if (!e || e.target === $('lugares-overlay')) closeSheet('lugares-overlay');
};

/** Volver a preguntar cuando el mapa estaba caído. */
export async function reintentarLugares() {
  if (!aqui && ciudad?.city) olvidarSitios(ciudad.city);
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
  const r = await buscarSitios(ciudad, { desdeAqui: aqui });
  cargando = false;
  grupos = r.grupos;
  detalle = r.detalle || '';
  pintar(r.motivo);
}

/* ── PANTALLA ────────────────────────────────────────────────── */

function pintar(motivo = null) {
  const cuerpo = $('lugares-body');
  if (!cuerpo) return;

  if (cargando) {
    cuerpo.innerHTML = `
      <div class="trabajo">
        <span class="trabajo-giro" aria-hidden="true"></span>
        <span class="trabajo-txt">${esc(aqui
    ? 'Buscando sitios cerca de ti…'
    : `Buscando sitios por ${ciudad?.city || 'tu ciudad'}…`)}</span>
      </div>
      <div class="trabajo-bar sin-fin"><i></i></div>`;
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
      ${motivo === 'sin-ciudad'
    ? '<button class="btn-magic full" style="margin-top:8px" onclick="openPlace()">Decir en qué ciudad estoy</button>'
    : ''}
      ${detalle ? `<p class="set-fineprint lugares-detalle">Detalle técnico: ${esc(detalle)}</p>` : ''}`;
    return;
  }

  const modo = PROPOSITOS[proposito];
  cuerpo.innerHTML = `
    <p class="planner-lede">${esc(aqui
    ? 'Cafeterías, librerías y bibliotecas cerca de donde estás.'
    : modo.lede(ciudad?.city || 'tu ciudad'))}</p>
    <p class="set-fineprint lugares-intro">${esc(modo.pie)}</p>
    ${modo.cercaDeMi ? cambiarDeCentro() : ''}
    ${grupos.map((g) => `
      <div class="prof-sec">
        <h4 class="prof-sec-title">${g.icono} ${esc(g.label)}</h4>
        ${g.lugares.map(fila).join('')}
      </div>`).join('')}
    <p class="set-fineprint">${esc(CREDITO)}</p>`;
}

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
