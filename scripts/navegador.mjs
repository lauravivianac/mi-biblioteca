/* ─────────────────────────────────────────────────────────────
   ENCONTRAR EL NAVEGADOR

   Playwright trae escrito a fuego el número de compilación de Chromium
   que le toca —`chromium-1243`, por ejemplo— y si en la máquina hay
   otro, se planta:

     Executable doesn't exist at …/chromium_headless_shell-1243/…
     Please run: npx playwright install

   Consejo inútil en un entorno donde el navegador viene puesto de
   fábrica y no se puede descargar otro. Y no era un aviso: `npm test`
   MORÍA ahí, en la cuarta prueba de treinta y tres, así que las
   veintinueve de después no se ejecutaban nunca en esta máquina. Un
   fallo de instalación se estaba comiendo la batería entera.

   Esto mira qué hay de verdad en el disco antes de rendirse: primero
   lo que diga `CHROMIUM_PATH`, luego cualquier Chromium instalado en
   `PLAYWRIGHT_BROWSERS_PATH`, y si no hay ninguno devuelve `undefined`
   —que es dejar que Playwright use el suyo, como siempre—.
   ───────────────────────────────────────────────────────────── */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/* Dónde deja el binario cada empaquetado. El `headless_shell` es más
   ligero y va primero; el completo sirve igual. */
const DENTRO = [
  'chrome-linux/chrome',
  'chrome-headless-shell-linux64/chrome-headless-shell',
  'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
];

/**
 * La ruta del Chromium que se va a usar, o `undefined` para el de
 * Playwright. Se pasa tal cual a `chromium.launch({ executablePath })`.
 */
export function rutaChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;

  const raiz = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!raiz || !existsSync(raiz)) return undefined;

  /* Los `headless_shell` antes que los completos, y dentro de cada
     grupo la compilación más alta: si hay varias, la nueva. */
  const carpetas = readdirSync(raiz)
    .filter((d) => d.startsWith('chromium'))
    .sort((a, b) => {
      const shell = Number(b.includes('headless')) - Number(a.includes('headless'));
      if (shell) return shell;
      return (parseInt(b.split('-').pop(), 10) || 0) - (parseInt(a.split('-').pop(), 10) || 0);
    });

  for (const carpeta of carpetas) {
    for (const rel of DENTRO) {
      const ruta = join(raiz, carpeta, rel);
      if (existsSync(ruta)) return ruta;
    }
  }
  return undefined;
}
