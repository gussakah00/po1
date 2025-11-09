import App from "./pages/app.js";
import "../styles/styles.css";
import "leaflet/dist/leaflet.css";
import { pushManager } from "./utils/push-manager.js";
import { navigation } from "./components/navigation.js";

// Fix Leaflet icons
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/po1/leaflet-images/marker-icon-2x.png",
  iconUrl: "/po1/leaflet-images/marker-icon.png",
  shadowUrl: "/po1/leaflet-images/marker-shadow.png",
});

console.log("🚀 Memulai Cerita di Sekitarmu...");

const app = new App({
  drawerButton: document.querySelector("#drawer-button"),
  navigationDrawer: document.querySelector("#navigation-drawer"),
  content: document.querySelector("#main-content"),
});

// ✅ FIX: Flag untuk prevent double initialization
let appInitialized = false;

// Handle routing
window.addEventListener("hashchange", () => app.renderPage());
window.addEventListener("load", async () => {
  // ✅ FIX: Prevent double initialization
  if (appInitialized) {
    console.log("⚠️ App already initialized, skipping...");
    return;
  }
  appInitialized = true;

  await app.renderPage();
  console.log("✅ Aplikasi berhasil dimulai");

  // Initialize push notifications
  await initializePushNotifications();

  // Service Worker hanya di production
  initializeServiceWorker();
});

// Push Notifications Initialization - FIXED
async function initializePushNotifications() {
  try {
    console.log("📱 Initializing push notifications...");

    // Initialize push manager
    const pushSupported = await pushManager.init();

    if (pushSupported) {
      // Initialize navigation dengan push manager
      await navigation.init(pushManager);
      console.log("✅ Push notifications initialized successfully");
    } else {
      console.log("📱 Push notifications not supported");
    }
  } catch (error) {
    console.error("❌ Push notifications initialization failed:", error);
  }
}

// Service Worker initialization - FIXED
function initializeServiceWorker() {
  // 🚫 NONAKTIFKAN di development
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    console.log("💻 Development: Service Worker dinonaktifkan");
    return;
  }

  if ("serviceWorker" in navigator) {
    const swUrl = "/po1/sw.js";

    console.log("🌐 Registering Service Worker...");

    fetch(swUrl)
      .then((response) => {
        if (response.ok) {
          return navigator.serviceWorker.register(swUrl);
        } else {
          throw new Error("SW file not found");
        }
      })
      .then((registration) => {
        console.log("✅ Service Worker terdaftar:", registration.scope);
      })
      .catch((error) => {
        console.log(
          "ℹ️ Service Worker tidak tersedia, aplikasi tetap berjalan"
        );
      });
  }
}

// PWA Install prompt
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  console.log("📱 Install prompt tersedia");
  e.preventDefault();
  deferredPrompt = e;
});
