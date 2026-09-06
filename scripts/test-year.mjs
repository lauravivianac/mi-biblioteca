/* ─────────────────────────────────────────────────────────────
   PRUEBAS DEL RESUMEN ANUAL

   El grupo que más importa es «CON POCOS DATOS SE VE DIGNO». Es el
   criterio más fácil de incumplir sin darse cuenta: se pintan seis
   tarjetas fijas, se rellenan los huecos con guiones, y a quien lleva
   tres libros la app le dice «tu género favorito: —». Esa pantalla no
   se comparte: se cierra.
   ───────────────────────────────────────────────────────────── */

import {
  yearReview, yearCards, alturaDePapel, yearsWithBooks, MINIMO_DIGNO,
} from '../src/year-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

const HOY = new Date(2026, 8, 15);
const fin = (mes, dia = 10) => new Date(2026, mes, dia).getTime();
const libro = (o) => ({ status: 'read', pages: '~300', genre: 'Thriller', author: 'X', ...o });

const AÑO = [
  libro({ id: '1', title: 'Uno', finishedAt: fin(0), rating: 4 }),
  libro({ id: '2', title: 'Dos', finishedAt: fin(2), rating: 5, pages: '~250' }),
  libro({ id: '3', title: 'Tres', finishedAt: fin(2), rating: 3, genre: 'Latinoamérica' }),
  libro({ id: '4', title: 'El Tocho', finishedAt: fin(4), rating: 4, pages: '~900', genre: 'Clásico universal' }),
  libro({ id: '5', title: 'Cinco', finishedAt: fin(7), rating: 2, genre: 'Latinoamérica' }),
  /* De otro año: no debe contarse */
  libro({ id: 'viejo', title: 'Del año pasado', finishedAt: new Date(2025, 5, 1).getTime(), rating: 5 }),
  /* Sin terminar: tampoco */
  libro({ id: 'pend', title: 'Pendiente', status: 'pending', finishedAt: null }),
];

const DIAS = [
  ...['01', '02', '03', '04', '05', '06'].map((d) => `2026-03-${d}`),
  '2026-01-10', '2026-01-11',
  '2025-12-01', '2025-12-02', '2025-12-03', '2025-12-04', '2025-12-05',   // del año pasado
];

const r = yearReview(AÑO, { year: 2026, readingDays: DIAS, today: HOY });

/* ── LOS NÚMEROS ─────────────────────────────────────────────── */

grupo('QUÉ SE CUENTA Y QUÉ NO');
igual('cinco libros terminados este año', r.leidos, 5);
ok('lo del año pasado no cuenta', !r.libros.some((b) => b.id === 'viejo'));
ok('lo que no has terminado tampoco', !r.libros.some((b) => b.id === 'pend'));
igual('las páginas se suman', r.paginas, 300 + 250 + 300 + 900 + 300);

grupo('SE CUENTA POR CUÁNDO LO TERMINASTE');
const conPlan = yearReview(
  [libro({ id: 'x', title: 'X', month: 'Diciembre', year: 2026, finishedAt: new Date(2025, 1, 1).getTime() })],
  { year: 2026, today: HOY },
);
igual('el mes del plan no manda: manda la fecha real', conPlan.leidos, 0);

grupo('LOS GÉNEROS');
igual('y se cuentan los distintos', r.generosDistintos, 3);
/* Thriller y Latinoamérica van empatados a dos libros, pero en
   Latinoamérica pasaste 600 páginas y en Thriller 550. */
igual('con empate de libros manda las páginas, no el alfabeto',
  r.generos.map((g) => g.genre), ['Latinoamérica', 'Thriller', 'Clásico universal']);
igual('y se guarda cuántas páginas fueron', r.generos[0].paginas, 600);

grupo('LO MEJOR Y LO MÁS GORDO');
igual('el mejor valorado es el de cinco estrellas', r.mejorValorado.title, 'Dos');
igual('el más largo es el tocho', r.masLargo.title, 'El Tocho');

const empate = yearReview([
  libro({ id: 'a', title: 'Corto', finishedAt: fin(1), rating: 5, pages: '~120' }),
  libro({ id: 'b', title: 'Largo', finishedAt: fin(1), rating: 5, pages: '~800' }),
], { year: 2026, today: HOY });
igual('con empate de estrellas gana el más largo, que es el que más recuerdas',
  empate.mejorValorado.title, 'Largo');

grupo('EL MES MÁS LECTOR');
igual('marzo, con dos', r.mesMasLector, { mes: 'Marzo', libros: 2 });
igual('sin libros no hay mes', yearReview([], { year: 2026, today: HOY }).mesMasLector, null);

grupo('LA RACHA DEL AÑO');
igual('seis días seguidos en marzo', r.rachaMasLarga, 6);
ok('los días de diciembre pasado no cuentan para 2026', r.diasLeyendo === 8, `dio ${r.diasLeyendo}`);

/* ── EL CRITERIO QUE MÁS IMPORTA ─────────────────────────────── */

