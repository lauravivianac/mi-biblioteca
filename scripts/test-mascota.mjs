/* ─────────────────────────────────────────────────────────────
   LO QUE DICE LA MASCOTA, ¿VIENE A CUENTO?

     npm run test:mascota

   POR QUÉ EXISTE. «Las frases no tienen nada que ver, sale cualquier
   cosa». Y era verdad, por tres motivos que no se ven leyendo el
   código — solo poniendo fechas y mirando qué sale:

     1. Felicitaba por el LIBRO EQUIVOCADO. El estado preguntaba «¿hubo
        algún final?» con un `.some()`, que devuelve un sí/no, y luego
        la frase se quedaba con el libro EN CURSO. Terminabas «Cien
        años de soledad», seguías con «El Quijote», y decía
        «¡Terminaste El Quijote!». El número de páginas, igual.

     2. Celebraba dos días pasara lo que pasara. Terminabas un libro,
        leías doscientas páginas de otro, y ella seguía con el final de
        anteayer en vez de con lo que tenías entre manos.

     3. Y la frase SE VOLVÍA A SORTEAR EN CADA REPINTADO. La mascota se
        repinta en cada refresco —al marcar un libro, al cambiar un
        filtro, al abrir y cerrar una hoja—, así que cambiaba de frase
        cada vez que tocabas cualquier cosa. Ese es el fallo de fondo:
        no es que la frase fuera falsa, es que no guardaba ninguna
        relación con lo que acababa de ocurrir.

   Las tres son de cuenta, así que la cuenta vive aparte (`pet-core.js`)
   y esto la comprueba.
   ───────────────────────────────────────────────────────────── */

import { readFileSync } from 'node:fs';
import {
  estadoMascota, fraseMascota, fraseDeFallo, avisoDelDia, librosEnCurso, FRASES, DIA,
} from '../src/pet-core.js';

let bien = 0;
let mal = 0;
const comprobar = (nombre, ok, detalle = '') => {
  if (ok) { bien += 1; console.log(`  ✓ ${nombre}`); } else {
    mal += 1;
    console.log(`  ✗ ${nombre}${detalle ? `\n      ${detalle}` : ''}`);
  }
};

const AHORA = Date.UTC(2026, 8, 7, 12);
const libro = (o) => ({
  id: o.id, title: o.title, total: o.total ?? 300, page: o.page ?? 0,
  status: o.status ?? 'pending', pct: o.pct ?? 0,
  lastReadAt: o.lastReadAt ?? 0, finishedAt: o.finishedAt ?? 0,
});

/* ── 1 · EL LIBRO DEL QUE HABLA ──────────────────────────────── */

console.log('\n─── DE QUÉ LIBRO HABLA ───');

{
  /* El caso exacto que fallaba: uno terminado ayer, otro en curso que
     NO se ha tocado desde entonces. */
  const libros = [
    libro({ id: 'cien', title: 'Cien años de soledad', total: 471, finishedAt: AHORA - 1 * DIA, status: 'read' }),
    libro({ id: 'quij', title: 'El Quijote', total: 900, status: 'reading', page: 40, lastReadAt: AHORA - 3 * DIA }),
  ];
  const e = estadoMascota(libros, AHORA);
  comprobar('celebra el libro que TERMINASTE, no el que estás leyendo',
    e.mood === 'celebrando' && e.libro.id === 'cien',
    `salió mood=${e.mood} libro=${e.libro?.id}`);

  const f = fraseMascota({ ...e }, { ahora: AHORA });
  comprobar('y la frase no nombra el otro libro',
    !f.includes('Quijote'), f);
  comprobar('las páginas que cuenta son las del libro terminado',
    !f.includes('900'), f);
}

