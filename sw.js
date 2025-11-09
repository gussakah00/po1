const CACHE_NAME = "cerita-di-sekitarmu-v12";

// Static assets - HARDCODE paths untuk production
const STATIC_ASSETS = [
  "/po1/",
  "/po1/index.html",
  "/po1/app.css",
  "/po1/app.bundle.js",
  "/po1/vendors.bundle.js",
  "/po1/app.webmanifest",
  "/po1/favicon.png",
  "/po1/icons/icon-72x72.png",
  "/po1/icons/icon-96x96.png",
  "/po1/icons/icon-128x128.png",
  "/po1/icons/icon-144x144.png",
  "/po1/icons/icon-152x152.png",
  "/po1/icons/icon-192x192.png",
  "/po1/icons/icon-384x384.png",
  "/po1/icons/icon-512x512.png",
  "/po1/images/logo.png",
  "/po1/images/mark.png",
];

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");

  // Skip waiting untuk versi baru
  event.waitUntil(self.skipWaiting());

  // Cache assets
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Caching static assets");
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn("Service Worker: Some assets failed to cache:", error);
        // Lanjutkan meski ada error caching
      });
    })
  );
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Service Worker: Deleting old cache", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - SUPER SIMPLE version
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip external requests
  if (!url.origin.startsWith(self.location.origin)) return;

  // Skip API requests
  if (
    url.pathname.includes("/api/") ||
    url.href.includes("story-api.dicoding.dev")
  ) {
    return; // Biarkan fetch normal
  }

  // Untuk navigation requests, berikan index.html
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("/po1/index.html").then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request);
      })
    );
    return;
  }

  // Untuk assets lainnya, cache first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Cache response yang successful
          if (response.status === 200) {
            const responseClone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Fallback untuk images
          if (event.request.destination === "image") {
            return caches.match("/po1/images/mark.png");
          }
          return new Response("Offline", { status: 408 });
        });
    })
  );
});

// Push notifications (SIMPLE)
self.addEventListener("push", (event) => {
  const options = {
    body: "Ada cerita baru di sekitarmu!",
    icon: "/po1/icons/icon-192x192.png",
    badge: "/po1/icons/icon-72x72.png",
  };

  event.waitUntil(
    self.registration.showNotification("Cerita di Sekitarmu", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/po1/"));
});
