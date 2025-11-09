const CACHE_NAME = "cerita-di-sekitarmu-v13";

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

// Install event - FIXED: Hanya satu event.waitUntil
self.addEventListener("install", (event) => {
  console.log("✅ Service Worker: Installing...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("✅ Service Worker: Caching static assets");
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn(
            "⚠️ Service Worker: Some assets failed to cache:",
            error
          );
          // Lanjutkan meski ada error caching
        });
      })
      .then(() => {
        console.log("✅ Service Worker: Skip waiting activated");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("❌ Service Worker: Installation failed:", error);
      })
  );
});

// Activate event - FIXED: Better cleanup
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker: Activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("🗑️ Service Worker: Deleting old cache", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("✅ Service Worker: Claiming clients");
        return self.clients.claim();
      })
      .catch((error) => {
        console.error("❌ Service Worker: Activation failed:", error);
      })
  );
});

// Fetch event - FIXED: Better error handling
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip Chrome extensions & external requests
  if (url.protocol === "chrome-extension:") return;
  if (!url.origin.startsWith(self.location.origin)) return;

  // Skip API requests - biarkan melalui network
  if (
    url.pathname.includes("/api/") ||
    url.href.includes("story-api.dicoding.dev")
  ) {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches
        .match("/po1/index.html")
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log("📄 Serving cached index.html");
            return cachedResponse;
          }
          console.log("🌐 Fetching fresh index.html");
          return fetch(event.request);
        })
        .catch((error) => {
          console.error("❌ Navigation fetch failed:", error);
          return new Response("Offline - Navigation failed", {
            status: 408,
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
    return;
  }

  // Handle static assets - cache first strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        console.log("💾 Serving from cache:", event.request.url);
        return cachedResponse;
      }

      // Otherwise fetch from network
      console.log("🌐 Fetching from network:", event.request.url);
      return fetch(event.request)
        .then((response) => {
          // Check if we received a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the successful response
          caches
            .open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
              console.log("💾 Cached new resource:", event.request.url);
            })
            .catch((cacheError) => {
              console.warn("⚠️ Cache put failed:", cacheError);
            });

          return response;
        })
        .catch((fetchError) => {
          console.log("❌ Network fetch failed:", fetchError);

          // Provide fallbacks for specific file types
          if (event.request.destination === "image") {
            return caches
              .match("/po1/images/mark.png")
              .then((fallbackImage) => {
                return (
                  fallbackImage ||
                  new Response("Image not available", {
                    status: 404,
                    headers: { "Content-Type": "text/plain" },
                  })
                );
              });
          }

          // Generic offline response
          return new Response("Content not available offline", {
            status: 408,
            headers: { "Content-Type": "text/plain" },
          });
        });
    })
  );
});

// Push notifications dengan error handling
self.addEventListener("push", (event) => {
  console.log("📢 Push notification received");

  try {
    const options = {
      body: "Ada cerita baru di sekitarmu!",
      icon: "/po1/icons/icon-192x192.png",
      badge: "/po1/icons/icon-72x72.png",
      tag: "new-story-notification",
      requireInteraction: true,
    };

    event.waitUntil(
      self.registration
        .showNotification("Cerita di Sekitarmu", options)
        .then(() => console.log("✅ Notification shown"))
        .catch((error) => console.error("❌ Notification failed:", error))
    );
  } catch (error) {
    console.error("❌ Push event error:", error);
  }
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Notification clicked");
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Cari tab yang sudah terbuka dengan app kita
        for (const client of clientList) {
          if (client.url.includes("/po1/") && "focus" in client) {
            console.log("✅ Focusing existing app tab");
            return client.focus();
          }
        }

        // Jika tidak ada tab yang terbuka, buka tab baru
        if (clients.openWindow) {
          console.log("🆕 Opening new app window");
          return clients.openWindow("/po1/");
        }
      })
      .catch((error) => {
        console.error("❌ Notification click handler failed:", error);
      })
  );
});

// Handle background sync (jika diperlukan nanti)
self.addEventListener("sync", (event) => {
  console.log("🔄 Background sync:", event.tag);

  if (event.tag === "sync-offline-stories") {
    event.waitUntil(
      // Implement sync logic here
      Promise.resolve().then(() => console.log("✅ Offline stories synced"))
    );
  }
});

// Handle message from main app
self.addEventListener("message", (event) => {
  console.log("📨 Message received in SW:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