{
  /* Terminado ayer, pero HOY has leído otra cosa: la noticia es esa. */
  const libros = [
    libro({ id: 'cien', title: 'Cien años de soledad', finishedAt: AHORA - 1 * DIA, status: 'read' }),
    libro({ id: 'quij', title: 'El Quijote', status: 'reading', page: 240, pct: 27, lastReadAt: AHORA - 2 * 3600e3 }),
  ];
  const e = estadoMascota(libros, AHORA);
  comprobar('si después de terminar volviste a leer, habla de lo que lees',
    e.mood === 'leyendo' && e.libro.id === 'quij',
    `salió mood=${e.mood} libro=${e.libro?.id}`);
}

{
  const libros = [libro({ id: 'x', title: 'Algo', finishedAt: AHORA - 5 * DIA, status: 'read', lastReadAt: AHORA - 5 * DIA })];
  const e = estadoMascota(libros, AHORA);
  comprobar('pasados dos días ya no celebra', e.mood !== 'celebrando', `salió ${e.mood}`);
}

/* ── 2 · SIN LIBRO NO SE INVENTA UNO ─────────────────────────── */

console.log('\n─── SIN LIBRO ───');

{
  const e = estadoMascota([], AHORA);
  const f = fraseMascota(e, { ahora: AHORA });
  comprobar('una biblioteca vacía no produce «tu libro»', !f.includes('tu libro'), f);
  comprobar('ni un hueco sin rellenar', !/\{\w+\}/.test(f), f);
}

{
  /* Terminado hace un rato y nada en curso: felicita, pero sin
     inventarse un título genérico. */
  const libros = [libro({ id: 'x', title: 'Rayuela', total: 600, finishedAt: AHORA - 3600e3, status: 'read' })];
  const f = fraseMascota(estadoMascota(libros, AHORA), { ahora: AHORA });
  comprobar('celebra con el título de verdad', f.includes('Rayuela') || f.includes('600') || f.includes('pila'), f);
  comprobar('y nunca con «tu libro»', !f.includes('tu libro'), f);
}

/* ── 3 · LA FRASE NO CAMBIA SI NO CAMBIA NADA ────────────────── */

console.log('\n─── ESTABILIDAD · el fallo de fondo ───');

{
  const libros = [libro({ id: 'q', title: 'El Quijote', total: 900, status: 'reading', page: 240, pct: 27, lastReadAt: AHORA - 3600e3 })];
  const e = estadoMascota(libros, AHORA);
  const veces = Array.from({ length: 40 }, () => fraseMascota(e, { ahora: AHORA }));
  comprobar('cuarenta repintados seguidos dicen LO MISMO',
    new Set(veces).size === 1, `salieron ${new Set(veces).size} frases distintas`);
}

{
  /* Y cuando pasa algo de verdad —avanzas páginas— sí cambia. */
  const base = { id: 'q', title: 'El Quijote', total: 900, status: 'reading', pct: 27, lastReadAt: AHORA - 3600e3 };
  const dichas = new Set();
  for (const page of [10, 120, 240, 360, 480, 600, 720]) {
    dichas.add(fraseMascota(estadoMascota([libro({ ...base, page })], AHORA), { ahora: AHORA }));
  }
  comprobar('avanzar en el libro sí le cambia lo que dice',
    dichas.size > 1, `siempre la misma: ${[...dichas][0]}`);
}

/* ── 4 · LOS ÁNIMOS SE ELIGEN CUANDO TOCA ────────────────────── */

console.log('\n─── CUÁNDO TOCA CADA ÁNIMO ───');

const soloLeyendo = (page, pct, hace) => estadoMascota(
  [libro({ id: 'a', title: 'Un libro', total: 300, status: 'reading', page, pct, lastReadAt: AHORA - hace })],
  AHORA,
);

comprobar('leyendo hoy → leyendo', soloLeyendo(100, 33, 3600e3).mood === 'leyendo');
comprobar('al 90 % → expectante', soloLeyendo(270, 90, 3600e3).mood === 'expectante');
comprobar('cuatro días sin abrir → dormida', soloLeyendo(100, 33, 4 * DIA).mood === 'dormida');
comprobar('nunca has leído nada → dormida, no «leyendo»',
  estadoMascota([libro({ id: 'a', title: 'Un libro' })], AHORA).mood === 'dormida');

