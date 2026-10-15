import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.ts",
  use: {
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    },
    baseURL: `http://127.0.0.1:4173${process.env.DEPLOY_BASE_PATH || "/"}`,
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173",
    url: `http://127.0.0.1:4173${process.env.DEPLOY_BASE_PATH || "/"}`,
    reuseExistingServer: false,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
