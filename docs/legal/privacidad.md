# Política de privacidad

**Mi Biblioteca**
Última actualización: 6 de septiembre de 2026

---

> **Antes de nada, lo importante en cuatro líneas.**
>
> - Tus libros, tus notas y tus reseñas son **tuyos y privados** hasta que tú decidas publicarlos.
> - **Nunca guardamos tu dirección.** Para el intercambio se guarda la ciudad, y nada más.
> - El asistente de IA **no se enciende solo**: hay que decir que sí, y lo que se le manda está detallado abajo.
> - Puedes **descargar todo** lo tuyo y **borrar la cuenta entera** desde la propia app, sin escribir a nadie.

---

## Quién es responsable

Mi Biblioteca es un proyecto personal. La responsable del tratamiento de los datos es la titular de la aplicación, y el contacto para cualquier cosa relacionada con esta política es:

**soporte@mibiblioteca.app**

## Qué datos guardamos y por qué

### Para que puedas entrar

Al crear una cuenta guardamos tu **correo electrónico**. Si entras con Google o con Apple, recibimos además tu **nombre** y tu **foto de perfil**, si los tienes.

La contraseña **no la vemos ni la guardamos**: la gestiona Firebase Authentication (Google) y nos llega solo la confirmación de que has entrado.

### Lo que escribes en la app

En tu cuenta se guarda lo que vas registrando:

- Los libros de tu biblioteca, su estado (pendiente, leyendo, leído) y por qué página vas.
- Tus **puntuaciones**, tus **reseñas** y tus **citas guardadas**.
- Tus **notas y entradas de blog**.
- Tus estanterías, tus metas de lectura y los días que has leído.
- El tema visual que has elegido.

**Todo esto es privado por defecto.** Vive en un espacio de tu cuenta al que no accede ninguna otra usuaria.

### Lo que decides publicar

Cuando publicas algo, se hace una **copia** en un sitio distinto, con lo justo para que se pueda enseñar. Lo hacemos así a propósito: significa que **lo que no publicas no sale de tu cuenta**, en vez de estar fuera y simplemente no enseñarse.

| Si publicas… | Se copia… | Lo ve… |
|---|---|---|
| Tu perfil público | nombre, @usuario, bio, ciudad, y las secciones que elijas | cualquiera con el link |
| Una reseña | el texto, el libro y la puntuación | quien tenga la app |
| Actividad de lectura | qué empezaste o terminaste | quien te sigue |
| Una entrada de blog | según elijas: solo tú, quien te sigue, o cualquiera | según elijas |
| Un libro para intercambio | el libro, su estado, tu ciudad y tu @usuario | quien tenga la app |

Cada una de estas cosas se puede **desactivar en cualquier momento**, y al desactivarla la copia **se borra**.

### La ubicación, con detalle

Esta parte importa, así que va entera.

**Nunca se pide ni se guarda tu dirección.** Ni «por si acaso», ni para calcular distancias, ni escondida en un campo que no se enseña.

Para el intercambio de libros se guarda:

- El **país** y la **ciudad**, escritos por ti a mano.
- La **zona o barrio**, si tú quieres ponerlo.
- Una **referencia aproximada de algo más de un kilómetro** (un «geohash» de seis letras), solo si autorizas el acceso a la ubicación.

Si autorizas la ubicación, las coordenadas se usan **una vez** para proponerte el nombre de tu ciudad y **se descartan**: no se guardan en ningún sitio. Lo único que queda es esa referencia de un kilómetro, que sirve para decir «está cerca» y **no sirve para dar contigo**.

La distancia entre dos personas se enseña siempre en escalones —«A un paseo», «Cerca», «En tu zona»— y **nunca en kilómetros**, porque una distancia exacta permitiría triangular dónde vive alguien preguntándola desde tres sitios.

Sin ciudad simplemente no apareces en el intercambio. Es una opción válida y el resto de la app funciona igual.

### El intercambio de libros

Si usas el intercambio, además se guarda:

