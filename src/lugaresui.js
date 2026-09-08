/* ─────────────────────────────────────────────────────────────
   DÓNDE QUEDAR · la pantalla  ·  historia #157

   Se abre desde el chat, que es donde se acuerda el encuentro, y desde
   la hoja de seguridad, que es donde ya se decía qué CLASE de sitio
   sirve. Aquí se dice cuál, con nombre.

   ELEGIR UN SITIO NO LO MANDA. Deja la frase escrita en la caja del
   chat y ahí se queda: proponer un sitio para verse es una decisión,
   no un botón, y quien lo manda tiene que poder añadir la hora, el
   día, o pensárselo otra vez. Un botón que manda solo convierte un
   toque curioso en un compromiso.
   ───────────────────────────────────────────────────────────── */

import { buscarSitios, olvidarSitios } from './lugares.js';
import {
  distanciaTexto, enlaceMapa, propuesta, MOTIVOS, CREDITO,
} from './lugares-core.js';
import { tieneCiudad } from './place-core.js';
import { MAX_MENSAJE } from './chat-core.js';
import { myPlace } from './store.js';
import { $, esc, toast, openSheet, closeSheet } from './ui.js';

let grupos = [];
let ciudad = null;
let cargando = false;

/** Abre la hoja y busca los sitios de tu ciudad. */
export async function openLugares() {
  ciudad = myPlace();
  grupos = [];
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
  if (ciudad?.city) olvidarSitios(ciudad.city);
  await cargar();
}

async function cargar() {
  if (cargando) return;
  cargando = true;
  pintar();
  const r = await buscarSitios(ciudad);
  cargando = false;
  grupos = r.grupos;
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
        <span class="trabajo-txt">Buscando sitios por ${esc(ciudad?.city || 'tu ciudad')}…</span>
      </div>
      <div class="trabajo-bar sin-fin"><i></i></div>`;
    return;
  }

  if (motivo) {
    /* «El mapa no contesta» tiene arreglo —volver a intentarlo— y «no
       hay nada cartografiado» no lo tiene. Solo se ofrece el botón
       donde sirve de algo. */
    const sePuedeReintentar = motivo === 'servicio-caido';
    cuerpo.innerHTML = `
      <p class="planner-hint">${esc(MOTIVOS[motivo] || MOTIVOS['sin-resultados'])}</p>
      ${sePuedeReintentar
    ? '<button class="btn-ghost full" onclick="reintentarLugares()">Volver a intentarlo</button>'
    : ''}
      ${motivo === 'sin-ciudad'
    ? '<button class="btn-magic full" style="margin-top:8px" onclick="openPlace()">Decir en qué ciudad estoy</button>'
    : ''}`;
    return;
  }

  cuerpo.innerHTML = `
    <p class="planner-lede">Sitios públicos por el centro de ${esc(ciudad?.city || '')}.</p>
    <p class="set-fineprint lugares-intro">
      Toca uno y se escribe la propuesta en la conversación. No se manda
      hasta que le des a Enviar.
    </p>
    ${grupos.map((g) => `
      <div class="prof-sec">
        <h4 class="prof-sec-title">${g.icono} ${esc(g.label)}</h4>
        ${g.lugares.map(fila).join('')}
      </div>`).join('')}
    <p class="set-fineprint">${esc(CREDITO)}</p>`;
}

function fila(l) {
  return `
    <div class="sitio">
      <button class="sitio-elegir" onclick="elegirLugar('${esc(l.id)}')">
        <span class="sitio-nombre">${esc(l.nombre)}</span>
        <span class="sitio-datos">${esc([l.calle, distanciaTexto(l.km)].filter(Boolean).join(' · '))}</span>
        ${l.horario ? `<span class="sitio-horario">${esc(l.horario)}</span>` : ''}
      </button>
      <a class="btn-mini" href="${esc(enlaceMapa(l))}" target="_blank" rel="noopener noreferrer">Mapa</a>
    </div>`;
}

/**
 * Elegir un sitio: la frase va a la caja de escribir del chat.
 *
 * Si la hoja se abrió desde la de seguridad y no hay chat abierto
 * detrás, no hay dónde escribir — y entonces se dice, en vez de que el
 * toque no haga nada.
 */
export function elegirLugar(id) {
  const l = grupos.flatMap((g) => g.lugares).find((x) => x.id === id);
  if (!l) return;

  const campo = $('chat-texto');
  if (!campo) {
    toast('Abre la conversación con esa persona para proponerle el sitio');
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
