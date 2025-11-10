// sw.js - Simple base path detection
const getBasePath = () => {
  const pathname = self.location.pathname;
  if (pathname.includes("/po1/")) {
    return "/po1/";
  }
  return "/";
};

const BASE_PATH = getBasePath();
const CACHE_NAME = "cerita-app-v5";

const STATIC_ASSETS = [
  BASE_PATH,
  BASE_PATH + "index.html",
  BASE_PATH + "main.bundle.js",
  BASE_PATH + "styles.css",
  BASE_PATH + "icons/icon-192x192.png",
  BASE_PATH + "icons/icon-512x512.png",
  BASE_PATH + "app.webmanifest",
];

self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker: Installing with base path:", BASE_PATH);

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("💾 Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("✅ Installation complete");
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", (event) => {
  console.log("🔧 Service Worker: Activating");

  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("🗑️ Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip API requests
  if (url.href.includes("story-api.dicoding.dev")) {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        return response;
      }

      // Otherwise fetch from network
      return fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to index.html for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match(BASE_PATH + "index.html");
          }
        });
    })
  );
});

// Push notifications (tetap sama)
self.addEventListener("push", (event) => {
  const options = {
    body: "Ada cerita baru di sekitarmu! 📖",
    icon: BASE_PATH + "icons/icon-192x192.png",
    badge: BASE_PATH + "icons/icon-72x72.png",
    tag: "story-notification",
  };

  event.waitUntil(
    self.registration.showNotification("Cerita di Sekitarmu", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(BASE_PATH);
      }
    })
  );
});
