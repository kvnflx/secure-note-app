import { defineConfig } from '@playwright/test';

// Two modes:
// - Dev (default): baseURL = http://localhost:5173 (Vite dev with proxy to :8080)
//                  Playwright starts `npm run dev`.
// - CI / embedded-static: set BASE_URL=http://localhost:8080 and Playwright
//   hits the Go binary directly (which serves the built frontend + /n/<id>
//   shell + /api/*). No Vite needed.
const baseURL = process.env.BASE_URL || 'http://localhost:5173';
const useVite = baseURL.includes(':5173');

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: 'only-on-failure'
  },
  webServer: useVite
    ? {
        command: 'npm run dev',
        port: 5173,
        reuseExistingServer: true,
        timeout: 30_000
      }
    : undefined
});
