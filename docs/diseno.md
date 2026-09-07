# El rediseño · por qué la app parecía hecha por una máquina

Este documento explica **qué se cambió y por qué**, para que la próxima
pantalla que se añada no vuelva a caer en lo mismo.

---

## El diagnóstico

La app no estaba fea. Estaba **genérica**: tenía exactamente los rasgos que
delatan una interfaz sacada de un generador, y ninguno tenía que ver con
libros.

**1 · Los iconos eran emojis.** 🗓 📚 ✨ 👀 ⇄ en la barra, 🔍 🔔 🎨 ⚙ en la
cabecera, 📕 📷 📎 📌 dentro de los botones. Un emoji **no lo dibujamos
nosotras**: lo dibuja el sistema operativo de cada móvil, a todo color, con
otro grosor y otro estilo en cada uno. Cinco emojis multicolores en fila
sobre un fondo oscuro es lo primero que delata que nadie decidió cómo tenía
que verse esa fila.

**2 · Todo era la misma caja.** Un libro, un filtro, un botón, un aviso y un
mes tenían el mismo radio, el mismo borde de un píxel al 15 % y el mismo
relleno translúcido. Una pantalla de cajas idénticas no tiene jerarquía:
tiene relleno. No había forma de saber qué era importante mirando.

**3 · El adorno se repetía hasta dejar de ser adorno.** `✦ SECCIÓN ✦`
centrado entre dos filetes simétricos. En la ficha de un libro había **ocho
seguidos** bajando por la pantalla. Y una estrellita delante de casi cada
botón, que no significaba nada.

**4 · Morado cósmico con estrellas y orbes.** Degradados radiales, bolas
desenfocadas flotando y una rejilla de fondo. Es el aspecto por defecto de
«algo mágico», y podría ser de cualquier app: no sale de los libros, sale
del espacio.

**5 · Los libros no tenían cuerpo.** En una app que trata de libros, un
libro sin portada era **su inicial dentro de una caja redondeada** — la
misma caja que un filtro. Lo único de lo que trata la app era lo único que
no se veía.

**6 · Cinzel a 15 px.** Cinzel es una capital romana de inscripción, pensada
para tallar en piedra en grande. A tamaño de título de lista es incómoda de
leer, y es la fuente «de fantasía» que se coge por defecto.

---

## La dirección: **Ex Libris**

«Ex libris» es la etiqueta que alguien pega dentro de su libro para decir
que es suyo: *de los libros de…*. La app se llama Mi Biblioteca. No hay
nombre más exacto para el aspecto con el que se entra.

**La regla que ordena todo lo demás:** el material de esta app no es el
cosmos, es **un libro encuadernado**. Tela, cartón, hilo, papel crema y
latón estampado en caliente. Lo mágico sale del oficio y de la luz sobre el
latón, no de que algo brille por sí solo. **Aquí no hay nada que emita luz:
hay una lámpara fuera del encuadre y cosas que la reflejan.**

### Los colores, y de dónde sale cada uno

| Token | Valor | Qué es |
|---|---|---|
| `--void` | `#12100E` | tinta: el negro cálido de una estantería en penumbra |
| `--deep` | `#1C1917` | el cartón de la tapa |
| `--dusk` | `#292420` | la tela del lomo |
| `--purple` | `#7B2C36` | burdeos: la etiqueta del lomo y la cinta de leer |
| `--lilac` | `#D9C7A8` | vitela: el papel viejo del canto |
| `--gold` | `#C9A24A` | latón: el título estampado |
| `--text` | `#EDE6DA` | blanco roto, cálido |

El burdeos ocupa la ranura del acento primario y el latón la del realce, así
que **toda la app cambia de material sin tocar una regla de CSS**. Ese era
el objetivo del sistema de temas desde la historia #13 y aquí se cobra.

Todos los pares pasan contraste AA: `npm run test:contrast`.

### Las tipografías

- **Fraunces** para los títulos, pidiendo sus ejes propios (`SOFT@40`,
  `WONK@1`), que redondean los remates e inclinan la «g». Sin pedirlos es
  una serif cualquiera; con ellos tiene mano.
- **Literata** para todo lo que se lee. Está dibujada para leer en pantalla,
  que es lo único que se hace en esta app.

Los autores van **en cursiva**, como en la ficha de una biblioteca.

---

## La pieza que lo cambia todo: **el lomo**

Es el único sitio donde se gasta la audacia. Cada libro sin portada se
dibuja como lo que es: **tela, dos filetes de latón, el título estampado en
vertical y el canto de las hojas asomando por la derecha.**