{
  const e = soloLeyendo(100, 33, 2 * DIA);
  const f = fraseMascota(e, { ahora: AHORA });
  comprobar('dos días parada en el mismo sitio → lo dice',
    e.mood === 'leyendo' && /días|esperando|corre/.test(f), `${e.mood} · ${f}`);
}

/* ── 5 · NUNCA CASTIGA ───────────────────────────────────────── */

console.log('\n─── EL LÍMITE QUE NO SE CRUZA ───');

{
  /* Al añadir las dos preguntas, este es el sitio donde un reproche se
     cuela sin querer: «llevas dos meses con esto», «todavía no lo has
     terminado», «vas tarde». Así que la lista crece con ellas. */
  const REPROCHE = /abandon|olvid|culpa|deberías|nunca lees|mal|perezos|vago/i;
  const RECLAMO = /vas tarde|con retraso|atrasad|todavía no|aún no|sigues sin|llevas \d+ mes/i;
  const todas = [];
  for (const dias of [0, 1, 2, 3, 4, 10, 60]) {
    for (const page of [0, 50, 150, 290]) {
      todas.push(fraseMascota(soloLeyendo(page, Math.round((page / 300) * 100), dias * DIA), { ahora: AHORA }));
    }
  }
  todas.push(fraseMascota(estadoMascota([], AHORA), { ahora: AHORA }));

  /* Las dos cestas nuevas, enteras: no una frase al azar de cada una,
     sino todas — el reproche se cuela en la tercera, no en la primera. */
  const conMes = { title: 'Mi Historia', mes: 'Agosto', total: 426, page: 0 };
  for (const mood of ['preguntando', 'rescatando']) {
    for (let i = 0; i < FRASES[mood].length; i += 1) {
      todas.push(FRASES[mood][i]
        .replace('{libro}', conMes.title)
        .replace('{mes}', conMes.mes.toLowerCase()));
    }
  }

  const reproches = todas.filter((f) => REPROCHE.test(f) || RECLAMO.test(f));
  comprobar('ninguna frase reprocha ni pasa factura, en ningún estado',
    reproches.length === 0, reproches.join(' · '));

  /* Y la puerta de salida tiene que estar escrita, no sobreentendida:
     si ninguna frase de rescate admite soltar el libro, la pregunta
     solo tiene una respuesta digna y deja de ser una pregunta. */
  comprobar('alguna frase de rescate ofrece dejarlo ir, no solo retomarlo',
    FRASES.rescatando.some((f) => /dejarlo ir|qué hacemos/i.test(f)));
}

/* ── 5 bis · «EMPEZADO» NO ES «LEYENDO» ──────────────────────

   «¿Por qué dice que está leyendo Canción de Navidad conmigo? Yo no
   estoy leyendo ese libro.»

   Y no lo estaba: `readNow()` —el «¡A leer!» de un toque, el ganador
   de un duelo, el libro que sigue al que acabas de terminar— marca
   `reading` con la página a cero y sin ninguna lectura apuntada. La
   mascota lo tomaba por el libro en curso y lo anunciaba en la
   cabecera del chat, además de mandárselo al agente como el asunto de
   la conversación. */

console.log('\n─── LO QUE DICE QUE ESTÁS LEYENDO ───');

{
  const empezado = (id, title) => ({
    id, title, total: 300, page: 0, status: 'reading', pct: 0, lastReadAt: 0, finishedAt: 0,
  });

  const e = estadoMascota([empezado('nav', 'Canción de Navidad'), empezado('qui', 'El Quijote')], AHORA);
  comprobar('un libro solo marcado, sin una página leída, no es «en curso»',
    e.libro === null, e.libro?.title);
  comprobar('y no se inventa que lo lees contigo',
    !/leyendo/.test(e.mood), e.mood);

  /* La misma lista con una página leída en el segundo: ese sí. */
  const conLectura = [
    empezado('nav', 'Canción de Navidad'),
    { ...empezado('qui', 'El Quijote'), page: 40, pct: 13, lastReadAt: AHORA - DIA },
  ];
  const f = estadoMascota(conLectura, AHORA);
  comprobar('con una página leída, nombra ESE y no el que iba primero',
    f.libro?.id === 'qui', f.libro?.title);

  /* El que abrió el caso: dormida y afirmando que lees, a la vez. */
  comprobar('nunca dice el ánimo «dormida» con un libro en curso a cuestas',
    !(e.mood === 'dormida' && e.libro));
}

