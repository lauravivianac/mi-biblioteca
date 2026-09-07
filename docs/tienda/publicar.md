# Publicar en las tiendas · el camino que queda

Las cinco historias que faltan (#94, #95, #99, #100 y #69) **necesitan cuentas
que solo tú tienes**. Este documento es lo que se puede dejar decidido de
antemano para que el día que te sientes a hacerlo no haya que pensar, solo
ejecutar.

> **Por qué no está el código escrito ya.** Empaquetar con Capacitor y las
> notificaciones push no se pueden probar aquí: hacen falta Xcode, el SDK de
> Android y una clave de FCM. Escribir esa integración a ciegas sería
> exactamente lo que esta sesión se ha pasado arreglando — código que nunca ha
> tocado lo real. Cuando tengas las cuentas, se escribe y se prueba de verdad.

---

## Antes de nada: lo que ya está hecho

| | |
|---|---|
| ✅ | Política de privacidad, términos y EULA, publicados en `/legal/*` |
| ✅ | EULA aceptado al crear la cuenta, con tolerancia cero |
| ✅ | Contacto de soporte dentro de la app |
| ✅ | Ficha de privacidad de las dos tiendas, respuesta por respuesta |
| ✅ | Textos de ficha: nombre, subtítulo, descripción, palabras clave |
| ✅ | Iconos 192 y 512 |
| ✅ | Borrado de cuenta desde dentro de la app — **requisito de las dos tiendas** |
| ✅ | Reportar y bloquear en perfil, comentarios, intercambio y chat |

Eso cubre lo que más rechazos causa. Lo que queda es empaquetado y trámite.

---

## 1 · Empaquetar con Capacitor · #94

### Lo que ya está resuelto

La app es HTML estático sin empaquetador, así que **no hay que compilar nada**:
Capacitor envuelve la carpeta tal cual. Es la ventaja de haber evitado un
bundler todo este tiempo.

- `manifest.webmanifest` ya declara nombre, colores e iconos.
- `sw.js` ya da el funcionamiento sin conexión.
- El color de fondo (`#12100E`) ya coincide con el del splash, así que no habrá
  parpadeo al abrir.

### Lo que hay que hacer

```bash
npm i -D @capacitor/cli @capacitor/core
npx cap init "Mi Biblioteca" app.mibiblioteca --web-dir .
npm i @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npx cap sync
```

En `capacitor.config.json`, dos cosas que importan:

```json
{
  "appId": "app.mibiblioteca",
  "appName": "Mi Biblioteca",
  "webDir": ".",
  "server": { "androidScheme": "https" },
  "plugins": {
    "SplashScreen": { "backgroundColor": "#12100E", "showSpinner": false }
  }
}
```

`androidScheme: "https"` no es opcional: sin él Android sirve la app por
`http://` y **Firebase Auth rechaza el dominio**.

### Lo que hay que probar en el dispositivo

- Entrar con Google y con Apple. **Es lo más probable que falle**: hay que
  añadir el esquema de la app a los dominios autorizados de Firebase, igual que
  pasó con los previews de Vercel.
- La cámara para escanear códigos de barras (`@capacitor/camera`).
- Que el service worker no se pelee con el WebView.

**Hace falta:** un Mac con Xcode para iOS, Android Studio para Android.

---

## 2 · Notificaciones push · #95 — y con ella la #69

### La decisión que ya está tomada

La #69 (recordatorio de lectura a tu hora) **se aparcó a propósito** hasta
tener esto: un recordatorio que solo aparece si la app está abierta no es un
recordatorio.

### Lo que hace falta

1. En la consola de Firebase → **Cloud Messaging**, generar el par de claves
   web (VAPID).
2. Un `firebase-messaging-sw.js` en la raíz, aparte del `sw.js` actual.
3. Pedir permiso **en el momento adecuado**, no al abrir: cuando ella active el
   recordatorio. Un permiso pedido nada más entrar se deniega y ya no se vuelve
   a poder pedir.
4. Para mandarlas hace falta algo del lado del servidor. **Lo barato es
   reutilizar el Worker que ya existe** en vez de montar Cloud Functions: ya
   tiene autenticación con el token de Firebase y ya tiene límites de uso.

### Qué avisar, y qué no

Con moderación. Lo que merece un aviso:

- Alguien te pidió un libro, o contestó a tu solicitud.
- Un mensaje nuevo en un intercambio.
- El recordatorio de lectura, si lo activaste (#69).

Lo que **no**: que alguien te siga, que alguien comente, resúmenes semanales.
Eso ya está en la bandeja de avisos y una notificación por cada uno es la forma
más rápida de que se desactiven todas.

---

> **Cómo se crean las cuentas, paso a paso:** [`cuentas.md`](./cuentas.md).
> Léelo antes de pagar nada — hay una decisión (personal o empresa) que cambia
> si tienes que esperar 14 días y si tu dirección acaba publicada.

## 3 · Google Play · #99

Es la más fácil de las dos tiendas y conviene hacerla primero.

- **25 $ una vez**, cuenta de desarrolladora.
- Desde 2023, las cuentas personales nuevas necesitan **12 testers durante 14
  días** antes de poder publicar. **Esto es lo que más tiempo cuesta y hay que
  empezarlo pronto** — pídeselo a 12 personas con cuenta de Google y que se
  apunten al canal de prueba cerrada.
- El formulario de seguridad de los datos está respondido en
  [`ficha-privacidad.md`](./ficha-privacidad.md).
- Firmado de la app: usar **Play App Signing** y que Google guarde la clave. Si
  la guardas tú y la pierdes, no puedes volver a publicar nunca.

---

## 4 · App Store · #100

- **99 $ al año**.
- **La cuenta de demostración es obligatoria** y es donde más se falla: la
  revisión tiene que poder entrar y ver las funciones sociales. Hay que crear
  una cuenta de verdad, dejarla con libros, un perfil publicado y algún
  intercambio, y dar sus credenciales en App Store Connect.
- La guía **1.2** (contenido generado por usuarias) ya está cubierta: EULA con
  tolerancia cero, reportar, bloquear y contacto de soporte.
- **Sign in with Apple**: si ofreces entrar con Google, Apple exige ofrecer
  también el suyo. Ya está puesto en `auth.js`.
- El aviso del asistente de IA y la ficha de privacidad tienen que decir lo
  mismo. Está comprobado por `npm run test:legal`.

---

## El orden que yo seguiría

1. **Los 12 testers de Play**, ya — son 14 días de espera y no dependen de nada.
2. **Capacitor** y probar Google/Apple en un dispositivo de verdad.
3. **Capturas** con datos reales (la lista y los tamaños están en
   [`textos-ficha.md`](./textos-ficha.md)).
4. **Play**, que es la tienda menos estricta.
5. **Push** (#95) y con ella el recordatorio (#69) — ya con la app publicada.
6. **App Store**, con la cuenta de demo preparada.

---

## Lo que sigue pendiente y no es de tiendas

**Revisión jurídica de los textos legales**, y en particular de la
transferencia a China del asistente si vas a operar en la Unión Europea. Está
dicho al pie de cada documento. Una salida posible es no ofrecer el asistente
en la UE hasta tenerlo resuelto: la app funciona entera sin él.
