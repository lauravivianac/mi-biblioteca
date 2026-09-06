/* ─────────────────────────────────────────────────────────────
   EL CIRCUITO ENTERO, CON EL CÓDIGO DE VERDAD

   Para ejecutarlo:
     npm run test:circuito

   Esto no prueba las reglas (eso es `test:rules`): prueba LA APP. Se
   cargan `store.js`, `social.js` y `moderation.js` tal cual están en
   el repo, con el SDK de Firebase de verdad, contra el emulador
   oficial, con dos cuentas creadas de verdad. Lo único sustituido es
   `src/firebase.js`, para que apunte al emulador en vez de a
   producción (ver scripts/emulador/).

   POR QUÉ. Todo lo social —el @usuario, el perfil, seguir, los avisos,
   los comentarios, el feed— se había comprobado únicamente contra un
   doble de Firestore escrito a mano. Ese doble aceptó una ruta que
   Firestore rechaza, concedió una lectura que la regla deniega y
   devolvió menos de lo que devuelve el original. Tres mentiras en tres
   ocasiones distintas.

   La diferencia con el doble es esta: aquí, si algo no funciona, no
   funciona de verdad.
   ───────────────────────────────────────────────────────────── */

/* La app vive en un navegador y da por hechas estas tres cosas. No es
   simular la app: es simular el sitio donde corre. */
const almacen = new Map();
globalThis.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: (k) => almacen.delete(k),
  clear: () => almacen.clear(),
};
globalThis.location = { hostname: 'localhost', href: 'http://localhost/', origin: 'http://localhost' };
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, location: globalThis.location,
};
globalThis.document = { visibilityState: 'visible', addEventListener() {} };

const store = await import('../src/store.js');
const social = await import('../src/social.js');
const moderation = await import('../src/moderation.js');
const swap = await import('../src/swap.js');
const auth = await import('../src/auth.js');
const { db } = await import('../src/firebase.js');
const { collection, getDocs, query, where, limit } = await import('firebase/firestore');

let pasan = 0;
const fallos = [];

