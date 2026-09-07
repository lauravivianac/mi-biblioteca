# Las ilustraciones de los temas · encargo

Cada tema lleva una **escena** al fondo de la pantalla, pegada al borde
inferior, por debajo de la lista de libros. Este documento es el encargo para
generarlas con una herramienta de imagen (ChatGPT, Midjourney, lo que uses) y
lo que hace falta saber para que encajen en la app.

> **Por qué está escrito y no dibujado.** El primer intento fue dibujar las
> escenas a mano en SVG. Para iconos y adornos de trazo eso funciona; para una
> ilustración con un personaje, no: sale rígido y plano. Es mejor encargarlo a
> quien lo hace bien y quedarnos con el trabajo de integrarlo.

---

## 1 · El bloque de estilo

**Esto se pega SIEMPRE, delante de la escena que toque.** Es lo que hace que
las diez parezcan de la misma mano y no diez ilustraciones sueltas.

```
Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Composición
horizontal panorámica.

MUY IMPORTANTE:
· El motivo va abajo, apoyado en el borde inferior. El tercio superior
  queda casi vacío: ahí va texto encima.
· Fondo de un solo color plano: {FONDO}. Sin degradados de fondo.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco ni
  borde, sin viñeta de cómic.
· Nada centrado como un logotipo: es una escena, no un icono.
· Iluminación cálida que entra desde fuera del encuadre, como una
  lámpara de leer.

Proporción 2:1, 1536 × 768 px.
```

Sustituye `{FONDO}` por el color del tema, de la tabla de abajo.

---

## 2 · Las diez escenas

Detrás del bloque de estilo, pega la escena. Los colores que se nombran son
los del tema: si la herramienta se desvía, insiste con los hexadecimales.

| Tema | Fondo | Acento | Realce |
|---|---|---|---|
| Ex Libris | `#12100E` | `#7B2C36` burdeos | `#C9A24A` latón |
| Grimorio | `#0D0A1A` | `#6C3FC5` morado | `#F0C060` oro |
| Obsidiana | `#08080C` | `#3A3A4A` grafito | `#D9B25A` oro sobrio |
| Pergamino | `#F4EEE2` **(claro)** | `#8A6A3C` sepia | `#7A5A1E` ocre |
| Herbario | `#0B1410` | `#A8D8BC` verde claro | `#E0C070` ocre |
| Marea | `#08131F` | `#9FD2EC` azul claro | `#EFD9A0` arena |
| Gótico | `#100708` | `#E8A8B0` rosa pálido | `#D9A441` oro viejo |
| Sakura | `#1A1016` | `#F2C4D2` rosa | `#EFCFA8` crema |
| El Principito | `#17203A` | `#C9DAF2` azul claro | `#EBC96B` amarillo |
| Máquina | `#0E0E0E` | `#C4C4C4` gris | `#B9E36C` verde fósforo |

### Ex Libris
```
La mesa de una encuadernadora, de noche. Un libro entelado en burdeos
abierto boca abajo, hilo encerado, una aguja curva, una plegadera de
hueso y un sello de latón. A la izquierda, tres libros de pie con los
lomos entelados en distintos colores. Todo apoyado en el borde
inferior. Luz de flexo cálida desde la izquierda.
```

### Grimorio
```
Un libro grueso de tapas de cuero morado abierto sobre un atril de
madera. De entre sus páginas sale una estela de polvo de estrellas que
sube y se curva hacia arriba a la derecha, con una estrella fugaz al
final. Dos velas cortas a los lados. Brillo dorado suave.
```

### Obsidiana
```
Muy minimalista y casi vacío. Una única piedra de obsidiana negra
pulida, apoyada en arena negra lisa, con un solo filo de luz dorada en
el canto superior. Nada más en la escena. Silencioso y sobrio.
```

### Pergamino
```
FONDO CLARO, papel crema. Un escritorio junto a una ventana a
mediodía: un libro abierto de papel amarillento, una pluma de ave en
su tintero, unas gafas dobladas y una taza. Sombras largas y suaves de
la luz que entra por la izquierda. Aire y espacio en blanco.
```

