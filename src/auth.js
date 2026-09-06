/* ─────────────────────────────────────────────────────────────
   AUTENTICACIÓN  ·  historias #14, #15, #16, #20

   Email + Google + Apple.
   No Instagram: su API de login se apagó en diciembre de 2024 y
   su reemplazo solo acepta cuentas Business/Creator. Ver issue #3.
   ───────────────────────────────────────────────────────────── */

import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, sendEmailVerification, onAuthStateChanged,
  GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult,
  updateProfile, deleteUser, linkWithCredential, EmailAuthProvider,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { auth } from './firebase.js';
import { deleteAllUserData, flush } from './store.js';

/** Mensajes en español claro: qué pasó y cómo arreglarlo. */
const MESSAGES = {
  'auth/invalid-email': 'Ese correo no parece válido.',
  'auth/user-not-found': 'No hay ninguna cuenta con ese correo. ¿Quieres crearla?',
  'auth/wrong-password': 'La contraseña no coincide. Puedes restablecerla abajo.',
  'auth/invalid-credential': 'El correo o la contraseña no coinciden.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Inicia sesión.',
  'auth/weak-password': 'La contraseña necesita al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos seguidos. Espera un momento.',
  'auth/popup-closed-by-user': 'Se cerró la ventana antes de terminar.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana. Inténtalo otra vez.',
  'auth/cancelled-popup-request': 'Se abrió otra ventana de acceso. Inténtalo otra vez.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
  'auth/operation-not-allowed':
    'Ese método de inicio de sesión todavía no está habilitado en la consola de Firebase.',
  /* Este se ve así: la ventana de Google abre y se cierra sola, sin
     decir nada. Sin este mensaje salía «algo no salió bien», que manda
     a buscar el fallo justo donde no está. El dominio de cada preview
     de Vercel es distinto, y Firebase no admite comodines, así que
     pasa cada vez que se abre la app desde una URL nueva. */
  'auth/unauthorized-domain':
    `«${location.hostname}» no está autorizado en Firebase. Añádelo en `
    + 'Authentication → Settings → Authorized domains, o entra con correo '
    + 'y contraseña, que no depende del dominio.',
};

export const humanError = (e) =>
  MESSAGES[e?.code] || 'Algo no salió bien. Inténtalo de nuevo.';

export const currentUser = () => auth.currentUser;
export const watchAuth = (fn) => onAuthStateChanged(auth, fn);

export async function registerWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName) await updateProfile(cred.user, { displayName: displayName.trim() });
  // El correo verificado es requisito para publicar en intercambio más adelante (#89)
  sendEmailVerification(cred.user).catch(() => {});
  return cred.user;
}

export async function signInWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());

/* ── ENTRAR CON GOOGLE O APPLE ────────────────────────────────

   Esto era «en móvil el popup falla a menudo, así que redirect». Era
   verdad hace años y hoy es justo al revés: desde Safari 16.1 y desde
   que Chrome separa el almacenamiento por sitio, el redirect se rompe
   cuando la app NO se sirve del mismo dominio que el manejador de
   Firebase (…firebaseapp.com). La nuestra vive en vercel.app, así que
   se rompía: ibas a Google, elegías cuenta, volvías… y nada. En el
   móvil de Laura entraba desde el escritorio y no desde el teléfono, y
   esa era la razón.

   Ahora el popup es el camino en todas partes —en los navegadores
   móviles de hoy funciona— y el redirect queda solo de refuerzo para
   cuando el popup no se puede ni abrir.  */

/** Errores que significan «el popup no era posible», no «falló el acceso». */
const SIN_POPUP = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

async function signInWithProvider(provider) {
  try {
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (e) {
    if (!SIN_POPUP.has(e?.code)) throw e;
    /* La página se va a Google y vuelve; quien recoge el resultado es
       completePendingSignIn(), al arrancar. */
    await signInWithRedirect(auth, provider);
    return null;
  }
}

/**
 * Recoger el acceso que quedó a medias al volver de Google o Apple.
 *
 * Sin esto, un redirect que falla no dice absolutamente nada: vuelves a
 * la pantalla de acceso como si no hubieras hecho nada, y no hay error
 * en ninguna parte que explique por qué. Devuelve el mensaje para que
 * la pantalla lo enseñe, o null si no había nada pendiente.
 */
export async function completePendingSignIn() {
  try {
    await getRedirectResult(auth);
    return null;
  } catch (e) {
    console.warn('El acceso por redirección no se completó:', e);
    return humanError(e);
  }
}

export function signInWithGoogle() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return signInWithProvider(p);
}

/** Apple devuelve el nombre SOLO en el primer inicio de sesión: si no se guarda ahí, se pierde. */
export async function signInWithApple() {
  const p = new OAuthProvider('apple.com');
  p.addScope('email');
  p.addScope('name');
  const user = await signInWithProvider(p);
  if (user && !user.displayName) {
    const fromToken = user.providerData?.[0]?.displayName;
    if (fromToken) await updateProfile(user, { displayName: fromToken });
  }
  return user;
}

export async function logOut() {
  await flush();
  return signOut(auth);
}

/**
 * Borrado de cuenta  ·  historia #20
 * Guía 5.1.1(v) de la App Store: si se puede crear cuenta, se debe poder
 * borrar desde dentro de la app. Es motivo de rechazo directo.
 *
 * Primero los datos, después la cuenta: si se borra la cuenta primero,
 * las reglas de Firestore ya no dejarían tocar los datos y quedarían huérfanos.
 */
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay sesión activa.');
  await deleteAllUserData();
  try {
    await deleteUser(user);
  } catch (e) {
    if (e.code === 'auth/requires-recent-login') {
      throw new Error(
        'Por seguridad, vuelve a iniciar sesión y repite el borrado. ' +
        'Tus datos ya se eliminaron.'
      );
    }
    throw e;
  }
}

export { EmailAuthProvider, linkWithCredential };
