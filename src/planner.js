/* ─────────────────────────────────────────────────────────────
   PLAN LECTOR  ·  enlace entre el núcleo puro y los datos reales.
   Toda la lógica vive en plan-core.js, que no sabe de Firebase.
   ───────────────────────────────────────────────────────────── */

import * as core from './plan-core.js';
import { allBooks, entry, statusOf, settings, pagesRead } from './store.js';

const ctx = () => ({
  books: allBooks(),
  entry, statusOf, pagesRead,
  settings: settings(),
});

export const readingPace = () => core.readingPace(ctx());
export const estimateDays = (book, pace) => core.estimateDays(book, pace || readingPace());
export const goalFeasibility = (goal) => core.goalFeasibility(ctx(), goal);
export const goalProgress = () => core.goalProgress(ctx());
export const stalledBooks = (today) => core.stalledBooks(ctx(), today);
export const generatePlan = (opts) => core.generatePlan(ctx(), opts);
export const planPatches = core.planPatches;
