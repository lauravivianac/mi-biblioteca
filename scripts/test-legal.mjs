/* Los documentos legales publicados, al día · #97 y #98

   Comprueba dos cosas, y las dos son requisito de tienda:

   1. Que `legal/*.html` coincide con `docs/legal/*.md`. Si alguien
      edita el texto y no regenera, esto se pone rojo — en vez de
      publicar una política de privacidad vieja, que es justo el fallo
      que hace que una revisión se caiga.

   2. Que los documentos dicen lo que la app hace de verdad: que
      DeepSeek procesa en China, que se puede borrar la cuenta, que no
      se guarda la dirección. */

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generar } from './build-legal.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
let pasan = 0; const fallos = [];
const ok = (nombre, cond, detalle = '') => {
  if (cond) { pasan++; console.log(`  ✓ ${nombre}`); }
  else { fallos.push(nombre); console.log(`  ✗ ${nombre}${detalle ? `\n      ${detalle}` : ''}`); }
};

console.log('\nLO PUBLICADO COINCIDE CON LO REVISADO');
const generados = await generar();
for (const { nombre, html } of generados) {
  let enDisco = null;
  try { enDisco = await readFile(join(raiz, 'legal', nombre), 'utf8'); } catch { /* no está */ }
  ok(`legal/${nombre} está al día`, enDisco === html,
    enDisco === null ? 'no existe: ejecuta `npm run legal`'
      : 'el markdown cambió y el HTML no: ejecuta `npm run legal`');
}

console.log('\nESTÁN LOS TRES DOCUMENTOS QUE PIDE LA TIENDA');
const md = {};
for (const f of (await readdir(join(raiz, 'docs', 'legal'))).filter((x) => x.endsWith('.md'))) {
  md[f.replace('.md', '')] = await readFile(join(raiz, 'docs', 'legal', f), 'utf8');
}
for (const doc of ['privacidad', 'terminos', 'eula']) {
  ok(`existe ${doc}.md`, Boolean(md[doc]));
}

console.log('\nDICEN LO QUE LA APP HACE DE VERDAD');
ok('la privacidad declara que DeepSeek procesa en China',
  /DeepSeek[\s\S]{0,400}China/i.test(md.privacidad || ''));
ok('y que el asistente es opcional',
  /no se enciende solo|opcional/i.test(md.privacidad || ''));
ok('la privacidad dice que NO se guarda la dirección',
  /nunca se (pide ni se )?guarda tu direcci/i.test(md.privacidad || ''));
ok('y explica el recorte de la ubicación a ~1 km',
  /kil[óo]metro/i.test(md.privacidad || ''));
ok('la privacidad enumera los cuatro terceros',
  ['Firebase', 'DeepSeek', 'OpenLibrary', 'Google Books']
    .every((t) => (md.privacidad || '').includes(t)));
ok('y dice que se puede borrar la cuenta desde la app',
  /borrar la cuenta/i.test(md.privacidad || ''));

console.log('\nEL EULA CUMPLE LA GUÍA 1.2 DE LA APP STORE');
ok('tolerancia cero, dicho con esas palabras',
  /tolerancia cero/i.test(md.eula || ''));
ok('prohíbe el contenido ofensivo y el acoso',
  /acoso/i.test(md.eula || '') && /ofensiv/i.test(md.eula || ''));
ok('dice qué pasa con quien lo incumple',
  /cierra la cuenta/i.test(md.eula || ''));
ok('explica cómo reportar y bloquear',
  /reportar/i.test(md.eula || '') && /bloquear/i.test(md.eula || ''));
ok('hay un contacto de soporte en los tres documentos',
  ['privacidad', 'terminos', 'eula'].every((d) => (md[d] || '').includes('soporte@mibiblioteca.app')));

console.log('\nEL CORREO DE SOPORTE ES EL MISMO QUE USA LA APP');
const moderacion = await readFile(join(raiz, 'src', 'moderation-core.js'), 'utf8');
const correoApp = (/correo:\s*'([^']+)'/.exec(moderacion) || [])[1];
ok(`la app usa ${correoApp} y los documentos también`,
  Boolean(correoApp) && (md.privacidad || '').includes(correoApp),
  'si cambia en un sitio hay que cambiarlo en el otro');

console.log('\nLAS PÁGINAS PUBLICADAS SE VEN SIN JAVASCRIPT');
for (const { nombre, html } of generados) {
  ok(`legal/${nombre} no necesita JavaScript`, !/<script/i.test(html));
  ok(`legal/${nombre} enlaza los otros documentos`,
    html.includes('/legal/privacidad') && html.includes('/legal/terminos'));
}

console.log(`\n${pasan} pruebas pasaron, ${fallos.length} fallaron.\n`);
process.exit(fallos.length ? 1 : 0);
