/* ─────────────────────────────────────────────────────────────
   LA MASCOTA LECTORA  ·  historias #38 a #43

   Adaptada de Catzy, con dos cambios deliberados:

   1. NO hay que cuidarla. Alimentarla sería un segundo hábito
      compitiendo con leer, y si no la alimentas, sufre — que es
      justo la mecánica de culpa por la que la gente desinstala
      estas apps. Aquí LEER es cuidarla.

   2. Lo que sí se conserva de Catzy es explorar mundos, pero
      atado al plan: su rincón cambia según lo que estés leyendo.

   El límite que no se cruza: la mascota NUNCA castiga. Dormida
   significa «aquí sigo cuando quieras», no «me abandonaste».
   ───────────────────────────────────────────────────────────── */

import { allBooks, statusOf, entry, settings, progressPct } from './store.js';
import { pageCount } from './seed.js';
import { esc } from './ui.js';

/* ── PERSONALIZACIÓN ─────────────────────────────────────────
   Todo se desbloquea leyendo. Un accesorio que costó terminar un
   libro de 900 páginas significa algo; uno que costó dos dólares, no. */

export const FURS = [
  { id: 'atigrado', name: 'Atigrada', color: '#C89A5E', belly: '#E8D4B4', unlock: null },
  { id: 'nocturna', name: 'Nocturna', color: '#3E3A52', belly: '#6E6884', unlock: null },
  { id: 'nieve',    name: 'Nieve',    color: '#E4E0D8', belly: '#FFFFFF', unlock: null },
  { id: 'canela',   name: 'Canela',   color: '#B4633A', belly: '#E0A87E', unlock: 'primer-libro' },
  { id: 'ceniza',   name: 'Ceniza',   color: '#8A8E96', belly: '#C4C8D0', unlock: 'cinco-generos' },
  { id: 'tinta',    name: 'Tinta',    color: '#2A3550', belly: '#5A6B8C', unlock: 'tomo-500' },
  { id: 'trigo',    name: 'Trigo',    color: '#E0B65C', belly: '#F4E2AE', unlock: 'diez-libros' },
];

export const ACCESSORIES = [
  { id: 'ninguno', name: 'Nada',     unlock: null },
  { id: 'bufanda', name: 'Bufanda',  unlock: null },
  { id: 'gafas',   name: 'Gafas',    unlock: 'primera-resena' },
  { id: 'lazo',    name: 'Lazo',     unlock: 'primer-clasico' },
  { id: 'gorro',   name: 'Gorrito',  unlock: 'octubre-terror' },
  { id: 'flor',    name: 'Flor',     unlock: 'bloque-oriental' },
];

export const CORNERS = [
  { id: 'estante', name: 'Estantería', unlock: null },
  { id: 'planta',  name: 'Planta',     unlock: null },
  { id: 'lampara', name: 'Lámpara',    unlock: 'primer-libro' },
  { id: 'taza',    name: 'Taza',       unlock: 'veinticinco-libros' },
];

export const DEFAULT_PET = {
  name: '',
  fur: 'atigrado',
  accessory: 'bufanda',
  corner: 'estante',
  hidden: false,
};

export const petConfig = () => ({ ...DEFAULT_PET, ...(settings().pet || {}) });

const unlocked = (item) => {
  if (!item.unlock) return true;
  return (settings().achievements || []).includes(item.unlock);
};
export const availableFurs = () => FURS.map((f) => ({ ...f, locked: !unlocked(f) }));
export const availableAccessories = () => ACCESSORIES.map((a) => ({ ...a, locked: !unlocked(a) }));
export const availableCorners = () => CORNERS.map((c) => ({ ...c, locked: !unlocked(c) }));

/* ── ESTADO ──────────────────────────────────────────────────
   Se calcula solo, del progreso y de las fechas. La usuaria no
   tiene que hacer nada para mantenerla. */

const DAY = 86400000;

