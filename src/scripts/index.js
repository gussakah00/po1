import App from "./pages/app.js";
import "../styles/styles.css";
import "leaflet/dist/leaflet.css";

// Fix Leaflet icons untuk hindari error
import L from "leaflet";

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/po1/leaflet-images/marker-icon-2x.png",
  iconUrl: "/po1/leaflet-images/marker-icon.png",
  shadowUrl: "/po1/leaflet-images/marker-shadow.png",
});

console.log("🚀 Memulai Cerita di Sekitarmu...");

// Initialize app
const app = new App({
  drawerButton: document.querySelector("#drawer-button"),
  navigationDrawer: document.querySelector("#navigation-drawer"),
  content: document.querySelector("#main-content"),
});

// Handle routing
window.addEventListener("hashchange", () => app.renderPage());
window.addEventListener("load", () => {
  app.renderPage();
  console.log("✅ Aplikasi berhasil dimulai");

  // Service Worker hanya di production
  initializeServiceWorker();
});

// Service Worker initialization
function initializeServiceWorker() {
  // 🚫 NONAKTIFKAN di development untuk hindari error
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    console.log("💻 Development: Service Worker dinonaktifkan");
    return;
  }

  // ✅ AKTIFKAN di production
  if ("serviceWorker" in navigator) {
    const swUrl = "/po1/sw.js";

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log("✅ Service Worker terdaftar:", registration.scope);
      })
      .catch((error) => {
        console.log("❌ Service Worker gagal, tetapi aplikasi tetap berjalan");
      });
  }
}

// PWA Install prompt
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  console.log("📱 Install prompt tersedia");
  e.preventDefault();
  deferredPrompt = e;

  // Tampilkan install button jika ada
  const installButton = document.getElementById("install-button");
  if (installButton) {
    installButton.style.display = "block";
    installButton.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User ${outcome} install`);
        deferredPrompt = null;
        installButton.style.display = "none";
      }
    });
  }
});