/* ── 5 ter · LAS DOS PREGUNTAS  ·  historia #45 ──────────────

   «Si pasó el mes y no leyó el libro, ver si lo quiere sacar; o en el
   mes, pedirle que actualice. La mascota debería hablar con la
   persona.»

   Lo importante que se prueba aquí no es que pregunte: es CUÁNDO se
   calla. Una compañera que pregunta siempre es un jefe. */

console.log('\n─── CUÁNDO PREGUNTA, Y CUÁNDO SE CALLA ───');

{
  const leyendoDesde = (dias, extra = {}) => ({
    id: 'a', title: 'Bartleby', total: 300, page: 80, status: 'reading', pct: 27,
    lastReadAt: AHORA - dias * DIA, finishedAt: 0, ...extra,
  });

  comprobar('un libro empezado y callado cinco días → pregunta por él',
    estadoMascota([leyendoDesde(5)], AHORA).mood === 'preguntando');
  comprobar('a los cuatro días todavía no pregunta',
    estadoMascota([leyendoDesde(4)], AHORA).mood !== 'preguntando',
    estadoMascota([leyendoDesde(4)], AHORA).mood);
  comprobar('y nunca pregunta por uno que jamás se abrió',
    estadoMascota([leyendoDesde(9, { page: 0, lastReadAt: 0 })], AHORA).mood !== 'preguntando');
  comprobar('ni interrumpe cuando ya casi lo terminas',
    estadoMascota([leyendoDesde(9, { page: 280, pct: 93 })], AHORA).mood === 'expectante');

  /* El rescate: se le pasó el mes. */
  const atrasado = {
    id: 'z', title: 'Mi Historia', total: 426, page: 0, status: 'reading', pct: 0,
    lastReadAt: 0, finishedAt: 0, mes: 'Agosto', atrasadoMeses: 1,
  };
  const r = estadoMascota([atrasado], AHORA);
  comprobar('un libro al que se le pasó el mes → lo saca a colación',
    r.mood === 'rescatando', r.mood);
  comprobar('y la frase nombra el mes en el que se quedó',
    /agosto/i.test(fraseMascota(r, { ahora: AHORA })), fraseMascota(r, { ahora: AHORA }));

  /* LA REGLA QUE MÁS IMPORTA: no cortar una racha buena. */
  const conRacha = [atrasado, {
    id: 'b', title: 'La Conjura', total: 405, page: 120, status: 'reading', pct: 30,
    lastReadAt: AHORA - DIA, finishedAt: 0,
  }];
  comprobar('si leíste ayer, NO te saca el libro viejo',
    estadoMascota(conRacha, AHORA).mood === 'leyendo',
    estadoMascota(conRacha, AHORA).mood);

  /* Y terminar un libro gana a cualquier pregunta. */
  const conFinal = [atrasado, {
    id: 'c', title: 'Noches Blancas', total: 100, page: 100, status: 'read', pct: 100,
    lastReadAt: AHORA - DIA, finishedAt: AHORA - DIA,
  }];
  comprobar('acabar un libro gana a cualquier pregunta pendiente',
    estadoMascota(conFinal, AHORA).mood === 'celebrando');

  /* El más atrasado va primero, como los ordena el plan. */
  const dos = [
    { ...atrasado, id: 'z1', title: 'Uno', mes: 'Agosto', atrasadoMeses: 1 },
    { ...atrasado, id: 'z3', title: 'Tres', mes: 'Junio', atrasadoMeses: 3 },
  ];
  comprobar('entre varios represados, el que más lleva esperando',
    estadoMascota(dos, AHORA).libro?.id === 'z3');
}

