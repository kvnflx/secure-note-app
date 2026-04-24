# Hosting guide

This guide walks through running your own burn-note instance on a small VPS.

## Requirements

- Any small Linux VPS (tested on Hetzner CX22 @ 4 €/month)
- Debian 12 or Ubuntu 22.04+
- Docker Engine 24+ and Docker Compose v2
- A domain name with an `A` record pointing at the VPS
- Ports 80 and 443 open in your firewall

## Step-by-step

### 1. DNS

Add an `A` record for your subdomain (e.g. `note.example.com`) pointing to
your VPS IP.

### 2. Clone the repo on the VPS

```bash
git clone https://github.com/kvnflx/burn-note.git
cd burn-note/deploy
```

### 3. Edit the Caddyfile

Open `Caddyfile` and replace `note.backsafe.de` with your hostname:

```
your-hostname.example.com {
    encode zstd gzip
    ...
}
```

### 4. (Optional) tune the compose file

Open `docker-compose.yml`. Useful knobs:

| Variable                  | Default | Purpose                                 |
|---------------------------|---------|-----------------------------------------|
| `BURN_POW_DIFFICULTY`     | `20`    | Raise to 22+ if under sustained attack  |
| `BURN_MAX_CIPHERTEXT_KB`  | `100`   | Cap per-note ciphertext size            |

Redis memory limit is set in `redis.conf` (`maxmemory 256mb`).

### 5. Start the stack

```bash
docker compose up -d
```

Caddy will automatically acquire a Let's Encrypt certificate.
Visit `https://your-hostname.example.com` — you should see the compose view.

### 6. Verify health

```bash
curl -I https://your-hostname.example.com/healthz
```

Should return `200 OK`.

## Updating

```bash
cd burn-note/deploy
docker compose pull
docker compose up -d
```

Images are tagged by semver and by commit SHA (see release workflow).

## Behind Tor (optional)

Add a `tor` service to `docker-compose.yml`:

```yaml
  tor:
    image: goldy/tor-hidden-service
    environment:
      BURN_TOR_SERVICE_HOSTS: '80:caddy:80'
      BURN_TOR_SERVICE_VERSION: '3'
    volumes:
      - tor_keys:/var/lib/tor/hidden_service/
    depends_on: [caddy]

volumes:
  # ...existing volumes...
  tor_keys:
```

Your `.onion` address will appear in the logs:

```bash
docker compose logs tor | grep '\.onion'
```

## Hardening checklist

- [ ] UFW: allow only 22 (whitelisted source IPs), 80, 443
- [ ] SSH: key-only, root login disabled, `fail2ban` enabled
- [ ] `journalctl` in RAM: edit `/etc/systemd/journald.conf` to set
      `Storage=volatile`
- [ ] Unattended upgrades: `apt install unattended-upgrades`
- [ ] Do **not** expose the Docker socket to any container
- [ ] Monthly OS patching cadence

## Backup policy

There is **no database backup**. This is intentional:

- Notes are definitionally ephemeral; a backup would resurrect destroyed content
  and violate the threat model
- On reboot or crash, all open notes are lost — this is a feature, not a bug

What you might want to back up:

- `caddy_data` volume (TLS certificates, avoids Let's Encrypt rate-limiting
  after a redeploy)
- Your customised `Caddyfile` and `docker-compose.yml`

## Observability

- Uptime Kuma or a similar external pinger on `/healthz` every 5 min
- There is no Prometheus endpoint exposed publicly. If you want local metrics,
  extend the Go binary — keep any metrics surface strictly internal.
