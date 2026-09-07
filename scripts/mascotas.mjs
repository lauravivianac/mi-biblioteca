/* ─────────────────────────────────────────────────────────────
   LAS MASCOTAS ILUSTRADAS · de PNG a lo que se puede servir

     node scripts/mascotas.mjs <carpeta-con-los-png>

   Toma los PNG que llegan de la ilustradora —1254 × 1254 y ~1,6 MB
   cada uno— y deja en `img/mascota/` un WebP de 320 px por pose.

   POR QUÉ HACE FALTA. Esta app no tiene empaquetador: cada kilobyte
   del repositorio es un kilobyte que se descarga tal cual. Cinco
   imágenes de 1,6 MB son 8 MB para dibujar un gato de 84 píxeles.

   NO SE RECORTA EL MARGEN TRANSPARENTE, y es a propósito. Cada pose
   ocupa una parte distinta del cuadro —la que salta llega más arriba,
   la que duerme es ancha y baja—, así que recortar al contenido daría
   a cada una una escala distinta y la mascota pegaría un salto de
   tamaño al cambiar de ánimo. Conservar el lienzo cuadrado es lo que
   mantiene la escala que se cuidó al generarlas.

   Y RECORTA LAS QUE LLEGAN CON EL FONDO PEGADO. Algunas vienen con el
   cuadriculado de «esto es transparente» pintado encima como píxeles
   opacos. Se detecta contando —una ilustración recortada tiene medio
   lienzo transparente, una con el fondo pegado tiene cero— y se quita
   por inundación desde el borde, no filtrando por color: el conejo
   tiene la panza casi blanca y quitar «todo lo claro» se la comería.

   Convierte Chromium: no hay `cwebp` ni Pillow en esta máquina, y
   añadir una dependencia nativa para cinco imágenes no compensa.
   ───────────────────────────────────────────────────────────── */

import { chromium } from 'playwright';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origen = process.argv[2];
if (!origen) {
  console.error('uso: node scripts/mascotas.mjs <carpeta-con-los-png>');
  process.exit(1);
}
const destino = join(raiz, 'img', 'mascota');
await mkdir(destino, { recursive: true });

/* 320 px cubre una pantalla a 3× con margen: se pinta a 84 px de ancho.
   Más grande solo pesa. */
const LADO = 320;
const CALIDAD = 0.86;

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const pagina = await navegador.newPage();

const entradas = (await readdir(origen)).filter((f) => f.endsWith('.png')).sort();
let antes = 0;
let despues = 0;

for (const fichero of entradas) {
  const png = await readFile(join(origen, fichero));
  antes += png.length;

  const { b64, limpiada } = await pagina.evaluate(async ({ datos, lado, calidad }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + datos;
    await img.decode();

    /* Se trabaja primero a tamaño original: quitar el fondo después de
       encoger mezcla el fondo con el pelo en cada píxel del borde y ya
       no hay forma de separarlos. */
    const g = document.createElement('canvas');
    g.width = img.width;
    g.height = img.height;
    const gx = g.getContext('2d', { willReadFrequently: true });
    gx.drawImage(img, 0, 0);
    const datosImg = gx.getImageData(0, 0, g.width, g.height);
    const px = datosImg.data;
    const W = g.width;
    const H = g.height;

    /* ── ¿VIENE CON EL FONDO PEGADO? ──────────────────────────
       Algunas llegan con el cuadriculado de «esto es transparente»
       pintado encima, como píxeles opacos. Se detecta contando: una
       ilustración recortada tiene la mitad del lienzo en transparente;
       una con el fondo pegado tiene cero. */
    let transparentes = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] < 16) transparentes += 1;
    const pegado = transparentes / (W * H) < 0.02;

    if (pegado) {
      /* Los tonos del fondo se leen del propio borde: el cuadriculado
         son dos grises claros, y un fondo plano es uno solo. */
      const tonos = [];
      const mira = (x, y) => {
        const o = (y * W + x) * 4;
        const c = [px[o], px[o + 1], px[o + 2]];
        if (!tonos.some((t) => Math.abs(t[0] - c[0]) + Math.abs(t[1] - c[1]) + Math.abs(t[2] - c[2]) < 24)) {
          tonos.push(c);
        }
      };
      for (let x = 0; x < W; x += 7) { mira(x, 0); mira(x, H - 1); }
      for (let y = 0; y < H; y += 7) { mira(0, y); mira(W - 1, y); }

      const esFondo = (o, tol) => tonos.some((t) =>
        Math.abs(t[0] - px[o]) <= tol && Math.abs(t[1] - px[o + 1]) <= tol && Math.abs(t[2] - px[o + 2]) <= tol);

      /* Relleno por inundación DESDE EL BORDE, no un filtro por color:
         el conejo tiene la panza casi blanca, y quitar «todo lo claro»
         se la comería. Lo que se quita es lo que está conectado con el
         borde. */
      const visto = new Uint8Array(W * H);
      const cola = [];
      for (let x = 0; x < W; x += 1) { cola.push(x, 0, x, H - 1); }
      for (let y = 0; y < H; y += 1) { cola.push(0, y, W - 1, y); }
      while (cola.length) {
        const y = cola.pop();
        const x = cola.pop();
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = y * W + x;
        if (visto[i]) continue;
        const o = i * 4;
        if (!esFondo(o, 20)) continue;
        visto[i] = 1;
        px[o + 3] = 0;
        cola.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
      }

      /* El filo queda con píxeles mezclados de fondo y pelo. Se les baja
         la opacidad según lo cerca que estén del fondo, que es lo que
         evita la orla clara alrededor de la silueta. */
      for (let i = 0; i < W * H; i += 1) {
        const o = i * 4;
        if (px[o + 3] === 0) continue;
        const x = i % W;
        const y = (i / W) | 0;
        let borde = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = (y + dy) * W + (x + dx);
          if (x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H && px[j * 4 + 3] === 0) borde = true;
        }
        if (borde && esFondo(o, 46)) px[o + 3] = Math.round(px[o + 3] * 0.35);
      }
      gx.putImageData(datosImg, 0, 0);
    }

    const c = document.createElement('canvas');
    c.width = lado;
    c.height = lado;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(g, 0, 0, lado, lado);
    return { b64: c.toDataURL('image/webp', calidad).split(',')[1], limpiada: pegado };
  }, { datos: png.toString('base64'), lado: LADO, calidad: CALIDAD });

  const webp = Buffer.from(b64, 'base64');
  despues += webp.length;
  const nombre = basename(fichero, '.png') + '.webp';
  await writeFile(join(destino, nombre), webp);
  console.log(`  ${nombre.padEnd(24)} ${(png.length / 1024).toFixed(0).padStart(5)} KB → ${(webp.length / 1024).toFixed(0).padStart(3)} KB`
    + (limpiada ? '   · traía el fondo pegado, recortada' : ''));
}

await navegador.close();
console.log(`\n  ${entradas.length} imágenes · ${(antes / 1048576).toFixed(1)} MB → ${(despues / 1024).toFixed(0)} KB\n`);
