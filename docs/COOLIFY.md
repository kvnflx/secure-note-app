# Deploy burn-note on Coolify (Hetzner)

Coolify is a self-hosted PaaS. It provides the traefik reverse-proxy, TLS
termination via Let's Encrypt, and a clean UI for deploying Docker Compose
stacks. This guide assumes Coolify v4.x.

End result: **https://note.backsafe.de** served from your Hetzner box, no
Caddy/Synology/Cloudflared involved.

## Prerequisites

- Hetzner server (any tier — a CX22 at €4/month is plenty) with Coolify
  v4.x already installed and reachable
- DNS for `backsafe.de` where you can add an `A` record
- The burn-note image is built and available at
  `ghcr.io/kvnflx/burn-note:latest` (public — visibility set in
  [Step 1 of SYNOLOGY.md](SYNOLOGY.md#step-1--make-the-ghcr-image-pullable),
  or make it public once from
  https://github.com/kvnflx?tab=packages → burn-note → Package settings →
  Change visibility → Public)

If the image is still private, Coolify can pull it with a registry
credential (Coolify → Sources → Add → OCI / Docker Registry → `ghcr.io` +
GitHub PAT with `read:packages`).

## Architecture on the Hetzner box

```
 Internet
   ↓  :80 / :443
 ┌─────────────────────────────────────┐
 │  Coolify's traefik                  │
 │  (auto Let's Encrypt, HTTP→HTTPS)   │
 └─────────┬───────────────────────────┘
           │  HTTP to container :8080
           ▼
 ┌─────────────────────────────────────┐
 │  burn (Go binary + embedded web)    │
 └─────────┬───────────────────────────┘
           │  unix socket
           ▼
 ┌─────────────────────────────────────┐
 │  redis (tmpfs, no persistence)      │
 └─────────────────────────────────────┘
```

One server, three containers, ~50 MB RAM total. TLS is terminated once at
traefik; internal traffic is plaintext HTTP on the Coolify internal
network.

## Step 1 — DNS

Add an `A` record:

| Name  | Type | Value              | Proxy (Cloudflare only) |
|-------|------|--------------------|-------------------------|
| `note.backsafe.de` | `A` | *(your Hetzner IP)* | **DNS only (grey cloud)** |

**Why grey cloud and not orange?** Coolify will issue the Let's Encrypt
certificate directly on your box via HTTP-01 challenge on port 80. If the
Cloudflare orange cloud is enabled, Let's Encrypt sees Cloudflare, not your
box, and the challenge fails. Workarounds exist (DNS-01 with API token) but
for a simple setup, grey cloud is one click.

You can flip to orange cloud **after** the certificate is successfully
issued once.

### Verify DNS

From any machine:

```bash
dig +short A note.backsafe.de
```

Should print your Hetzner IP. Wait a few minutes if it doesn't — DNS
propagation takes 1–5 minutes for Cloudflare zones.

## Step 2 — Open Coolify

Browser → your Coolify URL (e.g. `https://coolify.yourdomain.de`) → log in.

## Step 3 — Create the burn-note service

1. Left nav → **Projects** → pick a project (or create one called `burn`).
2. Inside the project: **+ Add New Resource** → **Docker Compose Empty**.
3. **Name:** `burn-note`
4. **Server:** your Hetzner server (should already be registered in Coolify)
5. **Destination / Network:** pick the default Coolify proxy network.
6. Paste the contents of
   [`deploy/docker-compose.coolify.yml`](../deploy/docker-compose.coolify.yml)
   into the compose editor.

Coolify parses the YAML and lists the two services (`burn` and `redis`) in
its UI.

## Step 4 — Set the domain on the burn service

1. In the resource, open the **burn** service tab (Coolify auto-discovers
   services from the compose).
2. Scroll to **Domains** / **URL** → set it to: `https://note.backsafe.de`
3. Coolify auto-generates the required traefik labels when the resource
   deploys. No manual label editing needed.

If Coolify asks for the internal port, set `8080`.

## Step 5 — Check environment variables

The compose file already pins defaults. If you want to tune anything at
runtime (higher PoW difficulty, larger ciphertext cap):

1. Go to **Environment Variables** tab on the burn service.
2. Add/override keys, e.g. `BURN_POW_DIFFICULTY = 22` if under attack.

No secrets to set. All security-sensitive material is generated client-side.

## Step 6 — Deploy

Click **Deploy**. Coolify:
1. Pulls `ghcr.io/kvnflx/burn-note:latest` and `redis:7-alpine`
2. Brings up both containers on the internal proxy network
3. Tells traefik about the `note.backsafe.de` route
4. Traefik requests a Let's Encrypt certificate via HTTP-01 challenge
5. After ~15–30 seconds, the service is live at https://note.backsafe.de

The deployment log shows every step. Expect to see:

```
[+] Pulling ...
[+] Creating burn-note-burn-1
[+] Creating burn-note-redis-1
✅ Successfully deployed burn-note
```

## Step 7 — Verify

```bash
curl -I https://note.backsafe.de/healthz
# HTTP/2 200
# strict-transport-security: max-age=...   (set by Go or absent — see Step 8)
```

Browser: open https://note.backsafe.de → compose view → write a note →
**Create note** → copy URL → open in private window → **Show note** → see
content → reload → "already gone". ✅

## Step 8 — Add security headers (one-time, optional but recommended)

Because there's no Caddy, we don't get the CSP/HSTS headers from the
reference deploy. Two options:

### Option A: Coolify's traefik middleware

In Coolify v4, edit the resource → **Domains & Middlewares** tab → **Add
Middleware** → pick **Headers** → paste:

```yaml
customResponseHeaders:
  Strict-Transport-Security: "max-age=31536000; includeSubDomains"
  Content-Security-Policy: "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; worker-src 'self'"
  X-Content-Type-Options: "nosniff"
  X-Frame-Options: "DENY"
  Referrer-Policy: "no-referrer"
  Permissions-Policy: "geolocation=(), microphone=(), camera=(), payment=()"
```

Save → Redeploy.

### Option B: Cloudflare Transform Rules

If you want to enable Cloudflare's orange cloud later, add the headers via
Cloudflare → Rules → Transform Rules → Modify Response Header as described
in [SYNOLOGY.md Step 7](SYNOLOGY.md#step-7--add-security-header-transform-rules).

## Step 9 — Auto-update (optional)

Coolify has a **Watchtower**-equivalent built in. On the resource:

1. **Settings** tab → **General** → toggle **Watch for image updates** on.
2. Set polling interval (default: 5 min).

Coolify will re-pull `:latest` and redeploy whenever a new image digest
arrives. Paired with a GitHub Actions release workflow that publishes on
tag push, you get fully-automated "merge → deploy" without manual
intervention.

Alternative: Coolify offers a deploy webhook per resource. Hook it into a
GitHub Actions step that fires on release → Coolify redeploys.

## Step 10 — Monitoring

Coolify has built-in health checks. Add one on the burn service:

1. **Health Check** tab → path `/healthz` → interval 30 s.

For external monitoring, UptimeRobot / Better Uptime / Hyperping pinging
`https://note.backsafe.de/healthz` every 5 min is sufficient.

## Troubleshooting

### Let's Encrypt certificate doesn't issue

- DNS propagation: is `dig +short A note.backsafe.de` returning your IP yet?
- Port 80 open on Hetzner firewall? Coolify's traefik needs it for
  HTTP-01 challenge.
- Cloudflare orange cloud enabled? Flip to grey (see Step 1).
- Rate-limited? Let's Encrypt allows 5 failed validations per domain per
  hour. Wait.

### 502 Bad Gateway

The burn container isn't reachable from traefik. In Coolify logs of the
resource:
- Is the container `Up`?
- Does `burn` container log show `listening on :8080`?
- Does Coolify know the internal port (8080)? Check the domain settings
  again — sometimes the port field defaults to 80 and needs to be set.

### Image pull fails: unauthorized

Package is private. Either:
- Make it public (see Prerequisites), or
- Add a registry credential in Coolify: **Sources** → **Add** → **Docker
  Registry**, and in the service's advanced settings point to that source.

### Notes survive reboot

Shouldn't. Redis runs on tmpfs. If you see notes persist across
`docker compose down && up`, verify the Redis config (`tmpfs: - /data` in
the compose).

### Coolify can't reach the service internally

Coolify attaches each resource to its internal proxy network. If the
compose has its own custom networks defined (it doesn't here), you need to
either keep them in sync or delete them from the compose.

## Migration from another host

If you already deployed the Synology version and want to move to Hetzner:

- **No data migration needed.** Notes are ephemeral by design — the tmpfs
  Redis wipes on reboot / container recreation. Just flip DNS to the
  Hetzner IP.
- **Clients with in-flight links** (`https://note.backsafe.de/n/<id>...`)
  will see "already gone" on the new host (fresh Redis). Acceptable, since
  the expected lifetime of any link is short anyway.

## Cost

- Hetzner CX22 (4 €/month) — shared across all your projects if Coolify is
  already running
- Cloudflare DNS: free
- GHCR image hosting: free (public image)
- Let's Encrypt: free

**Incremental: €0 if Coolify is already running. Else €4/month for the VPS.**

## Differences vs. the Synology+Cloudflared path

| Aspect | Coolify | Synology + Cloudflared |
|---|---|---|
| Reverse proxy | traefik (bundled) | none (cloudflared does TLS) |
| TLS | Let's Encrypt, auto | Cloudflare edge |
| DNS | A record at CF (grey) | CNAME via CF tunnel (orange) |
| Public IP exposure | yes | no (tunnel is outbound) |
| DDoS protection | whatever CF offers at DNS-only + Hetzner's basic | full Cloudflare proxy with WAF |
| Ease of setup | **★★★** UI-driven | ★★ 3 systems, more moving parts |
| Update story | Watch for image updates toggle | Manual or Watchtower |

Pick Coolify if you want a classic PaaS experience. Pick Synology+tunnel if
you already have a NAS running 24/7 and want to avoid paying for a VPS.
