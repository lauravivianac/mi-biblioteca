/* Service worker. La app tiene que seguir funcionando sin red:
   es una de las cosas buenas que ya tenía y que el refactor no
   puede perder (criterio de la historia #12). */

const CACHE = 'bib-v3';
const SHELL = [
  './', './index.html',
  './styles/tokens.css', './styles/app.css', './styles/ui.css',
  './src/main.js', './src/store.js', './src/seed.js', './src/views.js',
  './src/screens.js', './src/themes.js', './src/theme-engine.js',
  './src/planner.js', './src/plan-core.js', './src/auth.js',
  './src/firebase.js', './src/migrate.js', './src/covers.js', './src/ui.js',
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

  // El resto: caché primero, y se refresca por detrás
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const live = fetch(e.request)
        .then((r) => { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)); return r; })
        .catch(() => cached);
      return cached || live;
    })
  );
});
