import App from "./pages/app.js";
import "../styles/styles.css";
import "leaflet/dist/leaflet.css";
import { registerSW } from "./utils/sw-register.js";

console.log("Initializing PWA features...");

const app = new App({
  drawerButton: document.querySelector("#drawer-button"),
  navigationDrawer: document.querySelector("#navigation-drawer"),
  content: document.querySelector("#main-content"),
});

// Initialize App
window.addEventListener("hashchange", () => app.renderPage());
window.addEventListener("load", async () => {
  await app.renderPage();
  console.log("✅ App rendered successfully");

  // Initialize Service Worker dengan error handling
  try {
    await registerSW();
    console.log("✅ PWA features initialized successfully");
  } catch (error) {
    console.log("⚠️ PWA features partially initialized (SW failed)");
  }
});

// Install Prompt Handler
let deferredPrompt;
const installButton = document.getElementById("install-button");

window.addEventListener("beforeinstallprompt", (e) => {
  console.log("📱 Before install prompt triggered");
  e.preventDefault();
  deferredPrompt = e;
  console.log("📦 App can be installed");

  // Show install button
  if (installButton) {
    installButton.style.display = "block";
    installButton.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`👤 User ${outcome} the install`);
        deferredPrompt = null;
        installButton.style.display = "none";
      }
    });
  }
});
