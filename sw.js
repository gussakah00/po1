// Service Worker - FIXED NOTIFICATION VERSION
const CACHE_NAME = "cerita-app-final";

// Install
self.addEventListener("install", (event) => {
  console.log("🔧 SW: Installing...");
  event.waitUntil(self.skipWaiting());
});

// Activate
self.addEventListener("activate", (event) => {
  console.log("🔧 SW: Activated");
  event.waitUntil(self.clients.claim());
});

// Fetch - Network First
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (!url.origin.startsWith(self.location.origin)) return;
  if (
    url.pathname.includes("/api/") ||
    url.href.includes("story-api.dicoding.dev")
  ) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/po1/index.html"))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push notifications - FIXED FOR PRODUCTION
self.addEventListener("push", (event) => {
  console.log("📢 Push notification received");

  const options = {
    body: "Ada cerita baru di sekitarmu! 📖",
    icon: "/po1/icons/icon-192x192.png",
    badge: "/po1/icons/icon-72x72.png",
    tag: "new-story",
    requireInteraction: false, // Biarkan notifikasi hilang sendiri
    data: {
      url: "/po1/",
      timestamp: new Date().toISOString(),
    },
  };

  event.waitUntil(
    self.registration.showNotification("Cerita di Sekitarmu", options)
  );
});

// Notification click handler - FIXED FOR PRODUCTION
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Notification clicked");

  // Tutup notifikasi
  event.notification.close();

  const urlToOpen = new URL("/po1/", self.location.origin).href;

  const promiseChain = clients
    .matchAll({
      type: "window",
      includeUncontrolled: true,
    })
    .then((windowClients) => {
      let matchingClient = null;

      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i];
        if (windowClient.url.includes("/po1/")) {
          matchingClient = windowClient;
          break;
        }
      }

      if (matchingClient) {
        // Focus window yang sudah terbuka
        return matchingClient.focus();
      } else {
        // Buka window baru
        return clients.openWindow(urlToOpen);
      }
    })
    .catch((error) => {
      console.error("Error handling notification click:", error);
      // Fallback: selalu buka window baru
      return clients.openWindow(urlToOpen);
    });

  event.waitUntil(promiseChain);
});
