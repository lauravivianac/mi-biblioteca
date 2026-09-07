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
import { petConfig, petState, petVista, petNombre, petLibrosEnCurso } from './pet.js';
import { petChat, isDenied } from './agent.js';
import { fraseDeFallo } from './pet-core.js';

/** El hilo de esta sesión. Se vacía al cerrar. */
let hilo = [];
let esperando = false;

/* ── DE QUÉ LIBRO SE HABLA  ·  la suposición, a la vista ─────
   «Estoy leyendo más de dos libros, ¿entonces cómo sabe cuál poner?
    No me pregunta. Creo que es equivocado e impreciso.»

   La app elegía el que tocaste más recientemente —regla defendible— y
   luego lo AFIRMABA: «está leyendo Canción de Navidad contigo», en
   singular y sin margen. Con tres libros abiertos eso no es un dato,
   es una suposición disfrazada de hecho. Y encima es el libro que
   viaja al asistente como contexto: si falla, las tres sugerencias
   hablan de un libro que no tienes en la cabeza.

   Preguntar cada vez, que es lo primero que se ocurre, sería peor:
   convierte en un formulario lo que tiene que ser abrir y escribir.
   Así que se enseña la suposición y se deja corregirla de un toque —
   que es lo que hace una persona cuando no está segura de a qué te
   refieres: propone y espera a que la pares.

   `null` = usa el más reciente. Solo se fija cuando ella elige. */
let libroElegido = null;

const librosDisponibles = () => petLibrosEnCurso();

function libroDeLaCharla() {
  const abiertos = librosDisponibles();
  if (!abiertos.length) return null;
  if (libroElegido) {
    const suyo = abiertos.find((b) => b.id === libroElegido);
    if (suyo) return suyo;
  }
  /* POR DEFECTO, EL LIBRO DEL QUE ELLA YA ESTÁ HABLANDO. No siempre es
     el más reciente: con tres abiertos y uno callado nueve días, la
     mascota pregunta por ESE. Si el inicio dice «¿por dónde vas con El
     tercero?» y al tocarla el chat se abre por otro, la app se
     contradice en dos líneas seguidas.

     Y si su ánimo no habla de ninguno de los abiertos —celebrando algo
     que terminaste, por ejemplo— vale el más reciente, que es la
     suposición de siempre. */
  const suyo = petState().libro;
  return abiertos.find((b) => b.id === suyo?.id) || abiertos[0];
}

/** Cambiar de libro reinicia la conversación: era sobre otro. */
export function hablarDeLibro(id) {
  libroElegido = id;
  hilo = [];
  pintar();
}

/* Las sugerencias salen de lo que está leyendo AHORA. Una sugerencia
   genérica se ignora; una que nombra tu libro se toca. */
function sugerencias(libro) {
  if (libro) {
    return [
      '¿De qué trata sin destriparme nada?',
      'No me está enganchando, ¿lo dejo?',
      '¿Qué leo cuando lo termine?',
      /* LA PUERTA DE SALIDA. Las tres de arriba hablan del libro en
         curso, y tres sugerencias sobre lo mismo se leen como el menú
         entero: parece que aquí solo se puede hablar de ESE libro. La
         cuarta dice que no, y es la que hacía falta. */
      'Quiero hablarte de otro libro',
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
  const abiertos = librosDisponibles();
  const libro = libroDeLaCharla();

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
        <!-- CON VARIOS LIBROS ABIERTOS NO SE AFIRMA NADA. Con uno,
             «está leyendo X contigo» es un dato. Con tres es una
             suposición, y decirla en singular la disfraza de hecho:
             debajo va el selector para corregirla de un toque. -->
        <div class="petchat-sub">${(() => {
    if (!libro) return 'Pregúntale de cualquier libro, lo estés leyendo o no';
    if (abiertos.length > 1) return `Hablando de <strong>${esc(libro.title)}</strong> · o de cualquier otro libro`;
    return `Está leyendo <strong>${esc(libro.title)}</strong> contigo · pregúntale de cualquier libro`;
  })()}</div>
      </div>
    </div>

    ${abiertos.length > 1 ? `
      <div class="petchat-cuales">
        <span class="petchat-cuales-que">Llevas ${abiertos.length} a la vez:</span>
        ${abiertos.map((b) => `
          <button class="petchat-cual${b.id === libro.id ? ' on' : ''}"
                  onclick="hablarDeLibro(${JSON.stringify(b.id).replace(/"/g, '&quot;')})">
            ${esc(b.title)}
          </button>`).join('')}
      </div>` : ''}

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
  libroElegido = null;
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

  try {
    /* El libro que se manda es EL QUE ELLA VE en la cabecera, no el
       que la app supuso al abrir: si lo cambió, el contexto cambia con
       ella o la pantalla estaría diciendo una cosa y mandando otra. */
    const dice = await petChat(texto, { libro: libroDeLaCharla() });
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
    /* EL MOTIVO DE VERDAD VA A LA CONSOLA, donde mira quien puede
       arreglarlo; en la burbuja va lo que diría ella. Pintar aquí
       `err.message` era lo que ponía «Esa consulta no está permitida»
       en boca de la gata, delante de una niña y por una pregunta que
       le había propuesto la propia app. */
    console.warn('La mascota no pudo contestar:', err?.codigo, err?.message);
    hilo.push({ mia: false, fallo: true, texto: fraseDeFallo(err?.codigo) });
  }
  pintar();
}
