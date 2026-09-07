# La mascota · encargo de ilustración

## Antes de los prompts: el número

La mascota **no es un dibujo**. Es esto:

| | |
|---|---|
| Especies | 8 — Gatita, Coneja, Búho, Zorrita, Mapache, Panda, **Oso** y **Lobo** |
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

### A · Imágenes, con menos opciones ← **elegida**

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

#### La prueba de los diez y los cincuenta

> «El dinosaurio no es lo que espero. Quiero que aplique para un niño de 10 o un
> adulto de 50.»

**Es el criterio de aceptación de todas, y hasta ahora estaba solo en la cabeza.**
Una mascota que solo vale para un niño pequeño deja fuera a media app: la lectora
de diez la ve infantil y la de cincuenta no se la pone en el teléfono.

La primera versión de este bloque decía *«ilustración infantil»* y *«cabeza
grande y cuerpo pequeño»*, que es literalmente la receta de un peluche kawaii, y
**no describía las seis que hay**. Se coló porque las seis salieron bien de
todos modos; se notó al pedir la séptima, que salió pegatina de cuarto de bebé
—verde menta pastel, chapetas rosas, borde de troquelado, cabeza de media
figura, relleno plano y lunares decorativos— y al lado de las otras parecía de
otra app.

Mirando las seis que sí funcionan, lo que tienen en común es que **son animales,
no juguetes**: anatomía y pelaje de animal de verdad, colores de animal de
verdad, ternura por la expresión y no por la deformación. Eso es lo que aguanta
los diez y los cincuenta a la vez, y es lo que ahora dice el bloque.

```
Ilustración de animales en acuarela y lápiz de color, con técnica
realista, del estilo de un libro ilustrado clásico de cuentos de
animales. Pintada a mano, con grano de papel. NO es una lámina de
historia natural: eso retrata un ejemplar de museo, y aquí el
personaje tiene que tener vida. El pelaje o las plumas dibujados a
trazos finos y visibles, con volumen. Anatomía y proporciones de
animal de verdad, apenas estilizadas. Colores naturales, terrosos y
apagados: nada de pastel de guardería ni de saturación digital.

Ternura por la EXPRESIÓN —la mirada, el gesto—, nunca por deformar:
tiene que gustarle igual a alguien de diez años y a alguien de
cincuenta.

LA EDAD LA DICE CADA PERSONAJE, no este bloque: hay crías y hay
adultos, y confundirlos es lo que ha hecho fallar más intentos.

NADA de esto:
· chapetas ni círculos rosas en los mofletes
· contorno blanco o crema alrededor de la figura, como una pegatina
  troquelada
· cabeza enorme sobre un cuerpo diminuto, ni patas de muñón
· relleno plano de color, sin textura
· lunares, estrellitas, corazones ni brillos decorativos
· arrugas, pliegues colgando, papada, párpados caídos ni postura
  desplomada: ninguno de estos personajes es un animal VIEJO — un
  adulto sereno no es un anciano cansado

MUY IMPORTANTE:
· Fondo TRANSPARENTE. Sin fondo, sin escenario, sin suelo, sin sombra
  debajo — el animal va recortado y solo.
· Cuerpo entero, sentado, de tres cuartos, mirando ligeramente a la
  izquierda. Centrado, con un poco de aire alrededor.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco.
· Cuadrado, 512 × 512 px.
```

Los prompts de las seis primeras, más abajo, **se dejan tal cual salieron**: son
el registro de cómo se generó lo que hoy está en la app. Si alguna hay que
rehacerla, se rehace con este bloque.

### Cómo generarlas para que casen

Esto importa más que los prompts: **las cinco poses de una misma especie tienen
que salir de la misma conversación, una detrás de otra**, pidiendo cada vez
«el mismo personaje de la imagen anterior, misma escala, mismo tamaño de
cabeza, misma altura de los ojos, solo cambia la pose». Si las generas sueltas,
la mascota cambia de tamaño y de cara al cambiar de ánimo, y eso se nota más
que si estuviera mal dibujada.

#### Y ENTRE especies, con una de las que ya hay delante

Esta regla llevaba escrita desde el principio **solo dentro de una especie** —
y ese hueco no se notó en seis intentos seguidos. Las seis primeras salieron
cada una de su propia conversación, guiadas nada más que por el bloque de
estilo, y casaron igual: son seis mamíferos peludos, o casi, y el parecido
venía puesto por el propio animal.

**El dinosaurio es el primero que no lo trae de fábrica**, y ahí se vio que un
párrafo de texto no transmite un estilo. La tercera versión estaba bien
dibujada, era una cría de verdad y aun así se salía de la fila.

