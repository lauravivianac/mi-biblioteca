# Library — Plan de módulos y funcionalidad

> Documento de definición previo a construir. No hay código nuevo todavía: aquí
> decidimos **qué** se construye, **en qué orden** y **qué decisiones** quedan abiertas.

Fecha: 2026-09-05 · Rama: `claude/book-app-modules-planning-c1ejoz`

---

## 1. De dónde partimos (estado real hoy)

| Aspecto | Hoy |
|---|---|
| Arquitectura | **Un solo archivo** `index.html` (~1.600 líneas): CSS, HTML, service worker, manifest y lógica, todo junto |
| Datos | Firestore, documento único `biblioteca/laura` con `USER_ID` **fijo en el código** |
| Autenticación | **Ninguna**. Cualquiera que abra la app escribe sobre los datos de Laura |
| Reglas de seguridad | Sin auth no puede haber reglas útiles; la base está efectivamente abierta |
| Contenido | 70+ libros semilla (`SEED`) + libros propios, estado/rating/reseña por libro |
| Portadas | OpenLibrary (`openlibrary.org/search.json`), cacheadas |
| Vistas | Plan lector (por mes/año), Biblioteca (filtros + búsqueda), Tracker (progreso) |
| Estética | Tema oscuro "fantasía" morado, hardcodeado en el CSS |
| Distribución | PWA instalable |

**Lectura honesta:** la app funciona muy bien como *diario personal de un usuario*. Todo
lo que pides (amigos, comentarios, intercambio, tienda, IA) es **multiusuario**, y eso no
se puede montar encima de la arquitectura actual. El Módulo 0 no es opcional ni es
"refactor por gusto": sin él, los datos de cualquier persona que instale la app serían
públicos y editables por cualquier otra.

---

## 2. Decisiones que hay que tomar antes de codear

Estas tres cambian el plan de forma material. Mi recomendación va marcada, pero la
decisión es tuya.

### 2.1 Login con Instagram → **no es viable como login. Recomiendo email/Google/Apple.**

Verificado contra el estado actual de la plataforma Meta:

- La **Instagram Basic Display API** (la que permitía login de cuentas personales) fue
  **apagada definitivamente el 4 de diciembre de 2024**. Sus endpoints devuelven error.
- Su reemplazo, *Instagram API with Instagram Login*, **solo funciona con cuentas
  Professional (Business o Creator)**. Las cuentas personales quedan fuera → la mayoría
  de tus amigas no podría entrar.
- La API **nunca devuelve la lista de seguidores/seguidos**, solo el número
  (`followers_count`). Es decir: **"buscar amigos por Instagram" es imposible** con la API
  oficial. Lo que se ve por ahí son scrapers de terceros: violan los ToS de Meta, se
  rompen solos y son motivo de rechazo en la App Store.
- Aparte: Apple (guía 4.8) exige ofrecer **Sign in with Apple** si ofreces login social de
  terceros que recoja datos.

**Recomendación:** autenticación con **Firebase Auth** → Email/contraseña + Google + Apple
(Apple es obligatorio para publicar en iOS si hay login social). Instagram se queda como
lo que sí aporta valor y sí funciona: **compartir a Stories** (Módulo 8), sin login.

Para encontrar amigos usamos: **búsqueda por `@usuario`** + **link/QR de invitación** +
*(opcional)* contactos del teléfono con hash. Es lo que hace Goodreads y funciona.

### 2.2 API key de DeepSeek → **nunca en el cliente. Necesita un backend mínimo.**

La app es HTML estático: cualquier key que pongas en `index.html` es visible para
cualquiera con F12, y te vaciarían el saldo en horas. Hace falta un **proxy** que guarde la
key del lado servidor. Opciones:

| Opción | Coste | Notas |
|---|---|---|
| **Cloudflare Workers** ← recomendado | Gratis hasta 100k req/día | Independiente de Firebase, despliegue en minutos |
| Firebase Cloud Functions | Requiere plan **Blaze** (tarjeta) | Se integra nativo con Auth/Firestore |
| Vercel / Netlify Functions | Gratis generoso | Cómodo si luego migras el front ahí |

