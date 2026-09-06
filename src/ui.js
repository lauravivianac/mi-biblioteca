/* Utilidades de interfaz compartidas. */

export const $ = (id) => document.getElementById(id);

/** Escapa texto que va a HTML. Los títulos y reseñas son datos, no marcado. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export const initial = (t) => String(t || '?').charAt(0).toUpperCase();

let toastTimer = null;
export function toast(message, kind = 'info') {
  let el = $('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.dataset.kind = kind;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ── LA PILA DE HOJAS ────────────────────────────────────────
   TODAS LAS HOJAS TENÍAN EL MISMO `z-index`, así que la que ganaba era
   la que estuviera más abajo en el HTML — un orden que no tiene nada
   que ver con cuál abriste tú.

   Y `settings-overlay` está casi al final del index.html, así que
   TODAS las hojas que se abren desde ajustes —tu perfil, dónde estás,
   tus libros ofrecidos, bloqueadas, invitar, qué se ve en tu perfil—
   se abrían enteras POR DETRÁS de ajustes. La hoja existía, estaba en
   `display: flex`, y no se veía: tocar esas seis filas no hacía nada.

   Comprobado en un navegador de verdad antes de tocar esto: con las
   dos abiertas, `elementFromPoint` en mitad de la pantalla devolvía
   `settings-overlay`.

   Se arregla con una pila: la última que abres va por encima, que es
   lo único que la gente espera. El contador vuelve a cero cuando no
   queda ninguna abierta, para que no crezca sin fin. */
const BASE_Z = 300;
let profundidad = 0;

export function openSheet(id) {
  const el = $(id);
  if (!el || el.classList.contains('open')) return;
  profundidad += 1;
  el.style.zIndex = String(BASE_Z + profundidad);
  el.classList.add('open');
}

export function closeSheet(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove('open');
  el.style.zIndex = '';
  // Vaciada la pila, se reinicia: si no, el número sube para siempre.
  if (!document.querySelector('.overlay.open')) profundidad = 0;
}

/** Cierra un overlay solo si el clic fue en el fondo, no dentro de la hoja. */
export function backdropClose(event, id) {
  if (event.target === $(id)) closeSheet(id);
}

/** Confirmación con texto propio en vez del confirm() del navegador. */
export function confirmAction({ title, body, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'overlay open confirm-overlay';
    /* Una confirmación va SIEMPRE encima de todo: se pregunta por algo
       que se está haciendo en la hoja de debajo, y con la pila de
       arriba una hoja abierta podría quedar por encima de la pregunta. */
    wrap.style.zIndex = String(BASE_Z + 1000);
    wrap.innerHTML = `
      <div class="sheet confirm-sheet">
        <div class="sheet-title">${esc(title)}</div>
        <p class="confirm-body">${body}</p>
        <div class="confirm-actions">
          <button class="btn-ghost" data-act="cancel">Cancelar</button>
          <button class="${danger ? 'btn-danger' : 'btn-magic'}" data-act="ok">${esc(confirmLabel)}</button>
        </div>
      </div>`;
    const done = (v) => { wrap.remove(); resolve(v); };
    wrap.addEventListener('click', (e) => {
      const act = e.target.dataset?.act;
      if (act === 'ok') done(true);
      else if (act === 'cancel' || e.target === wrap) done(false);
    });
    document.body.appendChild(wrap);
  });
}

/** Descarga un archivo generado en el dispositivo. */
export function download(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
