const APP_VERSION = "__BUILD_VERSION__";
const CACHE_NAME = `minera-marte-pwa-${APP_VERSION}`;
const TILE_CACHE_NAME = "minera-marte-map-tiles-v1";
const APP_SHELL = ["/login", "/manifest.webmanifest", "/icons/app-icon-192.png", "/icons/app-icon-512.png"];
const TILE_HOSTS = new Set(["a.tile.openstreetmap.org", "b.tile.openstreetmap.org", "c.tile.openstreetmap.org", "tile.openstreetmap.org"]);
const PRIVATE_PREFIXES = [
  "/dashboard",
  "/exploraciones",
  "/exploraciones-data-room",
  "/solicitudes-data-room",
  "/trabajadores",
  "/usuarios",
  "/login",
  "/forgot-password",
  "/reset-password"
];

function isPrivateAppPath(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "CACHE_MAP_TILES" && Array.isArray(event.data.urls)) {
    event.waitUntil(
      caches.open(TILE_CACHE_NAME).then((cache) =>
        Promise.all(
          event.data.urls.map((tileUrl) =>
            cache.match(tileUrl).then((cached) => {
              if (cached) return cached;
              return fetch(tileUrl, { mode: "no-cors", cache: "force-cache" }).then((response) => {
                if (response.ok || response.type === "opaque") {
                  cache.put(tileUrl, response.clone());
                }
                return response;
              });
            })
          )
        )
      )
    );
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== TILE_CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.pathname.startsWith("/api")) return;

  if (TILE_HOSTS.has(url.hostname)) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => cached || cache.match(url.href)).then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((response) => {
              if (response.ok || response.type === "opaque") {
                cache.put(url.href, response.clone());
              }
              return response;
            })
            .catch(() => Response.error());
        })
      )
    );
    return;
  }

  if (request.mode === "navigate") {
    if (!isPrivateAppPath(url.pathname)) return;

    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/login", copy));
          return response;
        })
        .catch(() => caches.match("/login") || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
