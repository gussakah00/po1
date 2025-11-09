import App from "./pages/app.js";
import "../styles/styles.css";
import "leaflet/dist/leaflet.css";

// CONDITIONAL IMPORT: Only import SW utils in production
let registerSW;
if (
  !window.location.hostname.includes("localhost") &&
  !window.location.hostname.includes("127.0.0.1")
) {
  import("./utils/sw-register.js")
    .then((module) => {
      registerSW = module.registerSW;
    })
    .catch(() => {
      console.log("SW utilities not available");
    });
}

console.log("Initializing app...");

const app = new App({
  drawerButton: document.querySelector("#drawer-button"),
  navigationDrawer: document.querySelector("#navigation-drawer"),
  content: document.querySelector("#main-content"),
});

// Initialize App
window.addEventListener("hashchange", () => app.renderPage());
window.addEventListener("load", async () => {
  await app.renderPage();

  // 🚫 ONLY register SW in PRODUCTION
  const isDevelopment =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.port === "3000";

  if (!isDevelopment && typeof registerSW === "function") {
    console.log("🌐 Production - Registering Service Worker");
    await registerSW();
  } else {
    console.log("💻 Development - Service Worker disabled");
  }

  console.log("✅ App initialized successfully");
});

// Install prompt (bisa tetap aktif)
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log("📱 App can be installed");
});
