import App from "./App";
import "./index.css";
import { createRoot } from "react-dom/client";
import { BiMetricsClient, type Protocol } from "@bi-metrics/core";
import { applicationRoot } from "./utils/bootstrap";

const protocol = window.location.protocol;
BiMetricsClient.configure({
  protocol: protocol === "http:" || protocol === "https:" ? (protocol as Protocol) : undefined,
  host: window.location.host,
  csrfToken: document.querySelector<HTMLInputElement>("#csrf_token")?.value,
  appRoot: applicationRoot(),
})
  .init()
  .catch(() => {
    // not logged in yet; the 401 handler redirects to /login on first request
  });

const container = document.createElement("div");
container.id = "app";
document.body.appendChild(container);

createRoot(container).render(<App />);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}
