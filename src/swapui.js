/* ─────────────────────────────────────────────────────────────
   INTERCAMBIO · las pantallas  ·  #81, #82, #89

   Dos pantallas y una promesa.

   LA PROMESA VA ESCRITA, no implícita: «nunca se guarda tu dirección».
   En una función donde la gente acaba quedando en persona, decir qué
   NO se guarda vale más que cualquier explicación de qué se hace con
   lo que sí. Y está donde se decide, no en un aviso legal que nadie
   abre.

   Y CUANDO NO SE PUEDE PUBLICAR, SE DICE QUÉ FALTA. La historia #89 lo
   pide con estas palabras: «no un no puedes seco». Una lista con lo
   que ya cumples marcado, porque ver que llevas tres de cuatro anima a
   hacer la cuarta; un «no puedes» solo hace cerrar la app.
   ───────────────────────────────────────────────────────────── */

import {
  misPublicaciones, activasDe, estadoParaPublicar, publicar, retirar,
  volverAPublicar, borrarPublicacion, yaPublicado, MAX_ACTIVAS,
} from './swap.js';
import { myPlace, setPlace, clearPlace, findBook, statusOf } from './store.js';
import { currentUser } from './auth.js';
import {
  ESTADOS, resumenPublicacion, puedePublicarseEste, MOTIVO_NO_LEIDO,
  fotoCabe, MAX_FOTO_BYTES,
} from './swap-core.js';
import { placeTexto, tieneCiudad, SIN_CIUDAD, PROMESA } from './place-core.js';
import { $, esc, toast, closeSheet } from './ui.js';

let mias = [];
let libroActual = null;
let fotoActual = null;

/* ── DÓNDE ESTOY  ·  #81 ─────────────────────────────────────── */

export function openPlace() {
  $('place-overlay').classList.add('open');
  pintarPlace();
}

export const closePlace = (e) => {
  if (e && e.target !== $('place-overlay')) return;
  closeSheet('place-overlay');
};

function pintarPlace() {
  const p = myPlace() || {};
  $('place-body').innerHTML = `
    <p class="planner-hint">${esc(PROMESA)}</p>

    <div class="fg">
      <label class="flabel" for="pl-country">País</label>
      <input class="finput" id="pl-country" maxlength="60" placeholder="Colombia"
             value="${esc(p.country || '')}">
    </div>
    <div class="fg">
      <label class="flabel" for="pl-city">Ciudad</label>
      <input class="finput" id="pl-city" maxlength="60" placeholder="Bogotá"
             value="${esc(p.city || '')}">
    </div>
    <div class="fg">
      <label class="flabel" for="pl-area">Zona o barrio <span class="opt">(opcional)</span></label>
      <input class="finput" id="pl-area" maxlength="60" placeholder="Chapinero"
             value="${esc(p.area || '')}">
    </div>

    <button class="btn-magic full" onclick="savePlace()">Guardar</button>

    ${navigator.geolocation ? `
      <button class="btn-ghost full" style="margin-top:8px" onclick="proposePlace()">
        📍 Proponer mi ciudad con la ubicación
      </button>
      <p class="set-fineprint">
        Se usa una vez para rellenar la ciudad y no se guardan las coordenadas:
        solo queda una referencia de algo más de un kilómetro, que sirve para
        ordenar por cercanía y no para dar contigo.
      </p>` : ''}

    ${tieneCiudad(p) ? `
      <button class="btn-ghost full" style="margin-top:14px" onclick="dropPlace()">
        Quitar mi ciudad
      </button>
      <p class="set-fineprint">Sin ciudad, simplemente no apareces en intercambios.</p>` : ''}`;
}

export function savePlace() {
  const city = $('pl-city')?.value || '';
  if (!city.trim()) { toast('Escribe al menos la ciudad', 'error'); return; }
  const anterior = myPlace();
  setPlace({
    country: $('pl-country')?.value || '',
    city,
    area: $('pl-area')?.value || '',
    /* El geohash de antes se conserva solo si la ciudad no cambió: si
       cambió, el de la ciudad vieja ya no dice nada cierto. */
    lat: null, lon: null,
  });
  if (anterior?.geohash && anterior.city === city.trim()) {
    setPlace({ ...myPlace(), lat: null, lon: null });
  }
  toast('Guardado');
  closeSheet('place-overlay');
}

