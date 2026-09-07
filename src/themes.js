/* ─────────────────────────────────────────────────────────────
   LOS ONCE TEMAS  ·  historias #77 y el rediseño

   Un tema es datos, no CSS: solo reemplaza los tokens base de
   styles/tokens.css. Todo lo derivado —bordes, nieblas, sombras,
   superficies translúcidas— se recalcula solo.

   Por eso añadir un tema son ~15 valores y no tocar una sola
   regla de CSS.

   `unlock: null` = disponible siempre.
   `unlock: {achievement, label}` = se gana leyendo (historia #80).
   ───────────────────────────────────────────────────────────── */

/** Tipografías por tema. Se cargan solo cuando el tema se aplica. */
export const FONT_SETS = {
  cinzel:     'Cinzel:wght@400;600;700',
  cormorant:  'Cormorant+Garamond:wght@400;600;700',
  spectral:   'Spectral:wght@300;400;600',
  fraunces:   'Fraunces:opsz,wght@9..144,400;9..144,600',
  karla:      'Karla:wght@400;500;700',
  patrick:    'Patrick+Hand',
  outfit:     'Outfit:wght@300;400;600',
  /* Fraunces con sus ejes propios: SOFT redondea los remates y WONK
     inclina la «g» y la «y». Sin eso es una serif más; con eso tiene
     mano. Es la diferencia entre usar una fuente y dibujar con ella. */
  frauncesWonk: 'Fraunces:opsz,wght,SOFT,WONK@9..144,400..700,40,1',
  literata:   'Literata:ital,opsz,wght@0,7..72,300..600;1,7..72,400',
  cinzelDeco: 'Cinzel+Decorative:wght@400;700',
  /* ── LA LETRA DE LA PORTADA ──────────────────────────────
     «Mi Biblioteca debería estar en letras más lindas o mágicas, más
      de cuento de hadas», con el rótulo de una película de dibujos
      como referencia. O sea: caligráfica con rúbrica, no una serif con
      adornos.

     Seis candidatas caligráficas comparadas sobre la tapa de verdad y
     en cuatro temas de los extremos —Berkshire Swash, Grand Hotel,
     Great Vibes, Yesteryear, MonteCarlo y esta—. Elegida por ella
     viéndolas puestas, que es la única forma de elegir una letra.

     Playball es una caligráfica ERGUIDA, no inclinada: tiene la
     rúbrica que pedía la referencia pero se apoya en una vertical, así
     que aguanta al lado de una serif de leer sin parecer que se ha
     colado de otra app. Es también la que mejor sostiene un nombre
     corto en grande, que es hacia donde va el nombre.

     Se descarga SOLO en la pantalla de acceso: dentro de la app no se
     usa en ningún sitio, así que quien ya entró no la paga. */
  playball: 'Playball',
  shippori:   'Shippori+Mincho:wght@400;600',
  mono:       'JetBrains+Mono:wght@400;500;700',
  inter:      'Inter:wght@300;400;500',
  /* Petrona tiene los remates blandos y la barriga ancha: es una serif
     de leer que no va de imprenta antigua, que es justo lo que separa
     a Manta de Pergamino cuando los dos son claros. */
  petrona:    'Petrona:opsz,wght@8..144,400;8..144,600',
};

/* ─────────────────────────────────────────────────────────────
   LAS TELAS DE UN LOMO

   Un libro sin portada se dibuja como su lomo, y a cada género le toca
   siempre la misma tela: así la estantería se lee de un vistazo aunque
   no distingas ningún título (ver src/lomo.js).

   Para que eso funcione las ocho tienen que distinguirse ENTRE SÍ y del
   fondo, en los once temas. Son ochenta y ocho telas: elegidas a mano una por
   una acaban pareciéndose sin que nadie lo note, y de hecho así pasó en
   el primer intento —cuatro pares con ΔE por debajo de 5—.

   Así que no se eligen: se derivan. Cada tema da los OCHO TONOS de su
   familia (los que le dan carácter: cueros en Grimorio, vino y negro en
   Gótico, tierras en Herbario) y una rampa de claridad. Los tonos dan
   la personalidad y la rampa garantiza la separación, porque cada tela
   es más clara que la anterior aunque el tono se repita.

   Se calcula en OKLCH porque es donde una diferencia igual de números
   se ve como una diferencia igual: en HSL, dos amarillos separados 40°
   se distinguen mucho menos que dos azules. `npm run test:contrast` lo
   comprueba con ΔE de verdad, no con contraste de claridad. */

const aSrgb = (c) => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
};

/** OKLCH → hexadecimal. L en 0..1, C croma, H en grados. */
function oklch(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ].map(aSrgb);
  return '#' + rgb.map((n) => n.toString(16).padStart(2, '0').toUpperCase()).join('');
}

/**
 * Las ocho telas de un tema, con su estampado, como tokens listos.
 *
 * Cada tela trae ADEMÁS el color con el que se estampa encima
 * (`--tela-N-tinta`), y no es siempre el mismo: en una tela oscura se
 * estampa en oro, y en una clara se estampa en oscuro. Eso no es un
 * apaño para pasar el contraste, es lo que se hace en una
 * encuadernación de verdad — y de paso hace que el título se lea en
 * las ocho, que es lo que comprueba `npm run test:contrast`.
 *
 * @param {number[]} tonos  ocho tonos en grados; los que dan carácter
 * @param {object} banda
 *   `l` la rampa de claridad de la primera tela a la octava
 *   `c` cuánto color tienen. A 0 salen ocho grises, que es lo que
 *       quieren Obsidiana y Máquina: ahí la tela sin color es la gracia
 *   `oro` con qué se estampa sobre las telas oscuras
 *   `tinta` con qué se estampa sobre las claras
 */
