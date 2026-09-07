/* ─────────────────────────────────────────────────────────────
   LOGROS  ·  historia #70

   La moneda de la app. Deliberadamente no es dinero: un accesorio
   que costó terminar un libro de 900 páginas significa algo; uno
   que costó dos dólares, no.

   De aquí cuelgan los temas de temporada (#80), los rincones de la
   mascota y —desde la tanda de ilustraciones— las cuatro especies
   que no vienen abiertas (#41). Hasta el #80, Gótico y Sakura
   estaban bloqueados sin nada que pudiera desbloquearlos.

   El premio se movió del pelaje a la especie a propósito: una
   especie ilustrada llega pintada y sin postizos, así que el
   guardarropa desaparece con ellas y un logro no puede colgar de
   algo que se va.

   Cada logro dice qué falta, porque saberlo es parte del incentivo.
   ───────────────────────────────────────────────────────────── */

import { allBooks, statusOf, entry, reviewOf, settings, updateSettings } from './store.js';
import { pageCount } from './seed.js';

const readBooks = () => allBooks().filter((b) => statusOf(b.id) === 'read');

export const ACHIEVEMENTS = [
  {
    id: 'primer-libro',
    name: 'El primero',
    hint: 'Termina tu primer libro',
    icon: '📖',
    progress: () => ({ done: readBooks().length, need: 1 }),
  },
  {
    id: 'primera-resena',
    name: 'Con tus palabras',
    hint: 'Escribe tu primera reseña',
    icon: '✍️',
    progress: () => ({ done: allBooks().filter((b) => reviewOf(b.id).trim().length > 20).length, need: 1 }),
  },
  {
    id: 'primer-clasico',
    name: 'Un clásico',
    hint: 'Termina un clásico universal',
    icon: '🏛️',
    progress: () => ({ done: readBooks().filter((b) => b.genre === 'Clásico universal').length, need: 1 }),
  },
  {
    id: 'cinco-generos',
    name: 'De todo un poco',
    hint: 'Termina libros de cinco géneros distintos',
    icon: '🎭',
    progress: () => ({ done: new Set(readBooks().map((b) => b.genre)).size, need: 5 }),
  },
  {
    id: 'tomo-500',
    name: 'El ladrillo',
    hint: 'Termina un libro de más de 500 páginas',
    icon: '🧱',
    progress: () => ({ done: readBooks().filter((b) => (pageCount(b.pages) || 0) > 500).length, need: 1 }),
  },
  {
    id: 'diez-libros',
    name: 'Diez',
    hint: 'Termina diez libros',
    icon: '🔟',
    progress: () => ({ done: readBooks().length, need: 10 }),
  },
  {
    id: 'veinticinco-libros',
    name: 'Veinticinco',
    hint: 'Termina veinticinco libros',
    icon: '🌟',
    progress: () => ({ done: readBooks().length, need: 25 }),
  },
  {
    id: 'octubre-terror',
    name: 'Noche de brujas',
    hint: 'Termina un mes de Terror / Misterio',
    icon: '🕯️',
    unlocksTheme: 'gotico',
    progress: () => ({ done: readBooks().filter((b) => b.genre === 'Terror / Misterio').length, need: 2 }),
  },
  {
    id: 'bloque-oriental',
    name: 'El bloque oriental',
    hint: 'Termina 4 libros de Oriente / Espiritualidad',
    icon: '🌸',
    unlocksTheme: 'sakura',
    progress: () => ({ done: readBooks().filter((b) => b.genre === 'Oriente / Espiritualidad').length, need: 4 }),
  },
  {
    id: 'anio-completo',
    name: 'Un año entero',
    hint: 'Termina todos los libros de un año del plan',
    icon: '🗓️',
    progress: () => {
      const years = [...new Set(allBooks().map((b) => b.year).filter(Boolean))];
      const best = years.map((y) => {
        const ofYear = allBooks().filter((b) => b.year === y);
        const read = ofYear.filter((b) => statusOf(b.id) === 'read').length;
        return ofYear.length ? read / ofYear.length : 0;
      });
      return { done: Math.round(Math.max(0, ...best) * 100), need: 100, unit: '%' };
    },
  },
];

export const byId = (id) => ACHIEVEMENTS.find((a) => a.id === id);

/** Estado de cada logro: conseguido, y cuánto falta si no. */
export function achievementStatus() {
  const earned = settings().achievements || [];
  return ACHIEVEMENTS.map((a) => {
    const p = a.progress();
    return {
      ...a,
      earned: earned.includes(a.id) || p.done >= p.need,
      done: Math.min(p.done, p.need),
      need: p.need,
      unit: p.unit || '',
      pct: Math.min(100, Math.round((p.done / p.need) * 100)),
    };
  });
}

/**
 * Recalcula y guarda los logros nuevos.
 * Devuelve solo los recién conseguidos, para poder celebrarlos:
 * un logro que se consigue en silencio no motiva a nadie.
 */
export function refreshAchievements() {
  const before = settings().achievements || [];
  const now = achievementStatus().filter((a) => a.earned).map((a) => a.id);
  const fresh = now.filter((id) => !before.includes(id));
  if (fresh.length) updateSettings({ achievements: now });
  return fresh.map(byId);
}

/** Cuántos faltan, para el resumen en ajustes. */
export const earnedCount = () => achievementStatus().filter((a) => a.earned).length;
