/* Pruebas del generador de plan lector  ·  historias #34, #35, #36
   Sin Firebase, sin navegador: el núcleo es puro a propósito.
   Uso:  node scripts/test-planner.mjs */

import { seedBooks, MONTH_ORDER, pageCount } from '../src/seed.js';
import * as core from '../src/plan-core.js';

let pass = 0, fail = 0;
const ok = (cond, name, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? '\n      ' + detail : ''}`); }
};

/** Construye un contexto de prueba a partir de un mapa de entradas. */
function ctxWith(entries = {}, settings = {}) {
  const books = seedBooks();
  const get = (id) => entries[id] || {};
  return {
    books: books.filter((b) => !get(b.id).hidden),
    entry: get,
    statusOf: (id) => get(id).status || 'pending',
    pagesRead: (id) => get(id).page || 0,
    settings: { goalKind: 'books', goalYear: 2026, ...settings },
  };
}

console.log('\nRITMO DE LECTURA');
{
  const ctx = ctxWith({}, { minutesWeekday: 30, minutesWeekend: 60 });
  const pace = core.readingPace(ctx);
  ok(pace.source === 'declarado', 'usa el tiempo declarado cuando no hay historial');
  ok(pace.provisional === true, 'se marca como provisional con pocos datos');
  ok(pace.pagesPerDay > 25 && pace.pagesPerDay < 35,
     'media hora entre semana y una hora el finde ≈ 30 páginas/día',
     `dio ${pace.pagesPerDay.toFixed(1)}`);

  const sinNada = core.readingPace(ctxWith({}));
  ok(sinNada.source === 'estimado' && sinNada.pagesPerDay === 20,
     'sin tiempo declarado ni historial, cae en una estimación honesta');
}
{
  // Cuatro libros terminados en 10 días cada uno
  const books = seedBooks();
  const entries = {};
  books.slice(0, 4).forEach((b) => {
    entries[b.id] = {
      status: 'read',
      startedAt: Date.UTC(2026, 0, 1),
      finishedAt: Date.UTC(2026, 0, 11),
    };
  });
  const pace = core.readingPace(ctxWith(entries));
  ok(pace.source === 'observado', 'prefiere lo observado sobre lo declarado');
  ok(pace.sampleSize === 4, 'cuenta las muestras válidas');

  // Un registro absurdo no debe contaminar
  const conAbsurdo = { ...entries };
  const big = books.find((b) => pageCount(b.pages) > 1000);
  conAbsurdo[big.id] = { status: 'read', startedAt: Date.UTC(2026, 0, 1), finishedAt: Date.UTC(2026, 0, 2) };
  const pace2 = core.readingPace(ctxWith(conAbsurdo));
  ok(pace2.sampleSize === 4, 'descarta 1.200 páginas en un día: es ponerse al día, no leer');
}

console.log('\nLIBROS REPRESADOS');
{
  const ctx = ctxWith({}, {});
  const hoy = new Date(2026, 8, 15);   // septiembre de 2026
  const stalled = core.stalledBooks(ctx, hoy);
  ok(stalled.length > 0, 'encuentra libros cuyo mes ya pasó');
  ok(stalled.every((b) => b.monthsLate >= 0), 'ninguno tiene retraso negativo');
  ok(stalled[0].monthsLate >= stalled[stalled.length - 1].monthsLate,
     'ordena por cuánto llevan esperando');
  const mayo = stalled.find((b) => b.month === 'Mayo' && b.year === 2026);
  ok(mayo && mayo.monthsLate === 4, 'mayo de 2026 visto en septiembre = 4 meses de retraso',
     mayo ? `dio ${mayo.monthsLate}` : 'no encontró el libro de mayo');

  // Los leídos no están represados
  const books = seedBooks();
  const leido = books.find((b) => b.year === 2026 && b.month === 'Mayo');
  const stalled2 = core.stalledBooks(ctxWith({ [leido.id]: { status: 'read' } }), hoy);
  ok(!stalled2.some((b) => b.id === leido.id), 'un libro leído deja de estar represado');
}

console.log('\nGENERACIÓN DEL PLAN');
{
  const ctx = ctxWith({}, { minutesWeekday: 40, minutesWeekend: 90 });
  const from = new Date(2026, 8, 1);
  const plan = core.generatePlan(ctx, { months: 12, from });

  ok(plan.assignments.length === 12, 'genera los 12 meses pedidos');
  ok(plan.used > 0, 'asigna libros', `asignó ${plan.used}`);

  const allIds = plan.assignments.flatMap((s) => s.books.map((b) => b.id));
  ok(new Set(allIds).size === allIds.length, 'ningún libro se repite en dos meses');

  const conAncla = plan.assignments.filter((s) => s.books.some((b) => b.slotRole === 'ancla'));
  ok(conAncla.length >= 8, 'la mayoría de meses tiene su ⚓ Ancla', `${conAncla.length}/12`);

  const octubre = plan.assignments.find((s) => s.month === 'Octubre');
  ok(octubre && octubre.books.some((b) => b.genre === 'Terror / Misterio'),
     'octubre respeta la afinidad de temporada con el terror',
     octubre ? octubre.books.map((b) => b.genre).join(', ') : 'sin octubre');

  ok(plan.assignments.every((s) => s.books.every((b) => b.reason)),
     'cada asignación explica por qué: el plan se explica, no se impone');

  ok(plan.rescued > 0, 'rescata libros represados en el plan nuevo', `rescató ${plan.rescued}`);

  // Géneros repetidos en meses seguidos
  let repes = 0;
  for (let i = 1; i < plan.assignments.length; i++) {
    const prev = plan.assignments[i - 1].books.map((b) => b.genre);
    const cur = plan.assignments[i].books.map((b) => b.genre);
    if (cur.some((g) => prev.includes(g))) repes++;
  }
  ok(repes <= 4, 'evita amontonar el mismo género en meses seguidos', `${repes} meses seguidos repiten`);
}
{
  // Un libro enorme no debe romper el mes
  const ctx = ctxWith({}, { minutesWeekday: 15, minutesWeekend: 15 });
  const plan = core.generatePlan(ctx, { months: 6, from: new Date(2026, 8, 1) });
  const conArrastre = plan.assignments.filter((s) => s.carried);
  ok(conArrastre.length > 0, 'un libro largo ocupa dos meses en vez de romper el mes',
     `${conArrastre.length} meses con arrastre`);
}
{
  // Los libros fijados a mano no se mueven
  const books = seedBooks();
  const fijado = books.find((b) => b.year === 2027);
  const ctx = ctxWith({ [fijado.id]: { pinnedMonth: 'Marzo' } });
  const plan = core.generatePlan(ctx, { months: 12, from: new Date(2026, 8, 1) });
  ok(!plan.assignments.flatMap((s) => s.books).some((b) => b.id === fijado.id),
     'un libro fijado a mano queda fuera del reparto automático');
}

console.log('\nOBJETIVO');
{
  const ctx = ctxWith({}, { minutesWeekday: 30, minutesWeekend: 60, goalKind: 'books', goalValue: 24, goalYear: 2026 });
  const f = core.goalFeasibility(ctx, { goalKind: 'books', goalValue: 24, goalYear: 2026 });
  ok(f !== null, 'evalúa el objetivo');
  ok(typeof f.ok === 'boolean', 'dice si es alcanzable ANTES de confirmarlo');
  ok(f.suggestion >= 1, 'propone siempre una cifra realista, nunca cero');

  const imposible = core.goalFeasibility(ctx, { goalKind: 'books', goalValue: 500, goalYear: 2026 });
  ok(imposible.ok === false, '500 libros en lo que queda de año no es alcanzable');
  ok(imposible.suggestion < 500, 'y propone una cifra menor en su lugar');
}
{
  const books = seedBooks();
  const entries = {};
  books.slice(0, 6).forEach((b) => { entries[b.id] = { status: 'read', finishedAt: Date.UTC(2026, 3, 1) }; });
  const ctx = ctxWith(entries, { goalKind: 'books', goalValue: 12, goalYear: 2026 });
  const p = core.goalProgress(ctx);
  ok(p.done === 6, 'cuenta lo leído este año', `contó ${p.done}`);
  ok(p.pct === 50, 'calcula el porcentaje contra la meta', `dio ${p.pct}%`);
  ok(typeof p.ahead === 'boolean', 'dice si vas adelantada o atrasada');
}

console.log(`\n${pass} pruebas pasaron, ${fail} fallaron.`);
process.exit(fail ? 1 : 0);