/* Luminancia relativa de WCAG, para decidir con cuál de los dos se lee
   mejor. Un umbral fijo de claridad no vale: el «oro» de Pergamino es
   casi marrón y el de Máquina es verde ácido, así que dónde está la
   frontera depende del metal de cada tema. */
const luminancia = (hexColor) => {
  const n = parseInt(hexColor.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* Mezclar dos colores en hexadecimal. Hace falta aquí y no en el CSS
   porque el relieve del título depende de con CUÁL de los dos metales
   se estampa esa tela, y eso solo se sabe en este punto. */
const mezclar = (hexA, hexB, t) => {
  const nA = parseInt(hexA.slice(1), 16);
  const nB = parseInt(hexB.slice(1), 16);
  const canal = (d) => {
    const a = (nA >> d) & 255;
    const b = (nB >> d) & 255;
    return Math.round(a * (1 - t) + b * t).toString(16).padStart(2, '0').toUpperCase();
  };
  return `#${canal(16)}${canal(8)}${canal(0)}`;
};

/* El margen sobre el mínimo. El título mide 56 px —texto grande para
   la norma, 3:1— y se deja un poco por encima: un relieve que aterriza
   justo en el límite se cae con el primer retoque de un tono. */
const RELIEVE_MIN = 3.2;

/**
 * El relieve más fuerte que una tela aguanta sin perder la letra.
 *
 * Se pide `maxT` de mezcla hacia `hacia` (blanco para iluminar, negro
 * para hundir) y se baja de dos en dos centésimas hasta que el color
 * resultante siga leyéndose sobre esa tela. Devuelve la tinta pura si
 * ni el escalón más pequeño cabe — sin relieve se lee, que es lo que
 * importa.
 */
function relieve(tintaUsada, tela, hacia, maxT) {
  for (let t = maxT; t > 0.001; t -= 0.02) {
    const c = mezclar(tintaUsada, hacia, t);
    if (contraste(c, tela) >= RELIEVE_MIN) return c;
  }
  return tintaUsada;
}

function telas(tonos, { l: [l0, l1], c, oro = '#E8D9AE', tinta = '#1A1512' }) {
  const salida = {};
  tonos.forEach((h, i) => {
    const luz = l0 + ((l1 - l0) * i) / (tonos.length - 1);
    const tela = oklch(luz, c, h);
    salida[`--tela-${i + 1}`] = tela;
    /* Se estampa con el que se lee: oro en las telas oscuras, tinta en
       las claras. Lo decide el contraste, no un número redondo. */
    const esOro = contraste(oro, tela) >= contraste(tinta, tela);
    const usada = esOro ? oro : tinta;
    salida[`--tela-${i + 1}-tinta`] = usada;

    /* ── EL RELIEVE DEL TÍTULO SIGUE A LA TINTA ──────────────
       El título de la portada va estampado, con un borde claro y otro
       oscuro para que coja la luz. Pero la dirección NO puede ser la
       misma en las ocho telas, y eso se descubrió midiendo:

         aclarar el borde superior un 45 %
         → en Ex Libris (tela oscura, oro)   7,0:1   se lee mejor
         → en Pergamino (tela clara, tinta)  1,0:1   DESAPARECE

       Y no es un ajuste de números: son dos relieves distintos. Sobre
       tela oscura el oro está EN RELIEVE y la luz le da arriba. Sobre
       tela clara la letra está HUNDIDA en el papel, y lo que se ve
       arriba es su sombra — más oscura, nunca más clara.

       Así que el alto y el bajo se calculan aquí, donde ya se sabe con
       qué metal se estampa. Y en la tela clara el borde de abajo se
       queda en la tinta pura: cualquier aclarado ahí se come el
       contraste que la propia tinta acaba de ganar. */
    /* Y CUÁNTO relieve lo decide CADA TELA, no un número global. Con
       una constante para las ochenta y ocho, la que menos margen tiene
       —el oro de Obsidiana llega justo a 3,8:1 contra su tela— marca el
       techo de todas, y aun así se colaba una: la tela 4 de un tema se
       quedaba en 2,93:1 mientras la 5 iba sobrada. Salió de la prueba,
       no de mirarlo.

       Así que se pide el relieve que se querría y se rebaja hasta que
       esa tela lo aguante. Las telas con margen lucen entero; las
       justas lucen lo que pueden; y ninguna baja del mínimo. Es la
       misma idea que ya ordena este fichero: derivar en vez de
       elegir a mano ochenta y ocho veces. */
    salida[`--tela-${i + 1}-alto`] = relieve(usada, tela, esOro ? '#FFFFFF' : '#000000', 0.42);
    salida[`--tela-${i + 1}-bajo`] = esOro ? relieve(usada, tela, '#000000', 0.26) : usada;
  });
  return salida;
}

export const THEMES = [
  /* ── EX LIBRIS · el aspecto de casa ──────────────────────────
     «Ex libris» es la marca que alguien pega dentro de su libro para
     decir que es suyo — «de los libros de…». La app se llama Library:
     no hay nombre más exacto para el tema con el que se entra, porque
     dice justo lo que la app hace con la tuya.

     De dónde sale cada color: NO del espacio, que es de donde salía
     el morado con estrellas. Sale de un libro encuadernado.

       tinta      el negro cálido de una estantería en penumbra
       cartón     la tapa
       tela       el lomo entelado
       burdeos    la etiqueta del lomo y la cinta de leer
       latón      el título estampado en caliente
       vitela     el papel viejo del canto

     El burdeos ocupa la ranura del acento primario y el latón la del
     realce, así que TODA la app cambia de material sin tocar una regla
     de CSS. Y sin brillos: aquí no hay nada que emita luz. Hay una
     lámpara fuera del encuadre y cosas que la reflejan. */
  {
    id: 'exlibris',
    name: 'Ex Libris',
    emoji: '🔖',
    blurb: 'Tinta, tela y latón. Una biblioteca de casa, de noche.',
    fonts: ['frauncesWonk', 'literata'],
    unlock: null,
    tokens: {
      /* Ex Libris · telas de encuadernar: burdeos, teja, ocre, oliva,
         bosque, pizarra, marino y ciruela. Van aquí y no solo en
         tokens.css porque los huecos de un tema los rellena Grimorio:
         sin declararlas, este saldría con los cueros del otro. */
      ...telas([25, 55, 85, 120, 155, 220, 265, 325], { l: [.30, .48], c: .085, oro: '#E8D2A0' }),
      '--void': '#12100E', '--void-rgb': '18 16 14',
      '--deep': '#1C1917', '--deep-rgb': '28 25 23',
      '--dusk': '#292420', '--dusk-rgb': '41 36 32',
      '--purple': '#7B2C36', '--purple-rgb': '123 44 54',
      '--violet': '#C0757C', '--violet-rgb': '192 117 124',
      '--lilac': '#D9C7A8', '--lilac-rgb': '217 199 168',
      '--gold': '#C9A24A', '--gold-rgb': '201 162 74',
      '--amber': '#A87C39', '--amber-rgb': '168 124 57',
      '--parchment': '#F2E9D5',
      '--text': '#EDE6DA', '--text-rgb': '237 230 218',

      '--font-display': "'Fraunces', Georgia, serif",
      '--font-body': "'Literata', Georgia, serif",
      '--display-spacing': '0',
      '--display-weight': '600',
      '--label-spacing': '1.6px',

      /* Casi rectas. Una tapa tiene esquinas, no burbujas. */
      '--card-radius': '4px', '--ctl-radius': '3px', '--chip-radius': '2px',
      '--pill-radius': '2px', '--rune-radius': '2px',
      '--sheet-radius': '10px 10px 0 0',

      /* Se apaga el cosmos entero: estrellas, orbes y rejilla. Lo que
         queda es grano de papel y una lámpara fuera del encuadre. */
      '--stars-opacity': '0', '--orbs-opacity': '0', '--grid-opacity': '0',
      '--glow-strength': '0',
      '--month-tint': '0%', '--rune-tint': '0%',
      '--bg-wash':
        'radial-gradient(ellipse 90% 55% at 50% -10%, rgb(201 162 74 / .10) 0%, transparent 62%),'
        + 'radial-gradient(ellipse 120% 80% at 50% 50%, #12100E 45%, #0B0A09 100%)',

      '--card-bg': 'rgb(28 25 23 / .92)',
      '--card-border': '1px solid rgb(217 199 168 / .14)',
      '--card-shadow': '0 1px 0 rgb(217 199 168 / .05), 0 10px 24px rgb(0 0 0 / .45)',
      '--card-shadow-hover': '0 1px 0 rgb(217 199 168 / .08), 0 16px 34px rgb(0 0 0 / .55)',
      '--card-edge': '1px',
      '--sheet-bg': '#1A1715',

      /* Grano de papel, no ruido de televisión: fino y muy tenue. */
      '--texture': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23g)'/%3E%3C/svg%3E")`,
      '--texture-opacity': '.055',
      '--texture-blend': 'soft-light',

      '--ornament': "''",
      '--rule-line': 'linear-gradient(90deg, rgb(201 162 74 / .35), rgb(217 199 168 / .10) 55%, transparent)',
      '--vignette': 'radial-gradient(ellipse 110% 80% at 50% 30%, transparent 45%, rgb(0 0 0 / .55) 100%)',
    },
  },

  {
    id: 'grimorio',
    name: 'Grimorio',
    emoji: '✨',
    blurb: 'Morado de fantasía, dorado y brillo mágico. El aspecto original.',
    fonts: ['cinzel', 'inter'],
    unlock: null,
    tokens: {
      /* Grimorio · el armario de libros de magia: cueros oscuros y
         pan de oro. Púrpura, índigo, granate, botella, cuero. */
      ...telas([300, 270, 15, 160, 65, 245, 330, 200], { l: [.28, .48], c: .095, oro: '#F0C060' }),
      '--void': '#0D0A1A', '--void-rgb': '13 10 26',
      '--deep': '#13102B', '--deep-rgb': '19 16 43',
      '--dusk': '#1E1840', '--dusk-rgb': '30 24 64',
      '--purple': '#6C3FC5', '--purple-rgb': '108 63 197',
      '--violet': '#9B6EE8', '--violet-rgb': '155 110 232',
      '--lilac': '#C4A8FF', '--lilac-rgb': '196 168 255',
      '--gold': '#F0C060', '--gold-rgb': '240 192 96',
      '--amber': '#D4943A', '--amber-rgb': '212 148 58',
      '--parchment': '#F5EDD8',
      '--text': '#EDE8F5', '--text-rgb': '237 232 245',
      '--font-display': "'Cinzel', Georgia, serif",
      '--font-body': "'Inter', system-ui, sans-serif",
      '--display-spacing': '1px',
      '--card-radius': '14px', '--ctl-radius': '10px', '--chip-radius': '8px',
      '--pill-radius': '20px', '--rune-radius': '8px',
      '--card-shadow': '0 2px 18px rgb(13 10 26 / .5)',
      '--texture': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='v'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23v)'/%3E%3C/svg%3E")`,
      '--texture-opacity': '.05',
      '--texture-blend': 'overlay',
      '--ornament': "'\\2726'",
      '--vignette': 'radial-gradient(ellipse 120% 90% at 50% 50%, transparent 55%, rgb(13 10 26 / .5) 100%)',
    },
  },

  {
    id: 'obsidiana',
    name: 'Obsidiana',
    emoji: '🌑',
    blurb: 'Negro puro, contraste alto y un dorado sobrio. Sin brillos.',
    fonts: ['cormorant', 'inter'],
    unlock: null,
    tokens: {
      /* Obsidiana · sin color, como todo lo demás en este tema: ocho
         claridades del casi negro al grafito. Y sin brillo en el filo,
         que es a lo que renuncia el tema entero. */
      ...telas([0, 0, 0, 0, 0, 0, 0, 0], { l: [.26, .58], c: 0, oro: '#D9B25A' }),
      '--lomo-luz': 'linear-gradient(90deg, rgb(0 0 0 / .4) 0 8%, transparent 40%, rgb(0 0 0 / .25) 100%)',
      '--lomo-radio': '0px',
      '--lomo-luz': 'linear-gradient(90deg, rgb(0 0 0 / .4) 0 8%, transparent 40%, rgb(0 0 0 / .25) 100%)',
      '--lomo-radio': '0px',
      '--month-tint': '0%', '--rune-tint': '0%',
      '--void': '#08080C', '--void-rgb': '8 8 12',
      '--deep': '#121218', '--deep-rgb': '18 18 24',
      '--dusk': '#1C1C26', '--dusk-rgb': '28 28 38',
      '--purple': '#3A3A4A', '--purple-rgb': '58 58 74',
      '--violet': '#8A8AA0', '--violet-rgb': '138 138 160',
      '--lilac': '#C8C8D8', '--lilac-rgb': '200 200 216',
      '--gold': '#D9B25A', '--gold-rgb': '217 178 90',
      '--amber': '#B08C3E', '--amber-rgb': '176 140 62',
      '--parchment': '#EDEDF2',
      '--text': '#F0F0F5', '--text-rgb': '240 240 245',
      '--font-display': "'Cormorant Garamond', Georgia, serif",
      '--font-body': "'Inter', system-ui, sans-serif",
      '--display-spacing': '.5px',
      '--display-weight': '600',
      '--stars-opacity': '0', '--orbs-opacity': '0', '--grid-opacity': '0',
      '--glow-strength': '.2',
      '--bg-wash': 'linear-gradient(180deg, #0C0C12 0%, #08080C 100%)',
      /* Sin curvas, sin bordes: la separación la hace el contraste. */
      '--card-radius': '0px', '--ctl-radius': '0px', '--chip-radius': '0px',
      '--pill-radius': '0px', '--rune-radius': '0px', '--sheet-radius': '0',
      '--card-border': 'none',
      '--hairline': '1px solid rgb(255 255 255 / .07)',
      '--card-bg': 'rgb(18 18 24 / .9)',
      '--card-shadow': '0 12px 32px rgb(0 0 0 / .65)',
      '--label-spacing': '3px',
      '--ornament': "''",
      '--rule-line': 'none',
    },
  },

  {
    id: 'pergamino',
    name: 'Pergamino',
    emoji: '☀️',
    blurb: 'Claro, papel envejecido y serif. Un modo día de verdad.',
    fonts: ['spectral'],
    unlock: null,
    tokens: {
      /* Pergamino · EL ÚNICO TEMA CLARO, y el único donde esto importa
         de verdad: un lomo oscuro sobre papel crema no es un libro, es
         un agujero. Telas de tono medio, las de una estantería vista a
         plena luz, y el canto de las hojas del color del propio papel
         —que es lo que pasa en un libro de verdad—. */
      ...telas([30, 62, 96, 140, 205, 250, 340, 15], { l: [.56, .72], c: .042, tinta: '#3A2F1E' }),
      /* El oro de este tema es casi marrón y sobre tela media no se ve:
         aquí el estampado es crema, como el pan de oro claro. */
      '--lomo-filete': '#3A2F1E',
      '--lomo-canto': '#FBF7EE',
      /* Sobre crema, un botón crema no es un botón. */
      '--fab-bg': '#6B5433', '--fab-color': '#F6EFDF', '--fab-borde': '#4A3A22',
      '--lomo-sombra': '0 2px 6px rgb(90 74 50 / .28)',
      '--lomo-filete': '#F6EFDF',
      '--lomo-canto': '#FBF7EE',
      '--lomo-sombra': '0 2px 6px rgb(90 74 50 / .3)',
      '--month-tint': '0%', '--rune-tint': '0%',
      '--void': '#F4EEE2', '--void-rgb': '244 238 226',
      '--deep': '#FBF7EE', '--deep-rgb': '251 247 238',
      '--dusk': '#EDE4D2', '--dusk-rgb': '237 228 210',
      '--purple': '#8A6A3C', '--purple-rgb': '138 106 60',
      '--violet': '#6B5433', '--violet-rgb': '107 84 51',
      '--lilac': '#5A4A32', '--lilac-rgb': '90 74 50',
      '--gold': '#7A5A1E', '--gold-rgb': '122 90 30',
      '--amber': '#9A6B22', '--amber-rgb': '154 107 34',
      '--parchment': '#3A2F1E',
      '--text': '#2A2318', '--text-rgb': '42 35 24',
      '--font-display': "'Spectral', Georgia, serif",
      '--font-body': "'Spectral', Georgia, serif",
      '--display-spacing': '0',
      '--stars-opacity': '0', '--orbs-opacity': '.3', '--grid-opacity': '0',
      '--glow-strength': '.1',
      '--bg-wash': 'radial-gradient(ellipse 130% 100% at 50% 0%, #FBF7EE 0%, #EFE6D5 100%)',
      '--card-radius': '0px', '--ctl-radius': '3px', '--chip-radius': '2px',
      '--pill-radius': '2px', '--rune-radius': '0px', '--sheet-radius': '2px 2px 0 0',
      '--card-bg': 'transparent',
      '--card-border': '0',
      '--card-shadow': 'none',
      '--texture': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.045' numOctaves='5'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23p)'/%3E%3C/svg%3E")`,
      '--texture-opacity': '.16',
      '--texture-blend': 'multiply',
      '--label-transform': 'none',
      '--label-spacing': '.5px',
      '--ornament': "'\\2767'",
      '--rule-line': 'linear-gradient(90deg, rgb(90 74 50 / .35), rgb(90 74 50 / .05))',
    },
  },

  {
    id: 'herbario',
    name: 'Herbario',
    emoji: '🌿',
    blurb: 'Verde botánico y tinta de cuaderno de campo.',
    fonts: ['fraunces', 'karla'],
    unlock: null,
    tokens: {
      /* Herbario · cuaderno de campo: hoja, musgo, tierra y otoño. */
      ...telas([155, 128, 100, 78, 55, 32, 195, 168], { l: [.28, .48], c: .080, oro: '#E0C070' }),
      '--month-tint': '22%', '--rune-tint': '70%',
      '--void': '#0B1410', '--void-rgb': '11 20 16',
      '--deep': '#12201A', '--deep-rgb': '18 32 26',
      '--dusk': '#1B2E24', '--dusk-rgb': '27 46 36',
      '--purple': '#2F6B4A', '--purple-rgb': '47 107 74',
      '--violet': '#5FA37B', '--violet-rgb': '95 163 123',
      '--lilac': '#A8D8BC', '--lilac-rgb': '168 216 188',
      '--gold': '#E0C070', '--gold-rgb': '224 192 112',
      '--amber': '#C09A48', '--amber-rgb': '192 154 72',
      '--parchment': '#EDF5EE',
      '--text': '#E6F2E9', '--text-rgb': '230 242 233',
      '--font-display': "'Fraunces', Georgia, serif",
      '--font-body': "'Karla', system-ui, sans-serif",
      '--display-spacing': '0',
      '--stars-opacity': '.2', '--orbs-opacity': '.6', '--grid-opacity': '0',
      '--bg-wash': 'radial-gradient(ellipse 90% 70% at 30% 15%, rgb(47 107 74 / .32) 0%, transparent 60%), linear-gradient(180deg, #12201A 0%, #0B1410 100%)',
      '--card-radius': '4px', '--ctl-radius': '4px', '--chip-radius': '3px',
      '--pill-radius': '3px', '--rune-radius': '3px',
      '--card-shadow': '0 1px 0 rgb(0 0 0 / .3)',
      '--texture': "linear-gradient(rgb(168 216 188 / .16) 1px, transparent 1px), linear-gradient(90deg, rgb(168 216 188 / .16) 1px, transparent 1px)",
      '--texture-size': '22px 22px',
      '--texture-opacity': '.5',
      '--label-spacing': '1.5px',
      '--ornament': "'\\2766'",
    },
  },

  {
    id: 'marea',
    name: 'Marea',
    emoji: '🌊',
    blurb: 'Azules profundos y tipografía limpia. Sereno.',
    fonts: ['outfit', 'inter'],
    unlock: null,
    tokens: {
      /* Marea · lo que hay bajo el agua: índigo, petróleo, verdemar. */
      ...telas([255, 232, 210, 190, 170, 275, 245, 220], { l: [.28, .50], c: .080, oro: '#EFD9A0' }),
      '--month-tint': '12%', '--rune-tint': '55%',
      '--void': '#08131F', '--void-rgb': '8 19 31',
      '--deep': '#0F1F31', '--deep-rgb': '15 31 49',
      '--dusk': '#173047', '--dusk-rgb': '23 48 71',
      '--purple': '#1E5C8A', '--purple-rgb': '30 92 138',
      '--violet': '#4E9BC9', '--violet-rgb': '78 155 201',
      '--lilac': '#9FD2EC', '--lilac-rgb': '159 210 236',
      '--gold': '#EFD9A0', '--gold-rgb': '239 217 160',
      '--amber': '#C9A96A', '--amber-rgb': '201 169 106',
      '--parchment': '#EAF4FA',
      '--text': '#E4F1F8', '--text-rgb': '228 241 248',
      '--font-display': "'Outfit', system-ui, sans-serif",
      '--font-body': "'Inter', system-ui, sans-serif",
      '--display-spacing': '.5px',
      '--stars-opacity': '0',
      '--bg-wash': 'radial-gradient(ellipse 110% 80% at 50% 100%, rgb(30 92 138 / .4) 0%, transparent 65%), linear-gradient(180deg, #0F1F31 0%, #08131F 100%)',
      /* Todo flota: curvas amplias, sin bordes, sombra difusa. */
      '--card-radius': '22px', '--ctl-radius': '18px', '--chip-radius': '14px',
      '--pill-radius': '22px', '--rune-radius': '50%', '--sheet-radius': '30px 30px 0 0',
      '--card-border': '0',
      '--hairline': '1px solid rgb(159 210 236 / .1)',
      '--card-bg': 'rgb(23 48 71 / .45)',
      '--card-shadow': '0 10px 34px rgb(4 12 22 / .55)',
      '--label-spacing': '2.5px',
      '--ornament': "'\\223F'",
    },
  },

  {
    id: 'gotico',
    name: 'Gótico',
    emoji: '🕯️',
    blurb: 'Rojo vino y negro. Para octubre y el bloque de terror.',
    fonts: ['cinzelDeco', 'inter'],
    unlock: { achievement: 'octubre-terror', label: 'Termina un mes de Terror / Misterio' },
    tokens: {
      /* Gótico · vino y negro, con un botella muy oscuro al fondo. */
      ...telas([8, 350, 330, 312, 25, 40, 358, 340], { l: [.24, .50], c: .085, oro: '#E4C27E' }),
      '--month-tint': '14%', '--rune-tint': '45%',
      '--void': '#100708', '--void-rgb': '16 7 8',
      '--deep': '#1C0C0F', '--deep-rgb': '28 12 15',
      '--dusk': '#2B1216', '--dusk-rgb': '43 18 22',
      '--purple': '#7A1F2B', '--purple-rgb': '122 31 43',
      '--violet': '#B84756', '--violet-rgb': '184 71 86',
      '--lilac': '#E8A8B0', '--lilac-rgb': '232 168 176',
      '--gold': '#D9A441', '--gold-rgb': '217 164 65',
      '--amber': '#A87A2E', '--amber-rgb': '168 122 46',
      '--parchment': '#F2E4E0',
      '--text': '#F2E2E4', '--text-rgb': '242 226 228',
      '--font-display': "'Cinzel Decorative', Georgia, serif",
      '--font-body': "'Inter', system-ui, sans-serif",
      '--display-spacing': '1.5px',
      '--stars-opacity': '.15', '--orbs-opacity': '.7', '--grid-opacity': '0',
      '--bg-wash': 'radial-gradient(ellipse 70% 50% at 50% -5%, rgb(217 164 65 / .16) 0%, transparent 55%), radial-gradient(ellipse 90% 70% at 50% 20%, rgb(122 31 43 / .4) 0%, transparent 65%), linear-gradient(180deg, #1C0C0F 0%, #100708 100%)',
      '--card-radius': '16px 16px 4px 4px', '--ctl-radius': '10px 10px 3px 3px',
      '--chip-radius': '3px', '--pill-radius': '14px', '--rune-radius': '50% 50% 3px 3px',
      '--card-shadow': '0 6px 26px rgb(0 0 0 / .55)',
      '--texture': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='v'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23v)'/%3E%3C/svg%3E")`,
      '--texture-opacity': '.07',
      '--texture-blend': 'overlay',
      '--ornament': "'\\2020'",
      '--vignette': 'radial-gradient(ellipse 100% 80% at 50% 40%, transparent 40%, rgb(16 7 8 / .75) 100%)',
    },
  },

  {
    id: 'sakura',
    name: 'Sakura',
    emoji: '🌸',
    blurb: 'Rosas suaves y aire. Para el bloque de literatura oriental.',
    fonts: ['shippori', 'inter'],
    unlock: { achievement: 'bloque-oriental', label: 'Termina 4 libros de Oriente / Espiritualidad' },
    tokens: {
      /* Sakura · seda teñida: rosas apagados, ciruela y gris paloma. */
      ...telas([350, 322, 296, 270, 28, 2, 245, 310], { l: [.29, .55], c: .072, oro: '#EFCFA8' }),
      '--month-tint': '0%', '--rune-tint': '30%',
      '--void': '#1A1016', '--void-rgb': '26 16 22',
      '--deep': '#261821', '--deep-rgb': '38 24 33',
      '--dusk': '#38242F', '--dusk-rgb': '56 36 47',
      '--purple': '#8C4A66', '--purple-rgb': '140 74 102',
      '--violet': '#C9829B', '--violet-rgb': '201 130 155',
      '--lilac': '#F2C4D2', '--lilac-rgb': '242 196 210',
      '--gold': '#EFCFA8', '--gold-rgb': '239 207 168',
      '--amber': '#C9A47E', '--amber-rgb': '201 164 126',
      '--parchment': '#FBEEF2',
      '--text': '#F8E8EE', '--text-rgb': '248 232 238',
      '--font-display': "'Shippori Mincho', Georgia, serif",
      '--font-body': "'Inter', system-ui, sans-serif",
      '--display-spacing': '3px',
      '--stars-opacity': '.35', '--orbs-opacity': '.5', '--grid-opacity': '0',
      '--bg-wash': 'radial-gradient(ellipse 80% 55% at 75% 8%, rgb(201 130 155 / .28) 0%, transparent 60%), linear-gradient(180deg, #261821 0%, #1A1016 100%)',
      /* Separa el vacío, no la línea. */
      '--card-radius': '2px', '--ctl-radius': '2px', '--chip-radius': '2px',
      '--pill-radius': '2px', '--rune-radius': '50%', '--sheet-radius': '2px 2px 0 0',
      '--card-border': '0',
      '--hairline': '1px solid rgb(242 196 210 / .12)',
      '--card-shadow': 'none',
      '--label-transform': 'none',
      '--label-spacing': '4px',
      '--ornament': "''",
      '--rule-line': 'none',
    },
  },

  {
    id: 'principito',
    name: 'El Principito',
    emoji: '🌾',
    blurb: 'El desierto al anochecer, con el oro del trigo. Acuarela y letra a mano.',
    fonts: ['patrick', 'karla'],
    unlock: null,
    tokens: {
      /* El Principito · la acuarela del desierto al anochecer: arena,
         terracota, salvia y el azul de la noche que ya viene. */
      ...telas([50, 78, 112, 152, 252, 280, 12, 30], { l: [.32, .54], c: .085, oro: '#EBC96B' }),
      '--month-tint': '10%', '--rune-tint': '40%',
      '--void': '#17203A', '--void-rgb': '23 32 58',
      '--deep': '#1F2A47', '--deep-rgb': '31 42 71',
      '--dusk': '#2A3760', '--dusk-rgb': '42 55 96',
      '--purple': '#4A6BA8', '--purple-rgb': '74 107 168',
      '--violet': '#7FA3D4', '--violet-rgb': '127 163 212',
      '--lilac': '#C9DAF2', '--lilac-rgb': '201 218 242',
      /* El oro es el del trigo: «Los trigales me recordarán a ti». */
      '--gold': '#EBC96B', '--gold-rgb': '235 201 107',
      '--amber': '#D49A54', '--amber-rgb': '212 154 84',
      '--parchment': '#FAF3E2',
      /* Texto cálido, no azulado: la página debe sentirse de papel
         aunque el cielo sea de noche. */
      '--text': '#F2ECE0', '--text-rgb': '242 236 224',
      '--font-display': "'Patrick Hand', 'Bradley Hand', cursive",
      '--font-body': "'Karla', system-ui, sans-serif",
      '--display-spacing': '.3px',
      '--label-transform': 'none',
      '--label-spacing': '1.5px',
      /* Esquinas desiguales: dibujadas a mano, no impresas. */
      '--card-radius': '18px 22px 19px 24px',
      '--ctl-radius': '14px 11px 15px 12px',
      '--chip-radius': '9px 7px 10px 8px',
      '--pill-radius': '20px',
      '--rune-radius': '50%',
      '--sheet-radius': '26px 30px 0 0',
      '--card-border': '0',
      '--hairline': '1px solid rgb(201 218 242 / .14)',
      '--card-bg': 'rgb(31 42 71 / .58)',
      '--card-shadow': '0 6px 22px rgb(10 14 28 / .45)',
      '--role-short': '#E4868C',
      '--stars-opacity': '.75',
      '--orbs-opacity': '.5',
      '--grid-opacity': '0',
      '--texture': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.045' numOctaves='5'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23p)'/%3E%3C/svg%3E")`,
      '--texture-opacity': '.09',
      '--texture-blend': 'soft-light',
      '--ornament': "'\\2727'",
      '--bg-wash': 'radial-gradient(ellipse 120% 60% at 50% 108%, rgb(212 154 84 / .38) 0%, transparent 55%), linear-gradient(180deg, #141C33 0%, #1F2A47 62%, #2C3557 100%)',
      /* LA FIRMA · el horizonte. La arena tibia subiendo desde el
         borde inferior: el desierto donde se estrelló el aviador. */
      '--vignette': 'linear-gradient(0deg, rgb(212 154 84 / .3) 0%, rgb(235 201 107 / .1) 11%, transparent 28%), radial-gradient(ellipse 110% 85% at 50% 45%, transparent 58%, rgb(15 20 38 / .55) 100%)',
    },
  },
  {
    id: 'maquina',
    name: 'Máquina',
    emoji: '🖨️',
    blurb: 'Monoespaciada, brutalista, sin adornos. Solo los datos.',
    fonts: ['mono'],
    unlock: null,
    tokens: {
      /* Máquina · aquí no hay tela ni pan de oro: bloques planos de
         gris con una etiqueta. El brutalismo del tema se aplica también
         a los libros, o deja de ser el mismo tema. */
      ...telas([0, 0, 0, 0, 0, 0, 0, 0], { l: [.28, .66], c: 0, oro: '#B9E36C', tinta: '#0E0E0E' }),
      '--lomo-luz': 'none',
      '--lomo-sombra': 'none',
      '--lomo-radio': '0px',
      '--lomo-filete': '#B9E36C',
      '--lomo-canto': '#7A7A7A',
      '--lomo-luz': 'none',
      '--lomo-sombra': 'none',
      '--lomo-radio': '0px',
      '--lomo-filete': '#B9E36C',
      '--lomo-canto': '#7A7A7A',
      '--month-tint': '0%', '--rune-tint': '0%',
      '--void': '#0E0E0E', '--void-rgb': '14 14 14',
      '--deep': '#161616', '--deep-rgb': '22 22 22',
      '--dusk': '#202020', '--dusk-rgb': '32 32 32',
      '--purple': '#2E2E2E', '--purple-rgb': '46 46 46',
      '--violet': '#7A7A7A', '--violet-rgb': '122 122 122',
      '--lilac': '#C4C4C4', '--lilac-rgb': '196 196 196',
      '--gold': '#B9E36C', '--gold-rgb': '185 227 108',
      '--amber': '#8FB84E', '--amber-rgb': '143 184 78',
      '--parchment': '#EFEFEF',
      '--text': '#EDEDED', '--text-rgb': '237 237 237',
      '--font-display': "'JetBrains Mono', ui-monospace, monospace",
      '--font-body': "'JetBrains Mono', ui-monospace, monospace",
      '--display-spacing': '0',
      '--display-transform': 'uppercase',
      '--display-weight': '700',
      '--stars-opacity': '0', '--orbs-opacity': '0', '--grid-opacity': '0',
      '--glow-strength': '0',
      '--bg-wash': '#0E0E0E',
      '--card-radius': '0px', '--ctl-radius': '0px', '--chip-radius': '0px',
      '--pill-radius': '0px', '--rune-radius': '0px', '--sheet-radius': '0',
      '--card-border': '1px solid rgb(196 196 196 / .22)',
      '--hairline': '1px solid rgb(196 196 196 / .22)',
      '--card-bg': '#161616',
      '--card-shadow': 'none',
      '--texture': "repeating-linear-gradient(180deg, rgb(185 227 108 / .05) 0 1px, transparent 1px 3px)",
      '--texture-opacity': '.9',
      '--label-spacing': '3px',
      '--ornament': "''",
      '--ornament-color': 'var(--gold)',
      '--rule-line': 'repeating-linear-gradient(90deg, rgb(196 196 196 / .3) 0 4px, transparent 4px 8px)',
    },
  },
  {
    id: 'manta',
    name: 'Manta',
    emoji: '🧶',
    blurb: 'Lana, cojines y tarde de domingo. El modo sepia.',
    fonts: ['petrona', 'karla'],
    unlock: null,
    tokens: {
      /* Manta · EL SEGUNDO TEMA CLARO, y por eso lo primero que hubo que
         decidir es en qué NO se parece a Pergamino. Pergamino es papel
         e imprenta: crema neutro, esquinas rectas, remates de tipógrafo.
         Manta es lana: crema dorado, todo redondo, remates blandos.
         Puestos uno al lado del otro no se confunden.

         LA PALETA SALE MEDIDA DE LA LÁMINA, no elegida a ojo. El fondo
         es el suyo exacto —#F6D4A1, que ocupa la mitad del cuadro— para
         que la escena no enseñe la costura donde termina.

         Y OJO CON LO QUE SE VE EN LA LÁMINA: el cojín que parece azul
         mide #8F8172, un gris tibio, y el jersey que parece verde mide
         #726246, un oliva. Los lee así el ojo porque están rodeados de
         naranja —contraste simultáneo—, y copiados aquí, sin ese
         alrededor, serían barro. Los tonos fríos de las telas están
         llevados al frío a propósito; no son un muestreo. */
      /* PASTEL NO, Y EL ORDEN IMPORTA. La rampa reparte la claridad de
         la primera tela a la octava, así que el tono que se ponga al
         final SIEMPRE sale el más claro. Con los fríos al final salían
         lavanda y celeste, que en un tema de lana se leen como
         caramelo. Puestos al principio, los mismos tonos salen pizarra
         e índigo, y los cálidos se quedan la parte clara: ladrillo,
         óxido, mostaza y trigo. Es un cesto de ovillos, que es lo que
         hay en la lámina. */
      ...telas([205, 268, 138, 350, 30, 52, 75, 100],
        { l: [.50, .70], c: .072, oro: '#F7E4C0', tinta: '#33240F' }),
      /* Como en Pergamino: sobre tela media el oro de este tema es casi
         marrón y desaparece, así que el estampado por defecto es crema. */
      '--lomo-filete': '#FCF2DE',
      '--lomo-canto': '#FDF6E6',
      '--lomo-sombra': '0 2px 7px rgb(120 84 44 / .3)',
      '--lomo-radio': '3px',
      /* Sobre crema dorado, un botón crema no es un botón. */
      '--fab-bg': '#A8542C', '--fab-color': '#FDF3E2', '--fab-borde': '#7E3C1D',
      '--month-tint': '0%', '--rune-tint': '0%',
      '--void': '#F6D4A1', '--void-rgb': '246 212 161',
      '--deep': '#FDF1DC', '--deep-rgb': '253 241 220',
      '--dusk': '#F0CD94', '--dusk-rgb': '240 205 148',
      '--purple': '#8A6C43', '--purple-rgb': '138 108 67',
      '--violet': '#6E5636', '--violet-rgb': '110 86 54',
      '--lilac': '#5A462C', '--lilac-rgb': '90 70 44',
      '--gold': '#8E4320', '--gold-rgb': '142 67 32',
      '--amber': '#A85E18', '--amber-rgb': '168 94 24',
      '--parchment': '#3A2A16',
      '--text': '#2A1D0B', '--text-rgb': '42 29 11',
      '--font-display': "'Petrona', Georgia, serif",
      '--font-body': "'Karla', system-ui, sans-serif",
      '--display-spacing': '0',
      '--stars-opacity': '0', '--orbs-opacity': '.32', '--grid-opacity': '0',
      '--glow-strength': '.12',
      '--bg-wash': 'radial-gradient(ellipse 130% 100% at 50% 0%, #FDF1DC 0%, #F6D4A1 100%)',
      /* Todo redondo. Es lo que separa «un animalito» de «un animal
         dibujado en pequeño», y aquí lo mismo: las esquinas duras se
         leen como oficina. */
      '--card-radius': '18px', '--ctl-radius': '13px', '--chip-radius': '999px',
      '--pill-radius': '999px', '--rune-radius': '999px', '--sheet-radius': '22px 22px 0 0',
      '--card-bg': 'rgb(253 241 220 / .78)',
      '--card-border': '1px solid rgb(160 120 70 / .28)',
      '--hairline': '1px solid rgb(160 120 70 / .22)',
      '--card-shadow': '0 2px 10px rgb(150 100 55 / .12)',
      '--texture': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23p)'/%3E%3C/svg%3E")`,
      '--texture-opacity': '.13',
      '--texture-blend': 'multiply',
      '--label-transform': 'none',
      '--label-spacing': '.4px',
      /* El corazón de la taza. Sale de la lámina, no del catálogo. */
      '--ornament': "'\\2765'",
      '--rule-line': 'linear-gradient(90deg, rgb(142 67 32 / .32), rgb(142 67 32 / .04))',
      '--vignette': 'radial-gradient(ellipse 115% 90% at 50% 40%, transparent 62%, rgb(150 100 55 / .16) 100%)',
    },
  },
];

/** Con el que se entra si nunca has elegido. */
export const DEFAULT_THEME = 'exlibris';

/* Y el que rellena los huecos de los demás. NO es el mismo: un tema
   escribe solo lo que cambia, y todos los que existían se escribieron
   contando con que lo que faltara lo pusiera Grimorio. Cambiar esta
   constante al tema nuevo repintaría los ocho de golpe. */
export const BASE_THEME = 'grimorio';
export const byId = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
