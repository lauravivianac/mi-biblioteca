# Backlog — Mi Biblioteca

Backlog completo de la evolución a red social de lectura. Cada épica corresponde a un
módulo de [`PLAN-MODULOS.md`](./PLAN-MODULOS.md). Cada historia es una tarjeta del board.

**Decisiones ya tomadas** (5 sep 2026)

| Decisión | Elegido |
|---|---|
| Autenticación | Email + Google + **Apple** · Instagram **no** es login, solo compartir |
| Backend del agente | **Cloudflare Workers** (gratis, la key vive como secreto del entorno) |
| Intercambio | **País + ciudad libres** desde el principio |
| Ubicación | Ciudad y zona, **nunca dirección exacta** |

**Convenciones**

- **Tamaño** — `S` ≈ medio día · `M` ≈ 1–2 días · `L` ≈ 3–5 días
- **Prioridad sugerida** — `P0` fase 1 (base) · `P1` fases 2–3 · `P2` fases 4–5 · `P3` fases 6–7
- Toda historia lleva la etiqueta de su módulo (`M0`…`M9`) y va colgada de su épica.

**Resumen**

| Épica | Issue | Módulo | Historias | Prioridad |
|---|---|---|---:|---|
| E0 | #1 ✅ | Fundación: auth, datos y refactor | 10 | P0 |
| E1 | #2 | Biblioteca mejorada | 8 | P1 |
| E2 | #3 | Social: perfil, amigas y comentarios | 9 | P2 |
| E3 | #4 | Agente IA con DeepSeek | 9 | P1 |
| E4 | #5 | Recomendaciones | 6 | P1 |
| E5 | #6 | Rachas, hábito y blog | 7 | P2 |
| E6 | #7 ✅ | Tienda de temas | 6 | P1 |
| E7 | #8 | Intercambio de libros | 9 | P3 |
| E8 | #9 | Compartir a Instagram | 4 | P2 |
| E9 | #10 | Empaquetado y tiendas | 7 | P3 |
| E10 | #30 ✅ | Plan lector inteligente | 6 | P1 |
| E11 | #31 ✅ | Mascota lectora customizable | 6 | P2 |
| | | **Total** | **87** | |

---

## E0 · Fundación — auth, datos y refactor `P0` · #1 ✅

> Bloquea todo lo demás. Hoy el ID de usuaria está escrito a mano en el código y no hay
> autenticación: cualquiera que abra la app escribe sobre los datos de Laura.

| # | Issue | Historia | Tam |
|---|---|---|---|
| 0.1 | #12 ✅ | Migrar el proyecto a Vite y partir `index.html` en módulos | L |
| 0.2 | #13 ✅ | Extraer todos los colores del CSS a design tokens | M |
| 0.3 | #14 ✅ | Registro e inicio de sesión con email y contraseña | M |
| 0.4 | #15 ✅ | Inicio de sesión con Google | S |
| 0.5 | #16 ✅ | Inicio de sesión con Apple | M |
| 0.6 | #17 ✅ | Migrar `biblioteca/laura` a `users/{uid}` sin perder datos | M |
| 0.7 | #18 ✅ | Reglas de seguridad de Firestore | M |
| 0.8 | #19 ✅ | Onboarding de primera vez | S |
| 0.9 | #20 ✅ | Borrar mi cuenta y todos mis datos desde la app | M |
| 0.10 | #21 ✅ | Exportar mis datos a JSON | S |

## E1 · Biblioteca mejorada `P1` · #2

> **Añadir un libro tiene dos caminos** —cámara (código de barras o foto de la portada) y
> título tecleado— que comparten la misma capa de metadatos y terminan en la misma ficha.

| # | Issue | Historia | Tam |
|---|---|---|---|
| 1.1 | #22 | Crear estanterías propias y meter libros en ellas | M |
| 1.2 | #23 ✅ | Estados extendidos: abandonado y deseado | S |
| 1.3 | #24 ✅ | Registrar progreso por página o porcentaje | M |
| 1.4 | #25 ✅ | Añadir un libro con la cámara: código de barras o foto de la portada | L |
| 1.5 | #26 ✅ | Google Books como respaldo de metadatos y portadas | M |
| 1.6 | #27 ✅ | Añadir un libro escribiendo solo el título | M |
| 1.7 | #28 | Marcar cada reseña como privada o pública | S |
| 1.8 | #29 | Guardar citas favoritas con su página | M |

