/* ─────────────────────────────────────────────────────────────
   EL LOMO DE UN LIBRO

   Un libro sin portada era, hasta ahora, un 📕 o su inicial dentro de
   una caja redondeada: la misma caja que un filtro, que un botón y que
   un aviso. En una app que trata de libros, los libros eran lo único
   sin cuerpo.

   Esto dibuja su lomo: tela, dos filetes de latón arriba y abajo, el
   título estampado en vertical y el canto de las hojas asomando.

   Y la tela NO es aleatoria ni un degradado: son ocho colores de tela
   de encuadernación —burdeos, teja, ocre, oliva, bosque, pizarra,
   marino y ciruela— y a cada género le toca siempre el mismo. Eso
   convierte una lista en una estantería: antes de leer un solo título
   ya se ve que los tres de arriba son del mismo género. Un color por
   libro sería decoración; un color por género es información.

   Vive aparte para que lo usen todos los sitios donde aparece un libro
   sin portada, que son muchos: el plan, la estantería, el tracker, la
   ficha, «qué leer después», «¿cuál primero?», los huecos del plan y
   el alta de un libro nuevo.
   ───────────────────────────────────────────────────────────── */

import { esc } from './ui.js';

const TELAS = [
  '355 34% 25%',  // burdeos
  '18 36% 25%',   // teja
  '38 30% 25%',   // ocre
  '78 18% 23%',   // oliva
  '152 20% 21%',  // bosque
  '202 22% 23%',  // pizarra
  '223 24% 26%',  // marino
  '288 18% 25%',  // ciruela
];

/** Siempre la misma tela para el mismo texto. */
export function telaDe(texto) {
  let h = 0;
  const s = String(texto || '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TELAS[h % TELAS.length];
}

/**
 * @param {{title?: string, genre?: string}} libro
 * @param {{mini?: boolean, cls?: string}} opciones
 *   `mini` quita el título estampado: por debajo de unos 34 px de ancho
 *   no se lee y solo ensucia el lomo.
 */
export function lomoHtml(libro = {}, { mini = false, cls = '' } = {}) {
  const titulo = libro.title || '';
  return `<span class="lomo${mini ? ' lomo-mini' : ''}${cls ? ' ' + cls : ''}"`
    + ` style="--tela:${telaDe(libro.genre || titulo)}">`
    + `<span class="lomo-txt">${esc(titulo)}</span>`
    + '<span class="lomo-canto"></span></span>';
}