También hay que decir: **DeepSeek procesa en servidores en China**. Eso hay que declararlo
en la ficha de privacidad de la App Store y tenerlo en cuenta si hay usuarias en la UE
(GDPR). No es un bloqueante, es una declaración.

### 2.3 App Store → **el wrapper no basta; requiere trabajo propio.**

Apple rechaza por la guía **4.2 (Minimum Functionality)** las apps que son "una web
metida en una caja". Además, en el momento en que hay contenido generado por usuarias
(comentarios, intercambio) se activa la guía **1.2 (UGC)**, que exige de forma
**obligatoria**: filtro de contenido, **reportar**, **bloquear usuarios**, un contacto de
soporte y aceptación de un EULA. Y la **5.1.1(v)** exige **borrado de cuenta desde dentro
de la app**. Nada de esto es opcional: sin ello no pasa review.

**Recomendación:** empaquetar con **Capacitor** (Módulo 9), aprovechando lo nativo real
(cámara para escanear ISBN, push, share sheet, biometría) para superar la 4.2.

---

## 3. Mapa de módulos

*(Doce módulos: los diez originales más M10 · Plan lector inteligente y M11 · Mascota, añadidos el 5 de septiembre.)*

```
                    ┌─────────────────────────────┐
                    │  M0 · FUNDACIÓN             │  ← bloquea todo lo demás
                    │  Auth · Reglas · Refactor   │
                    └──────────────┬──────────────┘
        ┌──────────────┬───────────┼───────────┬──────────────┐
        │              │           │           │              │
   ┌────▼────┐   ┌─────▼─────┐ ┌───▼────┐ ┌────▼────┐   ┌─────▼─────┐
   │ M1      │   │ M2        │ │ M3     │ │ M6      │   │ M7        │
   │Bibliote-│   │ Social    │ │ Agente │ │ Tienda  │   │Intercambio│
   │ca+      │   │ Amigos    │ │ IA     │ │ de temas│   │  de libros│
   └────┬────┘   └─────┬─────┘ └───┬────┘ └─────────┘   └───────────┘
        │              │           │
        │         ┌────▼────┐ ┌────▼─────────┐
        │         │ M5      │ │ M4           │
        └────────▶│ Rachas  │ │Recomendaciones│
                  │ + Blog  │ └──────────────┘
                  └─────────┘
   ┌──────────────────────────────────────────────────────────┐
   │ M8 · Compartir a Instagram     M9 · Empaquetado App Store │
   └──────────────────────────────────────────────────────────┘
```

---

## M0 · Fundación (prerequisito, no negociable)

**Por qué primero:** sin identidad real, "mis libros" y "los tuyos" no existen como
concepto. Todos los demás módulos escriben datos por usuaria.

**Alcance**

- **Firebase Auth**: Email + Google + Apple. Pantalla de bienvenida/onboarding.
- **Migración de datos**: los datos actuales de `biblioteca/laura` pasan a
  `users/{uid}/...` sin perder nada. Script de migración de una sola vez.
- **Reglas de seguridad Firestore**: cada quien lee/escribe lo suyo; lo público (perfil,
  reseñas marcadas públicas) es legible por otras.
- **Refactor del monolito**: pasar de `index.html` de 1.600 líneas a un proyecto con
  módulos (`Vite` + JS o TypeScript). Sin esto, cada módulo nuevo hace el archivo
  inmanejable y cualquier cambio rompe otra cosa.
- **Design tokens**: sacar los colores hardcodeados a variables CSS. Es la condición
  técnica para que el Módulo 6 (temas) sea posible.
- **Borrado de cuenta** y exportación de datos (requisito App Store + buena práctica).

**Modelo de datos propuesto**