## E2 · Social — perfil, amigas y comentarios `P2` · #3

| # | Issue | Historia | Tam |
|---|---|---|---|
| 2.1 | #44 | Elegir un `@usuario` único | M |
| 2.2 | #45 | Perfil público con estanterías y estadísticas | L |
| 2.3 | #46 | Seguir y dejar de seguir a alguien | M |
| 2.4 | #47 | Buscar personas por `@usuario` o nombre | M |
| 2.5 | #48 | Invitar por link y por código QR | S |
| 2.6 | #49 | Feed de actividad de a quién sigo | L |
| 2.7 | #50 | Comentar y reaccionar en el feed | M |
| 2.8 | #51 | Reportar y bloquear personas y contenido | L |
| 2.9 | #52 | Cuenta privada con solicitudes de seguimiento | M |

## E3 · Agente IA con DeepSeek `P1` · #4

| # | Issue | Historia | Tam |
|---|---|---|---|
| 3.1 | #53 ✅ | Worker de Cloudflare con la key de DeepSeek como secreto | M |
| 3.2 | #54 ✅ | El Worker verifica el token de Firebase antes de responder | M |
| 3.3 | #55 ✅ | Guardrails: lista blanca de intents y prompt restrictivo | L |
| 3.4 | #56 ◐ | Límite por usuaria y presupuesto mensual con corte | M |
| 3.5 | #57 ◐ | Caché compartida de respuestas por libro | M |
| 3.6 | #58 ✅ | Resumen del libro sin spoilers | M |
| 3.7 | #59 ✅ | «¿Lo leo o no?» con pros y contras personalizados | M |
| 3.8 | #60 | Comparar dos libros pendientes | S |
| 3.9 | #61 ◐ | El agente es opt-in, con aviso de privacidad | S |

## E4 · Recomendaciones `P1` · #5

| # | Issue | Historia | Tam |
|---|---|---|---|
| 4.1 | #62 | Motor local de recomendación por género, autor y longitud | L |
| 4.2 | #63 ◐ | Traer candidatos reales de OpenLibrary y Google Books | M |
| 4.3 | #64 | Sugerencias al terminar un libro | M |
| 4.4 | #65 | Sugerir libros para llenar los huecos del plan lector | M |
| 4.5 | #66 ✅ | El agente explica por qué recomienda cada libro | S |
| 4.6 | #67 | «Quien leyó esto también leyó» | M |

## E5 · Rachas, hábito y blog `P2` · #6

> El objetivo de lectura vive ahora en E10, junto al plan que lo hace posible.

| # | Issue | Historia | Tam |
|---|---|---|---|
| 5.1 | #68 | Racha diaria de lectura con congelaciones | M |
| 5.2 | #69 | Recordatorio de lectura a mi hora habitual | M |
| 5.3 | #70 ✅ | Logros por hitos de lectura | M |
| 5.4 | #71 | Resumen anual «Tu año en libros» | M |
| 5.5 | #72 | Escribir entradas de blog y notas de lectura | L |
| 5.6 | #73 | Elegir la visibilidad de cada entrada | S |
| 5.7 | #74 | El agente ordena mis notas en un borrador | M |

## E6 · Tienda de temas `P1` · #7 ✅

| # | Issue | Historia | Tam |
|---|---|---|---|
| 6.1 | #75 ✅ | Motor de temas que aplica un JSON de design tokens | M |
| 6.2 | #76 ✅ | Pantalla de tienda con vista previa en vivo | M |
| 6.3 | #77 ✅ | Los ocho temas iniciales | L |
| 6.4 | #78 ✅ | El tema elegido me sigue entre dispositivos | S |
| 6.5 | #79 ✅ | Todos los temas pasan contraste AA | M |
| 6.6 | #80 ✅ | Temas de temporada que se desbloquean con logros | M |

## E7 · Intercambio de libros `P3` · #8

| # | Issue | Historia | Tam |
|---|---|---|---|
| 7.1 | #81 | País y ciudad en el perfil | M |
| 7.2 | #82 | Poner un libro ya leído como disponible para intercambio | M |
| 7.3 | #83 | Explorar libros disponibles en mi ciudad | L |
| 7.4 | #84 | Solicitar un intercambio ofreciendo un libro mío | M |
| 7.5 | #85 | Chat dentro de la app para acordar el encuentro | L |
| 7.6 | #86 | Confirmar el intercambio y valorar a la otra persona | M |
| 7.7 | #87 | Reportar y bloquear desde listado, chat y perfil | M |
| 7.8 | #88 | Avisos de seguridad en el flujo de encuentro | S |
| 7.9 | #89 | Requisitos para publicar: correo verificado y antigüedad | S |

