/* ─────────────────────────────────────────────────────────────
   UNA ESCENA POR TEMA, Y NI UNA MÁS

     npm run test:escenas

   Abre cada uno de los diez temas en Chromium y cuenta cuántas
   imágenes de `img/tema/` pide el navegador. Tiene que ser UNA —la
   suya— o NINGUNA si el tema aún no tiene lámina.

   POR QUÉ EXISTE. Las escenas empezaron siendo `<img>` escondidos con
   `display:none`, uno por tema. Eso NO evita la descarga: el navegador
   se baja igual una imagen oculta. Con seis láminas puestas eran unos
   430 KB en cada apertura para enseñar unos 60, en una app sin
   empaquetador donde cada kilobyte del repositorio es un kilobyte que
   alguien descarga con datos móviles.

   Ahora la escena es el `background-image` de `.mundo`, elegido por
   tema en `styles/worlds.css`: el fondo de una regla que no casa no se
   pide nunca, así que la pereza la hace el navegador. Es correcto y es
   invisible — y lo invisible es justo lo que vuelve sin avisar. Basta
   con que alguien meta otra vez un `<img>` «para que se precargue»
   para perderlo sin que nada se vea distinto.

   Esta prueba es lo que se ve distinto.
   ───────────────────────────────────────────────────────────── */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Qué temas hay y qué láminas existen: las dos listas salen del propio
   repositorio, para que añadir una escena no obligue a tocar esto. */
const TEMAS = (await readFile(join(raiz, 'src', 'themes.js'), 'utf8'))
  .matchAll(/^\s{4}id: '([\w-]+)',$/gm);
const temas = [...TEMAS].map((m) => m[1]);

const laminas = new Set(
  (await readdir(join(raiz, 'img', 'tema'))).filter((f) => f.endsWith('.webp'))
    .map((f) => f.replace(/\.webp$/, '')),
);

const TIPOS = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.json': 'application/json', '.png': 'image/png',
};
const servidor = createServer(async (req, res) => {
  const ruta = normalize(join(raiz, decodeURIComponent(req.url.split('?')[0])));
  if (!ruta.startsWith(raiz)) { res.writeHead(403).end(); return; }
  try {
    const cuerpo = await readFile(ruta);
    res.writeHead(200, { 'Content-Type': TIPOS[ruta.slice(ruta.lastIndexOf('.'))] || 'text/plain' });
    res.end(cuerpo);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${servidor.address().port}`;

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const fallos = [];

console.log(`\n  ${temas.length} temas · ${laminas.size} láminas en img/tema/\n`);

for (const tema of temas) {
  const pagina = await navegador.newPage();
  const pedidas = [];
  pagina.on('request', (r) => {
    if (r.url().includes('/img/tema/')) pedidas.push(r.url().split('/').pop().replace(/\.webp$/, ''));
  });
  /* Nada de fuera: aquí solo se mide qué pide el CSS. */
  await pagina.route('**/*', (r) => (r.request().url().startsWith(base)
    ? r.continue()
    : r.fulfill({ status: 200, body: '' })));
  await pagina.setContent(`<link rel="stylesheet" href="${base}/styles/tokens.css">
    <link rel="stylesheet" href="${base}/styles/app.css">
    <link rel="stylesheet" href="${base}/styles/worlds.css">
    <div class="mundo"></div>`, { baseURL: base });
  await pagina.evaluate((t) => document.documentElement.setAttribute('data-theme', t), tema);
  await pagina.waitForTimeout(400);
  await pagina.close();

  const esperado = laminas.has(tema) ? [tema] : [];
  const bien = pedidas.length === esperado.length && pedidas.every((p) => p === tema);
  console.log(`  ${bien ? '✓' : '✗'} ${tema.padEnd(12)} pidió ${pedidas.length}`
    + `${pedidas.length ? ` (${pedidas.join(', ')})` : ''}`
    + `${laminas.has(tema) ? '' : ' · aún sin lámina'}`);
  if (!bien) {
    fallos.push(`${tema}: esperaba [${esperado}] y pidió [${pedidas}]`);
  }
}

await navegador.close();
servidor.close();

if (!fallos.length) {
  console.log('\n  ✓ Cada tema se baja su escena y ninguna más.\n');
  process.exit(0);
}
console.log(`\n  ${fallos.length} TEMA(S) QUE SE BAJAN LO QUE NO ES SUYO:\n`);
for (const f of fallos) console.log(`  ✗ ${f}`);
console.log('\n  Una imagen escondida con `display:none` se descarga igual:'
  + '\n  la escena tiene que ser el `background-image` de `.mundo`.\n');
process.exit(1);
