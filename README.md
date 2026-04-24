# Secure Note

Send encrypted notes that destroy themselves the moment they are read.
End-to-end encrypted in the browser, zero metadata, open-source.

**Live:** [note.backsafe.de](https://note.backsafe.de)

See [docs/README.md](docs/README.md) for project details,
[docs/HOSTING.md](docs/HOSTING.md) for self-hosting,
[docs/COOLIFY.md](docs/COOLIFY.md) for the Coolify + Hetzner guide,
[docs/SECURITY.md](docs/SECURITY.md) for the security policy, and
[docs/THREAT-MODEL.md](docs/THREAT-MODEL.md) for the threat model.

## Quick start

```bash
docker run --rm -p 8080:8080 \
  -e BURN_REDIS_SOCKET=redis:6379 \
  -e BURN_REDIS_NETWORK=tcp \
  ghcr.io/kvnflx/secure-note-app:latest
```

See `deploy/docker-compose.coolify.yml` for a complete stack (app + redis).

License: [MIT](LICENSE)