## E8 · Compartir a Instagram `P2` · #9

| # | Issue | Historia | Tam |
|---|---|---|---|
| 8.1 | #90 | Generador de tarjetas 1080×1920 con el tema activo | L |
| 8.2 | #91 | Tarjetas de libro terminado y de cita favorita | M |
| 8.3 | #92 | Tarjetas del resumen anual y de logros | S |
| 8.4 | #93 | Compartir a Stories en móvil y descargar en web | M |

## E9 · Empaquetado y tiendas `P3` · #10

| # | Issue | Historia | Tam |
|---|---|---|---|
| 9.1 | #94 | Empaquetar con Capacitor para iOS y Android | L |
| 9.2 | #95 | Notificaciones push con FCM | L |
| 9.3 | #96 | Iconos, splash y textos de ficha de tienda | M |
| 9.4 | #97 | Política de privacidad, términos, EULA y contacto de soporte | M |
| 9.5 | #98 | Ficha de privacidad declarando DeepSeek y sus servidores | S |
| 9.6 | #99 | Publicar en Google Play | M |
| 9.7 | #100 | Publicar en la App Store con cuenta de demo | L |

## E10 · Plan lector inteligente `P1` · #30 ✅

> El plan lector actual está **escrito a mano en el código**: 70+ libros repartidos por mes
> entre 2026 y 2028. Esta épica lo convierte en algo vivo, generado a partir del tiempo
> disponible, el objetivo y los libros represados.

| # | Issue | Historia | Tam |
|---|---|---|---|
| 10.1 | #32 ✅ | Decirle a la app cuánto tiempo tengo para leer | M |
| 10.2 | #33 ✅ | Establecer mi objetivo de lectura | M |
| 10.3 | #34 ✅ | Calcular mi ritmo real de lectura | M |
| 10.4 | #35 ✅ | Generar el plan mensual automáticamente | L |
| 10.5 | #36 ✅ | Rescatar los libros represados | M |
| 10.6 | #37 ✅ | Ajustar el plan a mano y regenerarlo cuando cambie mi vida | M |

## E11 · Mascota lectora customizable `P2` · #31 ✅

> Una compañera que reacciona a cómo vas leyendo y se personaliza con lo que ganas leyendo.
> **Nunca castiga**: si no has leído, te espera; no te reclama.

| # | Issue | Historia | Tam |
|---|---|---|---|
| 11.1 | #38 ✅ | Tener una mascota con nombre en el inicio | L |
| 11.2 | #39 ✅ | La mascota reacciona a mi hábito de lectura | M |
| 11.3 | #40 ✅ | Personalizar la apariencia de mi mascota y su rincón | L |
| 11.4 | #41 ✅ | Desbloquear accesorios leyendo | M |
| 11.5 | #42 ✅ | La mascota comenta mis lecturas | M |
| 11.6 | #43 ✅ | Poder ocultar la mascota | S |
| 11.7 | #44 ✅ | Hablar con la mascota al tocarla | M |

---

## Notas de priorización

- **P0 no se negocia.** E0 es invisible para la usuaria pero desbloquea todo. Mientras no
  exista, cualquier historia social escribe sobre datos compartidos y abiertos.
- **Orden propuesto:** E0 → E1+E6 → E10+E3+E4 → E5+E11 → E2+E8 → E7 → E9.
  La lógica: que la app sea buena **para una sola usuaria** antes de invitar gente, porque
  una red social vacía se siente muerta. E10 y E11 refuerzan justamente eso: el plan y la
  mascota funcionan sin que haya nadie más.
- **Historias con requisito legal o de tienda**, que no pueden quedarse fuera si el objetivo
  es publicar: #16 (Sign in with Apple), #20 (borrado de cuenta), #51 (reportar y bloquear),
  #61 (opt-in del agente), #97 y #98.
- **Dependencias que conviene no romper:**
  - #87 (moderar intercambio) reutiliza #51: la moderación se construye una vez.
  - #75 (motor de temas) exige #13 (design tokens). Sin eso, E6 no es posible.
  - E10 entera exige #24 (progreso por página): sin datos de avance no hay ritmo que calcular.
  - #25 y #27 comparten la capa de metadatos de #26: construirla una sola vez.