```
users/{uid}
  profile:      { username, displayName, avatar, bio, city, isPrivate, createdAt }
  settings:     { themeId, notifications, language }
  books/{bookId}       { title, author, genre, pages, isbn, coverUrl,
                         status, rating, review, isReviewPublic,
                         startedAt, finishedAt, plannedYear, plannedMonth, shelfIds }
  shelves/{shelfId}    { name, emoji, color }
  streak:       { current, longest, lastReadDate, freezes }
  posts/{postId}       { type, bookId, text, images, visibility, createdAt }

social/
  usernames/{username} → uid          (índice para búsqueda)
  follows/{followerUid_followingUid}  { createdAt }
  feed/{uid}/items/{itemId}           (fan-out de actividad)
  comments/{targetId}/items/{id}      { uid, text, createdAt }

exchange/
  listings/{listingId}  { ownerUid, bookTitle, author, condition, city, country,
                          coords?, photos, status, createdAt }
  requests/{requestId}  { listingId, fromUid, toUid, status, message }
  threads/{threadId}/messages/{id}

themes/{themeId}        { name, preview, tokens{...}, price, isPremium }
catalog/                (opcional, caché compartida de metadatos de libros)
reports/{reportId}      { targetType, targetId, reporterUid, reason, status }
```

**Entregable:** app con login real, datos aislados por usuaria, misma funcionalidad de hoy.

---

## M1 · Biblioteca mejorada

Sobre lo que ya existe, sin romperlo.

- **Estanterías / colecciones** propias además de género ("Favoritos", "Para el viaje",
  "Abandonados", "Releer").
- **Estados extendidos**: pendiente · leyendo · leído · abandonado · deseado.
- **Progreso por página o %** (hoy es solo binario leído/no leído) → alimenta el tracker,
  las rachas y las sugerencias.
- **Añadir un libro por dos caminos, con la misma ficha al final:**
  - **Con la cámara** — código de barras *o* **foto de la portada**. La foto importa porque
    muchos libros no tienen código de barras: ediciones viejas, heredadas, latinoamericanas.
  - **Escribiendo el título** — sugerencias mientras escribes, y la app completa autor,
    páginas, portada, editorial y año.

  Ambos comparten la misma capa de resolución de metadatos: lo que cambia es de dónde sale la
  consulta, no lo que pasa después. *(La cámara es además una de las funciones nativas que
  justifican la app ante Apple.)*
- **Metadatos mejores**: además de OpenLibrary, fallback a Google Books (mejor cobertura en
  español y de libros latinoamericanos).
- **Reseña privada vs pública**: interruptor por libro. Clave para el módulo social.
- **Citas favoritas** con página, para compartir después (M8).
- Importar desde Goodreads (CSV) — opcional, más adelante.

---

## M2 · Social: perfil, amigos y comentarios

- **Perfil público**: `@usuario`, avatar, bio, ciudad, estanterías públicas, estadísticas
  (leídos este año, géneros favoritos), "leyendo ahora".
- **Seguir / seguidores** (modelo asimétrico tipo Instagram, no "amistad mutua"). Perfil
  privado opcional con solicitudes.
- **Encontrar gente**: búsqueda por `@usuario` o nombre · **link y QR de invitación** ·
  sugerencias por "leyeron los mismos libros que tú".
- **Feed de actividad**: "Ana terminó *La Casa de los Espíritus* ⭐⭐⭐⭐⭐", "Sofía empezó a
  leer…", con **comentarios y reacciones**.
- **Comentarios** en reseñas y en publicaciones del blog (M5).
- **Clubes de lectura** *(fase 2)*: grupo con un libro y fecha, hilo de discusión con
  aviso de spoilers por capítulo.

**Obligatorio desde el día 1 de este módulo** (Apple 1.2 y sentido común):
**reportar**, **bloquear**, **silenciar**, moderación básica de texto y borrado de
contenido propio.

---

## M3 · Agente IA con DeepSeek

**Qué hace (alcance cerrado, a propósito):**

1. **Resumen sin spoilers** de un libro (3–5 frases: de qué va, tono, a quién le gusta).
2. **"¿Lo leo o no?"** — pros / contras / a quién se lo recomendaría, considerando *tus*
   últimas lecturas y valoraciones.
3. **Ficha rápida**: duración estimada según tu ritmo real, dificultad, temas, avisos de
   contenido.
4. **Comparar** dos libros de tu lista de pendientes y decidir cuál primero.
5. **Explicar una recomendación** del M4 ("te lo sugiero porque…").

**Arquitectura**

```
App  ──(Firebase ID token)──▶  Cloudflare Worker  ──(API key privada)──▶  DeepSeek
                                     │
                        rate limit · guardrails · caché · log
```

**Guardrails (defensa en capas, no solo un prompt):**

