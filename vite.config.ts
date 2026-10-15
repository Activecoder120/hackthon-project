import { defineConfig } from "vite";
export default defineConfig({
  base: process.env.DEPLOY_BASE_PATH || "/",
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
});
