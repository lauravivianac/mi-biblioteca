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

| Épica | Módulo | Historias | Prioridad |
|---|---|---:|---|
| E0 | Fundación: auth, datos y refactor | 10 | P0 |
| E1 | Biblioteca mejorada | 7 | P1 |
| E2 | Social: perfil, amigas y comentarios | 9 | P2 |
| E3 | Agente IA con DeepSeek | 9 | P1 |
| E4 | Recomendaciones | 6 | P1 |
| E5 | Rachas, hábito y blog | 8 | P2 |
| E6 | Tienda de temas | 6 | P1 |
| E7 | Intercambio de libros | 9 | P3 |
| E8 | Compartir a Instagram | 4 | P2 |
| E9 | Empaquetado y tiendas | 7 | P3 |
| | **Total** | **75** | |

---

## E0 · Fundación — auth, datos y refactor `P0`

> Bloquea todo lo demás. Hoy el ID de usuaria está escrito a mano en el código y no hay
> autenticación: cualquiera que abra la app escribe sobre los datos de Laura.

| # | Historia | Tam | Depende de |
|---|---|---|---|
| 0.1 | Migrar el proyecto a Vite y partir `index.html` en módulos | L | — |
| 0.2 | Extraer todos los colores del CSS a design tokens | M | 0.1 |
| 0.3 | Registro e inicio de sesión con email y contraseña | M | 0.1 |
| 0.4 | Inicio de sesión con Google | S | 0.3 |
| 0.5 | Inicio de sesión con Apple | M | 0.3 |
| 0.6 | Migrar `biblioteca/laura` a `users/{uid}` sin perder datos | M | 0.3 |
| 0.7 | Reglas de seguridad de Firestore | M | 0.6 |
| 0.8 | Onboarding de primera vez | S | 0.3 |
| 0.9 | Borrar mi cuenta y todos mis datos desde la app | M | 0.6 |
| 0.10 | Exportar mis datos a JSON | S | 0.6 |

## E1 · Biblioteca mejorada `P1`

| # | Historia | Tam | Depende de |
|---|---|---|---|
| 1.1 | Crear estanterías propias y meter libros en ellas | M | E0 |
| 1.2 | Estados extendidos: abandonado y deseado | S | E0 |
| 1.3 | Registrar progreso por página o porcentaje | M | E0 |
| 1.4 | Añadir un libro escaneando su ISBN con la cámara | L | E0 |
| 1.5 | Google Books como respaldo de metadatos y portadas | M | E0 |
| 1.6 | Marcar cada reseña como privada o pública | S | E0 |
| 1.7 | Guardar citas favoritas con su página | M | E0 |

## E2 · Social — perfil, amigas y comentarios `P2`

| # | Historia | Tam | Depende de |
|---|---|---|---|
| 2.1 | Elegir un `@usuario` único | M | E0 |
| 2.2 | Perfil público con estanterías y estadísticas | L | 2.1, 1.6 |
| 2.3 | Seguir y dejar de seguir a alguien | M | 2.1 |
| 2.4 | Buscar personas por `@usuario` o nombre | M | 2.1 |
| 2.5 | Invitar por link y por código QR | S | 2.1 |
| 2.6 | Feed de actividad de a quién sigo | L | 2.3 |
| 2.7 | Comentar y reaccionar en el feed | M | 2.6 |
| 2.8 | Reportar y bloquear personas y contenido | L | 2.3 |
| 2.9 | Cuenta privada con solicitudes de seguimiento | M | 2.3 |

## E3 · Agente IA con DeepSeek `P1`

| # | Historia | Tam | Depende de |
|---|---|---|---|
| 3.1 | Worker de Cloudflare con la key de DeepSeek como secreto | M | — |
| 3.2 | El Worker verifica el token de Firebase antes de responder | M | 3.1, 0.3 |
| 3.3 | Guardrails: lista blanca de intents y prompt restrictivo | L | 3.2 |
| 3.4 | Límite por usuaria y presupuesto mensual con corte | M | 3.2 |
| 3.5 | Caché compartida de respuestas por libro | M | 3.2 |
| 3.6 | Resumen del libro sin spoilers | M | 3.3, 3.5 |
| 3.7 | «¿Lo leo o no?» con pros y contras personalizados | M | 3.6 |
| 3.8 | Comparar dos libros pendientes | S | 3.6 |
| 3.9 | El agente es opt-in, con aviso de privacidad | S | 3.6 |

## E4 · Recomendaciones `P1`

