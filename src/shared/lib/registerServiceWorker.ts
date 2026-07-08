export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;

  window.addEventListener("load", () => {
    let refreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      const checkForUpdates = () => {
        void registration.update();
      };

      registration.addEventListener("updatefound", () => {
        const nextWorker = registration.installing;
        if (!nextWorker) return;

        nextWorker.addEventListener("statechange", () => {
          if (nextWorker.state === "installed" && navigator.serviceWorker.controller) {
            nextWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      window.addEventListener("online", checkForUpdates);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) checkForUpdates();
      });

      window.setInterval(checkForUpdates, 60 * 60_000);
      checkForUpdates();
    });
  });
}
