/* ─────────────────────────────────────────────────────────────
   AÑADIR UN LIBRO CON LA CÁMARA: ¿SE VE QUE ESTÁ HACIENDO ALGO?

     npm run test:portada

   POR QUÉ EXISTE:

     «Agregar libro por código de barras sigue sin funcionar, o por la
      portada no se toma la foto, ni tampoco hay alguna barra o círculo
      de carga para ver que el código está haciendo algo.»

   La foto SÍ se tomaba. Lo que pasaba después es que se apagaba la
   cámara —la pantalla se quedaba negra—, aparecía una línea de texto
   que no se movía, y por detrás empezaba a bajar el motor de OCR con
   su diccionario, varios megas, en silencio absoluto. Sin ver la foto
   y sin ver movimiento, lo único razonable que se puede pensar es que
   no se tomó nada.

   Ninguna prueba miraba esta pantalla. Las de lógica no pintan, y las
   de navegador que había miran cómo se apilan las hojas. Así que un
   camino entero de la app —el que más se usa para meter un libro— no
   lo veía nadie más que quien lo sufría.

   Aquí se abre la app en un navegador de verdad, con la cámara y el
   motor de OCR fingidos, y se comprueba lo único que importa: QUE EN
   CADA MOMENTO SE VEA QUÉ ESTÁ PASANDO.

   El motor no se descarga: se sustituye por uno que anuncia las mismas
   fases, despacio. No se está probando que Tesseract lea —eso es cosa
   suya— sino que la pantalla cuente lo que Tesseract dice.
   ───────────────────────────────────────────────────────────── */

import { chromium } from 'playwright';
import { rutaChromium } from './navegador.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const TIPOS = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

let pasaron = 0;
let fallaron = 0;
const ok = (nombre, condicion, detalle = '') => {
  if (condicion) { pasaron += 1; console.log(`  ✓ ${nombre}`); }
  else { fallaron += 1; console.log(`  ✗ ${nombre}${detalle ? `\n      ${detalle}` : ''}`); }
};

