// ─── DocuIA Service Worker ─────────────────────────────────────────────────
// Estrategia: Network First para la app, Cache First para assets estáticos.
// Versión: incrementar cuando cambie el contenido del caché.

const CACHE_VERSION = "docuia-v1";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Assets que se cachean en la instalación (shell de la app)
const STATIC_ASSETS = [
  "/",
  "/biblioteca",
  "/offline",
  "/manifest.json",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

// ── Instalación: pre-cachear shell ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Cachear uno a uno para no fallar si alguno no existe
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch(() => console.warn(`[SW] No se pudo cachear: ${url}`))
        )
      );
    })
  );
  // Activar inmediatamente sin esperar a que cierren tabs anteriores
  self.skipWaiting();
});

// ── Activación: limpiar caches viejos ─────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("docuia-") && key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: estrategia según tipo de request ────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptar requests de otras origins o Chrome extensions
  if (!url.origin.includes(self.location.origin)) return;

  // ── API calls: Network Only (nunca cachear datos de usuario) ─────────────
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: "Sin conexión. Verifica tu internet." }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    return;
  }

  // ── Assets estáticos (_next/static): Cache First ──────────────────────────
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Páginas de la app: Network First con fallback al caché ────────────────
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Actualizar caché con versión fresca
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Sin red: intentar servir desde caché
          const cached = await caches.match(request);
          if (cached) return cached;
          // Fallback offline
          const offlinePage = await caches.match("/offline");
          if (offlinePage) return offlinePage;
          // Último recurso
          return new Response(
            `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>DocSkan — Sin conexión</title>
            <style>body{background:#0d0d0d;color:#f0f0f0;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px}
            h1{font-size:20px;font-weight:600}p{color:#555;font-size:14px}a{color:#00e5ff}</style></head>
            <body><h1>Sin conexión</h1><p>Revisa tu conexión a internet.</p><a href="/">Reintentar</a></body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // ── Resto: Network First ──────────────────────────────────────────────────
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── Push notifications (preparado para el futuro) ─────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "DocSkan", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-32.png",
    })
  );
});