### Herbario
```
Un pliego de herbario: helechos y hojas prensadas cosidas a un papel
de cuaderno de campo, con una etiqueta pequeña atada con cordel. Al
lado, una lupa y un lápiz. Verdes de hoja y marrones de tierra.
```

### Marea
```
Bajo el agua, cerca del fondo. Rayos de luz que bajan desde arriba y
se pierden, un nautilo apoyado en la arena y algas altas ondulando muy
despacio. Todo en azules profundos. Calmo, sin peces ni movimiento.
```

### Gótico
```
Al fondo, el rosetón de una catedral apenas insinuado en la
oscuridad. Delante y abajo, una vela gruesa encendida junto a un libro
cerrado con cantos dorados y una rama de rosal seco. Rojo vino y
negro. Luz de vela, nada más.
```

### Sakura
```
Una rama de cerezo en flor entrando por la izquierda sobre agua
quieta, con unos pocos pétalos cayendo y sus reflejos. Mucho aire
vacío. Rosas apagados y grises. Estilo de estampa japonesa, sereno.
```

### El Principito
```
Un asteroide pequeño y redondo en el borde inferior, con un niño de
pelo rubio y capa verde de pie sobre él, de espaldas tres cuartos,
mirando el cielo. A su lado, un zorro sentado. Junto a ellos, una rosa
bajo una campana de cristal y un baobab pequeño. Cielo azul noche con
estrellas diminutas.
```

> **Ojo con este.** Pide un **niño rubio con capa**, no «el principito» ni «al
> estilo de Saint-Exupéry»: sus ilustraciones originales siguen protegidas en
> varios países y esta app va a las tiendas. La escena es del libro; los trazos
> tienen que ser nuevos.

### Máquina
```
NO en acuarela: ignora el bloque de estilo para este.
Gráfico plano, alto contraste, aire de manual técnico de los ochenta.
Papel continuo de impresora matricial saliendo por abajo, con las
bandas perforadas a los lados. Solo negro, gris y verde fósforo.
Trazo duro, sin texturas ni pintura.
```

> Este tema es brutalista y sin adornos a propósito: una acuarela bonita ahí lo
> rompe. Si la versión gráfica tampoco convence, **es el único que está bien sin
> escena**.

---

## Los prompts, listos para copiar

Uno por tema. Cada bloque va entero, de una sola vez — el estilo ya está
dentro, no hay que montar nada.

**El Principito lleva un aviso**: se pide «un niño rubio con capa», nunca «el
principito» ni «al estilo de Saint-Exupéry». Sus ilustraciones siguen
protegidas en varios países y esta app va a las tiendas. La escena es del
libro; los trazos tienen que ser nuevos.

### Ex Libris · `exlibris.png`

```
La mesa de una encuadernadora, de noche. Un libro entelado en burdeos
abierto boca abajo, hilo encerado, una aguja curva, una plegadera de
hueso y un sello de latón. A la izquierda, tres libros de pie con los
lomos entelados en distintos colores, apoyados en el borde inferior.
Luz de flexo cálida desde la izquierda. Burdeos (#7B2C36) y latón
(#C9A24A).

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Composición
horizontal panorámica.

MUY IMPORTANTE:
· El motivo va abajo, apoyado en el borde inferior. El tercio superior
  queda casi vacío: ahí va texto encima.
· Fondo de un solo color plano: #12100E. Sin degradados de fondo.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco ni
  borde, sin viñeta de cómic.
· Nada centrado como un logotipo: es una escena, no un icono.
· Iluminación cálida que entra desde fuera del encuadre, como una
  lámpara de leer.

Proporción 2:1, 1536 × 768 px.
```

### Grimorio · `grimorio.png`

```
Un libro grueso de tapas de cuero morado abierto sobre un atril de
madera. De entre sus páginas sale una estela de polvo de estrellas que
sube y se curva hacia la derecha, con una estrella fugaz al final. Dos
velas cortas a los lados. Morado (#6C3FC5) y oro (#F0C060).

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Composición
horizontal panorámica.

MUY IMPORTANTE:
· El motivo va abajo, apoyado en el borde inferior. El tercio superior
  queda casi vacío: ahí va texto encima.
· Fondo de un solo color plano: #0D0A1A. Sin degradados de fondo.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco ni
  borde, sin viñeta de cómic.
· Nada centrado como un logotipo: es una escena, no un icono.
· Iluminación cálida que entra desde fuera del encuadre, como una
  lámpara de leer.

Proporción 2:1, 1536 × 768 px.
```

