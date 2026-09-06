/* ─────────────────────────────────────────────────────────────
   EL CARGADOR QUE DEJA CORRER LA APP EN NODE

   Los módulos de `src/` importan Firebase desde una URL de gstatic,
   porque la app es HTML estático sin empaquetador y eso es una
   decisión que se mantiene. Node no sabe importar una URL, así que
   hasta ahora todo lo social se probaba contra un doble escrito a
   mano — y ese doble mintió tres veces.

   Esto quita el doble de en medio. Las URLs de gstatic se resuelven al
   paquete `firebase` de npm, que ES EL MISMO SDK, y `src/firebase.js`
   se resuelve a una inicialización apuntada al emulador. Nada más se
   toca: `store.js`, `social.js`, `moderation.js` y compañía se cargan
   tal cual están en el repo.

   Con esto, lo que falle en la prueba falla de verdad.
   ───────────────────────────────────────────────────────────── */

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..', '..');

/* La URL de gstatic → el módulo equivalente del paquete npm. */
const GSTATIC = /^https:\/\/www\.gstatic\.com\/firebasejs\/[\d.]+\/firebase-([a-z]+)\.js$/;

const src = (f) => pathToFileURL(join(raiz, 'src', f)).href;

export async function resolve(especificador, contexto, siguiente) {
  const m = GSTATIC.exec(especificador);
  if (m) {
    const parte = m[1] === 'app' ? 'firebase/app' : `firebase/${m[1]}`;
    return siguiente(parte, contexto);
  }

  /* La única pieza sustituida: la que sabe a qué servidor se habla.
     Se compara la ruta ya resuelta y no el texto del import, porque
     `./firebase.js` aparece escrito igual desde varios sitios. */
  if (especificador.startsWith('.') || especificador.startsWith('/')) {
    const resuelto = await siguiente(especificador, contexto);
    if (resuelto.url === src('firebase.js')) {
      return siguiente(pathToFileURL(join(aqui, 'firebase-emulador.mjs')).href, contexto);
    }
    return resuelto;
  }

  return siguiente(especificador, contexto);
}
