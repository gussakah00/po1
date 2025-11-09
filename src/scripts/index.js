import App from "./pages/app.js";
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

// Ignore Tracking Prevention warnings di development
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  const originalWarn = console.warn;
  console.warn = function (...args) {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Tracking Prevention") ||
        args[0].includes("Images loaded lazily"))
    ) {
      return; // Skip these warnings
    }
    originalWarn.apply(console, args);
  };
}

console.log("🚀 Memulai Cerita di Sekitarmu...");

const app = new App({
  drawerButton: document.querySelector("#drawer-button"),
  navigationDrawer: document.querySelector("#navigation-drawer"),
  content: document.querySelector("#main-content"),
});

let appInitialized = false;

// Handle routing
window.addEventListener("hashchange", () => app.renderPage());
window.addEventListener("load", async () => {
  if (appInitialized) return;
  appInitialized = true;

  await app.renderPage();
  console.log("✅ Aplikasi berhasil dimulai");

  // Initialize PWA features
  await initializePWA();
});

// ✅ PWA Initialization
async function initializePWA() {
  try {
    console.log("📱 Initializing PWA features...");

    // Initialize Service Worker
    await initializeServiceWorker();

    // Initialize Push Notifications
    await initializePushNotifications();

    // Setup Install Prompt
    setupInstallPrompt();

    console.log("✅ PWA features initialized successfully");
  } catch (error) {
    console.error("❌ PWA initialization failed:", error);
  }
}

// ✅ Service Worker Registration
async function initializeServiceWorker() {
  // NONAKTIFKAN di development - PASTI
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    console.log("💻 Development: Service Worker dinonaktifkan");

    // Unregister existing service workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        console.log("🗑️ Unregistered existing Service Worker");
      }
    }
    return;
  }

  // HANYA di production
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        "/po1/sw.js",
        {
          scope: "/po1/",
        }
      );

      console.log("✅ Service Worker registered:", registration);

      // Check for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        console.log("🔄 New Service Worker found:", newWorker.state);

        newWorker.addEventListener("statechange", () => {
          console.log("🔄 Service Worker state:", newWorker.state);
        });
      });
    } catch (error) {
      console.log("ℹ️ Service Worker registration failed:", error);
    }
  }
}

// ✅ Push Notifications
async function initializePushNotifications() {
  try {
    const pushSupported = await pushManager.init();
    if (pushSupported) {
      await navigation.init();
      console.log("✅ Push notifications initialized");
    }
  } catch (error) {
    console.error("❌ Push notifications failed:", error);
  }
}

// ✅ Install Prompt - Fixed untuk production
function setupInstallPrompt() {
  let deferredPrompt = null;
  let installButton = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    console.log("📱 Install prompt available");

    // Only prevent default di development
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      e.preventDefault();
    }

    deferredPrompt = e;

    // Show install button setelah delay
    setTimeout(showInstallButton, 2000);
  });

  function showInstallButton() {
    // Jangan show di development
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      console.log("💻 Development: Skipping install button");
      return;
    }

    if (installButton || !deferredPrompt) return;

    installButton = document.createElement("button");
    installButton.textContent = "📱 Install App";
    installButton.className = "install-button";
    installButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 25px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      font-size: 14px;
      font-weight: bold;
      transition: all 0.3s ease;
    `;

    installButton.addEventListener("click", async () => {
      if (!deferredPrompt) return;

      installButton.disabled = true;
      installButton.textContent = "Menginstall...";

      // Show the install prompt
      deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);

      deferredPrompt = null;
      installButton.style.display = "none";
    });

    installButton.addEventListener("mouseenter", () => {
      installButton.style.transform = "translateY(-2px)";
      installButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.4)";
    });

    installButton.addEventListener("mouseleave", () => {
      installButton.style.transform = "translateY(0)";
      installButton.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    });

    document.body.appendChild(installButton);
  }

  window.addEventListener("appinstalled", () => {
    console.log("✅ PWA installed successfully");
    deferredPrompt = null;
    if (installButton) {
      installButton.style.display = "none";
    }
  });
}

window.app = app;
