/* ─────────────────────────────────────────────────────────────
   LO QUE LA APP LE DICE A QUIEN NO ES «ELLA»

     npm run test:genero

   POR QUÉ EXISTE:

     «Pero él es un amigo, no una amiga. Ahí qué, debería decir amigos.»

   La app hablaba en femenino de punta a punta —amigas, seguidoras,
   lectoras— y eso era una decisión de estilo, no un descuido. Pero un
   estilo que se equivoca con la mitad de la gente que lo lee deja de
   ser estilo: pasa a ser un dato incorrecto sobre una persona concreta,
   y se nota justo en el peor momento, cuando acabas de añadir a
   alguien y la app le llama otra cosa.

   Y ponerlo todo en masculino sería exactamente el mismo error del
   otro lado. La salida no es elegir un bando: es que las frases digan
   QUÉ HACE la persona en vez de QUÉ ES. «Te siguen tres» en vez de
   «tres seguidoras». El castellano lo permite casi siempre, y de paso
   sale más claro.

   ── CÓMO EVITA GRITAR EN FALSO ──────────────────────────────

   Un guardián que da falsos positivos se acaba desactivando, así que
   este mira solo donde importa y descarta lo que no es una frase:

     · los COMENTARIOS no cuentan: son para quien programa, y ahí el
       femenino de este repo es una decisión suya que no se toca;
     · los IDENTIFICADORES tampoco: `'seguidoras'` es el nombre de un
       nivel de visibilidad guardado en la base y en las reglas de
       Firestore — cambiarlo rompería datos de verdad. Se distinguen
       porque una etiqueta lleva espacios o empieza en mayúscula, y un
       identificador ni lo uno ni lo otro;
     · `@usuario` está exento: ahí «usuario» no es una persona, es el
       nombre del campo, y así se llama en toda la app.
   ───────────────────────────────────────────────────────────── */

import { readdirSync, readFileSync } from 'node:fs';

/* Palabras que nombran a una persona POR SU GÉNERO. Las dos formas:
   caer en masculino sería el mismo fallo que había en femenino.

   OJO CON «LECTOR». En esta app es casi siempre un ADJETIVO y no una
   persona: «plan lector», «mascota lectora», «tu mes más lector», «el
   lector de texto» —que es el OCR—. Por eso solo cuentan los PLURALES,
   que sí son gente: «lectoras», «lectores». La primera versión de esta
   prueba marcaba los seis y habría acabado desactivada en una semana,
   que es lo que le pasa a un guardián que grita en falso.

   El precio es que un «una lectora como tú» en singular se colaría. Se
   paga: vale más una prueba que se respeta y caza lo que pasa de
   verdad que una exhaustiva que nadie mira. */
const CON_GENERO = /\b(amig[ao]s?|seguidor(?:a|as|es)?|lector(?:as|es)|usuari[ao]s?)\b/i;

/** Quita comentarios: de bloque, de línea y de HTML. */
function sinComentarios(txt) {
  return txt
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .split('\n')
    .map((l) => l.replace(/(^|\s)\/\/.*$/, '$1'))
    .join('\n');
}

/**
 * Los textos que llegan a la pantalla.
 *
 * Cadenas entre comillas y trozos de plantilla. Se queda solo con lo
 * que parece una ETIQUETA —con espacios, o empezando en mayúscula—
 * porque un identificador nunca es ninguna de las dos cosas.
 */
function etiquetas(txt) {
  const fuera = [];
  const comillas = /'([^'\\\n]{2,120})'|"([^"\\\n]{2,120})"/g;
  let m = comillas.exec(txt);
  while (m) {
    fuera.push(m[1] ?? m[2]);
    m = comillas.exec(txt);
  }
  /* Y el texto suelto dentro del marcado, que no lleva comillas:
     `>Amigas<`, `🔍 Encontrar…`. Se saca por trozos entre etiquetas. */
  for (const t of txt.match(/>[^<>{}`]{3,120}</g) || []) fuera.push(t.slice(1, -1));
  return fuera
    .map((s) => s.trim())
    .filter((s) => s && (s.includes(' ') || /^[A-ZÁÉÍÓÚÑ]/.test(s)));
}

const dir = new URL('../src/', import.meta.url);
const ficheros = [
  ...readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => [`src/${f}`, new URL(f, dir)]),
  ['index.html', new URL('../index.html', import.meta.url)],
];

const hallazgos = [];
for (const [nombre, url] of ficheros) {
  const limpio = sinComentarios(readFileSync(url, 'utf8'));
  for (const e of etiquetas(limpio)) {
    /* `@usuario` es el nombre del campo, no una persona. */
    const sinCampo = e.replace(/@usuari[ao]s?/gi, '');
    if (CON_GENERO.test(sinCampo)) hallazgos.push({ nombre, e });
  }
}

console.log(`\n  ${ficheros.length} ficheros revisados\n`);
for (const h of hallazgos) console.log(`  ✗ ${h.nombre}\n      «${h.e}»`);

if (!hallazgos.length) {
  console.log('  ✓ Ningún texto de pantalla le pone género a quien lo lee.\n');
} else {
  console.log(`\n  ${hallazgos.length} texto(s) con género. Di qué HACE la persona, no qué es.\n`);
}
process.exit(hallazgos.length ? 1 : 0);
