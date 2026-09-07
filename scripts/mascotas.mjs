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

  const b64 = await pagina.evaluate(async ({ datos, lado, calidad }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + datos;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = lado;
    c.height = lado;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, lado, lado);
    return c.toDataURL('image/webp', calidad).split(',')[1];
  }, { datos: png.toString('base64'), lado: LADO, calidad: CALIDAD });

  const webp = Buffer.from(b64, 'base64');
  despues += webp.length;
  const nombre = basename(fichero, '.png') + '.webp';
  await writeFile(join(destino, nombre), webp);
  console.log(`  ${nombre.padEnd(24)} ${(png.length / 1024).toFixed(0).padStart(5)} KB → ${(webp.length / 1024).toFixed(0).padStart(3)} KB`);
}

await navegador.close();
console.log(`\n  ${entradas.length} imágenes · ${(antes / 1048576).toFixed(1)} MB → ${(despues / 1024).toFixed(0)} KB\n`);