/* ── 6 · Y CUANDO NO PUEDE CONTESTAR, TAMPOCO CASTIGA ─────────

   El chat pintaba `err.message` tal cual, y esos mensajes están
   escritos para un aviso de Ajustes. Debajo del nombre de la gata,
   «Esa consulta no está permitida» convierte a la compañera de lectura
   en una ventanilla — y aquella vez lo dijo por una pregunta que había
   propuesto la propia app dos líneas más arriba.

   La lista de códigos NO se escribe aquí: se saca del Worker. Así, el
   día que alguien añada un fallo nuevo, esta prueba lo mira sin que
   nadie se acuerde de venir a apuntarlo. */

console.log('\n─── LO QUE DICE CUANDO FALLA ───');

{
  const worker = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  const codigos = [...new Set([...worker.matchAll(/error:\s*'([a-z-]+)'/g)].map((m) => m[1]))];

  comprobar('se leen los códigos de fallo del propio Worker',
    codigos.length >= 8, `${codigos.length} encontrados`);

  /* Nada de ventanilla y nada de sala de máquinas. Lo primero culpa a
     quien pregunta de algo que casi siempre es de configuración; lo
     segundo le habla de cosas que no tiene por qué saber que existen. */
  const VENTANILLA = /permitid|autorizad|prohibid|no se puede|inválid|no válid|incorrect|denegad/i;
  /* Con límites de palabra, y no por pulcritud: sin ellos «intent»
     casaba dentro de «in-tent-amos» y la prueba suspendía una frase
     perfecta. Un guardián que da falsos positivos se acaba desactivando,
     y entonces no guarda nada. */
  const MAQUINAS = /\b(worker|dominio|intent|encargo|token|endpoint|json|https?|api|fetch|servidor|caché|código)\b/i;

  const todos = [...codigos, 'sin-red', 'desconocido', ''];
  const dichas = todos.map((c) => [c, fraseDeFallo(c)]);

  const ventanilla = dichas.filter(([, f]) => VENTANILLA.test(f));
  comprobar('ninguna frase de fallo culpa a quien pregunta',
    ventanilla.length === 0, ventanilla.map(([c, f]) => `${c}: ${f}`).join(' · '));

  const maquinas = dichas.filter(([, f]) => MAQUINAS.test(f));
  comprobar('ninguna frase de fallo se pone técnica',
    maquinas.length === 0, maquinas.map(([c, f]) => `${c}: ${f}`).join(' · '));

  const vacias = dichas.filter(([, f]) => !f || f.length < 20);
  comprobar('todos los códigos tienen algo que decir, también los que no conoce',
    vacias.length === 0, vacias.map(([c]) => c).join(' · '));

  /* La de la captura, tal cual salió. */
  comprobar('«Esa consulta no está permitida» ya no puede salir de su boca',
    !dichas.some(([, f]) => /esa consulta/i.test(f)));

  /* Un encargo que el Worker desplegado no conoce es la app rota, no
     una pregunta mala: la frase tiene que quitarle la culpa de encima,
     no solo evitar echársela. */
  comprobar('un fallo de configuración le dice que no fue por su pregunta',
    /no es por lo que preguntaste/i.test(fraseDeFallo('intent-no-permitido')));

  /* Y el cerco temático no es un rechazo: es cambiar de tema. */
  comprobar('«fuera de tema» redirige en vez de negar',
    /de libros te cuento/i.test(fraseDeFallo('fuera-de-tema')));
}

/* ── 7 · EL AVISO DEL DÍA  ·  historias #95 y #69 ────────────

   Lo que se prueba aquí no es que avise: es que CASI NUNCA avisa. Una
   frase floja en una pantalla que abriste tú se perdona; la misma
   entrando sola en el teléfono se lee mucho más dura, y una app de
   leer que suena cuando no toca se desinstala en una semana. */

