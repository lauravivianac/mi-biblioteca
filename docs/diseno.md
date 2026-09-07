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

Y la tela **no es aleatoria ni un degradado**: son ocho telas de
encuadernación y **a cada género le toca siempre la misma**.

> Eso convierte una lista en una estantería: antes de leer un solo título ya
> se ve que los tres de arriba son del mismo género. Un color por libro
> sería decoración; un color por género es **información**.

Está en [`src/lomo.js`](../src/lomo.js) y lo usan el plan, la estantería, el
tracker, la ficha, «qué leer después», «¿cuál primero?», los huecos del plan
y el alta de un libro.

### Y la encuadernación es del tema, no del código

El primer intento tenía las ocho telas **escritas a mano en el módulo**, y eso
daba lomos de cuero con pan de oro en Máquina —que es brutalista y
monoespaciado— y **lomos negros sobre papel crema en Pergamino**, que no
parecen libros: parecen agujeros.

Así que las telas son tokens y **cada tema declara las suyas**:

| | |
|---|---|
| **Ex Libris** | telas de encuadernar: burdeos, teja, ocre, oliva, bosque, pizarra, marino, ciruela |
| **Grimorio** | el armario de libros de magia: cueros oscuros y pan de oro |
| **Obsidiana** | sin color, como todo el tema: ocho claridades del negro al grafito |
| **Pergamino** | tonos medios sobre papel, y el canto de las hojas del color del propio papel |
| **Herbario** | cuaderno de campo: hoja, musgo, tierra y otoño |
| **Marea** | lo que hay bajo el agua: índigo, petróleo, verdemar |
| **Gótico** | vino y negro, y nada más |
| **Sakura** | seda teñida: rosas apagados y ciruela |
| **El Principito** | el desierto al anochecer: arena, terracota, salvia, azul de noche |
| **Máquina** | ni tela ni pan de oro: bloques planos de gris con una etiqueta |

**Y no se eligen a mano: se derivan.** Ochenta telas escogidas una a una acaban
pareciéndose sin que nadie lo note —en el primer intento había cuatro pares
casi idénticos—. Cada tema da los **ocho tonos de su familia** y una **rampa de
claridad**: los tonos ponen el carácter y la rampa garantiza que se distingan,
porque cada tela es más clara que la anterior aunque el tono se repita. Se
calcula en OKLCH, que es donde una diferencia igual de números se ve como una
diferencia igual.

**El estampado también sale del oficio:** en una tela oscura se estampa en oro
y en una clara se estampa en oscuro. Cada tela trae el suyo, elegido por
contraste — no por un número redondo, porque el «oro» de Pergamino es casi
marrón y el de Máquina es verde ácido.

### Lo que comprueba `npm run test:contrast`

Además del contraste AA de siempre, ahora comprueba las **ochenta telas**:

- que cada una **se despegue del fondo** de su tema (ΔE ≥ 8),
- que **las ocho se distingan entre sí** (ΔE ≥ 5),
- y que **el título estampado se lea** sobre cualquiera de ellas (4.5 : 1).

Con una medida importante: para «¿se parecen estos dos colores?» **no vale el
contraste de WCAG**, que solo mide claridad — a un burdeos y a un verde botella
de la misma claridad les da 1.00 y los declara idénticos. Se usa distancia de
color de verdad (ΔE sobre CIE Lab). El contraste de WCAG se reserva para lo que
sí es texto: el estampado.

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

## Los adornos

En un libro impreso cada capítulo termina con una **viñeta del impresor**: una
hoja, un rombo, una rama. No sirve para nada y por eso está — es lo que hace
que un libro se sienta hecho por alguien.

Cada tema tiene la suya, y cierra la lista cuando terminas de bajar: el sitio
exacto donde un adorno no molesta, porque ya has leído todo lo demás.

| | |
|---|---|
| **Ex Libris** | el florón del impresor |
| **Grimorio** | una estrella fugaz |
| **Obsidiana** | un rombo, y nada más |
| **Pergamino** | la hoja de Aldo, el adorno de imprenta más viejo que existe |
| **Herbario** | una ramita prensada |
| **Marea** | el mar, alejándose |
| **Gótico** | la vela que alumbra el capítulo |
| **Sakura** | la rama en flor |
| **El Principito** | la boa que se tragó a un elefante |
| **Máquina** | una marca de arrastre de papel |

Están dibujadas **con el mismo trazo que los iconos** —un solo grosor, sin
relleno—, porque un adorno de otra mano se nota más que no tener ninguno.

Los diez dibujos viven en el pliego `<svg>` del `index.html` y **se eligen solo
con CSS**: nada que repintar al cambiar de tema, y ninguna posibilidad de que
la viñeta se quede en la del tema anterior.

### Y El Principito tiene una escena, a color

Los colores solos no hacen un tema de *El Principito*. Abajo del todo hay una
ilustración: **él**, con su capa y su corona, **la rosa que sostiene**, **el
zorro** sentado a su lado —«no se ve bien sino con el corazón»—, las **rosas del
jardín** que le enseñaron que la suya era única, y **la duna** del desierto donde
cayó el aviador.

**A color y con cara, no en línea suelta.** El primer intento era trazo fino
como los iconos y no funcionaba: a ese tamaño un dibujo sin relleno no es un
dibujo, es un plano. La escena se desvanece por arriba con una máscara para que
no tenga un borde recto contra el fondo — la duna aparece, no se pega.

> **Está dibujada aquí, no calcada.** Las ilustraciones originales de
> Saint-Exupéry siguen protegidas en varios países y esta app va a las tiendas.
> Del libro se toman **las cosas** —él, la rosa, el zorro, las rosas del
> jardín—, no los trazos.

Por eso su viñeta de remate no es la rosa: ya está en la escena, y repetirla
sería decir lo mismo dos veces. Es el primer dibujo del libro, el que las
personas mayores ven como un sombrero.

Y por eso también, en este tema la lista termina **antes** de donde empieza la
escena: sin ese hueco, la viñeta caía encima de su cabeza.

### La estrella fugaz de Grimorio

Cruza el cielo cada once segundos y se va. Es el único movimiento que se ha
añadido, y **quien pida menos movimiento no la ve nunca**.

---

## Qué NO se tocó, a propósito

- **Los diez temas siguen ahí**, Grimorio incluido: sigue descrito como «el
  aspecto original» y se elige en la tienda. Lo que cambia es con cuál se
  entra — y ahora cada uno tiene su propia encuadernación en vez de la
  prestada del vecino.
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
pone libros en varios estados y **fotografía treinta y cuatro pantallas** en
`capturas/` — incluidas la estantería y el plan **en cada uno de los diez
temas**. No es una prueba: no falla ni pasa, deja imágenes.

Eso último no es un extra: mirar solo el tema de casa es exactamente cómo se
degradan los otros nueve sin que nadie se entere.

Existe porque un rediseño no se juzga leyendo CSS. Hasta que no hubo una
forma de mirar la app con libros dentro, cada decisión de color y de
espaciado era una suposición.

Y para no romper nada por el camino:

```bash
npm run test:contrast    # los diez temas: contraste AA y las ochenta telas
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
