import { createRoot } from "react-dom/client";

const container = document.createElement("div");
container.id = "app";
document.body.appendChild(container);

createRoot(container).render(<h1>BI Metrics</h1>);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}
