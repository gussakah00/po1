const CACHE_NAME = "cerita-di-sekitarmu-v7";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles/styles.css",
  "/app.bundle.js",
  "/vendors.bundle.js",
  "/app.webmanifest",
  "/favicon.png",
];

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching static assets");
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.log(
            "Service Worker: Cache addAll error (some files might not exist):",
            error
          );
        });
      })
      .then(() => self.skipWaiting())
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

// Fetch event - FIXED VERSION
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip external requests
  if (!url.origin.startsWith(self.location.origin)) return;

  // 🚨 CRITICAL FIX: Skip Service Worker untuk development server
  if (url.hostname === "localhost" || url.port === "3000") {
    event.respondWith(fetch(event.request));
    return;
  }

  // Handle API requests
  if (
    url.pathname.includes("/api/") ||
    url.href.includes("story-api.dicoding.dev")
  ) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // Handle all other requests
  event.respondWith(cacheFirstStrategy(event.request));
});

// Strategy: Cache First untuk static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("Cache First Strategy failed:", error);

    // Fallback untuk halaman
    if (request.destination === "document") {
      const fallback = await caches.match("/index.html");
      if (fallback) return fallback;
    }

    return new Response("Network error happened", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// Strategy: Network First untuk API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log("Network First Strategy failed:", error);

    // Return error response untuk API calls
    return new Response(
      JSON.stringify({
        error: true,
        message: "You are offline",
      }),
      {
        status: 408,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Push Event Handler
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push event received");

  const options = {
    body: "Ada cerita baru di sekitarmu!",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: { url: "/" },
  };

  event.waitUntil(
    self.registration.showNotification("Cerita di Sekitarmu", options)
  );
});

// Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Notification clicked");
  event.notification.close();

  event.waitUntil(clients.openWindow("/"));
});
