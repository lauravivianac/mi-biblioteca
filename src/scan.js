/* ─────────────────────────────────────────────────────────────
   CÁMARA  ·  historia #25

   Dos modos en la misma pantalla, sin obligar a elegir de antemano:
   el código de barras cuando el libro lo tiene, y la foto de la
   portada cuando no — que es el caso de muchas ediciones viejas y
   latinoamericanas. Con solo el escáner, esas quedarían fuera.
   ───────────────────────────────────────────────────────────── */

let stream = null;

export const barcodeSupported = () => 'BarcodeDetector' in window;

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
 */
export async function scanBarcode(video, { seconds = 12 } = {}) {
  if (!barcodeSupported()) return null;
  const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128'] });
  const until = Date.now() + seconds * 1000;

  while (Date.now() < until) {
    try {
      const codes = await detector.detect(video);
      const hit = codes.find((c) => /^\d{8,13}$/.test(c.rawValue));
      if (hit) return hit.rawValue;
    } catch { /* la cámara aún no da un cuadro utilizable */ }
    await new Promise((r) => setTimeout(r, 260));
  }
  return null;
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
 * Extrae el texto de una portada, en el dispositivo.
 * Preferible a mandar la imagen a un servicio: es gratis, no sube
 * fotos de nadie a ningún lado, y el resultado alimenta la misma
 * búsqueda de catálogos que el resto de caminos.
 */
export async function readCoverText(canvas, onProgress = () => {}) {
  const T = await loadOcr();
  const { data } = await T.recognize(canvas, 'spa+eng', {
    logger: (m) => { if (m.status === 'recognizing text') onProgress(m.progress); },
  });
  return (data?.text || '').trim();
}
