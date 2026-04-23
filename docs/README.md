# burn-note

Self-destructing one-time messages. E2E-encrypted, zero-metadata, open-source.

## What it is

A minimalistic alternative to privnote.com, PrivateBin, and CryptPad, focused on a
single purpose: send a message that is destroyed after the recipient reads it once,
leaving as little trace as possible on the server and the network.

## Design highlights

- **E2E-encrypted**: The server never sees plaintext. Decryption happens entirely
  in the browser with libsodium (XChaCha20-Poly1305). An optional password layer
  wraps the payload key via Argon2id.
- **Zero-metadata**: No access logs, no IP storage, no analytics, no tracking, no
  third-party CDNs. Server stores ciphertext in RAM-only Redis; reboot wipes
  everything.
- **No accounts**: No login, email, or user identity. Abuse is bounded by a
  Proof-of-Work challenge instead of IP rate-limits.
- **Click-to-Reveal**: A static HTML shell is served for `/n/<id>` so that
  link-preview crawlers in messengers do not accidentally burn notes.
- **Self-hostable**: Single 3-container Docker Compose stack (`caddy` + `burn` +
  `redis`), runnable on a 4 €/month VPS.

## Quick tour

```
Sender browser                     Server                 Recipient browser
─────────────                     ──────                  ─────────────────
 generate key        ─────┐
 encrypt plaintext        │
 solve PoW                │
 POST /api/notes   ──────>│  verify PoW
                          │  store ciphertext in Redis
                          │  return {id, kill_token}
 build URL               <┤
   /n/<id>#k=<key>        │
 (share URL)                                               GET /n/<id>
                          │                                 (static shell, no burn)
                          │                                click "Show note"
                          │                                POST /api/notes/<id>/reveal
                          │  atomic GET + DEL   ──────>
                          │  return ciphertext
                          │                                decrypt with key from #
                          │                                display, countdown, clear
```

## Live deployment

https://note.backsafe.de

## Links

- [Security policy](SECURITY.md) — reporting vulnerabilities
- [Threat model](THREAT-MODEL.md) — what the app protects (and what it doesn't)
- [Hosting guide](HOSTING.md) — run your own instance

## Repository layout

```
/cmd/burn            Go entrypoint (main.go, embedded HTML shell)
/internal/api        HTTP handlers + middleware + router
/internal/config     Env-var config loader
/internal/crypto     Secure random IDs / tokens / hashes
/internal/pow        SHA-256 leading-zero-bits PoW verifier
/internal/storage    Redis-backed Store with atomic reveal + kill
/web-src             Vite + Vanilla JS frontend (source)
/deploy              Dockerfile, docker-compose.yml, Caddyfile, redis.conf
/docs                This folder
/.github/workflows   CI (build + test + e2e) and release (multi-arch + cosign)
```

## License

AGPL-3.0 — see [LICENSE](../LICENSE).
