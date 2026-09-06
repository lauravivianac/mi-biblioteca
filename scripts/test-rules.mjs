/* ─────────────────────────────────────────────────────────────
   LAS REGLAS DE VERDAD, CONTRA FIRESTORE DE VERDAD

   Para ejecutarlo:
     npm run test:rules

   Eso levanta el emulador oficial de Firestore, le da
   `firestore.rules` tal cual está en el repo, y hace contra él las
   MISMAS lecturas y escrituras que hace la app. No hay dobles: es el
   motor de reglas de Google.

   POR QUÉ EXISTE ESTE FICHERO. Todo lo social de esta app se había
   comprobado contra un doble de Firestore escrito a mano, y ese doble
   mintió tres veces: aceptó una ruta imposible, concedió una lectura
   que la regla deniega, y devolvió menos de lo que devuelve el
   original. La primera vez que se pasaron estas mismas rutas por el
   emulador aparecieron tres fallos que llevaban meses ahí:

   1. NO SE PODÍA SEGUIR A NADIE. La función `esPrivada` leía
      `.data.privada`, y en el motor de reglas leer un campo que no
      está no da «falso»: da un error de evaluación, y una regla que
      revienta deniega. Cualquier perfil sin ese campo era imposible de
      seguir.
   2. EL FEED NO EXISTÍA. La colección `activity` no tenía regla
      ninguna, así que la denegaba el «todo lo demás, cerrado» del
      final. Ni una entrada llegó a guardarse nunca.
   3. NO LLEGABA NINGÚN AVISO DE COMENTARIO. La regla de `notifs` solo
      casaba con `follow_…` y la app escribía `comment_…`.

   Ninguno de los tres se veía leyendo el fichero. Por eso esto se
   ejecuta y no se lee.

   Va aparte de `npm test` a propósito: necesita Java y descargar el
   emulador, y el resto de la batería tiene que poder correr sin nada.
   ───────────────────────────────────────────────────────────── */

import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, deleteDoc, updateDoc, collection, getDocs,
  query, where, limit, addDoc,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const env = await initializeTestEnvironment({
  projectId: process.env.GCLOUD_PROJECT || 'demo-biblioteca',
  firestore: { rules: readFileSync(join(raiz, 'firestore.rules'), 'utf8') },
});

/* El emulador guarda la base entre pasadas. Sin esto, la segunda
   ejecución falla por lo que escribió la primera y no por las reglas
   — que es exactamente la clase de mentira que este fichero existe
   para evitar. */
await env.clearFirestore();

const ANA = 'ana';
const BEA = 'bea';
const CRIS = 'cris';

const ctx = (uid, extra = {}) => env.authenticatedContext(uid, { email_verified: true, ...extra });
const anon = () => env.unauthenticatedContext();
const seed = (fn) => env.withSecurityRulesDisabled((c) => fn(c.firestore()));

let pasan = 0;
const fallos = [];

/** Esto la app lo hace y tiene que poder hacerlo. */
async function ok(nombre, fn) {
  try { await assertSucceeds(fn()); pasan++; } catch {
    fallos.push({ nombre, esperado: 'PERMITIDO', real: 'DENEGADO' });
  }
}
/** Esto no lo puede hacer nadie, y da igual lo que diga el cliente. */
async function no(nombre, fn) {
  try { await assertFails(fn()); pasan++; } catch {
    fallos.push({ nombre, esperado: 'DENEGADO', real: 'PERMITIDO' });
  }
}

/* ═══ LO PRIVADO SIGUE SIENDO PRIVADO ═════════════════════════ */
{
  const a = ctx(ANA).firestore();
  const b = ctx(BEA).firestore();
  await ok('users · escribo lo mío', () => setDoc(doc(a, 'users', ANA), { goal: 24 }));
  await ok('users · mis libros', () => setDoc(doc(a, 'users', ANA, 'books', 'b1'), { status: 'read' }));
  await no('users · nadie lee mi biblioteca', () => getDoc(doc(b, 'users', ANA)));
}

/* ═══ EL @USUARIO  ·  #44 ═════════════════════════════════════ */
{
  const a = ctx(ANA).firestore();
  const b = ctx(BEA).firestore();
  await ok('@usuario · reclamo el mío', () => setDoc(doc(a, 'usernames', 'laura'), { uid: ANA, at: 1 }));
  await no('@usuario · no piso el de otra', () => setDoc(doc(b, 'usernames', 'laura'), { uid: BEA, at: 1 }));
  await ok('@usuario · se lee sin sesión (link #48)',
    () => getDoc(doc(anon().firestore(), 'usernames', 'laura')));
  await no('@usuario · mayúsculas fuera', () => setDoc(doc(a, 'usernames', 'Laura2'), { uid: ANA }));
  await no('@usuario · reservados fuera', () => setDoc(doc(a, 'usernames', 'soporte'), { uid: ANA }));
  await ok('@usuario · lo suelto', () => deleteDoc(doc(a, 'usernames', 'laura')));
}

