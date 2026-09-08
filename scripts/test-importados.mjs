/* ─────────────────────────────────────────────────────────────
   ¿EXISTE LO QUE SE LLAMA?

     npm run test:importados

   POR QUÉ EXISTE:

     «Botón de cuál primero no funciona.»

   Y no funcionaba de la peor manera posible: NO PASABA NADA. Ni un
   error, ni una hoja a medias, ni un mensaje. Tocabas y nada.

   La causa era una línea de `duel.js`:

       <span class="search-icon">${ico('lupa')}</span>

   con `ico` sin importar en ese fichero. Al tocar el botón, `openDuel`
   llamaba a `pintar()`, `pintar()` reventaba con un ReferenceError, y
   la excepción se llevaba por delante la línea siguiente — la que abre
   la hoja. El botón estaba bien cableado; el módulo compilaba; la
   función existía en `window`. Simplemente moría por dentro antes de
   llegar a hacer nada.

   Y NADA DE LO QUE HABÍA PODÍA VERLO. `test:sintaxis` PARSEA los
   módulos, y esto parsea perfectamente: `ico(...)` es una llamada
   válida a algo que ya se verá si existe — JavaScript no lo resuelve
   hasta que ejecuta esa línea. `test:clases` lee texto. Y las pruebas
   que importan módulos importan los `-core`, que son puros y no pintan
   nada. Un fichero puede compilar, desplegarse en verde y estar roto.

   ── LAS DOS MITADES DE «EL BOTÓN NO HACE NADA» ──────────────

   Un botón de esta app cruza dos ámbitos distintos, y puede romperse
   en cada uno:

     · el `onclick="openDuel()"` del marcado llama a algo que tiene que
       estar en `window`, y ahí lo pone `main.js`;
     · dentro de esa función, el código llama a cosas que tienen que
       estar IMPORTADAS en su fichero.

   Aquí se comprueban las dos. La segunda es la que falló esta vez.

   ── CÓMO SE DISTINGUE EL CÓDIGO DEL TEXTO ───────────────────

   El primer intento buscaba `nombre(` con una expresión regular y
   sacó 72 avisos: uno de verdad y setenta y uno de mentira. Todos los
   falsos eran lo mismo — TEXTO que se parece a código:

       `linear-gradient(…)`, `rgba(…)`, `translate(…)` en CSS y SVG;
       `«mes (…)»` en una frase; `onclick="openProfile(…)"`, que es
       marcado y no código de este fichero.

   Así que no se usa una expresión regular para eso: se recorre el
   fichero carácter a carácter llevando la cuenta de dónde estamos —
   código, comentario, comilla, plantilla— y se vacía el CONTENIDO de
   las cadenas, dejando lo de dentro de un `${…}`, que sí es código.
   Los `on…="…"` del marcado se guardan aparte, para la otra mitad.

   ── Y POR QUÉ NO GRITA EN FALSO ─────────────────────────────

   La lista de «lo que este fichero tiene a mano» peca de GENEROSA a
   propósito: cualquier nombre en una posición que PUEDA ser una
   declaración cuenta como declarado. Si se cuela ahí uno de más, esta
   prueba deja pasar un fallo — malo, pero se descubre con el
   siguiente. Si faltara, gritaría en falso sobre código correcto, y a
   un guardián que grita en falso lo apaga alguien en una semana.
   Entre las dos formas de equivocarse, siempre la callada.
   ───────────────────────────────────────────────────────────── */

import { readdirSync, readFileSync } from 'node:fs';

/* Lo que el navegador ya te da. No hace falta que sea exhaustiva: lo
   que falte y se use de verdad sale la primera vez que se pasa la
   prueba, y se añade aquí. */
const DEL_NAVEGADOR = new Set([
  // del lenguaje
  'Array', 'Object', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt',
  'Math', 'JSON', 'Date', 'RegExp', 'Error', 'TypeError', 'RangeError',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Proxy', 'Reflect',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent',
  'decodeURIComponent', 'encodeURI', 'decodeURI', 'structuredClone',
  'Intl', 'Function', 'globalThis', 'queueMicrotask',
  // del navegador
  'window', 'document', 'console', 'fetch', 'alert', 'confirm', 'prompt',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback',
  'localStorage', 'sessionStorage', 'location', 'navigator', 'history',
  'Image', 'Audio', 'Blob', 'File', 'FileReader', 'FormData', 'Headers',
  'Request', 'Response', 'URL', 'URLSearchParams', 'AbortController',
  'Event', 'CustomEvent', 'MutationObserver', 'IntersectionObserver',
  'ResizeObserver', 'BroadcastChannel', 'Notification', 'WebSocket',
  'ImageData', 'OffscreenCanvas', 'createImageBitmap', 'BarcodeDetector',
  'atob', 'btoa', 'crypto', 'matchMedia', 'getComputedStyle', 'scrollTo',
  'open', 'close', 'print', 'postMessage', 'addEventListener',
  'removeEventListener', 'DOMParser', 'TextEncoder', 'TextDecoder',
  'Uint8Array', 'Uint8ClampedArray', 'Float32Array', 'Int32Array',
  'ArrayBuffer', 'DataView', 'Worker', 'importScripts', 'caches',
  'clients', 'skipWaiting', 'registration', 'self',
  // palabras del lenguaje que van seguidas de un paréntesis
  'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'function',
  'new', 'do', 'else', 'in', 'of', 'await', 'async', 'yield', 'delete',
  'void', 'case', 'super', 'this', 'import', 'export', 'default', 'const',
  'let', 'var', 'class', 'extends', 'throw', 'try', 'finally',
  'instanceof',
]);

