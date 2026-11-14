import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3001",
    viewport: { width: 1440, height: 1000 },
    headless: true,
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ??
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: [
        "--no-sandbox",
        "--enable-unsafe-swiftshader",
        "--disable-dev-shm-usage",
      ],
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3001/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
