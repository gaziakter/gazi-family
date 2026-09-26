import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3101",
    headless: true,
    trace: "retain-on-failure",
  },
  reporter: "list",
  webServer: {
    command: "node node_modules/next/dist/bin/next start -p 3101",
    url: "http://localhost:3101",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
