# Las cuentas: qué hace falta y cómo se crea

Comprobado el 6 de septiembre de 2026 contra las páginas oficiales de Apple y
fuentes actuales sobre Google Play. **Las políticas cambian: vuelve a mirar la
página oficial antes de pagar.**

---

## Lo que hace falta, en total

| | Qué | Cuánto | Para qué |
|---|---|---|---|
| 1 | **Google Play Console** | 25 US$, una vez | historias #99 y #94 |
| 2 | **Apple Developer Program** | 99 US$ al año | historias #100 y #94 |
| 3 | ~~Cuenta para las push~~ | **gratis, no es una cuenta nueva** | historias #95 y #69 |

La tercera **no requiere crear nada**: las notificaciones salen de tu proyecto
de Firebase, el que ya tienes.

---

# ⚠️ Antes de pagar nada: una decisión que lo cambia todo

Las dos tiendas te preguntan si te registras **como persona** o **como
empresa**, y esa respuesta tiene dos consecuencias grandes.

## 1 · Tus datos salen publicados

**Apple** lo dice literalmente en su página de inscripción: si te registras como
individuo, **tu nombre legal aparece como vendedora en la App Store**.

**Google** endureció esto **justo este mes**: desde septiembre de 2026 toda
cuenta personal nueva pasa verificación de identidad —documento, prueba de
domicilio y teléfono— y, según las fuentes disponibles, **el nombre y la
dirección quedan visibles públicamente**.

> **Esto importa especialmente en esta app.** Library sirve para que
> mujeres queden con desconocidas a intercambiar libros. Toda la función de
> intercambio está construida sobre no guardar la dirección de nadie — el
> geohash recortado, las distancias en escalones, la regla del servidor que
> rechaza `lat` y `lon`. Sería un contrasentido que la única dirección
> publicada del sistema acabara siendo la tuya, en la ficha de la tienda.
>
> **Comprueba este punto concreto en la página oficial de Google antes de
> pagar.** No pude abrirla desde aquí y lo que tengo son fuentes secundarias.

## 2 · Los 14 días de espera de Google, o no

Las cuentas **de empresa están exentas** del requisito de los 12 testers. Las
personales, no.

|  | Personal | Empresa |
|---|---|---|
| Coste | 25 US$ | 25 US$ |
| 12 testers · 14 días | **sí, por cada app nueva** | **exenta** |
| Hace falta D-U-N-S | no | **sí** |
| Hace falta entidad legal | no | **sí** |
| Tus datos publicados | nombre y dirección | los de la empresa |

**El D-U-N-S es gratis** y lo da Dun & Bradstreet, pero tarda de días a un par
de semanas, y necesitas una entidad legal de verdad: autónoma dada de alta,
sociedad, asociación. Un nombre comercial inventado no vale.

### Qué haría yo

- **Si tienes o puedes tener una entidad legal** (autónoma, S.L., asociación
  cultural): ve por **empresa**. Te ahorras los 14 días, publicas los datos de
  la entidad en vez de los tuyos, y en Apple el vendedor es la entidad.
- **Si no**: cuenta **personal**, y entonces **empieza HOY por los 12 testers**,
  porque son dos semanas de reloj que corren solas.

En los dos casos, mira si puedes dar una **dirección que no sea tu casa**: un
apartado de correos no lo aceptan, pero un domicilio profesional o el de una
gestoría sí.

---

# 1 · Google Play Console — 25 US$

### Antes de empezar, ten a mano

- Una **cuenta de Google**. Yo usaría una **nueva, solo para esto**, no tu
  correo personal de siempre: va a quedar asociada para siempre a la app.
- Un **documento de identidad** (DNI o pasaporte).
- Una **prueba de domicilio** a tu nombre (una factura de suministros o un
  extracto bancario reciente suelen valer).
- Una **tarjeta** para los 25 US$.
- Un **teléfono** donde recibir un código.

### Los pasos

