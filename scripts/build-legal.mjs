/* ─────────────────────────────────────────────────────────────
   LOS DOCUMENTOS LEGALES, DE MARKDOWN A PÁGINAS PUBLICADAS

     npm run legal          genera legal/*.html
     npm run test:legal     comprueba que no se han desincronizado

   POR QUÉ UNA SOLA FUENTE. Los textos se revisan en `docs/legal/*.md`,
   que es donde se leen bien en un pull request, y se publican en
   `legal/*.html`, que es lo que la tienda exige que responda en una URL
   estable. Tenerlos escritos dos veces significaría que un día dicen
   cosas distintas — y que la política de privacidad publicada no
   coincida con la revisada es exactamente el fallo que no se puede
   permitir aquí.

   Así que el markdown manda y el HTML se genera. Y `test:legal`
   comprueba que lo generado está al día: si alguien edita el texto y no
   regenera, la batería se pone roja en vez de publicar algo viejo.

   LAS PÁGINAS NO LLEVAN JAVASCRIPT, y es deliberado: quien revisa la
   app en la tienda puede abrirlas con el navegador que sea, y un
   documento legal que necesita JavaScript para verse es un documento
   que un día no se ve.
   ───────────────────────────────────────────────────────────── */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = join(raiz, 'docs', 'legal');
const DESTINO = join(raiz, 'legal');

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

/** Negrita, cursiva, código y enlaces. Se escapa antes de marcar. */
function enLinea(t) {
  return esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
    /* Los enlaces a otros documentos se quedan dentro de /legal/: el
       markdown apunta a `./privacidad.md` y publicado ha de apuntar a
       la página, no a un fichero que no existe en el servidor. */
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, texto, url) =>
      `<a href="${esc(url.replace(/^\.\//, '').replace(/\.md$/, ''))}">${texto}</a>`);
}

const celdas = (linea) => linea.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const esSeparador = (l) => /^\|?[\s:-]+\|[\s|:-]*$/.test(l);

