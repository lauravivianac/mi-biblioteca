/* ─────────────────────────────────────────────────────────────
   ¿COMPILA CADA MÓDULO?

     npm run test:sintaxis

   POR QUÉ EXISTE, Y NO ES UNA PRECAUCIÓN GENÉRICA. Se subió a `main`
   un `profileui.js` que NO COMPILABA, y pasó por delante de toda la
   batería sin que nada chistara.

   La causa fue un comentario. Dentro de una plantilla de texto —una
   cadena entre acentos graves— puse un comentario de HTML que llevaba
   `así` un par de palabras entre acentos graves. Ahí dentro, un acento
   grave no es un adorno: CIERRA LA CADENA. El módulo se partió en
   medio y dejó de existir para el navegador; y como `main.js` lo
   importa, la app entera se queda sin arrancar.

   POR QUÉ NADIE LO VIO:

     · el proyecto no tiene compilador — son módulos nativos, y eso es
       una decisión buena que se paga aquí: nada mira el código antes
       de que lo mire el navegador de alguien;
     · `test:clases` lee los ficheros como TEXTO, buscando nombres de
       clase; un fichero roto le parece perfecto;
     · Vercel publica ficheros estáticos: no compila nada, así que el
       despliegue salió verde;
     · y las pruebas que sí importan módulos importan los `-core`, que
       son los puros. Los que tocan el DOM no los importa nadie.

   Así que la comprobación más básica de todas era justo la que no
   estaba. Esto la pone: cada fichero de `src/` y `sw.js` se PARSEA
   como módulo. No ejecuta nada —no hay DOM aquí— y no hace falta:
   para lo que se escapó, parsear basta.
   ───────────────────────────────────────────────────────────── */

import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const dir = new URL('../src/', import.meta.url);
const ficheros = [
  ...readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => `src/${f}`),
  'sw.js',
];

let bien = 0;
const rotos = [];

for (const f of ficheros) {
  const fuente = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  try {
    /* `--input-type=module` porque son módulos: sin eso, un `import`
       de arriba ya sería un error y todos «fallarían». */
    execFileSync(process.execPath, ['--input-type=module', '--check'], {
      input: fuente,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    bien += 1;
  } catch (e) {
    const salida = String(e.stderr || e.message)
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('    at ') && !l.includes('Node.js v'))
      .slice(0, 4)
      .join('\n      ');
    rotos.push({ f, salida });
  }
}

console.log(`\n  ${ficheros.length} módulos parseados\n`);
for (const r of rotos) console.log(`  ✗ ${r.f}\n      ${r.salida}\n`);

if (!rotos.length) {
  console.log('  ✓ Todos compilan.\n');
} else {
  console.log(`  ${rotos.length} módulo(s) NO compilan. La app no arranca así.\n`);
}
process.exit(rotos.length ? 1 : 0);
