import { defineConfig, devices } from "@playwright/test";

const STAGING_URL = process.env.E2E_BASE_URL ?? "http://124.221.48.52:3004";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  projects: [
    {
      name: "ui",
      testMatch: "site-operations.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: STAGING_URL,
      },
    },
    {
      name: "chat-e2e",
      testMatch: /chat.*\.spec\.ts/,
      timeout: 90_000,
      retries: 1,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: STAGING_URL,
      },
    },
    {
      name: "real-lak",
      testMatch: "real-lak-e2e.spec.ts",
      timeout: 120_000,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: STAGING_URL,
      },
    },
    {
      name: "auth-e2e",
      testMatch: "auth-e2e.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: STAGING_URL,
      },
    },
    {
      name: "modules-e2e",
      testMatch: "modules-e2e.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: STAGING_URL,
      },
    },
  ],
});
