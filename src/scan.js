/* ─────────────────────────────────────────────────────────────
   CÁMARA  ·  historia #25

   Dos modos en la misma pantalla, sin obligar a elegir de antemano:
   el código de barras cuando el libro lo tiene, y la foto de la
   portada cuando no — que es el caso de muchas ediciones viejas y
   latinoamericanas. Con solo el escáner, esas quedarían fuera.
   ───────────────────────────────────────────────────────────── */

import { decodeImage } from './ean.js';

let stream = null;

/* El lector del navegador. No existe en Safari de iPhone, y por eso
   hay uno propio en ean.js: el botón ya no depende de con qué móvil
   entres, así que la pantalla tampoco pregunta. */
const lectorNativo = () => 'BarcodeDetector' in window;

/**
 * Enciende la cámara trasera. Devuelve el stream para pintarlo en un <video>.
 *
 * MÁS RESOLUCIÓN Y ENFOQUE CONTINUO, y las dos cosas por lo mismo: un
 * código de barras de un libro mide unos cuatro centímetros, y a la
 * distancia a la que uno sostiene un libro ocupa una franja pequeña
 * del cuadro. Con 1280 de ancho, las barras finas caen en uno o dos
 * píxeles y cualquier desenfoque las funde entre sí. Se pide 1920 —y
 * si el teléfono no puede, `ideal` deja que dé lo que tenga: no es un
 * requisito, es una preferencia.
 *
 * `focusMode: continuous` va dentro de `advanced`, que es la parte de
 * la norma que los navegadores pueden IGNORAR en silencio en vez de
 * fallar. Justo lo que se quiere aquí: donde exista, la cámara
 * reenfoca sola cuando acercas el libro; donde no, todo lo demás
 * sigue funcionando igual.
 */
export async function openCamera() {
  if (stream) return stream;
  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      advanced: [{ focusMode: 'continuous' }],
    },
    audio: false,
  });
  return stream;
}

export function closeCamera() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

/**
 * Busca un código de barras en el vídeo, reintentando mientras la
 * cámara enfoca. Devuelve el ISBN o null si se agota el tiempo.
 *
 * Dos lectores: el del navegador cuando existe, porque es nativo y
 * rápido, y el nuestro cuando no —que es el caso de Safari de iPhone,
 * donde antes este camino sencillamente no funcionaba.
 *
 * `onProgress` recibe cuánto queda, para que la espera no parezca que
 * la app se colgó.
 */
export async function scanBarcode(video, {
  seconds = 15, seguir = () => true, onProgress = () => {},
} = {}) {
  const detector = lectorNativo()
    ? new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'] })
    : null;
  const hasta = Number.isFinite(seconds) ? Date.now() + seconds * 1000 : Infinity;

  while (seguir() && Date.now() < hasta) {
    /* LOS DOS LECTORES EN CADA PASADA, y antes era uno u otro. Donde
       existe `BarcodeDetector` el nuestro no se probaba nunca, así que
       un cuadro que el del navegador no saca —y es exigente con el
       ángulo y el brillo— se perdía aunque el nuestro lo hubiera
       sacado. Probar los dos cuesta unos milisegundos por pasada y no
       cuesta nada más: los dos exigen el dígito de control, así que
       ninguno puede acertar por casualidad.

       (El decodificador propio está medido: con el código dibujado a
       módulo de 1 px, con ruido y desenfocado, sigue acertando. Lo que
       fallaba no era leer, era mirar.) */
    if (detector) {
      try {
        const codes = await detector.detect(video);
        const hit = codes.find((c) => /^\d{8,13}$/.test(c.rawValue));
        if (hit) return hit.rawValue;
      } catch { /* la cámara aún no da un cuadro utilizable */ }
    }
    const nuestro = readBarcodeFrame(video);
    if (nuestro) return nuestro;

    onProgress(Number.isFinite(hasta) ? Math.max(0, (hasta - Date.now()) / 1000) : Infinity);
    await new Promise((r) => setTimeout(r, 220));
  }
  return null;
}

/* ── LEER UN QR DE PERFIL  ·  historia #48 ───────────────────
   Aquí NO hay lector propio de repuesto, y conviene decirlo claro.

   Escribir un código QR cabe en un fichero (ver qr-core.js): es un
   algoritmo cerrado. LEERLO es otra cosa —hay que binarizar la imagen,
   encontrar los ojos, enderezar la perspectiva y corregir errores—, y
   eso no se sostiene con las manos.

   Así que se usa el lector del navegador cuando existe, que es en
   Android y en escritorio. En el Safari del iPhone no existe, y ahí la
   pantalla lo dice y ofrece el otro camino, que es pegar el link. Es
   mejor que un botón que no hace nada. */
