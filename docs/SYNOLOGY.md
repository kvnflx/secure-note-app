# Deploy burn-note on Synology DSM with Portainer + Cloudflared

This guide walks through deploying burn-note on a Synology NAS running
**Container Manager** (or the older Docker package) with **Portainer** as the
management UI, and exposes the app via **Cloudflared Tunnel** at
`note.backsafe.de` — without touching your existing `it-space.cloud` tunnel.

## Prerequisites

- Synology NAS with **Container Manager** package installed (DSM 7.2+)
- Portainer running on the NAS (any version ≥ 2.19)
- Cloudflared tunnel already running for `it-space.cloud` (confirmed by the
  user)
- `backsafe.de` (or whatever zone contains `note.backsafe.de`) — see
  [Cloudflare zone requirement](#cloudflare-zone-requirement) below
- A GitHub account with access to this private repo (to pull the image from
  `ghcr.io/kvnflx/burn-note`)

## Architecture

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                          Cloudflare Edge                         │
 │   note.backsafe.de ─┐                 ┌─ it-space.cloud          │
 │                     │                 │                          │
 └─────────────────────┼─────────────────┼──────────────────────────┘
                       │ Tunnel (same or new)
                       ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │  Synology NAS                                                    │
 │                                                                  │
 │   ┌────────────────────┐                                         │
 │   │  cloudflared       │──────────┐                              │
 │   │  (existing)        │          │  HTTP (no TLS inside LAN)    │
 │   └────────────────────┘          ▼                              │
 │                         ┌─────────────────┐                      │
 │                         │  burn-note      │ :8080                │
 │                         │  (Go binary)    │                      │
 │                         └────────┬────────┘                      │
 │                                  │ unix socket                   │
 │                                  ▼                               │
 │                         ┌─────────────────┐                      │
 │                         │  burn-redis     │ (tmpfs, ephemeral)   │
 │                         └─────────────────┘                      │
 └─────────────────────────────────────────────────────────────────┘
```

No Caddy on the NAS — Cloudflared terminates TLS at the edge, and we keep
the inside plain HTTP. Security headers are added at the Cloudflare Transform
Rules layer (see step 6 below).

## Cloudflare zone requirement

**Important:** for Cloudflared to route `note.backsafe.de`, the zone
`backsafe.de` MUST be managed by Cloudflare (nameservers pointed at
Cloudflare). Cloudflared is per-zone: the tunnel that serves
`it-space.cloud` cannot create a DNS record in `backsafe.de` unless
`backsafe.de` is also in your Cloudflare account.

Three scenarios:

1. **`backsafe.de` already on Cloudflare** → everything below works as
   written.
2. **`backsafe.de` is elsewhere** (e.g., parked at Namecheap/Strato) →
   you need to either:
   - Transfer the zone to Cloudflare (free, takes a few hours) and then
     follow this guide, or
   - Use a subdomain of an existing Cloudflare zone instead (e.g.
     `note.it-space.cloud` or `burn.it-space.cloud`). Technically fine;
     just update the Caddyfile and this guide's hostname accordingly.
3. **You don't want to transfer the zone** → use a free zone, e.g.
   `burn.it-space.cloud`, and add a CNAME at your current DNS provider
   pointing `note.backsafe.de` → `burn.it-space.cloud`. This works but
   exposes the CNAME publicly. Not recommended for a privacy-focused app.

I'll assume scenario 1 going forward.

## Step 1 — Build and publish the image

The repo ships a GitHub Actions release workflow that builds a multi-arch
(amd64 + arm64) Docker image on every `v*` tag push. The initial build is
triggered by pushing `v0.1.0-rc1` (already done during setup).

**Verify the image is on GHCR:**

```bash
# From any machine with gh + docker installed
gh api /user/packages/container/burn-note/versions --jq '.[0:3]' | jq .
docker pull ghcr.io/kvnflx/burn-note:latest
```

If the release workflow is still running or failed, check the Actions tab of
the repo at https://github.com/kvnflx/burn-note/actions. Re-run failed jobs
from there.

**If the package is private (default for a private repo):**

Synology's Portainer needs a registry credential. Two options:

- **Option A (recommended):** make the image public. From the package page
  (`https://github.com/kvnflx?tab=packages`), click the `burn-note` package,
  then Package settings → Change visibility → Public. This does **not** make
  the source code public — only the pre-built image.
- **Option B:** keep private, add a GHCR Personal Access Token to Portainer
  under Registries → Add registry → Custom → `ghcr.io`. Use your GitHub
  username (`kvnflx`) and a PAT with `read:packages` scope.

## Step 2 — Prepare the NAS

1. Via SSH into the NAS (as a user in the `administrators` group):

   ```bash
   sudo synouser --setpw admin <newpassword>   # if you haven't yet
   ssh admin@<nas-ip>
   ```

2. Create the shared network that cloudflared and burn-note will use:

   ```bash
   sudo docker network create cloudflared_net
   ```

   If cloudflared is already attached to a different network (e.g. `bridge`),
   you can either:
   - Leave the compose file's `cloudflared_net` definition as-is and move
     cloudflared onto the new network (cleanest), OR
   - Change the compose file's external network to the one cloudflared
     already uses.

## Step 3 — Deploy the stack via Portainer

1. Open Portainer → **Stacks** → **Add stack**.
2. Name: `burn-note`.
3. Paste the contents of `deploy/docker-compose.synology.yml` from the repo.
4. **Environment variables section:** no changes needed (all defaults are in
   the compose file).
5. Click **Deploy the stack**.

Portainer pulls the image and brings up two containers:
- `burn-note` — the Go app, listening on `8080` inside the `cloudflared_net`
- `burn-redis` — ephemeral Redis, unix-socket connection only, not exposed

Verify:

```bash
sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
# burn-note    Up (healthy)    8080/tcp
# burn-redis   Up              -
```

Smoke test from the NAS itself:

```bash
sudo docker exec burn-note wget -qO- http://localhost:8080/healthz
# → ok
```

## Step 4 — Attach cloudflared to `cloudflared_net`

Find your cloudflared container:

```bash
sudo docker ps --filter 'name=cloudflared' --format '{{.Names}}'
```

Attach it to the shared network (doesn't restart the container):

```bash
sudo docker network connect cloudflared_net <cloudflared-container-name>
```

Verify cloudflared can resolve `burn-note`:

```bash
sudo docker exec <cloudflared-container-name> \
  wget -qO- http://burn-note:8080/healthz
# → ok
```

## Step 5 — Add the public hostname in Cloudflare Zero Trust

The elegant part: **you don't create a second tunnel**. You add a second
public hostname to the **same tunnel** that already serves `it-space.cloud`.

1. Go to https://one.dash.cloudflare.com → **Networks** → **Tunnels**.
2. Click your existing tunnel (the one serving `it-space.cloud`) →
   **Configure** → **Public Hostname** tab.
3. Click **Add a public hostname**.
4. Fill in:
   - **Subdomain:** `note`
   - **Domain:** `backsafe.de` (must appear in the dropdown — that's the
     "zone on Cloudflare" requirement)
   - **Path:** (leave empty)
   - **Service Type:** `HTTP`
   - **URL:** `burn-note:8080`
5. Expand **Additional application settings**:
   - **HTTP Settings** → **HTTP Host Header:** leave empty (don't override)
   - **TLS Settings** → **No TLS verify:** leave off (not used, it's HTTP)
   - **Access** → keep default (no Access policy)
6. Save.

Cloudflare automatically creates the orange-cloud DNS record
`note.backsafe.de` → `<tunnel-uuid>.cfargotunnel.com`.

Your `it-space.cloud` public hostnames are untouched.

## Step 6 — Add Transform Rules for security headers

Because we dropped Caddy, we lose the CSP/HSTS/etc. headers. Add them via
Cloudflare Transform Rules:

1. In the Cloudflare dashboard for `backsafe.de`, go to **Rules** →
   **Transform Rules** → **Modify Response Header** → **Create rule**.
2. **Rule name:** `burn-note security headers`.
3. **When incoming requests match:**
   - Field: `Hostname`
   - Operator: `equals`
   - Value: `note.backsafe.de`
4. **Then modify response headers:** add each of the following (one row per
   header):

   | Header name | Operation | Value |
   |-------------|-----------|-------|
   | `Strict-Transport-Security` | Set | `max-age=31536000; includeSubDomains` |
   | `Content-Security-Policy` | Set | `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; worker-src 'self'` |
   | `X-Content-Type-Options` | Set | `nosniff` |
   | `X-Frame-Options` | Set | `DENY` |
   | `Referrer-Policy` | Set | `no-referrer` |
   | `Permissions-Policy` | Set | `geolocation=(), microphone=(), camera=(), payment=()` |

5. Deploy.

Optional but recommended: under the `backsafe.de` zone → **SSL/TLS** →
**Overview**, set to **Full (strict)** (not just Flexible — Flexible would
allow plaintext from CF to origin, which defeats the tunnel's TLS).
Actually, Cloudflared tunnels use an outbound connection from the NAS to
Cloudflare, so the SSL mode setting is less impactful, but **Full** is still
the right default.

## Step 7 — Verify end-to-end

```bash
curl -sI https://note.backsafe.de/healthz
# HTTP/2 200
# strict-transport-security: max-age=31536000; includeSubDomains
# content-security-policy: default-src 'self'; ...

curl -s https://note.backsafe.de/healthz
# ok
```

Open `https://note.backsafe.de` in a browser. Create a note, copy the
returned `/n/<id>#k=...` URL, open it in a private window, click
"Show note" — should decrypt and display. Reload → "already gone".

Your `it-space.cloud` app should be completely unaffected — browse to any
of its public hostnames to sanity-check.

## Step 8 — Set up auto-update (optional)

The image tag in the compose file is `:latest`, so a `docker compose pull`
followed by `docker compose up -d` fetches the newest build. You can wire
this into:

- **Watchtower** (another container, lightweight, auto-pulls on a schedule)
- **Portainer's built-in stack re-deploy webhook** — each stack gets a
  webhook URL that, when called, re-pulls and redeploys. Combine with a
  GitHub Action on release to call the webhook.

For the first few weeks I recommend manual updates — watch the release notes
on GitHub for any migration steps.

## Step 9 — Health monitoring

Set up an external monitor (UptimeRobot, Kuma, Ohdear, etc.) pointing at
`https://note.backsafe.de/healthz`. Alert on non-200 for more than 5 min.

## Troubleshooting

### cloudflared can't reach `burn-note:8080`

Check the network:

```bash
sudo docker inspect <cloudflared-container> \
  | grep -A2 cloudflared_net
sudo docker inspect burn-note \
  | grep -A2 cloudflared_net
```

Both containers must be attached to the same user-defined bridge network
(Docker's internal DNS only resolves container names on user-defined
networks, not on the default `bridge`).

### 502 Bad Gateway from Cloudflare

Cloudflared is reaching the NAS but the upstream is dropping the request.
Check burn logs in Portainer:

```bash
sudo docker logs burn-note --tail 50
```

Look for "redis: ..." errors — Redis unix socket may be unreachable from
the `burn-note` container. Verify the volume mount:

```bash
sudo docker exec burn-note ls -la /sockets/
# srw-rw---- 1 999 999 0 ... redis.sock
```

### Image pull fails: unauthorized

The image is private. See Step 1 — either make it public or add a GHCR
registry credential in Portainer.

### Redis OOM

Bump `maxmemory` in the compose command section. Default 256 MB handles
~10 000 small notes live at once. If you're hosting for many users, raise
it; if you're self-hosting for yourself, leave it.

### Notes disappear after NAS reboot

Feature, not bug. Redis is on `tmpfs`. See
[docs/THREAT-MODEL.md](THREAT-MODEL.md).

### Let's Encrypt rate limits

Not applicable here — Cloudflare handles TLS termination at the edge. No
Let's Encrypt certs are involved on your NAS.

## What's NOT deployed here

- **No Caddy.** Pros: simpler, fewer moving parts on the NAS. Cons:
  if Cloudflared is ever unreachable for you (tunnel down, CF outage), the
  app is offline — no local HTTPS fallback. If this matters, use the default
  `deploy/docker-compose.yml` and accept the Let's Encrypt dance.
- **No Tor hidden service.** Can be added as a fourth container later;
  see the side-car pattern in `HOSTING.md`.
- **No backups.** Intentional. See [THREAT-MODEL.md](THREAT-MODEL.md).

## Cost summary

- Synology NAS: sunk cost (you already own it)
- Cloudflare Tunnel: free
- Image hosting (GHCR for private images): 500 MB free tier; burn-note image
  is ~30 MB, fits ~15× updates free
- Domain `backsafe.de`: whatever you already pay

So: **€0/month incremental** on top of your existing setup.
