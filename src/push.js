/* ─────────────────────────────────────────────────────────────
   QUE LA MASCOTA PUEDA LLAMAR  ·  historias #95 y #69

   Las dos preguntas de la #45 —«¿por dónde vas?» y «se quedó en
   agosto, ¿lo traemos?»— solo llegan al abrir la app. Y quien lleva
   cinco días sin leer es justamente quien no la abre: sin esto, la
   pregunta le llega a todo el mundo menos a quien iba dirigida.

   ── POR QUÉ WEB PUSH Y NO FCM ────────────────────────────────

   Esta app no tiene empaquetador: cada kilobyte del repositorio es un
   kilobyte que se descarga tal cual. El SDK de mensajería de Firebase
   son ~100 KB para hacer lo que el navegador ya trae de serie —
   `PushManager` es estándar y lleva años en Chrome, Firefox y, desde
   iOS 16.4, en Safari. Se guarda la suscripción y ya está.

   ── LA REGLA DEL MANDO QUE NO HACE NADA ──────────────────────

   `VAPID_PUBLICA` vacía = no hay interruptor. Es la misma decisión que
   `WORKER_URL` en agent.js, y por el mismo motivo: un interruptor de
   notificaciones que no manda ninguna es peor que no tenerlo, porque
   promete. Mientras el cron no esté desplegado, aquí no hay nada que
   tocar y nadie se lleva un chasco.

   Esta app ya arrastró dos mandos muertos —el pelaje y el rincón—, y
   los dos costaron lo mismo: un ajuste que se elige, se gana leyendo, y
   no hace nada.

   ── Y EL PERMISO SE PIDE CUANDO SE ENTIENDE PARA QUÉ ES ──────

   No al registrarse, que es cuando nadie lee y cuando el navegador
   pinta el diálogo más agresivo que tiene. Aquí se pide desde Ajustes,
   al encender el interruptor, con la frase delante explicando qué va a
   llegar. Misma regla que el consentimiento del agente en la #61.
   ───────────────────────────────────────────────────────────── */

import { doc, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from './firebase.js';
import { currentUser } from './auth.js';
import { settings, updateSettings } from './store.js';

/**
 * La clave pública VAPID de ESTE despliegue.
 *
 * Es pública de verdad: viaja al navegador en cada suscripción y no
 * sirve para mandar nada — quien manda es la privada, que vive como
 * secreto del Worker y NO se pega en ningún sitio del repositorio.
 *
 * Se genera una vez, con `npx web-push generate-vapid-keys`, y el par
 * no se cambia nunca: cambiarlo invalida todas las suscripciones que
 * haya guardadas y hay que volver a pedir permiso a todo el mundo.
 *
 * Vacía = no hay notificaciones, y el interruptor ni aparece.
 */
const VAPID_PUBLICA = '';

/** ¿Este navegador y este despliegue pueden con esto? */
export const pushDisponible = () => Boolean(VAPID_PUBLICA)
  && typeof navigator !== 'undefined'
  && 'serviceWorker' in navigator
  && 'PushManager' in window
  && 'Notification' in window;

/** ¿Está encendido para esta persona? */
export const pushEncendido = () => Boolean(settings().pushOn);

/* El navegador ya dijo que no y no lo va a volver a preguntar. Es un
   estado distinto de «apagado»: aquí el interruptor no puede hacer
   nada y hay que decirlo, no dejar que parezca que está roto. */
export const pushDenegado = () => pushDisponible() && Notification.permission === 'denied';

/* La clave viaja en base64url y `subscribe` la quiere en bytes. */
function bytesDeClave(base64url) {
  const relleno = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const crudo = atob(base64);
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

/* Lo que hay que guardar de una suscripción para poder mandarle algo:
   la dirección del servicio de push del navegador y las dos claves con
   las que se cifra el mensaje. Nada de esto identifica a nadie fuera
   de este dispositivo. */
function comoSeGuarda(sub) {
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh || '',
    auth: json.keys?.auth || '',
    /* La franja horaria, para que el cron no llame a las cuatro de la
       mañana de quien lee. El servidor no sabe dónde está nadie, y
       tampoco hace falta que lo sepa: basta el desfase. */
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    creada: Date.now(),
  };
}

/* Un identificador estable POR DISPOSITIVO, sacado de la propia
   dirección de push. Así el mismo teléfono no acumula suscripciones
   duplicadas cada vez que se apaga y se enciende, y el móvil y el
   portátil de la misma persona conviven sin pisarse. */
async function idDeSub(endpoint) {
  const datos = new TextEncoder().encode(endpoint);
  const hash = await crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(hash)].slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

const refDe = (uid, id) => doc(db, 'users', uid, 'push', id);

/**
 * Encender: pedir permiso, suscribirse y guardar.
 *
 * Devuelve el motivo por el que NO se pudo, o null si salió bien — no
 * un booleano: quien llama tiene que poder decir qué pasó, y «false»
 * no distingue «dijo que no» de «este navegador no puede».
 */
export async function encenderPush() {
  if (!pushDisponible()) return 'no-disponible';

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return 'permiso-denegado';

  const user = currentUser();
  if (!user) return 'sin-sesion';

  let sub;
  try {
    const reg = await navigator.serviceWorker.ready;
    /* Si ya había una suscripción se reutiliza: volver a suscribir con
       la misma clave devuelve la misma, pero pedirlo cuando ya existe
       falla en algunos navegadores. */
    sub = await reg.pushManager.getSubscription()
      || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytesDeClave(VAPID_PUBLICA),
      });
  } catch {
    return 'no-se-pudo-suscribir';
  }

  try {
    await setDoc(refDe(user.uid, await idDeSub(sub.endpoint)), comoSeGuarda(sub));
  } catch {
    return 'no-se-pudo-guardar';
  }

  updateSettings({ pushOn: true });
  return null;
}

/**
 * Apagar, y apagar DE VERDAD.
 *
 * Se borra la suscripción del servidor ADEMÁS de darla de baja en el
 * navegador. Con solo el ajuste local, el cron seguiría teniendo una
 * dirección válida a la que mandar: apagar tiene que quitar la
 * capacidad, no solo la intención.
 */
export async function apagarPush() {
  updateSettings({ pushOn: false });

  const user = currentUser();
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    if (user) await deleteDoc(refDe(user.uid, await idDeSub(sub.endpoint))).catch(() => {});
    await sub.unsubscribe();
  } catch {
    /* Que no se pueda dar de baja en el navegador no debe dejar el
       ajuste encendido: lo que manda para quien lee es el interruptor,
       y el documento del servidor ya no está. */
  }
}