/* ═══ EL PERFIL PÚBLICO  ·  #45 #48 #52 ═══════════════════════ */
{
  const a = ctx(ANA).firestore();
  const b = ctx(BEA).firestore();
  await ok('perfil · publico el mío', () => setDoc(doc(a, 'profiles', ANA), { uid: ANA, username: 'ana' }));
  await no('perfil · no publico uno ajeno', () => setDoc(doc(b, 'profiles', ANA), { uid: ANA }));
  await ok('perfil · se lee sin sesión (#48)', () => getDoc(doc(anon().firestore(), 'profiles', ANA)));
  await ok('perfil · escribo mi parte reservada', () => setDoc(doc(a, 'profiles', ANA, 'full', 'data'), { bio: 'x' }));
  await no('perfil · sin seguirme no se lee (#52)', () => getDoc(doc(b, 'profiles', ANA, 'full', 'data')));

  await seed((db) => setDoc(doc(db, 'follows', `${BEA}_${ANA}`), { follower: BEA, following: ANA }));
  await ok('perfil · siguiéndome sí (#52)', () => getDoc(doc(b, 'profiles', ANA, 'full', 'data')));
}

/* ═══ SEGUIR  ·  #46 #52 ══════════════════════════════════════
   El primer caso de abajo es el que estuvo roto: el perfil de Ana
   existe y NO tiene el campo `privada`, que es como lo publica
   cualquiera que no haya tocado ese ajuste. Antes del arreglo,
   seguirla era imposible.

   SOBRE EL «evaluation error» QUE SALE AL DENEGAR. Al denegar el
   seguimiento a una cuenta privada, el motor imprime un «evaluation
   error» en la traza en vez de un «false» limpio. Se acotó con el
   fichero de reglas real, quitando una pieza cada vez:

     reglas tal cual .................. error de evaluación
     sin la rama de «aceptar» ......... error de evaluación
     esPrivada sin get(), constante ... denegado limpio

   O sea: aparece cuando la condición que deniega pasó por un `get()`,
   y desaparece al quitarlo dejando la misma decisión. NO CAMBIA LA
   DECISIÓN — en Firestore una regla que revienta deniega, y denegar es
   justo lo que toca aquí. Lo que sí importa es que ninguna de las
   formas que SÍ deben dejar seguir se vea afectada, y por eso están
   las tres probadas abajo. */
{
  const b = ctx(BEA).firestore();
  const c = ctx(CRIS).firestore();
  await ok('seguir · a una cuenta pública SIN el campo privada', () =>
    setDoc(doc(c, 'follows', `${CRIS}_${ANA}`), { follower: CRIS, following: ANA, at: 1 }));

  /* Las tres formas que puede tener un perfil, porque las tres existen
     ahí fuera y la rota era solo una: sin el campo (perfiles viejos y
     escrituras parciales), con `privada: false` (lo que publica el
     código de hoy) y sin perfil ninguno. Las tres tienen que dejar
     seguir; probar solo una dejaba pasar el fallo. */
  await seed((db) => setDoc(doc(db, 'profiles', 'dana'), { uid: 'dana', privada: false }));
  await ok('seguir · a una cuenta con privada:false', () =>
    setDoc(doc(c, 'follows', `${CRIS}_dana`), { follower: CRIS, following: 'dana', at: 1 }));
  await ok('seguir · a quien no ha publicado perfil', () =>
    setDoc(doc(c, 'follows', `${CRIS}_efe`), { follower: CRIS, following: 'efe', at: 1 }));
  await no('seguir · no fabrico la flecha de otra', () =>
    setDoc(doc(c, 'follows', `${BEA}_${ANA}`), { follower: BEA, following: ANA }));
  await ok('seguir · se leen las flechas', () =>
    getDocs(query(collection(b, 'follows'), where('following', '==', ANA), limit(10))));
  await ok('seguir · dejo de seguir', () => deleteDoc(doc(c, 'follows', `${CRIS}_${ANA}`)));

  await seed((db) => setDoc(doc(db, 'profiles', CRIS), { uid: CRIS, privada: true }));
  await no('privada · no la sigo sin permiso (#52)', () =>
    setDoc(doc(b, 'follows', `${BEA}_${CRIS}`), { follower: BEA, following: CRIS }));
  await ok('privada · pido seguirla', () =>
    setDoc(doc(b, 'followRequests', `${CRIS}_${BEA}`), { de: BEA, a: CRIS, at: 1 }));
  await ok('privada · ella acepta y escribe la flecha', () =>
    setDoc(doc(c, 'follows', `${BEA}_${CRIS}`), { follower: BEA, following: CRIS, at: 1 }));
}