export function petState() {
  const books = allBooks();
  const reading = books.filter((b) => statusOf(b.id) === 'reading');
  const now = Date.now();

  const lastRead = Math.max(0, ...books.map((b) => entry(b.id).lastReadAt || 0));
  const daysQuiet = lastRead ? Math.floor((now - lastRead) / DAY) : null;

  const justFinished = books.some((b) => {
    const f = entry(b.id).finishedAt;
    return f && now - f < 2 * DAY;
  });

  const nearlyDone = reading.find((b) => progressPct(b.id) >= 85);
  const current = reading[0] || null;

  if (justFinished) return { mood: 'celebrando', current, daysQuiet };
  if (nearlyDone) return { mood: 'expectante', current: nearlyDone, daysQuiet };
  if (daysQuiet === null || daysQuiet >= 4) return { mood: 'dormida', current, daysQuiet };
  if (current) return { mood: 'leyendo', current, daysQuiet };
  return { mood: 'contenta', current, daysQuiet };
}

/* ── SU VOZ  ·  historia #42 ─────────────────────────────────
   Frases escritas a mano con huecos que se rellenan con tus datos.
   NO las genera el agente: cuestan cero, responden al instante y
   —lo que de verdad importa— una mascota con voz propia y constante
   se siente un personaje; una que improvisa se siente un chatbot
   con sombrero. */

const PHRASES = {
  contenta: [
    'Hoy hay tiempo para un capítulo.',
    'Tu biblioteca está tranquila.',
    '¿Empezamos algo nuevo?',
    'Me gusta este silencio de estantería.',
  ],
  leyendo: [
    'Vas por la mitad de {libro}.',
    'Te espero en la página {pagina} de {libro}.',
    '{libro} avanza bien.',
    'Quedan {faltan} páginas de {libro}.',
  ],
  estancada: [
    'Llevas {dias} días en el mismo capítulo, ¿está pesado?',
    '{libro} lleva un rato esperando.',
    'Nadie corre. Ahí sigue {libro}.',
  ],
  dormida: [
    'Aquí sigo cuando quieras.',
    'Me eché una siesta entre los libros.',
    'Los libros no se van a ninguna parte.',
    'Cuando vuelvas, seguimos.',
  ],
  celebrando: [
    '¡Terminaste {libro}! 🎉',
    'Un libro menos en la pila.',
    'Eso fue {paginas} páginas. Nada mal.',
  ],
  expectante: [
    'Ya casi terminas {libro}.',
    'Faltan {faltan} páginas. ¿Las hacemos hoy?',
    'Estoy en la última parte de {libro} contigo.',
  ],
};

let lastPhrase = '';

/** Nunca repite la misma frase dos veces seguidas. */
export function petPhrase(state = petState()) {
  const { mood, current, daysQuiet } = state;
  const cfg = petConfig();

  let pool = PHRASES[mood] || PHRASES.contenta;
  if (mood === 'leyendo' && daysQuiet >= 2) pool = PHRASES.estancada;

  const book = current;
  const total = book ? pageCount(book.pages) : null;
  const page = book ? (entry(book.id).page || 0) : 0;

  const slots = {
    '{libro}': book ? book.title : 'tu libro',
    '{pagina}': page || 1,
    '{paginas}': total || '—',
    '{faltan}': total ? Math.max(1, total - page) : 'algunas',
    '{dias}': daysQuiet ?? 0,
    '{nombre}': cfg.name || '',
  };

  const usable = pool.filter((p) => (book || !p.includes('{libro}')) && p !== lastPhrase);
  const pick = (usable.length ? usable : pool)[Math.floor(Math.random() * (usable.length || pool.length))];
  lastPhrase = pick;

  return pick.replace(/\{[a-z]+\}/g, (m) => slots[m] ?? '');
}

/* ── EL DIBUJO  ·  historia #38 ──────────────────────────────
   SVG y no imagen: pesa poco, escala a cualquier pantalla y —lo
   importante— puede tomar los colores del tema activo, que es lo
   que la hace encajar con los nueve mundos. */