- **La tienda tiene dos estantes:** temas (E6) y cosas de la mascota (E11). Todo se
  desbloquea leyendo, nada se paga — lo que además evita la compra integrada de Apple y
  su 15–30 %.

---

## Estado · 6 sep 2026

**40 de 87 historias cerradas.** Cuatro épicas completas: E0 (fundación), E6 (temas),
E10 (plan lector) y E11 (mascota).

✅ cerrada · ◐ a medias, con lo que falta escrito en el issue

| Épica | Hechas | Estado |
|---|---:|---|
| E0 · Fundación | 10/10 | ✅ completa |
| E1 · Biblioteca mejorada | 5/8 | faltan estanterías, reseña privada y citas |
| E2 · Social | 0/9 | sin empezar |
| E3 · Agente IA | 5/9 | el agente funciona; falta presupuesto, caché compartida y consentimiento |
| E4 · Recomendaciones | 1/6 | recomienda, pero **sin comprobar que los libros existan** |
| E5 · Rachas y blog | 1/7 | solo los logros |
| E6 · Tienda de temas | 6/6 | ✅ completa, con nueve temas |
| E7 · Intercambio | 0/9 | sin empezar |
| E8 · Instagram | 0/4 | sin empezar |
| E9 · Tiendas | 0/7 | sin empezar |
| E10 · Plan lector | 6/6 | ✅ completa |
| E11 · Mascota | 6/6 | ✅ completa, con seis especies |

### Lo que hay que arreglar antes de seguir añadiendo

1. **#63 · Las recomendaciones no se comprueban.** El agente propone títulos y la app los
   pinta sin verificar que el libro exista. Un modelo inventa libros plausibles con total
   confianza. Es un fallo de calidad en algo que ya está en producción.
2. **#61 · El agente es opt-out, y la historia pide opt-in.** Requisito de tienda, y
   discutible aunque no lo fuera: hoy alguien empieza a usar la app con el agente
   encendido sin haber dicho que sí.
3. **#56 · No hay techo real de gasto.** El contador diario vive en la memoria del Worker,
   que Cloudflare recicla. Con una usuaria da igual; abierto a más gente, no.

### Historias que aparecieron construyendo, y no estaban en el backlog

- Lector propio de códigos de barras EAN-13, porque `BarcodeDetector` no existe en Safari
  de iPhone y ahí ese camino estaba muerto
- Géneros más anchos que el plan: romance, aventura, ciencia ficción, novela histórica…
- Pruebas de los guardrails del Worker (34) y del lector de códigos (28)

### Nueva · Franja de edad lectora — *sin abrir, y hay que decidirla antes de la tienda*

> «¿Deberíamos pedir la edad, un rango, para que la biblioteca recomiende de acuerdo a la
> edad? No algo de terror a un niño de nueve años.»

Tiene razón, y **hoy no hay nada que lo impida**: el plan lector reparte «Terror /
Misterio» como un género más, `recommend` propone lo que le parece, el tema Gótico se
gana terminando un mes de terror y el chat de la mascota contesta sobre lo que sea que
esté leyendo. Ninguna de las cuatro cosas sabe quién está al otro lado.

**Pero pedir la edad de una niña no es una casilla más.** Es el dato que convierte la app
en «tratamiento de datos de menores» — consentimiento paterno del artículo 8 del RGPD,
COPPA en EE. UU., y la categoría de familias en ambas tiendas —, y esta app manda texto a
un proveedor en China. Cuanto más fina la edad, más caro sale.

La forma que sale barata y sirve igual:

1. **Franja, no fecha.** Cuatro tramos (`hasta-9`, `10-12`, `13-15`, `adulto`). Una fecha
   de nacimiento identifica; un tramo es una preferencia.
2. **Preguntar «¿para quién es esta biblioteca?», no «¿cuántos años tienes?»** — la misma
   información para filtrar, y no es un dato personal de nadie.
3. **Que filtre en los cuatro sitios**, no solo en las recomendaciones: el reparto de
   géneros del plan, `recommend`, el desbloqueo del tema Gótico y lo que se ve en
   Explorar. Filtrar solo en uno da una falsa sensación de que está resuelto.
