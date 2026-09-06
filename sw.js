/* Service worker. La app tiene que seguir funcionando sin red:
   es una de las cosas buenas que ya tenía y que el refactor no
   puede perder (criterio de la historia #12). */

const CACHE = 'bib-v22';
const SHELL = [
  './', './index.html',
  './styles/tokens.css', './styles/app.css', './styles/worlds.css', './styles/ui.css', './styles/pet.css',
  './src/main.js', './src/store.js', './src/seed.js', './src/views.js',
  './src/screens.js', './src/themes.js', './src/theme-engine.js',
  './src/planner.js', './src/plan-core.js', './src/auth.js',
  './src/firebase.js', './src/migrate.js', './src/covers.js', './src/ui.js',
  './src/achievements.js', './src/pet.js',
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
