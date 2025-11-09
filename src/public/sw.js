// Service Worker untuk Cerita di Sekitarmu
const CACHE_NAME = "cerita-di-sekitarmu-v1";
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

// Install Service Worker
self.addEventListener("install", (event) => {
  console.log("🚀 Service Worker: Installing...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("✅ Service Worker: Caching app shell");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("✅ Service Worker: Installation complete");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("❌ Service Worker: Installation failed", error);
      })
  );
});

// Activate Service Worker
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker: Activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME) {
              console.log("🗑️ Service Worker: Deleting old cache", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("✅ Service Worker: Ready to handle requests");
        return self.clients.claim();
      })
      .catch((error) => {
        console.error("❌ Service Worker: Activation failed", error);
      })
  );
});

// Handle fetch requests
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  // Skip external requests and API calls
  if (!requestUrl.origin.startsWith(self.location.origin)) return;
  if (
    requestUrl.pathname.includes("/api/") ||
    requestUrl.href.includes("story-api.dicoding.dev")
  ) {
    return;
  }

  // Handle page navigation
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches
        .match("/po1/index.html")
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request);
        })
        .catch(() => {
          return caches.match("/po1/index.html");
        })
    );
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback for images
          if (event.request.destination === "image") {
            return caches.match("/po1/images/mark.png");
          }
          // Generic offline response
          return new Response("Offline content not available");
        });
    })
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  console.log("📢 Push notification received");

  const options = {
    body: "Ada cerita baru di sekitarmu! 🗺️",
    icon: "/po1/icons/icon-192x192.png",
    badge: "/po1/icons/icon-72x72.png",
    tag: "story-notification",
  };

  event.waitUntil(
    self.registration.showNotification("Cerita di Sekitarmu", options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Notification clicked");
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Focus existing app window if available
      for (const client of clientList) {
        if (client.url.includes("/po1/") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow("/po1/");
      }
    })
  );
});

// Handle messages from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
