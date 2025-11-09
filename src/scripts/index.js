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

registerSW();

window.addEventListener("hashchange", () => app.renderPage());
window.addEventListener("load", () => {
  app.renderPage();
  console.log("PWA features initialized successfully");
});

let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  console.log("Before install prompt triggered");

  e.preventDefault();
  r;
  deferredPrompt = e;
  console.log("App can be installed");

  const installButton = document.getElementById("install-button");
  if (installButton) {
    installButton.style.display = "block";
    installButton.addEventListener("click", () => {
      deferredPrompt.prompt();

      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install prompt");
        } else {
          console.log("User dismissed the install prompt");
        }
        deferredPrompt = null;
      });
    });
  }
});
