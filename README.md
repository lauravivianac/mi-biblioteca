# Mi Biblioteca ✨

Plan lector y tracker de libros. Aplicación web instalable (PWA), sin paso de
compilación: se sirve tal cual desde GitHub Pages.

**En vivo:** https://lauravivianac.github.io/mi-biblioteca/

---

## Puesta en marcha — dos pasos que hay que hacer a mano

La app ya tiene autenticación, pero **no funcionará hasta completar estos dos pasos**
en las consolas de Firebase. Son configuración de cuenta, no de código.

### 1. Habilitar los métodos de acceso

En [console.firebase.google.com](https://console.firebase.google.com) → tu proyecto
`mi-biblioteca-7a3a5` → **Authentication → Sign-in method**, habilita:

- **Correo electrónico/contraseña** — imprescindible
- **Google** — un clic, no requiere nada más
- **Apple** — requiere cuenta de Apple Developer (99 USD/año). Se puede dejar para
  después: mientras no esté habilitado, ese botón devuelve un mensaje claro en vez
  de romperse.

En **Authentication → Settings → Authorized domains**, añade `lauravivianac.github.io`.

### 2. Desplegar las reglas de seguridad ⚠️

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

**Esto es lo que de verdad cierra el agujero.** Hasta ahora no había autenticación y
la base de datos estaba efectivamente abierta: cualquiera que abriera la app escribía
sobre los datos. Mientras las reglas de [`firestore.rules`](./firestore.rules) no
estén desplegadas, la base sigue abierta por mucho que la app pida iniciar sesión.

### 3. Migrar los datos antiguos

La primera vez que inicies sesión, la app detecta el documento `biblioteca/laura` y
ofrece traerlo a tu cuenta, con opción de descargar una copia antes. Al terminar,
borra el documento antiguo. Es idempotente: correrlo dos veces no duplica nada.

---

## Estructura

```
index.html                 esqueleto (antes: 1.624 líneas con todo dentro)
manifest.webmanifest       PWA
sw.js                      funcionamiento sin conexión
firestore.rules            reglas de seguridad — hay que desplegarlas

styles/
  tokens.css               design tokens · ÚNICO sitio con colores
  app.css                  estilos de la app
  ui.css                   pantallas nuevas

src/
  main.js                  arranque, navegación, ciclo de sesión
  firebase.js              inicialización
  auth.js                  email · Google · Apple · borrado de cuenta
  store.js                 datos por usuaria (users/{uid}/books/*)
  migrate.js               importación del documento antiguo
  seed.js                  los 73 libros del plan original
  themes.js                los 8 temas, como datos
  theme-engine.js          aplicar · previsualizar · persistir
  plan-core.js             generador del plan · puro, sin dependencias
  planner.js               enlace del generador con los datos reales
  views.js                 Plan · Biblioteca · Tracker
  screens.js               acceso · onboarding · tienda · ajustes · plan
  covers.js                OpenLibrary con respaldo de Google Books
  ui.js                    utilidades compartidas

scripts/
  check-contrast.mjs       valida contraste AA de los 8 temas
  test-planner.mjs         30 pruebas del generador de plan
```

## Pruebas

```bash
npm test
```

- **Contraste** — los ocho temas deben pasar WCAG AA. Con ocho temas y decenas de
  combinaciones esto no se revisa a ojo: o es automático, o se degrada en cuanto se
  añada el noveno.
- **Generador de plan** — 30 pruebas sobre el núcleo, que es puro a propósito: no
  necesita Firebase, ni navegador, ni sesión.

## Añadir un tema

Un tema es **datos, no CSS**: unos quince valores en `src/themes.js`. Todo lo derivado
—bordes, nieblas, superficies translúcidas, sombras— se recalcula solo, así que no hay
que tocar ni una regla de estilo. Después, `npm run test:contrast`.

---

## Estado del proyecto

El [plan de módulos](./docs/PLAN-MODULOS.md) y el [backlog](./docs/BACKLOG.md) definen
hacia dónde va esto. Lo construido hasta ahora:

- **M0 · Fundación** — autenticación, datos por usuaria, reglas, design tokens,
  borrado y exportación de cuenta
- **M6 · Tienda de temas** — ocho temas con vista previa y contraste validado
- **M10 · Plan lector inteligente** — tiempo, objetivo, ritmo real, generación
  del plan y rescate de represados

Pendiente: lo social, el agente, el intercambio y la mascota.
