export const registerSW = () => {
  if ("serviceWorker" in navigator) {
    console.log("Initializing Service Worker...");

    const swUrl = "/po1/sw.js";

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log("SW registered successfully: ", registration);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("SW update found!", newWorker);
        });
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  } else {
    console.log("Service Worker not supported");
  }
};
