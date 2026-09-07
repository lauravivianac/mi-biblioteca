/* ─────────────────────────────────────────────────────────────
   CAPTURAS DE LA APP, CON DATOS DE VERDAD

     npm run capturas

   Levanta la app entera en Chromium contra el emulador —igual que
   `test:e2e`— crea una cuenta, le pone libros en varios estados y
   FOTOGRAFÍA cada pantalla en `capturas/`.

   POR QUÉ EXISTE. Un rediseño no se juzga leyendo CSS. Hasta que no
   hubo una forma de mirar la app con libros dentro, cada decisión de
   color o de espaciado era una suposición. Esto la convierte en algo
   que se puede ver antes y después.

   No es una prueba: no falla ni pasa. Deja imágenes.
   ───────────────────────────────────────────────────────────── */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { empaquetarSdk, RUTA_GSTATIC } from './emulador/sdk-local.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, process.env.CAPTURAS_DIR || 'capturas');
const PROYECTO = process.env.GCLOUD_PROJECT || 'demo-biblioteca';
const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8181';
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

await mkdir(destino, { recursive: true });

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

const servidor = createServer(async (req, res) => {
  const ruta = normalize(join(raiz, decodeURIComponent(req.url.split('?')[0])));
  if (!ruta.startsWith(raiz)) { res.writeHead(403).end(); return; }
  try {
    const cuerpo = await readFile(ruta);
    res.writeHead(200, { 'Content-Type': TIPOS[ruta.slice(ruta.lastIndexOf('.'))] || 'application/octet-stream' });
    res.end(cuerpo);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${servidor.address().port}`;

const sdk = await empaquetarSdk();

const FIREBASE_EMULADOR = `
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, connectFirestoreEmulator }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, connectAuthEmulator, setPersistence, browserLocalPersistence }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
export const app = initializeApp({
  apiKey: 'fake-api-key', authDomain: '${PROYECTO}.firebaseapp.com', projectId: '${PROYECTO}',
});
export const db = getFirestore(app);
export const auth = getAuth(app);
connectFirestoreEmulator(db, '${FIRESTORE.split(':')[0]}', ${FIRESTORE.split(':')[1]});
connectAuthEmulator(auth, 'http://${AUTH}', { disableWarnings: true });
setPersistence(auth, browserLocalPersistence).catch(() => {});
`;

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await navegador.newContext({ viewport: { width: 420, height: 880 }, deviceScaleFactor: 2 });
const pagina = await ctx.newPage();

/* Las fuentes SÍ se dejan pasar: aquí lo que se mira es cómo se ve, y
   Cinzel e Inter son la mitad del carácter de la app. */
await pagina.route('**/*', async (ruta) => {
  const u = ruta.request().url();
  const m = RUTA_GSTATIC.exec(u);
  if (m && sdk[m[1]]) return ruta.fulfill({ status: 200, contentType: 'text/javascript', body: sdk[m[1]] });
  if (u === `${base}/src/firebase.js`) {
    return ruta.fulfill({ status: 200, contentType: 'text/javascript', body: FIREBASE_EMULADOR });
  }
  if (u.startsWith(base) || u.startsWith(`http://${FIRESTORE}`) || u.startsWith(`http://${AUTH}`)
      || u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com')) {
    return ruta.continue();
  }
  return ruta.fulfill({ status: 200, contentType: 'text/plain', body: '' });
});

await pagina.goto(`${base}/index.html`);
await pagina.waitForSelector('#auth-screen.visible', { timeout: 25000 });

const foto = async (nombre) => {
  await pagina.waitForTimeout(500);
  await pagina.screenshot({ path: join(destino, `${nombre}.png`) });
  console.log(`  · ${nombre}.png`);
};

console.log('\nCapturando en', destino);

await foto('00-acceso');

await pagina.click('.auth-tab:has-text("Crear cuenta")');
await pagina.fill('#au-name', 'Laura');
await pagina.fill('#au-email', `laura${Date.now()}@ejemplo.test`);
await pagina.fill('#au-pass', 'secreto123');
await pagina.click('#auth-submit');
await pagina.waitForSelector('body.signed-in', { timeout: 25000 });

