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
import { ACHIEVEMENTS } from './achievements.js';
import { esc } from './ui.js';
import { estadoMascota, fraseMascota } from './pet-core.js';

/* ── PERSONALIZACIÓN ─────────────────────────────────────────
   Todo se desbloquea leyendo. Un accesorio que costó terminar un
   libro de 900 páginas significa algo; uno que costó dos dólares, no.

   EL PELAJE Y EL ACCESORIO YA NO SE GANAN, y no es que se hayan
   abaratado: es que se van. Una especie ilustrada llega pintada, con
   su color y sin postizos, así que el guardarropa solo existe
   mientras queden especies dibujadas por código. Dejar los logros
   colgando de algo que va a desaparecer era dejarlos sin premio el
   día que desaparezca; se mudaron a las especies, que se quedan.
   Mientras tanto el vestuario está entero y abierto. */

export const FURS = [
  { id: 'atigrado', name: 'Atigrada', color: '#C89A5E', belly: '#E8D4B4', unlock: null },
  { id: 'nocturna', name: 'Nocturna', color: '#3E3A52', belly: '#6E6884', unlock: null },
  { id: 'nieve',    name: 'Nieve',    color: '#E4E0D8', belly: '#FFFFFF', unlock: null },
  { id: 'canela',   name: 'Canela',   color: '#B4633A', belly: '#E0A87E', unlock: null },
  { id: 'ceniza',   name: 'Ceniza',   color: '#8A8E96', belly: '#C4C8D0', unlock: null },
  { id: 'tinta',    name: 'Tinta',    color: '#2A3550', belly: '#5A6B8C', unlock: null },
  { id: 'trigo',    name: 'Trigo',    color: '#E0B65C', belly: '#F4E2AE', unlock: null },
];

export const ACCESSORIES = [
  { id: 'ninguno', name: 'Nada',     unlock: null },
  { id: 'bufanda', name: 'Bufanda',  unlock: null },
  { id: 'gafas',   name: 'Gafas',    unlock: null },
  { id: 'lazo',    name: 'Lazo',     unlock: null },
  { id: 'gorro',   name: 'Gorrito',  unlock: null },
  { id: 'flor',    name: 'Flor',     unlock: null },
];

/* ── ESCENAS ─────────────────────────────────────────────────
   Esto es lo que se conserva de Catzy: explorar mundos. Pero aquí
   el mundo no se elige de un menú — lo decide lo que estás leyendo.
   Terminar el bloque japonés hace aparecer la rama de sakura, y eso
   premia el bloque entero, no un contador. */

export const SCENES = [
  { id: 'auto',    name: 'Sigue mi lectura', unlock: null, auto: true },
  { id: 'estante', name: 'Estantería', unlock: null },
  { id: 'planta',  name: 'Planta',     unlock: null },
  { id: 'lampara', name: 'Lámpara',    unlock: 'primer-libro' },
  { id: 'taza',    name: 'Taza',       unlock: 'veinticinco-libros' },
  { id: 'rama',    name: 'Rama en flor', unlock: 'bloque-oriental' },
  { id: 'velas',   name: 'Velas',      unlock: 'octubre-terror' },
  { id: 'hojas',   name: 'Selva',      unlock: 'cinco-generos' },
  { id: 'columna', name: 'Columna',    unlock: 'primer-clasico' },
];

/** Qué escenario le corresponde a cada género. */
const GENRE_SCENE = {
  'Oriente / Espiritualidad': 'rama',
  'Terror / Misterio': 'velas',
  'Latinoamérica': 'hojas',
  'Historia / Mitología': 'columna',
  'Clásico universal': 'columna',
  'Fantasía / Juvenil': 'planta',
  'Poesía / Teatro': 'planta',
  'No ficción / Desarrollo': 'lampara',
  'Thriller': 'lampara',
  'Novela contemporánea': 'taza',
  'Autobiografía': 'taza',
  'Romance': 'rama',
  'Fantasía': 'planta',
  'Aventura': 'hojas',
  'Ciencia ficción': 'lampara',
  'Novela histórica': 'columna',
  'Ensayo / Filosofía': 'lampara',
  'Humor': 'taza',
  'Infantil': 'planta',
  'Novela gráfica / Cómic': 'lampara',
};

/* ── ESPECIES ────────────────────────────────────────────────
   Una colección, pero UNA activa. Tres a la vez repartirían la
   atención y diluirían lo único que hace funcionar esto: que haya
   alguien esperándote. */

/* DOS ABIERTAS Y CUATRO QUE SE GANAN. El miedo de antes —que
   esconderlas hiciera parecer que solo había una gata— se resuelve
   con que se VEAN las seis desde el primer día, con su candado y su
   pista. Un armario cerrado que se ve es un motivo; uno que no se ve
   es una carencia. Y dos abiertas bastan para que elegir compañía
   siga siendo lo primero que se hace al abrir la app.

   Cada una va con el logro que le pega, no con el siguiente de la
   lista: el búho con el tomo gordo, la zorra con el primer clásico
   —que es de donde viene—, el mapache con los cinco géneros porque
   junta de todo, y la panda con los diez libros, que es constancia. */
