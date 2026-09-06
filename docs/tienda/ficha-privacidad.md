# Ficha de privacidad de las tiendas · historia #98

Las respuestas exactas para rellenar la **App Privacy** de la App Store y el
**formulario de Seguridad de los datos** de Google Play.

> **Por qué está escrito y no improvisado.** Las incoherencias entre la ficha y
> lo que la app hace de verdad son un motivo frecuente de rechazo y se detectan
> con facilidad. Cada respuesta de aquí sale de leer el código, y la columna
> «dónde está en el código» existe para poder volver a comprobarlo cuando algo
> cambie.
>
> **Revísala en cada versión que añada un tercero o un dato nuevo.**

---

## Resumen de terceros

| Tercero | Para qué | Dónde procesa | Recibe datos de la usuaria |
|---|---|---|---|
| **Firebase** (Google) | autenticación y base de datos | UE / EE. UU. | sí: correo, nombre, y todo lo que guarda la app |
| **DeepSeek** | el asistente de IA | **China** | solo títulos y autores, o las notas que ella elija |
| **Cloudflare Workers** | servidor intermedio del asistente y caché | red global | no: añade la clave y aplica límites |
| **OpenLibrary** | datos de libros | EE. UU. | no: solo el término buscado o el ISBN |
| **Google Books** | datos de libros, como respaldo | EE. UU. | no: solo el término buscado o el ISBN |
| **Vercel** | alojamiento de la app web | red global | registros de servidor (IP, navegador) |

**No hay publicidad, ni rastreo entre apps, ni venta de datos.**

---

# App Store · App Privacy

## Datos recogidos

### Información de contacto

| Dato | ¿Se recoge? | ¿Vinculado a la identidad? | ¿Para rastreo? | Uso | Dónde está en el código |
|---|---|---|---|---|---|
| Dirección de correo | **Sí** | **Sí** | No | Funcionalidad de la app | `auth.js` · Firebase Auth |
| Nombre | **Sí**, si entra con Google o Apple | **Sí** | No | Funcionalidad de la app | `store.js` · `seedNewAccount` |

### Identificadores

| Dato | ¿Se recoge? | ¿Vinculado? | ¿Rastreo? | Uso |
|---|---|---|---|---|
| ID de usuario | **Sí** (el uid de Firebase) | **Sí** | No | Funcionalidad de la app |

### Contenido de la usuaria

| Dato | ¿Se recoge? | ¿Vinculado? | ¿Rastreo? | Uso |
|---|---|---|---|---|
| Fotos | **Sí**: la foto del ejemplar, solo si publica un libro para intercambio | **Sí** | No | Funcionalidad de la app |
| Contenido de audio | No | — | — | — |
| Mensajes | **Sí**: los del chat de intercambio | **Sí** | No | Funcionalidad de la app |
| Otro contenido | **Sí**: libros, reseñas, citas, notas, entradas de blog | **Sí** | No | Funcionalidad de la app |

### Ubicación

| Dato | ¿Se recoge? | ¿Vinculado? | ¿Rastreo? | Uso |
|---|---|---|---|---|
| **Ubicación aproximada** | **Sí**, solo si usa el intercambio | **Sí** | No | Funcionalidad de la app |
| Ubicación precisa | **No** | — | — | — |

> **Marcar «aproximada» y NO «precisa» es correcto y hay que poder defenderlo.**
> Si autoriza el GPS, las coordenadas se usan una vez para proponer el nombre
> de la ciudad y **se descartan**. Lo único que se guarda es la ciudad escrita a
> mano y un geohash **recortado a seis caracteres**, que es una celda de algo
> más de un kilómetro.
>
> Está en `place-core.js` (`PRECISION = 6`), y además lo exige la regla del
> servidor: `firestore.rules` rechaza cualquier documento de intercambio que
> lleve `lat`, `lon`, `address`, o un geohash de más de seis caracteres.

### Diagnóstico

| Dato | ¿Se recoge? | Uso |
|---|---|---|
| Datos de fallos | No se recogen desde la app | — |
| Datos de rendimiento | No | — |

### Lo que NO se recoge

Salud, finanzas, contactos, historial de navegación, historial de búsqueda fuera de la app, datos de publicidad, identificadores de dispositivo para rastreo.

## Rastreo

**La app no hace rastreo** en el sentido del ATT de Apple: no hay identificadores compartidos con terceros con fines publicitarios ni de medición entre apps.
→ **No hace falta pedir permiso de seguimiento (ATT).**

## Eliminación de la cuenta

