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

## Cómo funciona un tema

Un tema **no es una paleta**. Cambia cuatro cosas a la vez:

| Eje | Qué transporta | Ejemplo |
|---|---|---|
| **Color** | Colores base como hex y como tripleta RGB, para que las transparencias sigan al tema | Obsidiana en negro puro |
| **Forma** | Radios por rol: tarjeta, control, píldora, hoja, runa | Máquina a 0px, Marea a 22px |
| **Material** | Borde, relleno, sombra y filo — van juntos porque son una decisión, no tres | Pergamino sin tarjetas, solo renglones |
| **Textura y ornamento** | La capa que se superpone y el signo que separa secciones | Vellum en Grimorio, líneas de barrido en Máquina |

Lo que un token no alcanza —seudoelementos, geometría propia, la firma de cada mundo—
vive en [`styles/worlds.css`](./styles/worlds.css), en un bloque por tema.

**La firma de cada uno**, que es lo que lo hace reconocible:

| Tema | Firma |
|---|---|
| ✨ Grimorio | El margen dorado al filo izquierdo de cada libro, como un códice |
| 🌑 Obsidiana | El filo de luz de 1px en el canto superior. Sin bordes, sin brillos |
| ☀️ Pergamino | El renglón: los libros son entradas de un índice, no tarjetas |
| 🌿 Herbario | La etiqueta de espécimen sobre papel cuadriculado |
| 🌊 Marea | La línea de marea que cruza el fondo muy despacio |
| 🕯️ Gótico | El arco de vitral, con vela arriba y viñeteado en los bordes |
| 🌸 Sakura | El trazo vertical junto a los encabezados. Separa el vacío |
| 🌾 El Principito | El horizonte: la arena tibia subiendo desde el borde inferior |
| 🖨️ Máquina | Los corchetes y las marcas de esquina, sobre líneas de barrido |

### Añadir uno nuevo

Unos quince valores en `src/themes.js` y, si quiere firma propia, un bloque en
`worlds.css`. Todo lo derivado se recalcula solo. Después, `npm run test:contrast`.

Un mando útil: `--month-tint` decide cuánto del color del mes se deja pasar. Grimorio
quiere ese arcoíris; Obsidiana lo pone en `0%` y recupera su propia paleta.

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
