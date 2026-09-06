/* El mismo `src/firebase.js`, apuntado al emulador.

   Es lo ÚNICO que se sustituye al correr el circuito, y no es un doble:
   son `initializeApp`, `getFirestore` y `getAuth` de verdad, hablando
   con el emulador oficial en vez de con el proyecto de producción.
   Todo lo que hay por encima —store, social, moderación— es el código
   del repo sin tocar. */

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

export const app = initializeApp({
  apiKey: 'fake-api-key',
  authDomain: 'demo-biblioteca.firebaseapp.com',
  projectId: process.env.GCLOUD_PROJECT || 'demo-biblioteca',
});

export const db = getFirestore(app);
export const auth = getAuth(app);

const [fsHost, fsPort] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8181').split(':');
connectFirestoreEmulator(db, fsHost, Number(fsPort));
connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'}`, {
  disableWarnings: true,
});