/* ── DÓNDE ESTAMOS: CÓDIGO, COMILLAS O COMENTARIO ────────────
   Devuelve el fichero con los comentarios y el CONTENIDO de las
   cadenas en blanco, conservando los saltos de línea para que los
   números sigan cuadrando, y dejando vivo lo de dentro de los `${…}`
   porque eso sí es código. */
function soloCodigo(src) {
  let fuera = '';
  const pila = [{ modo: 'codigo', llaves: 0 }];
  const cima = () => pila[pila.length - 1];
  let ultimo = '';                     // último carácter con contenido
  let i = 0;

  /* Una barra empieza una expresión regular salvo que venga después de
     algo que pueda ser un valor — entonces es una división. */
  const empiezaRegex = () => !/[\w$)\]]/.test(ultimo);
  const blanco = (t) => t.replace(/[^\n]/g, ' ');

  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    const modo = cima().modo;

    if (modo === 'codigo') {
      if (c === '/' && d === '/') {
        const fin = src.indexOf('\n', i);
        const hasta = fin === -1 ? src.length : fin;
        fuera += blanco(src.slice(i, hasta)); i = hasta;
      } else if (c === '/' && d === '*') {
        const fin = src.indexOf('*/', i + 2);
        const hasta = fin === -1 ? src.length : fin + 2;
        fuera += blanco(src.slice(i, hasta)); i = hasta;
      } else if (c === '/' && empiezaRegex()) {
        /* Una expresión regular no cruza el salto de línea, así que se
           salta hasta la barra de cierre que no esté escapada. */
        let j = i + 1; let dentro = false;
        while (j < src.length && src[j] !== '\n') {
          if (src[j] === '\\') j += 2;
          else if (src[j] === '[') { dentro = true; j += 1; }
          else if (src[j] === ']') { dentro = false; j += 1; }
          else if (src[j] === '/' && !dentro) break;
          else j += 1;
        }
        const hasta = Math.min(j + 1, src.length);
        fuera += blanco(src.slice(i, hasta)); i = hasta; ultimo = ')';
      } else if (c === "'" || c === '"') {
        pila.push({ modo: 'cadena', fin: c }); fuera += ' '; i += 1;
      } else if (c === '`') {
        pila.push({ modo: 'plantilla' }); fuera += ' '; i += 1;
      } else if (c === '{') {
        cima().llaves += 1; fuera += c; ultimo = c; i += 1;
      } else if (c === '}' && cima().llaves === 0 && pila.length > 1) {
        pila.pop(); fuera += ' '; i += 1;                 // cierra un `${…}`
      } else {
        if (c === '}') cima().llaves -= 1;
        fuera += c; if (!/\s/.test(c)) ultimo = c; i += 1;
      }
      continue;
    }

    if (modo === 'cadena') {
      if (c === '\\') { fuera += '  '; i += 2; } else if (c === cima().fin) { pila.pop(); fuera += ' '; ultimo = ')'; i += 1; } else { fuera += c === '\n' ? '\n' : ' '; i += 1; }
      continue;
    }

    // plantilla
    if (c === '\\') { fuera += '  '; i += 2; } else if (c === '`') { pila.pop(); fuera += ' '; ultimo = ')'; i += 1; } else if (c === '$' && d === '{') { pila.push({ modo: 'codigo', llaves: 0 }); fuera += '  '; i += 2; } else { fuera += c === '\n' ? '\n' : ' '; i += 1; }
  }
  return fuera;
}

/**
 * Lo que un fichero tiene a mano sin salir de él: lo importado, lo
 * declarado, los parámetros, lo desestructurado y los `catch`.
 */