export const SPECIES = [
  { id: 'gato',    name: 'Gatita',  emoji: '🐱', unlock: null },
  { id: 'conejo',  name: 'Coneja',  emoji: '🐰', unlock: null },
  { id: 'buho',    name: 'Búho',    emoji: '🦉', unlock: 'tomo-500' },
  { id: 'zorro',   name: 'Zorrita', emoji: '🦊', unlock: 'primer-clasico' },
  { id: 'mapache', name: 'Mapache', emoji: '🦝', unlock: 'cinco-generos' },
  { id: 'panda',   name: 'Panda',   emoji: '🐼', unlock: 'diez-libros' },
];

export const DEFAULT_PET = {
  name: '',
  species: 'gato',
  fur: 'atigrado',
  accessory: 'bufanda',
  corner: 'auto',
  hidden: false,
};

const unlocked = (item) => {
  if (!item.unlock) return true;
  return (settings().achievements || []).includes(item.unlock);
};

/* Qué hay que hacer para que se abra, con las palabras del propio
   logro. Un candado sin pista se lee como una carencia; con la pista
   es un motivo, y es la diferencia entera entre las dos cosas. */
const pistaDe = (item) => (item.unlock
  ? ACHIEVEMENTS.find((a) => a.id === item.unlock)?.hint || null
  : null);

const conCandado = (item) => ({ ...item, locked: !unlocked(item), hint: pistaDe(item) });

export const availableFurs = () => FURS.map(conCandado);
export const availableAccessories = () => ACCESSORIES.map(conCandado);
export const availableCorners = () => SCENES.map(conCandado);
export const availableSpecies = () => SPECIES.map(conCandado);

/* La especie guardada puede haber dejado de estar abierta: se elige
   una vez y las reglas de desbloqueo cambian con la app. Si pasa, se
   cae a la de por defecto en vez de pintar una mascota que ya no se
   puede elegir —el mismo cuidado que `currentScene` tiene con los
   rincones—, y sin tocar lo guardado: el día que se gane, vuelve. */
export function petConfig() {
  const cfg = { ...DEFAULT_PET, ...(settings().pet || {}) };
  const sp = SPECIES.find((x) => x.id === cfg.species);
  if (!sp || !unlocked(sp)) cfg.species = DEFAULT_PET.species;
  return cfg;
}

/**
 * La escena que toca ahora mismo.
 * Con 'auto', la decide el libro en curso; si no hay ninguno, el
 * último terminado. Un escenario bloqueado no aparece por sorpresa:
 * se cae a la estantería hasta que se gane.
 */
export function currentScene(cfg = petConfig()) {
  if (cfg.corner !== 'auto') return cfg.corner;

  const books = allBooks();
  /* Con varios libros en curso manda el más reciente, no el primero
     de la lista: la escena debe seguir lo que estás leyendo AHORA. */
  const reading = books
    .filter((b) => statusOf(b.id) === 'reading')
    .sort((a, b) => (entry(b.id).lastReadAt || 0) - (entry(a.id).lastReadAt || 0))[0];
  const lastDone = books
    .filter((b) => entry(b.id).finishedAt)
    .sort((a, b) => entry(b.id).finishedAt - entry(a.id).finishedAt)[0];

  const genre = (reading || lastDone)?.genre;
  const wanted = GENRE_SCENE[genre] || 'estante';
  const scene = SCENES.find((sc) => sc.id === wanted);
  return scene && unlocked(scene) ? wanted : 'estante';
}

/* ── ESTADO Y VOZ ────────────────────────────────────────────
   Las cuentas viven en `pet-core.js`, sin Firebase ni DOM, para que
   se puedan comprobar: ahí es donde estaban los tres fallos que
   hacían que dijera cosas que no venían a cuento. Aquí queda solo el
   puente — sacar del almacén lo que esas cuentas necesitan. */

/** Los libros con lo justo que la mascota necesita saber. */
const librosParaLaMascota = () => allBooks().map((b) => {
  const e = entry(b.id);
  return {
    id: b.id,
    title: b.title,
    total: pageCount(b.pages),
    page: e.page || 0,
    status: statusOf(b.id),
    pct: progressPct(b.id),
    lastReadAt: e.lastReadAt || 0,
    finishedAt: e.finishedAt || 0,
  };
});

/** El ánimo y de qué libro habla. `current` se conserva por compatibilidad. */
export function petState() {
  const e = estadoMascota(librosParaLaMascota());
  return { mood: e.mood, current: e.libro, daysQuiet: e.diasCallada, libro: e.libro };
}

