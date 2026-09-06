/* ─────────────────────────────────────────────────────────────
   LAS SOLICITUDES · lo que habla con Firestore  ·  historia #84

   Las solicitudes viven en su propia colección y las leen SOLO LAS DOS
   personas implicadas — la regla lo exige por los campos `de` y
   `para`. No es como las publicaciones, que son públicas a propósito:
   a quién le pides un libro no es asunto de nadie más.

   El identificador es `{quienPide}_{publicación}`, así que pedir dos
   veces el mismo libro es escribir el mismo documento. No hace falta
   contar nada para impedir el spam sobre una publicación concreta.
   ───────────────────────────────────────────────────────────── */

import {
  doc, getDoc, setDoc, getDocs, collection, query, where, limit, writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from './firebase.js';
import { uid as myUid, myUsername, displayName } from './store.js';
import {
  requestId, requestDoc, contraofertaDoc, requestNotice,
  puedeSolicitar, transicionValida, enviadasHoy,
} from './requests-core.js';

const TOPE = 60;

const solicitudRef = (id) => doc(db, 'swapRequests', id);
const avisoRef = (paraUid, tipo, de) => doc(db, 'notifs', paraUid, 'items', `${tipo}_${de}`);

/** Las que he mandado yo. */
export async function misEnviadas() {
  const me = myUid();
  if (!me) return [];
  try {
    const snap = await getDocs(query(
      collection(db, 'swapRequests'), where('de', '==', me), limit(TOPE),
    ));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('No se pudieron leer tus solicitudes:', e);
    return [];
  }
}

/** Las que me han mandado a mí. */
export async function misRecibidas() {
  const me = myUid();
  if (!me) return [];
  try {
    const snap = await getDocs(query(
      collection(db, 'swapRequests'), where('para', '==', me), limit(TOPE),
    ));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('No se pudieron leer las solicitudes recibidas:', e);
    return [];
  }
}

/** ¿Ya le pedí este libro? Para no ofrecer un botón que va a fallar. */
export async function yaSolicitado(swapId) {
  const me = myUid();
  if (!me || !swapId) return null;
  try {
    const s = await getDoc(solicitudRef(requestId(me, swapId)));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  } catch { return null; }
}

/**
 * Pedir un libro.
 *
 * Se comprueba antes de escribir con `puedeSolicitar`, que es el mismo
 * juicio que hace la pantalla — así el error se explica en palabras en
 * vez de llegar como un «permiso denegado».
 */
export async function solicitar(publicacion, { ofrezco = [], suelto = false, mensaje = '' } = {}) {
  const me = myUid();
  const previa = await yaSolicitado(publicacion?.id);
  const enviadas = await misEnviadas();

  const juicio = puedeSolicitar({
    yo: me,
    publicacion,
    yaSolicitado: previa,
    enviadasHoy: enviadasHoy(enviadas),
  });
  if (!juicio.puede) return { ok: false, error: juicio.motivo, yaEsta: juicio.yaEsta };

  const d = requestDoc({
    de: me, deNombre: displayName(), deUsuario: myUsername() || '',
    para: publicacion.uid, publicacion, ofrezco, suelto, mensaje,
  });
  if (!d) return { ok: false, error: 'No se pudo preparar la solicitud.' };

  const id = requestId(me, publicacion.id);
  try {
    /* La solicitud y el aviso, en un lote: si el aviso fallara aparte,
       tendrías una solicitud que la otra persona no sabe que existe. */
    const batch = writeBatch(db);
    batch.set(solicitudRef(id), d);
    batch.set(
      avisoRef(publicacion.uid, 'swapreq', me),
      requestNotice({ de: me, deNombre: displayName(), deUsuario: myUsername() || '', tipo: 'swapreq' }),
    );
    await batch.commit();
    return { ok: true, id, solicitud: { id, ...d } };
  } catch (e) {
    console.warn('No se pudo solicitar:', e);
    return { ok: false, error: 'No se pudo mandar la solicitud. ¿Están desplegadas las reglas?' };
  }
}

/**
 * Contestar: aceptar, rechazar, contraproponer o retirar.
 *
 * Una sola puerta para los cuatro, porque los cuatro son el mismo
 * gesto —cambiar el estado— y tenerlos juntos es lo que hace que la
 * tabla de qué se puede hacer viva en UN sitio (requests-core) y no
 * repartida en cuatro funciones que se separan con el tiempo.
 */
export async function responder(sol, nuevo, { pido = [], mensaje = '' } = {}) {
  const me = myUid();
  if (!sol?.id) return { ok: false };
  if (!transicionValida({ sol, yo: me, nuevo })) {
    return { ok: false, error: 'Esa solicitud ya no está esperando eso.' };
  }

  const patch = { estado: nuevo, actualizado: Date.now() };
  if (nuevo === 'contrapropuesta') {
    const contra = contraofertaDoc({ pido, mensaje });
    if (!contra) return { ok: false, error: 'Di qué le pides a cambio.' };
    patch.contraoferta = contra;
  }

  /* A quién hay que avisar es a la otra parte, sea cual sea. Retirar
     no avisa: quien retira no le está pidiendo nada a nadie, y un
     aviso de «ya no quiero» solo sirve para incomodar. */
  const otra = sol.de === me ? sol.para : sol.de;
  const avisa = nuevo !== 'cancelada';

  try {
    const batch = writeBatch(db);
    batch.set(solicitudRef(sol.id), patch, { merge: true });
    if (avisa) {
      batch.set(
        avisoRef(otra, 'swapres', me),
        requestNotice({
          de: me, deNombre: displayName(), deUsuario: myUsername() || '', tipo: 'swapres',
        }),
      );
    }
    await batch.commit();
    return { ok: true, solicitud: { ...sol, ...patch } };
  } catch (e) {
    console.warn('No se pudo responder:', e);
    return { ok: false, error: 'No se pudo guardar la respuesta.' };
  }
}

export { enviadasHoy };