Así que a partir de aquí: **se adjunta una de las seis a la conversación** y se
pide *«el mismo ilustrador, la misma técnica y la misma paleta que esta imagen,
pero el personaje es…»*. Una imagen dice de una vez lo que veinte líneas de
prompt no consiguen.

### Las ocho especies

**Y cada una tiene nombre**, puesto de fábrica y cambiable: Cleo, Nube, Ulises,
Rita, Coco, Bambú, Tomás y Rico. No es un adorno — una lista que dice «Gatita,
Coneja, Búho» es un catálogo de animales; una que dice «Cleo, Nube, Ulises» son
ocho personajes esperando.

| | Nombre | Descripción para el prompt |
|---|---|---|
| **Gatita** | Cleo | `una gatita atigrada color miel con la panza crema y rayas suaves` |
| **Coneja** | Nube | `una coneja gris claro de orejas largas caídas y panza blanca` |
| **Búho** | Ulises | `un búho pequeño y regordete, marrón cálido, plumas moteadas y ojos grandes de ámbar` |
| **Zorrita** | Rita | `una zorrita naranja teja con la punta de la cola y la panza blancas` |
| **Mapache** | Coco | `un mapache gris con antifaz negro y cola anillada` |
| **Panda** | Bambú | `un panda pequeño y regordete, blanco y negro` |
| **Oso** | Tomás | `un oso pardo ADULTO, de pelaje castaño cálido y hocico color miel` |
| **Lobo** | Rico | `un LOBO ADULTO de pelaje gris ceniza con el pecho claro, orejas erguidas y mirada serena` |

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

## Los prompts, listos para copiar

**Seis conversaciones, una por especie. Cinco mensajes en cada una, seguidos.**
Eso es lo que hace que la mascota no cambie de tamaño ni de cara al pasar de un
ánimo a otro — y eso se nota más que si estuviera mal dibujada.

Si la herramienta no sabe hacer el fondo transparente, el prompt le pide un
magenta plano: ese color no está en ninguna mascota, así que lo recorto yo sin
que se coma un solo pelo.

### Gatita · `gato`

**Mensaje 1**

```
Dibuja una gatita atigrada color miel, con la panza crema y rayas suaves, sentada tranquila, con los ojos cerrados en una sonrisa y las orejas relajadas.

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Personaje tierno y
redondeado, de cabeza grande y cuerpo pequeño.

MUY IMPORTANTE:
· Fondo TRANSPARENTE. Sin fondo, sin escenario, sin suelo y SIN SOMBRA
  debajo: el personaje va recortado y solo. Si no puedes hacer el fondo
  transparente, hazlo de un magenta puro y plano (#FF00FF).
· Cuerpo entero, de tres cuartos, mirando ligeramente a la izquierda.
  Centrado en el cuadro, con un poco de aire alrededor.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco.
· Cuadrado, 512 × 512 px.

Guarda este personaje como referencia: te voy a pedir cuatro poses más
del MISMO, y tienen que ser idénticas en color, forma y tamaño.
```

**Mensaje 2** — *leyendo*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está sentada con un libro abierto pequeño entre las patas delanteras, mirando el libro con atención.
```

**Mensaje 3** — *expectante*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está inclinada hacia delante, con las orejas muy arriba y los ojos grandes, brillantes y muy abiertos, como a punto de algo.
```

**Mensaje 4** — *dormida*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está hecha un ovillo durmiendo, con los ojos cerrados, muy relajada y la cola alrededor del cuerpo.
```

**Mensaje 5** — *celebrando*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está dando un saltito de alegría, con las patitas delanteras arriba y los ojos cerrados de contenta.
```

### Coneja · `conejo`

**Mensaje 1**

```
Dibuja una coneja gris claro, de orejas largas caídas y panza blanca, sentada tranquila, con los ojos cerrados en una sonrisa y las orejas relajadas.

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Personaje tierno y
redondeado, de cabeza grande y cuerpo pequeño.

MUY IMPORTANTE:
· Fondo TRANSPARENTE. Sin fondo, sin escenario, sin suelo y SIN SOMBRA
  debajo: el personaje va recortado y solo. Si no puedes hacer el fondo
  transparente, hazlo de un magenta puro y plano (#FF00FF).
· Cuerpo entero, de tres cuartos, mirando ligeramente a la izquierda.
  Centrado en el cuadro, con un poco de aire alrededor.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco.
· Cuadrado, 512 × 512 px.

Guarda este personaje como referencia: te voy a pedir cuatro poses más
del MISMO, y tienen que ser idénticas en color, forma y tamaño.
```