export const puedeLeerQr = () => lectorNativo();

export async function scanQr(video, { seconds = 20, onProgress = () => {} } = {}) {
  if (!lectorNativo()) return null;
  const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
  const hasta = Date.now() + seconds * 1000;

  while (Date.now() < hasta) {
    try {
      const codes = await detector.detect(video);
      if (codes.length && codes[0].rawValue) return codes[0].rawValue;
    } catch { /* la cámara aún no da un cuadro utilizable */ }
    onProgress(Math.max(0, (hasta - Date.now()) / 1000));
    await new Promise((r) => setTimeout(r, 220));
  }
  return null;
}

/**
 * Un intento sobre el cuadro actual, con nuestro lector.
 *
 * Solo se mira la banda central del vídeo —donde está el marco que se
 * le pinta a la usuaria—: reduce el trabajo y evita que el texto de
 * la contraportada estropee el barrido.
 */
export function readBarcodeFrame(video) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;

  const bandaAlto = Math.round(h * 0.4);
  const y0 = Math.round((h - bandaAlto) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = bandaAlto;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, y0, w, bandaAlto, 0, 0, w, bandaAlto);

  const { data } = ctx.getImageData(0, 0, w, bandaAlto);
  return decodeImage(data, w, bandaAlto);
}

/** Congela un cuadro del vídeo. Sirve de portada si no se encuentra otra. */
export function grabFrame(video, maxWidth = 900) {
  const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
  const canvas = document.createElement('canvas');
  canvas.width = (video.videoWidth || maxWidth) * scale;
  canvas.height = (video.videoHeight || maxWidth) * scale;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export const frameToDataUrl = (canvas) => canvas.toDataURL('image/jpeg', 0.82);

/* ── LECTURA DEL TEXTO DE LA PORTADA ─────────────────────────── */

let tesseract = null;

/* Cuánto se espera al motor antes de dar la descarga por perdida. No
   es capricho: sin esto, una red que ni contesta ni falla —el wifi de
   un café, unos datos con un solo palo— deja la pantalla diciendo
   «leyendo la portada…» PARA SIEMPRE, y quien mira concluye,
   razonablemente, que la foto no se tomó. */
const ESPERA_MOTOR = 25000;

/**
 * Carga el motor de OCR solo cuando de verdad se usa: pesa varios
 * megas y la mayoría de libros se resuelven por código de barras.
 */
async function loadOcr() {
  if (tesseract) return tesseract;
  if (!window.Tesseract) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      const tarde = setTimeout(() => {
        s.remove();
        reject(new Error('El lector de texto tarda demasiado en llegar.'));
      }, ESPERA_MOTOR);
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = () => { clearTimeout(tarde); resolve(); };
      s.onerror = () => {
        clearTimeout(tarde);
        reject(new Error('No se pudo cargar el lector de texto.'));
      };
      document.head.appendChild(s);
    });
  }
  tesseract = window.Tesseract;
  return tesseract;
}

/* LAS FASES, EN CASTELLANO Y DICIENDO LA VERDAD.

   Antes solo se avisaba de la última —«recognizing text»— y resulta
   que es la más rápida. Lo que tarda de verdad es traer el motor y,
   sobre todo, el diccionario del idioma: son varios megas y en datos
   móviles puede ser medio minuto. Todo eso pasaba en silencio absoluto
   detrás de un «Leyendo la portada…» que no se movía, y un texto que
   no se mueve durante treinta segundos no parece que esté trabajando:
   parece que no pasó nada. */
const FASES = {
  'loading tesseract core': 'Preparando el lector…',
  'initializing tesseract': 'Preparando el lector…',
  'loading language traineddata': 'Descargando el idioma (solo la primera vez)…',
  'initializing api': 'Casi listo…',
  'recognizing text': 'Leyendo la portada…',
};

/**
 * Extrae el texto de una imagen, en el dispositivo.
 *
 * Lo usan dos caminos: identificar una portada cuando no hay código
 * de barras, y capturar una cita de una página. En los dos, hacerlo
 * aquí y no en un servidor significa que las fotos de los libros de
 * nadie salen del teléfono.
 *
 * `alAvanzar` recibe `(fracción, frase)` en CADA fase, no solo en la
 * última.
 */
export async function readText(canvas, alAvanzar = () => {}) {
  alAvanzar(0, 'Preparando el lector…');
  const T = await loadOcr();
  const { data } = await T.recognize(canvas, 'spa+eng', {
    logger: (m) => {
      const frase = FASES[m.status];
      if (frase) alAvanzar(Number(m.progress) || 0, frase);
    },
  });
  return (data?.text || '').trim();
}