const salio = await pagina.waitForSelector('#onboard-screen.visible', { timeout: 9000 })
  .then(() => true, () => false);
if (salio) {
  await foto('01-onboarding');
  await pagina.click('#onboard-screen .link-btn');
  await pagina.waitForSelector('#onboard-screen.visible', { state: 'hidden', timeout: 8000 });
}

/* Una biblioteca con vida: leídos, uno a medias, uno con nota. */
await pagina.evaluate(async () => {
  const st = await import('/src/store.js');
  const libros = st.allBooks();
  libros.slice(0, 5).forEach((b) => st.updateEntry(b.id, { status: 'read', rating: 4 + (b.id.length % 2) }));
  if (libros[5]) st.updateEntry(libros[5].id, { status: 'reading', pages: 120 });
  if (libros[6]) st.updateEntry(libros[6].id, { status: 'reading', pages: 40 });
  await st.flush();
});
await pagina.waitForTimeout(900);

const cerrar = () => pagina.evaluate(() => {
  document.querySelectorAll('.overlay.open').forEach((o) => o.classList.remove('open'));
});

const PESTANAS = ['plan', 'biblioteca', 'tracker', 'feed', 'trueque'];
for (const p of PESTANAS) {
  await cerrar();
  await pagina.evaluate((x) => window.nav(x), p);
  await pagina.waitForTimeout(1200);
  await foto(`10-${p}`);
}

/* ── TODOS LOS TEMAS ─────────────────────────────────────────
   Un tema no es una paleta: cambia color, forma, material,
   tipografía y textura a la vez. Con diez, mirar solo el primero
   es exactamente cómo se degradan los otros nueve. Aquí se
   fotografían los diez, en la pantalla donde más se nota —la
   estantería, que es la que tiene libros, filetes y filtros. */
const TEMAS = await pagina.evaluate(async () =>
  (await import('/src/themes.js')).THEMES.map((t) => t.id));

for (const tema of TEMAS) {
  await cerrar();
  await pagina.evaluate(async (id) => {
    const { applyTheme } = await import('/src/theme-engine.js');
    applyTheme(id, { persistLocal: false });
  }, tema);
  /* Las fuentes del tema se cargan al aplicarlo: sin esperarlas, la
     captura sale con la tipografía del tema anterior. */
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.evaluate(() => window.nav('biblioteca'));
  await pagina.waitForTimeout(1400);
  await foto(`30-tema-${tema}`);

  await pagina.evaluate(() => window.nav('plan'));
  await pagina.waitForTimeout(1000);
  await foto(`31-plan-${tema}`);
}

/* Se vuelve al de casa para las hojas que faltan. */
await pagina.evaluate(async () => {
  const { applyTheme } = await import('/src/theme-engine.js');
  applyTheme('exlibris', { persistLocal: false });
});
await pagina.evaluate(() => document.fonts.ready);

const HOJAS = {
  'agregar': () => window.openAdd(),
  'ajustes': () => window.openSettings(),
  'tienda': () => window.openThemeStore(),
  'planificador': () => window.openPlanner(),
  'escribir': () => window.openPosts(),
  'perfil': () => window.openProfileSettings?.() ?? window.openSettings(),
};

for (const [nombre, abrir] of Object.entries(HOJAS)) {
  await cerrar();
  await pagina.evaluate(`(${abrir.toString()})()`).catch(() => {});
  await pagina.waitForTimeout(900);
  await foto(`20-${nombre}`);
}

/* El detalle de un libro: es la pantalla donde más tiempo se pasa. */
await cerrar();
await pagina.evaluate(() => window.nav('biblioteca'));
await pagina.waitForTimeout(900);
await pagina.evaluate(async () => {
  const st = await import('/src/store.js');
  window.openDetail?.(st.allBooks()[5]?.id ?? st.allBooks()[0].id);
});
await foto('20-detalle');

await navegador.close();
servidor.close();
console.log('');