**Mensaje 2** — *leyendo*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está sentada con un libro abierto pequeño entre las patas delanteras, mirando el libro con atención.
```

**Mensaje 3** — *expectante*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está inclinada hacia delante, con las orejas muy arriba y los ojos grandes, brillantes y muy abiertos, como a punto de algo.
```

**Mensaje 4** — *dormida*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está hecha un ovillo durmiendo, con los ojos cerrados, muy relajada y la cola alrededor del cuerpo.
```

**Mensaje 5** — *celebrando*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está dando un saltito de alegría, con las patitas delanteras arriba y los ojos cerrados de contenta.
```

### Búho · `buho`

**Mensaje 1**

```
Dibuja un búho pequeño y regordete, marrón cálido, con plumas moteadas y ojos grandes de ámbar, sentada tranquila, con los ojos cerrados en una sonrisa y las orejas relajadas.

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Personaje tierno y
redondeado, de cabeza grande y cuerpo pequeño.

MUY IMPORTANTE:
· Fondo TRANSPARENTE. Sin fondo, sin escenario, sin suelo y SIN SOMBRA
  debajo: el personaje va recortado y solo. Si no puedes hacer el fondo
  transparente, hazlo de un magenta puro y plano (#FF00FF).
· Cuerpo entero, de tres cuartos, mirando ligeramente a la izquierda.
  Centrado en el cuadro, con un poco de aire alrededor.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco.
· Cuadrado, 512 × 512 px.

Guarda este personaje como referencia: te voy a pedir cuatro poses más
del MISMO, y tienen que ser idénticas en color, forma y tamaño.
```

**Mensaje 2** — *leyendo*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está sentada con un libro abierto pequeño entre las patas delanteras, mirando el libro con atención.
```

**Mensaje 3** — *expectante*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está inclinada hacia delante, con las orejas muy arriba y los ojos grandes, brillantes y muy abiertos, como a punto de algo.
```

**Mensaje 4** — *dormida*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está hecha un ovillo durmiendo, con los ojos cerrados, muy relajada y la cola alrededor del cuerpo.
```

**Mensaje 5** — *celebrando*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está dando un saltito de alegría, con las patitas delanteras arriba y los ojos cerrados de contenta.
```

### Zorrita · `zorro`

**Mensaje 1**

```
Dibuja una zorrita naranja teja, con la punta de la cola y la panza blancas, sentada tranquila, con los ojos cerrados en una sonrisa y las orejas relajadas.

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Personaje tierno y
redondeado, de cabeza grande y cuerpo pequeño.

MUY IMPORTANTE:
· Fondo TRANSPARENTE. Sin fondo, sin escenario, sin suelo y SIN SOMBRA
  debajo: el personaje va recortado y solo. Si no puedes hacer el fondo
  transparente, hazlo de un magenta puro y plano (#FF00FF).
· Cuerpo entero, de tres cuartos, mirando ligeramente a la izquierda.
  Centrado en el cuadro, con un poco de aire alrededor.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco.
· Cuadrado, 512 × 512 px.

Guarda este personaje como referencia: te voy a pedir cuatro poses más
del MISMO, y tienen que ser idénticas en color, forma y tamaño.
```

**Mensaje 2** — *leyendo*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está sentada con un libro abierto pequeño entre las patas delanteras, mirando el libro con atención.
```

**Mensaje 3** — *expectante*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está inclinada hacia delante, con las orejas muy arriba y los ojos grandes, brillantes y muy abiertos, como a punto de algo.
```

**Mensaje 4** — *dormida*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está hecha un ovillo durmiendo, con los ojos cerrados, muy relajada y la cola alrededor del cuerpo.
```

**Mensaje 5** — *celebrando*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está dando un saltito de alegría, con las patitas delanteras arriba y los ojos cerrados de contenta.
```

### Mapache · `mapache`

**Mensaje 1**

```
Dibuja un mapache gris, con antifaz negro y cola anillada, sentada tranquila, con los ojos cerrados en una sonrisa y las orejas relajadas.

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Personaje tierno y
redondeado, de cabeza grande y cuerpo pequeño.

MUY IMPORTANTE:
· Fondo TRANSPARENTE. Sin fondo, sin escenario, sin suelo y SIN SOMBRA
  debajo: el personaje va recortado y solo. Si no puedes hacer el fondo
  transparente, hazlo de un magenta puro y plano (#FF00FF).
· Cuerpo entero, de tres cuartos, mirando ligeramente a la izquierda.
  Centrado en el cuadro, con un poco de aire alrededor.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco.
· Cuadrado, 512 × 512 px.

Guarda este personaje como referencia: te voy a pedir cuatro poses más
del MISMO, y tienen que ser idénticas en color, forma y tamaño.
```

