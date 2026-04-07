const CACHE_VERSION = "20260408-3";
const APP_SHELL_CACHE = `cubanitos-app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `cubanitos-runtime-${CACHE_VERSION}`;
const APP_SHELL_URLS = [
  "./",
  "./index.html",
  "./style.css?v=20260330-20",
  "./app.js?v=20260408-3",
  "./manifest.json?v=20260312-1",
  "./logo.png?v=20260329-1",
  "./logo.png?v=20260312-1",
  "./version.json",
  "./vendor/xlsx/xlsx.full.min.js?v=20260313-1",
];
const CDN_HOSTS = new Set([
  "unpkg.com",
  "cdn.jsdelivr.net",
  "npmcdn.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
]);

function isSupabaseRequest(url) {
  return url.hostname.endsWith("supabase.co");
}

function isStaticAssetRequest(request, url) {
  if (request.destination === "style" || request.destination === "script" || request.destination === "image" || request.destination === "font" || request.destination === "manifest") {
    return true;
  }
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.includes("/vendor/")) return true;
  return /\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf|json)$/i.test(url.pathname);
}

async function putInRuntimeCache(request, response) {
  if (!response) return;
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request)
    .then(async (response) => {
      await putInRuntimeCache(request, response);
      return response;
    })
    .catch(() => null);
  if (cached) {
    void networkPromise;
    return cached;
  }
  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;
  return new Response("Sin conexion.", { status: 503, statusText: "Offline" });
}

async function networkFirstAsset(request) {
  try {
    const response = await fetch(request);
    await putInRuntimeCache(request, response);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Sin conexion.", { status: 503, statusText: "Offline" });
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    await putInRuntimeCache(request, response);
    return response;
  } catch {
    const cachedPage = await caches.match(request);
    if (cachedPage) return cachedPage;
    const cachedIndex = await caches.match("./index.html");
    if (cachedIndex) return cachedIndex;
    return new Response("Sin conexion.", { status: 503, statusText: "Offline" });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.addAll(APP_SHELL_URLS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys
        .filter((key) => key.startsWith("cubanitos-") && key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  const type = String(event?.data?.type || "");
  if (type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isSupabaseRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAssetRequest(request, url)) {
    if (url.origin === self.location.origin) {
      event.respondWith(networkFirstAsset(request));
      return;
    }
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (CDN_HOSTS.has(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
