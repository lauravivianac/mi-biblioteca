# CLAUDE.md · Mi Biblioteca

Instrucciones para Claude Code en este repositorio. Claude las lee al empezar cada sesión.

## El proyecto en una línea

PWA de plan lector y biblioteca personal: HTML y módulos ES nativos sin bundler (`index.html`, `src/`), Firebase (Auth y Firestore, reglas en `firestore.rules`), un Cloudflare Worker (`worker/`) que llama a Claude Haiku 5.5 y manda los avisos push. El front se publica solo en Vercel al mezclar en `main`; el Worker y las reglas se despliegan a mano. Pruebas: `npm test`.

## Cuatro reglas para trabajar aquí

Adaptadas de las pautas de Andrej Karpathy recopiladas en github.com/multica-ai/andrej-karpathy-skills (licencia MIT). Se inclinan por la cautela antes que por la velocidad; en tareas triviales, usa el criterio.

### 1. Piensa antes de programar
No supongas, no escondas dudas y muestra las alternativas.
- Di tus supuestos en voz alta. Si no estás seguro, pregunta.
- Si la petición se puede leer de varias formas, muéstralas; no elijas en silencio.
- Si hay una forma más simple, dilo. Lleva la contraria cuando haga falta.
- Si algo no está claro, para, di qué te confunde y pregunta.

### 2. Lo más simple primero
El mínimo código que resuelve el problema. Nada especulativo.
- Nada que no se haya pedido.
- Sin abstracciones para código que se usa una sola vez.
- Sin "flexibilidad" ni configuraciones que nadie pidió.
- Sin manejo de errores para casos imposibles.
- Si escribiste 200 líneas y podían ser 50, reescríbelo.

Pregúntate: ¿una ingeniera senior diría que esto está sobrecomplicado? Si sí, simplifica.

### 3. Cambios quirúrgicos
Toca solo lo necesario. Limpia solo tu propio desorden.
- No "mejores" el código, los comentarios ni el formato de al lado.
- No refactorices lo que no está roto.
- Respeta el estilo que ya existe, aunque tú lo harías distinto.
- Si ves código muerto que no tiene que ver, menciónalo; no lo borres.
- Si tu cambio deja imports, variables o funciones sin uso, quítalos. Lo que ya estaba muerto se queda, salvo que te lo pidan.

La prueba: cada línea cambiada responde directamente a lo que se pidió.

### 4. Trabaja hacia un objetivo verificable
Define cómo se sabe que quedó bien y repite hasta comprobarlo.
- "Agrega validación" → escribe pruebas con datos inválidos y hazlas pasar.
- "Arregla el bug" → escribe una prueba que lo reproduzca y hazla pasar.
- "Refactoriza X" → las pruebas pasan antes y después.

En tareas de varios pasos, di un plan corto:
```
1. [Paso] → comprobar: [cómo]
2. [Paso] → comprobar: [cómo]
```

Estas reglas funcionan si hay menos cambios innecesarios en los diffs, menos reescrituras por complicar de más, y las preguntas llegan antes de programar y no después del error.

## Cuidados propios de este repo

- El Worker sube lo que hay EN EL DISCO: antes de `npx wrangler deploy`, `git pull` en `main`. Corre `node scripts/test-worker.mjs` antes de desplegar.
- Nunca pongas llaves en el repo ni en el cliente: `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY` y `VAPID_PRIVADA` viven como secretos del Worker.
- Dominios permitidos: si se agrega uno nuevo, va en `ALLOWED_ORIGINS` de `worker/wrangler.toml` y en los dominios autorizados de Firebase Auth.