**Mensaje 2** — *leyendo*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está sentada con un libro abierto pequeño entre las patas delanteras, mirando el libro con atención.
```

**Mensaje 3** — *expectante*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está inclinada hacia delante, con las orejas muy arriba y los ojos grandes, brillantes y muy abiertos, como a punto de algo.
```

**Mensaje 4** — *dormida*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está hecha un ovillo durmiendo, con los ojos cerrados, muy relajada y la cola alrededor del cuerpo.
```

**Mensaje 5** — *celebrando*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está dando un saltito de alegría, con las patitas delanteras arriba y los ojos cerrados de contenta.
```

### Panda · `panda`

**Mensaje 1**

```
Dibuja un panda pequeño y regordete, blanco y negro, sentada tranquila, con los ojos cerrados en una sonrisa y las orejas relajadas.

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Personaje tierno y
redondeado, de cabeza grande y cuerpo pequeño.

MUY IMPORTANTE:
· Fondo TRANSPARENTE. Sin fondo, sin escenario, sin suelo y SIN SOMBRA
  debajo: el personaje va recortado y solo. Si no puedes hacer el fondo
  transparente, hazlo de un magenta puro y plano (#FF00FF).
· Cuerpo entero, de tres cuartos, mirando ligeramente a la izquierda.
  Centrado en el cuadro, con un poco de aire alrededor.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco.
· Cuadrado, 512 × 512 px.

Guarda este personaje como referencia: te voy a pedir cuatro poses más
del MISMO, y tienen que ser idénticas en color, forma y tamaño.
```

**Mensaje 2** — *leyendo*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está sentada con un libro abierto pequeño entre las patas delanteras, mirando el libro con atención.
```

**Mensaje 3** — *expectante*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está inclinada hacia delante, con las orejas muy arriba y los ojos grandes, brillantes y muy abiertos, como a punto de algo.
```

**Mensaje 4** — *dormida*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está hecha un ovillo durmiendo, con los ojos cerrados, muy relajada y la cola alrededor del cuerpo.
```

**Mensaje 5** — *celebrando*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está dando un saltito de alegría, con las patitas delanteras arriba y los ojos cerrados de contenta.
```

Los cuatro mensajes de seguimiento son **los mismos para las seis especies**:
cambia solo la pose. Si te resulta más cómodo, cópialos una vez y reutilízalos.

---

## Los adultos: el Oso y el Lobo, y el Cuervo que falta

### El diagnóstico, después de fallar tres veces con el dinosaurio

> «¿Me entendiste bien lo que quería? Personajes más masculinos, **el que sea**
> entonces, pero uno que siga la línea anterior y aplique para hombres también.»

Me agarré a la palabra «dinosaurio» y gasté tres intentos en ella. La petición
era otra, y con la pregunta correcta delante el problema se ve en dos segundos:

**LAS SIETE SON CRÍAS.** Gatita, Coneja, Zorrita —hasta el nombre va en
diminutivo—, y los tres que serían masculinos (Ulises, Coco, Bambú) están
dibujados como bebés redonditos igual que las otras. El sesgo no está en qué
animal es cada una: **está en la edad.** «Bebé» es el registro que hace que
todo el armario se lea como de niñas, y por eso cada vez que empujaba al
dinosaurio hacia «cría» salía más de lo mismo — el último parecía un pollito
en un cascarón.

Y aquí está lo que hace que esto sea una historia y no un capricho: **la mitad
de las lectoras posibles no encuentra a nadie a quien elegir.** Un armario de
siete bebés no es neutral; es una elección, hecha sin darse cuenta.

### Lo que cambia: ADULTOS, no crías

No músculos, ni armas, ni azul de juguetería. Un animal adulto de un libro
ilustrado clásico: **con oficio, con carácter y con silueta propia.** Es
exactamente el registro que aguanta los diez y los cincuenta, y de paso el que
faltaba.

| | Se lee como | Por qué funciona | |
|---|---|---|---|
| **Un oso** · Tomás | grande y templado | Ancho, cálido, pardo. Nadie le tiene manía a un oso con bufanda | ✅ **hecho** |
| **Un lobo** · Rico | alerta y noble | Es el que elige un niño de diez. Sin enseñar los dientes no da miedo | ✅ **hecho** |
| **Un cuervo** · Tinta | listo y libresco | Negro tinta, silueta afilada. Es el que elige alguien de cincuenta | pendiente |

