/* ─────────────────────────────────────────────────────────────
   HABLAR CON LA MASCOTA  ·  historia #44

   Tocarla abre una conversación. Hasta ahora tocarla solo la hacía
   repetir una frase, y eso ya no era ni una cosa ni la otra.

   TRES DECISIONES QUE NO SON OBVIAS:

   1. EL HILO VIVE EN MEMORIA Y SE VA AL CERRAR. No se guarda en
      Firestore ni en el móvil. Quien escribe aquí puede ser una niña,
      y un registro de sus conversaciones es exactamente la clase de
      cosa que es mejor no tener: lo que no se guarda no se filtra, no
      hay que borrarlo cuando borra su cuenta y no aparece en un
      volcado de datos.

   2. SE ENTRA CON PREGUNTAS HECHAS. Un cuadro de texto vacío delante
      de una niña es dos cosas malas a la vez: intimida —no sabe qué
      se puede preguntar— e invita a probar cualquier cosa. Tres
      sugerencias sobre lo que está leyendo enseñan de qué va esto en
      un vistazo, y son el mejor freno temático que hay: uno que no se
      nota porque no prohíbe, propone.

   3. EL ERROR SE DICE DENTRO DE LA CONVERSACIÓN. Un `toast` que
      aparece y se va no sirve cuando acabas de escribir algo y estás
      esperando: la respuesta a «no pude» va donde iba a ir la
      respuesta buena.
   ───────────────────────────────────────────────────────────── */

import { $, esc, toast, openSheet, closeSheet } from './ui.js';
import { petConfig, petState, petVista, petNombre } from './pet.js';
import { petChat, isDenied } from './agent.js';

/** El hilo de esta sesión. Se vacía al cerrar. */
let hilo = [];
let esperando = false;

/* Las sugerencias salen de lo que está leyendo AHORA. Una sugerencia
   genérica se ignora; una que nombra tu libro se toca. */
function sugerencias(libro) {
  if (libro) {
    return [
      '¿De qué trata sin destriparme nada?',
      'No me está enganchando, ¿lo dejo?',
      '¿Qué leo cuando lo termine?',
    ];
  }
  return [
    '¿Qué me recomiendas leer?',
    '¿Cómo elijo un libro que me guste?',
    '¿Por qué me cuesta terminar los libros?',
  ];
}

function pintar() {
  const cfg = petConfig();
  const estado = petState();
  const libro = estado.libro || estado.current;

  /* CADA RESPUESTA SUYA LLEVA SU NOMBRE DELANTE. La cabecera ya dice
     con quién hablas, pero se lee una vez y se olvida; el nombre sobre
     cada burbuja es lo que hace que no parezca una caja de respuestas
     sino alguien contestando. Las tuyas no lo llevan: ya sabes quién
     eres. */
  const nombre = petNombre(cfg);
  const burbujas = hilo.map((m) => (m.mia
    ? `<div class="burbuja mia">${esc(m.texto)}</div>`
    : `<div class="burbuja-dice">
         <span class="burbuja-quien">${esc(nombre)}</span>
         <div class="burbuja suya${m.fallo ? ' burbuja-fallo' : ''}">${esc(m.texto)}</div>
       </div>`)).join('');

  $('petchat-body').innerHTML = `
    <div class="petchat-cabeza">
      <div class="petchat-retrato" data-mood="${estado.mood}">${petVista(estado.mood, cfg)}</div>
      <div>
        <div class="petchat-nombre">${esc(nombre)}</div>
        <div class="petchat-sub">${libro
          ? `Está leyendo <strong>${esc(libro.title)}</strong> contigo`
          : 'Solo habla de libros y de leer'}</div>
      </div>
    </div>

    ${hilo.length || esperando ? `
      <div class="chat-mensajes" id="petchat-hilo">
        ${burbujas}
        ${esperando ? `<div class="burbuja-dice">
             <span class="burbuja-quien">${esc(nombre)}</span>
             <div class="burbuja suya petchat-pensando"><span></span><span></span><span></span></div>
           </div>` : ''}
      </div>` : ''}

    ${hilo.length ? '' : `
      <div class="petchat-sugerencias">
        ${sugerencias(libro).map((s) => `
          <button class="chip petchat-sug" onclick="preguntarMascota(${JSON.stringify(s).replace(/"/g, '&quot;')})">
            ${esc(s)}
          </button>`).join('')}
      </div>`}

    <div class="chat-escribir">
      <input class="finput" id="petchat-input" maxlength="200"
             placeholder="Pregúntale algo de tu libro..."
             ${esperando ? 'disabled' : ''}
             onkeydown="if(event.key==='Enter'){event.preventDefault();enviarMascota()}">
      <button class="btn-magic" onclick="enviarMascota()" ${esperando ? 'disabled' : ''}>Enviar</button>
    </div>

    <p class="set-fineprint">
      Lo que le escribes y el título de tu libro se consultan con el asistente.
      No se manda tu nombre ni tus notas, y esta conversación no se guarda:
      al cerrar, se va.
    </p>`;

  const h = $('petchat-hilo');
  if (h) h.scrollTop = h.scrollHeight;
}

export function openPetChat() {
  openSheet('petchat-overlay');
  pintar();
}

export function closePetChat(e) {
  if (e && e.target !== e.currentTarget) return;
  closeSheet('petchat-overlay');
  /* Se vacía al cerrar, no al abrir: si se vaciara al abrir, un cierre
     accidental dejaría el hilo vivo esperando a que alguien lo lea. */
  hilo = [];
  esperando = false;
}

/** Una sugerencia es una pregunta ya escrita: se manda tal cual. */
export function preguntarMascota(texto) {
  enviarMascota(texto);
}

export async function enviarMascota(textoDado) {
  if (esperando) return;
  const input = $('petchat-input');
  const texto = String(textoDado ?? input?.value ?? '').trim();
  if (!texto) return;

  hilo.push({ mia: true, texto });
  esperando = true;
  pintar();

  const estado = petState();
  try {
    const dice = await petChat(texto, { libro: estado.libro || estado.current });
    esperando = false;
    hilo.push({ mia: false, texto: dice || 'De eso no sé nada, pero de libros te cuento lo que quieras.' });
  } catch (err) {
    esperando = false;
    if (isDenied(err)) {
      /* Dijo que no al asistente. No es un fallo y no se pinta como
         tal: se cierra y se le dice dónde puede cambiar de idea. */
      closePetChat();
      toast('Sin el asistente no puede conversar. Puedes encenderlo en Ajustes.');
      return;
    }
    hilo.push({ mia: false, fallo: true, texto: err?.message || 'Ahora mismo no puedo contestarte.' });
  }
  pintar();
}
