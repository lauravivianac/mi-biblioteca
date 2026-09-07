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

En **Authentication → Settings → Authorized domains**, añade cada dominio desde el que
se vaya a abrir la app:

- `lauravivianac.github.io` — GitHub Pages
- `mi-biblioteca-lyart.vercel.app` — Vercel

**Este es el fallo que más cuesta reconocer.** Si el dominio no está en esa lista, la
ventana de Google abre y se cierra sola, sin explicar nada; el error real es
`auth/unauthorized-domain` y solo se ve en la consola del navegador. La app ahora lo
traduce y dice qué dominio hay que añadir, pero el arreglo está aquí.

Los **previews de Vercel** (`mi-biblioteca-git-<rama>-….vercel.app`) tienen un dominio
distinto por rama y Firebase no admite comodines, así que ahí Google nunca va a
funcionar salvo que se dé de alta cada uno a mano. Para probar un preview, entra con
correo y contraseña, que no depende del dominio.

### 2. Desplegar las reglas de seguridad ⚠️

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

**`npx` y no una instalación global, a propósito.** Aquí decía `npm i -g
firebase-tools` y luego `firebase …`, y eso falla con `zsh: command not found:
firebase` en cuanto la instalación global no está hecha o el `PATH` de npm no está
en el shell — que es lo normal en un Mac recién estrenado. `npx firebase-tools` se
lo baja al vuelo y funciona sin tocar nada del sistema.

El proyecto ya está fijado en [`.firebaserc`](./.firebaserc), así que no hay que
pasarlo por parámetro. **Y hay que hacerlo desde la raíz del repositorio**, no desde
`worker/`: ahí es donde están `firebase.json`, las reglas y los índices.

**Los índices van en el mismo comando y no son opcional.** Firestore crea solo
índices de un campo; en cuanto una consulta filtra por un campo y ordena por otro,
hay que declararla en [`firestore.indexes.json`](./firestore.indexes.json) o falla
en producción con *«the query requires an index»*. El feed es exactamente ese caso.
El emulador se los inventa al vuelo, así que esto pasa las pruebas y se rompe en el
móvil de alguien — de ahí que el fichero se escriba a mano.

**Esto es lo que de verdad cierra el agujero.** Hasta ahora no había autenticación y
la base de datos estaba efectivamente abierta: cualquiera que abriera la app escribía
sobre los datos. Mientras las reglas de [`firestore.rules`](./firestore.rules) no
estén desplegadas, la base sigue abierta por mucho que la app pida iniciar sesión.

**Vuelve a desplegarlas cuando el archivo cambie.** La última vez fue con las reseñas
públicas (historia #28), que viven en una colección aparte. Si esas reglas no están
desplegadas, publicar una reseña simplemente no funciona —falla del lado seguro: se
queda privada, y el resto de la app sigue guardando con normalidad—.

#### Cómo se comprueba que las reglas hacen lo que dicen

```bash
npm i                 # solo la primera vez (dependencias de desarrollo)
npm run test:rules    # las reglas contra el emulador oficial de Firestore
npm run test:circuito # el código de la app contra ese mismo emulador
```

Las dos levantan el emulador de Firestore de Google y hacen contra él las mismas
lecturas y escrituras que hace la app. **No hay dobles.** Es la diferencia entre
leer una regla y ejecutarla, y no es una diferencia teórica: la primera vez que se
pasaron estas rutas por el emulador aparecieron cuatro fallos que llevaban meses en
la rama y que ninguna lectura del código había encontrado.

- **No se podía seguir a nadie.** La regla leía `.data.privada`, y leer un campo
  que no existe no da «falso» en el motor de reglas: revienta la evaluación, y una
  regla que revienta deniega.
- **El feed no existía.** La colección `activity` no tenía regla, así que la
  denegaba el «todo lo demás, cerrado» del final. Ni una entrada llegó a guardarse.
- **No llegaba ningún aviso de comentario.** La regla solo casaba con `follow_…` y
  la app escribía `comment_…`.
- **No se podía bloquear a nadie.** Bloquear borra en un lote las flechas de
  seguimiento, que casi nunca existen — y borrar lo que no está reventaba la regla
  y tiraba el lote entero.

Necesitan Java (el emulador es un `.jar`) y por eso van aparte de `npm test`, que
sigue corriendo sin instalar nada.

#### Y que las pantallas se vean

```bash
npx playwright install chromium   # solo la primera vez
npm run test:pantallas
```

Abre el `index.html` del repo en un navegador de verdad y comprueba que la hoja que
abres **se ve**. Suena a poco y no lo es: las seis filas de ajustes —tu perfil,
dónde estás, tus libros ofrecidos, bloqueadas, invitar, qué se ve en tu perfil— y
la tienda de temas se abrían **enteras por detrás** de la propia pantalla de
ajustes, porque todas las hojas compartían `z-index` y ganaba la que estuviera más
abajo en el HTML. Tocar esas siete filas no hacía nada.

Ninguna prueba podía verlo: las demás son de lógica pura en Node y esto es un
problema de pintado. Hacía falta un navegador, y no había ninguno mirando.

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
  themes.js                los 9 temas, como datos
  icons.js                 pedir un icono del pliego (los trazos van en index.html)
  lomo.js                  el lomo de un libro sin portada
  theme-engine.js          aplicar · previsualizar · persistir
  plan-core.js             generador del plan · puro, sin dependencias
  planner.js               enlace del generador con los datos reales
  views.js                 Plan · Biblioteca · Tracker
  screens.js               acceso · onboarding · tienda · ajustes · plan
  covers.js                OpenLibrary con respaldo de Google Books
  ui.js                    utilidades compartidas

scripts/
  check-contrast.mjs       valida contraste AA de los 9 temas
  test-planner.mjs         30 pruebas del generador de plan
  capturas.mjs             fotografía 14 pantallas para poder mirarlas
```

## El aspecto

Con el que se entra es **Ex Libris**: tinta, tela y latón, con los libros
dibujados como lomos. Por qué es así y qué se cambió está en
[`docs/diseno.md`](./docs/diseno.md) — léelo antes de añadir una pantalla.

```bash
npm run capturas    # deja 14 capturas en capturas/, con datos de verdad
```

## Pruebas

```bash
npm test
```

- **Contraste** — los nueve temas deben pasar WCAG AA. Con nueve temas y decenas de
  combinaciones esto no se revisa a ojo: o es automático, o se degrada en cuanto se
  añada el décimo.
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
| 🔖 Ex Libris | El lomo entelado: cada libro es un objeto, y su tela dice de qué género es |
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
