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

import { currentUser } from './auth.js';
import {
  settings, updateSettings, miRecordatorio, horasDeLectura, readingDays,
} from './store.js';
import { workerUrl } from './agent.js';
import { horaHabitual } from './habito-core.js';

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
const VAPID_PUBLICA = 'BCMCk19F16wf7bLNniqoXoOZyCI8XdOQNRuIxPxBFmePdL5b2R3Et0eBbaR5IP7S1sV28ifVIPi0ADl2DUra0p8';

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

/* El identificador por dispositivo —que evita que el mismo teléfono
   acumule suscripciones duplicadas— lo calcula ahora el Worker a
   partir de la propia dirección de push (`idDeSub` en worker/index.js).
   Tenerlo en los dos sitios era tener dos formas de nombrar la misma
   cosa, y basta con que una cambie para que el cron escriba en una
   clave y el borrado busque en otra. */

/* ── DÓNDE SE GUARDA, Y POR QUÉ CAMBIÓ  ·  #95 ───────────────

   Antes esto escribía en Firestore, en `users/<uid>/push/<id>`. El
   problema no era guardar: era LEER. Quien tiene que leer esto es el
   cron del Worker, y el permiso más estrecho que Firestore sabe dar
   es «toda la base de datos» — no hay rol por colección. Para mandar
   un recordatorio, el Worker habría quedado con lectura y escritura
   sobre la biblioteca, las reseñas y la red social de todas las
   cuentas.

   Así que la suscripción va al Worker y vive solo allí, en KV. Lo que
   sale de este dispositivo es lo mínimo para decidir cuándo avisar:
   las claves de push, el huso horario, el ajuste del recordatorio y
   QUÉ DÍA se leyó por última vez. Ni el libro, ni la página, ni la
   lista de horas a las que lees — la hora objetivo se deduce aquí y
   viaja ya calculada.

   Y como no está en Firestore, borrar la cuenta no se lo lleva por
   delante solo: hay que decírselo al Worker, y eso es `olvidarPush`. */

/** Hablar con el Worker. Nada que ver con el agente: esto no consulta
    ningún modelo, así que no pasa por su consentimiento ni gasta. */
async function pedirAlWorker(cuerpo) {
  const url = workerUrl();
  if (!url) return 'sin-worker';

  const user = currentUser();
  if (!user) return 'sin-sesion';

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify(cuerpo),
    });
    if (r.ok) return null;
    const { error } = await r.json().catch(() => ({}));
    return error || `http-${r.status}`;
  } catch {
    return 'sin-red';
  }
}

/** Lo que el Worker necesita saber para decidir si toca avisar. */
function fichaDeAviso(sub) {
  const guardada = comoSeGuarda(sub);
  const config = miRecordatorio();
  return {
    p256dh: guardada.p256dh,
    auth: guardada.auth,
    tz: guardada.tz,
    activo: Boolean(config.activo),
    dias: config.dias,
    /* La hora deducida se manda YA RESUELTA. Mandar las horas a las
       que lees para que el servidor saque la media sería mandar un
       perfil de tus hábitos para calcular un número que aquí ya
       sabemos. */
    hora: config.hora ?? horaHabitual(horasDeLectura()).hora,
    ultimoDiaLeido: readingDays().at(-1) || '',
  };
}

/**
 * Poner al día lo que el Worker sabe de este dispositivo.
 *
 * Se llama al encender, al cambiar el recordatorio y al apuntar un día
 * de lectura nuevo. Sin esto la ficha se queda congelada en el momento
 * de suscribirse: apagarías el recordatorio en Ajustes y el aviso
 * seguiría llegando, que es la peor cara que puede poner esta función.
 *
 * No devuelve error ni avisa si falla: es sincronización de fondo, y
 * un fallo de red aquí no debe interrumpir nada de lo que esté
 * haciendo quien lee. Lo peor que pasa es que la ficha se actualice en
 * la siguiente ocasión.
 */
export async function sincronizarPush() {
  if (!pushDisponible() || !pushEncendido()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await pedirAlWorker({ accion: 'guardar-sub', endpoint: sub.endpoint, ficha: fichaDeAviso(sub) });
  } catch { /* ver arriba: en silencio, a propósito */ }
}

/** Al borrar la cuenta. Esto no está en Firestore, así que hay que pedirlo. */
export async function olvidarPush() {
  await pedirAlWorker({ accion: 'olvidar-subs' });
}

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

  /* AQUÍ SÍ SE ESPERA EL RESULTADO, al revés que en `sincronizarPush`.
     Encender es una acción con un botón delante: si el servidor no se
     quedó con la suscripción, el interruptor NO debe quedarse en «sí»
     prometiendo avisos que no van a llegar. */
  const fallo = await pedirAlWorker({
    accion: 'guardar-sub', endpoint: sub.endpoint, ficha: fichaDeAviso(sub),
  });
  if (fallo) return fallo === 'sin-almacen' ? 'avisos-no-disponibles' : 'no-se-pudo-guardar';

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

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await pedirAlWorker({ accion: 'borrar-sub', endpoint: sub.endpoint });
    await sub.unsubscribe();
  } catch {
    /* Que no se pueda dar de baja en el navegador no debe dejar el
       ajuste encendido: lo que manda para quien lee es el interruptor,
       y el documento del servidor ya no está. */
  }
}
