/* ─────────────────────────────────────────────────────────────
   PRUEBAS DEL PERFIL PÚBLICO

   El grupo que importa de verdad es «QUÉ SALE DE TU CUENTA». El perfil
   público es un documento que puede leer cualquiera, así que apagar una
   sección tiene que QUITAR SUS DATOS del documento, no dejar de
   pintarlos. Estas pruebas comprueban la ausencia, no la pantalla.
   ───────────────────────────────────────────────────────────── */

import {
  esPrivada, followersOnlyDoc,
  SECCIONES, IDS_SECCION, SECCIONES_OPT, esOpt, seccionVisible, toggleSeccion,
  limpiarBio, limpiarCiudad, inicial, profileStats, generosFavoritos,
  publicProfileDoc, CAMPOS_PUBLICOS, profileUrl, usernameFromHash, resumenCorto,
} from '../src/profile-core.js';

let pasaron = 0;
let fallaron = 0;
const grupo = (n) => console.log(`\n${n}`);
function ok(nombre, condicion, detalle = '') {
  if (condicion) { pasaron++; console.log(`  ✓ ${nombre}`); }
  else { fallaron++; console.log(`  ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`); }
}
const igual = (nombre, a, b) =>
  ok(nombre, JSON.stringify(a) === JSON.stringify(b), `dio ${JSON.stringify(a)}, se esperaba ${JSON.stringify(b)}`);

const ENERO = (d) => new Date(2026, 0, d).getTime();

const LIBROS = [
  { id: 'b1', title: 'Pedro Páramo', author: 'Juan Rulfo', genre: 'Latinoamérica', pages: 124, status: 'read', finishedAt: ENERO(4), shelfIds: ['s1'] },
  { id: 'b2', title: 'Rayuela', author: 'Julio Cortázar', genre: 'Latinoamérica', pages: 600, status: 'read', finishedAt: ENERO(20), shelfIds: ['s1', 's2'] },
  { id: 'b3', title: 'Drácula', author: 'Bram Stoker', genre: 'Gótico', pages: 400, status: 'read', finishedAt: new Date(2025, 5, 1).getTime() },
  { id: 'b4', title: 'Dune', author: 'Frank Herbert', genre: 'Ciencia ficción', pages: 700, status: 'reading', pct: 42, cover: 'https://x/d.jpg' },
  { id: 'b5', title: 'Solaris', author: 'Stanisław Lem', genre: 'Ciencia ficción', pages: 250, status: 'pending' },
];

const AJUSTES = {
  bio: '  Leo de noche.  ', city: 'Bogotá',
  shelves: [
    { id: 's1', name: 'Favoritos', emoji: '⭐', color: 'gold', public: true },
    { id: 's2', name: 'Regalos para Ana', emoji: '🎁', color: 'violet' },
  ],
  pet: { species: 'zorro', fur: 'nieve', accessory: 'bufanda', name: 'Nube' },
};

const base = (extra = {}) => publicProfileDoc({
  uid: 'u1', username: 'Laura.V', name: 'Laura', settings: AJUSTES,
  books: LIBROS, racha: 5, year: 2026, at: 1000, ...extra,
});

/* ── LO QUE SALE DE TU CUENTA ────────────────────────────────── */

grupo('QUÉ SALE DE TU CUENTA');
{
  const d = base();
  const sobran = Object.keys(d).filter((k) => !CAMPOS_PUBLICOS.includes(k));
  igual('no sale ningún campo fuera de la lista blanca', sobran, []);
  ok('el @usuario se guarda en minúsculas', d.username === 'laura.v');
  ok('la bio viene limpia de espacios', d.bio === 'Leo de noche.');
}

grupo('APAGAR UNA SECCIÓN LA QUITA DEL DOCUMENTO, NO LA ESCONDE');
{
  const sinNumeros = base({ settings: { ...AJUSTES, profileHidden: ['numeros'] } });
  ok('«numeros» apagado: la clave no existe', !('numeros' in sinNumeros));
  ok('y no aparece en la lista de secciones', !sinNumeros.secciones.includes('numeros'));
  ok('lo demás sigue ahí', 'generos' in sinNumeros);

  const nada = base({ settings: { ...AJUSTES, profileHidden: [...IDS_SECCION] } });
  const conDatos = ['leyendo', 'numeros', 'generos', 'estanterias', 'mascota', 'librosLeidos'].filter((k) => k in nada);
  igual('todo apagado: no queda ni un dato de lectura', conDatos, []);
  ok('pero el perfil sigue existiendo, con nombre y bio', nada.username === 'laura.v' && nada.bio === 'Leo de noche.');
}

