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
