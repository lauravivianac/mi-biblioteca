/* Engancha el cargador que resuelve las URLs de gstatic al paquete
   npm y apunta `src/firebase.js` al emulador. Ver cargador.mjs. */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./cargador.mjs', pathToFileURL(import.meta.filename));