**El Oso salió a la primera** con la referencia adjunta, después de cuatro
intentos fallidos con el dinosaurio sin ella. Esa es toda la diferencia que hay
entre describir un estilo y enseñarlo.

Tres, no uno: el problema era que **no había ninguno**, y añadir un solo
personaje deja el reparto igual de escorado, solo que con una excepción.

Y los nombres acompañan — **Tomás, Rico y Tinta** frente a Cleo, Nube y Rita.
Un nombre en diminutivo deshace en una palabra lo que arregla el dibujo.

### Lo que cambia en el bloque de estilo, para estos tres

Todo lo demás sigue igual —acuarela y lápiz, trazo suave, paleta cálida,
fondo transparente—. Solo cambia la edad:

```
Es un animal ADULTO, no una cría: complexión sólida, hombros anchos,
postura erguida y tranquila, rasgos algo más marcados y hocico más
largo. Sereno y con carácter, nunca fiero ni amenazante.

NADA de: ojos enormes de bebé, cabeza desproporcionada, cuerpo de
bolita, ni cachetes de cachorro.
```

Y una advertencia que vale para los tres: **sereno no es serio.** Un animal
adulto con la mirada vacía se lee como un logotipo. La ternura sigue estando
en la expresión, solo que es la de alguien que ya ha leído mucho.

### El prompt, listo para copiar · el Oso

Empieza por este: es el más ancho de gustos y el que menos puede salir mal.
Para el lobo y el cuervo, el mismo mensaje cambiando la descripción.

```
[ADJUNTA UNA DE LAS SEIS QUE YA EXISTEN — la gatita o la zorrita]

Fíjate en la imagen que te adjunto: quiero el MISMO ilustrador, la
misma técnica, el mismo trazo suave, la misma paleta cálida y apagada
y el mismo nivel de detalle (bajo). Ese es el estilo, y no se negocia.

Ahora dibuja, en ese mismo estilo, un OSO PARDO ADULTO, de pelaje
castaño cálido y hocico color miel, sentado tranquilo con los ojos
cerrados en una sonrisa y las manos apoyadas en el regazo.

Es un animal ADULTO, no un cachorro: complexión sólida, hombros
anchos, postura erguida y tranquila, hocico largo y rasgos marcados.
Sereno y con carácter, nunca fiero ni amenazante — pero tampoco vacío:
la ternura está en la mirada, la de alguien que ya ha leído mucho.

NADA de esto:
· ojos enormes de bebé, cabeza desproporcionada ni cuerpo de bolita
· chapetas ni círculos rosas en los mofletes
· contorno blanco o crema alrededor de la figura, como una pegatina
· relleno plano de color, sin textura
· dientes, garras o gesto de ataque

MUY IMPORTANTE:
· Fondo TRANSPARENTE, sin escenario, sin suelo y SIN SOMBRA debajo. Si
  no puedes, hazlo de un magenta puro y plano (#FF00FF).
· Cuerpo entero, de tres cuartos, mirando ligeramente a la izquierda.
· Sin texto, sin firma, sin marca de agua, sin marco.
· Cuadrado, 512 × 512 px.

Guarda este personaje como referencia: te voy a pedir cuatro poses más
del MISMO, idénticas en color, forma y tamaño.
```

Las otras dos descripciones, para el mismo hueco:

- **Lobo** · `un LOBO ADULTO de pelaje gris ceniza con el pecho claro, orejas
  erguidas y mirada serena`
- **Cuervo** · `un CUERVO ADULTO de plumaje negro azulado con brillo suave,
  posado y con la cabeza ligeramente ladeada`

---

## El dinosaurio — *aparcado, con su historia*

Se intentó tres veces y las tres fallaron por causas distintas. Queda escrito
porque las tres lecciones valen para cualquier especie que venga después.

| | Qué salió | La causa |
|---|---|---|
| 1.ª | Pegatina de cuarto de bebé | El bloque pedía «ilustración infantil» y «cabeza grande, cuerpo pequeño» |
| 2.ª | **Un abuelo** | Al corregir el acabado se fue con él la juventud. Y el anclaje decía «lámina de historia natural», que retrata un ejemplar ADULTO |
| 3.ª | Bien dibujado y aun así fuera de la fila | **Lo que une a las seis no es el estilo: es el pelo.** Un reptil de escamas no se sienta con seis peluditos |
| 4.ª | Un pollito en un cascarón | El plumón arregló la textura, pero «cría» seguía empujando hacia bebé |