1. Entra en **[play.google.com/console](https://play.google.com/console)** con
   esa cuenta de Google.
2. Elige **cuenta personal** o **de empresa** según lo de arriba. *Cambiar de
   tipo después es un lío: piénsalo ahora.*
3. Rellena el perfil: nombre de desarrolladora que se va a publicar, correo de
   contacto público, web si tienes.
4. **Acepta el acuerdo** de distribución.
5. **Paga los 25 US$.** Es pago único, no anual.
6. **Verificación de identidad**: subes el documento y la prueba de domicilio, y
   verificas el teléfono. Suele resolverse en 2 o 3 días, a veces más.
7. Cuando esté aprobada, crea un **perfil de pagos** aunque la app sea gratis:
   Google lo pide igual.

### Y entonces, lo que tarda: los 12 testers

Aplica a **cuentas personales creadas después del 13 de noviembre de 2023**, y
es **por cada app nueva** (las actualizaciones ya no lo necesitan).

1. Sube una primera versión a **Prueba cerrada**.
2. Crea una lista de correos con **12 personas como mínimo**, cada una con su
   cuenta de Google.
3. Mándales el enlace de participación. **Tienen que aceptar y quedarse
   dentro.**
4. **El reloj son 14 días seguidos con 12 apuntadas.** Si una se sale, la cuenta
   baja y el reloj se resiente.
5. A los 14 días, en el panel aparece **«Solicitar acceso a producción»**.

> **Por eso esto va primero.** Es lo único del proyecto que no depende de
> escribir código: son catorce días de calendario. Pídeselo hoy a doce personas
> —familia, amigas, el club de lectura— y esas dos semanas corren mientras
> haces todo lo demás.

Fuentes: [requisito de pruebas para cuentas personales nuevas](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) ·
[el cambio de 20 a 12 testers](https://www.testerscommunity.com/blog/google-play-12-testers-policy) ·
[la verificación de identidad de 2026](https://www.biometricupdate.com/202508/google-unveils-identity-verification-rules-for-android-app-developers)

---

# 2 · Apple Developer Program — 99 US$ al año

### Antes de empezar, ten a mano

- Un **Apple ID con verificación en dos pasos activada**. Sin eso no se puede.
- Tu **nombre legal** puesto en el Apple ID, en los campos de nombre y
  apellidos. **Un alias, un apodo o un nombre de empresa retrasan la
  aprobación** — lo dice Apple.
- Una **dirección postal real**. **No aceptan apartados de correos.**
- Una **tarjeta** para los 99 US$.
- Un **Mac con Xcode** para compilar y subir (o un servicio de compilación en la
  nube).

### Los pasos

1. Entra en
   **[developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/)**,
   o hazlo desde la **app «Apple Developer»** en un iPhone o iPad — por ahí
   suele ir más rápido, porque la identidad ya está verificada en el dispositivo.
2. Inicia sesión con tu Apple ID.
3. Elige **Individual** o **Organización**:
   - **Individual**: tu nombre legal es el vendedor visible en la App Store.
   - **Organización**: hace falta **D-U-N-S**, entidad legal (no un nombre
     comercial), **correo del dominio de la empresa** y **una web pública de
     verdad** — una página con cuatro líneas o un perfil de redes no cuela.
4. Confirma nombre legal, correo, teléfono y dirección.
5. **Paga los 99 US$.** Se renueva cada año; si no renuevas, la app sale de la
   tienda.
6. Espera la aprobación: de 24-48 horas a un par de semanas si piden más papeles.

### Y luego, para publicar

- Crear la app en **App Store Connect**.
- **Una cuenta de demostración** con la que la revisión pueda entrar y ver las
  funciones sociales — es obligatoria y es donde más se falla. Está en la
  historia #100.
- Rellenar la **ficha de privacidad**, que ya está respondida en
  [`ficha-privacidad.md`](./ficha-privacidad.md).

Fuente: [página oficial de inscripción de Apple](https://developer.apple.com/programs/enroll/)

---

# 3 · Las notificaciones push — **sin cuenta nueva**

No hay que registrarse en ningún sitio: sale de tu proyecto de Firebase, el
mismo donde ya está la base de datos.

1. Entra en la **[consola de Firebase](https://console.firebase.google.com)** →
   proyecto **mi-biblioteca-7a3a5**.
2. **Configuración del proyecto** (la rueda) → pestaña **Cloud Messaging**.
3. En **Configuración web**, sección **Certificados push web**, pulsa **Generar
   par de claves**.
4. Copia la **clave pública (VAPID)**. Eso es lo único que necesito.

> **La clave pública sí me la puedes pasar; va dentro del código del cliente y
> se ve con F12 de todos modos.** Lo que **nunca** hay que pegar en un chat, en
> una incidencia ni en el repositorio es una clave *privada* ni una cuenta de
> servicio.

Para Android hará falta además el `google-services.json` desde esa misma
consola, y para iOS una **clave APNs** desde el portal de Apple — pero eso ya es
parte de la #94 y lo vemos cuando estés ahí.

---

# El orden, en una línea

**Hoy:** decide personal o empresa → crea la cuenta de Google Play → sube una
build a prueba cerrada → **pide a 12 personas que se apunten**.

Mientras corren esos 14 días: Apple, Capacitor, capturas y la cuenta de demo.