4. **Es opcional y se puede quitar.** Sin franja, la app se comporta como hoy.
5. **Y cambia el aviso de privacidad con ella**, porque el tramo viajaría dentro de
   `recommend`. La regla está escrita en `agent.js`: si cambia lo que se manda, cambia
   `WHAT_WE_SEND` — un aviso desactualizado es peor que no tenerlo, porque promete.

Lo que **no** debe hacer: bloquear libros. Una biblioteca que esconde títulos es censura y
además no funciona —se sortea en un minuto—. Lo que se filtra es **lo que la app propone
por su cuenta**; lo que la lectora busca y añade a mano es suyo.

---

### Nueva · La mascota pregunta también por notificación — *abierta*

> «Haz que la mascota pregunte también por notificación.»

Las dos preguntas de la historia #45 ya funcionan, pero **solo cuando abres la app** — y
quien lleva cinco días sin leer es justamente quien no la abre. Sin esto, la pregunta
llega a todo el mundo menos a quien iba dirigida.

#### Por qué no es un rato de trabajo

En el repo no hay nada: `sw.js` son 76 líneas de caché. Y una notificación con la app
cerrada **no se puede programar desde el navegador** — no hay API fiable para eso en
ningún sitio, y menos en iPhone. Hace falta lo que esta app nunca ha tenido: **algo que
se despierte solo**.

| Pieza | Dónde |
|---|---|
| Permiso del navegador y token del dispositivo | Cliente |
| Guardar el token | Firestore, bajo la usuaria |
| Decidir a quién y qué | Un cron diario |
| Mandarlo | FCM |
| Pintarlo y abrir la hoja al tocarlo | `sw.js` |

**Lo que ya está resuelto y encaja solo:** `estadoMascota` y `fraseMascota` viven en
`pet-core.js`, sin DOM y sin Firebase. El cron **importa el mismo módulo** y manda
exactamente la misma frase que verías en el inicio. Una sola voz en los dos sitios, sin
un segundo juego de frases que se desincronice — que es como esto sale mal siempre.

#### La decisión que no es técnica

El cron **lee la biblioteca de cada persona todos los días**, aunque nadie abra la app.
Hoy el Worker solo ve lo que le mandas en el momento y no guarda nada. Esto es otra cosa,
y hay que decirlo en el aviso de privacidad antes de encenderlo — sobre todo porque puede
ser la biblioteca de una niña.

Lo que lo hace aceptable, y es parte de la historia y no un detalle: **el cron lee, decide
y olvida.** No guarda ni un registro de lo que vio, ni el texto que mandó. Lo único que
persiste es el token del dispositivo y la fecha del último aviso.

#### Y la regla de este módulo, que aquí pesa el doble

**La mascota nunca castiga.** En una pantalla que abriste tú, una frase floja se perdona;
una notificación entra en el teléfono sin que nadie la haya pedido en ese momento, y el
mismo texto se lee mucho más duro. Así que:

- **Una al día como mucho**, y solo si hay algo que preguntar de verdad.
- **Nunca de rachas ni de metas.** «Vas a perder tu racha» es la frase que hace que la
  gente desinstale, y encima es mentira: aquí no se pierde nada.
- **Franja horaria**, y por defecto ninguna de noche.
- **Se apaga en un toque**, desde la propia notificación y desde Ajustes.
- **El permiso se pide cuando se entiende para qué es** —al responder por primera vez a
  una pregunta de la mascota—, nunca al registrarse. La misma regla que el consentimiento
  del agente en la historia #61.

#### En rebanadas

1. Permiso, token y el interruptor en Ajustes. Sin cron todavía: no manda nada, pero
   tampoco promete nada.
2. El cron diario leyendo `pet-core.js`, con el aviso de privacidad actualizado **en el
   mismo cambio**.
3. Tocar la notificación abre la hoja de respuesta directamente, en el libro que toca.

La 1 y la 3 son de esta app. **La 2 es un servicio nuevo**, con su secreto de cuenta de
servicio —que va por `wrangler secret put` y no se pega en ningún sitio, como la key del
agente— y su propio coste.

#### Lo que NO cubre

iPhone solo entrega notificaciones a una PWA **instalada en la pantalla de inicio**. No es
un fallo que se pueda arreglar desde aquí: si la mayoría de las lectoras van a usar la app
desde el navegador de Safari sin instalarla, esta historia les llega a medias, y eso hay
que saberlo **antes** de construir la rebanada 2, no después.