function comprobar(nombre, condicion, detalle = '') {
  if (condicion) { pasan++; return true; }
  fallos.push({ nombre, detalle });
  return false;
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Entrar como una de las dos cuentas y dejar el store cargado. */
async function entrarComo(email, password, nombre) {
  await auth.logOut().catch(() => {});
  let user;
  try { user = await auth.signInWithEmail(email, password); } catch {
    user = await auth.registerWithEmail(email, password, nombre);
  }
  almacen.clear();
  store.setDisplayName(nombre);
  await store.loadStore(user.uid);
  return user.uid;
}

/**
 * Verificar el correo POR EL CAMINO DE VERDAD.
 *
 * Publicar en intercambio exige correo verificado, y eso no lo decide
 * la app: lo comprueba la regla con el token firmado por Google
 * (`request.auth.token.email_verified`). Así que no vale con fingirlo
 * en el cliente — hay que pedir el correo, sacar el código que el
 * emulador guarda en vez de mandarlo, y aplicarlo.
 *
 * Y después hay que refrescar el token: la verificación cambia la
 * cuenta, pero el token que lleva la sesión en la mano sigue diciendo
 * lo de antes hasta que se pide otro.
 */
async function verificarCorreo(email) {
  const { sendEmailVerification } = await import('firebase/auth');
  const proyecto = process.env.GCLOUD_PROJECT || 'demo-biblioteca';
  const emulador = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

  await sendEmailVerification(auth.currentUser());

  const r = await fetch(`http://${emulador}/emulator/v1/projects/${proyecto}/oobCodes`);
  const { oobCodes = [] } = await r.json();
  const codigo = [...oobCodes].reverse()
    .find((c) => c.email === email && c.requestType === 'VERIFY_EMAIL');
  if (!codigo) throw new Error(`sin código de verificación para ${email}`);

  await fetch(codigo.oobLink);
  await auth.currentUser().reload();
  await auth.currentUser().getIdToken(true);
}

const ANA = { email: 'ana@ejemplo.test', pass: 'secreto123', nombre: 'Ana' };
const BEA = { email: 'bea@ejemplo.test', pass: 'secreto123', nombre: 'Bea' };

/* ═══ 1 · ELEGIR EL @USUARIO  ·  #44 ══════════════════════════
   Esta es la pieza que estuvo escrita contra una ruta imposible
   (`social/usernames/{nombre}`, tres segmentos) y que por tanto no
   funcionó nunca. */
const uidAna = await entrarComo(ANA.email, ANA.pass, ANA.nombre);

const libre = await store.isUsernameFree('anita');
comprobar('@usuario · «anita» está libre', libre.free === true, JSON.stringify(libre));

const pedido = await store.claimUsername('anita');
comprobar('@usuario · lo reclamo', pedido.ok === true, JSON.stringify(pedido));
comprobar('@usuario · queda guardado', store.myUsername() === 'anita', String(store.myUsername()));

const yaNoLibre = await store.isUsernameFree('anita');
/* Para su dueña sigue estando «libre» —es suyo—, y eso es lo correcto:
   lo que no puede pasar es que otra cuenta se lo lleve. */
comprobar('@usuario · lo reconoce como mío', yaNoLibre.mine === true, JSON.stringify(yaNoLibre));

/* ═══ 2 · EL PERFIL PÚBLICO  ·  #45 ═══════════════════════════ */
/* Los libros de la semilla se llaman `seed-N` (ver src/seed.js). */
const LIBRO_A = 'seed-0';
const LIBRO_B = 'seed-1';
store.updateEntry(LIBRO_A, { status: 'read', rating: 5 });
await store.flush();
await store.publishProfile();

const perfilPropio = await store.fetchProfile('anita');
comprobar('perfil · se publica y se lee', perfilPropio.ok === true, JSON.stringify(perfilPropio).slice(0, 160));
comprobar('perfil · es mío', perfilPropio.mio === true);
comprobar('perfil · lleva el @usuario', perfilPropio.profile?.username === 'anita');

/* ═══ 3 · EL FEED  ·  #49 ═════════════════════════════════════
   `activity` no tenía regla ninguna: todas estas escrituras las
   denegaba el servidor y el feed salía vacío por definición. */
store.updateEntry(LIBRO_B, { status: 'reading' });
store.updateEntry(LIBRO_B, { status: 'read', rating: 4 });
await store.flush();
await esperar(200);

/* El feed propio se comprueba abajo, desde la cuenta de Bea: loadFeed
   trae la actividad de a QUIEN SIGUES, y Ana no sigue a nadie. Que
   aquí salga vacío es lo correcto. */
const miFeed = await social.loadFeed({ tope: 20 });
comprobar('feed · sin seguir a nadie, vacío y sin reventar', miFeed.entradas.length === 0,
  `entradas=${miFeed.entradas.length}`);

/* ═══ 4 · SEGUIR  ·  #46 ══════════════════════════════════════
   El caso que estaba roto: Ana tiene perfil público SIN el campo
   `privada`, y la regla reventaba al leerlo. */
const uidBea = await entrarComo(BEA.email, BEA.pass, BEA.nombre);
await store.claimUsername('beita');
await store.publishProfile();

const seguido = await social.follow(uidAna);
comprobar('seguir · Bea sigue a Ana', seguido.ok === true, JSON.stringify(seguido));
comprobar('seguir · queda la flecha', (await social.isFollowing(uidAna)) === true);

const cuentas = await social.followCounts(uidAna);
comprobar('seguir · Ana tiene una seguidora', cuentas.seguidoras === 1, JSON.stringify(cuentas));

/* El feed de Bea tiene que traer lo de Ana: es la prueba de que la
   actividad se escribió Y se lee. */
const feedBea = await social.loadFeed({ tope: 20 });
comprobar('feed · Bea ve la actividad de Ana', feedBea.entradas.some((e) => e.uid === uidAna),
  `entradas=${feedBea.entradas.length}`);

/* ═══ 5 · BUSCAR PERSONAS  ·  #47 ═════════════════════════════ */
const encontradas = await social.searchPeople('@anita');
comprobar('buscar · encuentro a @anita', encontradas.some((p) => p.uid === uidAna),
  `resultados=${encontradas.length}`);

/* ═══ 6 · COMENTAR Y AVISAR  ·  #50 ═══════════════════════════
   El aviso se escribía con un identificador que ninguna regla
   permitía: el comentario se publicaba y el aviso no llegaba nunca. */
const comentado = await moderation.addComment(`${uidAna}_${LIBRO_A}`, uidAna, 'Me encantó este.');
comprobar('comentario · se publica', comentado.ok === true, JSON.stringify(comentado));

const comentarios = await moderation.loadComments(`${uidAna}_${LIBRO_A}`);
comprobar('comentario · se lee', comentarios.length === 1, `n=${comentarios.length}`);

const reaccion = await moderation.react(`${uidAna}_${LIBRO_A}`, '❤️');
comprobar('reacción · se guarda', reaccion?.[uidBea] === '❤️', JSON.stringify(reaccion));

await esperar(300);
await entrarComo(ANA.email, ANA.pass, ANA.nombre);
const avisos = await social.myNotices();
comprobar('aviso · a Ana le llega el del seguimiento', avisos.some((a) => a.tipo === 'follow'),
  JSON.stringify(avisos.map((a) => a.tipo)));
comprobar('aviso · a Ana le llega el del COMENTARIO', avisos.some((a) => a.tipo === 'comment'),
  JSON.stringify(avisos.map((a) => a.tipo)));

/* ═══ 7 · BLOQUEAR  ·  #51 ════════════════════════════════════ */
const bloqueado = await moderation.block(uidBea);
comprobar('bloqueo · Ana bloquea a Bea', bloqueado.ok === true, JSON.stringify(bloqueado));

await entrarComo(BEA.email, BEA.pass, BEA.nombre);
const trasBloqueo = await moderation.addComment(`${uidAna}_${LIBRO_B}`, uidAna, 'Otro comentario');
comprobar('bloqueo · Bea ya no puede comentarle', trasBloqueo.ok === false,
  JSON.stringify(trasBloqueo));

/* ═══ 8 · CUENTA PRIVADA  ·  #52 ══════════════════════════════
   El circuito entero de la cuenta privada, que tampoco había tocado
   nunca un servidor: no me puedes seguir → te lo pido → aceptas → y
   solo entonces se lee mi parte reservada. */
await moderation.unblock(uidBea).then(() => {}, () => {});
await entrarComo(ANA.email, ANA.pass, ANA.nombre);
await moderation.unblock(uidBea);

store.updateSettings({ privada: true });
await store.flush();
await store.publishProfile();
comprobar('privada · queda marcada', store.soyPrivada() === true);

/* La parte reservada tiene que EXISTIR: si la cuenta privada no
   escribiera nada en profiles/{uid}/full/data, no habría nada que
   proteger y tampoco nada que enseñar a quien te sigue. */
const cris = { email: 'cris@ejemplo.test', pass: 'secreto123', nombre: 'Cris' };
const uidCris = await entrarComo(cris.email, cris.pass, cris.nombre);
await store.claimUsername('crisita');

const intentoDirecto = await social.follow(uidAna);
comprobar('privada · seguirla directamente NO se puede', intentoDirecto.ok === false,
  JSON.stringify(intentoDirecto));

const nadaTodavia = await social.fetchFullProfile(uidAna);
comprobar('privada · sin seguirla no se lee su parte reservada', !nadaTodavia,
  JSON.stringify(nadaTodavia));

const pedida = await social.pedirSeguir(uidAna);
comprobar('privada · le pido seguirla', pedida.ok === true, JSON.stringify(pedida));
comprobar('privada · la solicitud queda pendiente', (await social.haySolicitud(uidAna)) === true);

await entrarComo(ANA.email, ANA.pass, ANA.nombre);
const solicitudes = await social.misSolicitudes();
comprobar('privada · Ana ve la solicitud', solicitudes.some((s) => s.de === uidCris),
  `n=${solicitudes.length}`);

const aceptada = await social.aceptarSolicitud(uidCris);
comprobar('privada · Ana la acepta', aceptada.ok === true, JSON.stringify(aceptada));

await entrarComo(cris.email, cris.pass, cris.nombre);
comprobar('privada · ahora sí la sigo', (await social.isFollowing(uidAna)) === true);
const yaSePuede = await social.fetchFullProfile(uidAna);
comprobar('privada · ahora sí se lee su parte reservada', Boolean(yaSePuede),
  JSON.stringify(yaSePuede).slice(0, 120));

/* ═══ 9 · INTERCAMBIO  ·  #81 #82 #89 ═════════════════════════
   Publicar exige correo verificado, y eso lo comprueba el SERVIDOR con
   el token firmado. Se verifica por el camino de verdad: se pide el
   correo y se aplica el código que da el emulador. */
await entrarComo(BEA.email, BEA.pass, BEA.nombre);
await verificarCorreo(BEA.email);

store.setPlace({ country: 'Colombia', city: 'Bogotá', area: 'Chapinero', lat: 4.65, lon: -74.06 });
await store.flush();
const sitio = store.myPlace();
comprobar('intercambio · la ciudad se guarda', sitio?.city === 'Bogotá', JSON.stringify(sitio));
comprobar('intercambio · NO se guardan las coordenadas',
  !('lat' in sitio) && !('lon' in sitio), JSON.stringify(sitio));
comprobar('intercambio · el geohash va recortado a 6', sitio?.geohash?.length === 6,
  String(sitio?.geohash));

store.updateEntry(LIBRO_A, { status: 'read' });
await store.flush();
const publicado = await swap.publicar(store.findBook(LIBRO_A), {
  estado: 'bueno', nota: 'Subrayado a lápiz', suelto: true,
});
comprobar('intercambio · se publica', publicado.ok === true, JSON.stringify(publicado).slice(0, 160));
comprobar('intercambio · la publicación no lleva ubicación exacta',
  publicado.publicacion && !('lat' in publicado.publicacion) && !('lon' in publicado.publicacion));
comprobar('intercambio · y no lleva precio',
  publicado.publicacion && !('precio' in publicado.publicacion));

const mias = await swap.misPublicaciones();
comprobar('intercambio · la veo entre las mías', mias.some((p) => p.id === publicado.id),
  `n=${mias.length}`);

const retirado = await swap.retirar(publicado.id);
comprobar('intercambio · la retiro', retirado.ok === true, JSON.stringify(retirado));
const trasRetirar = await swap.misPublicaciones();
comprobar('intercambio · retirar MARCA, no borra',
  trasRetirar.some((p) => p.id === publicado.id && p.activa === false));
comprobar('intercambio · la vuelvo a ofrecer',
  (await swap.volverAPublicar(publicado.id)).ok === true);

/* Y que otra persona la encuentre, que es para lo que existe. */
await entrarComo(cris.email, cris.pass, cris.nombre);
const enBogota = await getDocs(query(
  collection(db, 'swaps'), where('cityKey', '==', 'bogota'), limit(20),
));
comprobar('intercambio · otra persona la encuentra por ciudad',
  enBogota.docs.some((d) => d.id === publicado.id), `n=${enBogota.size}`);

/* ═══ 10 · EXPLORAR Y PEDIR  ·  #83 y #84 ═════════════════════
   El circuito entero del trueque entre dos personas, con el código
   real: Cris encuentra el libro de Bea, se lo pide, Bea contrapropone
   y Cris cierra. Es la parte donde dos desconocidas quedan en acuerdo,
   así que se comprueba cada paso y sobre todo los que NO se pueden
   dar. */
const explore = await import('../src/explore.js');
const requests = await import('../src/requests.js');

/* Cris está en la misma ciudad que Bea: si no, no se encontrarían. */
store.setPlace({ country: 'Colombia', city: 'Bogotá', area: 'Teusaquillo' });
await store.flush();
await moderation.loadMyBlocks();

const enMiCiudad = await explore.explorar('ciudad');
comprobar('explorar · sale el libro de Bea', enMiCiudad.publicaciones.some((p) => p.id === publicado.id),
  `n=${enMiCiudad.publicaciones.length}`);
comprobar('explorar · lo mío no se explora',
  enMiCiudad.publicaciones.every((p) => p.uid !== uidCris));

const suya = enMiCiudad.publicaciones.find((p) => p.id === publicado.id);
comprobar('explorar · lo que llega NO trae ubicación exacta',
  suya && !('lat' in suya) && !('lon' in suya) && !('address' in suya));

/* Pedirlo, ofreciendo un libro leído. */
store.updateEntry(LIBRO_B, { status: 'read' });
await store.flush();
const solicitado = await requests.solicitar(suya, {
  ofrezco: [store.findBook(LIBRO_B)], mensaje: 'Me interesa mucho',
});
comprobar('pedir · Cris se lo pide', solicitado.ok === true, JSON.stringify(solicitado).slice(0, 160));
comprobar('pedir · queda pendiente', solicitado.solicitud?.estado === 'pendiente');

const repetida = await requests.solicitar(suya, { suelto: true });
comprobar('pedir · no se pide dos veces lo mismo', repetida.ok === false && repetida.yaEsta === true,
  JSON.stringify(repetida));

/* Bea la recibe y contrapropone. */
await entrarComo(BEA.email, BEA.pass, BEA.nombre);
const recibidas = await requests.misRecibidas();
const suSolicitud = recibidas.find((s) => s.de === uidCris);
comprobar('pedir · Bea la ve entre las recibidas', Boolean(suSolicitud), `n=${recibidas.length}`);

const avisosBea = await social.myNotices();
comprobar('pedir · a Bea le llega el aviso', avisosBea.some((a) => a.tipo === 'swapreq'),
  JSON.stringify(avisosBea.map((a) => a.tipo)));

const contra = await requests.responder(suSolicitud, 'contrapropuesta', {
  pido: [], mensaje: 'Ese no, ¿tienes otro?',
});
comprobar('responder · Bea contrapropone', contra.ok === true, JSON.stringify(contra).slice(0, 140));

const noPuedeCerrar = await requests.responder(
  { ...suSolicitud, estado: 'contrapropuesta' }, 'aceptada',
);
comprobar('responder · Bea NO cierra su propia contrapropuesta', noPuedeCerrar.ok === false,
  JSON.stringify(noPuedeCerrar));

/* Cris cierra. */
await entrarComo(cris.email, cris.pass, cris.nombre);
const misSolicitudes = await requests.misEnviadas();
const laMia = misSolicitudes.find((s) => s.swapId === publicado.id);
comprobar('responder · Cris la ve con la contrapropuesta',
  laMia?.estado === 'contrapropuesta', JSON.stringify(laMia?.estado));

const cerrada = await requests.responder(laMia, 'aceptada');
comprobar('responder · Cris acepta', cerrada.ok === true, JSON.stringify(cerrada).slice(0, 140));

const yaCerrada = await requests.responder({ ...laMia, estado: 'aceptada' }, 'cancelada');
comprobar('responder · lo aceptado ya no se retira', yaCerrada.ok === false,
  JSON.stringify(yaCerrada));

/* ═══ 11 · EL CHAT, CONFIRMAR Y VALORAR  ·  #85, #86, #88 ═════
   La parte donde dos desconocidas quedan en persona. Lo que se prueba
   aquí no es solo que funcione, sino que NO se pueda abrir un chat sin
   trato aceptado ni valorar a quien no has visto. */
const chatMod = await import('../src/chat.js');

const chatAbierto = await chatMod.abrirChat({ ...laMia, estado: 'aceptada' });
comprobar('chat · se abre sobre el trato aceptado', chatAbierto.ok === true,
  JSON.stringify(chatAbierto).slice(0, 160));

const elChat = chatAbierto.chat;
comprobar('chat · las dos partes están dentro',
  (elChat?.partes || []).includes(uidCris) && (elChat?.partes || []).includes(uidBea),
  JSON.stringify(elChat?.partes));

const escrito = await chatMod.mandar(elChat.id, '¿Te va bien el sábado en la biblioteca?');
comprobar('chat · Cris escribe', escrito.ok === true, JSON.stringify(escrito));

/* Sin trato aceptado no hay chat: se intenta sobre una solicitud
   inventada y tiene que fallar. */
const sinTrato = await chatMod.abrirChat({
  id: `${uidCris}_inventada`, de: uidCris, para: uidBea, estado: 'pendiente', swapId: 'inventada',
});
comprobar('chat · NO se abre sin haber aceptado', sinTrato.ok === false,
  JSON.stringify(sinTrato));

/* Valorar antes de confirmar: no. */
const prontoDemas = await chatMod.valorar(elChat, { puntualidad: 5, estado: 5, trato: 5 });
comprobar('valorar · antes de confirmar, no', prontoDemas.ok === false,
  JSON.stringify(prontoDemas));

/* Confirmar por los dos lados. */
const unaSola = await chatMod.confirmarIntercambio(elChat);
comprobar('confirmar · Cris confirma', unaSola.ok === true, JSON.stringify(unaSola).slice(0, 140));
comprobar('confirmar · con una sola NO está hecho', unaSola.chat?.completado !== true);

await entrarComo(BEA.email, BEA.pass, BEA.nombre);
const susChats = await chatMod.misChats();
const mismoChat = susChats.find((c) => c.id === elChat.id);
comprobar('chat · Bea lo ve entre los suyos', Boolean(mismoChat), `n=${susChats.length}`);

const ambas = await chatMod.confirmarIntercambio(mismoChat);
comprobar('confirmar · Bea confirma y queda hecho', ambas.chat?.completado === true,
  JSON.stringify(ambas).slice(0, 140));

/* Y ahora sí, valorar. */
const valorado = await chatMod.valorar(ambas.chat, {
  puntualidad: 5, estado: 4, trato: 5, comentario: 'Puntual y maja',
});
comprobar('valorar · después de confirmar, sí', valorado.ok === true, JSON.stringify(valorado).slice(0, 140));

const repetida2 = await chatMod.valorar(ambas.chat, { puntualidad: 1, estado: 1, trato: 1 });
comprobar('valorar · no se valora dos veces', repetida2.ok === false, JSON.stringify(repetida2));

const suyas = await chatMod.valoracionesDe(uidCris);
comprobar('valorar · la valoración se lee para el perfil', suyas.length === 1, `n=${suyas.length}`);

/* ═══ RESULTADO ═══════════════════════════════════════════════ */
await auth.logOut().catch(() => {});

if (!fallos.length) {
  console.log(`\n  ✓ ${pasan} pasos del circuito, con el código real. Sin fallos.\n`);
  process.exit(0);
}

console.log(`\n  ${pasan} correctos, ${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f.nombre}${f.detalle ? `\n      ${f.detalle}` : ''}`);
console.log('');
process.exit(1);
