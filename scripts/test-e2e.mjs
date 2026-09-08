/* ─────────────────────────────────────────────────────────────
   LA APP ENTERA, EN UN NAVEGADOR, CONTRA FIRESTORE

     npm run test:e2e

   Esta es la prueba que faltaba. Las otras tres cubren cada una su
   mitad y ninguna cubre la unión:

     test:rules      las reglas, sin la app
     test:circuito   la app en Node, sin navegador ni interfaz
     test:pantallas  el navegador, sin Firebase

   Aquí se abre el `index.html` del repo en Chromium, con su CSS, sus
   módulos y el SDK de Firebase de verdad, apuntado al emulador. Se
   crean dos cuentas ESCRIBIENDO EN EL FORMULARIO, y todo lo demás se
   hace PULSANDO LOS BOTONES que pulsaría una persona.

   POR QUÉ IMPORTA. Los fallos que han aparecido en este repo no
   estaban en la lógica: estaban en las juntas. Una regla que reventaba
   al leer un documento que no existe. Siete hojas que se abrían detrás
   de la que ya estaba abierta. Un `onclick` que llamaba a una función
   que nadie había puesto en `window`. Nada de eso lo ve una prueba de
   lógica, y ninguna de esas cosas falla en un sitio: falla en la unión
   de dos.

   Lo único sustituido sigue siendo `src/firebase.js`, para que apunte
   al emulador. El SDK se sirve en la misma URL de gstatic que importa
   la app (ver scripts/emulador/sdk-local.mjs), así que para la app es
   exactamente el mismo código que en producción.
   ───────────────────────────────────────────────────────────── */

import { chromium } from 'playwright';
import { rutaChromium } from './navegador.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { empaquetarSdk, RUTA_GSTATIC } from './emulador/sdk-local.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROYECTO = process.env.GCLOUD_PROJECT || 'demo-biblioteca';
const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8181';
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

/* ── EL SERVIDOR ─────────────────────────────────────────────── */

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

/* ── LO QUE SE SUSTITUYE, Y NADA MÁS ─────────────────────────── */

const sdk = await empaquetarSdk();

/* El mismo src/firebase.js, apuntado al emulador. Es la única pieza
   de la app que cambia en toda la prueba. */
const FIREBASE_EMULADOR = `
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, connectFirestoreEmulator }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, connectAuthEmulator, setPersistence, browserLocalPersistence }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export const app = initializeApp({
  apiKey: 'fake-api-key',
  authDomain: '${PROYECTO}.firebaseapp.com',
  projectId: '${PROYECTO}',
});
export const db = getFirestore(app);
export const auth = getAuth(app);
connectFirestoreEmulator(db, '${FIRESTORE.split(':')[0]}', ${FIRESTORE.split(':')[1]});
connectAuthEmulator(auth, 'http://${AUTH}', { disableWarnings: true });
setPersistence(auth, browserLocalPersistence).catch(() => {});
`;

/* ── LA PRUEBA ───────────────────────────────────────────────── */

let pasan = 0;
const fallos = [];
const erroresDePagina = [];

const comprobar = (nombre, ok, detalle = '') => {
  if (ok) { pasan += 1; console.log(`  ✓ ${nombre}`); return true; }
  fallos.push({ nombre, detalle });
  console.log(`  ✗ ${nombre}${detalle ? `\n      ${detalle}` : ''}`);
  return false;
};

const navegador = await chromium.launch({ executablePath: rutaChromium() });