/**
 * Proponer la ciudad con la ubicación del móvil.
 *
 * Las coordenadas NO se guardan: se usan para pedir el nombre de la
 * ciudad y para calcular el geohash recortado, y se tiran. Lo que
 * queda en la base no permite volver a ellas.
 */
export async function proposePlace() {
  if (!navigator.geolocation) return;
  toast('Buscando tu ciudad…');
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude: lat, longitude: lon } = pos.coords;
    let ciudad = '';
    let pais = '';
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lon}`,
        { headers: { 'Accept-Language': 'es' } },
      );
      const j = await r.json();
      ciudad = j.address?.city || j.address?.town || j.address?.village || j.address?.state || '';
      pais = j.address?.country || '';
    } catch {
      /* Sin nombre de ciudad no pasa nada: se rellena el geohash y se
         le pide que escriba la ciudad a mano. */
    }
    if (ciudad && $('pl-city')) $('pl-city').value = ciudad;
    if (pais && $('pl-country')) $('pl-country').value = pais;
    setPlace({
      country: pais || $('pl-country')?.value || '',
      city: ciudad || $('pl-city')?.value || '',
      area: $('pl-area')?.value || '',
      lat,
      lon,
    });
    toast(ciudad ? `Parece que estás en ${ciudad}` : 'Escribe tu ciudad y guarda');
    pintarPlace();
  }, () => {
    toast('No se pudo leer la ubicación. Escríbela a mano.', 'error');
  }, { enableHighAccuracy: false, timeout: 8000 });
}

export function dropPlace() {
  clearPlace();
  pintarPlace();
  toast('Ya no apareces en intercambios');
}

/* ── OFRECER UN LIBRO  ·  #82 y #89 ──────────────────────────── */

export async function openSwap(bookId) {
  libroActual = findBook(bookId);
  fotoActual = null;
  if (!libroActual) return;

  $('swap-overlay').classList.add('open');
  $('swap-body').innerHTML = '<p class="planner-hint">Un momento…</p>';

  if (!puedePublicarseEste(statusOf(bookId))) {
    $('swap-body').innerHTML = `<p class="planner-hint warn">${esc(MOTIVO_NO_LEIDO)}</p>`;
    return;
  }

  mias = await misPublicaciones();
  const ya = yaPublicado(mias, bookId);
  if (ya) { pintarYaPublicado(ya); return; }

  const estado = await estadoParaPublicar(currentUser());
  if (!estado.puede) { pintarQueFalta(estado); return; }
  pintarFormulario();
}

export const closeSwap = (e) => {
  if (e && e.target !== $('swap-overlay')) return;
  closeSheet('swap-overlay');
};

/** Lo que falta para poder publicar, con lo que ya cumple marcado. */
function pintarQueFalta(estado) {
  $('swap-body').innerHTML = `
    ${estado.tope ? `<p class="planner-hint warn">${esc(estado.mensajeTope)}</p>` : `
      <p class="planner-hint">
        Para ofrecer libros hace falta esto. Es poco a propósito: solo sirve
        para que no publiquen cuentas recién hechas y desechables.
      </p>`}

    ${estado.tope ? '' : estado.requisitos.map((r) => `
      <div class="req ${r.ok ? 'ok' : ''}">
        <span class="req-marca">${r.ok ? '✓' : '○'}</span>
        <div>
          <div class="req-texto">${esc(r.texto)}</div>
          ${r.ok ? '' : `<div class="req-como">${esc(r.comoSeArregla)}</div>`}
        </div>
      </div>`).join('')}

    ${estado.faltan.some((f) => f.id === 'ciudad') ? `
      <button class="btn-magic full" style="margin-top:14px"
              onclick="closeSheet('swap-overlay');openPlace()">Decir mi ciudad</button>` : ''}
    ${estado.tope ? `
      <button class="btn-ghost full" style="margin-top:12px"
              onclick="closeSheet('swap-overlay');openMySwaps()">Ver mis publicaciones</button>` : ''}`;
}

function pintarYaPublicado(p) {
  $('swap-body').innerHTML = `
    <p class="planner-hint">Este libro ya está ofrecido.</p>
    <div class="swap-card">
      <div class="swap-title">${esc(p.title)}</div>
      <div class="swap-sub">${esc(resumenPublicacion(p))}</div>
      ${p.nota ? `<p class="swap-nota">${esc(p.nota)}</p>` : ''}
      <div class="swap-lugar">📍 ${esc(placeTexto(p))}</div>
    </div>
    <button class="btn-ghost full" onclick="withdrawSwap('${esc(p.id)}')">Retirarlo</button>`;
}

function pintarFormulario() {
  const p = myPlace();
  $('swap-body').innerHTML = `
    <p class="planner-hint">
      <strong>${esc(libroActual.title)}</strong> · ${esc(libroActual.author)}
    </p>

    <label class="flabel">¿Cómo está?</label>
    <div class="estados">
      ${ESTADOS.map((e, i) => `
        <label class="estado">
          <input type="radio" name="sw-estado" value="${e.id}" ${i === 1 ? 'checked' : ''}>
          <span><b>${esc(e.label)}</b><small>${esc(e.hint)}</small></span>
        </label>`).join('')}
    </div>

    <label class="flabel" style="margin-top:12px">Una nota <span class="opt">(opcional)</span></label>
    <input class="finput" id="sw-nota" maxlength="200"
           placeholder="Subrayado a lápiz · tapa dura · le falta la sobrecubierta">

    <label class="flabel" style="margin-top:12px">Una foto del ejemplar <span class="opt">(opcional)</span></label>
    <input type="file" accept="image/*" id="sw-foto" class="finput" onchange="pickSwapPhoto(event)">
    <div id="sw-foto-prev"></div>

    <div class="set-row" onclick="toggleSuelto()" style="margin-top:8px">
      <div>
        <div class="set-row-title" id="sw-modo">Busco algo a cambio</div>
        <div class="set-row-sub">Toca para cambiar. Nunca se paga con dinero: esto es trueque.</div>
      </div>
      <span class="set-chev">⇄</span>
    </div>
    <input class="finput" id="sw-cambio" maxlength="200" placeholder="Novela negra, o algo de Vargas Llosa">

    <div class="swap-lugar" style="margin:14px 0">📍 ${esc(placeTexto(p))}</div>
    <p class="set-fineprint" style="margin-top:0">${esc(PROMESA)}</p>

    <button class="btn-magic full" style="margin-top:12px" onclick="doPublish()">
      Ofrecerlo
    </button>`;
}

let suelto = false;
export function toggleSuelto() {
  suelto = !suelto;
  const t = $('sw-modo');
  const c = $('sw-cambio');
  if (t) t.textContent = suelto ? 'Lo doy suelto' : 'Busco algo a cambio';
  if (c) c.style.display = suelto ? 'none' : '';
}

/**
 * La foto, encogida antes de guardarla.
 *
 * Una foto de móvil son cuatro megas y un documento de Firestore
 * aguanta uno. Se reduce a 900 px de ancho y se recomprime hasta que
 * cabe; si aun así no cabe, se dice — mejor eso que una publicación
 * que no se puede guardar y no explica por qué.
 */
export async function pickSwapPhoto(ev) {
  const file = ev?.target?.files?.[0];
  if (!file) return;
  try {
    fotoActual = await encoger(file);
    if (!fotoCabe(fotoActual)) {
      fotoActual = null;
      toast('Esa foto pesa demasiado incluso reducida. Prueba con otra.', 'error');
      return;
    }
    $('sw-foto-prev').innerHTML = `<img class="swap-foto" src="${fotoActual}" alt="">`;
  } catch {
    fotoActual = null;
    toast('No se pudo leer la foto', 'error');
  }
}

function encoger(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, 900 / (img.width || 900));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * escala);
      cv.height = Math.round(img.height * escala);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      /* Se baja la calidad hasta que entra, en vez de rechazar de
         primeras: casi siempre entra a la segunda o la tercera. */
      let q = 0.72;
      let out = cv.toDataURL('image/jpeg', q);
      while (!fotoCabe(out) && q > 0.3) { q -= 0.12; out = cv.toDataURL('image/jpeg', q); }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen')); };
    img.src = url;
  });
}

export async function doPublish() {
  const estado = document.querySelector('input[name="sw-estado"]:checked')?.value || 'bueno';
  const r = await publicar(libroActual, {
    estado,
    nota: $('sw-nota')?.value || '',
    foto: fotoActual,
    suelto,
    aCambioDe: $('sw-cambio')?.value || '',
  });
  if (!r.ok) { toast(r.error, 'error'); return; }
  closeSheet('swap-overlay');
  toast(`«${libroActual.title}» ya está disponible`);
}

export async function withdrawSwap(id) {
  const r = await retirar(id);
  if (!r.ok) { toast(r.error || 'No se pudo', 'error'); return; }
  closeSheet('swap-overlay');
  toast('Retirado');
}

/* ── MIS PUBLICACIONES  ·  #82 ───────────────────────────────── */

export async function openMySwaps() {
  $('myswaps-overlay').classList.add('open');
  $('myswaps-body').innerHTML = '<p class="planner-hint">Cargando…</p>';
  mias = await misPublicaciones();
  pintarMias();
}

export const closeMySwaps = (e) => {
  if (e && e.target !== $('myswaps-overlay')) return;
  closeSheet('myswaps-overlay');
};

function pintarMias() {
  const activas = activasDe(mias);
  const retiradas = mias.filter((p) => !p.activa);
  const cuerpo = $('myswaps-body');
  if (!cuerpo) return;

  if (!mias.length) {
    cuerpo.innerHTML = `
      <div class="empty">
        <div class="empty-rune">📚</div>
        <div class="empty-text">Todavía no ofreces ningún libro</div>
      </div>
      <p class="set-fineprint" style="text-align:center">
        Desde la ficha de cualquier libro que hayas leído.
      </p>`;
    return;
  }

  const ficha = (p) => `
    <div class="swap-card">
      <div class="swap-title">${esc(p.title)}</div>
      <div class="swap-sub">${esc(resumenPublicacion(p))}</div>
      ${p.nota ? `<p class="swap-nota">${esc(p.nota)}</p>` : ''}
      ${p.foto ? `<img class="swap-foto" src="${esc(p.foto)}" alt="">` : ''}
      <div class="swap-lugar">📍 ${esc(placeTexto(p))}</div>
      <div class="swap-acciones">
        ${p.activa
          ? `<button class="btn-mini" onclick="withdrawMine('${esc(p.id)}')">Retirar</button>`
          : `<button class="btn-mini" onclick="republishMine('${esc(p.id)}')">Volver a ofrecer</button>
             <button class="btn-mini" onclick="deleteMine('${esc(p.id)}')">Borrar</button>`}
      </div>
    </div>`;

  cuerpo.innerHTML = `
    <p class="planner-hint">${activas.length} de ${MAX_ACTIVAS} publicaciones activas.</p>
    ${activas.map(ficha).join('')}
    ${retiradas.length ? `
      <h4 class="prof-sec-title" style="margin-top:18px">Retirados</h4>
      ${retiradas.map(ficha).join('')}` : ''}`;
}

export async function withdrawMine(id) {
  await retirar(id);
  mias = mias.map((p) => (p.id === id ? { ...p, activa: false } : p));
  pintarMias();
  toast('Retirado');
}

export async function republishMine(id) {
  await volverAPublicar(id);
  mias = mias.map((p) => (p.id === id ? { ...p, activa: true } : p));
  pintarMias();
  toast('Otra vez disponible');
}

export async function deleteMine(id) {
  await borrarPublicacion(id);
  mias = mias.filter((p) => p.id !== id);
  pintarMias();
}

export { SIN_CIUDAD };
