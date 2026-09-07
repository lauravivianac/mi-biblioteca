/* ─────────────────────────────────────────────────────────────
   DIBUJAR LA TARJETA · 1080×1920  ·  historia #90

   Todo en el dispositivo, con Canvas. Nada sale a ningún servidor
   para hacer una imagen.

   LA TARJETA LLEVA TU TEMA PUESTO, y eso no es decoración: quien vea
   la story ve el tema. Es la mejor publicidad que la tienda de temas
   (E6) puede tener y no cuesta nada extra, porque los colores ya están
   ahí, en las variables CSS que la app usa para pintarse.

   EL PELIGRO ESTÁ EN LAS PORTADAS. Dibujar en un canvas una imagen de
   otro dominio lo CONTAMINA, y a partir de ahí toBlob() falla: te
   quedas sin imagen justo al final, después de haberla visto. La
   historia lo avisa. Aquí se piden con crossOrigin y, si el servidor
   no da permiso, se dibuja el marcador de letra. Una portada nunca
   puede costarte la tarjeta entera.
   ───────────────────────────────────────────────────────────── */

import { ANCHO, ALTO, fitText, cardContent } from './cards-core.js';

/* Márgenes. El de abajo es más grande a propósito: en Stories, la
   interfaz de Instagram se come la franja inferior. */
const M = 100;
const CAJA = ANCHO - M * 2;
const PIE = 260;

/** Los colores del tema aplicado, leídos de las variables CSS. */
function paleta() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, fallback) => (cs.getPropertyValue(n) || '').trim() || fallback;
  return {
    fondo: v('--void', '#0D0A1A'),
    fondo2: v('--deep', '#13102B'),
    acento: v('--purple', '#6C3FC5'),
    oro: v('--gold', '#F0C060'),
    texto: v('--text', '#EDE8F5'),
    tenue: v('--muted', '#9A93B8'),
    display: v('--font-display', 'Georgia, serif'),
    body: v('--font-body', 'system-ui, sans-serif'),
  };
}

/**
 * Cargar una imagen para el canvas SIN contaminarlo.
 *
 * Devuelve null si no se puede en vez de lanzar: quedarse sin portada
 * es un detalle, quedarse sin tarjeta es perder la función.
 */
function cargarImagen(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';        // sin esto, toBlob() falla después
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);    // el servidor no da permiso CORS
    /* Un servidor lento no puede dejar la tarjeta colgada para siempre. */
    setTimeout(() => resolve(null), 4000);
    img.src = url;
  });
}

const rect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

/**
 * Dibuja la tarjeta y devuelve el canvas.
 *
 * `datos` es lo que sepa quien llama; el reparto por tipo lo hace
 * cardContent, y el tamaño de letra lo decide fitText midiendo con
 * este mismo canvas —que es la única medida que no miente—.
 */
