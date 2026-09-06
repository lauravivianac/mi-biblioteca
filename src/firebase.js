/* Inicialización de Firebase. Un solo sitio que sabe de la config. */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getAuth, setPersistence, browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyB_64aXaviQjX4tVzUAD1xr2x3-BdNmvHg',
  authDomain: 'mi-biblioteca-7a3a5.firebaseapp.com',
  projectId: 'mi-biblioteca-7a3a5',
  storageBucket: 'mi-biblioteca-7a3a5.firebasestorage.app',
  messagingSenderId: '817293770676',
  appId: '1:817293770676:web:d735516291637dc7037ce1',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// La sesión sobrevive a cerrar y reabrir la app (criterio de #14)
setPersistence(auth, browserLocalPersistence).catch(() => {});
