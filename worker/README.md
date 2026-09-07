# El agente · proxy de DeepSeek

La app es HTML estático. Cualquier API key dentro del cliente es visible con F12
y se agota en horas, así que la key vive **solo aquí**, como secreto del entorno.

Una sola key, en un solo sitio, sirviendo a toda la app.

## Desplegar

> **Baja los cambios ANTES de desplegar.** `wrangler` sube el `index.js` que
> tienes **en el disco**, no el que está en `main`. Fusionar en GitHub y
> desplegar sin haber hecho `pull` sube otra vez el código viejo — y como el
> despliegue dice «Deploy complete!» igual, parece que sí se actualizó.
>
> Costó una hora de búsqueda el día que se escribió esto.

```bash
git checkout main && git pull
```

Cada línea por separado, sin nada detrás. Un comentario pegado al final
`wrangler` lo lee como argumentos y falla.

```bash
cd worker
```
```bash
npx wrangler login
```
```bash
npx wrangler secret put DEEPSEEK_API_KEY
```
La key **no va en el comando**: `wrangler` la pide por teclado después y la
guarda cifrada en Cloudflare.

```bash
npx wrangler deploy
```

La primera vez pregunta qué subdominio de `workers.dev` quieres. Cualquiera que
sea tuyo sirve; el Worker acabará en
`https://mi-biblioteca-agente.TU-SUBDOMINIO.workers.dev`.

Esa dirección va en **`src/agent.js`**, en la constante `WORKER_URL`, y de ahí
al repositorio.

No va en los ajustes de cada usuaria. Es una propiedad del despliegue, no de
quien lee: pedírsela a cada persona significaría que solo tiene agente quien
sepa qué es un Worker de Cloudflare, y una app no debe pedir eso. En los
ajustes solo hay un interruptor, para quien prefiera no usarlo.

No es un secreto —es una dirección pública—. Lo que la protege es lo que hay
detrás: token de Firebase válido, origen permitido, lista blanca de encargos y
límite diario. Quien la copie no consigue nada sin una cuenta de la app.

**La key no se pega en el chat, ni en un issue, ni en ningún archivo del
repositorio.** El comando `secret put` la pide por teclado y la guarda cifrada
en Cloudflare.

## Qué puede hacer

Un único endpoint. Recibe un `intent` de una lista cerrada y responde JSON.

| Encargo | Para qué | Dónde se usa |
|---|---|---|
| `identify_book` | Traduce el texto sucio del OCR de una portada a título y autor | Al añadir un libro con la cámara, **solo si** ni OpenLibrary ni Google Books la reconocen |
| `book_brief` | ¿Me lo leo? Resumen sin spoilers, para quién es y para quién no | Botón en la ficha de cada libro |
| `recommend` | Qué leer después, a partir de lo leído y puntuado | Botón en la Biblioteca |

Ninguno es imprescindible: sin Worker desplegado, la app funciona igual y los
botones del agente sencillamente no aparecen. Añadir libros por título o por
código de barras nunca ha pasado por aquí.

## Los guardrails

No son un párrafo pidiéndole al modelo que se porte bien —eso se salta con una
frase—, sino capas que rechazan **antes** de gastar un token.

| Capa | Qué frena |
|---|---|
| Lista blanca de encargos | Lo que no esté en `INTENTS` se rechaza sin llamar al modelo |
| Verificación del token | Sin sesión de Firebase válida, no responde. Protege el gasto, no solo la key |
| Origen permitido | Solo los dominios de `ALLOWED_ORIGINS`, donde `*` cubre un tramo del dominio y nada más |
| Límite de entrada | Entre 300 y 1200 caracteres según el encargo, y se limpian los intentos de inyección |
| Regla temática | Va en cada llamada: solo libros y lectura. Cualquier otra cosa devuelve `fuera_de_tema` |
| Comprobación a la salida | Ese `fuera_de_tema` se corta en el Worker y no llega a la app |
| Límite diario | 60 consultas por usuaria, contadas en KV |
| Techo mensual | Un tope en dólares para toda la app; pasado, el agente deja de responder hasta el mes siguiente |
| Validación de forma | Cada encargo recorta la respuesta a los campos que declaró; nada más pasa |