grupo('LAS ESTANTERÍAS PRIVADAS NO SE PUBLICAN');
{
  const d = base();
  igual('solo sale la marcada como pública', d.estanterias.map((s) => s.name), ['Favoritos']);
  ok('«Regalos para Ana» no aparece por ningún lado',
    !JSON.stringify(d).includes('Regalos para Ana'));
  ok('sale con su cuenta de libros', d.estanterias[0].n === 2);
}

grupo('NUNCA SALE UNA RESEÑA');
{
  /* Las reseñas viven en su propia colección (#28) y no se copian aquí.
     Si alguna vez alguien las mete en los ajustes, esto lo caza. */
  const conResena = base({
    settings: { ...AJUSTES, review: 'secreto', notas: 'privado' },
  });
  ok('un campo cualquiera de los ajustes no se cuela',
    !JSON.stringify(conResena).includes('secreto') && !JSON.stringify(conResena).includes('privado'));
}

grupo('LA MASCOTA ESCONDIDA NO SE PUBLICA');
{
  const d = base({ settings: { ...AJUSTES, pet: { ...AJUSTES.pet, hidden: true } } });
  ok('si la escondiste en la app, tampoco sale fuera', !('mascota' in d));
  ok('y si no, sale', base().mascota.name === 'Nube');
}

/* ── LA ESPECIE VIAJA ENTERA ─────────────────────────────────
   «¿Cómo quedamos con la mascota cuando agregue amigos? Te la estás
    inventando, es un dato que ya deberías estar guardando.»

   Se guarda — pero de las cuatro cosas que se publican de la mascota,
   la única con prueba era el NOMBRE. La ESPECIE, que es la que decide
   qué bicho ve tu amiga, no la comprobaba nadie. Y en el publicador
   había un `species || 'gato'`: sin especie se escribía un gato en el
   documento público, y a partir de ahí ya no hay forma de distinguir
   «tiene un gato» de «no sabíamos cuál tenía».

   Estas pruebas cubren el viaje entero: lo que hay en los ajustes es
   exactamente lo que sale publicado, para las nueve especies. */

grupo('LA ESPECIE DE TU AMIGA ES LA SUYA, NO UNA POR DEFECTO');
{
  const ESPECIES = ['gato', 'conejo', 'buho', 'zorro', 'mapache', 'panda', 'oso', 'lobo', 'cuervo'];
  const salieron = ESPECIES.map((sp) =>
    base({ settings: { ...AJUSTES, pet: { ...AJUSTES.pet, species: sp } } }).mascota?.species);
  igual('las nueve viajan tal cual', salieron, ESPECIES);

  /* El caso exacto que contó: una amiga con el oso. */
  const suyo = base({ settings: { ...AJUSTES, pet: { species: 'oso', name: 'Tomás' } } });
  ok('con el oso, sale el oso', suyo.mascota.species === 'oso');
  ok('y su nombre', suyo.mascota.name === 'Tomás');

  /* Y sin especie NO se inventa una. Ausente es verdad; un gato que
     nadie eligió es un dato falso publicado. */
  for (const pet of [{ name: 'Sin especie' }, { species: '', name: 'X' }, { species: '   ' }]) {
    const d = base({ settings: { ...AJUSTES, pet } });
    ok(`sin especie (${JSON.stringify(pet).slice(0, 26)}…) no se publica mascota`, !('mascota' in d));
  }

  ok('y sobre todo: nunca sale un gato que nadie eligió',
    !ESPECIES.slice(1).some((sp) =>
      base({ settings: { ...AJUSTES, pet: { ...AJUSTES.pet, species: sp } } }).mascota.species === 'gato'));
}

/* ── LA QUE ENTREGA LA BIBLIOTECA ENTERA ─────────────────────
   «Cuando alguien me agrega como amiga se lleva toda mi biblioteca.»

   Y no hacía falta ser amiga: `sugerible` venía encendida de fábrica y
   publica un identificador por CADA libro leído y su nota, en un
   documento que lee cualquiera sin cuenta. Estas pruebas cuidan el
   valor por defecto, que es donde estaba el fallo — no la función. */

