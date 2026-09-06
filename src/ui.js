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

export function openSheet(id) { $(id)?.classList.add('open'); }
export function closeSheet(id) { $(id)?.classList.remove('open'); }

/** Cierra un overlay solo si el clic fue en el fondo, no dentro de la hoja. */
export function backdropClose(event, id) {
  if (event.target === $(id)) closeSheet(id);
}

/** Confirmación con texto propio en vez del confirm() del navegador. */
export function confirmAction({ title, body, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'overlay open confirm-overlay';
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