**La lección que más lejos llega** es la tercera: seis conversaciones sueltas
casaron porque eran seis mamíferos peludos —el parecido lo ponía el animal, no
el prompt—, y el primero que no lo traía de fábrica destapó el hueco. De ahí
sale la regla de adjuntar una de las seis, que ahora vale para todas.

Si algún día se retoma: con plumón, adulto y con la referencia adjunta.

### Por qué se intentó, y sigue valiendo

Míralas juntas: gatita, coneja, búho, zorrita, panda, mapache. **Seis
animalitos tiernos de bosque, todos del mismo registro.** Es un reparto
coherente y sesgado: la app se lee como «para una niña a la que le gustan los
animalitos», y eso deja fuera a muchos niños — y a muchas niñas también.

**Se abre desde el primer día**, como la Gatita y la Coneja. Esconder detrás de
diez libros la única mascota que no es un peluche anularía el motivo de
tenerla.

**Y sus poses son otras.** Las cinco de las seis primeras son de animal
tranquilo —sentada, ovillada, un saltito—, y copiadas a un dinosaurio darían un
séptimo animalito sentado. Aquí el ánimo es el mismo pero el cuerpo hace otra
cosa: se despatarra, se tumba panza arriba con las patas al aire, se agacha con
el culo en pompa como un perro que va a saltar. **Eso es lo que hace que valga
la pena que sea un dinosaurio y no otro bicho redondo.**

| | Nombre | Descripción para el prompt |
|---|---|---|
| **Dinosaurio** | Rex | `una cría de dinosaurio cubierta de plumón suave y esponjoso, color verde musgo apagado con el pecho color crema, ojos grandes y oscuros, hocico corto y una hilera de placas bajas y blandas por el lomo` |

**Un dinosaurio verde menta con lunares no es un animal: es un juguete.** Los
otros seis tienen color de animal —jengibre, gris de conejo, pardo de búho—, y
el dinosaurio necesita el suyo: oliva apagado con moteado, que es lo que pinta
cualquier lámina de paleontología. El color es la mitad de por qué la primera
versión se caía de la fila.

### Los tres añadidos al bloque de estilo

**El dinosaurio se cae de la fila por tres lados, y hubo que pisar los tres.**
Las dos primeras versiones fallaron en direcciones opuestas, que es la parte
que merece quedar escrita:

| | Qué salió | Por qué |
|---|---|---|
| 1.ª | Pegatina de cuarto de bebé | El bloque pedía «ilustración infantil» y «cabeza grande, cuerpo pequeño» |
| 2.ª | **Un abuelo** | Al corregirlo se fue con las chapetas también la juventud |

Y ahí está la lección: **«naturalista» y «cría» son dos ejes distintos, y yo
los junté en uno.** Lo que hacía de peluche a la primera era el *acabado*
—relleno plano, contorno de pegatina, chapetas—; lo que hace joven a un animal
es la *anatomía* —ojo grande, hocico corto, piel tersa—. Al quitar el acabado
de juguete me llevé por delante las señales de edad, y salió un reptil curtido
con papada, pliegues en el cuello y párpados caídos.

Un dinosaurio es el único de los siete donde esto se nota tanto, porque un
reptil adulto de verdad *tiene* la piel arrugada: el modelo lo dibuja bien y
sale un señor mayor. Con un gato no pasa.

```
· NADA de aspecto feroz: sin dientes afilados, sin garras a la vista,
  sin gesto de ataque. Es una cría tranquila, no un depredador.
· NADA de viejo: sin arrugas, sin pliegues colgando en el cuello o la
  panza, sin papada, sin párpados caídos, sin piel curtida. Es un
  animal recién salido del huevo.
· NADA de escamas ni de piel de reptil: va cubierto de PLUMÓN suave,
  dibujado a trazos finos como el pelo de un gatito.
· Ni brillos especulares en el ojo, ni acabado fotográfico: la misma
  mano suelta y suave que las otras seis.
```

**Y la tercera advertencia es la que de verdad lo arregla.** Las seis que ya
existen se parecen entre sí por una razón muy tonta: **todas tienen pelo.**
Trazo blando, silueta difusa, poco detalle, ninguna garra a la vista, paleta
cálida de jengibre y pardo. Un reptil de escamas —bordes duros, detalle alto,
uñas marcadas, verde frío— no se sienta con ellas por bien escrito que esté el
prompt, porque lo que las une no es el estilo: es la textura.

