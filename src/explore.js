/* ─────────────────────────────────────────────────────────────
   EXPLORAR · lo que habla con Firestore  ·  historia #83

   SE TRAE Y SE FILTRA AQUÍ, NO EN LA CONSULTA. Firestore cobra por
   documento leído y solo sabe filtrar por igualdad y rangos; género,
   autor, estado y texto se cruzan entre sí de mil formas y cada
   combinación pediría un índice compuesto distinto. Se trae una página
   del ámbito elegido y se filtra en el dispositivo, que con estos
   tamaños es instantáneo y no obliga a desplegar un índice por cada
   filtro nuevo.

   Y NO SE ORDENA EN LA CONSULTA, por lo mismo: mezclar una igualdad
   con un `orderBy` sobre otro campo exige un índice compuesto —el del
   feed lo necesita y está declarado a mano en firestore.indexes.json—.
   Aquí el orden lo pone explore-core, que además ordena por algo que
   el servidor no sabe: qué libros tengo yo pendientes.
   ───────────────────────────────────────────────────────────── */

import {
  collection, getDocs, query, where, limit,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from './firebase.js';
import { uid as myUid, myPlace } from './store.js';
import { misBloqueos } from './moderation.js';
import { normalizarLugar } from './place-core.js';

/* Una página generosa: son documentos pequeños y se filtran en local,
   así que traer de más sale más barato que ir y volver. */
const TOPE = 120;

/**
 * Traer las publicaciones activas del ámbito pedido.
 *
 * Devuelve `{ publicaciones, error }` en vez de lanzar: una lista vacía
 * y un aviso se pintan; una excepción deja la pantalla en blanco.
 */
export async function explorar(ambito = 'ciudad') {
  const me = myUid();
  const lugar = myPlace();

  const partes = [collection(db, 'swaps'), where('activa', '==', true)];

  if (ambito === 'ciudad') {
    const clave = lugar?.cityKey || normalizarLugar(lugar?.city);
    if (!clave) return { publicaciones: [], sinCiudad: true };
    partes.push(where('cityKey', '==', clave));
  } else if (ambito === 'pais') {
    const clave = lugar?.countryKey || normalizarLugar(lugar?.country);
    /* Sin país escrito no se puede acotar a un país. Se dice, en vez
       de enseñar el mundo entero como si fuera «tu país». */
    if (!clave) return { publicaciones: [], sinPais: true };
    partes.push(where('countryKey', '==', clave));
  }
  partes.push(limit(TOPE));

  try {
    const snap = await getDocs(query(...partes));
    const { bloqueados = [], silenciados = [] } = misBloqueos() || {};
    const fuera = new Set([...bloqueados, ...silenciados]);

    const publicaciones = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      /* Lo mío no se explora: ya está en «Mis libros ofrecidos», y
         verlo aquí solo estorba. Y a quien bloqueé o silencié tampoco
         se le ve — el bloqueo se aplica en el servidor para lo que
         escribe, pero lo que ya está publicado se filtra aquí. */
      .filter((p) => p.uid !== me && !fuera.has(p.uid));

    return { publicaciones };
  } catch (e) {
    console.warn('No se pudo explorar:', e);
    return {
      publicaciones: [],
      error: 'No se pudieron cargar los libros disponibles. ¿Hay conexión?',
    };
  }
}

/** Una publicación suelta, para abrir un link directo o refrescar. */
export async function publicacion(id) {
  if (!id) return null;
  try {
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const s = await getDoc(doc(db, 'swaps', id));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  } catch (e) {
    console.warn('No se pudo leer la publicación:', e);
    return null;
  }
}
