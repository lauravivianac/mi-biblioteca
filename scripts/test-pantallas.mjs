/* ─────────────────────────────────────────────────────────────
   LAS HOJAS, EN UN NAVEGADOR DE VERDAD

   Para ejecutarlo:
     npm run test:pantallas

   Abre el `index.html` del repo en Chromium, con su CSS y su `ui.js`
   de verdad, y comprueba una sola cosa: QUE LA HOJA QUE ABRES SE VE.

   POR QUÉ EXISTE. Las seis filas de ajustes —tu perfil, dónde estás,
   tus libros ofrecidos, bloqueadas, invitar, qué se ve en tu perfil—
   no hacían nada al tocarlas. No estaban rotas: todas las hojas tenían
   el mismo `z-index`, así que ganaba la que estuviera más abajo en el
   HTML, y `settings-overlay` está casi al final. Las hojas se abrían
   ENTERAS POR DETRÁS de ajustes.

   Ninguna prueba de las que había podía verlo: todas son de lógica
   pura en Node, y esto es un problema de pintado. Hacía falta un
   navegador, y no había ninguno mirando.

   Lo que esto NO prueba: el cableado de los `onclick`, porque `main.js`
   carga Firebase desde gstatic y necesita red y sesión. Prueba la capa
   donde estaba el fallo — la pila de hojas sobre el marcado real.
   ───────────────────────────────────────────────────────────── */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const TIPOS = {
  '.html': 'text/html', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json',
};

/* Un servidor mínimo: los módulos ES no se cargan por file://. */
const servidor = createServer(async (req, res) => {
  const ruta = normalize(join(raiz, decodeURIComponent(req.url.split('?')[0])));
  if (!ruta.startsWith(raiz)) { res.writeHead(403).end(); return; }
  try {
    const cuerpo = await readFile(ruta);
    const ext = ruta.slice(ruta.lastIndexOf('.'));
    res.writeHead(200, { 'Content-Type': TIPOS[ext] || 'application/octet-stream' });
    res.end(cuerpo);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${servidor.address().port}`;

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const pagina = await navegador.newPage({ viewport: { width: 420, height: 820 } });

const erroresDePagina = [];
pagina.on('pageerror', (e) => erroresDePagina.push(String(e).split('\n')[0]));

/* Ni fuentes ni Firebase: esto mira cómo se apilan las hojas, y una
   fuente que tarda no debe decidir si la prueba pasa. */
await pagina.route('**/*', (ruta) => {
  const u = ruta.request().url();
  if (u.startsWith(base)) return ruta.continue();
  return ruta.fulfill({ status: 200, contentType: 'text/plain', body: '' });
});

await pagina.goto(`${base}/index.html`);
await pagina.waitForSelector('#settings-overlay', { state: 'attached' });

/* Las seis filas de ajustes y la hoja que abre cada una (ver
   screens.js). Son exactamente las que no hacían nada. */
const FILAS_DE_AJUSTES = {
  'Tu perfil público': 'profile-overlay',
  'Dónde estás': 'place-overlay',
  'Mis libros ofrecidos': 'myswaps-overlay',
  'Bloqueadas y silenciadas': 'blocked-overlay',
  'Invitar a alguien': 'invite-overlay',
  'Qué se ve en tu perfil': 'profset-overlay',
  'La tienda de temas': 'store-overlay',
};

const resultado = await pagina.evaluate(async (filas) => {
  const { openSheet, closeSheet } = await import('/src/ui.js');
  for (const id of ['loading-screen', 'auth-screen']) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  /* La pregunta de verdad no es «¿tiene la clase open?» sino «¿qué hay
     debajo del dedo?». Lo primero ya era cierto cuando el fallo estaba
     vivo; lo segundo es lo que la gente ve. */
  const hojaDeArriba = () => {
    let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    while (el) {
      if (el.classList?.contains('overlay')) return el.id;
      el = el.parentElement;
    }
    return 'ninguna';
  };

  const salida = { desdeAjustes: {}, alCerrar: {}, sueltas: {} };

  openSheet('settings-overlay');
  for (const [nombre, id] of Object.entries(filas)) {
    openSheet(id);
    salida.desdeAjustes[nombre] = hojaDeArriba();
    closeSheet(id);
    salida.alCerrar[nombre] = hojaDeArriba();
  }
  closeSheet('settings-overlay');

  /* Y cada hoja por su cuenta, sin nada debajo. */
  for (const id of Object.values(filas)) {
    openSheet(id);
    salida.sueltas[id] = hojaDeArriba();
    closeSheet(id);
  }
  salida.trasCerrarTodo = hojaDeArriba();
  return salida;
}, FILAS_DE_AJUSTES);

await navegador.close();
servidor.close();

let pasan = 0;
const fallos = [];
const comprobar = (nombre, ok, detalle = '') => {
  if (ok) pasan += 1; else fallos.push({ nombre, detalle });
};

for (const [nombre, id] of Object.entries(FILAS_DE_AJUSTES)) {
  comprobar(
    `ajustes · «${nombre}» se ve al abrirla`,
    resultado.desdeAjustes[nombre] === id,
    `arriba quedó «${resultado.desdeAjustes[nombre]}» en vez de «${id}»`,
  );
  comprobar(
    `ajustes · al cerrar «${nombre}» se vuelve a ajustes`,
    resultado.alCerrar[nombre] === 'settings-overlay',
    `arriba quedó «${resultado.alCerrar[nombre]}»`,
  );
}

for (const id of Object.values(FILAS_DE_AJUSTES)) {
  comprobar(`suelta · «${id}» se ve sola`, resultado.sueltas[id] === id,
    `arriba quedó «${resultado.sueltas[id]}»`);
}

comprobar('cerradas todas, no queda ninguna encima',
  resultado.trasCerrarTodo === 'ninguna', `quedó «${resultado.trasCerrarTodo}»`);

comprobar('el marcado no lanza errores de JavaScript',
  erroresDePagina.length === 0, erroresDePagina.join(' · '));

if (!fallos.length) {
  console.log(`\n  ✓ ${pasan} comprobaciones de pantalla en Chromium. Sin fallos.\n`);
  process.exit(0);
}

console.log(`\n  ${pasan} correctas, ${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f.nombre}\n      ${f.detalle}`);
console.log('');
process.exit(1);
