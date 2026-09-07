/* ─────────────────────────────────────────────────────────────
   PRESUMIR · la pantalla  ·  historias #91, #92, #93

   A la gente le gusta presumir, y de lo que lee es de las pocas
   formas de presumir que no molestan a nadie.

   PRIMERO SE VE, DESPUÉS SE COMPARTE. La vista previa no es un paso
   de más: nadie manda a Instagram una imagen que no ha visto, y si la
   app comparte directamente, la primera vez que salga fea se acabó la
   función para siempre.

   SOBRE INSTAGRAM, CON HONESTIDAD: desde la web no se puede abrir
   Instagram Stories con la imagen ya puesta —eso necesita la app
   nativa, que llega con Capacitor (#94)—. Lo que sí funciona hoy es
   la hoja de compartir del móvil, donde Instagram aparece como una
   opción más. Y en escritorio, descargar. Prometer el atajo nativo
   ahora sería prometer algo que no se puede cumplir.
   ───────────────────────────────────────────────────────────── */

import { drawCard, canvasToBlob } from './cardgen.js';
import { shareCaption, cardFilename, ANCHO, ALTO } from './cards-core.js';
import { myUsername } from './store.js';
import { petConfig, petFuente, petState } from './pet.js';
import { $, esc, toast, closeSheet, openSheet } from './ui.js';

let actual = null;      // { tipo, datos, blob }
let previa = null;      // la URL de la vista previa, para poder soltarla

/** ¿Se puede compartir un archivo desde este navegador? */
const puedeCompartirArchivos = () => Boolean(
  navigator.canShare && navigator.share
  && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }),
);

/**
 * Abrir la vista previa de una tarjeta.
 *
 * `tipo` es 'libro' | 'cita' | 'anio' | 'logro'.
 */
export async function openShare(tipo, datos = {}) {
  soltarPrevia();         // una tarjeta de dos megas por cada vez que se abre, no
  actual = { tipo, datos: { ...datos, username: myUsername() }, blob: null };
  openSheet('share-overlay');
  $('share-body').innerHTML = '<p class="planner-hint">Preparando la tarjeta…</p>';

  try {
    const cfg = petConfig();
    const cv = await drawCard(tipo, actual.datos, {
      pet: cfg.hidden ? null : petFuente(petState().mood, cfg),
    });
    if (!cv) { $('share-body').innerHTML = '<p class="planner-hint">No hay nada que compartir aquí.</p>'; return; }

    actual.blob = await canvasToBlob(cv);
    pintar(cv);
  } catch (e) {
    $('share-body').innerHTML = `<p class="planner-hint warn">${esc(e.message)}</p>`;
  }
}

function soltarPrevia() {
  if (previa) URL.revokeObjectURL(previa);
  previa = null;
}

export function closeShare(e) {
  if (e && e.target !== $('share-overlay')) return;
  closeSheet('share-overlay');
  soltarPrevia();
}

function pintar(cv) {
  previa = URL.createObjectURL(actual.blob);
  const url = previa;
  $('share-body').innerHTML = `
    <p class="planner-hint">Así se va a ver. ${ANCHO}×${ALTO}, el tamaño de una story.</p>
    <img class="share-preview" src="${url}" alt="Vista previa de la tarjeta" width="${ANCHO}" height="${ALTO}">
    ${puedeCompartirArchivos()
      ? `<button class="btn-magic full" onclick="shareCard()" style="margin-top:14px">
           Compartir
         </button>
         <p class="set-fineprint">Se abre el menú del móvil: ahí eliges Instagram, WhatsApp o lo que quieras.</p>`
      : `<p class="set-fineprint" style="margin-top:14px">
           Este navegador no comparte archivos. Descárgala y súbela desde la galería.
         </p>`}
    <button class="btn-ghost full" onclick="downloadCard()" style="margin-top:8px">
      ⤓ Descargar la imagen
    </button>`;
}

/**
 * Compartir de verdad.
 *
 * `navigator.share` con un archivo abre la hoja del sistema, donde
 * Instagram es una opción. Cancelar no es un error —es lo más normal
 * del mundo— y por eso no se enseña nada cuando pasa.
 */
export async function shareCard() {
  if (!actual?.blob) return;
  const { tipo, datos } = actual;
  const file = new File([actual.blob], cardFilename(tipo, datos), { type: 'image/png' });
  try {
    await navigator.share({ files: [file], text: shareCaption(tipo, datos) });
  } catch (e) {
    if (e?.name === 'AbortError') return;         // se arrepintió, y ya está
    toast('No se pudo compartir. Prueba a descargarla.', 'error');
  }
}

export function downloadCard() {
  if (!actual?.blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(actual.blob);
  a.download = cardFilename(actual.tipo, actual.datos);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Imagen descargada');
}
