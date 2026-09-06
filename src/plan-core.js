/* ─────────────────────────────────────────────────────────────
   PLAN LECTOR INTELIGENTE  ·  historias #34, #35, #36

   Es un problema de reparto, no de IA. Entran páginas, ritmo por
   género, meses disponibles y preferencias; sale una asignación.

   Con reglas es más barato, instantáneo y —lo que de verdad
   importa— explicable: siempre se puede decir por qué un libro
   quedó en marzo.
   ───────────────────────────────────────────────────────────── */

import { MONTH_ORDER, pageCount } from './seed.js';

/* Núcleo puro: recibe los datos, no los busca. Así se puede probar
   sin Firebase, sin navegador y sin sesión — ver scripts/test-planner.mjs */

/* Un lector medio va a unas 250 palabras por minuto y una página
   trae unas 300. De ahí sale la traducción de minutos a páginas,
   que es lo que hace que "media hora al día" se sienta concreto. */
const PAGES_PER_MINUTE = 250 / 300;

/** Géneros que piden más calma. 1 = ritmo normal. */
const GENRE_FRICTION = {
  'Clásico universal': 1.35,
  'No ficción / Desarrollo': 1.25,
  'Historia / Mitología': 1.3,
  'Poesía / Teatro': 1.4,
  'Oriente / Espiritualidad': 1.1,
  'Autobiografía': 1.05,
  'Thriller': 0.85,
  'Terror / Misterio': 0.9,
  'Fantasía / Juvenil': 0.85,
  'Novela contemporánea': 1,
  'Latinoamérica': 1.05,
  /* Los géneros nuevos. El romance y la aventura se leen rápido, y
     eso no es un juicio sobre ellos: es cuántas páginas caben en una
     tarde, que es lo único que el plan necesita saber. */
  'Romance': 0.8,
  'Aventura': 0.85,
  'Humor': 0.85,
  'Infantil': 0.7,
  'Novela gráfica / Cómic': 0.5,
  'Fantasía': 0.9,
  'Ciencia ficción': 1,
  'Novela histórica': 1.15,
  'Ensayo / Filosofía': 1.45,
};

/** Afinidades de temporada que ya estaban en el plan escrito a mano. */
const SEASON = {
  Octubre: ['Terror / Misterio'],
  Noviembre: ['Historia / Mitología', 'Clásico universal'],
  Diciembre: ['Historia / Mitología', 'Clásico universal'],
  Enero: ['Oriente / Espiritualidad'],
  Febrero: ['Oriente / Espiritualidad', 'Romance'],
  Junio: ['Aventura'],
  Julio: ['Fantasía / Juvenil', 'Fantasía', 'Aventura'],
  Agosto: ['Autobiografía'],
};

const daysInMonth = (year, monthIdx) => new Date(year, monthIdx + 1, 0).getDate();

/* ── RITMO REAL  ·  historia #34 ─────────────────────────────── */

/**
 * Páginas por día. Prefiere lo observado sobre lo declarado:
 * cuando difieren, la realidad gana para planificar.
 */
export function readingPace(ctx) {
  const { books, entry, statusOf, settings } = ctx;
  const finished = books.filter((b) => {
    const e = entry(b.id);
    return statusOf(b.id) === 'read' && e.startedAt && e.finishedAt && e.finishedAt > e.startedAt;
  });

  const samples = finished
    .map((b) => {
      const e = entry(b.id);
      const pages = pageCount(b.pages);
      if (!pages) return null;
      const days = Math.max(1, (e.finishedAt - e.startedAt) / 86400000);
      const perDay = pages / days;
      // Un registro de 600 páginas de golpe es alguien poniéndose al día, no leyendo
      if (perDay > 250 || perDay < 1) return null;
      return { genre: b.genre, perDay };
    })
    .filter(Boolean);

  const s = settings;
  const declaredPerDay = s.minutesWeekday != null
    ? ((s.minutesWeekday * 5 + (s.minutesWeekend ?? s.minutesWeekday) * 2) / 7) * PAGES_PER_MINUTE
    : null;

  if (!samples.length) {
    return {
      pagesPerDay: declaredPerDay ?? 20,
      source: declaredPerDay ? 'declarado' : 'estimado',
      provisional: true,
      sampleSize: 0,
      byGenre: {},
    };
  }

  const overall = samples.reduce((a, x) => a + x.perDay, 0) / samples.length;
  const byGenre = {};
  for (const g of new Set(samples.map((x) => x.genre))) {
    const xs = samples.filter((x) => x.genre === g);
    if (xs.length >= 2) byGenre[g] = xs.reduce((a, x) => a + x.perDay, 0) / xs.length;
  }

  return {
    pagesPerDay: overall,
    source: 'observado',
    provisional: samples.length < 4,
    sampleSize: samples.length,
    byGenre,
  };
}

/** Páginas por día para un género concreto. */
function paceFor(pace, genre) {
  if (pace.byGenre[genre]) return pace.byGenre[genre];
  return pace.pagesPerDay / (GENRE_FRICTION[genre] ?? 1);
}