const EYES = {
  contenta:   '<path d="M50 47 Q55 42 60 47" /><path d="M68 47 Q73 42 78 47" />',
  leyendo:    '<path d="M50 48 Q55 53 60 48" /><path d="M68 48 Q73 53 78 48" />',
  dormida:    '<path d="M49 48 Q55 52 61 48" /><path d="M67 48 Q73 52 79 48" />',
  celebrando: '<path d="M50 48 Q55 41 60 48" /><path d="M68 48 Q73 41 78 48" />',
  expectante: '',
};

const OPEN_EYES = `
  <ellipse cx="55" cy="46" rx="4.2" ry="5.4" fill="var(--pet-eye)" stroke="none"/>
  <ellipse cx="73" cy="46" rx="4.2" ry="5.4" fill="var(--pet-eye)" stroke="none"/>
  <circle cx="56.4" cy="44.2" r="1.5" fill="var(--pet-shine)" stroke="none"/>
  <circle cx="74.4" cy="44.2" r="1.5" fill="var(--pet-shine)" stroke="none"/>`;

const ACCESSORY_SVG = {
  ninguno: '',
  bufanda: `<path d="M44 66 Q64 76 84 66 L84 74 Q64 84 44 74 Z" fill="var(--pet-accent)" stroke="none"/>
            <path d="M78 72 L86 92 L78 92 L73 75 Z" fill="var(--pet-accent)" stroke="none" opacity=".85"/>`,
  gafas:   `<circle cx="55" cy="46" r="9" fill="none" stroke="var(--pet-accent)" stroke-width="2.4"/>
            <circle cx="73" cy="46" r="9" fill="none" stroke="var(--pet-accent)" stroke-width="2.4"/>
            <path d="M64 46 h0" stroke="var(--pet-accent)" stroke-width="2.4"/>
            <path d="M64 46 L64 46 M63 46 h2" stroke="var(--pet-accent)" stroke-width="2.4"/>`,
  lazo:    `<path d="M64 68 L54 62 L54 74 Z" fill="var(--pet-accent)" stroke="none"/>
            <path d="M64 68 L74 62 L74 74 Z" fill="var(--pet-accent)" stroke="none"/>
            <circle cx="64" cy="68" r="3.4" fill="var(--pet-accent)" stroke="none"/>`,
  gorro:   `<path d="M44 26 Q64 4 84 26 Z" fill="var(--pet-accent)" stroke="none"/>
            <ellipse cx="64" cy="27" rx="22" ry="4" fill="var(--pet-accent)" stroke="none" opacity=".8"/>`,
  flor:    `<g transform="translate(82 24)">
              <circle cx="0" cy="-6" r="4.4" fill="var(--pet-accent)" stroke="none"/>
              <circle cx="5.7" cy="-1.9" r="4.4" fill="var(--pet-accent)" stroke="none"/>
              <circle cx="3.5" cy="4.9" r="4.4" fill="var(--pet-accent)" stroke="none"/>
              <circle cx="-3.5" cy="4.9" r="4.4" fill="var(--pet-accent)" stroke="none"/>
              <circle cx="-5.7" cy="-1.9" r="4.4" fill="var(--pet-accent)" stroke="none"/>
              <circle cx="0" cy="0" r="3" fill="var(--pet-shine)" stroke="none"/>
            </g>`,
};

