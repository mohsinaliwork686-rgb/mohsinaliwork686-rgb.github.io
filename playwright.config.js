import { defineConfig } from "@playwright/test"

// The three sizes the design brief asks to be verified at.
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4173",
    // The installed Chrome, locally and on GitHub's runners, so no browser download is needed.
    channel: "chrome",
  },
  webServer: {
    command: "python3 -m http.server 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "ignore",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    { name: "phone", use: { viewport: { width: 390, height: 844 } } },
  ],
})
