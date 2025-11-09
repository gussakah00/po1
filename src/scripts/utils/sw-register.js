export const registerSW = () => {
  return new Promise((resolve) => {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.port === "3000"
    ) {
      console.log("🚫 Service Worker DISABLED in development");
      resolve(null);
      return;
    }

    if (!navigator.serviceWorker) {
      console.log("🚫 Service Worker not supported");
      resolve(null);
      return;
    }

    console.log("🌐 Registering Service Worker...");

    const swUrl = "/po1/sw.js";

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log("✅ Service Worker registered successfully");
        resolve(registration);
      })
      .catch((error) => {
        console.log("❌ Service Worker registration failed:", error);
        resolve(null);
      });
  });
};
