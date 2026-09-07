/* Service worker. La app tiene que seguir funcionando sin red:
   es una de las cosas buenas que ya tenía y que el refactor no
   puede perder (criterio de la historia #12). */

const CACHE = 'bib-v32';
const SHELL = [
  './', './index.html',
  './styles/tokens.css', './styles/app.css', './styles/worlds.css', './styles/ui.css', './styles/pet.css',
  './src/main.js', './src/store.js', './src/seed.js', './src/views.js',
  './src/screens.js', './src/themes.js', './src/theme-engine.js',
  './src/planner.js', './src/plan-core.js', './src/auth.js',
  './src/firebase.js', './src/migrate.js', './src/covers.js', './src/ui.js',
  './src/achievements.js', './src/pet.js', './src/pet-core.js', './src/petchat.js',
  './src/petask.js', './src/push.js',
  './src/addbook.js', './src/booklookup.js', './src/scan.js', './src/agent.js',
  './src/ean.js', './src/shelves.js', './src/shelves-core.js',
  './src/quotes.js', './src/quotes-core.js', './src/quotesui.js',
  './src/suggest-core.js', './src/finished.js', './src/reviews-core.js',
  './src/taste-core.js', './src/taste.js',
  './src/gaps-core.js', './src/gaps.js', './src/gapsui.js',
  './src/duel-core.js', './src/duel.js', './src/streak-core.js',
  './src/year-core.js', './src/yearui.js', './src/username-core.js',
  './src/cards-core.js', './src/cardgen.js', './src/shareui.js',
  './src/profile-core.js', './src/profileui.js',
  './src/follows-core.js', './src/search-core.js', './src/social.js', './src/socialui.js',
  './src/qr-core.js', './src/inviteui.js',
  './src/feed-core.js', './src/feedui.js',
  './src/alsoread-core.js', './src/text-core.js',
  './src/place-core.js', './src/swap-core.js', './src/swap.js', './src/swapui.js',
  './src/comments-core.js', './src/moderation-core.js', './src/moderation.js', './src/commentsui.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  if (e.request.method !== 'GET') return;

  // Firestore y auth nunca se cachean: siempre en vivo
  if (url.includes('googleapis.com/google.firestore') || url.includes('identitytoolkit')) return;

  // Portadas: primero la red, y se guardan para la próxima
  if (url.includes('openlibrary') || url.includes('covers.openlibrary') || url.includes('books.google')) {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  /* El resto: RED PRIMERO, con la caché como red de seguridad.
     Servir de caché primero dejaba cada despliegue una recarga por
     detrás: la primera visita mostraba la versión vieja y guardaba la
     nueva para la siguiente. La app seguía funcionando sin conexión,
     pero parecía que no se desplegaba nada. */
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((ca) => ca.put(e.request, copy));
        return r;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match('./index.html')))
  );
});

/* ── LO QUE LLEGA CUANDO LA APP ESTÁ CERRADA  ·  #95 y #69 ────
   El cron manda ya escrita la frase que dice la mascota: quien decide
   QUÉ se dice es `avisoDelDia` en pet-core.js, el mismo módulo que usa
   el inicio. Aquí solo se pinta.

   Y SE PINTA COMO UN MENSAJE DE ALGUIEN, no como un aviso de una app:
   el título es su nombre —«Cleo»— y el cuerpo su pregunta. En una
   pantalla bloqueada, «Cleo · ¿Por dónde vas con Bartleby?» se abre y
   «Mi Biblioteca · tienes una notificación» se descarta. La diferencia
   está entera ahí. */

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = {}; }
  if (!d.cuerpo) return;   // sin frase no hay nada que decir

  e.waitUntil(self.registration.showNotification(d.titulo || 'Tu mascota', {
    body: d.cuerpo,
    icon: './img/icon-192.png',
    badge: './img/icon-192.png',
    /* Una etiqueta fija: si por lo que fuera llegaran dos, la segunda
       SUSTITUYE a la primera en vez de apilarse. Dos preguntas de la
       misma mascota en la bandeja es exactamente la sensación que esta
       historia promete no dar. */
    tag: 'mascota',
    /* Sin vibración ni sonido forzado: que lo decida el teléfono. */
    data: { libroId: d.libroId || '' },
  }));
});

/* Tocarla abre SU HOJA, con el libro por el que pregunta ya cargado.
   Abrir la app a secas dejaría a quien lee buscando de qué le hablaban
   —que es justo el trabajo que la notificación venía a ahorrar. */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const libro = e.notification.data?.libroId || '';
  const destino = `./index.html${libro ? `?mascota=${encodeURIComponent(libro)}` : '?mascota=1'}`;

  e.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    /* Si la app ya está abierta se le habla a ESA ventana en vez de
       abrir otra: dos copias de la misma biblioteca escribiendo en
       Firestore a la vez no es algo que nadie quiera. */
    for (const c of abiertas) {
      if (c.url.includes('/index.html') || c.url.endsWith('/')) {
        await c.focus();
        c.postMessage({ tipo: 'abrir-mascota', libroId: libro });
        return;
      }
    }
    await self.clients.openWindow(destino);
  })());
});