- Las **solicitudes** que mandas y recibes, con los libros que ofreces y tu mensaje. Solo las ven las dos personas implicadas.
- Los **mensajes del chat** de cada intercambio. Solo los ven las dos personas implicadas, y **no se pueden editar ni borrar** — para que una conversación siga sirviendo si hay que reportar algo.
- Las **valoraciones** que dejas después de un intercambio. Estas **sí son públicas**: la reputación solo sirve si se puede ver antes de quedar con alguien.
- La **foto del ejemplar**, si subes una.

### Moderación

Si reportas o bloqueas a alguien, guardamos ese reporte o ese bloqueo. **Los reportes no los puede leer nadie desde la app**, ni siquiera quien los escribió: se revisan desde fuera. Quien te bloquea no recibe ningún aviso de ello.

## Con quién se comparten los datos

### Firebase (Google)

Es donde vive la aplicación: la autenticación y la base de datos. Google actúa como encargado del tratamiento. Sus servidores están en la Unión Europea y en Estados Unidos según la configuración del proyecto.

### DeepSeek — **y esto conviene leerlo**

El asistente de IA usa **DeepSeek**, cuyo procesamiento ocurre **en servidores situados en China**.

**El asistente no se enciende solo.** La primera vez que algo va a usarlo, la app te pregunta, y hasta que digas que sí no sale nada. Puedes decir que no y toda la app sigue funcionando igual.

Lo que se le manda, exactamente:

| Cuando pides… | Sale de la app… |
|---|---|
| «¿Me lo leo?» | el título y el autor de ese libro, y nada más |
| «Qué leer después» | hasta 25 títulos y autores que marcaste como leídos con su puntuación, y hasta 25 pendientes |
| Identificar una portada | el texto que el móvil lee de la foto, y solo si ningún catálogo reconoció el libro |
| Ordenar mis notas | las notas que elijas, tal como las escribiste |

**Nunca se manda** tu correo, tu nombre, tu ciudad, tus mensajes de chat ni tus datos de cuenta.

Las peticiones pasan por un servidor propio (Cloudflare Workers) que añade la clave y aplica los límites de uso; DeepSeek no recibe ningún identificador tuyo.

> **Si estás en la Unión Europea**, esa transferencia a China tiene implicaciones bajo el RGPD que conviene que conozcas. Puedes usar la app entera sin activar el asistente.

### OpenLibrary y Google Books

Cuando buscas un libro o escaneas un código de barras, se consulta **OpenLibrary** y, si no aparece, **Google Books**. Se les manda **el término que buscaste o el código del libro**. No se les manda nada tuyo.

### Cloudflare

Aloja el servidor intermedio del asistente y guarda una **caché de los resúmenes por libro**, para no pagar dos veces por la misma pregunta. Esa caché guarda el resumen del libro, no quién preguntó.

### Vercel

Sirve la aplicación web. Como cualquier servidor web, registra las peticiones (dirección IP, navegador) durante un tiempo limitado.

### No hay publicidad ni venta de datos

No hay anuncios, no hay rastreadores de terceros, y **no se vende ni se cede ningún dato a nadie** con fines comerciales.

## Cuánto tiempo se guardan

Mientras tengas la cuenta. Cuando la borras, se borra todo lo descrito arriba.

## Tus derechos

Desde **Ajustes**, dentro de la propia app y sin escribir a nadie:

- **Descargar todo lo tuyo** en un archivo JSON legible, y tus libros en CSV.
- **Borrar la cuenta entera**, con todo lo que has publicado.

También puedes escribir a **soporte@mibiblioteca.app** para ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad.

## Menores

La app no está dirigida a menores de 13 años. Si eres madre, padre o tutora y crees que un menor a tu cargo ha creado una cuenta, escríbenos y la borramos.

## Cambios en esta política

Si cambia algo que afecte a lo que se recoge o a con quién se comparte, se avisa dentro de la app antes de que el cambio entre en vigor.

---

*Este documento describe lo que la aplicación hace de verdad, contrastado con su código. No sustituye a una revisión legal: antes de publicar en tiendas, y especialmente antes de operar en la Unión Europea con la transferencia a China descrita arriba, conviene que lo revise alguien con formación jurídica.*