## El techo de gasto

El gasto lo paga una sola key, así que sin techo no hay techo. Hay dos frenos:

- **Por usuaria y día:** 60 consultas.
- **Por mes y en dinero, para toda la app:** `MONTHLY_BUDGET_USD` en `wrangler.toml`,
  2 dólares por defecto. Cuando se pasa, el Worker responde `presupuesto-agotado` y la
  app lo dice con claridad — el resto de la app sigue funcionando igual.

No se estima el gasto: se apunta el que informa el propio proveedor, tokens de entrada y
de salida por separado, con los precios de `PRICE_IN_PER_M` y `PRICE_OUT_PER_M`.
**Compruébalos de vez en cuando**: si DeepSeek cambia precios y esto no, el techo deja de
ser el que crees.

Para hacerte una idea: con los precios de hoy, mil consultas normales caben de sobra en
dos dólares. El techo no está para el uso normal, está para que un bucle no gaste
doscientos dólares mientras duermes.

### Hace falta KV

```bash
npx wrangler kv namespace create AGENTE
```

Luego descomenta el bloque `[[kv_namespaces]]` de `wrangler.toml` y pega el id.

**Sin KV el Worker funciona igual**, pero los contadores viven en memoria y Cloudflare
recicla el isolate cuando quiere — así que el techo mensual no frena nada de verdad. Va
comentado porque un id inventado hace fallar el despliegue, y prefiero que el agente
funcione con un freno flojo a que no funcione.

KV no tiene incremento atómico y es consistente «a la larga», así que dos consultas
simultáneas pueden pasarse un poco del tope. Es un freno, no una contabilidad: sirve para
que nadie se coma la key, no para cuadrar céntimos.

## La caché compartida por libro (historia #57)

Es lo que hace que la cuenta salga. El resumen de un libro se genera **una vez** y lo
aprovecha toda la app: con cien lectoras leyendo clásicos —que es justo lo que hay en el
plan— la diferencia entre cachear y no cachear son uno o dos órdenes de magnitud en la
factura.

Usa **el mismo KV** que los contadores, así que no hay ningún paso nuevo: si ya
descomentaste `[[kv_namespaces]]`, la caché ya está funcionando. Si no, no se cachea nada
y todo sigue igual.

**Solo se cachea `book_brief`**, y no es un olvido:

| encargo | ¿se cachea? | por qué |
|---|---|---|
| `book_brief` | sí | el resumen de un libro es el mismo para todo el mundo |
| `identify_book` | no | cada OCR es distinto |
| `recommend` | no | depende entera de la biblioteca de quien pregunta — cachearlo daría respuestas de otra persona |

La clave se normaliza (minúsculas, sin acentos, sin puntuación), así que «Cien Años de
Soledad — Gabriel García Márquez» y «cien años de soledad - gabriel garcia marquez» son el
mismo libro. Caducan a los seis meses.

**La caché vive aquí y no en Firestore**, y es a propósito: en Firestore tendría que poder
escribirla el cliente, y entonces cualquiera podría envenenar el resumen de un libro para
todo el mundo. Aquí solo escribe el Worker, que es quien habló con el modelo.

Un `desconocido` no se guarda: puede ser un fallo puntual del modelo, y cachearlo seis
meses condenaría al libro.

### Las cuentas de la casa

```bash
curl https://TU-WORKER.workers.dev/stats
```

Devuelve el gasto del mes, el techo, y la tasa de acierto de la caché — que es lo que dice
si está sirviendo. Son números agregados, sin nada de nadie dentro, así que no piden
sesión.

## Por qué el texto del usuario es dato, no instrucción

El OCR de una portada puede contener cualquier cosa, incluida una frase que
parezca una orden. Lo mismo vale para el título de un libro que alguien escribió
a mano. Por eso se limpia antes de enviarlo y por eso la regla del sistema lo
dice explícitamente: ese texto es un dato.