El plumón lo resuelve sin renunciar a nada. Un dinosaurio con plumón se dibuja
con el mismo trazo que un conejo, sigue siendo inconfundiblemente un
dinosaurio, y de paso es lo que dice la paleontología de los últimos treinta
años. Lo que rompía el molde de los seis animalitos de bosque era la ESPECIE,
no la piel.

### Dinosaurio · `dino`

**Mensaje 1**

```
[ADJUNTA AQUÍ UNA DE LAS SEIS QUE YA EXISTEN — por ejemplo la gatita o
la zorrita — Y EMPIEZA ASÍ:]

Fíjate en la imagen que te adjunto: quiero el MISMO ilustrador, la misma
técnica, el mismo trazo suave, la misma paleta cálida y apagada y el mismo
nivel de detalle (bajo). Ese es el estilo, y no se negocia.

Ahora dibuja, en ese mismo estilo, una CRÍA de dinosaurio recién salida del huevo: rechoncha, cubierta de PLUMÓN suave y esponjoso —dibujado a trazos finos, igual que el pelo del animal de la referencia—, de color verde musgo apagado con el pecho color crema, ojos GRANDES, redondos y oscuros, hocico corto, frente alta y una hilera de placas bajas y blandas por el lomo. Sentada con las patas estiradas hacia delante, la cola enroscada a un lado, la cabeza ladeada, sonriendo y con un bracito levantado saludando.

Es un animal JOVEN y de PLUMÓN: nada de escamas, nada de piel de reptil, nada de garras marcadas, nada de arrugas ni párpados caídos, y ningún brillo de foto en el ojo.

Ilustración de animales en acuarela y lápiz de color, con técnica
realista, del estilo de un libro ilustrado clásico de cuentos de
animales. Pintada a mano, con grano de papel. NO es una lámina de
historia natural: eso retrata un ejemplar adulto, y aquí el personaje
es una cría. La piel dibujada a trazos finos y visibles, con volumen.
Anatomía y proporciones de animal de verdad, apenas estilizadas. Colores
naturales, terrosos y apagados: nada de pastel de guardería ni de
saturación digital.

Ternura por la EXPRESIÓN —la mirada, el gesto—, nunca por deformar:
tiene que gustarle igual a alguien de diez años y a alguien de cincuenta.

LA EDAD LA DICE CADA PERSONAJE, no este bloque: hay crías y hay
adultos, y confundirlos es lo que ha hecho fallar más intentos.

NADA de esto:
· chapetas ni círculos rosas en los mofletes
· contorno blanco o crema alrededor de la figura, como una pegatina
  troquelada
· cabeza enorme sobre un cuerpo diminuto, ni patas de muñón
· relleno plano de color, sin textura
· lunares, estrellitas, corazones ni brillos decorativos
· arrugas, pliegues colgando, papada, párpados caídos ni postura
  desplomada: ninguno de estos personajes es un animal VIEJO — un
  adulto sereno no es un anciano cansado
· dientes afilados, garras o gesto de ataque: es un animal joven y
  tranquilo, no un depredador

MUY IMPORTANTE:
· Fondo TRANSPARENTE. Sin fondo, sin escenario, sin suelo y SIN SOMBRA
  debajo: el animal va recortado y solo. Si no puedes hacer el fondo
  transparente, hazlo de un magenta puro y plano (#FF00FF).
· Cuerpo entero, de tres cuartos, mirando ligeramente a la izquierda.
  Centrado en el cuadro, con un poco de aire alrededor.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco.
· Cuadrado, 512 × 512 px.

Guarda este personaje como referencia: te voy a pedir cuatro poses más
del MISMO, y tienen que ser idénticas en color, forma y tamaño.
```

**Mensaje 2** — *leyendo*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora tiene un libro abierto apoyado contra la panza porque sus bracitos son demasiado cortos para sostenerlo, y lo mira con muchísima concentración, con la puntita de la lengua fuera.
```

**Mensaje 3** — *expectante*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está agachado con el pecho abajo y la cola levantada, como un perrito a punto de saltar a jugar, con los ojos enormes y muy abiertos.
```

**Mensaje 4** — *dormida*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está dormido panza arriba, con las cuatro patitas al aire y la cola estirada y flojísima, la boca un poco abierta y cara de sueño profundo.
```

**Mensaje 5** — *celebrando*

```
El mismo personaje exacto de la imagen anterior: mismo tamaño de cabeza,
mismo cuerpo, mismos colores, misma escala dentro del cuadro y misma
altura de los ojos. Fondo transparente y sin sombra, igual que antes.

