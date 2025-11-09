// src/scripts/utils/sw-register.js
export const registerSW = () => {
  return new Promise((resolve) => {
    if (!("serviceWorker" in navigator)) {
      console.log("🚫 Service Worker not supported");
      resolve(null);
      return;
    }

    console.log("🌐 Registering Service Worker...");

    // ✅ PASTIKAN PATH BENAR - gunakan absolute path
    const swUrl = window.location.pathname.includes("/po1")
      ? "/po1/sw.js"
      : "/sw.js";

    console.log("📁 SW URL:", swUrl);

    // Cek dulu apakah file SW ada
    fetch(swUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`SW file not found (${response.status})`);
        }
        return navigator.serviceWorker.register(swUrl);
      })
      .then((registration) => {
        console.log("✅ Service Worker registered successfully");
        console.log("📌 Scope:", registration.scope);
        resolve(registration);
      })
      .catch((error) => {
        console.error("❌ Service Worker registration failed:", error.message);
        // Unregister SW yang problematic
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            console.log("🗑️ Unregistering old SW:", registration.scope);
            registration.unregister();
          });
        });
        resolve(null);
      });
  });
};