### Obsidiana · `obsidiana.png`

```
Muy minimalista y casi vacío. Una única piedra de obsidiana negra
pulida, apoyada en arena negra lisa, con un solo filo de luz dorada
(#D9B25A) en el canto superior. Nada más en la escena. Silencioso y
sobrio.

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Composición
horizontal panorámica.

MUY IMPORTANTE:
· El motivo va abajo, apoyado en el borde inferior. El tercio superior
  queda casi vacío: ahí va texto encima.
· Fondo de un solo color plano: #08080C. Sin degradados de fondo.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco ni
  borde, sin viñeta de cómic.
· Nada centrado como un logotipo: es una escena, no un icono.
· Iluminación cálida que entra desde fuera del encuadre, como una
  lámpara de leer.

Proporción 2:1, 1536 × 768 px.
```

### Pergamino · `pergamino.png`

```
FONDO CLARO, papel crema. Un escritorio junto a una ventana a
mediodía: un libro abierto de papel amarillento, una pluma de ave en su
tintero, unas gafas dobladas y una taza. Sombras largas y suaves de la
luz que entra por la izquierda. Sepias y ocres (#8A6A3C, #7A5A1E).
Mucho aire y espacio en blanco.

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Composición
horizontal panorámica.

MUY IMPORTANTE:
· El motivo va abajo, apoyado en el borde inferior. El tercio superior
  queda casi vacío: ahí va texto encima.
· Fondo de un solo color plano: #F4EEE2. Sin degradados de fondo.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco ni
  borde, sin viñeta de cómic.
· Nada centrado como un logotipo: es una escena, no un icono.
· Iluminación cálida que entra desde fuera del encuadre, como una
  lámpara de leer.

Proporción 2:1, 1536 × 768 px.
```

### Herbario · `herbario.png`

```
Un pliego de herbario: helechos y hojas prensadas cosidas a un papel de
cuaderno de campo, con una etiqueta pequeña atada con cordel. Al lado,
una lupa y un lápiz. Verdes de hoja (#A8D8BC) y marrones de tierra, con
un ocre apagado (#E0C070).

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Composición
horizontal panorámica.

MUY IMPORTANTE:
· El motivo va abajo, apoyado en el borde inferior. El tercio superior
  queda casi vacío: ahí va texto encima.
· Fondo de un solo color plano: #0B1410. Sin degradados de fondo.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco ni
  borde, sin viñeta de cómic.
· Nada centrado como un logotipo: es una escena, no un icono.
· Iluminación cálida que entra desde fuera del encuadre, como una
  lámpara de leer.

Proporción 2:1, 1536 × 768 px.
```

### Marea · `marea.png`

```
Bajo el agua, cerca del fondo. Rayos de luz que bajan desde arriba y se
pierden, un nautilo apoyado en la arena y algas altas ondulando muy
despacio. Azules profundos (#9FD2EC) sobre azul noche, con la arena en
un beige apagado (#EFD9A0). Calmo, sin peces.

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Composición
horizontal panorámica.

MUY IMPORTANTE:
· El motivo va abajo, apoyado en el borde inferior. El tercio superior
  queda casi vacío: ahí va texto encima.
· Fondo de un solo color plano: #08131F. Sin degradados de fondo.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco ni
  borde, sin viñeta de cómic.
· Nada centrado como un logotipo: es una escena, no un icono.
· Iluminación cálida que entra desde fuera del encuadre, como una
  lámpara de leer.

Proporción 2:1, 1536 × 768 px.
```

### Gótico · `gotico.png`

