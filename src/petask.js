/* ─────────────────────────────────────────────────────────────
   LAS DOS PREGUNTAS DE LA MASCOTA  ·  historia #45

   «La app va a ayudar a la gente a que cumpla el plan: si pasó el mes
    y no leyó el libro, ver si lo quiere sacar; o en el transcurso del
    mes, pedirle update de la lectura. La mascota debería hablar con
    la persona.»

   EL AGUJERO QUE TAPA. `stalledBooks()` existe desde la historia #36 y
   siempre supo quién se quedó atrás — pero solo se consultaba dentro
   del asistente de «Armar mi plan». O sea que la app sabía que ibas
   atrasada y no decía nada salvo que fueras tú a buscarlo. Y la página
   y la última lectura se quedaban a cero porque NADIE LAS PEDÍA NUNCA,
   que es lo que tenía a la mascota hablando de libros sin abrir.

   TRES DECISIONES QUE NO SON OBVIAS:

   1. SE RESPONDE DE UN GESTO, NO CON UN FORMULARIO. Si actualizar la
      lectura cuesta abrir el libro, buscarlo, entrar en su ficha y
      escribir, nadie lo hace, y entonces la pregunta era retórica. Las
      respuestas son botones; solo la página pide teclear, y viene con
      la que ya tenía puesta.

   2. DEJARLO IR ES UNA RESPUESTA DE PRIMERA CLASE. No está escondida
      detrás de «más opciones» ni pintada en rojo de peligro: soltar un
      libro que no te está dando nada es una decisión de lectora, y una
      app que solo acepta «sigo» convierte el plan en una deuda.

   3. NO SE PREGUNTA DOS VECES EL MISMO DÍA. Contestar «sigo igual»
      tiene que servir para algo o es un botón de cerrar con otro
      nombre: se apunta el día y ella no vuelve a sacar ese libro hasta
      mañana.
   ───────────────────────────────────────────────────────────── */

import { $, esc, toast, openSheet, closeSheet } from './ui.js';
import { petConfig, petState, petVista, petNombre, petPhrase } from './pet.js';
import { updateEntry, entry, settings, updateSettings, recordReadingDay } from './store.js';
import { refreshAll } from './views.js';

/** El libro por el que pregunta ahora mismo. */
let enCuestion = null;

/* ── EL SILENCIO DE UN DÍA ───────────────────────────────────
   Se guarda «libro + día», no una marca de tiempo: lo que se promete
   es «hoy no te lo vuelvo a sacar», y eso es un día del calendario de
   quien lee, no veinticuatro horas desde que tocó el botón.

   Quién está aplazado lo LEE `pet.js` (ver `librosParaLaMascota`) y no
   este módulo: aquí solo se escribe. Si la lectura viviera aquí, pet.js
   tendría que importar esta hoja para saber qué decir, y este módulo ya
   importa pet.js — una vuelta cerrada por un dato de dos campos. */

function aplazar(id) {
  /* Solo el de hoy: guardar el histórico entero haría crecer los
     ajustes sin que nadie los lea nunca. */
  updateSettings({ petSnoozed: { [id]: new Date().toLocaleDateString('sv') } });
}

/* ── LA HOJA ─────────────────────────────────────────────────── */

export function openPetAsk(libro) {
  enCuestion = libro || petState().libro;
  if (!enCuestion) return;
  openSheet('petask-overlay');
  pintar();
}

export function closePetAsk(e) {
  if (e && e.target !== e.currentTarget) return;
  closeSheet('petask-overlay');
  enCuestion = null;
}