/* ═══ LOS AVISOS  ·  #46 y #50 ════════════════════════════════ */
{
  const a = ctx(ANA).firestore();
  const b = ctx(BEA).firestore();
  await ok('aviso · de seguimiento', () =>
    setDoc(doc(a, 'notifs', BEA, 'items', `follow_${ANA}`), { tipo: 'follow', from: ANA, at: 1, leido: false }));
  await no('aviso · no leo la bandeja ajena', () => getDoc(doc(a, 'notifs', BEA, 'items', `follow_${ANA}`)));
  await ok('aviso · leo la mía', () => getDocs(query(collection(b, 'notifs', BEA, 'items'), limit(10))));
  await ok('aviso · la marco leída', () =>
    updateDoc(doc(b, 'notifs', BEA, 'items', `follow_${ANA}`), { leido: true }));

  await ok('aviso · de COMENTARIO (#50)', () =>
    setDoc(doc(a, 'notifs', BEA, 'items', `comment_${ANA}`), {
      tipo: 'comment', from: ANA, target: `${BEA}_b1`, at: 1, leido: false,
    }));
  await ok('aviso · el segundo comentario refresca el mismo', () =>
    setDoc(doc(a, 'notifs', BEA, 'items', `comment_${ANA}`), {
      tipo: 'comment', from: ANA, target: `${BEA}_b2`, at: 2, leido: false,
    }));
  await no('aviso · no inundo una bandeja con identificadores libres', () =>
    setDoc(doc(a, 'notifs', BEA, 'items', `comment_${ANA}_${BEA}_b3`), { tipo: 'comment', from: ANA, at: 3 }));
  await no('aviso · no lo firmo con el nombre de otra', () =>
    setDoc(doc(a, 'notifs', BEA, 'items', `follow_${CRIS}`), { tipo: 'follow', from: CRIS, at: 1 }));
}

/* ═══ EL FEED  ·  #49 ═════════════════════════════════════════ */
{
  const a = ctx(ANA).firestore();
  const b = ctx(BEA).firestore();
  await ok('feed · publico mi actividad', () =>
    setDoc(doc(a, 'activity', `${ANA}_termino_b1`), {
      uid: ANA, tipo: 'termino', bookId: 'b1', title: 'T', at: 1,
    }));
  await ok('feed · lo leo de a quién sigo', () =>
    getDocs(query(collection(b, 'activity'), where('uid', 'in', [ANA]), limit(10))));
  await no('feed · no publico en nombre de otra', () =>
    setDoc(doc(b, 'activity', `${ANA}_termino_b2`), { uid: ANA, tipo: 'termino', bookId: 'b2', at: 1 }));
  await no('feed · no escribo fuera de mi espacio de nombres', () =>
    setDoc(doc(b, 'activity', `${ANA}_termino_b3`), { uid: BEA, tipo: 'termino', bookId: 'b3', at: 1 }));
  await ok('feed · borro lo mío', () => deleteDoc(doc(a, 'activity', `${ANA}_termino_b1`)));
}

/* ═══ RESEÑAS PÚBLICAS  ·  #28 ════════════════════════════════ */
{
  const a = ctx(ANA).firestore();
  const b = ctx(BEA).firestore();
  await ok('reseña · publico la mía', () =>
    setDoc(doc(a, 'reviews', ANA, 'entries', 'b1'), { uid: ANA, texto: 'buena', rating: 5 }));
  await ok('reseña · leo las de otra', () => getDocs(collection(b, 'reviews', ANA, 'entries')));
  await no('reseña · no escribo en las de otra', () =>
    setDoc(doc(b, 'reviews', ANA, 'entries', 'b2'), { texto: 'x' }));
}