function aHtml(md) {
  const lineas = String(md).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const cerrarLista = (tipo) => { if (tipo) out.push(`</${tipo}>`); };
  let lista = null;

  while (i < lineas.length) {
    const l = lineas[i];

    // Tabla
    if (l.trim().startsWith('|') && esSeparador(lineas[i + 1] || '')) {
      cerrarLista(lista); lista = null;
      const cabecera = celdas(l);
      i += 2;
      const filas = [];
      while (i < lineas.length && lineas[i].trim().startsWith('|')) {
        filas.push(celdas(lineas[i])); i += 1;
      }
      out.push('<div class="tabla"><table><thead><tr>'
        + cabecera.map((c) => `<th>${enLinea(c)}</th>`).join('')
        + '</tr></thead><tbody>'
        + filas.map((f) => `<tr>${f.map((c) => `<td>${enLinea(c)}</td>`).join('')}</tr>`).join('')
        + '</tbody></table></div>');
      continue;
    }

    // Bloque de código
    if (l.trim().startsWith('```')) {
      cerrarLista(lista); lista = null;
      i += 1;
      const dentro = [];
      while (i < lineas.length && !lineas[i].trim().startsWith('```')) { dentro.push(lineas[i]); i += 1; }
      i += 1;
      out.push(`<pre><code>${esc(dentro.join('\n'))}</code></pre>`);
      continue;
    }

    // Cita
    if (/^>\s?/.test(l)) {
      cerrarLista(lista); lista = null;
      const dentro = [];
      while (i < lineas.length && /^>\s?/.test(lineas[i])) {
        dentro.push(lineas[i].replace(/^>\s?/, '')); i += 1;
      }
      out.push(`<blockquote>${aHtml(dentro.join('\n'))}</blockquote>`);
      continue;
    }

    // Encabezados
    const h = /^(#{1,4})\s+(.*)$/.exec(l);
    if (h) {
      cerrarLista(lista); lista = null;
      out.push(`<h${h[1].length}>${enLinea(h[2])}</h${h[1].length}>`);
      i += 1; continue;
    }

    // Regla
    if (/^---+$/.test(l.trim())) {
      cerrarLista(lista); lista = null;
      out.push('<hr>'); i += 1; continue;
    }

    // Listas
    const li = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(l);
    if (li) {
      const tipo = /\d/.test(li[1]) ? 'ol' : 'ul';
      if (lista !== tipo) { cerrarLista(lista); out.push(`<${tipo}>`); lista = tipo; }
      out.push(`<li>${enLinea(li[2])}</li>`);
      i += 1; continue;
    }
    if (lista) { cerrarLista(lista); lista = null; }

    if (!l.trim()) { i += 1; continue; }

    // Párrafo
    const parrafo = [];
    while (i < lineas.length && lineas[i].trim()
           && !/^(#{1,4}\s|>|\s*[-*]\s|\s*\d+\.\s|```|\|)/.test(lineas[i])
           && !/^---+$/.test(lineas[i].trim())) {
      parrafo.push(lineas[i]); i += 1;
    }
    if (parrafo.length) out.push(`<p>${enLinea(parrafo.join(' '))}</p>`);
  }
  cerrarLista(lista);
  return out.join('\n');
}

/* Los mismos colores que la app, escritos aquí y no importados: una
   página legal tiene que verse aunque el CSS de la app cambie o falle. */
const PLANTILLA = (titulo, cuerpo) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Library</title>
<meta name="color-scheme" content="dark light">
<style>
  :root { color-scheme: dark; --bg:#12100E; --tinta:#EDE6DA; --suave:#9C9284;
          --acento:#D9C7A8; --oro:#C9A24A; --borde:rgb(217 199 168 / .18); }
  * { box-sizing: border-box; }
  body { margin:0; padding:32px 20px 72px; background:var(--bg); color:var(--tinta);
         font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  main { max-width: 720px; margin: 0 auto; }
  h1 { font-size: 27px; color: var(--oro); margin: 0 0 6px; line-height:1.25; }
  h2 { font-size: 20px; color: var(--acento); margin: 34px 0 10px; }
  h3 { font-size: 16.5px; margin: 24px 0 8px; }
  h4 { font-size: 15px; color: var(--suave); margin: 20px 0 6px; }
  p, li { color: var(--tinta); }
  a { color: var(--acento); }
  hr { border:0; border-top:1px solid var(--borde); margin:30px 0; }
  blockquote { margin:20px 0; padding:14px 18px; border-left:3px solid var(--oro);
               background:rgb(240 192 96 / .08); border-radius:0 8px 8px 0; }
  blockquote p:first-child { margin-top:0; } blockquote p:last-child { margin-bottom:0; }
  code { background:rgb(196 168 255 / .12); padding:1px 5px; border-radius:4px; font-size:.9em; }
  pre { background:rgb(196 168 255 / .08); padding:14px 16px; border-radius:8px; overflow-x:auto; }
  pre code { background:none; padding:0; }
  .tabla { overflow-x:auto; margin:18px 0; }
  table { border-collapse:collapse; width:100%; font-size:14.5px; }
  th, td { text-align:left; padding:9px 11px; border-bottom:1px solid var(--borde); vertical-align:top; }
  th { color:var(--suave); font-weight:600; font-size:12.5px;
       text-transform:uppercase; letter-spacing:.05em; }
  .volver { display:inline-block; margin-bottom:26px; color:var(--suave); text-decoration:none; font-size:14px; }
  .pie { margin-top:48px; padding-top:20px; border-top:1px solid var(--borde);
         font-size:13.5px; color:var(--suave); }
  .pie a { margin-right:16px; }
  @media (prefers-color-scheme: light) {
    :root { color-scheme: light; --bg:#FBF9FF; --tinta:#1A1430; --suave:#5F5580;
            --acento:#5B3FA8; --oro:#8A6410; --borde:rgb(90 63 168 / .2); }
  }
</style>
</head>
<body>
<main>
  <a class="volver" href="/">← Library</a>
  ${cuerpo}
  <div class="pie">
    <a href="/legal/privacidad">Privacidad</a>
    <a href="/legal/terminos">Términos</a>
    <a href="/legal/eula">Normas de uso</a>
    <a href="mailto:soporte@mibiblioteca.app">Soporte</a>
  </div>
</main>
</body>
</html>
`;

export async function generar() {
  await mkdir(DESTINO, { recursive: true });
  const ficheros = (await readdir(ORIGEN)).filter((f) => f.endsWith('.md'));
  const salida = [];

  for (const f of ficheros) {
    const md = await readFile(join(ORIGEN, f), 'utf8');
    const titulo = (/^#\s+(.*)$/m.exec(md) || [, 'Documento'])[1].trim();
    const html = PLANTILLA(titulo, aHtml(md));
    salida.push({ nombre: `${basename(f, '.md')}.html`, html });
  }
  return salida;
}

/* Ejecutado directamente: escribe. Importado: solo genera, para que
   `test:legal` pueda comparar sin tocar nada. */
if (process.argv[1] && process.argv[1].endsWith('build-legal.mjs')) {
  const salida = await generar();
  for (const { nombre, html } of salida) {
    await writeFile(join(DESTINO, nombre), html);
    console.log(`  ✓ legal/${nombre}`);
  }
  console.log(`\n  ${salida.length} documentos publicados.\n`);
}
