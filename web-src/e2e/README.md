# E2E tests

Playwright specs for burn-note. These assume a running Go backend on `:8080` (vite config proxies `/api` and `/n` to it).

## Run locally

```bash
# Terminal 1: start Redis (miniredis via go test helper or real Redis on :6379)
# Terminal 2: start Go backend
export PATH="/c/Program Files/Go/bin:$PATH"
BURN_REDIS_SOCKET=localhost:6379 BURN_REDIS_NETWORK=tcp BURN_POW_DIFFICULTY=4 go run ./cmd/burn

# Terminal 3: run Playwright
cd web-src
npm run e2e
```

CI integration (Task 5.4) will wire this up automatically with a Redis service container.
