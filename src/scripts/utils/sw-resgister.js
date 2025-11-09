export const registerSW = () => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
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

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("SW controller changed");
        window.location.reload();
      });
    });
  }
};
