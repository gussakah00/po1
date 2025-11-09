import App from "./pages/app.js";
import "../styles/styles.css";
import "leaflet/dist/leaflet.css";
import { registerSW } from "./utils/sw-register.js";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/po1/leaflet-images/marker-icon-2x.png",
  iconUrl: "/po1/leaflet-images/marker-icon.png",
  shadowUrl: "/po1/leaflet-images/marker-shadow.png",
});

console.log("🚀 Initializing Cerita di Sekitarmu...");

const app = new App({
  drawerButton: document.querySelector("#drawer-button"),
  navigationDrawer: document.querySelector("#navigation-drawer"),
  content: document.querySelector("#main-content"),
});

window.addEventListener("hashchange", () => app.renderPage());
window.addEventListener("load", async () => {
  await app.renderPage();
  console.log("✅ App rendered successfully");

  if (!window.location.hostname.includes("localhost")) {
    try {
      console.log("🌐 Production: Registering Service Worker...");
      await registerSW();
    } catch (error) {
      console.log("⚠️ Service Worker registration skipped");
    }
  }
});

let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  console.log("📱 Install prompt available");
  e.preventDefault();
  deferredPrompt = e;
});