function loQueTieneAMano(src) {
  const hay = new Set();

  /* Mete todos los nombres que haya en un trozo de declaración:
     `uid as myUid` deja `myUid`; `pages: p` deja `p`; `x = 3` deja `x`;
     `...resto` deja `resto`. */
  const meterTrozo = (trozo) => {
    for (const parte of String(trozo).split(/[,{}[\]]/)) {
      const nombre = parte
        .replace(/=[\s\S]*$/, '')
        .replace(/^[\s.]*/, '')
        .split(/\bas\b/).pop()
        .split(':').pop()
        .trim();
      if (/^[A-Za-z_$][\w$]*$/.test(nombre)) hay.add(nombre);
    }
  };
  const meter = (re, grupo = 1) => {
    for (const m of src.matchAll(re)) meterTrozo(m[grupo] ?? '');
  };

  /* OJO CON LAS DECLARACIONES. Aquí no vale un `matchAll` que abarque
     hasta el `=`, porque al avanzar SE COME el texto de en medio: un
     `const` cuyo `=` esté trescientos caracteres más allá se traga los
     `const` que haya por el camino, y esos nombres se pierden. Pasó de
     verdad — `nueva`, en `qr-core.js`, declarada en la línea 196 y
     denunciada en la 384 como si no existiera.

     Así que se busca solo la PALABRA, y el trozo se recorta aparte sin
     consumir nada. */
  for (const m of src.matchAll(/\b(?:const|let|var)\s+/g)) {
    const desde = m.index + m[0].length;
    const trozo = src.slice(desde, desde + 400);
    meterTrozo(trozo.slice(0, (trozo.match(/[=;\n]/)?.index ?? trozo.length)));
    /* Un `const { a, b } = …` de varias líneas: hasta el `=`. */
    if (trozo.startsWith('{') || trozo.startsWith('[')) {
      meterTrozo(trozo.slice(0, trozo.indexOf('=') + 1 || 400));
    }
  }

  meter(/import\s+([\s\S]*?)\s+from\s/g);
  meter(/\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)/g);
  meter(/\bclass\s+([A-Za-z_$][\w$]*)/g);
  meter(/\bcatch\s*\(\s*([^)]*)\)/g);

  /* Parámetros. Se admite UN nivel de paréntesis dentro, que es lo que
     hace falta para los valores por defecto del estilo
     `{ onProgress = () => {} } = {}` — otro que se denunció en falso. */
  const PARAMS = /\(((?:[^()]|\([^()]*\)){0,400})\)\s*(?:=>|\{)/g;
  meter(PARAMS);
  meter(/([A-Za-z_$][\w$]*)\s*=>/g);                   // `x => …`
  return hay;
}

/** Todo `nombre(` que no venga detrás de un punto. */
function loQueLlama(src) {
  const fuera = new Map();
  for (const m of src.matchAll(/(^|[^.\w$?])([a-zA-Z_$][\w$]*)\s*\(/g)) {
    const antes = src.slice(Math.max(0, m.index - 12), m.index + m[1].length);
    if (/\b(function|class|new)\s+$/.test(antes)) continue;
    if (!fuera.has(m[2])) fuera.set(m[2], src.slice(0, m.index).split('\n').length);
  }
  return fuera;
}

/* Un `onclick` de esta app mezcla los dos ámbitos en la misma línea:

     onclick="openProfile('${esc(p.username)}')"

   `openProfile` lo llama el NAVEGADOR cuando tocas, y tiene que estar
   en `window`. `esc` lo llama el MÓDULO al construir el texto, mucho
   antes, y tiene que estar importado. Así que lo de dentro de `${…}`
   se quita de aquí: ya lo mira la otra mitad de la prueba. */
function sinInterpolaciones(txt) {
  let fuera = ''; let i = 0;
  while (i < txt.length) {
    if (txt[i] === '$' && txt[i + 1] === '{') {
      let hondo = 1; i += 2;
      while (i < txt.length && hondo) {
        if (txt[i] === '{') hondo += 1;
        else if (txt[i] === '}') hondo -= 1;
        i += 1;
      }
    } else { fuera += txt[i]; i += 1; }
  }
  return fuera;
}

/** Lo que llaman los `onclick="…"` del marcado, que va contra `window`. */
function loQueLlamaElMarcado(src) {
  const fuera = new Map();
  for (const at of src.matchAll(/\bon[a-z]+\s*=\s*"([^"]*)"/g)) {
    const linea = src.slice(0, at.index).split('\n').length;
    for (const m of sinInterpolaciones(at[1]).matchAll(/(^|[^.\w$])([a-zA-Z_$][\w$]*)\s*\(/g)) {
      if (!fuera.has(m[2])) fuera.set(m[2], linea);
    }
  }
  return fuera;
}

/* ── LO QUE `main.js` PONE EN `window` ───────────────────────
   Los `...modulo` del `Object.assign`, más las claves escritas a mano,
   más los `window.loQueSea = …`. */
function loQueHayEnWindow(dir) {
  /* En CRUDO: `soloCodigo` vacía las cadenas, y la ruta del import
     —`'./duel.js'`— es justo una cadena. Se leía en limpio y por eso
     esta lista salía con nueve nombres en vez de doscientos. */
  const main = readFileSync(new URL('main.js', dir), 'utf8');
  const hay = new Set(['closeSheet', 'nav']);

  const deDonde = new Map();
  for (const m of main.matchAll(/import\s+\*\s+as\s+([\w$]+)\s+from\s+'\.\/([\w.-]+)'/g)) {
    deDonde.set(m[1], m[2]);
  }
  const bloque = main.slice(main.indexOf('Object.assign(window'));
  for (const m of bloque.matchAll(/\.\.\.([\w$]+)/g)) {
    const fichero = deDonde.get(m[1]);
    if (!fichero) continue;
    const src = soloCodigo(readFileSync(new URL(fichero, dir), 'utf8'));
    for (const e of src.matchAll(/export\s+(?:async\s+)?(?:function\s*\*?\s*|const\s+|let\s+|class\s+)([\w$]+)/g)) hay.add(e[1]);
    for (const e of src.matchAll(/export\s*\{([^}]*)\}/g)) {
      for (const t of e[1].split(',')) hay.add(t.split(/\bas\b/).pop().trim());
    }
  }
  for (const m of bloque.matchAll(/^\s{2}([\w$]+)\s*:/gm)) hay.add(m[1]);
  for (const m of main.matchAll(/window\.([\w$]+)\s*=/g)) hay.add(m[1]);
  return hay;
}

