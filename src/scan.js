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

/** Enciende la cámara trasera. Devuelve el stream para pintarlo en un <video>. */
export async function openCamera() {
  if (stream) return stream;
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
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
export async function scanBarcode(video, { seconds = 15, onProgress = () => {} } = {}) {
  const detector = lectorNativo()
    ? new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'] })
    : null;
  const hasta = Date.now() + seconds * 1000;

  while (Date.now() < hasta) {
    if (detector) {
      try {
        const codes = await detector.detect(video);
        const hit = codes.find((c) => /^\d{8,13}$/.test(c.rawValue));
        if (hit) return hit.rawValue;
      } catch { /* la cámara aún no da un cuadro utilizable */ }
    } else {
      const codigo = readBarcodeFrame(video);
      if (codigo) return codigo;
    }
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

/**
 * Carga el motor de OCR solo cuando de verdad se usa: pesa varios
 * megas y la mayoría de libros se resuelven por código de barras.
 */
async function loadOcr() {
  if (tesseract) return tesseract;
  if (!window.Tesseract) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('No se pudo cargar el lector de texto.'));
      document.head.appendChild(s);
    });
  }
  tesseract = window.Tesseract;
  return tesseract;
}

/**
 * Extrae el texto de una imagen, en el dispositivo.
 *
 * Lo usan dos caminos: identificar una portada cuando no hay código
 * de barras, y capturar una cita de una página. En los dos, hacerlo
 * aquí y no en un servidor significa que las fotos de los libros de
 * nadie salen del teléfono.
 */
export async function readText(canvas, onProgress = () => {}) {
  const T = await loadOcr();
  const { data } = await T.recognize(canvas, 'spa+eng', {
    logger: (m) => { if (m.status === 'recognizing text') onProgress(m.progress); },
  });
  return (data?.text || '').trim();
}
