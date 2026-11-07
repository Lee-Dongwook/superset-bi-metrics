import App from "./App";
import "./index.css";
import { createRoot } from "react-dom/client";

const container = document.createElement("div");
container.id = "app";
document.body.appendChild(container);

createRoot(container).render(<App />);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}