/* ── A MIRAR ─────────────────────────────────────────────────── */

const dir = new URL('../src/', import.meta.url);
const ficheros = readdirSync(dir).filter((f) => f.endsWith('.js'));
const enWindow = loQueHayEnWindow(dir);

const hallazgos = [];
for (const f of ficheros) {
  const bruto = readFileSync(new URL(f, dir), 'utf8');
  const codigo = soloCodigo(bruto);
  const aMano = loQueTieneAMano(codigo);

  for (const [nombre, linea] of loQueLlama(codigo)) {
    if (aMano.has(nombre) || DEL_NAVEGADOR.has(nombre)) continue;
    /* `window` ES el objeto global del navegador, así que llamar a
       `openDetail(id)` a secas desde `screens.js` FUNCIONA aunque no
       esté importado: `main.js` lo puso ahí. Hay cuatro sitios así en
       el repo y no están rotos, o sea que denunciarlos sería gritar en
       falso. Se apoyan en algo frágil —quitar un `...views` del
       `main.js` los rompería en silencio—, pero el día que eso pase
       los nombres saldrán de esta lista y esta prueba los cazará. Lo
       que NO estaba en window era `ico`, y por eso reventó. */
    if (enWindow.has(nombre)) continue;
    hallazgos.push({ f, linea, texto: `llama a «${nombre}», que ni importa ni está en window` });
  }
  /* Y la otra mitad: un `onclick` que llama a algo que `main.js` nunca
     puso en `window` tampoco hace nada al tocarlo. */
  for (const [nombre, linea] of loQueLlamaElMarcado(bruto)) {
    if (enWindow.has(nombre) || DEL_NAVEGADOR.has(nombre)) continue;
    hallazgos.push({ f, linea, texto: `el marcado llama a «${nombre}()», que no está en window` });
  }
}

/* El marcado del `index.html` cruza el mismo puente. */
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const [nombre, linea] of loQueLlamaElMarcado(html)) {
  if (enWindow.has(nombre) || DEL_NAVEGADOR.has(nombre)) continue;
  hallazgos.push({ f: '../index.html', linea, texto: `el marcado llama a «${nombre}()», que no está en window` });
}

const donde = (h) => (h.f.startsWith('..') ? 'index.html' : `src/${h.f}`);
console.log(`\n  ${ficheros.length} módulos · ${enWindow.size} funciones en window\n`);
for (const h of hallazgos) console.log(`  ✗ ${donde(h)}:${h.linea}  ·  ${h.texto}`);

if (!hallazgos.length) {
  console.log('  ✓ Todo lo que se llama existe donde se llama.\n');
} else {
  console.log(`\n  ${hallazgos.length} llamada(s) a nombres que no existen.`);
  console.log('  Eso revienta al TOCAR el botón, no al cargar la página.\n');
}
process.exit(hallazgos.length ? 1 : 0);