| Capa | Medida |
|---|---|
| 1. Interfaz | El agente no es un chat abierto: se invoca desde **acciones concretas** ("Resumir este libro", "¿Lo leo?"). El texto libre va en un campo con contexto fijo de un libro. |
| 2. Servidor | Solo acepta **intents de una lista blanca** (`summary`, `should_i_read`, `compare`, `explain_rec`). Cualquier otra cosa se rechaza antes de gastar tokens. |
| 3. Entrada | Límite de longitud, filtro de temas fuera de alcance, *stripping* de intentos de inyección ("ignora tus instrucciones…"). |
| 4. Prompt | System prompt estricto: solo libros, lectura y autores; se niega con un mensaje fijo y amable a cualquier otro tema; no da consejo médico/legal/financiero; no inventa datos (si no sabe, lo dice). |
| 5. Salida | Validación de formato (JSON esperado), filtro de spoilers, filtro de lenguaje. |
| 6. Abuso | **Rate limit por `uid`** (p. ej. 20 consultas/día), presupuesto mensual con corte automático, log de rechazos. |
| 7. Coste | **Caché en Firestore**: el resumen de *El Conde de Montecristo* se genera **una vez para toda la app**, no una por usuaria. Esto reduce el gasto de forma drástica. |

**Nota de privacidad:** DeepSeek procesa en China. Se declara en la ficha de privacidad y
en los ajustes; el agente es **opt-in** y nunca envía datos personales, solo título, autor
y géneros que te gustan.

---

## M4 · Recomendaciones

Enfoque **híbrido** — no todo con IA, porque saldría caro y lento:

1. **Capa local (gratis, instantánea):** por autor repetido, género dominante, longitud que
   sueles terminar, ritmo del mes, huecos del plan lector. Ya tienes 70+ libros con género
   y rol (⚓ Ancla / ⚡ Corto) — hay muchísima señal ahí sin gastar un token.
2. **Capa social:** "gente que leyó esto también leyó…" (cuando haya masa de usuarias).
3. **Capa IA (M3):** para *explicar* la recomendación y para casos difíciles.
4. **Catálogo:** OpenLibrary + Google Books para traer candidatos reales con portada.

**Superficies donde aparece:** al terminar un libro ("¿y ahora qué?"), en el hueco de un mes
del plan, en la pantalla de inicio ("para tu próximo Corto ⚡"), y al añadir un libro
("si te gustó este…").

---

## M5 · Rachas, hábito y blog

**Impulso a seguir leyendo:**

- **Racha diaria** de lectura (con 2 "congelaciones" al mes para no castigar la vida real).
- **Meta anual** y ritmo necesario ("vas 3 días por delante 🎉").
- **Recordatorio inteligente** a la hora en que sueles leer.
- **Logros**: primer clásico, 5 géneros distintos, un libro de +500 páginas, un año completo.
- **Resumen mensual/anual** compartible ("Tu 2026 en libros") — muy compartible en Stories.

**Blog / diario de lectura:**

