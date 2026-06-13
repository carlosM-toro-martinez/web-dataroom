import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/app/App";
import favicon from "@/assets/favicon.png";
import { registerServiceWorker } from "@/shared/lib/registerServiceWorker";
import "@/styles/globals.css";
import "@/styles/screens.css";
import "@/styles/theme.css";
import "leaflet/dist/leaflet.css";

setAppFavicon(favicon);
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

function setAppFavicon(href: string) {
  let faviconLink = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!faviconLink) {
    faviconLink = document.createElement("link");
    faviconLink.rel = "icon";
    document.head.appendChild(faviconLink);
  }
  faviconLink.type = "image/png";
  faviconLink.href = href;
}
