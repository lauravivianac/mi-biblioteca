/* ─────────────────────────────────────────────────────────────
   EL SDK DE FIREBASE, SERVIDO EN LOCAL

   La app carga Firebase desde una URL de gstatic, y eso es una
   decisión que se mantiene: es lo que le permite ser HTML estático sin
   empaquetador. Pero en la prueba de punta a punta el navegador no
   sale a internet, así que hay que servir ESE MISMO SDK desde aquí.

   Se empaqueta el paquete `firebase` de npm —el mismo código que
   publica Google en gstatic— en un fichero autocontenido por módulo, y
   la prueba lo sirve en la URL de gstatic. Para la app es idéntico:
   importa la misma URL y recibe el mismo SDK.

   Lo único que cambia es a qué servidor apunta, y eso lo hace
   `firebase-emulador.mjs`, no esto.
   ───────────────────────────────────────────────────────────── */

import { build } from 'esbuild';

/* Los tres que importa la app.

   SE EMPAQUETAN JUNTOS, COMPARTIENDO NÚCLEO, y eso no es una
   optimización: es lo único que funciona. Empaquetados por separado,
   cada uno se lleva su propia copia de `@firebase/app` — y entonces
   Firestore registra su componente en un registro distinto del que usó
   `initializeApp`. El navegador lo dice tal cual:

       Error: Service firestore is not available

   Con `splitting`, los tres comparten el mismo `@firebase/app` en un
   trozo aparte, que es exactamente lo que pasa en gstatic. */
export const MODULOS = ['app', 'firestore', 'auth'];

const PAQUETE = { app: 'firebase/app', firestore: 'firebase/firestore', auth: 'firebase/auth' };

/**
 * Devuelve { 'firebase-app.js': '<código>', 'chunk-XXX.js': …} — todo lo
 * que hay que servir bajo la ruta de gstatic, trozos compartidos
 * incluidos. Los trozos se piden con una ruta relativa desde el módulo
 * que los importa, así que caen en la misma ruta y se sirven igual.
 */
export async function empaquetarSdk() {
  const r = await build({
    entryPoints: MODULOS.map((m) => ({ in: PAQUETE[m], out: `firebase-${m}` })),
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    outdir: 'sdk',
    write: false,
    /* Sin minificar: si algo falla, el error del navegador señala una
       línea que se puede leer. */
    minify: false,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"development"' },
  });

  const salida = {};
  for (const f of r.outputFiles) {
    salida[f.path.slice(f.path.lastIndexOf('/') + 1)] = f.text;
  }
  return salida;
}

/** La URL de gstatic que la app importa, para interceptarla. */
/* Cualquier fichero bajo la ruta de gstatic: los tres módulos y los
   trozos compartidos, que se piden con una ruta relativa desde ellos. */
export const RUTA_GSTATIC = /^https:\/\/www\.gstatic\.com\/firebasejs\/[\d.]+\/([\w.-]+\.js)$/;
