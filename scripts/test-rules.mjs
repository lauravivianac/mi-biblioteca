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