/* ═══ COMENTARIOS, REACCIONES Y BLOQUEO  ·  #50 #51 ═══════════ */
{
  const a = ctx(ANA).firestore();
  const b = ctx(BEA).firestore();
  await ok('comentario · comento', () =>
    addDoc(collection(b, 'comments', `${ANA}_b1`, 'items'), {
      uid: BEA, target: `${ANA}_b1`, targetOwner: ANA, texto: 'hola', at: 1,
    }));
  await ok('comentario · se leen', () => getDocs(collection(a, 'comments', `${ANA}_b1`, 'items')));
  await no('comentario · no lo firmo con otro uid', () =>
    addDoc(collection(b, 'comments', `${ANA}_b1`, 'items'), {
      uid: CRIS, target: `${ANA}_b1`, targetOwner: ANA, texto: 'x', at: 1,
    }));
  await no('comentario · vacío no', () =>
    addDoc(collection(b, 'comments', `${ANA}_b1`, 'items'), {
      uid: BEA, target: `${ANA}_b1`, targetOwner: ANA, texto: '', at: 1,
    }));

  await ok('reacción · reacciono', () =>
    setDoc(doc(b, 'reactions', `${ANA}_b1`), { de: { [BEA]: '❤️' } }, { merge: true }));
  await no('reacción · no borro la de otra', () =>
    setDoc(doc(a, 'reactions', `${ANA}_b1`), { de: { [BEA]: null } }));

  /* EL CASO QUE ROMPÍA BLOQUEAR. `block()` manda un lote que borra las
     dos flechas de seguimiento y el aviso, y esos documentos casi nunca
     existen los tres —bloqueas a gente que no te sigue—. Borrar lo que
     no está reventaba la evaluación de la regla, y con una sola
     operación denegada cae el lote entero: bloquear no funcionaba. */
  await ok('bloqueo · borrar una flecha que no existe (lote de block)', () =>
    deleteDoc(doc(a, 'follows', `${ANA}_noExiste`)));
  await ok('bloqueo · borrar un aviso que no existe (lote de block)', () =>
    deleteDoc(doc(a, 'notifs', 'noExiste', 'items', `follow_${ANA}`)));

  await ok('bloqueo · bloqueo', () => setDoc(doc(a, 'blocks', `${ANA}_${BEA}`), { de: ANA, a: BEA, at: 1 }));
  await no('bloqueo · quien me bloqueó ya no me escribe (#51)', () =>
    addDoc(collection(b, 'comments', `${ANA}_b9`, 'items'), {
      uid: BEA, target: `${ANA}_b9`, targetOwner: ANA, texto: 'oye', at: 1,
    }));
  await ok('bloqueo · leo mi lista', () =>
    getDocs(query(collection(a, 'blocks'), where('de', '==', ANA), limit(10))));
  await ok('silencio · silencio', () => setDoc(doc(a, 'mutes', `${ANA}_${CRIS}`), { de: ANA, a: CRIS, at: 1 }));
  await ok('silencio · leo mi lista', () =>
    getDocs(query(collection(a, 'mutes'), where('de', '==', ANA), limit(10))));
}

/* ═══ REPORTES  ·  #51 ════════════════════════════════════════ */
{
  const a = ctx(ANA).firestore();
  await ok('reporte · reporto', () =>
    addDoc(collection(a, 'reports'), {
      de: ANA, sobre: BEA, tipo: 'perfil', motivo: 'acoso', estado: 'pendiente',
    }));
  await no('reporte · no se leen desde la app', () => getDocs(collection(a, 'reports')));
}

/* ═══ INTERCAMBIO  ·  #81 #82 #89 ═════════════════════════════ */
{
  const a = ctx(ANA).firestore();
  const b = ctx(BEA).firestore();
  const sinVerificar = env.authenticatedContext('dana', { email_verified: false }).firestore();
  const base = {
    uid: ANA, bookId: 'b1', title: 'T', author: 'A',
    city: 'Bogotá', cityKey: 'bogota', geohash: 'd2g6xp', activa: true, at: 1,
  };
  await ok('intercambio · publico', () => addDoc(collection(a, 'swaps'), base));
  await no('intercambio · sin correo verificado no (#89)',
    () => addDoc(collection(sinVerificar, 'swaps'), { ...base, uid: 'dana' }));
  await no('intercambio · con lat/lon no (#81)',
    () => addDoc(collection(a, 'swaps'), { ...base, lat: 4.6, lon: -74 }));
  await no('intercambio · con dirección no (#81)',
    () => addDoc(collection(a, 'swaps'), { ...base, address: 'Calle 1' }));
  await no('intercambio · con precio no (#82)',
    () => addDoc(collection(a, 'swaps'), { ...base, precio: 20 }));
  await no('intercambio · geohash largo no (#81)',
    () => addDoc(collection(a, 'swaps'), { ...base, geohash: 'd2g6xpqrst' }));
  await no('intercambio · sin ciudad no', () => addDoc(collection(a, 'swaps'), { ...base, city: '' }));

  await seed((db) => setDoc(doc(db, 'swaps', 's1'), base));
  await ok('intercambio · lo explora cualquiera con sesión (#83)', () =>
    getDocs(query(collection(b, 'swaps'), where('cityKey', '==', 'bogota'), limit(20))));
  await ok('intercambio · retiro el mío', () =>
    setDoc(doc(a, 'swaps', 's1'), { activa: false }, { merge: true }));
  await no('intercambio · no retiro el de otra', () =>
    setDoc(doc(b, 'swaps', 's1'), { activa: false }, { merge: true }));
}

