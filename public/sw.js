// Network-first service worker: always fresh when online, still opens offline.
const CACHE = 'hoofnote-v2';
const SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/app.js', 'js/config.js', 'js/util.js', 'js/db.js', 'js/forms.js', 'js/schemas.js', 'js/ahs.js', 'js/due.js', 'js/demo.js', 'js/feedseed.js',
  'js/views/components.js', 'js/views/home.js', 'js/views/horses.js', 'js/views/lists.js', 'js/views/print.js',
  'js/views/blog.js', 'js/views/ai.js', 'js/views/settings.js', 'js/views/feedorder.js', 'js/views/calendar.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