/** Cuánto tardaría un libro concreto, con tu ritmo y su género. */
export function estimateDays(book, pace = readingPace()) {
  const pages = pageCount(book.pages);
  if (!pages) return null;
  return Math.max(1, Math.round(pages / paceFor(pace, book.genre)));
}

/* ── OBJETIVO  ·  historia #33 ───────────────────────────────── */

/**
 * ¿Es alcanzable el objetivo? Se responde ANTES de confirmarlo.
 * Un plan que no se puede cumplir desmotiva más que no tener plan.
 */
export function goalFeasibility(ctx, { goalKind, goalValue, goalYear }, pace = readingPace(ctx)) {
  if (!goalValue) return null;
  const now = new Date();
  const endOfYear = new Date(goalYear, 11, 31);
  const daysLeft = Math.max(1, Math.ceil((endOfYear - now) / 86400000));
  const pagesLeft = pace.pagesPerDay * daysLeft;

  const pending = ctx.books.filter((b) => ctx.statusOf(b.id) !== 'read');
  const avgPages = pending.length
    ? pending.reduce((a, b) => a + (pageCount(b.pages) || 300), 0) / pending.length
    : 300;

  let achievable;
  if (goalKind === 'books') achievable = Math.floor(pagesLeft / avgPages);
  else if (goalKind === 'pages') achievable = Math.floor(pagesLeft);
  else achievable = Math.round(pace.pagesPerDay / PAGES_PER_MINUTE);

  const alreadyDone = countProgressThisYear(ctx, goalKind, goalYear);
  const reachable = achievable + alreadyDone;

  return {
    goalValue, achievable: reachable, alreadyDone, daysLeft,
    ok: reachable >= goalValue,
    suggestion: Math.max(1, reachable),
    provisional: pace.provisional,
  };
}

function countProgressThisYear(ctx, kind, year) {
  const books = ctx.books.filter((b) => {
    const e = ctx.entry(b.id);
    return ctx.statusOf(b.id) === 'read' && (!e.finishedAt || new Date(e.finishedAt).getFullYear() === year);
  });
  if (kind === 'pages') return books.reduce((a, b) => a + (pageCount(b.pages) || 0), 0);
  if (kind === 'minutes') return 0;
  return books.length;
}

/** Avance contra el objetivo: cuántos llevo, cuántos faltan, si voy adelantada. */
export function goalProgress(ctx) {
  const s = ctx.settings;
  if (!s.goalValue) return null;
  const done = countProgressThisYear(ctx, s.goalKind, s.goalYear);
  const now = new Date();
  const start = new Date(s.goalYear, 0, 1);
  const end = new Date(s.goalYear, 11, 31);
  const elapsed = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const expected = s.goalValue * elapsed;
  const diff = done - expected;
  return {
    done, goal: s.goalValue, kind: s.goalKind,
    pct: Math.min(100, Math.round((done / s.goalValue) * 100)),
    expected: Math.round(expected),
    ahead: diff >= 0,
    diffUnits: Math.abs(Math.round(diff)),
  };
}

/* ── LIBROS REPRESADOS  ·  historia #36 ──────────────────────── */

/** Los que se quedaron atrás. Hoy siguen diciendo "mayo" para siempre. */
export function stalledBooks(ctx, today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth();
  return ctx.books
    .filter((b) => {
      if (ctx.statusOf(b.id) === 'read' || ctx.statusOf(b.id) === 'abandoned') return false;
      if (!b.year || !b.month) return false;
      const idx = MONTH_ORDER.indexOf(b.month);
      if (idx < 0) return false;
      return b.year < y || (b.year === y && idx < m);
    })
    .map((b) => {
      const idx = MONTH_ORDER.indexOf(b.month);
      const monthsLate = (y - b.year) * 12 + (m - idx);
      return { ...b, monthsLate, startedAlready: ctx.pagesRead(b.id) > 0 };
    })
    .sort((a, b) => b.monthsLate - a.monthsLate);
}

/* ── GENERACIÓN DEL PLAN  ·  historia #35 ────────────────────── */

const isAnchor = (b) => (b.role || '').includes('Ancla');

/**
 * Reparte los pendientes mes a mes.
 * Mantiene el formato que ya funciona: un ⚓ Ancla y un ⚡ Corto por mes.
 *
 * Devuelve también el porqué de cada asignación, que es lo que
 * permite explicar el plan en vez de imponerlo.
 */