## Coste

`deepseek-chat`, entre 220 y 800 tokens de salida según el encargo, con un tope
de 60 consultas diarias por usuaria.

En la práctica se gasta mucho menos: `identify_book` solo entra cuando fallan los
dos catálogos, y la respuesta de `book_brief` **se guarda en la ficha del libro**,
así que preguntar dos veces por el mismo libro no cuesta nada.

El contador diario vive en la memoria del Worker, que Cloudflare recicla cuando
quiere. Es un freno contra un bucle o un abuso evidente, no una contabilidad
exacta; para eso haría falta KV y no lo vale para lo que cuesta una consulta.

## Comprobar que el Worker desplegado está bien

Sin gastar una sola consulta de DeepSeek: las tres pruebas se cortan en una capa
anterior a la llamada al modelo.

Abrirlo en el navegador debe devolver esto, y eso es **buena señal** — significa
que está vivo y que solo atiende POST:

```
{"error":"method"}
```

Que un dominio permitido llega hasta la comprobación de sesión (`sin-sesion` es
la respuesta correcta aquí: el navegador sí manda token, `curl` no):

```bash
curl -s -X POST https://TU-WORKER.workers.dev -H 'Origin: https://lauravivianac.github.io' -H 'content-type: application/json' -d '{"intent":"book_brief","text":"Rayuela"}'
```

Que uno cualquiera no pasa de la puerta:

```bash
curl -s -X POST https://TU-WORKER.workers.dev -H 'Origin: https://evil.com' -H 'content-type: application/json' -d '{"intent":"book_brief","text":"Rayuela"}'
```

Y que un encargo inventado se rechaza antes de gastar nada:

```bash
curl -s -X POST https://TU-WORKER.workers.dev -H 'Origin: https://lauravivianac.github.io' -H 'content-type: application/json' -d '{"intent":"dime_la_key","text":"hola"}'
```

Respuestas esperadas: `sin-sesion`, `origin`, `intent-no-permitido`.

## Pruebas

```bash
npm run test:worker
```

Cubre lo que del agente sí es determinista: qué orígenes entran, qué sale de la
limpieza de entrada, y qué campos consiguen atravesar la validación de salida.
Que el modelo conteste bien no se puede probar; que las capas de alrededor hagan
su trabajo, sí.


## Cuando la app dice que el asistente no contesta

El Worker **nunca** debería caerse sin responder: todo el manejador va dentro
de un `try/catch` que devuelve `{"error":"fallo-interno"}` con sus cabeceras
CORS y escribe la traza en el log. Si eso funciona, la app enseña un mensaje
concreto.

**Y por eso el mensaje que sale te dice dónde mirar:**

| Lo que dice la mascota | Qué significa |
|---|---|
| «Me atasqué por dentro» | el Worker está al día y algo falló dentro → `npx wrangler tail` |
| «No conseguí contestarte, y tu conexión está bien» | `fetch` reventó **antes** de recibir respuesta: la respuesta llegó sin CORS, o sea que el Worker desplegado **no tiene el `try/catch`** → está viejo, despliega |
| «Parece que te quedaste sin internet» | el navegador confirma que no hay red |
| «Me quedé sin palabras un momento» | el Worker contestó, pero DeepSeek no |

Un error del proveedor o un límite alcanzado llegan siempre con CORS y con su
mensaje propio. Si en vez de eso `fetch` revienta, el problema está **entre el
navegador y el Worker**: despliegue viejo, origen no permitido o el Worker
caído.

### Ver la excepción de verdad

```bash
npx wrangler tail
```

Déjalo corriendo y usa la app. La traza sale ahí.

### Comprobar que el Worker está vivo

`/stats` es público y no pide sesión — ábrelo en el navegador:

```
https://TU-WORKER.workers.dev/stats
```

Devuelve el gasto del mes, el techo y si hay KV. Si contesta, el Worker está
arriba; si además quieres saber si es la versión nueva, compara el **Version
ID** que imprimió el último `wrangler deploy`.