```
Al fondo, el rosetón de una catedral apenas insinuado en la oscuridad.
Delante y abajo, una vela gruesa encendida junto a un libro cerrado con
cantos dorados y una rama de rosal seco. Rojo vino y negro, con oro
viejo (#D9A441) y un rosa pálido (#E8A8B0) en la luz de la vela.

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Composición
horizontal panorámica.

MUY IMPORTANTE:
· El motivo va abajo, apoyado en el borde inferior. El tercio superior
  queda casi vacío: ahí va texto encima.
· Fondo de un solo color plano: #100708. Sin degradados de fondo.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco ni
  borde, sin viñeta de cómic.
· Nada centrado como un logotipo: es una escena, no un icono.
· Iluminación cálida que entra desde fuera del encuadre, como una
  lámpara de leer.

Proporción 2:1, 1536 × 768 px.
```

### Sakura · `sakura.png`

```
Una rama de cerezo en flor entrando por la izquierda sobre agua quieta,
con unos pocos pétalos cayendo y sus reflejos. Mucho aire vacío. Rosas
apagados (#F2C4D2) y cremas (#EFCFA8) sobre ciruela oscuro. Estilo de
estampa japonesa, sereno.

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Composición
horizontal panorámica.

MUY IMPORTANTE:
· El motivo va abajo, apoyado en el borde inferior. El tercio superior
  queda casi vacío: ahí va texto encima.
· Fondo de un solo color plano: #1A1016. Sin degradados de fondo.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco ni
  borde, sin viñeta de cómic.
· Nada centrado como un logotipo: es una escena, no un icono.
· Iluminación cálida que entra desde fuera del encuadre, como una
  lámpara de leer.

Proporción 2:1, 1536 × 768 px.
```

### El Principito · `principito.png`

```
Un asteroide pequeño y redondo apoyado en el borde inferior, con un
niño rubio de capa verde de pie sobre él, de tres cuartos, mirando el
cielo. A su lado, un zorro naranja sentado. Junto a ellos, una rosa roja
bajo una campana de cristal y un baobab pequeño. Cielo azul noche
(#17203A) con estrellas diminutas, arena cálida y el amarillo del pelo
(#EBC96B).

Ilustración infantil en acuarela con línea de tinta suave, estilo libro
álbum. Pintada a mano, con grano de papel y bordes de pigmento visibles.
Colores apagados y cálidos, nada saturado ni digital. Composición
horizontal panorámica.

MUY IMPORTANTE:
· El motivo va abajo, apoyado en el borde inferior. El tercio superior
  queda casi vacío: ahí va texto encima.
· Fondo de un solo color plano: #17203A. Sin degradados de fondo.
· Sin texto, sin letras, sin firma, sin marca de agua, sin marco ni
  borde, sin viñeta de cómic.
· Nada centrado como un logotipo: es una escena, no un icono.
· Iluminación cálida que entra desde fuera del encuadre, como una
  lámpara de leer.

Proporción 2:1, 1536 × 768 px.
```

### Máquina · `maquina.png`

```
NO en acuarela. Gráfico plano, alto contraste, aire de manual técnico
de los ochenta. Papel continuo de impresora matricial saliendo por el
borde inferior, con las bandas perforadas a los lados. Solo negro, gris
(#C4C4C4) y verde fósforo (#B9E36C) sobre #0E0E0E. Trazo duro, sin
texturas ni pintura. Sin texto, sin firma, sin marco.

Proporción 2:1, 1536 × 768 px.
```

> Este tema es brutalista y sin adornos a propósito: una acuarela bonita ahí
> lo rompe. Si la versión gráfica tampoco convence, **es el único que está
> bien sin escena**.

---

## 3 · Lo que hace falta de vuelta

- **Un PNG por tema**, 1536 × 768, sin comprimir.
- Nombrados por el id del tema: `exlibris.png`, `grimorio.png`, `obsidiana.png`,
  `pergamino.png`, `herbario.png`, `marea.png`, `gotico.png`, `sakura.png`,
  `principito.png`, `maquina.png`.

De la integración me encargo yo: recortar, pasar a WebP con presupuesto de peso
—esta app no tiene empaquetador y cada kilobyte se descarga tal cual—, y
sustituir el SVG que hay ahora. La máscara que difumina el borde de arriba ya
está puesta y sirve igual para una imagen.

**Si alguna sale regular, dilo y se repite solo esa.** Diez ilustraciones de las
que ocho son buenas y dos flojas se notan más que si no hubiera ninguna.