grupo('CON POCOS DATOS SE VE DIGNO');
const flaco = yearReview([
  libro({ id: 'u', title: 'El único', finishedAt: fin(3), rating: 0, pages: '~150' }),
], { year: 2026, today: HOY });
const cardsFlaco = yearCards(flaco);

ok('no se declara «año» con un solo libro', !flaco.suficiente);
ok('pero hay tarjetas igual', cardsFlaco.length >= 2);
ok('NINGUNA tarjeta sale vacía o con guiones',
  cardsFlaco.every((c) => c.titulo && !/^[—-]$/.test(c.titulo) && c.titulo !== '0'),
  JSON.stringify(cardsFlaco.map((c) => c.titulo)));
ok('no se inventa un mejor valorado si no puntuaste nada',
  !cardsFlaco.some((c) => c.id === 'mejor'));
ok('ni una racha que no existe', !cardsFlaco.some((c) => c.id === 'racha'));
ok('ni un mes más lector con un solo libro', !cardsFlaco.some((c) => c.id === 'mes'));
ok('el cierre no finge: dice que esto empieza',
  /empez/i.test(cardsFlaco.at(-1).kicker), cardsFlaco.at(-1).kicker);

const vacio = yearCards(yearReview([], { year: 2026, today: HOY }));
ok('un año sin nada sigue teniendo portada y cierre', vacio.length === 2);
ok('y no dice «0 libros» a secas',
  /Todavía sin/.test(vacio[0].texto), vacio[0].texto);
ok('invita, en vez de regañar', /esperando/i.test(vacio[1].titulo), vacio[1].titulo);
igual('sin argumentos no revienta', yearCards(null), []);

/* ── LAS TARJETAS ────────────────────────────────────────────── */

grupo('UNA SECUENCIA DE TARJETAS, NO UNA TABLA');
const cards = yearCards(r);
ok('empieza por la portada', cards[0].id === 'portada');
ok('y termina con un cierre', cards.at(-1).id === 'cierre');
ok('cada una tiene título y texto', cards.every((c) => c.titulo && c.texto));
ok('están las de un año con datos',
  ['paginas', 'generos', 'mejor', 'largo', 'racha', 'mes'].every((id) => cards.some((c) => c.id === id)),
  JSON.stringify(cards.map((c) => c.id)));

grupo('EL MISMO LIBRO NO SALE DOS VECES');
const mismo = yearCards(yearReview([
  libro({ id: 'a', title: 'El Tocho', finishedAt: fin(1), rating: 5, pages: '~900' }),
  libro({ id: 'b', title: 'Otro', finishedAt: fin(2), rating: 3, pages: '~200' }),
  libro({ id: 'c', title: 'Y otro', finishedAt: fin(3), rating: 3, pages: '~200' }),
], { year: 2026, today: HOY }));
ok('si el mejor valorado ES el más largo, no hay tarjeta repetida',
  !mismo.some((c) => c.id === 'largo'),
  JSON.stringify(mismo.map((c) => c.id)));

/* ── EN CUALQUIER MOMENTO DEL AÑO ────────────────────────────── */

grupo('SE PUEDE MIRAR EN MARZO');
ok('el año en curso se marca como tal', r.enCurso);
ok('y la portada lo dice sin disimular', /En lo que va de/.test(cards[0].kicker), cards[0].kicker);
const pasado = yearReview(AÑO, { year: 2025, readingDays: DIAS, today: HOY });
ok('un año cerrado no dice «en lo que va de»',
  !/En lo que va de/.test(yearCards(pasado)[0].kicker));
igual('y cuenta lo suyo', pasado.leidos, 1);

grupo('QUÉ AÑOS SE PUEDEN MIRAR');
igual('los que tienen libros, y el actual', yearsWithBooks(AÑO, HOY), [2026, 2025]);
igual('sin libros, al menos el actual', yearsWithBooks([], HOY), [2026]);

/* ── LOS NÚMEROS QUE SE PUEDEN IMAGINAR ──────────────────────── */

grupo('MIL PÁGINAS SON DIEZ CENTÍMETROS');
ok('una pila en centímetros', /10 cm/.test(alturaDePapel(1000)), alturaDePapel(1000));
ok('y en metros cuando toca', /metros/.test(alturaDePapel(15000)), alturaDePapel(15000));
ok('con poco, no se ridiculiza', /principio/i.test(alturaDePapel(50)), alturaDePapel(50));
ok('la coma decimal es la nuestra', !/\d\.\d/.test(alturaDePapel(15000)), alturaDePapel(15000));

grupo('NADA DE MEDIAS QUE NO SIGNIFICAN NADA');
ok('no hay «libros por mes» en ninguna tarjeta',
  !cards.some((c) => /por mes|al mes/i.test(`${c.kicker} ${c.titulo} ${c.texto}`)));
igual('el tope de dignidad está donde dice', MINIMO_DIGNO, 3);

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