grupo('LA LISTA DE TU BIBLIOTECA NO SALE SI NO LA ENCIENDES');
{
  const d = base();
  ok('de fábrica, la clave NO existe', !('librosLeidos' in d));
  ok('ni las puntuaciones', !('valorados' in d));
  ok('y no se anuncia como sección', !d.secciones.includes('sugerible'));

  /* El descuido que esto caza: unos ajustes a medio hacer —el fichero
     de quien nunca abrió esta pantalla— no pueden publicarla. */
  for (const settings of [{}, { ...AJUSTES }, { profileHidden: [] }, { profileShown: [] }, { profileShown: null }]) {
    ok(`con settings=${JSON.stringify(settings).slice(0, 28)}… sigue sin salir`,
      !('librosLeidos' in base({ settings })));
  }
}

grupo('ENCENDIDA A MANO, SÍ (#47) — Y SOLO LO PACTADO');
{
  const on = base({ settings: { ...AJUSTES, profileShown: ['sugerible'] } });
  igual('publica los ids de los leídos, nunca lo que opinas',
    on.librosLeidos, ['b1', 'b2', 'b3']);
  ok('los pendientes y los empezados no van',
    !on.librosLeidos.includes('b4') && !on.librosLeidos.includes('b5'));
  ok('ahora sí se anuncia como sección', on.secciones.includes('sugerible'));
  ok('y sigue sin haber reseñas ahí dentro',
    !JSON.stringify(on.librosLeidos).includes('review'));

  /* El error que el parche del core impide: apagarla por el campo
     equivocado la dejaría encendida en silencio. */
  const viejo = base({ settings: { ...AJUSTES, profileShown: ['sugerible'], profileHidden: ['sugerible'] } });
  ok('quien la tenía apagada y hoy la enciende, la tiene encendida',
    'librosLeidos' in viejo);
}

/* ── CUENTA PRIVADA  ·  historia #52 ─────────────────────────── */

grupo('CUENTA PRIVADA: LA TARJETA NO LLEVA NADA MÁS');
{
  const priv = base({ settings: { ...AJUSTES, privada: true } });
  ok('se marca como privada', priv.privada === true);
  ok('el nombre y la bio sí se ven — es lo que pide la historia',
    priv.name === 'Laura' && priv.bio === 'Leo de noche.');
  igual('pero NINGUNA sección se publica', priv.secciones, []);
  const conDatos = ['leyendo', 'numeros', 'generos', 'estanterias', 'mascota', 'librosLeidos']
    .filter((k) => k in priv);
  igual('y sus datos NO están en el documento que lee cualquiera', conDatos, []);
  ok('en pública sí están', 'numeros' in base());
}

grupo('LO QUE SOLO VEN LAS SEGUIDORAS');
{
  const datos = { uid: 'u1', username: 'laura.v', name: 'Laura', settings: { ...AJUSTES, privada: true }, books: LIBROS, racha: 5, year: 2026, at: 1000 };
  const full = followersOnlyDoc(datos);
  ok('existe cuando la cuenta es privada', full !== null);
  ok('lleva los números', full.numeros.leidosEsteAnio === 2);
  ok('y los géneros', full.generos.length > 0);
  ok('NO repite la bio ni el nombre: eso ya está en la tarjeta',
    !('bio' in full) && !('name' in full));
  ok('lleva el uid, para saber de quién es', full.uid === 'u1');
  ok('en una cuenta pública no existe: todo va en el documento de siempre',
    followersOnlyDoc({ ...datos, settings: AJUSTES }) === null);
  ok('sigue sin filtrarse la estantería privada',
    !JSON.stringify(full).includes('Regalos para Ana'));

  /* Esto es literalmente lo que ella contó: alguien te sigue y se
     lleva tu biblioteca. Aquí es donde iría, y no va. */
  ok('quien te sigue TAMPOCO se lleva la lista si no la encendiste',
    !('librosLeidos' in full) && !('valorados' in full));
  const conLista = followersOnlyDoc({
    ...datos, settings: { ...AJUSTES, privada: true, profileShown: ['sugerible'] },
  });
  ok('encendida a mano, sí la recibe', Array.isArray(conLista.librosLeidos));
}

