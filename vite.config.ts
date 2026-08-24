import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base = "/padel/" zodat de app op https://<gebruiker>.github.io/padel/ werkt.
export default defineConfig({
  base: "/padel/",
  plugins: [react()],
  build: { outDir: "dist" },
});
