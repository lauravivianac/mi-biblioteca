/* ─────────────────────────────────────────────────────────────
   LAS ESCENAS DE LOS TEMAS · de PNG a lo que se puede servir

     node scripts/escenas.mjs <carpeta-con-los-png>

   Hermana de `mascotas.mjs`, pero para las escenas de fondo: apaisadas
   2:1, opacas y a lo ancho de la pantalla. Deja los WebP en
   `img/tema/`, nombrados por el id del tema.

   POR QUÉ SON DOS SCRIPTS Y NO UNO. Una mascota es cuadrada, con
   transparencia, y se pinta a 92 px: lo que importa es conservar el
   lienzo para que no cambie de escala entre poses. Una escena es
   apaisada, opaca, y se pinta a lo ancho: lo que importa es el ancho
   real de la pantalla más grande. Meterlas en el mismo script sería un
   parámetro que decide todo lo demás, que es peor que dos archivos.

   EL ANCHO. La app se ve a 420 px de ancho como mucho; a 3× son 1260.
   1200 está a un pelo de eso y es donde el peso deja de bajar sin que
   se note. Estas pesan de verdad —una acuarela con grano no comprime
   como un dibujo plano— así que aquí el presupuesto importa: son diez
   temas y esta app no tiene empaquetador.
   ───────────────────────────────────────────────────────────── */

import { chromium } from 'playwright';
import { rutaChromium } from './navegador.mjs';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origen = process.argv[2];
if (!origen) {
  console.error('uso: node scripts/escenas.mjs <carpeta-con-los-png>');
  process.exit(1);
}
const destino = join(raiz, 'img', 'tema');
await mkdir(destino, { recursive: true });

const ANCHO = 1200;
const CALIDAD = 0.82;

const navegador = await chromium.launch({ executablePath: rutaChromium() });
const pagina = await navegador.newPage();

const entradas = (await readdir(origen)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
let antes = 0;
let despues = 0;

for (const fichero of entradas) {
  const bruto = await readFile(join(origen, fichero));
  antes += bruto.length;

  const info = await pagina.evaluate(async ({ datos, ancho, calidad }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + datos;
    await img.decode();
    const alto = Math.round((ancho * img.height) / img.width);
    const c = document.createElement('canvas');
    c.width = ancho;
    c.height = alto;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, ancho, alto);

    /* El color del cielo, promediado en la banda de arriba. Es lo que
       hay que saber para que la escena case con el fondo del tema: si
       no coinciden, se ve la costura donde termina la imagen. */
    const px = ctx.getImageData(0, 0, ancho, Math.round(alto * 0.1)).data;
    let r = 0; let g = 0; let b = 0; let n = 0;
    for (let i = 0; i < px.length; i += 4 * 13) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n += 1; }
    const cielo = '#' + [r / n, g / n, b / n]
      .map((v) => Math.round(v).toString(16).padStart(2, '0').toUpperCase()).join('');

    return { b64: c.toDataURL('image/webp', calidad).split(',')[1], cielo, ancho, alto };
  }, { datos: bruto.toString('base64'), ancho: ANCHO, calidad: CALIDAD });

  const webp = Buffer.from(info.b64, 'base64');
  despues += webp.length;
  const nombre = basename(fichero).replace(/\.\w+$/, '') + '.webp';
  await writeFile(join(destino, nombre), webp);
  console.log(`  ${nombre.padEnd(20)} ${info.ancho}×${info.alto}  `
    + `${(bruto.length / 1024).toFixed(0).padStart(5)} KB → ${(webp.length / 1024).toFixed(0).padStart(3)} KB`
    + `   cielo ${info.cielo}`);
}

await navegador.close();
console.log(`\n  ${entradas.length} escena(s) · ${(antes / 1048576).toFixed(1)} MB → ${(despues / 1024).toFixed(0)} KB`);
console.log('  Compara «cielo» con el --void del tema: si no casan, se ve la costura.\n');