grupo('UNA CUENTA PRIVADA NO APARECE EN «QUIZÁ CONOZCAS»');
ok('porque sus libros ya no están donde busca esa consulta, ni encendiéndolo',
  !('librosLeidos' in base({ settings: { ...AJUSTES, privada: true, profileShown: ['sugerible'] } })));

grupo('EL INTERRUPTOR');
ok('por defecto, pública', !esPrivada({}));
ok('se pone', esPrivada({ privada: true }));
ok('un «casi sí» no la hace privada', !esPrivada({ privada: 'si' }));

grupo('SIN @USUARIO NO HAY PERFIL');
ok('sin username, null', publicProfileDoc({ uid: 'u1', name: 'Laura' }) === null);
ok('sin uid, null', publicProfileDoc({ username: 'laura', name: 'Laura' }) === null);

/* ── LAS SECCIONES ───────────────────────────────────────────── */

grupo('LAS SECCIONES');
ok('hay ocho', SECCIONES.length === 8);
ok('todas tienen id, etiqueta y pista', SECCIONES.every((s) => s.id && s.label && s.hint));
ok('las de la tarjeta se ven por defecto',
  IDS_SECCION.filter((id) => !esOpt(id)).every((id) => seccionVisible({}, id)));
ok('las que entregan una lista, NO',
  SECCIONES_OPT.length > 0 && SECCIONES_OPT.every((id) => !seccionVisible({}, id)));
ok('sin lista, visible', seccionVisible({ profileHidden: null }, 'numeros'));
ok('en la lista de apagadas, no visible', !seccionVisible({ profileHidden: ['numeros'] }, 'numeros'));
ok('una «opt» se enciende con profileShown', seccionVisible({ profileShown: ['sugerible'] }, 'sugerible'));
igual('el interruptor apaga', toggleSeccion({}, 'numeros'), { profileHidden: ['numeros'] });
igual('y vuelve a encender', toggleSeccion({ profileHidden: ['numeros'] }, 'numeros'), { profileHidden: [] });
igual('sin tocar las demás', toggleSeccion({ profileHidden: ['numeros', 'generos'] }, 'numeros'), { profileHidden: ['generos'] });

/* EL PARCHE VA AL CAMPO QUE TOCA. Devolver un array suelto obligaba a
   quien llama a elegir el campo, y elegir mal —escribir `profileHidden`
   con el id de una «opt»— la dejaría encendida para siempre sin que
   nadie viera nada raro en la pantalla. */
igual('una «opt» se enciende por su propio campo',
  toggleSeccion({}, 'sugerible'), { profileShown: ['sugerible'] });
igual('y se apaga por el mismo',
  toggleSeccion({ profileShown: ['sugerible'] }, 'sugerible'), { profileShown: [] });
ok('nunca toca el campo de las otras',
  !('profileHidden' in toggleSeccion({}, 'sugerible'))
  && !('profileShown' in toggleSeccion({}, 'numeros')));

/* ── LOS NÚMEROS ─────────────────────────────────────────────── */

grupo('LOS NÚMEROS');
{
  const s = profileStats(LIBROS, { year: 2026, racha: 5 });
  ok('leídos este año: dos', s.leidosEsteAnio === 2);
  ok('leídos en total: tres, el de 2025 cuenta', s.leidosTotal === 3);
  ok('las páginas son solo las de este año', s.paginas === 724);
  ok('la racha se pasa tal cual', s.racha === 5);
  ok('un libro leído sin fecha no cuenta para el año',
    profileStats([{ status: 'read', pages: 100 }], { year: 2026 }).leidosEsteAnio === 0);
  ok('pero sí para el total', profileStats([{ status: 'read', pages: 100 }]).leidosTotal === 1);
  ok('sin libros, ceros y no NaN',
    profileStats([]).paginas === 0 && profileStats([]).leidosTotal === 0);
  ok('una racha con basura no ensucia el documento', profileStats([], { racha: 'x' }).racha === 0);
}

