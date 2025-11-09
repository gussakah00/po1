export const registerSW = () => {
  return new Promise((resolve, reject) => {
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

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log("✅ Service Worker registered successfully!");
        console.log("📌 Scope:", registration.scope);
        resolve(registration);
      })
      .catch((error) => {
        console.error("❌ Service Worker registration failed:", error);

        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
          });
        });

        resolve(null);
      });
  });
};
