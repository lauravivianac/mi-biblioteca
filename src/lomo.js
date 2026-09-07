/* ─────────────────────────────────────────────────────────────
   EL LOMO DE UN LIBRO

   Un libro sin portada era, hasta ahora, un 📕 o su inicial dentro de
   una caja redondeada: la misma caja que un filtro, que un botón y que
   un aviso. En una app que trata de libros, los libros eran lo único
   sin cuerpo.

   Esto dibuja su lomo: tela, dos filetes de latón arriba y abajo, el
   título estampado en vertical y el canto de las hojas asomando.

   Y la tela NO es aleatoria ni un degradado: son ocho telas de
   encuadernación y **a cada género le toca siempre la misma**. Eso
   convierte una lista en una estantería: antes de leer un solo título
   ya se ve que los tres de arriba son del mismo género. Un color por
   libro sería decoración; un color por género es información.

   CUÁLES son esas ocho lo decide el tema, no este archivo: en Ex
   Libris son telas de encuadernar, en Obsidiana ocho grises sin color,
   en Pergamino tonos medios sobre papel claro —porque un lomo negro
   sobre crema es un agujero, no un libro— y en Máquina bloques planos
   sin pan de oro. Aquí solo se decide qué ranura le toca a cada
   género. Los colores están en `styles/tokens.css` y cada tema los
   reemplaza.

   Vive aparte para que lo usen todos los sitios donde aparece un libro
   sin portada, que son muchos: el plan, la estantería, el tracker, la
   ficha, «qué leer después», «¿cuál primero?», los huecos del plan y
   el alta de un libro nuevo.
   ───────────────────────────────────────────────────────────── */

import { esc } from './ui.js';

/* Ocho ranuras, no ocho colores: el color de cada una lo pone el tema
   (`--tela-1` … `--tela-8` en styles/tokens.css). Aquí solo se decide
   CUÁL le toca a cada género, y eso no cambia nunca. */
const RANURAS = 8;

/** La ranura que le toca a un texto. Siempre la misma. */
export function ranuraDe(texto) {
  let h = 0;
  const s = String(texto || '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % RANURAS) + 1;
}

/** La tela de esa ranura, tal cual se pone en el atributo `style`. */
export const telaDe = (texto) => `var(--tela-${ranuraDe(texto)})`;

/**
 * @param {{title?: string, genre?: string}} libro
 * @param {{mini?: boolean, cls?: string}} opciones
 *   `mini` quita el título estampado: por debajo de unos 34 px de ancho
 *   no se lee y solo ensucia el lomo.
 */
export function lomoHtml(libro = {}, { mini = false, cls = '' } = {}) {
  const titulo = libro.title || '';
  /* La tela y SU estampado van juntos: cada tela trae el color con el
     que se le estampa encima, porque en una tela clara no se estampa
     en oro. Ver `telas()` en src/themes.js. */
  const n = ranuraDe(libro.genre || titulo);
  return `<span class="lomo${mini ? ' lomo-mini' : ''}${cls ? ' ' + cls : ''}"`
    + ` style="--tela:var(--tela-${n});--lomo-filete:var(--tela-${n}-tinta,var(--lomo-filete))">`
    + `<span class="lomo-txt">${esc(titulo)}</span>`
    + '<span class="lomo-canto"></span></span>';
}
