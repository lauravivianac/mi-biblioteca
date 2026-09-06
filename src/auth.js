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

/** En móvil el popup falla a menudo; ahí se usa redirect. */
const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

async function signInWithProvider(provider) {
  if (isMobile()) return signInWithRedirect(auth, provider);
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
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