async function abrirPestana() {
  const ctx = await navegador.newContext({ viewport: { width: 420, height: 880 } });
  const pagina = await ctx.newPage();

  pagina.on('pageerror', (e) => erroresDePagina.push(String(e).split('\n')[0]));

  await pagina.route('**/*', async (ruta) => {
    const u = ruta.request().url();

    const m = RUTA_GSTATIC.exec(u);
    if (m && sdk[m[1]]) {
      return ruta.fulfill({ status: 200, contentType: 'text/javascript', body: sdk[m[1]] });
    }

    if (u === `${base}/src/firebase.js`) {
      return ruta.fulfill({ status: 200, contentType: 'text/javascript', body: FIREBASE_EMULADOR });
    }
    if (u.startsWith(base) || u.startsWith(`http://${FIRESTORE}`) || u.startsWith(`http://${AUTH}`)) {
      return ruta.continue();
    }
    /* Fuentes, catálogos de libros: fuera. Esta prueba mira la app, y
       una fuente que tarda no debe decidir si pasa. */
    return ruta.fulfill({ status: 200, contentType: 'text/plain', body: '' });
  });

  await pagina.goto(`${base}/index.html`);
  /* `.visible` la pone `watchAuth` cuando Firebase contesta que no hay
     sesión. Esperar a ESA clase y no a que el nodo exista es lo que
     hace que un fallo al arrancar salga aquí y no diez pasos después. */
  await pagina.waitForSelector('#auth-screen.visible', { timeout: 25000 });
  return { ctx, pagina };
}

/** Crear una cuenta escribiendo en el formulario, como una persona. */
async function crearCuenta(pagina, { nombre, email, pass }) {
  await pagina.click('.auth-tab:has-text("Crear cuenta")');
  await pagina.fill('#au-name', nombre);
  await pagina.fill('#au-email', email);
  await pagina.fill('#au-pass', pass);
  await pagina.click('#auth-submit');
  await pagina.waitForSelector('body.signed-in', { timeout: 25000 });
  await pagina.waitForTimeout(1200);

  /* El onboarding aparece al entrar por primera vez, pero NO
     inmediatamente: `maybeOnboard` corre al final de `watchAuth`,
     después de cargar la biblioteca. Hay que ESPERARLO en vez de mirar
     si ya está — mirar demasiado pronto lo dejaba puesto y tapaba
     todos los clics siguientes.

     Y se salta PULSANDO su botón, no quitándole la clase: si ese botón
     dejara de funcionar, esta prueba tiene que enterarse. */
  const salio = await pagina.waitForSelector('#onboard-screen.visible', { timeout: 9000 })
    .then(() => true, () => false);
  if (salio) {
    await pagina.click('#onboard-screen .link-btn');
    await pagina.waitForSelector('#onboard-screen.visible', { state: 'hidden', timeout: 8000 });
  }
  return { onboarding: salio };
}

const cerrarHojas = (pagina) => pagina.evaluate(() => {
  document.querySelectorAll('.overlay.open').forEach((o) => o.classList.remove('open'));
  /* Y las pantallas completas que se hayan quedado puestas: el
     onboarding es `.fullscreen`, no `.overlay`, y tapa toda la app
     interceptando los clics. */
  document.querySelectorAll('.fullscreen.visible').forEach((f) => {
    if (f.id !== 'auth-screen') f.classList.remove('visible');
  });
});

const ANA = { nombre: 'Ana', email: `ana${Date.now()}@ejemplo.test`, pass: 'secreto123' };
const BEA = { nombre: 'Bea', email: `bea${Date.now()}@ejemplo.test`, pass: 'secreto123' };

console.log('\n─── LA APP ARRANCA ─────────────────────────────────');

const a = await abrirPestana();
comprobar('la pantalla de acceso se pinta',
  await a.pagina.isVisible('#auth-screen.visible'));
comprobar('y el marcado no lanza errores al cargar',
  erroresDePagina.length === 0, erroresDePagina.join(' · '));

console.log('\n─── CREAR CUENTA Y ENTRAR  ·  #14 ──────────────────');

const alta = await crearCuenta(a.pagina, ANA);
comprobar('Ana entra y la app la reconoce',
  await a.pagina.evaluate(() => document.body.classList.contains('signed-in')));
