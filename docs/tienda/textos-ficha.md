# Textos e imágenes de la ficha de tienda · historia #96

Todo lo que hay que pegar en App Store Connect y en Google Play Console, y lo
que falta por generar.

---

## Nombre

**App Store** (30 caracteres máx.)
```
Mi Biblioteca: plan lector
```
*(25 caracteres)*

**Google Play** (30 caracteres máx.)
```
Mi Biblioteca: plan lector
```

## Subtítulo · App Store (30 caracteres máx.)

```
Lee más sin agobiarte
```
*(21 caracteres)*

## Descripción corta · Google Play (80 caracteres máx.)

```
Tu plan de lectura, tus notas y un sitio para intercambiar libros en papel.
```
*(74 caracteres)*

## Descripción larga

> Sirve para las dos tiendas. Play admite 4.000 caracteres; esto ocupa ~1.900.

```
Mi Biblioteca es una app para leer más y disfrutarlo, no para sentirte mal por
no llegar a la meta.

TU PLAN, SEGÚN TU TIEMPO
Dile cuántos minutos lees entre semana y el fin de semana, y te arma un plan
realista con los libros que quieres leer. Si te retrasas, lo recalcula sin
regañarte.

TU BIBLIOTECA
Añade libros buscándolos, escaneando el código de barras o a mano. Marca por
dónde vas, puntúa, guarda citas con su página y organiza por estanterías.

ESCRIBE SOBRE LO QUE LEES
Notas mientras lees, reseñas largas, listas temáticas. Un editor sencillo a
propósito: negrita, cursiva, citas y listas, y nada más. Cada entrada la lees
solo tú, quien te siga, o todo el mundo — y por defecto, solo tú.

CON QUIEN TÚ QUIERAS
Elige tu @usuario, sigue a quien te interese y mira qué está leyendo. Puedes
tener la cuenta privada, y decidir sección por sección qué se ve de tu perfil.

INTERCAMBIA LIBROS EN PAPEL
Mira qué hay disponible en tu ciudad, con lo que ya tenías pendiente marcado y
arriba. Pide un libro ofreciendo alguno tuyo, acordad por chat sin dar el
teléfono, y valoraos después.
Nunca se paga: es trueque. Y nunca se guarda tu dirección — solo tu ciudad.

UN ASISTENTE, SI TÚ QUIERES
Puede resumirte un libro antes de empezarlo, sugerirte qué leer después y
ordenar tus notas sueltas en un borrador. Va apagado hasta que lo enciendas, y
la app funciona entera sin él. Cuando ordena tus notas no escribe por ti:
agrupa lo que tú escribiste.

TARJETAS PARA COMPARTIR
Cuando termines un libro, saca una tarjeta bonita con el tema que estés usando
y compártela donde quieras.

FUNCIONA SIN CONEXIÓN
Tus libros y tus notas están en el dispositivo y se sincronizan cuando vuelve
la señal.

TUS DATOS SON TUYOS
Descárgalo todo en dos toques. Borra la cuenta entera cuando quieras, desde la
app y sin escribir a nadie.

Sin anuncios. Sin rastreadores. Sin vender datos a nadie.
```

## Palabras clave · App Store (100 caracteres máx.)

```
lectura,libros,plan lector,reseñas,citas,notas,intercambio,trueque,biblioteca,hábito
```
*(84 caracteres. Sin repetir palabras del nombre ni del subtítulo: Apple ya las indexa.)*

## Categoría

- **Principal:** Libros
- **Secundaria:** Estilo de vida

## Clasificación por edad

**12+ / PEGI 12.** Hay contenido generado por usuarias (perfiles, reseñas,
comentarios, chat), y eso sube la clasificación aunque el contenido sea sobre
libros. Declarar:

- Contenido generado por usuarias: **sí**
- Funciones sociales: **sí**
- Compras dentro de la app: **no**
- Publicidad: **no**

## Enlaces obligatorios

| Campo | Valor |
|---|---|
| Política de privacidad | `https://mi-biblioteca-lyart.vercel.app/legal/privacidad` |
| Términos de servicio | `https://mi-biblioteca-lyart.vercel.app/legal/terminos` |
| Soporte | `https://mi-biblioteca-lyart.vercel.app/legal/soporte` o `soporte@mibiblioteca.app` |

> **Ojo:** las URLs tienen que existir y responder **antes** de mandar a
> revisión. Una política de privacidad que da 404 es rechazo automático.

## Cuenta de demostración · obligatoria en App Store

La revisión de Apple **tiene que poder entrar y ver las funciones sociales**.
Hay que crear una cuenta de verdad, dejarla con unos cuantos libros y algún
intercambio publicado, y dar sus credenciales en App Store Connect.

Va en la historia #100.

---

# Imágenes

## Icono — **hecho**

`icon-192.png` e `icon-512.png` ya están en el repositorio, declarados en
`manifest.webmanifest` con `purpose: "any maskable"`.

Para las tiendas hace falta exportarlos a:

| Destino | Tamaño |
|---|---|
| App Store | 1024×1024, sin transparencia y sin esquinas redondeadas (las pone Apple) |
| Play Store | 512×512 PNG de 32 bits con transparencia |
| Android adaptativo | 432×432 de primer plano, con la zona segura de 264×264 centrada |

## Pantalla de arranque (splash) — **falta**

Color de fondo: `#12100E` (el mismo `background_color` del manifiesto, así que
no hay parpadeo al abrir).

Encima, el icono centrado. Nada de texto: se traduce mal y en un arranque de
medio segundo no lo lee nadie.

Con Capacitor (historia #94) se genera desde una sola imagen de 2732×2732 con el
logo centrado dentro del tercio central.

## Capturas — **faltan**

Mínimo 3 por tienda; conviene 5. En el orden en que cuentan la historia:

1. **El plan del mes** — es lo que hace distinta a la app.
2. **La ficha de un libro** con la barra de avance y las estrellas.
3. **El trueque**, con un libro marcado como «Lo tienes pendiente» — ese detalle es lo que se entiende de un vistazo.
4. **Una entrada escrita**, con el selector de quién la lee.
5. **Una tarjeta para compartir**, que es la que da ganas de probarla.

Tamaños obligatorios:

| Tienda | Tamaño |
|---|---|
| App Store · iPhone 6,7" | 1290×2796 |
| App Store · iPhone 6,5" | 1242×2688 |
| Play Store · teléfono | 1080×1920 mínimo, hasta 8 capturas |
| Play Store · gráfico destacado | 1024×500 |

> Las capturas se hacen con datos de verdad, no con «Lorem ipsum» ni con
> «Libro 1, Libro 2». Una captura con datos falsos se nota, y es de las cosas
> que hacen dudar antes de instalar.

---

## Estado

| | |
|---|---|
| ✅ | Icono 192 y 512 |
| ✅ | Textos de ficha (este documento) |
| ✅ | Política de privacidad, términos y EULA |
| ✅ | Ficha de privacidad de las dos tiendas |
| ⬜ | Exportar el icono a 1024 y 512 para las tiendas |
| ⬜ | Splash 2732×2732 |
| ⬜ | Capturas con datos reales |
| ⬜ | Publicar las URLs legales y comprobar que responden |
| ⬜ | Cuenta de demostración (#100) |
