import { defineConfig } from "vite";
export default defineConfig(({ mode }) => ({
  // Use GitHub Pages base only for production build; keep "/" in dev
  base: mode === "production" ? "/evilpacgame/" : "/",
}));