const CORNER_SVG = {
  estante: `<g opacity=".55" stroke="none">
              <rect x="2" y="86" width="26" height="4" rx="1" fill="var(--pet-line)"/>
              <rect x="5"  y="68" width="5" height="18" rx="1" fill="var(--pet-accent)"/>
              <rect x="11" y="72" width="4" height="14" rx="1" fill="var(--pet-line)"/>
              <rect x="16" y="66" width="6" height="20" rx="1" fill="var(--pet-accent)" opacity=".7"/>
            </g>`,
  planta:  `<g opacity=".55" stroke="none">
              <path d="M14 86 Q6 72 12 62 Q16 74 16 86 Z" fill="var(--pet-line)"/>
              <path d="M16 86 Q26 70 20 60 Q15 74 15 86 Z" fill="var(--pet-accent)" opacity=".7"/>
              <path d="M6 86 h18 l-2 12 h-14 Z" fill="var(--pet-line)"/>
            </g>`,
  lampara: `<g opacity=".55" stroke="none">
              <path d="M6 70 L24 70 L19 54 L11 54 Z" fill="var(--pet-accent)"/>
              <rect x="14" y="70" width="2" height="26" fill="var(--pet-line)"/>
              <ellipse cx="15" cy="98" rx="9" ry="2.5" fill="var(--pet-line)"/>
            </g>`,
  taza:    `<g opacity=".55" stroke="none">
              <path d="M6 78 h18 v10 a9 9 0 0 1 -18 0 Z" fill="var(--pet-accent)"/>
              <path d="M24 80 a6 6 0 0 1 0 8" fill="none" stroke="var(--pet-accent)" stroke-width="2.4"/>
              <path d="M11 72 q2 -5 0 -9 M17 72 q2 -5 0 -9" fill="none" stroke="var(--pet-line)" stroke-width="1.6" opacity=".7"/>
            </g>`,
};

