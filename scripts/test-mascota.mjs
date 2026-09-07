/* ─────────────────────────────────────────────────────────────
   LO QUE DICE LA MASCOTA, ¿VIENE A CUENTO?

     npm run test:mascota

   POR QUÉ EXISTE. «Las frases no tienen nada que ver, sale cualquier
   cosa». Y era verdad, por tres motivos que no se ven leyendo el
   código — solo poniendo fechas y mirando qué sale:

     1. Felicitaba por el LIBRO EQUIVOCADO. El estado preguntaba «¿hubo
        algún final?» con un `.some()`, que devuelve un sí/no, y luego
        la frase se quedaba con el libro EN CURSO. Terminabas «Cien
        años de soledad», seguías con «El Quijote», y decía
        «¡Terminaste El Quijote!». El número de páginas, igual.

     2. Celebraba dos días pasara lo que pasara. Terminabas un libro,
        leías doscientas páginas de otro, y ella seguía con el final de
        anteayer en vez de con lo que tenías entre manos.

     3. Y la frase SE VOLVÍA A SORTEAR EN CADA REPINTADO. La mascota se
        repinta en cada refresco —al marcar un libro, al cambiar un
        filtro, al abrir y cerrar una hoja—, así que cambiaba de frase
        cada vez que tocabas cualquier cosa. Ese es el fallo de fondo:
        no es que la frase fuera falsa, es que no guardaba ninguna
        relación con lo que acababa de ocurrir.

   Las tres son de cuenta, así que la cuenta vive aparte (`pet-core.js`)
   y esto la comprueba.
   ───────────────────────────────────────────────────────────── */

import { estadoMascota, fraseMascota, DIA } from '../src/pet-core.js';

let bien = 0;
let mal = 0;
const comprobar = (nombre, ok, detalle = '') => {
  if (ok) { bien += 1; console.log(`  ✓ ${nombre}`); } else {
    mal += 1;
    console.log(`  ✗ ${nombre}${detalle ? `\n      ${detalle}` : ''}`);
  }
};

const AHORA = Date.UTC(2026, 8, 7, 12);
const libro = (o) => ({
  id: o.id, title: o.title, total: o.total ?? 300, page: o.page ?? 0,
  status: o.status ?? 'pending', pct: o.pct ?? 0,
  lastReadAt: o.lastReadAt ?? 0, finishedAt: o.finishedAt ?? 0,
});

/* ── 1 · EL LIBRO DEL QUE HABLA ──────────────────────────────── */

console.log('\n─── DE QUÉ LIBRO HABLA ───');

{
  /* El caso exacto que fallaba: uno terminado ayer, otro en curso que
     NO se ha tocado desde entonces. */
  const libros = [
    libro({ id: 'cien', title: 'Cien años de soledad', total: 471, finishedAt: AHORA - 1 * DIA, status: 'read' }),
    libro({ id: 'quij', title: 'El Quijote', total: 900, status: 'reading', page: 40, lastReadAt: AHORA - 3 * DIA }),
  ];
  const e = estadoMascota(libros, AHORA);
  comprobar('celebra el libro que TERMINASTE, no el que estás leyendo',
    e.mood === 'celebrando' && e.libro.id === 'cien',
    `salió mood=${e.mood} libro=${e.libro?.id}`);

  const f = fraseMascota({ ...e }, { ahora: AHORA });
  comprobar('y la frase no nombra el otro libro',
    !f.includes('Quijote'), f);
  comprobar('las páginas que cuenta son las del libro terminado',
    !f.includes('900'), f);
}

{
  /* Terminado ayer, pero HOY has leído otra cosa: la noticia es esa. */
  const libros = [
    libro({ id: 'cien', title: 'Cien años de soledad', finishedAt: AHORA - 1 * DIA, status: 'read' }),
    libro({ id: 'quij', title: 'El Quijote', status: 'reading', page: 240, pct: 27, lastReadAt: AHORA - 2 * 3600e3 }),
  ];
  const e = estadoMascota(libros, AHORA);
  comprobar('si después de terminar volviste a leer, habla de lo que lees',
    e.mood === 'leyendo' && e.libro.id === 'quij',
    `salió mood=${e.mood} libro=${e.libro?.id}`);
}

{
  const libros = [libro({ id: 'x', title: 'Algo', finishedAt: AHORA - 5 * DIA, status: 'read', lastReadAt: AHORA - 5 * DIA })];
  const e = estadoMascota(libros, AHORA);
  comprobar('pasados dos días ya no celebra', e.mood !== 'celebrando', `salió ${e.mood}`);
}