console.log('\n─── CUÁNDO SUENA EL TELÉFONO, Y CUÁNDO NO ───');

{
  const conPregunta = estadoMascota([{
    id: 'a', title: 'Bartleby', total: 300, page: 80, status: 'reading', pct: 27,
    lastReadAt: AHORA - 6 * DIA, finishedAt: 0,
  }], AHORA);
  comprobar('el caso base es una pregunta de verdad',
    conPregunta.mood === 'preguntando', conPregunta.mood);

  const base = { nombre: 'Cleo', hora: 18, ultimoAviso: '', hoy: '2026-09-07', ahora: AHORA };
  const aviso = avisoDelDia(conPregunta, base);
  comprobar('con una pregunta pendiente y a media tarde, avisa',
    Boolean(aviso), JSON.stringify(aviso));
  comprobar('y lo firma ELLA, no la app',
    aviso.titulo === 'Cleo', aviso.titulo);
  comprobar('el cuerpo es la MISMA frase que se ve en el inicio',
    aviso.cuerpo === fraseMascota(conPregunta, { ahora: AHORA, nombre: 'Cleo' }), aviso.cuerpo);
  comprobar('y trae el libro, para poder abrir su hoja al tocarla',
    aviso.libroId === 'a', aviso.libroId);

  /* Y ahora todas las veces que NO debe sonar. */
  comprobar('no avisa a las 7 de la mañana',
    avisoDelDia(conPregunta, { ...base, hora: 7 }) === null);
  comprobar('no avisa a las 11 de la noche',
    avisoDelDia(conPregunta, { ...base, hora: 23 }) === null);
  comprobar('no avisa dos veces el mismo día',
    avisoDelDia(conPregunta, { ...base, ultimoAviso: '2026-09-07' }) === null);
  comprobar('pero sí al día siguiente',
    Boolean(avisoDelDia(conPregunta, { ...base, ultimoAviso: '2026-09-06' })));

  /* Los ánimos que NO justifican encender un teléfono. */
  const sinPregunta = {
    /* «contenta» pide una lectura reciente y NADA en curso: un libro
       terminado hace días pero leído ayer. Una biblioteca vacía no
       vale — esa da «dormida», que es otra cosa. */
    contenta: estadoMascota([{ id: 'a', title: 'W', total: 200, page: 200, status: 'read',
      pct: 100, lastReadAt: AHORA - DIA, finishedAt: AHORA - 5 * DIA }], AHORA),
    dormida: estadoMascota([], AHORA),
    leyendo: estadoMascota([{ id: 'b', title: 'X', total: 300, page: 90, status: 'reading',
      pct: 30, lastReadAt: AHORA - 3600e3, finishedAt: 0 }], AHORA),
    celebrando: estadoMascota([{ id: 'c', title: 'Y', total: 100, page: 100, status: 'read',
      pct: 100, lastReadAt: AHORA - DIA, finishedAt: AHORA - DIA }], AHORA),
    expectante: estadoMascota([{ id: 'd', title: 'Z', total: 300, page: 280, status: 'reading',
      pct: 93, lastReadAt: AHORA - 3600e3, finishedAt: 0 }], AHORA),
  };
  for (const [esperado, estado] of Object.entries(sinPregunta)) {
    comprobar(`«${esperado}» no enciende el teléfono de nadie`,
      estado.mood === esperado && avisoDelDia(estado, base) === null,
      `mood=${estado.mood} aviso=${JSON.stringify(avisoDelDia(estado, base))}`);
  }

  /* Terminar un libro es la mejor noticia del módulo Y AUN ASÍ no se
     manda: para cuando llegue el aviso, ya lo has celebrado tú. */
  comprobar('ni siquiera celebrar justifica una notificación',
    avisoDelDia(sinPregunta.celebrando, base) === null);

  /* La regla que más cuesta escribir y más importa: NADA DE RACHAS. */
  const RECLAMO = /racha|vas a perder|no pierdas|meta|objetivo|llevas \d+ días sin/i;
  const cuerpos = [];
  for (const dias of [5, 6, 9, 20]) {
    const e = estadoMascota([{ id: 'a', title: 'Bartleby', total: 300, page: 80,
      status: 'reading', pct: 27, lastReadAt: AHORA - dias * DIA, finishedAt: 0 }], AHORA);
    const a = avisoDelDia(e, base);
    if (a) cuerpos.push(a.cuerpo);
  }
  for (const mes of [1, 3]) {
    const e = estadoMascota([{ id: 'z', title: 'Mi Historia', total: 426, page: 0,
      status: 'reading', pct: 0, lastReadAt: 0, finishedAt: 0,
      mes: 'Agosto', atrasadoMeses: mes }], AHORA);
    const a = avisoDelDia(e, base);
    if (a) cuerpos.push(a.cuerpo);
  }
  comprobar('hay avisos que comprobar', cuerpos.length >= 3, `${cuerpos.length}`);
  const rachas = cuerpos.filter((c) => RECLAMO.test(c));
  comprobar('NINGÚN aviso habla de rachas, metas ni días perdidos',
    rachas.length === 0, rachas.join(' · '));
}