/** Luminancia de un hex, para decidir si algo encima debe ser claro u oscuro. */
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** El SVG completo. `mood` decide ojos, libro y destellos. */
export function petSvg(mood = 'contenta', cfg = petConfig()) {
  const fur = FURS.find((f) => f.id === cfg.fur) || FURS[0];
  /* Los ojos contrastan con el PELAJE, no con el tema. Atarlos al fondo
     los hacía desaparecer: en Pergamino el fondo es crema, y con pelaje
     Tinta o Nocturna pasaba justo lo contrario. */
  const darkFur = luminance(fur.color) < 0.3;
  const eye = darkFur ? '#F4F1EA' : '#241C18';
  const shine = darkFur ? 'rgb(0 0 0 / .45)' : 'rgb(255 255 255 / .9)';
  /* Sin contorno, un gato blanco desaparecía sobre Pergamino y uno
     oscuro sobre Obsidiana. El contorno se invierte con el pelaje,
     así que define la silueta contra cualquiera de los nueve fondos. */
  const outline = darkFur ? 'rgb(255 255 255 / .3)' : 'rgb(36 28 24 / .32)';
  const accessory = ACCESSORY_SVG[cfg.accessory] ?? '';
  const corner = CORNER_SVG[cfg.corner] ?? '';
  const eyes = mood === 'expectante' ? OPEN_EYES : EYES[mood] || EYES.contenta;
  const strokeEyes = mood !== 'expectante';

  return `
<svg class="pet-svg" viewBox="0 0 128 112" role="img"
     aria-label="Tu mascota lectora, ${moodLabel(mood)}"
     style="--pet-fur:${fur.color};--pet-belly:${fur.belly};--pet-eye:${eye};--pet-shine:${shine};--pet-outline:${outline}">
  ${corner}

  <!-- cola: contorno debajo, pelaje encima -->
  <g class="pet-tail">
    <path d="M92 100 Q118 96 112 74 Q108 58 96 64"
          fill="none" stroke="var(--pet-outline)" stroke-width="12" stroke-linecap="round"/>
    <path d="M92 100 Q118 96 112 74 Q108 58 96 64"
          fill="none" stroke="var(--pet-fur)" stroke-width="9" stroke-linecap="round"/>
  </g>

  <g class="pet-body">
    <!-- cuerpo -->
    <ellipse cx="64" cy="86" rx="30" ry="25" fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.5"/>
    <ellipse cx="64" cy="92" rx="18" ry="16" fill="var(--pet-belly)" opacity=".55"/>
    <!-- patas -->
    <ellipse cx="52" cy="106" rx="9.5" ry="5" fill="var(--pet-belly)" stroke="var(--pet-outline)" stroke-width="1.2"/>
    <ellipse cx="76" cy="106" rx="9.5" ry="5" fill="var(--pet-belly)" stroke="var(--pet-outline)" stroke-width="1.2"/>

    <g class="pet-head">
      <!-- orejas -->
      <path d="M43 34 L40 12 L58 26 Z" fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M85 34 L88 12 L70 26 Z" fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M45 32 L43.5 19 L54 27 Z" fill="var(--pet-belly)" opacity=".65"/>
      <path d="M83 32 L84.5 19 L74 27 Z" fill="var(--pet-belly)" opacity=".65"/>
      <!-- cabeza -->
      <circle cx="64" cy="44" r="25" fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.5"/>
      <ellipse cx="64" cy="55" rx="13" ry="9" fill="var(--pet-belly)" opacity=".5"/>
      <!-- ojos -->
      <g class="pet-eyes" fill="none" stroke="var(--pet-eye)"
         stroke-width="${strokeEyes ? 2.6 : 0}" stroke-linecap="round">${eyes}</g>
      <!-- hocico -->
      <path d="M60.5 53 L67.5 53 L64 57 Z" fill="var(--pet-nose)"/>
      <path d="M64 57 v3 M64 60 q-4 3 -7 0 M64 60 q4 3 7 0"
            fill="none" stroke="var(--pet-eye)" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
      <!-- bigotes -->
      <g stroke="var(--pet-eye)" stroke-width="1.3" stroke-linecap="round" opacity=".35">
        <path d="M44 52 h-14 M44 57 h-13 M84 52 h14 M84 57 h13"/>
      </g>
      ${accessory}
    </g>
  </g>

  ${mood === 'leyendo' || mood === 'expectante' ? `
    <g class="pet-book">
      <path d="M44 92 L64 88 L64 108 L44 104 Z" fill="var(--pet-book)"/>
      <path d="M84 92 L64 88 L64 108 L84 104 Z" fill="var(--pet-book)" opacity=".76"/>
      <path d="M64 88 v20" stroke="var(--pet-eye)" stroke-width="1.4" opacity=".5"/>
    </g>` : ''}

  ${mood === 'dormida' ? `
    <g class="pet-zzz" fill="var(--pet-line)" opacity=".65"
       font-family="var(--font-display)" font-size="13">
      <text x="92" y="30">z</text>
      <text x="102" y="19" font-size="10">z</text>
    </g>` : ''}

  ${mood === 'celebrando' ? `
    <g class="pet-spark" fill="var(--pet-accent)">
      <path d="M24 26 l2.6 6.4 6.4 2.6 -6.4 2.6 -2.6 6.4 -2.6 -6.4 -6.4 -2.6 6.4 -2.6 Z"/>
      <path d="M104 40 l1.9 4.6 4.6 1.9 -4.6 1.9 -1.9 4.6 -1.9 -4.6 -4.6 -1.9 4.6 -1.9 Z" opacity=".8"/>
    </g>` : ''}
</svg>`;
}

const moodLabel = (m) => ({
  contenta: 'contenta', leyendo: 'leyendo contigo', dormida: 'dormida',
  celebrando: 'celebrando', expectante: 'expectante',
}[m] || 'contenta');

/** El bloque completo que se pinta en el inicio. */
export function renderPet() {
  const cfg = petConfig();
  if (cfg.hidden) return '';
  const state = petState();
  return `
    <div class="pet-shelf" data-mood="${state.mood}" onclick="pokePet()" role="button" tabindex="0">
      ${petSvg(state.mood, cfg)}
      <div class="pet-talk">
        ${cfg.name ? `<div class="pet-name">${esc(cfg.name)}</div>` : ''}
        <p class="pet-phrase">${esc(petPhrase(state))}</p>
      </div>
    </div>`;
}