Solo cambia la pose: ahora está dando un brinco con los dos bracitos arriba y la boca abierta en un rugido de alegría —contento, nunca fiero, sin dientes afilados—, la cola en el aire de puro entusiasmo.
```

**Ojo con la escala en el mensaje 4.** Panza arriba con las patas al aire es la
pose más ancha y más baja de las treinta y cinco, y el lienzo no se recorta al
contenido a propósito (así ninguna mascota pega un salto de tamaño al cambiar
de ánimo). Si sale mucho más pequeño que los otros cuatro, pídelo otra vez
diciendo «que ocupe el mismo alto de cuadro que las anteriores».

---

## Estado

**OCHO PUESTAS** — cuarenta ilustraciones, cinco poses por especie, con la
respiración lenta que sustituye a la animación dibujada. Las seis del reparto
original más el **Oso** y el **Lobo**, los dos adultos. Falta el Cuervo.

Mientras una especie no tenga sus cinco poses **se sigue dibujando por
código**: las dos formas conviven a propósito (`ILUSTRADAS` en
[`src/pet.js`](../src/pet.js)), para que las tandas puedan llegar de una en
una sin dejar nada a medias.

### Los desbloqueables ya se mudaron

Estaban colgados del pelaje y de los accesorios, que es justo lo que la salida
A se lleva por delante. Ahora **la recompensa es la compañía**:

| | Se abre con |
|---|---|
| 🐱 Gatita · 🐰 Coneja | abiertas desde el primer día |
| 🦉 Búho | *El ladrillo* · un libro de más de 500 páginas |
| 🦊 Zorrita | *Un clásico* · el primer clásico universal |
| 🦝 Mapache | *De todo un poco* · cinco géneros distintos |
| 🐼 Panda | *Diez* · diez libros terminados |
| 🐻 Oso · Tomás · 🐺 Lobo · Rico | ✅ abiertos desde el primer día, como las dos primeras |
| 🐦‍⬛ Cuervo · Tinta | *pendiente* — también irá abierto |

Las seis **se ven desde el primer día**, con su candado y con la frase de lo
que falta escrita debajo, no solo en el `title`: esto es una app de teléfono y
en un teléfono no hay ratón que se pose encima. Un armario cerrado que se ve es
un motivo; uno que no se ve es una carencia.

Las nueve escenas conservan las suyas. El pelaje y el accesorio quedan
**abiertos del todo** mientras duren: son de las cuatro especies que aún se
dibujan por código, y se van con ellas.

El conversor está en `npm run mascotas <carpeta>`: toma los PNG tal cual
llegan y deja los WebP en `img/mascota/`. Unos 8 MB por tanda → unos 120 KB.

**Y recorta las que lleguen con el fondo pegado.** Dos de las cinco de la
Coneja venían con el cuadriculado de «esto es transparente» pintado encima,
como píxeles opacos. Se detecta contando —una recortada tiene medio lienzo
transparente, una con el fondo pegado tiene cero— y se quita por inundación
desde el borde, no filtrando por color: la coneja tiene la panza casi blanca y
quitar «todo lo claro» se la comería. Si te pasa, no hagas nada: mándala igual.

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

**Y las cinco de cada una de las tres que faltan**, cuando lleguen:

```
cuervo-contenta.png   cuervo-leyendo.png   cuervo-expectante.png
cuervo-dormida.png    cuervo-celebrando.png
```

El Oso (89 KB) y el Lobo (106 KB) ya están. Falta solo el Cuervo.

**Y el Lobo llegó YA RECORTADO** —60–65 % de lienzo transparente—, así que el
conversor no le tocó el fondo. Es la primera tanda que no lo necesita, y menos
mal: el lobo tiene el pecho y las patas casi blancos, que es exactamente el
pelaje que un recorte mal hecho se come.

Lo que sí hace falta es que estén **las cinco de una**. Media especie en el
selector es un botón que enseña una gata cuando le das: un mando muerto, que es
el fallo que ya costó el pelaje y el rincón.

**Si 30 son demasiadas, el mínimo son 18**: las tres primeras poses (contenta,
leyendo, dormida) por especie. *Expectante* y *celebrando* reutilizan
*contenta* — se pierde matiz, pero no se rompe nada.

De la integración me encargo yo: recortar, pasar a WebP con presupuesto de peso
—esta app no tiene empaquetador y cada kilobyte se descarga tal cual— y colocar
la respiración lenta. Los desbloqueables ya están mudados.

**Empieza por una sola especie y sus cinco poses.** Si esa tanda queda bien, el
resto es repetir; si no, cambiamos el prompt habiendo gastado cinco imágenes y
no treinta.