/** Lo que dice ahora mismo. */
export const petPhrase = (state = petState()) => fraseMascota(
  { mood: state.mood, libro: state.libro ?? state.current, diasCallada: state.daysQuiet },
  { nombre: petConfig().name },
);

/* ── EL DIBUJO  ·  historia #38 ──────────────────────────────
   SVG y no imagen: pesa poco, escala a cualquier pantalla y —lo
   importante— puede tomar los colores del tema activo, que es lo
   que la hace encajar con los nueve mundos. */

/* Proporciones kawaii: la cabeza ocupa más que el cuerpo, los ojos
   van bajos y muy separados, y todo lo que puede ser redondo lo es.
   No es un capricho — es lo que separa «un animalito» de «un animal
   dibujado en pequeño». Las esquinas duras se leen como adultas. */

const EYES = {
  contenta:   '<path d="M46 55 Q52 48 58 55" /><path d="M70 55 Q76 48 82 55" />',
  leyendo:    '<path d="M46 52 Q52 59 58 52" /><path d="M70 52 Q76 59 82 52" />',
  dormida:    '<path d="M46 54 Q52 59.5 58 54" /><path d="M70 54 Q76 59.5 82 54" />',
  celebrando: '<path d="M46 56 Q52 46 58 56" /><path d="M70 56 Q76 46 82 56" />',
  expectante: '',
};

/* Dos brillos por ojo, no uno: el grande arriba y uno chiquito abajo.
   Es lo que hace que el ojo parezca húmedo en vez de un punto negro. */
const OPEN_EYES = `
  <ellipse cx="52" cy="53" rx="6.6" ry="7.8" fill="var(--pet-eye)" stroke="none"/>
  <ellipse cx="76" cy="53" rx="6.6" ry="7.8" fill="var(--pet-eye)" stroke="none"/>
  <circle cx="54.4" cy="49.6" r="2.5" fill="var(--pet-shine)" stroke="none"/>
  <circle cx="78.4" cy="49.6" r="2.5" fill="var(--pet-shine)" stroke="none"/>
  <circle cx="49.8" cy="56.6" r="1.3" fill="var(--pet-shine)" stroke="none" opacity=".65"/>
  <circle cx="73.8" cy="56.6" r="1.3" fill="var(--pet-shine)" stroke="none" opacity=".65"/>`;

/** Los cachetes. Van siempre, en cualquier ánimo: son la mitad del gesto. */
const BLUSH = `
  <ellipse cx="39" cy="62" rx="6.6" ry="4.2" fill="var(--pet-blush)" stroke="none"/>
  <ellipse cx="89" cy="62" rx="6.6" ry="4.2" fill="var(--pet-blush)" stroke="none"/>`;

/* Los accesorios se dibujan DESPUÉS de la cabeza, así que van en sus
   coordenadas absolutas. Ninguno tapa los ojos ni los cachetes: un
   accesorio que esconde el gesto no es un accesorio, es una máscara. */