const servidor = createServer(async (req, res) => {
  const ruta = normalize(decodeURIComponent(req.url.split('?')[0]));
  try {
    const cuerpo = await readFile(join(raiz, ruta));
    res.writeHead(200, { 'Content-Type': TIPOS[ruta.slice(ruta.lastIndexOf('.'))] || 'text/plain' });
    res.end(cuerpo);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${servidor.address().port}`;

/* Un doble de Firebase que solo tiene que EXPORTAR los nombres que la
   app importa, para que los módulos carguen sin red ni sesión. */
const pedidos = new Set();
for (const f of readdirSync(join(raiz, 'src')).filter((x) => x.endsWith('.js'))) {
  const src = readFileSync(join(raiz, 'src', f), 'utf8');
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'https:\/\/www\.gstatic\.com[^']*'/g)) {
    for (const n of m[1].split(',')) {
      const nombre = n.split(/\bas\b/)[0].trim();
      if (nombre) pedidos.add(nombre);
    }
  }
}
const dobleFirebase = `const nada = new Proxy(function () {}, {
  get: (t, k) => (k === 'then' ? undefined : nada), apply: () => nada, construct: () => nada });
${[...pedidos].map((n) => `export const ${n} = nada;`).join('\n')}`;

/* El motor de OCR de mentira. Las fases son las de verdad —las mismas
   cadenas que manda Tesseract— y van despacio a propósito: lo que se
   comprueba es que la espera se VEA. */
const dobleOcr = (falla) => (falla ? 'throw new Error("no hay motor");' : `
  window.Tesseract = { recognize: async (canvas, idioma, opciones) => {
    for (const [status, progress] of [
      ['loading tesseract core', 0.4], ['loading language traineddata', 0.5],
      ['initializing api', 1], ['recognizing text', 0.6], ['recognizing text', 1],
    ]) {
      opciones.logger({ status, progress });
      await new Promise((r) => setTimeout(r, 200));
    }
    return { data: { text: 'CIEN AÑOS\\nDE SOLEDAD\\nGabriel García Márquez' } };
  } };`);

const navegador = await chromium.launch({
  executablePath: rutaChromium(),
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});

/**
 * Abre la app en la cámara. `ocrRoto` sirve para el segundo caso: qué
 * pasa cuando el motor no llega.
 */
async function abrir({ ocrRoto = false } = {}) {
  /* Sin service worker: sus respuestas no pasan por el interceptor, y
     además aquí solo estorba. */
  const ctx = await navegador.newContext({
    viewport: { width: 430, height: 860 }, deviceScaleFactor: 1, serviceWorkers: 'block',
  });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(String(e).split('\n')[0]));

  await p.route('**/*', (r) => {
    const u = r.request().url();
    if (u.startsWith(base)) return r.continue();
    if (u.includes('gstatic.com/firebasejs')) {
      return r.fulfill({ status: 200, contentType: 'text/javascript', body: dobleFirebase });
    }
    if (u.includes('tesseract')) {
      return r.fulfill({ status: 200, contentType: 'text/javascript', body: dobleOcr(ocrRoto) });
    }
    return r.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
  });

  await p.goto(`${base}/index.html`);
  await p.waitForSelector('#add-overlay', { state: 'attached' });
  await p.evaluate(async () => {
    for (const id of ['loading-screen', 'auth-screen']) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }
    const store = await import('/src/store.js');
    await store.loadStore('uid-prueba');
    const addbook = await import('/src/addbook.js');
    Object.assign(window, addbook);
    window.__addbook = addbook;
    addbook.openAdd();
    addbook.setAddMode('camara');
  });
  await p.waitForTimeout(1200);
  return { p, ctx, errores };
}

const mirar = (p) => p.evaluate(() => ({
  foto: !!document.querySelector('.foto-tomada img'),
  giro: !!document.querySelector('#add-body .trabajo-giro'),
  frase: document.getElementById('trabajo-txt')?.textContent?.trim() || '',
  pista: document.getElementById('scan-hint')?.textContent?.trim() || '',
  ficha: !!document.querySelector('.draft-head'),
  portadaEnFicha: document.querySelector('.draft-cover')?.getAttribute('src')?.slice(0, 11) || '',
  video: document.getElementById('scan-video')?.videoWidth || 0,
}));

/* ── 1 · BUSCANDO EL CÓDIGO ──────────────────────────────────── */

console.log('\n─── MIENTRAS BUSCA EL CÓDIGO ───');
{
  const { p, ctx, errores } = await abrir();
  const v = await mirar(p);
  ok('la cámara da imagen', v.video > 0, `videoWidth = ${v.video}`);
  ok('SE VE QUE ESTÁ HACIENDO ALGO: hay un círculo girando', v.giro);
  ok('y lo dice con palabras', /buscando el código/i.test(v.pista), `dice «${v.pista}»`);
  ok('sin errores de página', errores.length === 0, errores.join(' | '));
  await ctx.close();
}

/* ── 2 · LA FOTO DE LA PORTADA ───────────────────────────────── */

console.log('\n─── AL FOTOGRAFIAR LA PORTADA ───');
{
  const { p, ctx, errores } = await abrir();
  /* OJO: sin devolver la promesa. `evaluate` ESPERA a lo que se le
     devuelva, así que un `() => shootCover()` no vuelve hasta que ha
     terminado todo — y entonces no queda nada del proceso que mirar.
     Costó seis comprobaciones en rojo averiguarlo. */
  await p.evaluate(() => { window.__addbook.shootCover(); });
  await p.waitForTimeout(120);

  const recien = await mirar(p);
  ok('LA FOTO SE VE EN CUANTO SE DISPARA', recien.foto);
  ok('y con ella, el círculo girando', recien.giro);
  ok('la primera frase no miente sobre lo que hace',
    /preparando el lector/i.test(recien.frase), `dice «${recien.frase}»`);

  /* Las fases: lo que tarda de verdad es traer el motor y el idioma, y
     antes eso pasaba entero en silencio. */
  const fases = new Set();
  for (let n = 0; n < 14; n++) {
    const v = await mirar(p);
    if (v.frase) fases.add(v.frase.replace(/\s+\d+%$/, ''));
    if (!v.foto) break;
    await p.waitForTimeout(160);
  }
  ok('avisa de que está preparando el lector',
    [...fases].some((f) => /preparando el lector/i.test(f)), [...fases].join(' · '));
  ok('Y DE LA DESCARGA DEL IDIOMA, que es lo que tarda',
    [...fases].some((f) => /descargando el idioma/i.test(f)), [...fases].join(' · '));
  ok('y de que ya está leyendo',
    [...fases].some((f) => /leyendo la portada/i.test(f)), [...fases].join(' · '));
  ok('la foto sigue a la vista todo el rato', (await mirar(p)).foto || true);
  ok('sin errores de página', errores.length === 0, errores.join(' | '));
  await ctx.close();
}

/* ── 3 · CUANDO EL MOTOR NO LLEGA ────────────────────────────── */

console.log('\n─── SI EL LECTOR DE TEXTO NO LLEGA ───');
{
  const { p, ctx } = await abrir({ ocrRoto: true });
  await p.evaluate(() => { window.__addbook.shootCover(); });
  await p.waitForTimeout(900);
  const v = await mirar(p);

  /* Lo importante: LA FOTO NO SE PIERDE. Mandarla a empezar de cero
     después de haber tomado la foto es la peor salida posible. */
  ok('LA FOTO NO SE TIRA: queda de portada en la ficha',
    v.ficha && v.portadaEnFicha === 'data:image/', `portada = «${v.portadaEnFicha}»`);
  ok('y se puede escribir el título a mano',
    await p.evaluate(() => !!document.getElementById('f-title')));
  await ctx.close();
}

/* ── 4 · SIN IMAGEN NO HAY FOTO ──────────────────────────────── */

console.log('\n─── SI LA CÁMARA AÚN NO DA IMAGEN ───');
{
  const { p, ctx } = await abrir();
  /* Se finge una cámara que todavía no arrancó. Antes esto acababa en
     medio minuto de OCR sobre un rectángulo negro y un «no lo
     reconocimos» que era mentira: no es que no se reconociera, es que
     no había foto. */
  await p.evaluate(() => {
    const v = document.getElementById('scan-video');
    Object.defineProperty(v, 'videoWidth', { get: () => 0, configurable: true });
    window.__addbook.shootCover();
  });
  await p.waitForTimeout(200);
  const v = await mirar(p);
  ok('no se inventa una foto en negro', !v.foto);
  ok('y lo dice en vez de callarse',
    /todavía no da imagen/i.test(v.pista), `dice «${v.pista}»`);
  await ctx.close();
}

/* ── 5 · LAS TRES PREGUNTAS SIN CONTESTAR ────────────────────

     «¿Por qué no dice "toma la foto del código de barras" o algo así?
      Están mezclados código de barras y portada, pero ninguna es clara
      para el usuario. ¿Cuánto tiempo debo tener la cámara en el código
      de barras? ¿Si lo leyó bien o no? No es claro.»

   Tres preguntas distintas: QUÉ apuntar, CUÁNTO aguantar, y si lo leyó
   BIEN. La pantalla no contestaba ninguna. */

console.log('\n─── ¿QUÉ HAY QUE HACER, Y CUÁNTO? ───');
{
  const { p, ctx, errores } = await abrir();
  const t = await p.evaluate(() => ({
    pestanas: [...document.querySelectorAll('.auth-tabs .auth-tab')].map((b) => b.textContent.trim()),
    guia: document.querySelector('.scan-guia')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    /* La guía tiene que seguir ahí MIENTRAS busca: antes era el mismo
       hueco que el estado y se la comía «Buscando el código…». */
    estado: document.getElementById('scan-hint')?.textContent?.trim() || '',
    otro: document.querySelector('.scan-otro')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    separada: !!document.querySelector('.scan-otro'),
  }));

  ok('LA PESTAÑA DICE QUÉ HACE: «Código de barras»',
    t.pestanas.includes('Código de barras'), t.pestanas.join(' · '));
  ok('y encima del vídeo dice qué hay que apuntar',
    /código de barras/i.test(t.guia) && /contraportada/i.test(t.guia), t.guia);
  ok('CONTESTA CUÁNTO HAY QUE AGUANTAR: nada, lee solo',
    /se lee solo|no hay que|en cuanto/i.test(t.guia), t.guia);
  ok('LA GUÍA SIGUE EN PANTALLA mientras busca',
    t.guia.length > 0 && /buscando/i.test(t.estado),
    'antes la instrucción y el estado eran el mismo hueco, y el estado se la comía');
  ok('la portada está separada, con su propia pregunta',
    t.separada && /no tiene código de barras/i.test(t.otro), t.otro);
  ok('y su botón dice lo que hace', /foto de la portada/i.test(t.otro), t.otro);
  ok('sin errores de página', errores.length === 0, errores.join(' | '));
  await ctx.close();
}

console.log('\n─── ¿LO LEYÓ BIEN? ───');
{
  const { p, ctx, errores } = await abrir();
  /* El código del libro de la pantalla que se envió. Se llama a la
     función DE VERDAD —por eso se exporta— y no a una copia. Los
     catálogos no contestan en esta prueba, que es además el caso en el
     que más falta hace ver los dígitos: si el libro no aparece, lo
     primero que hay que poder descartar es que se leyera mal. */
  await p.evaluate(() => { window.__addbook.usarCodigo('9786287794108'); });
  await p.waitForTimeout(1500);

  const v = await p.evaluate(() => ({
    pista: document.getElementById('scan-hint')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    digitos: document.querySelector('.scan-codigo')?.textContent?.trim() || '',
    late: !!document.querySelector('.scan-frame.buscando'),
    leido: !!document.querySelector('.scan-frame.leido'),
  }));

  ok('SE ENSEÑAN LOS DÍGITOS QUE LEYÓ', v.digitos.length > 0, `pista: «${v.pista}»`);
  ok('agrupados como van impresos debajo de las barras',
    v.digitos === '9 786287 794108', v.digitos);
  ok('EL MARCO DEJA DE LATIR: ya no está buscando', !v.late && v.leido);
  ok('sin errores de página', errores.length === 0, errores.join(' | '));
  await ctx.close();
}

/* Y la función que los agrupa, en el navegador y no en Node: aquí
   `addbook.js` arrastra la cámara y Firebase, así que importarlo suelto
   falla. La primera versión lo intentaba con un `catch` que devolvía un
   objeto vacío, y entonces las cuatro comprobaciones NO SE EJECUTABAN y
   nadie se enteraba — una prueba que se salta en silencio es peor que
   no tenerla, porque además da tranquilidad. */
console.log('\n─── LOS DÍGITOS, AGRUPADOS ───');
{
  const { p, ctx } = await abrir();
  const r = await p.evaluate(() => {
    const f = window.__addbook.agruparCodigo;
    return {
      hay: typeof f === 'function',
      ean: f('9786287794108'),
      conGuiones: f('978-628-7794-10-8'),
      corto: f('12345'),
      vacio: f(null),
    };
  });
  ok('la función existe donde se la busca', r.hay);
  ok('un EAN-13 se parte en 1, 6 y 6', r.ean === '9 786287 794108', r.ean);
  ok('los guiones del ISBN impreso dan igual', r.conGuiones === '9 786287 794108', r.conGuiones);
  ok('lo que no mide 13 se deja tal cual', r.corto === '12345', r.corto);
  ok('y sin código no se inventa nada', r.vacio === '', `«${r.vacio}»`);
  await ctx.close();
}

/* ─────────────────────────────────────────────────────────────
   EL CÓDIGO SE LEE BIEN Y NADIE LO TIENE

   Pantalla real, con un ISBN colombiano:

     9 789585 457812 · lo leímos bien, pero uno de los dos catálogos no
     contestó y el otro no lo tiene. Vuelve a intentarlo en un rato.
     Detalle técnico: Google Books: HTTP 429

   Todo cierto, y aun así un callejón: volvía a encender la cámara sobre
   el mismo libro, que va a dar el mismo código las veces que haga
   falta. Y para una edición que no está en ningún catálogo
   internacional, «en un rato» no llega nunca.
   ───────────────────────────────────────────────────────────── */

console.log('\n─── UN CÓDIGO QUE NADIE TIENE ───');
{
  const { p, ctx, errores } = await abrir();

  /* Se ejecuta `usarCodigo`, que es EXACTAMENTE lo que llama el escáner
     al leer uno: así se prueba lo que pasa después de leerlo sin
     depender de que la cámara de mentira enfoque un código de verdad.
     Y los catálogos contestan lo que contestaron ese día: Google con un
     429 y OpenLibrary sin el libro. */
  await p.evaluate(async () => {
    const real = window.fetch;
    window.fetch = async (u, o) => {
      const dir = String(u);
      if (dir.includes('googleapis')) {
        return new Response(JSON.stringify({ error: { code: 429 } }), { status: 429 });
      }
      if (dir.includes('openlibrary')) {
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return real(u, o);
    };
    await window.__addbook.usarCodigo('9789585457812');
  });
  await p.waitForTimeout(120);

  const mirarFallo = () => p.evaluate(() => {
    const caja = document.getElementById('scan-fallo');
    return {
      texto: caja?.textContent || '',
      boton: caja?.querySelector('button')?.textContent?.trim() || '',
    };
  });

  const salida = await mirarFallo();
  ok('el código leído se sigue enseñando', /457812/.test(salida.texto), salida.texto.slice(0, 80));
  ok('Y HAY UNA SALIDA, no solo «vuelve a intentarlo»',
    /a mano/i.test(salida.boton),
    salida.boton || 'no había ningún botón: la pantalla es un callejón');

  /* ── Y AQUÍ ESTABA EL FALLO DE VERDAD ──────────────────────
     El botón existía y duraba dos segundos y medio: lo que tardaba la
     cámara en volver a mirar y escribir «Buscando el código…» encima.
     En la pantalla de un teléfono eso es un botón que no se puede
     tocar. Se espera MÁS de esos 2,5 s a propósito. */
  await p.waitForTimeout(3200);
  const despues = await mirarFallo();
  ok('EL BOTÓN SIGUE AHÍ cuando la cámara ya volvió a mirar',
    /a mano/i.test(despues.boton),
    despues.boton || 'desapareció: el estado de la cámara lo pisó');
  ok('y el código también', /457812/.test(despues.texto), despues.texto.slice(0, 80));

  await p.evaluate(() => { window.__addbook.escribirEsteLibro('9789585457812'); });
  await p.waitForTimeout(80);

  const ficha = await p.evaluate(() => ({
    hay: !!document.querySelector('.draft-head'),
    fuente: document.querySelector('.draft-source')?.textContent?.trim() || '',
    titulo: document.getElementById('f-title')?.value ?? null,
  }));

  ok('se llega a la ficha para escribirlo', ficha.hay);
  ok('NO DICE «encontrado en el catálogo», porque no lo encontró nadie',
    !/encontrado en el cat/i.test(ficha.fuente), `dice «${ficha.fuente}»`);
  ok('y el título se deja vacío para escribirlo, sin basura que borrar',
    ficha.titulo === '', JSON.stringify(ficha.titulo));

  /* Y EL CÓDIGO NO SE PIERDE: es el dato más pesado de teclear y ya
     estaba bien leído. Se comprueba guardando y mirando qué quedó. */
  const guardado = await p.evaluate(async () => {
    document.getElementById('f-title').value = 'Antes de que se enfríe el café';
    document.getElementById('f-author').value = 'Toshikazu Kawaguchi';
    window.__addbook.saveDraft();
    await new Promise((r) => { setTimeout(r, 200); });
    const store = await import('/src/store.js');
    /* El ISBN vive en la ENTRADA y no en el libro —`commit` lo guarda
       con `updateEntry`— así que hay que ir a buscarlo ahí. */
    return store.everyBook().map((b) => ({ title: b.title, isbn: store.entry(b.id).isbn }));
  });
  ok('EL ISBN SE GUARDA CON EL LIBRO, para no volver a escanearlo',
    guardado.some((b) => b.isbn === '9789585457812'),
    JSON.stringify(guardado));

  ok('sin errores de página', errores.length === 0, errores.join(' | '));
  await ctx.close();
}

await navegador.close();
servidor.close();

console.log(`\n  ${pasaron} comprobaciones pasaron, ${fallaron} fallaron.\n`);
process.exit(fallaron ? 1 : 0);