Y la tela **no es aleatoria ni un degradado**: son ocho colores de
encuadernación de verdad —burdeos, teja, ocre, oliva, bosque, pizarra,
marino y ciruela— y **a cada género le toca siempre el mismo**.

> Eso convierte una lista en una estantería: antes de leer un solo título ya
> se ve que los tres de arriba son del mismo género. Un color por libro
> sería decoración; un color por género es **información**.

Está en [`src/lomo.js`](../src/lomo.js) y lo usan el plan, la estantería, el
tracker, la ficha, «qué leer después», «¿cuál primero?», los huecos del plan
y el alta de un libro.

---

## Lo demás, en una línea cada uno

- **Los iconos** se dibujan aquí, con un solo grosor de trazo, y toman el
  color del texto. Salen del oficio: una cinta de leer, tres lomos en una
  balda, un libro abierto, dos fichas de biblioteca, dos flechas que se
  cruzan. Se declaran una vez en el pliego `<svg>` del `index.html` y se
  usan con `<use>`; `src/icons.js` es solo la forma de pedirlos.
- **Un libro ya no es una tarjeta**, es una entrada de catálogo: el lomo, el
  texto y un filete que la separa de la siguiente.
- **Una sola marca de «activo» en toda la app**: un filete de latón debajo.
  La pestaña de navegación, el año, los filtros y las pestañas de entrar o
  crear cuenta la comparten, así que se aprende una vez.
- **El titulillo** sustituye a `✦ SECCIÓN ✦`: rótulo pegado al margen
  izquierdo y filete hasta el borde derecho. Y en la ficha del libro son
  **cuatro en vez de ocho** — «estado» y «en el plan» eran dos rótulos para
  una sola pregunta, y las estrellas y la reseña son la misma decisión.
- **La ficha del libro empieza por una portadilla**: el libro de pie, a
  tamaño de verdad, y sus datos al lado. Antes era una portada desenfocada
  estirada de banner con una miniatura de 60 px encima.
- **El acceso es una portada**: «Ex libris», el nombre en grande, un filete
  de latón y lo que promete debajo. Es lo primero que ve quien llega.
- **Un dato al margen, no una cápsula**: género, páginas y fecha van
  separados por puntos, como el pie de imprenta. Cuatro pastillas con borde
  pesaban lo mismo que el título del libro.
- **El botón de añadir** es una placa con filete de latón, no un círculo que
  brilla.
- **Se apagó el cosmos** —estrellas, orbes y rejilla— y en su sitio hay
  grano de papel y una viñeta como de lámpara. Sigue siendo un token, así
  que **Grimorio conserva sus estrellas**.

---

## Qué NO se tocó, a propósito

- **Los nueve temas siguen ahí**, Grimorio incluido: sigue descrito como «el
  aspecto original» y se elige en la tienda. Lo que cambia es con cuál se
  entra.
- **El emoji del rol** (`⚓ Ancla`, `⚡ Corto`) sigue **en el dato**, porque
  media app compara contra esa cadena exacta (`gaps-core`, `duel-core`, el
  alta). Cambiarlo sería una migración de las bibliotecas de todo el mundo
  por un motivo estético: se le quita **al pintar**, que es donde molesta.
- **Los emojis que son contenido**: el de cada estantería, el de cada tema
  en su ficha de tienda, las reacciones de los comentarios y la gata. Los
  eligió alguien; no son cromo de la interfaz.

---

## Cómo mirar el diseño sin adivinar

```bash
npm run capturas
```

Levanta la app entera en Chromium contra el emulador, crea una cuenta, le
pone libros en varios estados y **fotografía catorce pantallas** en
`capturas/`. No es una prueba: no falla ni pasa, deja imágenes.

Existe porque un rediseño no se juzga leyendo CSS. Hasta que no hubo una
forma de mirar la app con libros dentro, cada decisión de color y de
espaciado era una suposición.

Y para no romper nada por el camino:

```bash
npm run test:contrast    # los nueve temas, contraste AA
npm run test:pantallas   # el marcado real en Chromium
npm run test:e2e         # la app entera contra el emulador
```

---

## La regla para lo que venga

Antes de añadir una pantalla, tres preguntas:

1. **¿Este icono lo hemos dibujado nosotras?** Si es un emoji, no.
2. **¿Esta caja se distingue de la de al lado?** Si todo lleva borde y
   radio, nada destaca. Una placa por pantalla; lo demás, filetes.
3. **¿Este adorno sale de un libro?** Si sale del espacio, sobra.

Y la de Chanel: antes de salir de casa, mírate al espejo y quítate una cosa.