const ACCESSORY_SVG = {
  ninguno: '',
  /* Una banda en el cuello con su borde. Sin el contorno se fundía
     con la barriga clara y parecía un peto, no una bufanda. */
  bufanda: `<path d="M41 72 Q64 82 87 72 Q89 76 87 80 Q64 90 41 80 Q39 76 41 72 Z"
                  fill="var(--pet-accent)" stroke="var(--pet-outline)" stroke-width="1.2"/>
            <path d="M79 79 Q87 90 85 101 Q80 103 75 101 Q77 90 73 82 Z"
                  fill="var(--pet-accent)" stroke="var(--pet-outline)" stroke-width="1.2" opacity=".92"/>
            <path d="M46 78 h34" stroke="var(--pet-shine)" stroke-width="1.4" opacity=".28" fill="none"/>`,
  gafas:   `<g fill="none" stroke="var(--pet-accent)" stroke-width="2.6" stroke-linecap="round">
              <rect x="41" y="43" width="22" height="20" rx="9"/>
              <rect x="65" y="43" width="22" height="20" rx="9"/>
              <path d="M63 52 h2"/>
              <path d="M41 51 q-6 -1 -8 3 M87 51 q6 -1 8 3"/>
            </g>`,
  lazo:    `<g transform="translate(40 26) rotate(-16)">
              <path d="M0 0 Q-11 -8 -12 1 Q-13 10 0 3 Z" fill="var(--pet-accent)" stroke="none"/>
              <path d="M0 0 Q11 -8 12 1 Q13 10 0 3 Z" fill="var(--pet-accent)" stroke="none"/>
              <ellipse cx="0" cy="1.5" rx="3.6" ry="3.2" fill="var(--pet-accent)" stroke="none"/>
              <ellipse cx="-1" cy="0.4" rx="1.4" ry="1.1" fill="var(--pet-shine)" stroke="none" opacity=".6"/>
            </g>`,
  gorro:   `<path d="M42 27 Q50 3 64 3 Q78 3 86 27 Z" fill="var(--pet-accent)" stroke="none"/>
            <ellipse cx="64" cy="27" rx="24" ry="5" fill="var(--pet-accent)" stroke="none"/>
            <ellipse cx="64" cy="26" rx="24" ry="4" fill="var(--pet-shine)" stroke="none" opacity=".28"/>
            <circle cx="64" cy="4" r="5" fill="var(--pet-shine)" stroke="none" opacity=".55"/>`,
  flor:    `<g transform="translate(90 27)">
              <circle cx="0" cy="-6.4" r="4.8" fill="var(--pet-accent)" stroke="none"/>
              <circle cx="6.1" cy="-2" r="4.8" fill="var(--pet-accent)" stroke="none"/>
              <circle cx="3.8" cy="5.2" r="4.8" fill="var(--pet-accent)" stroke="none"/>
              <circle cx="-3.8" cy="5.2" r="4.8" fill="var(--pet-accent)" stroke="none"/>
              <circle cx="-6.1" cy="-2" r="4.8" fill="var(--pet-accent)" stroke="none"/>
              <circle cx="0" cy="0" r="3.2" fill="var(--pet-shine)" stroke="none"/>
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
  rama:    `<g opacity=".6" stroke="none">
              <path d="M2 78 Q14 84 28 80" fill="none" stroke="var(--pet-line)" stroke-width="2.4" stroke-linecap="round"/>
              <circle cx="9"  cy="76" r="3.4" fill="var(--pet-accent)"/>
              <circle cx="17" cy="81" r="2.8" fill="var(--pet-accent)" opacity=".8"/>
              <circle cx="25" cy="77" r="3.1" fill="var(--pet-accent)" opacity=".9"/>
              <circle cx="13" cy="90" r="2.2" fill="var(--pet-accent)" opacity=".5"/>
            </g>`,
  velas:   `<g opacity=".6" stroke="none">
              <rect x="8"  y="66" width="6" height="26" rx="2" fill="var(--pet-line)"/>
              <rect x="18" y="74" width="5" height="18" rx="2" fill="var(--pet-line)" opacity=".8"/>
              <path d="M11 66 q3 -6 0 -9 q-3 3 0 9" fill="var(--pet-accent)"/>
              <path d="M20.5 74 q2.4 -5 0 -7.5 q-2.4 2.5 0 7.5" fill="var(--pet-accent)" opacity=".9"/>
              <ellipse cx="15" cy="94" rx="12" ry="2.5" fill="var(--pet-accent)" opacity=".18"/>
            </g>`,
  hojas:   `<g opacity=".55" stroke="none">
              <path d="M4 92 Q0 70 14 58 Q18 78 10 92 Z" fill="var(--pet-line)"/>
              <path d="M12 92 Q14 68 30 60 Q26 82 18 92 Z" fill="var(--pet-accent)" opacity=".65"/>
              <path d="M14 58 L10 92 M30 60 L18 92" stroke="var(--pet-line)" stroke-width="1" opacity=".5"/>
            </g>`,
  columna: `<g opacity=".5" stroke="none">
              <rect x="6"  y="56" width="20" height="4" rx="1" fill="var(--pet-line)"/>
              <rect x="8"  y="60" width="16" height="32" fill="var(--pet-accent)" opacity=".55"/>
              <rect x="4"  y="92" width="24" height="5" rx="1" fill="var(--pet-line)"/>
              <path d="M12 60 v32 M16 60 v32 M20 60 v32" stroke="var(--pet-line)" stroke-width="1" opacity=".6"/>
            </g>`,
  taza:    `<g opacity=".55" stroke="none">
              <path d="M6 78 h18 v10 a9 9 0 0 1 -18 0 Z" fill="var(--pet-accent)"/>
              <path d="M24 80 a6 6 0 0 1 0 8" fill="none" stroke="var(--pet-accent)" stroke-width="2.4"/>
              <path d="M11 72 q2 -5 0 -9 M17 72 q2 -5 0 -9" fill="none" stroke="var(--pet-line)" stroke-width="1.6" opacity=".7"/>
            </g>`,
};

/* Cada especie reemplaza solo lo que la distingue: orejas, cola y la
   marca de la cara. El cuerpo redondo es el mismo para todas, y es lo
   que hace que las seis se sientan de la misma familia en vez de seis
   dibujos sueltos. */
const SPECIES_PARTS = {
  gato: {
    /* Orejas de esquinas redondeadas. Un triángulo con punta afilada
       se lee como felino adulto; el mismo triángulo con las esquinas
       blandas se lee como gatito. */
    ears: `<path d="M43 32 Q36 10 47 10 Q57 12 61 25 Z" fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.6" stroke-linejoin="round"/>
           <path d="M85 32 Q92 10 81 10 Q71 12 67 25 Z" fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.6" stroke-linejoin="round"/>
           <path d="M46 29 Q41 16 48 16 Q54 18 57 26 Z" fill="var(--pet-inner)" stroke="none" opacity=".75"/>
           <path d="M82 29 Q87 16 80 16 Q74 18 71 26 Z" fill="var(--pet-inner)" stroke="none" opacity=".75"/>`,
    muzzle: '<ellipse cx="64" cy="64" rx="13" ry="8.5" fill="var(--pet-belly)" opacity=".5"/>',
    tail: 'M88 98 Q116 94 110 72 Q106 57 93 63',
    face: `<ellipse cx="64" cy="61" rx="3.4" ry="2.6" fill="var(--pet-nose)"/>
           <path d="M64 64 v2 M64 66 q-4 3.4 -7.5 .4 M64 66 q4 3.4 7.5 .4"
                 fill="none" stroke="var(--pet-eye)" stroke-width="1.7" stroke-linecap="round" opacity=".72"/>
           <g stroke="var(--pet-eye)" stroke-width="1.3" stroke-linecap="round" opacity=".3">
             <path d="M34 58 h-12 M34 63 h-11 M94 58 h12 M94 63 h11"/>
           </g>`,
  },

  conejo: {
    /* Orejas largas y blandas, ligeramente abiertas. Es la especie más
       redonda de las seis a propósito: es la que pide que la abracen. */
    ears: `<g stroke="var(--pet-outline)" stroke-width="1.6">
             <ellipse cx="50" cy="15" rx="7.6" ry="18" fill="var(--pet-fur)" transform="rotate(-13 50 15)"/>
             <ellipse cx="78" cy="15" rx="7.6" ry="18" fill="var(--pet-fur)" transform="rotate(13 78 15)"/>
           </g>
           <ellipse cx="50" cy="16" rx="3.8" ry="12.5" fill="var(--pet-inner)" stroke="none" opacity=".8" transform="rotate(-13 50 16)"/>
           <ellipse cx="78" cy="16" rx="3.8" ry="12.5" fill="var(--pet-inner)" stroke="none" opacity=".8" transform="rotate(13 78 16)"/>`,
    muzzle: '<ellipse cx="64" cy="64" rx="12" ry="8" fill="var(--pet-belly)" opacity=".5"/>',
    tail: '',
    /* La colita: un pompón detrás del cuerpo. */
    tailTip: `<circle cx="96" cy="94" r="8.5" fill="var(--pet-belly)" stroke="var(--pet-outline)" stroke-width="1.4"/>`,
    face: `<path d="M60.6 60 Q64 57.6 67.4 60 Q64 63.6 60.6 60 Z" fill="var(--pet-nose)"/>
           <path d="M64 63 v2 M64 65 q-3.6 3.2 -7 .4 M64 65 q3.6 3.2 7 .4"
                 fill="none" stroke="var(--pet-eye)" stroke-width="1.7" stroke-linecap="round" opacity=".72"/>
           <path d="M60 70 h8" stroke="var(--pet-eye)" stroke-width="2.6" stroke-linecap="round" opacity=".28"/>`,
  },

  buho: {
    /* Sin orejas: penachos cortos. Y sin cola, que un búho sentado no
       la luce. Lo suyo son los dos discos de la cara. */
    ears: `<path d="M45 24 Q34 1 49 7 Q57 11 59 21 Z" fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.5" stroke-linejoin="round"/>
           <path d="M83 24 Q94 1 79 7 Q71 11 69 21 Z" fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.5" stroke-linejoin="round"/>`,
    /* Los dos discos son LO que hace a un búho. Antes iban tan suaves
       que se leía como un hámster: ahora llevan aro y ceja. */
    discs: `<circle cx="52" cy="53" r="15" fill="var(--pet-belly)" opacity=".62"/>
            <circle cx="76" cy="53" r="15" fill="var(--pet-belly)" opacity=".62"/>
            <circle cx="52" cy="53" r="15" fill="none" stroke="var(--pet-eye)" stroke-width="1.2" opacity=".2"/>
            <circle cx="76" cy="53" r="15" fill="none" stroke="var(--pet-eye)" stroke-width="1.2" opacity=".2"/>
            <path d="M40 42 Q52 34 64 40 Q76 34 88 42" fill="none" stroke="var(--pet-eye)"
                  stroke-width="2" stroke-linecap="round" opacity=".3"/>`,
    tail: '',
    /* Alas pegadas al cuerpo, en vez de patitas sueltas. */
    tailTip: `<path d="M40 80 Q30 92 38 104" fill="none" stroke="var(--pet-fur)" stroke-width="9" stroke-linecap="round" opacity=".85"/>
              <path d="M88 80 Q98 92 90 104" fill="none" stroke="var(--pet-fur)" stroke-width="9" stroke-linecap="round" opacity=".85"/>`,
    muzzle: '',
    face: `<path d="M64 57 Q69 62 64 71 Q59 62 64 57 Z" fill="var(--pet-nose)"/>
           <g fill="var(--pet-belly)" opacity=".45">
             <circle cx="56" cy="88" r="2.4"/><circle cx="64" cy="82" r="2.4"/>
             <circle cx="72" cy="88" r="2.4"/><circle cx="64" cy="94" r="2.4"/>
           </g>`,
  },

  zorro: {
    ears: `<path d="M40 30 Q30 -2 46 4 Q59 9 62 24 Z" fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.6" stroke-linejoin="round"/>
           <path d="M88 30 Q98 -2 82 4 Q69 9 66 24 Z" fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.6" stroke-linejoin="round"/>
           <path d="M43 27 Q36 8 47 11 Q55 15 57 25 Z" fill="var(--pet-eye)" stroke="none" opacity=".52"/>
           <path d="M85 27 Q92 8 81 11 Q73 15 71 25 Z" fill="var(--pet-eye)" stroke="none" opacity=".52"/>`,
    /* El hocico claro en pico, la marca del zorro sin dejar de ser redondo. */
    muzzle: '<path d="M48 58 Q64 54 80 58 Q76 74 64 74 Q52 74 48 58 Z" fill="var(--pet-belly)" opacity=".92"/>',
    tail: 'M86 98 Q120 94 114 68 Q110 52 94 60',
    tailWidth: 17,
    tailTip: `<path d="M114 68 Q110 52 94 60" fill="none" stroke="var(--pet-belly)"
                    stroke-width="15" stroke-linecap="round" opacity=".95"/>`,
    face: `<ellipse cx="64" cy="61" rx="3.6" ry="2.8" fill="var(--pet-nose)"/>
           <path d="M64 64 v2 M64 66 q-4 3.4 -7.5 .4 M64 66 q4 3.4 7.5 .4"
                 fill="none" stroke="var(--pet-eye)" stroke-width="1.7" stroke-linecap="round" opacity=".72"/>
           <g stroke="var(--pet-eye)" stroke-width="1.2" stroke-linecap="round" opacity=".26">
             <path d="M35 58 h-12 M35 63 h-11 M93 58 h12 M93 63 h11"/>
           </g>`,
  },

  mapache: {
    ears: `<circle cx="45" cy="26" r="11" fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.6"/>
           <circle cx="83" cy="26" r="11" fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.6"/>
           <circle cx="46" cy="27" r="6" fill="var(--pet-inner)" stroke="none" opacity=".75"/>
           <circle cx="82" cy="27" r="6" fill="var(--pet-inner)" stroke="none" opacity=".75"/>`,
    /* El antifaz es su firma: dos manchas anchas alrededor de los ojos. */
    discs: `<path d="M35 49 Q46 38 61 47 Q61 63 46 65 Q35 61 35 49 Z" fill="var(--pet-eye)" opacity=".62"/>
            <path d="M93 49 Q82 38 67 47 Q67 63 82 65 Q93 61 93 49 Z" fill="var(--pet-eye)" opacity=".62"/>
            <ellipse cx="52" cy="53" rx="7.6" ry="8.6" fill="var(--pet-sclera)" opacity=".92"/>
            <ellipse cx="76" cy="53" rx="7.6" ry="8.6" fill="var(--pet-sclera)" opacity=".92"/>
            <path d="M42 38 Q52 33 58 39" fill="none" stroke="var(--pet-belly)" stroke-width="3" stroke-linecap="round" opacity=".5"/>
            <path d="M86 38 Q76 33 70 39" fill="none" stroke="var(--pet-belly)" stroke-width="3" stroke-linecap="round" opacity=".5"/>`,
    muzzle: '<ellipse cx="64" cy="63" rx="12.5" ry="8.5" fill="var(--pet-belly)" opacity=".85"/>',
    tail: 'M88 98 Q116 94 110 72 Q106 57 93 63',
    tailTip: `<g stroke="var(--pet-eye)" stroke-width="5.5" opacity=".4" fill="none" stroke-linecap="round">
                <path d="M105 90 q7 -3 7 -9"/><path d="M110 74 q2 -7 -1 -10"/>
              </g>`,
    face: `<ellipse cx="64" cy="60" rx="3.6" ry="2.8" fill="var(--pet-nose)"/>
           <path d="M64 63 v2 M64 65 q-3.6 3.2 -7 .4 M64 65 q3.6 3.2 7 .4"
                 fill="none" stroke="var(--pet-eye)" stroke-width="1.7" stroke-linecap="round" opacity=".72"/>`,
  },

  panda: {
    /* Orejas redondas y oscuras. El contraste sale del mismo tono que
       los ojos, así que sigue funcionando con pelaje claro y oscuro. */
    ears: `<circle cx="43" cy="24" r="11.5" fill="var(--pet-eye)" opacity=".82"/>
           <circle cx="85" cy="24" r="11.5" fill="var(--pet-eye)" opacity=".82"/>`,
    /* Las manchas de los ojos, inclinadas: es lo que le da la cara. */
    discs: `<ellipse cx="51" cy="54" rx="11" ry="13" fill="var(--pet-eye)" opacity=".8" transform="rotate(-14 51 54)"/>
            <ellipse cx="77" cy="54" rx="11" ry="13" fill="var(--pet-eye)" opacity=".8" transform="rotate(14 77 54)"/>
            <ellipse cx="52" cy="53" rx="7.8" ry="9" fill="var(--pet-sclera)"/>
            <ellipse cx="76" cy="53" rx="7.8" ry="9" fill="var(--pet-sclera)"/>`,
    muzzle: '<ellipse cx="64" cy="64" rx="12" ry="8" fill="var(--pet-belly)" opacity=".55"/>',
    tail: '',
    /* Bracitos oscuros abrazando el cuerpo. */
    tailTip: `<path d="M42 80 Q32 92 40 103" fill="none" stroke="var(--pet-eye)" stroke-width="10" stroke-linecap="round" opacity=".72"/>
              <path d="M86 80 Q96 92 88 103" fill="none" stroke="var(--pet-eye)" stroke-width="10" stroke-linecap="round" opacity=".72"/>`,
    face: `<ellipse cx="64" cy="60" rx="4" ry="3" fill="var(--pet-nose)"/>
           <path d="M64 63 v2 M64 65 q-3.6 3.2 -7 .4 M64 65 q3.6 3.2 7 .4"
                 fill="none" stroke="var(--pet-eye)" stroke-width="1.7" stroke-linecap="round" opacity=".72"/>`,
  },
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
  const parts = SPECIES_PARTS[cfg.species] || SPECIES_PARTS.gato;
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
  /* Los cachetes y el interior de las orejas: un rosa que se ve tanto
     sobre pelaje claro como oscuro, solo cambiando cuánto pesa. */
  const blush = darkFur ? 'rgb(255 176 176 / .34)' : 'rgb(232 116 122 / .34)';
  const inner = darkFur ? 'rgb(255 176 186 / .5)' : 'rgb(240 150 158 / .72)';
  /* Detrás de los ojos, para las especies que llevan una mancha oscura
     encima. Sin esto los ojos de la panda desaparecían dentro de sus
     propias manchas: el mismo error que ya costó los ojos del gato
     sobre Pergamino, en otra parte del dibujo. */
  const sclera = darkFur ? 'rgb(28 22 38 / .92)' : 'rgb(255 250 244 / .95)';
  const accessory = ACCESSORY_SVG[cfg.accessory] ?? '';
  const corner = CORNER_SVG[currentScene(cfg)] ?? '';
  const alwaysOpen = cfg.species === 'buho' && mood !== 'dormida';
  const eyes = (mood === 'expectante' || alwaysOpen) ? OPEN_EYES : EYES[mood] || EYES.contenta;
  const strokeEyes = !(mood === 'expectante' || alwaysOpen);

  return `
<svg class="pet-svg" viewBox="0 0 128 112" role="img"
     aria-label="Tu mascota lectora, ${moodLabel(mood)}"
     style="--pet-fur:${fur.color};--pet-belly:${fur.belly};--pet-eye:${eye};--pet-shine:${shine};--pet-outline:${outline};--pet-blush:${blush};--pet-inner:${inner};--pet-sclera:${sclera}">
  ${corner}

  <!-- cola: contorno debajo, pelaje encima. El búho no tiene. -->
  ${parts.tail ? `
  <g class="pet-tail">
    <path d="${parts.tail}" fill="none" stroke="var(--pet-outline)"
          stroke-width="${(parts.tailWidth || 9) + 3}" stroke-linecap="round"/>
    <path d="${parts.tail}" fill="none" stroke="var(--pet-fur)"
          stroke-width="${parts.tailWidth || 9}" stroke-linecap="round"/>
    ${parts.tailTip}
  </g>` : parts.tailTip}

  <g class="pet-body">
    <!-- cuerpo: una gota redonda, más ancha abajo. La cabeza le come
         la mitad de arriba, que es de donde sale el aire de peluche. -->
    <path d="M64 62 Q92 62 94 88 Q96 108 64 108 Q32 108 34 88 Q36 62 64 62 Z"
          fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.6"/>
    <ellipse cx="64" cy="92" rx="17" ry="14" fill="var(--pet-belly)" opacity=".5"/>
    <!-- patitas -->
    <ellipse cx="52" cy="105" rx="9" ry="5.4" fill="var(--pet-belly)" stroke="var(--pet-outline)" stroke-width="1.2"/>
    <ellipse cx="76" cy="105" rx="9" ry="5.4" fill="var(--pet-belly)" stroke="var(--pet-outline)" stroke-width="1.2"/>

    <g class="pet-head">
      <!-- orejas: van detrás de la cabeza para que la silueta sea limpia -->
      ${parts.ears}
      <!-- cabeza: grande a propósito. Es la proporción, más que
           cualquier detalle, la que hace que se vea tierna. -->
      <circle cx="64" cy="48" r="31" fill="var(--pet-fur)" stroke="var(--pet-outline)" stroke-width="1.6"/>
      <!-- discos o antifaz, bajo los ojos -->
      ${parts.discs || ''}
      ${parts.muzzle || ''}
      ${BLUSH}
      <!-- ojos -->
      <g class="pet-eyes" fill="none" stroke="var(--pet-eye)"
         stroke-width="${strokeEyes ? 3 : 0}" stroke-linecap="round">${eyes}</g>
      <!-- nariz y boca -->
      ${parts.face}
      ${accessory}
    </g>
  </g>

  ${mood === 'leyendo' || mood === 'expectante' ? `
    <g class="pet-book">
      <path d="M46 94 Q64 89 64 92 L64 110 Q64 107 46 110 Z" fill="var(--pet-book)"/>
      <path d="M82 94 Q64 89 64 92 L64 110 Q64 107 82 110 Z" fill="var(--pet-book)" opacity=".76"/>
      <path d="M64 92 v18" stroke="var(--pet-eye)" stroke-width="1.4" opacity=".45"/>
    </g>` : ''}

  ${mood === 'dormida' ? `
    <g class="pet-zzz" fill="var(--pet-line)" opacity=".65"
       font-family="var(--font-display)" font-size="13">
      <text x="98" y="26">z</text>
      <text x="108" y="14" font-size="10">z</text>
    </g>` : ''}

  ${mood === 'celebrando' ? `
    <g class="pet-spark" fill="var(--pet-accent)">
      <path d="M24 26 l2.6 6.4 6.4 2.6 -6.4 2.6 -2.6 6.4 -2.6 -6.4 -6.4 -2.6 6.4 -2.6 Z"/>
      <path d="M104 40 l1.9 4.6 4.6 1.9 -4.6 1.9 -1.9 4.6 -1.9 -4.6 -4.6 -1.9 4.6 -1.9 Z" opacity=".8"/>
    </g>` : ''}
</svg>`;
}

