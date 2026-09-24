/* ============================================================
   Service Worker — Jardines Integra Los Ríos
   Al publicar cambios, suba el número de versión para que
   todos los equipos descarguen la versión nueva.
   ============================================================ */
const VERSION = "v2.2.0";
const CACHE_STATIC = "integra-static-" + VERSION;
const CACHE_RUNTIME = "integra-runtime-" + VERSION;

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./img/inicio-720.webp",
  "./img/inicio.webp",
  "./img/banner-800.webp",
  "./img/banner.webp",
  "./img/reconocimiento-oficial.webp",
  "./img/reconocimiento-oficial-96.webp",
  "./img/icon-96.webp",
  "./fonts/nunito.woff2",
  "./fonts/baloo2.woff2"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      // Si un archivo falla, el resto igual queda guardado
      .then(cache => Promise.allSettled(PRECACHE.map(u => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_STATIC && k !== CACHE_RUNTIME).map(k => caches.delete(k))))
      .then(() => self.registration.navigationPreload && self.registration.navigationPreload.enable())
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Página: primero la red (datos al día). Si la red tarda más de 3 s
  // (señal móvil débil) o no hay conexión, se usa la copia guardada.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cached = await caches.match("./index.html");
      const network = (async () => {
        const res = (await event.preloadResponse) || (await fetch(req));
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_STATIC).then(c => c.put("./index.html", copy)); }
        return res;
      })();
      if (!cached) return network;
      const timeout = new Promise(r => setTimeout(() => r(cached), 3000));
      return Promise.race([network.catch(() => cached), timeout]);
    })());
    return;
  }

  // Archivos propios (imágenes, íconos): caché primero
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE_RUNTIME).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
