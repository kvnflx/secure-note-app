# Security Policy

## Reporting a vulnerability

Please email: **security@backsafe.de**

A PGP key will be published at the first tagged release; until then, clearly
mark the subject `[SECURITY]` and we will coordinate a direct response within
72 hours.

**Do not** file public issues or pull requests for security problems. We aim
to ship a fix (or at least a documented workaround) within **14 days** for
high-severity issues.

## Scope

In scope:

- Cryptographic weaknesses in the client or server (key generation, AEAD
  parameters, Argon2id parameters, PoW bypass)
- Metadata leaks that would identify senders, recipients, content patterns,
  or communication graphs
- Remote code execution, SSRF, XSS, CSRF, injection
- Bypasses of the reveal/kill/expiry guarantees
- Container escape paths in the deployment topology
- Supply-chain issues in our dependencies that materially affect the product

Out of scope:

- Attacks that require physical access to a sender or recipient device
- Attacks relying on a compromised endpoint (browser, OS, clipboard hijacker,
  keylogger). Our threat model explicitly excludes this — see
  [THREAT-MODEL.md](THREAT-MODEL.md).
- Missing best-practice headers on pages *other than* the secure-note-app app
- Self-XSS that requires the user to paste crafted code into the devtools
  console
- Social engineering
- Denial-of-service that requires more than one-host-of-bandwidth to mount
  (the PoW challenge is tuned for casual abuse, not nation-state DDoS)

## Coordination

If you are a researcher and request public credit, we will acknowledge you in
the release notes of the fix unless you prefer to remain anonymous.