/* ── LAS ESPECIES ILUSTRADAS ──────────────────────────────────
   Una especie con ilustración se pinta como IMAGEN y no como SVG. Las
   dos formas conviven a propósito: van llegando por tandas, y hasta
   que una especie tenga sus cinco poses se sigue dibujando por código
   en vez de quedarse a medias.

   Lo que se pierde al pasar a imagen —y por eso la lista es explícita
   y no un `try`— es el pelaje y el accesorio: la ilustración ya viene
   pintada. Quien elija una especie ilustrada no ve esos dos ajustes
   (ver `speciesIlustrada`), porque un mando que no hace nada es peor
   que no tenerlo. */
export const ILUSTRADAS = ['gato', 'conejo', 'buho', 'zorro', 'panda'];

export const speciesIlustrada = (id) => ILUSTRADAS.includes(id);

const RUTA_MASCOTA = './img/mascota';

/** La imagen de una especie ilustrada, con su respiración. */
function petImg(mood, cfg) {
  const sp = SPECIES.find((x) => x.id === cfg.species);
  return `<img class="pet-img" src="${RUTA_MASCOTA}/${cfg.species}-${mood}.webp"`
    + ` width="320" height="320" decoding="async"`
    + ` alt="${esc(sp?.name || 'Tu mascota')} lectora, ${moodLabel(mood)}">`;
}

const moodLabel = (m) => ({
  contenta: 'contenta', leyendo: 'leyendo contigo', dormida: 'dormida',
  celebrando: 'celebrando', expectante: 'expectante',
}[m] || 'contenta');

/** La mascota, dibujada o ilustrada según la especie. */
export const petVista = (mood, cfg = petConfig()) =>
  (speciesIlustrada(cfg.species) ? petImg(mood, cfg) : petSvg(mood, cfg));

/** El bloque completo que se pinta en el inicio. */
export function renderPet() {
  const cfg = petConfig();
  if (cfg.hidden) return '';
  const state = petState();
  return `
    <div class="pet-shelf" data-mood="${state.mood}" onclick="pokePet()" role="button" tabindex="0">
      ${petVista(state.mood, cfg)}
      <div class="pet-talk">
        ${cfg.name ? `<div class="pet-name">${esc(cfg.name)}</div>` : ''}
        <p class="pet-phrase">${esc(petPhrase(state))}</p>
      </div>
    </div>`;
}