/* ═══ SOLICITUDES DE INTERCAMBIO  ·  #84 ══════════════════════
   La máquina de estados, contra el motor de verdad. Lo que importa no
   es que se pueda pedir, sino que NADIE PUEDA MARCAR COMO ACEPTADA una
   solicitud que la otra persona no aceptó: aceptar es lo que abre el
   chat y lleva a un encuentro en persona. */
{
  const a = ctx(ANA).firestore();
  const b = ctx(BEA).firestore();
  const c = ctx(CRIS).firestore();
  const base = {
    de: BEA, deNombre: 'Bea', deUsuario: 'beita', para: ANA,
    swapId: 's1', bookId: 'b1', title: 'T', author: 'A',
    ofrezco: [], suelto: true, mensaje: 'me interesa', estado: 'pendiente',
    at: 1, actualizado: 1,
  };
  const id = `${BEA}_s1`;

  await ok('solicitud · Bea la manda', () => setDoc(doc(b, 'swapRequests', id), base));
  await no('solicitud · el identificador tiene que ser suyo', () =>
    setDoc(doc(b, 'swapRequests', `${CRIS}_s1`), { ...base, de: CRIS }));
  await no('solicitud · no la firma con el nombre de otra', () =>
    setDoc(doc(c, 'swapRequests', `${CRIS}_s9`), { ...base, de: BEA, swapId: 's9' }));
  await no('solicitud · no se pide a una misma', () =>
    setDoc(doc(b, 'swapRequests', `${BEA}_s2`), { ...base, para: BEA, swapId: 's2' }));
  await no('solicitud · con precio, no (#82)', () =>
    setDoc(doc(b, 'swapRequests', `${BEA}_s3`), { ...base, swapId: 's3', precio: 20 }));
  await no('solicitud · más de tres libros ofrecidos, no', () =>
    setDoc(doc(b, 'swapRequests', `${BEA}_s4`), {
      ...base, swapId: 's4', suelto: false,
      ofrezco: [{ bookId: '1' }, { bookId: '2' }, { bookId: '3' }, { bookId: '4' }],
    }));

  await ok('solicitud · la ven las dos partes', () => getDoc(doc(a, 'swapRequests', id)));
  await ok('solicitud · y quien la mandó', () => getDoc(doc(b, 'swapRequests', id)));
  await no('solicitud · nadie más la ve', () => getDoc(doc(c, 'swapRequests', id)));

  /* Lo que no puede pasar de ninguna manera. */
  await no('solicitud · quien pide NO puede aceptarse a sí misma', () =>
    setDoc(doc(b, 'swapRequests', id), { estado: 'aceptada' }, { merge: true }));
  await no('solicitud · una tercera no la toca', () =>
    setDoc(doc(c, 'swapRequests', id), { estado: 'aceptada' }, { merge: true }));
  await no('solicitud · no se cambia de quién es', () =>
    setDoc(doc(a, 'swapRequests', id), { de: CRIS, estado: 'aceptada' }, { merge: true }));
  await no('solicitud · no se cambia de qué libro habla', () =>
    setDoc(doc(a, 'swapRequests', id), { swapId: 's9', estado: 'aceptada' }, { merge: true }));

  /* El camino bueno: Ana contrapropone, Bea cierra. */
  await ok('solicitud · Ana contrapropone', () =>
    setDoc(doc(a, 'swapRequests', id), {
      estado: 'contrapropuesta', contraoferta: { pido: [], mensaje: '¿y aquel otro?' },
    }, { merge: true }));
  await no('solicitud · Ana no puede cerrar su propia contrapropuesta', () =>
    setDoc(doc(a, 'swapRequests', id), { estado: 'aceptada' }, { merge: true }));
  await ok('solicitud · Bea la acepta', () =>
    setDoc(doc(b, 'swapRequests', id), { estado: 'aceptada' }, { merge: true }));
  await no('solicitud · aceptada, ya no se retoca', () =>
    setDoc(doc(a, 'swapRequests', id), { estado: 'rechazada' }, { merge: true }));

  /* Retirar la propia, mientras siga viva. */
  const id2 = `${BEA}_s5`;
  await ok('solicitud · otra más', () =>
    setDoc(doc(b, 'swapRequests', id2), { ...base, swapId: 's5' }));
  await no('solicitud · Ana no puede retirar la de Bea', () =>
    setDoc(doc(a, 'swapRequests', id2), { estado: 'cancelada' }, { merge: true }));
  await ok('solicitud · Bea la retira', () =>
    setDoc(doc(b, 'swapRequests', id2), { estado: 'cancelada' }, { merge: true }));
  await ok('solicitud · y la puede borrar', () => deleteDoc(doc(b, 'swapRequests', id2)));

  /* Los avisos del intercambio, con el mismo tope que los demás. */
  await ok('aviso · de solicitud (#84)', () =>
    setDoc(doc(b, 'notifs', ANA, 'items', `swapreq_${BEA}`), { tipo: 'swapreq', from: BEA, at: 1 }));
  await ok('aviso · de respuesta (#84)', () =>
    setDoc(doc(a, 'notifs', BEA, 'items', `swapres_${ANA}`), { tipo: 'swapres', from: ANA, at: 1 }));
  await no('aviso · sin identificador libre tampoco aquí', () =>
    setDoc(doc(b, 'notifs', ANA, 'items', `swapreq_${BEA}_s1`), { tipo: 'swapreq', from: BEA, at: 1 }));
}

