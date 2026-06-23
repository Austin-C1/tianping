import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "npm run start:dev --workspace @pmx/api",
      url: "http://127.0.0.1:4000/health",
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: "npm run dev --workspace @pmx/web",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: "npm run dev --workspace @pmx/admin",
      url: "http://127.0.0.1:3001",
      reuseExistingServer: true,
      timeout: 120_000
    }
  ],
  projects: [
    {
      name: "edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" }
    }
  ]
});