/* ── 8 · CON VARIOS LIBROS A LA VEZ ──────────────────────────

   «Estoy leyendo más de dos libros, ¿entonces cómo sabe cuál poner?»

   La regla es «el que tocaste más recientemente», y no cambia. Lo que
   cambia es que deja de afirmarse: la pantalla enseña la lista y se
   puede corregir. Aquí se comprueba la lista. */

console.log('\n─── CUANDO LLEVAS VARIOS A LA VEZ ───');

{
  const enCurso = (id, title, hace) => ({
    id, title, total: 300, page: 50, status: 'reading', pct: 17,
    lastReadAt: AHORA - hace, finishedAt: 0,
  });
  const lista = [
    enCurso('c', 'El tercero', 9 * DIA),
    enCurso('a', 'El primero', 2 * 3600e3),
    enCurso('b', 'El segundo', 2 * DIA),
  ];

  const abiertos = librosEnCurso(lista);
  comprobar('salen los tres, no uno',
    abiertos.length === 3, `${abiertos.length}`);
  comprobar('y en orden: el más reciente primero',
    abiertos.map((b) => b.id).join('') === 'abc', abiertos.map((b) => b.id).join(''));
  /* Y aquí salió una incoherencia de verdad: con tres abiertos y uno
     callado nueve días, la mascota pregunta por ESE, no por el más
     reciente. Si el chat se abriera por el más reciente, el inicio
     diría «¿por dónde vas con El tercero?» y el chat «hablando de El
     primero» — la app contradiciéndose en dos líneas seguidas.

     Por eso el chat abre por el libro del que ella YA habla, y solo
     cae al más reciente si su ánimo no va de ninguno de los abiertos. */
  const suyo = estadoMascota(lista, AHORA);
  comprobar('con uno callado nueve días, ella pregunta por ESE',
    suyo.mood === 'preguntando' && suyo.libro.id === 'c',
    `${suyo.mood} · ${suyo.libro?.id}`);
  comprobar('y ese libro está entre los abiertos, así que el chat puede abrirse por él',
    abiertos.some((b) => b.id === suyo.libro.id));

  /* La misma prueba de vida que en el resto del módulo. */
  const conMarcado = [...lista, {
    id: 'z', title: 'Solo marcado', total: 200, page: 0, status: 'reading',
    pct: 0, lastReadAt: 0, finishedAt: 0,
  }];
  comprobar('un libro marcado y sin abrir NO entra en la lista',
    librosEnCurso(conMarcado).every((b) => b.id !== 'z'));

  comprobar('con uno solo, la lista tiene uno',
    librosEnCurso([enCurso('a', 'Único', 3600e3)]).length === 1);
  comprobar('y sin ninguno, está vacía',
    librosEnCurso([]).length === 0);
}

console.log(`\n  ${bien} comprobaciones pasaron, ${mal} fallaron.\n`);
process.exit(mal ? 1 : 0);
