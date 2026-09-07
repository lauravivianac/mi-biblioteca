# La mascota · encargo de ilustración

## Antes de los prompts: el número

La mascota **no es un dibujo**. Es esto:

| | |
|---|---|
| Especies | 6 — Gatita, Coneja, Búho, Zorrita, Mapache, Panda |
| Pelajes | 7 — Atigrada, Nocturna, Nieve, Canela, Ceniza, Tinta, Trigo |
| Accesorios | 6 — Nada, Bufanda, Gafas, Lazo, Gorrito, Flor |
| Escenas | 9 — Estantería, Planta, Lámpara, Taza, Rama en flor, Velas… |
| Ánimos | 5 — contenta, leyendo, expectante, dormida, celebrando |

**11.340 combinaciones.** Y **14 de esas piezas se desbloquean leyendo**: el
pelaje Canela sale con el primer libro, las Gafas con la primera reseña, la
Rama en flor al terminar el bloque oriental. Ese es el motor de las historias
#38 a #43 — leer es lo que cuida a la mascota.

Por eso está dibujada en código y no es una imagen: **ninguna cantidad razonable
de ilustraciones cubre 11.340 combinaciones.**

Así que hay que elegir. No es una decisión técnica, es tuya.

---

## Las dos salidas

### A · Imágenes, con menos opciones ← lo que yo haría

**30 ilustraciones**: 6 especies × 5 ánimos. Cada especie con su color natural
—la zorra naranja, el panda blanco y negro— y sin accesorios.

| Se gana | Se pierde |
|---|---|
| Se ve **bien**, que es el problema que hay que resolver | Los 7 pelajes y los 6 accesorios |
| Una sola mano dibujando las seis | 13 de las 14 cosas que se desbloquean leyendo |

**Y ese último punto tiene arreglo.** Los desbloqueables no tienen que vivir en
el pelaje: **se mueven a las especies y a las escenas.** Hoy las seis especies
están abiertas desde el principio; si cuatro se ganan leyendo —la Zorrita con
el primer clásico, el Búho con el primer tomo de 500 páginas— el motor sigue
entero, con menos piezas pero mejores. Las 9 escenas ya se desbloquean así.

La animación sí se pierde: hoy respira, mueve la cola y le flotan los zzz. De
eso **puedo rescatar la respiración** con un movimiento muy lento sobre la
imagen; la cola y los zzz no.

### B · Imágenes como referencia, el código las sigue

Encargas **6 láminas** —una por especie, con sus poses— y yo redibujo el SVG
siguiendo esas formas. Se conserva todo: las 11.340 combinaciones, los 14
desbloqueables y la animación.

**Pero el resultado depende de mi mano**, que es justo lo que no funcionó. No
te lo recomiendo salvo que los desbloqueables te importen más que el aspecto.

---

## Los prompts · para la salida A

### El bloque de estilo

Se pega **siempre** delante. Es el mismo espíritu que las escenas de los temas
(ver [`ilustraciones.md`](./ilustraciones.md)), para que la app sea una sola
cosa y no dos.

```
Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento
visibles. Colores apagados y cálidos, nada saturado ni digital.
Personaje tierno, redondeado, de cabeza grande y cuerpo pequeño.

MUY IMPORTANTE:
· Fondo TRANSPARENTE. Sin fondo, sin escenario, sin suelo, sin sombra
  debajo — el personaje va recortado y solo.
· Cuerpo entero, sentado, de tres cuartos, mirando ligeramente a la
  izquierda. Centrado, con un poco de aire alrededor.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco.
· Cuadrado, 512 × 512 px.
```

### Cómo generarlas para que casen

Esto importa más que los prompts: **las cinco poses de una misma especie tienen
que salir de la misma conversación, una detrás de otra**, pidiendo cada vez
«el mismo personaje de la imagen anterior, misma escala, mismo tamaño de
cabeza, misma altura de los ojos, solo cambia la pose». Si las generas sueltas,
la mascota cambia de tamaño y de cara al cambiar de ánimo, y eso se nota más
que si estuviera mal dibujada.

### Las seis especies

| | Descripción para el prompt |
|---|---|
| **Gatita** | `una gatita atigrada color miel con la panza crema y rayas suaves` |
| **Coneja** | `una coneja gris claro de orejas largas caídas y panza blanca` |
| **Búho** | `un búho pequeño y regordete, marrón cálido, plumas moteadas y ojos grandes de ámbar` |
| **Zorrita** | `una zorrita naranja teja con la punta de la cola y la panza blancas` |
| **Mapache** | `un mapache gris con antifaz negro y cola anillada` |
| **Panda** | `un panda pequeño y regordete, blanco y negro` |

### Los cinco ánimos

| | Añade al final del prompt |
|---|---|
| **contenta** | `sentada tranquila, ojos cerrados en una sonrisa, orejas relajadas` |
| **leyendo** | `sentada con un libro abierto pequeño entre las patas, mirando el libro con atención` |
| **expectante** | `inclinada hacia delante, orejas muy arriba, ojos grandes y brillantes muy abiertos, a punto de algo` |
| **dormida** | `hecha un ovillo durmiendo, ojos cerrados, muy relajada, la cola alrededor del cuerpo` |
| **celebrando** | `dando un saltito de alegría, patitas delanteras arriba, ojos cerrados de contenta` |

Un prompt completo queda así:

> *[bloque de estilo]* + `una zorrita naranja teja con la punta de la cola y la
> panza blancas, sentada con un libro abierto pequeño entre las patas, mirando
> el libro con atención.`

---

## Lo que hace falta de vuelta

**30 PNG con transparencia**, 512 × 512, nombrados `especie-animo.png`:

```
gato-contenta.png     conejo-contenta.png    buho-contenta.png
gato-leyendo.png      conejo-leyendo.png     buho-leyendo.png
gato-expectante.png   conejo-expectante.png  buho-expectante.png
gato-dormida.png      conejo-dormida.png     buho-dormida.png
gato-celebrando.png   conejo-celebrando.png  buho-celebrando.png

zorro-*.png           mapache-*.png          panda-*.png
```

**Si 30 son demasiadas, el mínimo son 18**: las tres primeras poses (contenta,
leyendo, dormida) por especie. *Expectante* y *celebrando* reutilizan
*contenta* — se pierde matiz, pero no se rompe nada.

De la integración me encargo yo: recortar, pasar a WebP con presupuesto de peso
—esta app no tiene empaquetador y cada kilobyte se descarga tal cual—, colocar
la respiración lenta, y mover los desbloqueables del pelaje a las especies.

**Empieza por una sola especie y sus cinco poses.** Si esa tanda queda bien, el
resto es repetir; si no, cambiamos el prompt habiendo gastado cinco imágenes y
no treinta.
