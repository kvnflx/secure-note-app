# Deploy Status

This file captures what was verified on the development machine and what
requires a real Docker host to finalize.

## Verified locally (Windows + Go 1.26.2 + Node 24)

- `go build ./...` — clean, produces working binary
- `go test ./...` — all backend packages green (api, config, crypto, pow,
  storage) including the integration test that spins up `httptest.NewServer`
  + miniredis
- `go vet ./...` — clean
- `cd web-src && npm run build` — produces `../web/` bundle (~545 kB main
  chunk is libsodium-sumo, acceptable)
- `cd web-src && npm test` — 6/6 unit tests pass (AEAD + KDF crypto
  round-trips)
- `cd web-src && npx playwright test --list` — 6 E2E specs discovered
- `deploy/docker-compose.yml` parses as valid YAML

## Pending Docker availability

The following checks require a Docker host and were NOT run on the dev
machine:

1. **`docker build -f deploy/Dockerfile -t burn:dev .`** — multi-stage build
   (node → golang → distroless). Compile-time check only; if the Dockerfile
   has any path mismatch relative to the repo root it will surface here.
2. **`docker compose up -d`** from `deploy/` — starts the 3-container stack
   (caddy + burn + redis). Confirms container wiring, Unix-socket sharing,
   tmpfs mounts, read-only FS, and non-root constraints actually work.
3. **`curl https://localhost/healthz`** inside the running stack — confirms
   Caddy TLS + reverse-proxy + Go binary + Redis on unix socket all talk.
4. **Browser smoke test** — open `https://<host>` in a browser, create a
   note, reveal on a second tab, verify burn semantics.
5. **Playwright E2E in CI** — the GitHub Actions `ci.yml` workflow does the
   Docker-free variant (go backend directly against redis service container);
   it should pass on the first push to a GitHub remote.
6. **Release workflow** — `.github/workflows/release.yml` fires on `v*` tag
   push and produces multi-arch images (amd64 + arm64) signed with cosign.

## Recommended first-deploy sequence

On a VPS (or any machine with Docker):

```bash
git clone https://github.com/<owner>/burn-note.git
cd burn-note

# Option A: build the image locally and run
docker build -f deploy/Dockerfile -t burn:local .
docker tag burn:local ghcr.io/kvnflx/burn-note:latest
cd deploy && docker compose up -d

# Option B: pull the published image (after the first v* tag is pushed)
cd deploy
# Edit the Caddyfile hostname to your own domain first
docker compose pull
docker compose up -d
```

Verify:

```bash
curl -sf https://your-hostname/healthz && echo OK
```

## Known deviations from the original plan

- `web/` build output and `cmd/burn/web-assets/` are gitignored. Docker build
  and CI each rebuild the frontend. Local `go run ./cmd/burn` serves whatever
  is in `cmd/burn/web-assets/` (empty by default — run `npm run build` then
  copy if you want the UI during local Go-only runs).
- Tor Hidden Service was intentionally left out of v1 (see THREAT-MODEL.md).
  The `HOSTING.md` describes the side-car pattern for adding it without
  changing the app.
- Task 1.9 (Docker-based smoke test) was replaced by
  `internal/api/integration_test.go` which uses httptest + miniredis for an
  in-process end-to-end run. Provides equivalent coverage to the manual
  smoke and runs in CI.

## First tag

After a Docker-host smoke pass, tag:

```bash
git tag -a v0.1.0 -m "v0.1.0 — initial release"
git push origin main --tags
```

The release workflow will build and sign the image automatically.