function pintar() {
  const cfg = petConfig();
  const estado = petState();
  const b = enCuestion;
  /* Acotada al total, no cruda. Una página guardada mayor que el total
     —el libro cambió de edición, o se tecleó de más— se pintaba tal
     cual («128 de 70») y al tocar «Apuntar» el guardado la recortaba
     hasta el total, que es justo el número que da el libro por
     terminado: lo habría cerrado sin que nadie lo pidiera. Enseñando
     ya el número acotado, lo que va a pasar se ve antes de tocar. */
  const guardada = entry(b.id).page || 0;
  const leidas = b.total ? Math.min(guardada, b.total) : guardada;

  /* La pregunta que se pinta arriba es LA MISMA que dice en el inicio,
     no una versión formal de ella. Si al tocarla cambiara de tono, se
     leería como que hay dos personajes: la mascota y el formulario. */
  const rescate = estado.mood === 'rescatando';

  $('petask-body').innerHTML = `
    <div class="petask-cabeza">
      <div class="petask-retrato" data-mood="${estado.mood}">${petVista(estado.mood, cfg)}</div>
      <div>
        <div class="petask-quien">${esc(petNombre(cfg))}</div>
        <p class="petask-dice">${esc(petPhrase(estado))}</p>
      </div>
    </div>

    ${rescate ? '' : `
      <div class="petask-grupo">
        <label class="flabel" for="petask-pagina">Voy por la página</label>
        <div class="petask-pagina-fila">
          <input class="finput" id="petask-pagina" type="number" inputmode="numeric"
                 min="0" ${b.total ? `max="${b.total}"` : ''} value="${leidas}"
                 onkeydown="if(event.key==='Enter'){event.preventDefault();guardarPagina()}">
          ${b.total ? `<span class="petask-de">de ${b.total}</span>` : ''}
          <button class="btn-magic" onclick="guardarPagina()">Apuntar</button>
        </div>
      </div>`}

    <div class="petask-opciones">
      ${rescate ? `
        <button class="petask-opt" onclick="traerAlMes()">
          <span class="petask-opt-que">Lo traigo a este mes</span>
          <span class="petask-opt-por">Se queda en el plan, con fecha nueva</span>
        </button>
        <button class="petask-opt" onclick="masAdelante()">
          <span class="petask-opt-que">Más adelante</span>
          <span class="petask-opt-por">Sale del mes, se queda en la biblioteca</span>
        </button>` : `
        <button class="petask-opt" onclick="yaLoTermine()">
          <span class="petask-opt-que">Ya lo terminé</span>
          <span class="petask-opt-por">Cuenta para tu meta y tus logros</span>
        </button>`}

      <!-- SOLTARLO, A LA MISMA ALTURA QUE LO DEMÁS. Ni escondido ni en
           rojo: dejar un libro que no te está dando nada es una
           decisión de lectora, no una avería. -->
      <button class="petask-opt" onclick="loDejo()">
        <span class="petask-opt-que">Lo dejo</span>
        <span class="petask-opt-por">Sin drama — no cuenta como fallo en ninguna parte</span>
      </button>

      <button class="petask-opt petask-opt-suave" onclick="ahoraNo()">
        <span class="petask-opt-que">Ahora no</span>
        <span class="petask-opt-por">No te lo vuelvo a sacar hoy</span>
      </button>
    </div>`;
}

/* ── LAS RESPUESTAS ──────────────────────────────────────────── */

/** Apuntar por dónde vas. Es la que alimenta todo lo demás. */
export function guardarPagina() {
  const b = enCuestion;
  if (!b) return;
  const n = Math.max(0, Math.min(Number($('petask-pagina')?.value) || 0, b.total || 99999));

  /* `lastReadAt` es lo que hacía falta desde el principio: sin él la
     mascota no sabe si lees o solo marcaste el libro. */
  updateEntry(b.id, { page: n, lastReadAt: Date.now() });
  recordReadingDay();

  /* Llegar al final es terminarlo. Preguntar «¿y lo terminaste?»
     después de que acabe de decir que va por la última página sería no
     haber escuchado la respuesta. */
  if (b.total && n >= b.total) return yaLoTermine();

  cerrarCon(`Apuntado: página ${n}.`);
}

export function yaLoTermine() {
  const b = enCuestion;
  if (!b) return;
  updateEntry(b.id, {
    status: 'read',
    page: b.total || entry(b.id).page || 0,
    finishedAt: Date.now(),
    lastReadAt: Date.now(),
  });
  recordReadingDay();
  cerrarCon('¡Uno menos en la pila!');
}

export function loDejo() {
  const b = enCuestion;
  if (!b) return;
  /* `abandoned` ya lo entiende el plan: `stalledBooks` lo descarta y
     `generatePlan` no lo vuelve a repartir. No hay que inventar nada. */
  updateEntry(b.id, { status: 'abandoned', pinnedMonth: null });
  cerrarCon('Fuera. Sigue en tu biblioteca por si vuelves.');
}

/** Rescatar: se lo trae al mes en curso y se queda clavado ahí. */
export function traerAlMes() {
  const b = enCuestion;
  if (!b) return;
  const mes = new Date().toLocaleDateString('es', { month: 'long' });
  const nombre = mes.charAt(0).toUpperCase() + mes.slice(1);
  updateEntry(b.id, { status: 'reading', pinnedMonth: nombre, startedAt: Date.now() });
  cerrarCon(`${b.title} pasa a ${nombre.toLowerCase()}.`);
}

/** Ni ahora ni fuera: sale del mes pero se queda en la biblioteca. */
export function masAdelante() {
  const b = enCuestion;
  if (!b) return;
  updateEntry(b.id, { status: 'pending', pinnedMonth: null });
  cerrarCon('Lo dejo esperando, sin fecha.');
}

export function ahoraNo() {
  if (enCuestion) aplazar(enCuestion.id);
  cerrarCon('');
}

function cerrarCon(mensaje) {
  closePetAsk();
  if (mensaje) toast(mensaje);
  refreshAll();
}
