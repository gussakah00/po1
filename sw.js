// Service Worker - FINAL STABLE VERSION
const CACHE_NAME = "cerita-app-final";

// Install - SIMPLE & STABLE
self.addEventListener("install", (event) => {
  console.log("🔧 SW: Installing...");
  event.waitUntil(self.skipWaiting());
});

// Activate - SIMPLE & STABLE
self.addEventListener("activate", (event) => {
  console.log("🔧 SW: Activated");
  event.waitUntil(self.clients.claim());
});

// Fetch - NETWORK FIRST (paling stabil)
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
    return;
  }

  // For navigation, serve index.html
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/po1/index.html"))
    );
    return;
  }

  // For other requests: Network First
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
