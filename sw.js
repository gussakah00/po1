const CACHE_NAME = "cerita-di-sekitarmu-v8";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles/styles.css",
  "/app.bundle.js",
  "/vendors.bundle.js",
  "/app.webmanifest",
  "/favicon.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
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
          console.log("Service Worker: Some assets failed to cache:", error);
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

  // 🚨 CRITICAL FIX: Skip non-GET requests
  if (event.request.method !== "GET") return;

  // 🚨 CRITICAL FIX: Skip external requests
  if (!url.origin.startsWith(self.location.origin)) return;

  // 🚨 CRITICAL FIX: Skip URLs with hash (SPA routing)
  if (url.hash && url.hash !== "") {
    console.log("Service Worker: Skipping hash URL", url.href);
    return;
  }

  // 🚨 CRITICAL FIX: Skip development server
  if (url.hostname === "localhost" || url.port === "3000") {
    console.log("Service Worker: Skipping development URL", url.href);
    event.respondWith(fetch(event.request));
    return;
  }

  // 🚨 CRITICAL FIX: Skip API requests (handle separately)
  if (
    url.pathname.includes("/api/") ||
    url.href.includes("story-api.dicoding.dev")
  ) {
    console.log("Service Worker: Handling API request", url.href);
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // Handle navigation requests (HTML pages)
  if (
    event.request.destination === "document" ||
    event.request.headers.get("Accept")?.includes("text/html")
  ) {
    console.log("Service Worker: Handling navigation request", url.href);
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // Handle static assets
  console.log("Service Worker: Handling static asset", url.href);
  event.respondWith(cacheFirstStrategy(event.request));
});

// Strategy: Cache First untuk static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log("Service Worker: Serving from cache", request.url);
      return cachedResponse;
    }

    console.log("Service Worker: Fetching from network", request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log("Service Worker: Cached response", request.url);
    }

    return networkResponse;
  } catch (error) {
    console.log("Service Worker: Cache First failed", request.url, error);

    // Fallback untuk halaman
    if (request.destination === "document") {
      const fallback = await caches.match("/index.html");
      if (fallback) {
        console.log("Service Worker: Serving fallback index.html");
        return fallback;
      }
    }

    return new Response("Network error", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// Strategy: Network First untuk dynamic content
async function networkFirstStrategy(request) {
  try {
    console.log("Service Worker: Network First strategy", request.url);
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log(
      "Service Worker: Network First failed, no fallback",
      request.url,
      error
    );

    // Return error response untuk API calls
    if (request.url.includes("/api/")) {
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

    return new Response("Offline", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

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

self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Notification clicked");
  event.notification.close();

  event.waitUntil(clients.openWindow("/"));
});
