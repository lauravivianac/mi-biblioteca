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

## Estado

**Puestos: la Gatita, la Coneja y el Búho** — las cinco poses de cada uno, con
la respiración lenta que sustituye a la animación dibujada. Faltan la Zorrita,
el Mapache y el Panda.

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

**Si 30 son demasiadas, el mínimo son 18**: las tres primeras poses (contenta,
leyendo, dormida) por especie. *Expectante* y *celebrando* reutilizan
*contenta* — se pierde matiz, pero no se rompe nada.

De la integración me encargo yo: recortar, pasar a WebP con presupuesto de peso
—esta app no tiene empaquetador y cada kilobyte se descarga tal cual— y colocar
la respiración lenta. Los desbloqueables ya están mudados.

**Empieza por una sola especie y sus cinco poses.** Si esa tanda queda bien, el
resto es repetir; si no, cambiamos el prompt habiendo gastado cinco imágenes y
no treinta.
