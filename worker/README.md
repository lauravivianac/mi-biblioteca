# El agente · proxy de DeepSeek

La app es HTML estático. Cualquier API key dentro del cliente es visible con F12
y se agota en horas, así que la key vive **solo aquí**, como secreto del entorno.

Una sola key, en un solo sitio, sirviendo a toda la app.

## Desplegar

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

Esa dirección es la que se pega en la app: **⚙ Ajustes → El agente lector**.
No hace falta tocar código.

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
| Límite diario | 60 consultas por usuaria |
| Validación de forma | Cada encargo recorta la respuesta a los campos que declaró; nada más pasa |

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

## Pruebas

```bash
npm run test:worker
```

Cubre lo que del agente sí es determinista: qué orígenes entran, qué sale de la
limpieza de entrada, y qué campos consiguen atravesar la validación de salida.
Que el modelo conteste bien no se puede probar; que las capas de alrededor hagan
su trabajo, sí.