/* ═══ EL CHAT Y LAS VALORACIONES  ·  #85, #86, #88 ════════════
   La parte donde dos desconocidas quedan en persona. Lo que se prueba
   aquí no es que funcione, sino que NO se pueda abrir un chat con
   quien no aceptó nada, ni valorar a quien no has visto. */
{
  const a = ctx(ANA).firestore();
  const b = ctx(BEA).firestore();
  const c = ctx(CRIS).firestore();

  /* Ana bloqueó a Bea en la sección de comentarios y ese bloqueo sigue
     puesto. Se quita aquí a propósito: si no, el primer mensaje se
     deniega —correctamente— y la prueba diría que el chat no funciona
     cuando lo que falla es el montaje. */
  await seed((db) => deleteDoc(doc(db, 'blocks', `${ANA}_${BEA}`)));

  // Una solicitud aceptada entre Ana y Bea; y otra sin aceptar.
  await seed(async (db) => {
    await setDoc(doc(db, 'swapRequests', `${BEA}_sX`), {
      de: BEA, para: ANA, swapId: 'sX', estado: 'aceptada', at: 1,
    });
    await setDoc(doc(db, 'swapRequests', `${BEA}_sY`), {
      de: BEA, para: ANA, swapId: 'sY', estado: 'pendiente', at: 1,
    });
  });

  const chat = {
    partes: [ANA, BEA].sort(), solicitudId: `${BEA}_sX`, swapId: 'sX',
    title: 'Dune', dueño: ANA, recibe: BEA,
    confirmadoPor: [], completado: false, cerrado: false, at: 1, ultimoAt: 1,
  };

  await ok('chat · se abre sobre una solicitud aceptada', () =>
    setDoc(doc(b, 'chats', `${BEA}_sX`), chat));
  await no('chat · NO se abre sin haber aceptado', () =>
    setDoc(doc(b, 'chats', `${BEA}_sY`), { ...chat, solicitudId: `${BEA}_sY`, swapId: 'sY' }));
  await no('chat · una tercera no se cuela dentro', () =>
    setDoc(doc(c, 'chats', `${CRIS}_sX`), { ...chat, partes: [CRIS, ANA].sort() }));
  await no('chat · nadie de fuera lo lee', () => getDoc(doc(c, 'chats', `${BEA}_sX`)));
  await ok('chat · lo leen las dos partes', () => getDoc(doc(a, 'chats', `${BEA}_sX`)));
  await no('chat · no se cambia quiénes son las partes', () =>
    setDoc(doc(a, 'chats', `${BEA}_sX`), { partes: [ANA, CRIS].sort() }, { merge: true }));
  await no('chat · no se borra', () => deleteDoc(doc(a, 'chats', `${BEA}_sX`)));

  await ok('mensaje · Bea escribe', () =>
    addDoc(collection(b, 'chats', `${BEA}_sX`, 'mensajes'), { de: BEA, texto: '¿Cómo quedamos?', at: 1 }));
  await ok('mensaje · Ana lo lee', () => getDocs(collection(a, 'chats', `${BEA}_sX`, 'mensajes')));
  await no('mensaje · una tercera no lee la conversación', () =>
    getDocs(collection(c, 'chats', `${BEA}_sX`, 'mensajes')));
  await no('mensaje · no se firma con el nombre de otra', () =>
    addDoc(collection(b, 'chats', `${BEA}_sX`, 'mensajes'), { de: ANA, texto: 'x', at: 1 }));
  await no('mensaje · vacío no', () =>
    addDoc(collection(b, 'chats', `${BEA}_sX`, 'mensajes'), { de: BEA, texto: '', at: 1 }));
  /* Un mensaje YA ESCRITO no se toca. Se siembra con un identificador
     conocido para poder intentar pisarlo: `setDoc` sobre un id nuevo
     sería una creación, no una edición, y no probaría nada. */
  await seed((db) => setDoc(doc(db, 'chats', `${BEA}_sX`, 'mensajes', 'm1'), {
    de: BEA, texto: 'lo que dije', at: 2,
  }));
  await no('mensaje · lo ya escrito no se edita', () =>
    setDoc(doc(b, 'chats', `${BEA}_sX`, 'mensajes', 'm1'), { de: BEA, texto: 'yo no dije eso', at: 2 }));
  await no('mensaje · ni se borra', () =>
    deleteDoc(doc(b, 'chats', `${BEA}_sX`, 'mensajes', 'm1')));
  await no('mensaje · ni lo borra la otra parte', () =>
    deleteDoc(doc(a, 'chats', `${BEA}_sX`, 'mensajes', 'm1')));

  /* Bloquear cierra el chat por los dos lados. */
  await ok('bloqueo · Ana bloquea a Bea', () =>
    setDoc(doc(a, 'blocks', `${ANA}_${BEA}`), { de: ANA, a: BEA, at: 1 }));
  await no('chat · quien fue bloqueada ya no escribe (#85)', () =>
    addDoc(collection(b, 'chats', `${BEA}_sX`, 'mensajes'), { de: BEA, texto: 'hola?', at: 3 }));
  await ok('bloqueo · Ana lo deshace', () => deleteDoc(doc(a, 'blocks', `${ANA}_${BEA}`)));

  /* Valorar: solo tras completar, y solo las dos partes. */
  await no('valorar · NO se puede antes de completar (#86)', () =>
    setDoc(doc(a, 'swapRatings', `${BEA}_sX_${ANA}`), {
      de: ANA, sobre: BEA, chatIdent: `${BEA}_sX`,
      puntualidad: 5, estado: 5, trato: 5, media: 5, comentario: '', at: 1,
    }));

  await seed((db) => setDoc(doc(db, 'chats', `${BEA}_sX`), {
    ...chat, confirmadoPor: [ANA, BEA], completado: true, cerrado: true,
  }));

  await ok('valorar · ya completado, sí', () =>
    setDoc(doc(a, 'swapRatings', `${BEA}_sX_${ANA}`), {
      de: ANA, sobre: BEA, chatIdent: `${BEA}_sX`,
      puntualidad: 5, estado: 4, trato: 5, media: 4.67, comentario: 'Puntual', at: 2,
    }));
  await no('valorar · dos veces el mismo intercambio, no', () =>
    setDoc(doc(a, 'swapRatings', `${BEA}_sX_${ANA}`), {
      de: ANA, sobre: BEA, chatIdent: `${BEA}_sX`,
      puntualidad: 1, estado: 1, trato: 1, media: 1, comentario: '', at: 3,
    }));
  await no('valorar · quien no participó, no (#86)', () =>
    setDoc(doc(c, 'swapRatings', `${BEA}_sX_${CRIS}`), {
      de: CRIS, sobre: BEA, chatIdent: `${BEA}_sX`,
      puntualidad: 1, estado: 1, trato: 1, media: 1, comentario: '', at: 4,
    }));
  await no('valorar · no se valora a una misma', () =>
    setDoc(doc(b, 'swapRatings', `${BEA}_sX_${BEA}`), {
      de: BEA, sobre: BEA, chatIdent: `${BEA}_sX`,
      puntualidad: 5, estado: 5, trato: 5, media: 5, comentario: '', at: 5,
    }));
  await no('valorar · seis estrellas no existen', () =>
    setDoc(doc(b, 'swapRatings', `${BEA}_sX_${BEA}2`), {
      de: BEA, sobre: ANA, chatIdent: `${BEA}_sX`,
      puntualidad: 6, estado: 5, trato: 5, media: 5, comentario: '', at: 6,
    }));
  await ok('valorar · se leen para pintarlas en el perfil', () =>
    getDocs(query(collection(c, 'swapRatings'), where('sobre', '==', BEA), limit(20))));
  await no('valorar · una valoración no se borra ni se cambia', () =>
    deleteDoc(doc(b, 'swapRatings', `${BEA}_sX_${ANA}`)));
}