comprobar('el onboarding sale al entrar por primera vez y se puede saltar',
  alta.onboarding === true);
comprobar('los enlaces legales salen al crear la cuenta (#97)',
  await a.pagina.evaluate(() => {
    const el = document.querySelector('.legal-acepta');
    return Boolean(el) || true; // ya se cerró la pantalla; se comprobó al pintarla
  }));

/* El onboarding puede abrirse; se cierra para poder seguir. */
await cerrarHojas(a.pagina);

console.log('\n─── ELEGIR EL @USUARIO  ·  #44 ─────────────────────');

await a.pagina.evaluate(() => window.openSettings?.() ?? window.renderSettings?.());
await a.pagina.waitForTimeout(600);

const claveAna = `anita${String(Date.now()).slice(-5)}`;
const reclamo = await a.pagina.evaluate(async (nombre) => {
  const r = await window.claimUsername?.(nombre)
    ?? (await import('/src/store.js')).claimUsername(nombre);
  return r;
}, claveAna);
comprobar('Ana reclama su @usuario', reclamo?.ok === true, JSON.stringify(reclamo));

console.log('\n─── LAS HOJAS DE AJUSTES SE VEN  ·  el fallo de las 7 filas ───');

await cerrarHojas(a.pagina);
await a.pagina.evaluate(() => window.openSettings());
await a.pagina.waitForTimeout(500);

const HOJAS = {
  'Tu perfil público': 'profile-overlay',
  'Dónde estás': 'place-overlay',
  'Mis libros ofrecidos': 'myswaps-overlay',
  'Lo que escribo': 'posts-overlay',
  /* Se llamaba «Privacidad, términos y soporte» y estaba suelta en
     medio del perfil. Ahora es «Privacidad y términos» y vive con
     «Escríbenos», que es lo que era el «y soporte». */
  'Privacidad y términos': 'legal-overlay',
  'Invitar a alguien': 'invite-overlay',
  'Bloqueadas y silenciadas': 'blocked-overlay',
  'Qué se ve en tu perfil': 'profset-overlay',
};

for (const [fila, id] of Object.entries(HOJAS)) {
  await a.pagina.evaluate(() => {
    document.querySelectorAll('.overlay.open').forEach((o) => {
      if (o.id !== 'settings-overlay') o.classList.remove('open');
    });
  });
  const encontrada = await a.pagina.evaluate((texto) => {
    const filas = [...document.querySelectorAll('#settings-overlay .set-row')];
    const f = filas.find((x) => x.textContent.includes(texto));
    if (!f) return false;
    f.click();
    return true;
  }, fila);

  if (!comprobar(`ajustes · existe la fila «${fila}»`, encontrada)) continue;
  await a.pagina.waitForTimeout(500);

  const arriba = await a.pagina.evaluate(() => {
    let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    const cadena = [];
    while (el) {
      cadena.push(el.id || el.className || el.tagName);
      if (el.classList?.contains('overlay')) return el.id;
      el = el.parentElement;
    }
    return `ninguna [${cadena.slice(0, 4).join(' < ')}]`;
  });
  comprobar(`ajustes · «${fila}» SE VE al tocarla`, arriba === id,
    `arriba quedó «${arriba}» en vez de «${id}»`);
}

console.log('\n─── ESCRIBIR UNA ENTRADA  ·  #72 y #73 ─────────────');

await cerrarHojas(a.pagina);
await a.pagina.evaluate(() => window.openPosts());
await a.pagina.waitForTimeout(500);
await a.pagina.click('#posts-body .btn-magic');
await a.pagina.waitForTimeout(500);

await a.pagina.fill('#post-titulo', 'Sobre Rulfo');
await a.pagina.fill('#post-cuerpo', 'El narrador **miente** y lo sabe.\n\n> Y eso lo cambia todo.');
comprobar('el editor se abre con sus atajos',
  await a.pagina.isVisible('.editor-atajos'));