/* ── 2 · SIN LIBRO NO SE INVENTA UNO ─────────────────────────── */

console.log('\n─── SIN LIBRO ───');

{
  const e = estadoMascota([], AHORA);
  const f = fraseMascota(e, { ahora: AHORA });
  comprobar('una biblioteca vacía no produce «tu libro»', !f.includes('tu libro'), f);
  comprobar('ni un hueco sin rellenar', !/\{\w+\}/.test(f), f);
}

{
  /* Terminado hace un rato y nada en curso: felicita, pero sin
     inventarse un título genérico. */
  const libros = [libro({ id: 'x', title: 'Rayuela', total: 600, finishedAt: AHORA - 3600e3, status: 'read' })];
  const f = fraseMascota(estadoMascota(libros, AHORA), { ahora: AHORA });
  comprobar('celebra con el título de verdad', f.includes('Rayuela') || f.includes('600') || f.includes('pila'), f);
  comprobar('y nunca con «tu libro»', !f.includes('tu libro'), f);
}

/* ── 3 · LA FRASE NO CAMBIA SI NO CAMBIA NADA ────────────────── */

console.log('\n─── ESTABILIDAD · el fallo de fondo ───');

{
  const libros = [libro({ id: 'q', title: 'El Quijote', total: 900, status: 'reading', page: 240, pct: 27, lastReadAt: AHORA - 3600e3 })];
  const e = estadoMascota(libros, AHORA);
  const veces = Array.from({ length: 40 }, () => fraseMascota(e, { ahora: AHORA }));
  comprobar('cuarenta repintados seguidos dicen LO MISMO',
    new Set(veces).size === 1, `salieron ${new Set(veces).size} frases distintas`);
}

{
  /* Y cuando pasa algo de verdad —avanzas páginas— sí cambia. */
  const base = { id: 'q', title: 'El Quijote', total: 900, status: 'reading', pct: 27, lastReadAt: AHORA - 3600e3 };
  const dichas = new Set();
  for (const page of [10, 120, 240, 360, 480, 600, 720]) {
    dichas.add(fraseMascota(estadoMascota([libro({ ...base, page })], AHORA), { ahora: AHORA }));
  }
  comprobar('avanzar en el libro sí le cambia lo que dice',
    dichas.size > 1, `siempre la misma: ${[...dichas][0]}`);
}

/* ── 4 · LOS ÁNIMOS SE ELIGEN CUANDO TOCA ────────────────────── */

console.log('\n─── CUÁNDO TOCA CADA ÁNIMO ───');

const soloLeyendo = (page, pct, hace) => estadoMascota(
  [libro({ id: 'a', title: 'Un libro', total: 300, status: 'reading', page, pct, lastReadAt: AHORA - hace })],
  AHORA,
);

comprobar('leyendo hoy → leyendo', soloLeyendo(100, 33, 3600e3).mood === 'leyendo');
comprobar('al 90 % → expectante', soloLeyendo(270, 90, 3600e3).mood === 'expectante');
comprobar('cuatro días sin abrir → dormida', soloLeyendo(100, 33, 4 * DIA).mood === 'dormida');
comprobar('nunca has leído nada → dormida, no «leyendo»',
  estadoMascota([libro({ id: 'a', title: 'Un libro' })], AHORA).mood === 'dormida');

{
  const e = soloLeyendo(100, 33, 2 * DIA);
  const f = fraseMascota(e, { ahora: AHORA });
  comprobar('dos días parada en el mismo sitio → lo dice',
    e.mood === 'leyendo' && /días|esperando|corre/.test(f), `${e.mood} · ${f}`);
}

/* ── 5 · NUNCA CASTIGA ───────────────────────────────────────── */

console.log('\n─── EL LÍMITE QUE NO SE CRUZA ───');

{
  const REPROCHE = /abandon|olvid|culpa|deberías|nunca lees|mal|perezos|vago/i;
  const todas = [];
  for (const dias of [0, 1, 2, 3, 4, 10, 60]) {
    for (const page of [0, 50, 150, 290]) {
      todas.push(fraseMascota(soloLeyendo(page, Math.round((page / 300) * 100), dias * DIA), { ahora: AHORA }));
    }
  }
  todas.push(fraseMascota(estadoMascota([], AHORA), { ahora: AHORA }));
  const reproches = todas.filter((f) => REPROCHE.test(f));
  comprobar('ninguna frase reprocha, en ningún estado',
    reproches.length === 0, reproches.join(' · '));
}

console.log(`\n  ${bien} comprobaciones pasaron, ${mal} fallaron.\n`);
process.exit(mal ? 1 : 0);
