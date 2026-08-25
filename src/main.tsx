import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GroupProvider } from "./store/GroupProvider";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GroupProvider>
      <App />
    </GroupProvider>
  </StrictMode>,
);

// Service worker registreren → app installeerbaar ('Zet op beginscherm') + offline-shell.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch(() => {});
  });
}
