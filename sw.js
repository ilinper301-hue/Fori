/* Service worker de Pizarra del aula */
// Prefijo propio: Fori comparte dominio con Lectori, Barri y Tabula y solo debe borrar sus cachés
const CACHE = 'fori-v14';
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './icon.svg', './favicon-32.png', './icon-mark.svg', './icon-fav.svg', './fonts/inter-400.woff', './fonts/inter-500.woff', './fonts/inter-600.woff', './apps/lectori.png', './apps/barri.png', './apps/calculi.png', './apps/lexi.png', './fonts/fredoka.woff'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('fori-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const store = (req, res) => {
  if (res && (res.ok || res.type === 'opaque')) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.protocol.startsWith('http')) return;

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isPage) {
    // red primero (para recibir actualizaciones); sin red, la copia guardada
    e.respondWith(
      fetch(req).then(res => store(req, res)).catch(() =>
        caches.match(req).then(r => r || caches.match('./index.html')).then(r => r || caches.match('./'))
      )
    );
    return;
  }
  // resto: caché primero (ARASAAC, billetes/, iconos...)
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => store(req, res)))
  );
});
