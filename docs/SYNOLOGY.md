# Deploy secure-note-app on Synology DSM — **UI only, no SSH**

Everything below is done through **Synology DSM**, **Portainer (web UI)**, and
the **Cloudflare dashboard**. No shell, no terminal, no package manager calls.

Exposes `note.backsafe.de` via your existing Cloudflared tunnel without
touching `it-space.cloud`.

## Prerequisites

- Synology NAS with **Container Manager** package installed (Package Center
  → search "Container Manager" → Install). DSM 7.2+ recommended.
- Portainer CE already running on the NAS as a container (any version ≥ 2.19).
- Existing Cloudflared tunnel already exposing `it-space.cloud` (confirmed).
- `backsafe.de` is a Cloudflare-managed zone (nameservers at Cloudflare). If
  not, see **[Zone requirement](#zone-requirement)** below.

## Architecture

```
 Cloudflare Edge
   note.backsafe.de ───┐                   it-space.cloud (untouched)
                       │
                       ▼ same tunnel, new public hostname
 Synology NAS
   cloudflared ──────► secure-note-app:8080 ─(unix socket)─► burn-redis (tmpfs)
        │               ↑
        └── joins ──────┘  Docker network "cloudflared_net"
```

No Caddy on the NAS — Cloudflare terminates TLS at the edge. Security headers
are added via Cloudflare Transform Rules (step 7 below).

---

## Zone requirement

Cloudflared can only route hostnames whose zone (root domain) is in your
Cloudflare account. Three possibilities:

| Situation | Action |
|---|---|
| `backsafe.de` already on Cloudflare | Follow the guide as written. |
| `backsafe.de` at another DNS provider | **Either:** add `backsafe.de` to Cloudflare (free, ~2 h) and change nameservers → then follow guide. **Or:** use a subdomain under `it-space.cloud` (e.g. `burn.it-space.cloud`) — just substitute the hostname in every step below. |
| You don't want to move `backsafe.de` | Use `burn.it-space.cloud` and, optionally, set a CNAME at your current provider: `note.backsafe.de` → `burn.it-space.cloud`. Works, but the CNAME is publicly resolvable (less privacy). |

I assume `backsafe.de` is on Cloudflare below.

---

## Step 1 — Make the GHCR image pullable

The image is published to GitHub Container Registry at
`ghcr.io/kvnflx/secure-note-app`. By default the package inherits the repo's
privacy (private). Two options.

### Option A — Make the image public (recommended, doesn't affect source code)

1. Browser: https://github.com/kvnflx?tab=packages
2. Click the **secure-note-app** package.
3. Right column → **Package settings** → scroll down → **Danger Zone** →
   **Change visibility** → **Public** → type the package name → **I
   understand, change visibility**.
4. Done. The source code repo stays private.

### Option B — Keep private, add a registry credential in Portainer

1. On GitHub: top-right avatar → **Settings** → **Developer settings** →
   **Personal access tokens** → **Tokens (classic)** → **Generate new token
   (classic)**. Scope: `read:packages`. Copy the token.
2. In Portainer: left nav → **Registries** → **Add registry**.
3. Custom registry:
   - Name: `GHCR`
   - Registry URL: `ghcr.io`
   - Username: `kvnflx`
   - Password: the token you just created
4. Save. You will pick this registry when creating the stack in Step 4.

---

## Step 2 — Wait for the image to finish building

First-time build is triggered by the `v0.1.0-rc1` git tag push. Check at
https://github.com/kvnflx/secure-note-app/actions. When the **Release** workflow
shows a green checkmark, the image tags `0.1.0-rc1` and `latest` are
available.

Typical build time: 5–8 minutes (multi-arch: amd64 + arm64 + cosign).

---

## Step 3 — Create the shared Docker network (in Portainer)

Needed so that Cloudflared and the new secure-note-app container can find each
other by name.

1. Portainer → left nav → **Networks** → **+ Add network**.
2. Fill in:
   - **Name:** `cloudflared_net`
   - **Driver:** `bridge`
   - Leave all other fields at default (no manual IPv4/IPv6 ranges).
3. Click **Create the network**.

You should now see `cloudflared_net` in the networks list.

---

## Step 4 — Deploy the secure-note-app stack

1. Portainer → **Stacks** → **+ Add stack**.
2. **Name:** `secure-note-app`.
3. **Build method:** **Web editor** (the default).
4. Paste the entire contents of the file
   [`deploy/docker-compose.synology.yml`](../deploy/docker-compose.synology.yml)
   from the repo into the editor. (You can also open it at
   https://github.com/kvnflx/secure-note-app/blob/main/deploy/docker-compose.synology.yml →
   click **Raw** → copy-all.)
5. **Environment variables:** leave empty (all needed vars are already in the
   compose file).
6. **Access control:** at your discretion. "Administrators" is fine.
7. Click **Deploy the stack**.

**If Option B (private image):** Portainer will prompt you to pick the GHCR
registry created in Step 1B. Select it, confirm, and the pull proceeds.

Portainer now pulls the image (first time: ~30 MB) and brings up two
containers:
- `secure-note-app` — the Go binary, listening on 8080 inside the shared network
- `burn-redis` — ephemeral Redis on tmpfs, unix-socket only

In the Stacks list, the `secure-note-app` stack should show 2/2 running and green.

### Verify without SSH

1. Portainer → **Containers** → click **burn-redis**.
2. Scroll to **Container status** → click **Logs**. You should see
   `Ready to accept connections` within a second of startup. That means
   Redis is up.
3. Portainer → **Containers** → click **burn-redis** → **Console** →
   keep defaults (`/bin/sh`) → **Connect**. Run:
   ```sh
   wget -qO- http://secure-note-app:8080/healthz
   ```
   Expected output: `ok`. This proves the two containers can see each other
   over `cloudflared_net`.

   (`secure-note-app` itself is a distroless image, no shell, so we test from the
   Redis container instead.)

---

## Step 5 — Attach the existing cloudflared container to `cloudflared_net`

No container restart needed. Portainer handles it live.

1. Portainer → **Containers**.
2. Click the cloudflared container (its name usually contains `cloudflared`;
   if you use cloudflare/cloudflared via Docker, it's typically just that).
3. Scroll to **Connected networks** (sometimes labelled "Network settings").
4. Dropdown → pick **`cloudflared_net`** → click **Join network**.
5. The container now shows **2 networks** (its original one + `cloudflared_net`).

### Verify cloudflared can reach secure-note-app

1. Portainer → **Containers** → cloudflared → **Console** → `/bin/sh` (or
   whatever shell is in the image) → **Connect**. If cloudflared image has
   no shell either, skip this test — the next step (creating the Public
   Hostname in Cloudflare) does a real lookup and will surface the
   connectivity issue if any.
2. If the shell works, run:
   ```sh
   wget -qO- http://secure-note-app:8080/healthz   # or: curl -s http://secure-note-app:8080/healthz
   ```
   Expected: `ok`.

---

## Step 6 — Add the public hostname in Cloudflare Zero Trust

This is the "only one tunnel" part: you add a second public hostname to the
**existing** tunnel. `it-space.cloud` stays untouched.

1. Browser: https://one.dash.cloudflare.com → select your account.
2. Left nav → **Networks** → **Tunnels**.
3. Click the tunnel currently serving `it-space.cloud` → **Configure**.
4. Top tabs → **Public Hostname** → **Add a public hostname**.
5. Fill in:

   | Field | Value |
   |---|---|
   | Subdomain | `note` |
   | Domain | `backsafe.de` *(must appear in the dropdown)* |
   | Path | *(leave empty)* |
   | Service Type | `HTTP` |
   | URL | `secure-note-app:8080` |

6. Expand **Additional application settings** → leave all defaults (no
   Access policy, no overrides).
7. Click **Save hostname**.

Cloudflare automatically creates the orange-cloud DNS record
`note.backsafe.de` → `<tunnel-uuid>.cfargotunnel.com`. Your other hostnames
(`it-space.cloud` etc.) are not touched.

---

## Step 7 — Add security-header Transform Rules

Because there's no Caddy doing CSP/HSTS, we add them at Cloudflare's edge.

1. Cloudflare dashboard → select the **`backsafe.de`** zone (not the account,
   the zone).
2. Left nav → **Rules** → **Transform Rules** → **Modify Response Header**
   tab → **+ Create rule**.
3. **Rule name:** `secure-note-app security headers`.
4. Under **When incoming requests match**:
   - Dropdown → **Custom filter expression** → **Edit expression**.
   - Paste: `(http.host eq "note.backsafe.de")`
   - Or use the UI builder: Field = `Hostname`, Operator = `equals`,
     Value = `note.backsafe.de`.
5. Under **Then**, add each of the following one by one (click **+ Add** for
   each row):

   | Operation | Header name | Value |
   |---|---|---|
   | Set static | `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
   | Set static | `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; worker-src 'self'` |
   | Set static | `X-Content-Type-Options` | `nosniff` |
   | Set static | `X-Frame-Options` | `DENY` |
   | Set static | `Referrer-Policy` | `no-referrer` |
   | Set static | `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=()` |

6. Click **Deploy**.

### SSL/TLS sanity check

1. Cloudflare dashboard → `backsafe.de` zone → **SSL/TLS** → **Overview**.
2. Recommend setting to **Full** (not **Flexible**).
3. (Cloudflared tunnels are outbound from your NAS to Cloudflare and don't
   use this setting directly, but **Full** is the right default zone-wide.)

---

## Step 8 — End-to-end verification

### From a browser

1. Open https://note.backsafe.de in an incognito/private window.
2. You should see the compose view ("🔥 Secure Note", textarea, "Create note").
3. Type a message → **Create note** → wait (~1 sec for PoW) → you get a
   success screen with the URL.
4. Copy the URL → open in a **different** incognito window → click
   **Show note**. The message decrypts and displays.
5. Reload that second window → click **Show note** → should show "already
   gone / bereits verbraucht". ✅ Burn semantics confirmed.

### Verify security headers (also browser)

1. DevTools (F12) → **Network** tab.
2. Reload https://note.backsafe.de.
3. Click the document request → **Headers** tab → **Response Headers**.
4. Confirm you see:
   - `strict-transport-security: max-age=31536000; includeSubDomains`
   - `content-security-policy: default-src 'self'; ...`
   - `x-content-type-options: nosniff`
   - `x-frame-options: DENY`
   - `referrer-policy: no-referrer`

### Verify it-space.cloud still works

Open any of your existing `it-space.cloud` hostnames — everything should be
unchanged.

---

## Step 9 — Auto-update (optional)

The compose file uses `image: ghcr.io/kvnflx/secure-note-app:latest`. To pull new
versions after a future release:

### Manual, via Portainer (recommended for first few updates)

1. Portainer → **Stacks** → **secure-note-app**.
2. Click **Editor** → do NOT change anything → click **Update the stack**.
3. Check **Re-pull image and redeploy** → **Update**.

### Automated, via Watchtower container

1. Portainer → **Stacks** → **+ Add stack** → name `watchtower`.
2. Web editor:
   ```yaml
   services:
     watchtower:
       image: containrrr/watchtower
       restart: always
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock
       environment:
         WATCHTOWER_POLL_INTERVAL: "86400"  # once a day
         WATCHTOWER_LABEL_ENABLE: "true"
         WATCHTOWER_CLEANUP: "true"
   ```
3. Add `labels: { com.centurylinklabs.watchtower.enable: "true" }` to the
   `burn` service in the secure-note-app stack (open its editor, paste, redeploy).

---

## Step 10 — Health monitoring

Set up **UptimeRobot** (or similar) to monitor
`https://note.backsafe.de/healthz` at 5-min intervals. Alert on non-200.

---

## Troubleshooting

### Portainer → Stacks → secure-note-app shows "1/2 running"

Click the failed container → **Logs**. Common causes:
- Wrong image name / image private without credential → pull error in logs
- `cloudflared_net` doesn't exist → Stack deploy fails early; re-do Step 3
- Redis socket not writable → check that both containers list `sockets`
  volume in their mounts

### Cloudflare shows "502 Bad Gateway" at https://note.backsafe.de

The tunnel is up but can't reach `secure-note-app:8080`. Check:

1. Portainer → Containers → `secure-note-app` → **is it running and healthy?**
2. Portainer → Containers → cloudflared → **Connected networks** — does it
   include `cloudflared_net`? If not, re-do Step 5.
3. Portainer → Containers → `burn-redis` → **Console** → `/bin/sh` →
   `wget -qO- http://secure-note-app:8080/healthz` should print `ok`.

### Cloudflare shows "Error 1033 - Argo Tunnel error"

Your cloudflared container is not connected to the tunnel anymore. In
Portainer check its **Logs**: you should see `Connection registered` /
`Registered tunnel connection`. If not, restart the container via Portainer:
container → **Restart**. As a last resort, run `cloudflared tunnel run` with
the same token from the UI-driven tunnel settings.

### "unauthorized: authentication required" when pulling the image

You chose Option B (private image) but either the PAT is wrong, expired, or
lacks `read:packages`. Regenerate PAT → update registry credential in
Portainer → redeploy stack.

### Notes disappear after NAS reboot or container restart

Feature, not bug. Redis is on tmpfs. See
[THREAT-MODEL.md](THREAT-MODEL.md).

### Redis OOM

Bump `maxmemory` in the compose command section. Default 256 MB handles
~10 000 small notes concurrently. Redeploy the stack.

### PoW too slow on weak clients (low-end mobile)

Lower `BURN_POW_DIFFICULTY` in the `burn` service env (e.g., `18`), redeploy.
Trade-off: spam resistance weakens. Minimum recommended: 16.

---

## What you deliberately don't have on the NAS

- No Caddy, no Let's Encrypt — Cloudflare terminates TLS.
- No Tor hidden service — can be added as a fourth container later.
- No database backups — intentional; see [THREAT-MODEL.md](THREAT-MODEL.md).
- No persistent storage at all — `/data` in Redis is tmpfs.

## Cost

- Synology NAS: sunk.
- Cloudflare Tunnel + DNS: free.
- GHCR private package storage: 500 MB free tier; ~30 MB image ≈ 16 revs.
- Domain: whatever you already pay.

**Incremental monthly cost: €0.**
