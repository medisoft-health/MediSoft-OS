// MediSport Standalone service worker (Phase 6).
// Scoped to sport routes; network-first for navigations, cache-first for static.
const CACHE = "medisport-v1";
const PRECACHE = ["/sport", "/offline.html", "/images/medi360-icon.png", "/sport-manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k.startsWith("medisport-")).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API or non-GET.
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (url.protocol === "blob:" || url.protocol === "data:") return;

  // Network-first for navigations with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Cache-first for static assets.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