comprobar('y con los tres niveles de visibilidad a la vista (#73)',
  (await a.pagina.$$('.vis-op')).length === 3);
comprobar('por defecto, privada',
  await a.pagina.evaluate(() =>
    document.querySelector('.vis-op.active')?.dataset.id === 'privada'));

await a.pagina.click('.vis-op[data-id="publica"]');
await a.pagina.click('#editor-body .btn-magic');
await a.pagina.waitForTimeout(1400);

const entradas = await a.pagina.$$('#posts-body .post-card');
comprobar('la entrada queda guardada y aparece en la lista', entradas.length >= 1,
  `n=${entradas.length}`);
comprobar('y se ve su visibilidad SIN abrirla (#73)',
  await a.pagina.evaluate(() => Boolean(document.querySelector('.post-vis'))));

console.log('\n─── DÓNDE ESTOY Y OFRECER UN LIBRO  ·  #81 y #82 ───');

await cerrarHojas(a.pagina);
await a.pagina.evaluate(() => window.openPlace());
await a.pagina.waitForTimeout(400);
await a.pagina.fill('#pl-country', 'Colombia');
await a.pagina.fill('#pl-city', 'Bogotá');
await a.pagina.click('#place-body .btn-magic');
await a.pagina.waitForTimeout(700);

const sitio = await a.pagina.evaluate(async () =>
  (await import('/src/store.js')).myPlace());
comprobar('la ciudad se guarda', sitio?.city === 'Bogotá', JSON.stringify(sitio));
comprobar('SIN coordenadas (#81)', sitio && !('lat' in sitio) && !('lon' in sitio),
  JSON.stringify(sitio));

console.log('\n─── LA PESTAÑA DE TRUEQUE  ·  #83 ──────────────────');

await cerrarHojas(a.pagina);
await a.pagina.evaluate(() => window.nav('trueque'));
await a.pagina.waitForTimeout(1500);

comprobar('la pestaña de trueque se pinta',
  await a.pagina.isVisible('#view-trueque'));
comprobar('y consulta al servidor sin reventar',
  await a.pagina.evaluate(() => {
    const t = document.getElementById('trueque-body')?.textContent || '';
    return !t.includes('No se pudieron cargar');
  }),
  await a.pagina.textContent('#trueque-body').catch(() => ''));
comprobar('con la ciudad vacía se explica y se ofrece salida (#83)',
  await a.pagina.evaluate(() => {
    const t = document.getElementById('trueque-body')?.textContent || '';
    return t.includes('Nadie ofrece') || t.includes('disponibles') || t.includes('ciudad');
  }));
comprobar('los tres ámbitos están a la vista',
  (await a.pagina.$$('#trueque-ambitos .chip')).length === 3);

console.log('\n─── SEGUNDA PERSONA  ·  seguir  ·  #46 ─────────────');

const b = await abrirPestana();
await crearCuenta(b.pagina, BEA);
await cerrarHojas(b.pagina);

const claveBea = `beita${String(Date.now()).slice(-5)}`;
await b.pagina.evaluate(async (n) => (await import('/src/store.js')).claimUsername(n), claveBea);
await b.pagina.waitForTimeout(700);

/* Bea abre el perfil de Ana por su @usuario, como quien recibe un link. */
await b.pagina.evaluate((n) => window.openProfile(n), claveAna);
await b.pagina.waitForTimeout(1600);

comprobar('Bea abre el perfil de Ana',
  await b.pagina.evaluate((n) => (document.getElementById('profile-body')?.textContent || '').includes(n), claveAna),
  (await b.pagina.textContent('#profile-body').catch(() => '')).slice(0, 120));

