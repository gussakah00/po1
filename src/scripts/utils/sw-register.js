export const registerSW = () => {
  return new Promise((resolve) => {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      console.log("💻 Development: Service Worker disabled");
      resolve(null);
      return;
    }

    if (!("serviceWorker" in navigator)) {
      console.log("🚫 Service Worker not supported");
      resolve(null);
      return;
    }

    console.log("🌐 Registering Service Worker...");

    const swUrl = "/po1/sw.js";

    console.log("📁 SW URL:", swUrl);

    fetch(swUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`SW file not found (${response.status})`);
        }
        return navigator.serviceWorker.register(swUrl);
      })
      .then((registration) => {
        console.log("✅ Service Worker registered successfully!");
        console.log("📌 Scope:", registration.scope);
        resolve(registration);
      })
      .catch((error) => {
        console.error("❌ Service Worker registration failed:", error.message);

        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            console.log("🗑️ Unregistering old SW");
            registration.unregister();
          });
        });

        resolve(null);
      });
  });
};