- **Entradas propias**: notas mientras lees, reseñas largas, citas, listas ("5 libros para
  el invierno"), con portadas y visibilidad privada/amigas/pública.
- **Editor simple** (texto con negritas y citas, sin complicarnos con markdown completo).
- **El agente ayuda**, no escribe por ti: sugiere título, ordena tus notas en borrador.
  La voz debe seguir siendo tuya — un blog escrito por IA no lo lee nadie.

---

## M6 · Tienda de temas

**Cómo funciona técnicamente:** un tema es un **JSON de design tokens**, no CSS suelto.

```json
{
  "id": "obsidiana",
  "name": "Obsidiana",
  "tokens": {
    "--bg": "#0A0A0F", "--surface": "#15151F", "--accent": "#C9A227",
    "--text": "#EDEAF2", "--muted": "#8B87A0", "--radius": "18px",
    "--font-display": "Cormorant Garamond", "--font-body": "Inter"
  },
  "effects": { "grain": true, "glow": "soft" }
}
```

Aplicarlo = escribir variables CSS en `:root`. Preview en vivo antes de aplicar.
**Requiere el paso de design tokens del M0.**

**Temas iniciales propuestos (6–8, hechos por nosotros):**

| Tema | Idea |
|---|---|
| ✨ **Grimorio** | El actual: morado fantasía, dorado, brillo mágico (queda como default) |
| 🌑 **Obsidiana** | Oscuro puro, contraste alto, dorado sobrio |
| ☀️ **Pergamino** | Claro, papel envejecido, serif — modo día real |
| 🌿 **Herbario** | Verde botánico, ilustración vegetal |
| 🌊 **Marea** | Azules profundos, tipografía limpia |
| 🕯️ **Gótico** | Rojo vino y negro, para octubre/terror |
| 🌸 **Sakura** | Rosas suaves, para tu bloque de literatura oriental |
| 🖨️ **Máquina** | Monoespaciada, brutalismo, minimalista |

**Extras:** un tema puede cambiar también tipografía, radios, iconos del menú y la textura
de fondo. *(Idea:)* temas de temporada que se desbloquean con logros — gratis y motivan.

**Sobre cobrar:** si algún tema es de pago **en iOS, Apple obliga a usar su compra
integrada** y se queda el 15–30 %. Recomiendo **todos gratis en la v1** (los temas son un
gancho de retención, no un negocio) y, si acaso, monetizar más adelante con un "Pase" que
incluya temas + IA ilimitada.

---

## M7 · Intercambio de libros

**Flujo**

1. Marco un libro que ya leí como **"disponible para intercambio"** (desde su ficha, un
   toque) → estado, fotos, notas ("subrayado a lápiz", "tapa dura").
2. Aparece en el **mapa/lista por ciudad**, filtrable por género, autor y distancia.
3. Alguien envía una **solicitud**: puede ofrecer un libro suyo a cambio, o pedirlo suelto.
4. **Chat in-app** para acordar. Nunca se comparten teléfono ni dirección.
5. Al cerrarlo, ambas confirman y se dan **valoración de intercambio** (reputación).

**Ubicación — decisión de privacidad importante:**
guardamos **ciudad y barrio/zona, nunca la dirección exacta**. Si quieres mapa, se muestra
un círculo difuso de ~1 km, no un pin. Modelo: `{ country, city, area, geohash }`.
Empezamos por **Colombia** (ciudad + localidad) y se generaliza después.

**Seguridad — no es opcional:**

- Correo verificado y perfil con antigüedad mínima para publicar.
- **Reportar y bloquear** en listado, chat y perfil.
- Aviso fijo: **quedar siempre en un lugar público**; nunca dinero por la app.
- Sin pagos: es **trueque**. Meter dinero abriría requisitos legales y de Apple mucho mayores.
- Filtro de mensajes y límite de contacto para evitar spam.

**Fase 2:** "lo presto" (préstamo con fecha de devolución) y clubes que se pasan un libro.

---

## M8 · Compartir a Instagram (sin login)

Esto sí funciona, es gratis y es el mejor motor de crecimiento:

- **Tarjetas 1080×1920** generadas en la app (Canvas): "Terminé este libro", cita favorita,
  "Mi 2026 en libros", estantería del mes — cada una con el tema activo aplicado, así que
  **la tienda de temas se vuelve visible en Stories**.
- En móvil nativo: **share sheet** e *Instagram Stories deep link*
  (`instagram-stories://share`) con imagen de fondo y sticker.
- En web: descargar imagen + copiar texto.
- Cada tarjeta lleva tu `@usuario` → quien la vea puede encontrarte en la app.

---

## M9 · Publicación en la App Store

**Empaquetado:** **Capacitor** sobre el proyecto web (una sola base de código para web,
iOS y Android).

**Checklist de review (todo obligatorio):**

- [ ] **Funcionalidad nativa real** (cámara/ISBN, push, share sheet, biometría) → guía 4.2
- [ ] **Sign in with Apple** si hay login social → guía 4.8
- [ ] **UGC**: filtro, reportar, bloquear, contacto de soporte, EULA → guía 1.2
- [ ] **Borrado de cuenta desde la app** → guía 5.1.1(v)
- [ ] Ficha de privacidad completa (incluida la mención a DeepSeek/China)
- [ ] Política de privacidad y términos publicados en una URL
- [ ] Compras integradas si algo es de pago → guía 3.1.1
- [ ] Cuenta de demo para el equipo de review
- [ ] Iconos, capturas, textos ASO, clasificación por edad (12+ por UGC)
- [ ] Apple Developer Program: **99 USD/año**

**Android:** Google Play es más rápido y barato (25 USD una vez). Sugerencia: **salir
primero en Play**, corregir con usuarias reales, y después iOS.

## M10 · Plan lector inteligente `nuevo`

**El problema.** La app ya tiene un plan lector precioso —70+ libros repartidos por mes entre
2026 y 2028, con su ⚓ Ancla y su ⚡ Corto cada mes— pero está **escrito a mano en el código**.
Si cambia el ritmo real, si se atraviesa un libro de 1.200 páginas, o si se acumulan
pendientes, el plan no se mueve: se queda mintiendo.

**La conversación que la app debería tener**

> ¿Cuánto tiempo puedes leer al día? → 30 minutos entre semana, una hora los domingos
> ¿Qué quieres lograr este año? → 24 libros
> Tienes 18 pendientes y 6 represados de meses anteriores. Te armo un plan.

**Alcance**

- **Tiempo disponible**: minutos al día, distintos entre semana y fin de semana, con días libres.
- **Objetivo de lectura**: en libros, páginas o minutos. Y objetivos secundarios que encajan
  mejor con este plan que una cifra: «tres clásicos», «cinco géneros distintos».
- **Ritmo real**: páginas por día calculadas del progreso registrado, y por género — no se
  lee igual un thriller que un ensayo.
- **Generación del plan**: reparto mes a mes manteniendo el formato que ya funciona,
  equilibrando géneros y respetando afinidades de temporada (terror en octubre, mitología
  en invierno).
- **Libros represados**: los que quedaron atrás vuelven al plan con prioridad, o se sueltan
  sin culpa.
- **Ajuste manual**: fijar un libro a un mes, regenerar solo de aquí en adelante, volver al
  plan anterior.

**Cómo se resuelve:** es un problema de reparto, no de IA. Entran páginas, ritmo por género,
meses disponibles y preferencias; sale una asignación. Con reglas es más barato, instantáneo
y —sobre todo— **explicable**, que es lo que permite decir «te puse este libro en marzo porque…».

**El criterio que lo hace útil:** un plan que no se puede cumplir desmotiva más que no tener
plan. Si el ritmo real dice que no dan 24 libros, la app lo dice con cariño y propone 16. El
objetivo es de la usuaria; la honestidad sobre si va cumpliéndose es de la app. Y el plan
generado es una **propuesta**: mover libros a mano siempre gana.

---

## M11 · Mascota lectora customizable `nuevo`

Una compañera que vive en la app, reacciona a cómo vas leyendo y se puede personalizar. Es el
mecanismo que hace que la gente vuelva cada día a apps como Finch o Forest: no lees por la
estadística, lees porque hay alguien esperándote.

> **Nota:** la referencia dada es Catzi, que no conozco de primera mano. Lo de aquí está
> construido sobre el patrón general de app-con-mascota. Si hay algo específico de Catzi que
> replicar —cómo se ve, cómo interactúa, qué hace cuando no lees— conviene ajustarlo antes de
> construir.

**Alcance**

- **La mascota**: vive en el inicio, tiene nombre elegido por ti, y su estado refleja tu
  hábito — contenta si leíste hoy, dormida tras días sin nada, celebrando cuando terminas
  un libro.
- **Personalización**: apariencia, accesorios y su rincón (estantería, lámpara, planta, taza).
- **Su voz**: frases cortas **escritas a mano**, no generadas, con huecos que se rellenan con
  tus datos: «llevas tres días con el mismo capítulo, ¿está pesado?».

**Por qué las frases no las genera el agente:** cuestan cero, responden al instante, y —la que
de verdad importa— una mascota con voz propia y consistente se siente un personaje; una que
improvisa cada vez se siente un chatbot con sombrero.

**El límite que hay que respetar:** la mascota **nunca castiga**. Que se ponga a dormir tras
una semana sin leer es acogedor; que se enferme, se muera o te haga sentir culpable es
exactamente la razón por la que la gente desinstala este tipo de apps. Dormida significa
«aquí sigo cuando quieras», no «me abandonaste». Y quien solo quiera registrar libros debe
poder apagarla.

**Cómo encaja:** con M6, la tienda pasa a tener **dos estantes** —temas y cosas de la
mascota—; con M5, los logros son la moneda que desbloquea accesorios; con M10, la mascota es
quien recuerda el plan y quien lo celebra.

---

---

## 4. Temas transversales

| Tema | Qué implica |
|---|---|
| **Moderación** | Reportes, bloqueos, cola de revisión, borrado. Atraviesa M2, M5 y M7 |
| **Notificaciones** | Push (FCM): alguien te sigue, comentó, solicitó un intercambio, recordatorio de lectura. Con ajustes granulares |
| **Privacidad** | Todo privado por defecto; publicar es una decisión explícita por pieza |
| **Offline** | La app hoy es PWA y funciona sin red: no perder eso. Escrituras en cola |
| **Accesibilidad** | Todos los temas deben pasar contraste AA. Un tema bonito ilegible no sirve |
| **Idioma** | ES primero, estructura lista para EN |
| **Analítica** | Qué módulos se usan de verdad, para no seguir construyendo a ciegas |
| **Coste** | Ver abajo |

**Coste mensual estimado (fase temprana, decenas de usuarias)**

| Concepto | Coste |
|---|---|
| Firebase (Spark → Blaze) | 0 → unos pocos USD |
| Cloudflare Workers | 0 |
| DeepSeek (con caché compartida y rate limit) | ~1–5 USD |
| Apple Developer | 99 USD/año |
| Google Play | 25 USD una vez |

---

## 5. Orden de construcción propuesto

| Fase | Módulos | Resultado visible |
|---|---|---|
| **1. Base** | M0 | Login real, datos por usuaria, temas técnicamente posibles. *Sin esto no hay nada más.* |
| **2. Valor propio** | M1 + M6 | Mejor gestión de libros + tienda de temas. Disfrutable **sin necesitar amigas** — importante: una app social vacía se siente muerta |
| **3. Inteligencia** | M10 + M3 + M4 | Plan lector automático, agente y recomendaciones. Diferenciador claro, y funciona con una sola usuaria |
| **4. Hábito** | M5 + M11 | Rachas, blog y mascota. Retención |
| **5. Social** | M2 + M8 | Amigas, feed, comentarios y compartir a Stories. **El momento de invitar gente**, cuando la app ya vale la pena |
| **6. Comunidad** | M7 | Intercambio por ciudad. Necesita masa crítica local |
| **7. Tiendas** | M9 | Play primero, después App Store |

**El razonamiento del orden:** la tentación es empezar por lo social porque es lo más
emocionante. Pero una red social sin gente es un pueblo fantasma. Las fases 2–4 hacen que
la app sea buena **para ti sola**; así, cuando invites a alguien, llega a algo que ya
funciona — y esas fases son además las que puedes disfrutar mientras se construyen.

---

## 6. Decisiones tomadas y lo que queda abierto

**Decidido el 5 de septiembre de 2026**

| Decisión | Elegido |
|---|---|
| Autenticación | Email + Google + **Apple**. Instagram **no** es login, solo compartir |
| Backend del agente | **Cloudflare Workers**, gratis, con la key como secreto del entorno |
| Intercambio | **País + ciudad libres** desde el principio |
| Siguiente paso | Backlog completo antes de construir: 12 épicas y 87 historias en el repositorio |

**Queda abierto**

1. **Prioridad:** con el backlog en la mano, qué se construye primero. Mi recomendación sigue
   siendo **M0 + M6**: el primero es invisible pero imprescindible, el segundo se ve enseguida.
2. **La mascota (M11):** la referencia dada es Catzi, que no conozco. Si hay algo específico
   suyo que replicar —cómo se ve, cómo interactúa, qué hace cuando no lees— conviene definirlo
   antes de construirla.
3. **Temas:** ¿sirve la lista de ocho, quitamos o añadimos alguno?

> La key de DeepSeek **no la pegues en el chat ni en el repositorio**: cuando montemos el
> Worker se configura como secreto del entorno con `wrangler secret put`.

