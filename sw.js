// sw.js - Service Worker Fix
const CACHE_NAME = "cerita-di-sekitarmu-final-fix";

self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing final fix...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating final fix...");
  event.waitUntil(self.clients.claim());
});

// Push Event
self.addEventListener("push", (event) => {
  const options = {
    body: "Notifikasi dari Cerita di Sekitarmu",
    icon: "favicon.png",
    badge: "favicon.png",
  };

  event.waitUntil(
    self.registration.showNotification("Cerita di Sekitarmu", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
