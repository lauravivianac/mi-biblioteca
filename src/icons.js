/* ─────────────────────────────────────────────────────────────
   LOS ICONOS

   Antes de esto la app usaba emojis: 🗓 📚 ✨ 👀 ⇄ en la barra, 🔍 🔔
   🎨 ⚙ en la cabecera, 📕 📷 📎 dentro de los botones. Un emoji lo
   dibuja el sistema operativo, no nosotras: llega a todo color, con
   otro grosor de trazo y otro estilo en cada teléfono. Cinco emojis
   multicolores en fila sobre un fondo oscuro son lo que hace que una
   app parezca hecha por una máquina — porque literalmente los dibujó
   otra, y ninguno sabe que los demás existen.

   Los de ahora están dibujados a mano, con un solo grosor de trazo, y
   toman el color del texto. Salen del oficio de encuadernar, que es de
   lo que va la app: una cinta de leer, tres lomos en una balda, un
   libro abierto, dos fichas de biblioteca, dos flechas que se cruzan.

   LOS TRAZADOS ESTÁN EN `index.html`, en el <svg class="ico-pliego">
   del principio, y no aquí. Tienen que estar en el documento ANTES del
   primer pintado: la barra de navegación se ve de inmediato, y un
   <use> que apunta a un símbolo que todavía no ha llegado deja el
   hueco vacío el rato que tarde el módulo en cargar.

   Esto es solo la forma de pedirlos desde el HTML que generan los
   módulos.
   ───────────────────────────────────────────────────────────── */

/**
 * Un icono del pliego.
 * @param {string} nombre  el id sin el prefijo `i-`
 * @param {string} cls     clases extra
 */
export const ico = (nombre, cls = '') =>
  `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${nombre}"/></svg>`;