**Sí, se puede borrar la cuenta desde dentro de la app.**
Ruta: **Ajustes → Borrar mi cuenta**. Borra la cuenta de autenticación y todos los datos asociados, incluidas todas las copias publicadas.
Código: `store.js` · `deleteAllUserData` y `auth.js` · `deleteAccount`.

---

# Google Play · Seguridad de los datos

## ¿La app recopila o comparte alguno de los tipos de datos requeridos?

**Sí.**

## ¿Se cifran los datos en tránsito?

**Sí.** Todo va por HTTPS (Firebase, el Worker, los catálogos de libros).

## ¿Se puede solicitar la eliminación de los datos?

**Sí**, y se hace desde la propia app: **Ajustes → Borrar mi cuenta**.

## Tipos de datos

### Información personal

| Tipo | Recopilado | Compartido | Obligatorio | Finalidad |
|---|---|---|---|---|
| Nombre | Sí | No | Opcional | Funciones de la app |
| Dirección de correo | Sí | No | Obligatorio | Funciones de la app; gestión de la cuenta |
| ID de usuario | Sí | No | Obligatorio | Funciones de la app |

### Ubicación

| Tipo | Recopilado | Compartido | Obligatorio | Finalidad |
|---|---|---|---|---|
| Ubicación aproximada | Sí | **Sí** | Opcional | Funciones de la app |
| Ubicación precisa | **No** | — | — | — |

> **«Compartido» es Sí y es importante ser exacta:** la ciudad y la referencia
> aproximada se enseñan a otras usuarias de la app cuando publicas un libro para
> intercambio. Es el propósito de la función. Nunca se comparte con terceros
> comerciales.

### Fotos y vídeos

| Tipo | Recopilado | Compartido | Obligatorio | Finalidad |
|---|---|---|---|---|
| Fotos | Sí | Sí | Opcional | Funciones de la app |

Solo la foto del ejemplar que se ofrece para intercambio, y solo si se sube una. La ven quienes miran esa publicación.

### Mensajes

| Tipo | Recopilado | Compartido | Obligatorio | Finalidad |
|---|---|---|---|---|
| Otros mensajes en la app | Sí | No | Opcional | Funciones de la app |

Solo los ven las dos personas del intercambio.

### Archivos y documentos

No se recopilan.

### Actividad en la app

| Tipo | Recopilado | Compartido | Obligatorio | Finalidad |
|---|---|---|---|---|
| Interacciones en la app | Sí | Sí, lo que la usuaria publique | Opcional | Funciones de la app |
| Contenido generado por la usuaria | Sí | Sí, lo que publique | Opcional | Funciones de la app |

Libros, estados de lectura, puntuaciones, reseñas, citas, notas y entradas. **Privado por defecto**; solo se comparte lo que se publica explícitamente, y despublicarlo borra la copia.

### Lo que NO se recopila

Información financiera, salud y forma física, contactos, calendario, SMS, historial de navegación web, historial de búsqueda, rendimiento de la app, identificadores de publicidad.

---

# Lo que hay que declarar sí o sí

## 1. DeepSeek procesa en China

**Hay que declararlo**, tanto en la política de privacidad como al responder sobre terceros.

- Es **opcional**: el asistente no se activa solo y la app funciona entera sin él (`agent.js` · `agentAvailable`).
- Lo que sale: **títulos y autores de libros**, o **las notas que la usuaria elija** para ordenar. Está enumerado en `agent.js` · `WHAT_WE_SEND`.
- **Nunca** sale su correo, su nombre, su ciudad ni sus mensajes.
- No se manda ningún identificador: las peticiones pasan por un Worker propio.

## 2. Debe cuadrar con lo que dice la app

El aviso que se enseña al activar el asistente (historia #61) dice lo mismo que esta ficha. **Si cambia uno, hay que cambiar el otro** — y esa incoherencia es justo lo que se detecta en revisión.

Sitios que tienen que decir lo mismo:

- `src/agent.js` → `WHAT_WE_SEND`
- `docs/legal/privacidad.md` → sección de DeepSeek
- esta ficha
- las respuestas en App Store Connect y Play Console

## 3. Antes de lanzar en la Unión Europea

La transferencia a China tiene implicaciones bajo el RGPD. **Conviene revisarlo con alguien con formación jurídica antes de publicar allí.** Una salida posible es no ofrecer el asistente en la UE hasta tenerlo resuelto; la app no depende de él.

---

*Comprobado contra el código el 6 de septiembre de 2026. Volver a comprobarlo en cada versión que añada un tercero o un tipo de dato nuevo.*
