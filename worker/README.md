# Agente · proxy de DeepSeek

La app es HTML estático. Cualquier API key dentro del cliente es visible con F12
y se agota en horas, así que la key vive **solo aquí**, como secreto del entorno.

## Desplegar

```bash
cd worker
npx wrangler login
npx wrangler secret put DEEPSEEK_API_KEY    # pega tu key cuando lo pida
npx wrangler deploy
```

Al terminar, `wrangler` imprime la URL del Worker. Cópiala y pégala en
`src/agent.js`, en `WORKER_URL`.

**La key no se pega en el chat, ni en un issue, ni en ningún archivo del
repositorio.** El comando `secret put` la pide por teclado y la guarda cifrada
en Cloudflare.

## Qué hace

Un único endpoint que recibe un intent de una lista cerrada y responde JSON.

| Capa | Qué frena |
|---|---|
| Lista blanca de intents | Todo lo que no esté en `INTENTS` se rechaza **antes** de gastar tokens |
| Verificación del token | Sin sesión de Firebase válida, no responde. Protege el gasto, no solo la key |
| Origen permitido | Solo los dominios de `ALLOWED_ORIGINS` |
| Límite de entrada | 600 caracteres, y se limpian los intentos de inyección |
| Prompt cerrado | Solo identifica libros. Devuelve `null` antes que inventar uno |
| Límite diario | 20 consultas por usuaria |
| Validación de salida | Se comprueba la forma del JSON antes de devolverlo |

## Por qué el texto de una portada es dato, no instrucción

El OCR de una portada puede contener cualquier cosa, incluida una frase que
parezca una orden. Por eso se limpia antes de enviarlo y por eso el prompt del
sistema es explícito: identifica libros, nada más.

## Coste

`deepseek-chat` con 200 tokens de salida y un límite de 20 consultas diarias por
usuaria. Además, este intent solo se invoca cuando OpenLibrary **y** Google Books
fallan en identificar una portada, que es poco frecuente.
