const CACHE_VERSION = "cubanitos-v13";
const CACHE_NAME = `${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./logo.png",
  "./vendor/xlsx/xlsx.full.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // HTML navigation: prefer network so UI updates are not stuck in cache.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    // Scripts/estilos: network-first para evitar quedar clavados con versiones viejas.
    if (req.destination === "script" || req.destination === "style") {
      event.respondWith(
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => caches.match(req))
      );
      return;
    }

    // Resto de assets locales: cache-first.
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
  }
});