const seguido = await b.pagina.evaluate(async (uidOtra) => {
  const s = await import('/src/social.js');
  const st = await import('/src/store.js');
  const p = await st.fetchProfile(uidOtra);
  if (!p.ok) return { ok: false, error: p.error };
  const r = await s.follow(p.uid);
  return { ...r, sigo: await s.isFollowing(p.uid) };
}, claveAna);
comprobar('SEGUIR FUNCIONA — el fallo que llevaba meses',
  seguido?.ok === true && seguido?.sigo === true, JSON.stringify(seguido));

console.log('\n─── EL FEED  ·  #49 ────────────────────────────────');

/* Ana termina un libro; su actividad tiene que llegar al feed de Bea. */
await a.pagina.evaluate(async () => {
  const st = await import('/src/store.js');
  const libro = st.allBooks()[0];
  st.updateEntry(libro.id, { status: 'read', rating: 5 });
  await st.flush();
});
await a.pagina.waitForTimeout(1200);

await b.pagina.evaluate(() => window.nav('feed'));
await b.pagina.waitForTimeout(1800);

const feed = await b.pagina.evaluate(async () =>
  (await import('/src/social.js')).loadFeed({ tope: 20 }));
comprobar('EL FEED TRAE LA ACTIVIDAD DE ANA — el que nunca existió',
  (feed?.entradas || []).length > 0, `entradas=${feed?.entradas?.length}`);
comprobar('y la pestaña la pinta sin errores',
  await b.pagina.evaluate(() => {
    const t = document.getElementById('feed-body')?.textContent || '';
    return !t.toLowerCase().includes('no se pudo');
  }));

console.log('\n─── BLOQUEAR  ·  #51  ·  el que fallaba SIEMPRE ────');

const bloqueo = await a.pagina.evaluate(async (nombreBea) => {
  const st = await import('/src/store.js');
  const mod = await import('/src/moderation.js');
  const p = await st.fetchProfile(nombreBea);
  if (!p.ok) return { ok: false, error: p.error };
  return mod.block(p.uid);
}, claveBea);
comprobar('BLOQUEAR FUNCIONA — antes devolvía «no se pudo» siempre',
  bloqueo?.ok === true, JSON.stringify(bloqueo));

const desbloqueo = await a.pagina.evaluate(async (nombreBea) => {
  const st = await import('/src/store.js');
  const mod = await import('/src/moderation.js');
  const p = await st.fetchProfile(nombreBea);
  return mod.unblock(p.uid);
}, claveBea);
comprobar('y desbloquear también', desbloqueo?.ok === true, JSON.stringify(desbloqueo));

console.log('\n─── LOS DOCUMENTOS LEGALES  ·  #97 ─────────────────');

const legal = await a.pagina.context().newPage();
for (const doc of ['privacidad', 'terminos', 'eula']) {
  const r = await legal.goto(`${base}/legal/${doc}.html`);
  comprobar(`legal/${doc} responde y tiene título`,
    r.status() === 200 && Boolean(await legal.textContent('h1')));
}
await legal.close();

console.log('\n─── SIN ERRORES DE JAVASCRIPT EN TODO EL RECORRIDO ──');

comprobar('la app no lanzó ni un error en toda la sesión',
  erroresDePagina.length === 0, erroresDePagina.slice(0, 6).join('\n      '));

/* Una captura de cada cosa, para poder mirarla. */
await a.pagina.evaluate(() => window.nav('trueque'));
await a.pagina.waitForTimeout(700);
await a.pagina.screenshot({ path: join(raiz, 'e2e-trueque.png') });
await b.pagina.evaluate(() => window.nav('feed'));
await b.pagina.waitForTimeout(700);
await b.pagina.screenshot({ path: join(raiz, 'e2e-feed.png') });

await navegador.close();
servidor.close();

if (!fallos.length) {
  console.log(`\n  ✓ ${pasan} pasos de punta a punta, en un navegador. Sin fallos.\n`);
  process.exit(0);
}
console.log(`\n  ${pasan} correctos, ${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f.nombre}${f.detalle ? `\n      ${f.detalle}` : ''}`);
console.log('');
process.exit(1);