export function generatePlan(ctx, { months = 12, from = new Date(), respectPinned = true } = {}) {
  const pace = readingPace(ctx);
  const stalled = new Set(stalledBooks(ctx, from).map((b) => b.id));

  let pool = ctx.books
    .filter((b) => ctx.statusOf(b.id) !== 'read' && ctx.statusOf(b.id) !== 'abandoned')
    .filter((b) => !(respectPinned && ctx.entry(b.id).pinnedMonth));

  // Los represados van primero: para eso se rescatan
  pool.sort((a, b) => {
    const s = (stalled.has(b.id) ? 1 : 0) - (stalled.has(a.id) ? 1 : 0);
    if (s) return s;
    return (pageCount(a.pages) || 0) - (pageCount(b.pages) || 0);
  });

  const anchors = pool.filter(isAnchor);
  const shorts = pool.filter((b) => !isAnchor(b));

  const assignments = [];
  const overflow = [];       // libros que ocupan más de un mes
  let recentGenres = [];

  for (let i = 0; i < months; i++) {
    const date = new Date(from.getFullYear(), from.getMonth() + i, 1);
    const year = date.getFullYear();
    const monthName = MONTH_ORDER[date.getMonth()];
    const capacity = pace.pagesPerDay * daysInMonth(year, date.getMonth());

    // Un libro largo arrastrado del mes anterior consume capacidad aquí
    const carried = overflow.shift() || null;
    let left = capacity - (carried ? carried.remaining : 0);

    const slot = { year, month: monthName, books: [], carried: carried?.book || null, capacity: Math.round(capacity) };

    /**
     * Elige el mejor candidato para un hueco.
     * El ⚓ Ancla busca llenar el mes; el ⚡ Corto, lo que sobre.
     * A un Ancla NO se le castiga por ser larga: para eso existe
     * el arrastre. Si se la castigara, El Conde de Montecristo
     * no entraría nunca en el plan de quien lee despacio.
     */
    const pick = (list, budget, role) => {
      const seasonal = SEASON[monthName] || [];
      const target = role === 'ancla' ? budget * 0.95 : budget * 0.5;
      const tolerance = role === 'ancla' ? 160 : 45;
      let best = null; let bestScore = -Infinity;
      for (const b of list) {
        const pages = pageCount(b.pages) || 250;
        let score = 0;
        /* La temporada pesa más que el rescate a propósito: hay once meses
           más donde rescatar, pero el terror de octubre solo cae en octubre.
           Es lo que conserva el carácter del plan hecho a mano. */
        if (seasonal.includes(b.genre)) score += 70;
        if (stalled.has(b.id)) score += 50;
        if (recentGenres.includes(b.genre)) score -= 60;
        score -= Math.abs(pages - target) / tolerance;
        // Un Corto que no cabe deja de ser corto
        if (role === 'corto' && pages > budget) score -= 60;
        if (score > bestScore) { bestScore = score; best = b; }
      }
      return best;
    };

    if (carried) {
      // Un libro largo sigue ocupando este mes; puede seguir al siguiente
      slot.books.push({ ...carried.book, slotRole: 'ancla', continuing: true,
        reason: `Viene del mes anterior: ${carried.remaining} págs. por leer` });
      recentGenres = [carried.book.genre, ...recentGenres].slice(0, 3);
      if (carried.remaining > left) {
        overflow.unshift({ book: carried.book, remaining: carried.remaining - left });
        left = 0;
      } else {
        left -= carried.remaining;
      }
    } else {
      const anchor = pick(anchors, capacity, 'ancla');
      if (anchor) {
        anchors.splice(anchors.indexOf(anchor), 1);
        const pages = pageCount(anchor.pages) || 250;
        const reason = reasonFor(anchor, monthName, stalled.has(anchor.id), recentGenres);
        slot.books.push({ ...anchor, slotRole: 'ancla', reason });
        recentGenres = [anchor.genre, ...recentGenres].slice(0, 3);
        if (pages > left) {
          overflow.push({ book: anchor, remaining: pages - left });
          left = 0;
        } else {
          left -= pages;
        }
      }
    }

    if (left > 60) {
      const short = pick(shorts, left, 'corto');
      if (short) {
        shorts.splice(shorts.indexOf(short), 1);
        const reason = reasonFor(short, monthName, stalled.has(short.id), recentGenres);
        slot.books.push({ ...short, slotRole: 'corto', reason });
        recentGenres = [short.genre, ...recentGenres].slice(0, 3);
        left -= pageCount(short.pages) || 120;
      }
    }

    assignments.push(slot);
  }

  return {
    assignments,
    pace,
    used: assignments.reduce((a, s) => a + s.books.filter((b) => !b.continuing).length, 0),
    remaining: anchors.length + shorts.length,
    rescued: assignments.flatMap((s) => s.books).filter((b) => stalled.has(b.id)).length,
  };
}

function reasonFor(book, monthName, wasStalled, recentGenres) {
  if (wasStalled) return `Estaba represado desde ${book.month} de ${book.year}`;
  if ((SEASON[monthName] || []).includes(book.genre)) return `${book.genre} encaja con ${monthName}`;
  if (!recentGenres.includes(book.genre)) return `Cambia de género respecto al mes anterior`;
  return `Cabe en el tiempo que tienes este mes`;
}

/** Aplica un plan generado: escribe año y mes en cada libro. */
export function planPatches(plan) {
  const patches = [];
  for (const slot of plan.assignments) {
    for (const b of slot.books) {
      patches.push({ id: b.id, year: slot.year, month: slot.month });
    }
  }
  return patches;
}