| # | Historia | Tam | Depende de |
|---|---|---|---|
| 4.1 | Motor local de recomendación por género, autor y longitud | L | E0 |
| 4.2 | Traer candidatos reales de OpenLibrary y Google Books | M | 1.5 |
| 4.3 | Sugerencias al terminar un libro | M | 4.1 |
| 4.4 | Sugerencias para llenar los huecos del plan lector | M | 4.1 |
| 4.5 | El agente explica por qué recomienda cada libro | S | 4.1, 3.6 |
| 4.6 | «Quien leyó esto también leyó» | M | 4.1, 2.3 |

## E5 · Rachas, hábito y blog `P2`

| # | Historia | Tam | Depende de |
|---|---|---|---|
| 5.1 | Racha diaria de lectura con congelaciones | M | 1.3 |
| 5.2 | Meta anual con ritmo necesario | M | E0 |
| 5.3 | Recordatorio de lectura a mi hora habitual | M | 9.2 |
| 5.4 | Logros por hitos de lectura | M | 1.3 |
| 5.5 | Resumen anual «Tu año en libros» | M | 5.2 |
| 5.6 | Escribir entradas de blog y notas de lectura | L | E0 |
| 5.7 | Elegir la visibilidad de cada entrada | S | 5.6 |
| 5.8 | El agente ordena mis notas en un borrador | M | 5.6, 3.3 |

## E6 · Tienda de temas `P1`

| # | Historia | Tam | Depende de |
|---|---|---|---|
| 6.1 | Motor de temas que aplica un JSON de design tokens | M | 0.2 |
| 6.2 | Pantalla de tienda con vista previa en vivo | M | 6.1 |
| 6.3 | Los ocho temas iniciales | L | 6.1 |
| 6.4 | El tema elegido se recuerda entre sesiones y dispositivos | S | 6.1 |
| 6.5 | Todos los temas pasan contraste AA | M | 6.3 |
| 6.6 | Temas de temporada que se desbloquean con logros | M | 6.3, 5.4 |

## E7 · Intercambio de libros `P3`

| # | Historia | Tam | Depende de |
|---|---|---|---|
| 7.1 | País y ciudad libres en el perfil | M | E0 |
| 7.2 | Poner un libro ya leído como disponible para intercambio | M | 7.1 |
| 7.3 | Explorar libros disponibles en mi ciudad | L | 7.2 |
| 7.4 | Solicitar un intercambio ofreciendo un libro mío | M | 7.3 |
| 7.5 | Chat dentro de la app para acordar el encuentro | L | 7.4 |
| 7.6 | Confirmar el intercambio y valorar a la otra persona | M | 7.5 |
| 7.7 | Reportar y bloquear desde listado, chat y perfil | M | 7.5, 2.8 |
| 7.8 | Avisos de seguridad en el flujo de encuentro | S | 7.5 |
| 7.9 | Requisitos para publicar: correo verificado y antigüedad | S | 7.2 |

## E8 · Compartir a Instagram `P2`

| # | Historia | Tam | Depende de |
|---|---|---|---|
| 8.1 | Generador de tarjetas 1080×1920 con el tema activo | L | 6.1 |
| 8.2 | Tarjeta de «libro terminado» y de cita favorita | M | 8.1, 1.7 |
| 8.3 | Tarjeta del resumen anual | S | 8.1, 5.5 |
| 8.4 | Compartir a Stories en móvil y descargar en web | M | 8.1 |

## E9 · Empaquetado y tiendas `P3`

| # | Historia | Tam | Depende de |
|---|---|---|---|
| 9.1 | Empaquetar con Capacitor para iOS y Android | L | E0 |
| 9.2 | Notificaciones push con FCM | L | 9.1 |
| 9.3 | Iconos, splash y textos de ficha de tienda | M | 9.1 |
| 9.4 | Política de privacidad, términos, EULA y contacto de soporte | M | — |
| 9.5 | Ficha de privacidad declarando DeepSeek y sus servidores | S | 9.4, 3.1 |
| 9.6 | Publicar en Google Play | M | 9.1, 9.3, 9.4 |
| 9.7 | Publicar en la App Store con cuenta de demo | L | 9.6, 0.5, 0.9, 2.8 |

---

## Notas de priorización

- **P0 no se negocia.** E0 es invisible para la usuaria pero desbloquea todo. Mientras no
  exista, cualquier historia social escribe sobre datos compartidos y abiertos.
- **El orden propuesto** (ver `PLAN-MODULOS.md`) es E0 → E1+E6 → E3+E4 → E5 → E2+E8 → E7 → E9.
  La lógica: que la app sea buena **para una sola usuaria** antes de invitar gente, porque
  una red social vacía se siente muerta.
- **Historias con requisito legal o de tienda**, que no pueden quedarse fuera si el objetivo
  es publicar: 0.5 (Sign in with Apple), 0.9 (borrado de cuenta), 2.8 (reportar y bloquear),
  9.4 y 9.5.
- **7.7 depende de 2.8**: la moderación se construye una vez y se reutiliza en el intercambio.