/* ═══ LAS ENTRADAS DEL BLOG  ·  #72 y #73 ═════════════════════
   La historia lo pide con estas palabras: «las reglas de Firestore
   hacen cumplir cada nivel, no solo la interfaz». Esto es esa
   comprobación. */
{
  const a = ctx(ANA).firestore();
  const b = ctx(BEA).firestore();
  const c = ctx(CRIS).firestore();

  const base = {
    uid: ANA, tipo: 'nota', titulo: 'Sobre Rulfo', cuerpo: 'El narrador miente',
    libros: [], pagina: null, ayudaDelAgente: false, at: 1, editado: null,
  };

  await ok('entrada · lo mío en mi cuenta', () =>
    setDoc(doc(a, 'users', ANA, 'posts', 'p1'), { ...base, visibilidad: 'privada' }));
  await no('entrada · nadie más entra en mi cuenta', () =>
    getDoc(doc(b, 'users', ANA, 'posts', 'p1')));

  await ok('entrada · publico una pública', () =>
    setDoc(doc(a, 'posts', 'p2'), { ...base, visibilidad: 'publica' }));
  await ok('entrada · publico una de seguidoras', () =>
    setDoc(doc(a, 'posts', 'p3'), { ...base, visibilidad: 'seguidoras' }));

  /* LO PRIVADO NO PUEDE LLEGAR AQUÍ, ni a mano. */
  await no('entrada · una PRIVADA no se copia fuera (#73)', () =>
    setDoc(doc(a, 'posts', 'p4'), { ...base, visibilidad: 'privada' }));
  await no('entrada · ni con una visibilidad inventada', () =>
    setDoc(doc(a, 'posts', 'p5'), { ...base, visibilidad: 'todoelmundo' }));
  await no('entrada · no publico en nombre de otra', () =>
    setDoc(doc(b, 'posts', 'p6'), { ...base, visibilidad: 'publica' }));

  /* Los tres niveles, aplicados. Cris NO sigue a Ana; Bea sí. */
  await seed((db) => setDoc(doc(db, 'follows', `${BEA}_${ANA}`), { follower: BEA, following: ANA }));

  await ok('nivel · la pública la lee cualquiera con sesión', () => getDoc(doc(c, 'posts', 'p2')));
  await ok('nivel · la de seguidoras la lee quien la sigue', () => getDoc(doc(b, 'posts', 'p3')));
  await no('nivel · la de seguidoras NO la lee quien no la sigue', () =>
    getDoc(doc(c, 'posts', 'p3')));
  await ok('nivel · su autora lee las suyas', () => getDoc(doc(a, 'posts', 'p3')));

  /* Las consultas: pedir solo lo que se puede leer. */
  await ok('consulta · lo público de Ana, sin seguirla', () =>
    getDocs(query(collection(c, 'posts'), where('uid', '==', ANA),
      where('visibilidad', 'in', ['publica']), limit(20))));
  await ok('consulta · siguiéndola, lo suyo menos lo privado', () =>
    getDocs(query(collection(b, 'posts'), where('uid', '==', ANA),
      where('visibilidad', 'in', ['seguidoras', 'publica']), limit(20))));
  await no('consulta · pedir de más deniega la consulta ENTERA', () =>
    getDocs(query(collection(c, 'posts'), where('uid', '==', ANA),
      where('visibilidad', 'in', ['seguidoras', 'publica']), limit(20))));

  await ok('entrada · su autora la despublica', () => deleteDoc(doc(a, 'posts', 'p3')));
  await no('entrada · nadie más la borra', () => deleteDoc(doc(b, 'posts', 'p2')));
}

/* ═══ LO QUE NO TIENE REGLA, SIGUE CERRADO ════════════════════
   El «todo lo demás, cerrado» del final es lo que convirtió la falta
   de una regla para `activity` en un feed vacío. Que siga ahí. */
{
  const a = ctx(ANA).firestore();
  await no('cerrado · una colección inventada', () => setDoc(doc(a, 'loQueSea', 'x'), { a: 1 }));
  await no('cerrado · la biblioteca vieja sin dueña', () => getDoc(doc(a, 'biblioteca', 'datos')));
}

await env.cleanup();

if (!fallos.length) {
  console.log(`\n  ✓ ${pasan} comprobaciones contra Firestore de verdad. Sin fallos.\n`);
  process.exit(0);
}

console.log(`\n  ${pasan} correctas, ${fallos.length} FALLOS:\n`);
for (const f of fallos) console.log(`  ✗ ${f.nombre}\n      esperaba ${f.esperado}, salió ${f.real}`);
console.log('');
process.exit(1);