export async function drawCard(tipo, datos = {}, { pet = null } = {}) {
  const c = cardContent(tipo, datos);
  if (!c) return null;

  const cv = document.createElement('canvas');
  cv.width = ANCHO;
  cv.height = ALTO;
  const ctx = cv.getContext('2d');
  const p = paleta();

  /* ── El fondo, con el tema ── */
  const g = ctx.createLinearGradient(0, 0, ANCHO, ALTO);
  g.addColorStop(0, p.fondo2);
  g.addColorStop(1, p.fondo);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  const halo = ctx.createRadialGradient(ANCHO * 0.2, 0, 0, ANCHO * 0.2, 0, ALTO * 0.8);
  halo.addColorStop(0, `${p.acento}55`);
  halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  /* Un filo dorado, el mismo detalle que las fichas de la app */
  ctx.strokeStyle = `${p.oro}44`;
  ctx.lineWidth = 3;
  rect(ctx, 40, 40, ANCHO - 80, ALTO - 80, 44);
  ctx.stroke();

  /* Medir con ESTE canvas es la única medida que no miente: la fuente
     del tema puede no ser la que se pidió y solo el navegador lo sabe. */
  const medir = (t, size) => {
    ctx.font = `${size}px ${p.display}`;
    return ctx.measureText(t).width;
  };

  /* ── Qué se va a pintar, y cuánto ocupa ────────────────────
     Primero se mide TODO y después se dibuja, para poder centrar el
     bloque a lo alto. La primera versión empezaba a pintar en y=300
     pasara lo que pasara, y una tarjeta sin portada salía con el texto
     apelotonado arriba y medio metro de vacío debajo. En una story eso
     se ve como un error, no como aire. */
  const grande = c.tipo === 'anio';
  const bloques = [];
  const portadaAlto = c.portada ? 690 : 0;      // 400×600 + separación

  /* Cada bloque guarda ya su letra y su color: abajo solo se pinta.
     `salto` es lo que baja la pluma por línea; `despues`, el aire que
     lo separa del siguiente. */
  if (c.kicker) {
    const size = c.tipo === 'libro' ? 64 : 40;
    bloques.push({
      lineas: [c.kicker], size, fuente: p.display,
      color: c.tipo === 'libro' ? p.oro : p.tenue,
      salto: c.tipo === 'libro' ? 100 : 70, despues: 0,
    });
  }

  const t = fitText(c.titulo, {
    maxAncho: CAJA,
    maxLineas: c.tipo === 'cita' ? 8 : 3,
    desde: grande ? 300 : (c.tipo === 'cita' ? 64 : 96),
    hasta: grande ? 160 : 40,
    medir,
  });
  bloques.push({
    lineas: t.lineas, size: t.size, fuente: p.display, color: p.oro,
    salto: t.size * 1.22, despues: 30,
  });

  if (c.subtitulo) {
    const sub = fitText(c.subtitulo, {
      maxAncho: CAJA, maxLineas: 2, desde: grande ? 72 : 44, hasta: 30, medir,
    });
    bloques.push({
      lineas: sub.lineas, size: sub.size, fuente: p.body, color: p.texto,
      salto: sub.size * 1.35, despues: 20,
    });
  }

  if (c.cuerpo) {
    const cu = fitText(c.cuerpo, { maxAncho: CAJA, maxLineas: 3, desde: 36, hasta: 26, medir });
    bloques.push({
      lineas: cu.lineas, size: cu.size, fuente: p.body, color: p.tenue,
      salto: cu.size * 1.4, despues: 0,
    });
  }

  const altoTexto = bloques.reduce((a, b) => a + b.lineas.length * b.salto + b.despues, 0);
  /* La zona útil va del filo de arriba al pie. Se centra el conjunto
     ahí dentro; si no cabe (una cita larga), se empieza arriba del todo
     y que baje lo que tenga que bajar. */
  const ARRIBA = 200;
  const disponible = ALTO - PIE - ARRIBA;
  /* 0,42 y no la mitad: el pie pesa a la vista, y un bloque centrado a
     regla exacta se ve caído. Es el centro óptico de toda la vida. */
  const sobra = Math.max(0, disponible - portadaAlto - altoTexto);
  let y = ARRIBA + sobra * 0.42;

  /* ── La portada, si la hay ── */
  const img = await cargarImagen(c.portada);
  if (c.portada) {
    const w = 400;
    const h = Math.round(w * 1.5);
    const x = (ANCHO - w) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    rect(ctx, x, y, w, h, 16);
    ctx.fillStyle = `${p.acento}33`;
    ctx.fill();
    ctx.restore();

    if (img) {
      ctx.save();
      rect(ctx, x, y, w, h, 16);
      ctx.clip();
      /* Recorte centrado: una portada apaisada no se deforma, se recorta. */
      const escala = Math.max(w / img.width, h / img.height);
      const iw = img.width * escala;
      const ih = img.height * escala;
      ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
      ctx.restore();
    } else {
      /* Sin portada utilizable: la inicial, como en la app. */
      ctx.fillStyle = p.oro;
      ctx.font = `160px ${p.display}`;
      ctx.textAlign = 'center';
      ctx.fillText((c.titulo[0] || '✦').toUpperCase(), ANCHO / 2, y + h / 2 + 55);
    }
    y += h + 90;
  }

  /* ── El texto, ya medido: aquí solo se pinta ── */
  ctx.textAlign = 'center';
  for (const b of bloques) {
    ctx.fillStyle = b.color;
    ctx.font = `${b.size}px ${b.fuente}`;
    for (const linea of b.lineas) {
      y += b.salto;                    // la línea se apoya en su base
      ctx.fillText(linea, ANCHO / 2, y);
    }
    y += b.despues;
  }

  /* ── La mascota, si está ── */
  if (pet) {
    /* `pet` es la FUENTE de la imagen, no una cadena de SVG: la da
       `petFuente` en pet.js, y así una especie ilustrada llega como
       .webp y una dibujada como data-uri sin que aquí haya que saber
       cuál es cuál. Envolverla en un data-uri de SVG aquí era lo que
       impedía usar las ilustraciones en la tarjeta. */
    const mascota = await cargarImagen(pet);
    if (mascota) ctx.drawImage(mascota, ANCHO - 300, ALTO - PIE - 220, 200, 200);
  }

  /* ── El pie: tu nombre y la marca ── */
  ctx.textAlign = 'center';
  if (c.pie) {
    ctx.fillStyle = p.texto;
    ctx.font = `44px ${p.body}`;
    ctx.fillText(c.pie, ANCHO / 2, ALTO - PIE + 40);
  }
  ctx.fillStyle = p.tenue;
  ctx.font = `32px ${p.display}`;
  ctx.fillText('✦ Library', ANCHO / 2, ALTO - PIE + 110);

  return cv;
}

/**
 * La tarjeta como PNG.
 *
 * Si el canvas quedó contaminado —no debería, con lo de arriba— esto
 * lanza. Se deja lanzar a propósito: quien llama tiene que poder
 * decirlo en pantalla en vez de dejar un botón que no hace nada.
 */
export function canvasToBlob(cv) {
  return new Promise((resolve, reject) => {
    try {
      cv.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen.'))), 'image/png');
    } catch (e) {
      reject(new Error('La portada del libro no dejó exportar la imagen.'));
    }
  });
}
