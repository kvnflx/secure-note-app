# Threat Model

This document describes what burn-note protects against, what it does not, and
the explicit trade-offs we accept.

## What we protect

### 1. Wire tapping on transport
- TLS 1.3 enforced, HSTS with `includeSubDomains`
- No HTTP fallback

### 2. Post-read server compromise
- Redis atomically deletes a note on first reveal (Lua script: `HGETALL` + `DEL`
  in a single transaction)
- Expired notes are reaped by Redis TTL automatically

### 3. Disk forensics
- Redis runs on tmpfs (RAM-only filesystem inside the container)
- `appendonly no` and `save ""` disable persistence
- A powered-off VPS holds no plaintext, no ciphertext, no keys

### 4. Link-preview crawlers in messengers
- `/n/<id>` returns a static HTML shell; revelation requires an explicit click
- Shell is byte-identical for every id; OG tags are generic
- Crawlers that only perform `GET` do NOT trigger a burn
- A crawler that fully simulates the "Show note" click WILL burn the note. The
  real recipient then sees "already gone" — this is **tamper-evident by design**,
  not a bug.

### 5. Brute-force against optional passwords
- Password-wrap uses Argon2id with 64 MiB memory, 3 iterations
- Roughly 500 ms per attempt on a mid-range laptop
- A 10-character random password is practically unbreakable

### 6. Storage-abuse DoS
- Every create request requires a SHA-256 leading-zero-bits Proof-of-Work
- Default: 20 bits (~500 ms of work in a Web Worker). Raisable by env var if
  under attack
- No IP tracking is needed or performed

### 7. Third-party data leaks
- No CDNs, no analytics scripts, no external URL shorteners
- Every asset is self-hosted, including libsodium WASM
- No `credentials: 'include'`; all fetches use `credentials: 'omit'`

### 8. Subpoenas for metadata
- The server has no access logs, no IP records, no per-user records
- Admin can only issue `DELETE /api/notes/<id>` if the kill-token is known, or
  wait for TTL expiry
- There is nothing to hand over

## What we do NOT protect against

### 1. Live server backdoor
A runtime compromise of the Go process could observe request ciphertext and
client IPs. Content remains AEAD-encrypted; the server never has the key.

### 2. Compromised endpoints
Browsers with installed malware (keyloggers, screen recorders, clipboard
hijackers), compromised OSes, or physical surveillance of a reader are out of
scope. The browser is our trust boundary.

### 3. Weak passwords
Once the recipient holds the wrapped key from the URL fragment, brute-forcing
the wrap-password is bounded only by Argon2id — not infinite, but finite.
Pick real passwords.

### 4. Network-level anonymity
burn-note v1 does not run as a Tor hidden service. A determined observer who
can see both the sender's and recipient's network traffic can correlate
create/reveal timestamps and connection metadata. If this matters to you, run
your own instance behind Tor; see [HOSTING.md](HOSTING.md).

### 5. Metadata available to operators of your path (ISP, VPN, CF Tunnel, etc.)
We only control what happens on our server.

## Explicit trade-offs

| Decision | Trade-off |
|----------|-----------|
| Click-to-Reveal is tamper-**evident**, not tamper-**proof** | A rogue headless crawler can still burn a note; the recipient sees it was burned |
| No grace-period, no max-N-reads | First reveal wins. Intentional. |
| No accounts, no auth | Abuse is bounded entirely by PoW plus size caps |
| Password-wrap key stored in URL fragment | Fragment never reaches the server, but *is* visible in browser history, screenshots, and anyone with the link |
| Argon2id decryption happens client-side | An attacker who intercepts the wrapped key + salt (via a compromised URL path) can brute-force offline, limited only by KDF cost |
| miniredis in dev, real Redis in prod | Lua atomicity assumed; we rely on real Redis' single-threaded execution for guarantees. miniredis is close-enough for tests but not for production. |

## Security contacts

See [SECURITY.md](SECURITY.md).