grupo('LOS GÉNEROS');
{
  igual('de más a menos', generosFavoritos(LIBROS).map((g) => g.genre),
    ['Latinoamérica', 'Gótico']);
  ok('los pendientes no cuentan',
    !generosFavoritos(LIBROS).some((g) => g.genre === 'Ciencia ficción'));
  ok('el tope se respeta', generosFavoritos(LIBROS, 1).length === 1);
  igual('sin libros, lista vacía', generosFavoritos([]), []);
  ok('un libro sin género no rompe',
    generosFavoritos([{ status: 'read' }]).length === 0);
}

/* ── QUÉ ESTOY LEYENDO ───────────────────────────────────────── */

grupo('QUÉ ESTOY LEYENDO');
{
  const d = base();
  igual('solo los empezados', d.leyendo.map((b) => b.title), ['Dune']);
  ok('con su porcentaje', d.leyendo[0].pct === 42);
  ok('y su portada', d.leyendo[0].cover === 'https://x/d.jpg');
  const muchos = base({
    books: Array.from({ length: 9 }, (_, i) => ({ title: `L${i}`, status: 'reading' })),
  });
  ok('como mucho tres, que es un perfil y no un inventario', muchos.leyendo.length === 3);
  ok('sin portada, null y no undefined', muchos.leyendo[0].cover === null);
  ok('un porcentaje imposible se recorta',
    base({ books: [{ title: 'x', status: 'reading', pct: 900 }] }).leyendo[0].pct === 100);
}

/* ── LOS TEXTOS ──────────────────────────────────────────────── */

grupo('LOS TEXTOS');
ok('la bio se corta a 160', limpiarBio('a'.repeat(300)).length === 160);
ok('los saltos de línea se aplanan', limpiarBio('hola\n\nadiós') === 'hola adiós');
ok('la ciudad se corta a 40', limpiarCiudad('b'.repeat(90)).length === 40);
ok('sin bio, cadena vacía y no undefined', limpiarBio(undefined) === '');
ok('la inicial es mayúscula', inicial('laura') === 'L');
ok('sin nombre, un símbolo antes que un hueco', inicial('') === '✦');
ok('un nombre con espacios delante no da un espacio', inicial('  ana') === 'A');

/* ── EL LINK ─────────────────────────────────────────────────── */

grupo('EL LINK DEL PERFIL');
ok('se puede pegar en WhatsApp',
  profileUrl('laura.v', 'https://mibiblioteca.app') === 'https://mibiblioteca.app/#/u/laura.v');
ok('una barra de más no da dos', profileUrl('ana', 'https://x.app/') === 'https://x.app/#/u/ana');
ok('en minúsculas siempre', profileUrl('Laura.V', 'https://x.app') === 'https://x.app/#/u/laura.v');
ok('sin username, vacío', profileUrl(null, 'https://x.app') === '');
ok('se lee de vuelta', usernameFromHash('#/u/laura.v') === 'laura.v');
ok('y se normaliza al leerlo', usernameFromHash('#/u/Laura.V') === 'laura.v');
ok('otra ruta no es un perfil', usernameFromHash('#/ajustes') === null);
ok('una ruta vacía tampoco', usernameFromHash('') === null);
ok('un nombre imposible no se acepta ni en el link', usernameFromHash('#/u/ab') === null);

/* ── EL PERFIL RECIÉN HECHO ──────────────────────────────────── */

grupo('CON POCOS LIBROS TAMBIÉN SE VE BIEN');
{
  const nuevo = publicProfileDoc({ uid: 'u2', username: 'nueva', name: 'Nueva', books: [] });
  ok('un perfil vacío se publica igual', nuevo !== null);
  ok('y dice algo en vez de enseñar ceros', resumenCorto(nuevo) === 'Acaba de llegar.');
  ok('con un libro, lo cuenta en singular',
    resumenCorto({ numeros: { leidosEsteAnio: 1, anio: 2026 } }).startsWith('1 libro en 2026'));
  ok('con dos, en plural',
    resumenCorto({ numeros: { leidosEsteAnio: 2, anio: 2026 } }).startsWith('2 libros'));
  ok('una racha de 1 no se presume', !resumenCorto({ numeros: { racha: 1 } }).includes('seguidos'));
  ok('una de 5 sí', resumenCorto({ numeros: { racha: 5 } }).includes('5 días seguidos'));
}

console.log(`\n${pasaron} pruebas pasaron, ${fallaron} fallaron.`);
process.exit(fallaron ? 1 : 0);
