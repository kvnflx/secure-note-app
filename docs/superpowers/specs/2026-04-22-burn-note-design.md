# Burn-Note — Design-Spezifikation

**Status:** Draft v1.0
**Datum:** 2026-04-22
**Projekt-Codename:** burn-note
**Geplante Domain:** note.backsafe.de
**Lizenz:** AGPL-3.0
**Autor:** fynn + Claude (brainstorming-Session)

---

## 1. Zweck & Positionierung

Eine minimalistische, selbstzerstörende One-Time-Message-Webapp mit dem Anspruch auf **vollständige Anonymität** und **Zero-Metadata**. Alternative zu privnote.com, temp.pm, CryptPad, jedoch mit bewusst schlankerem Funktionsumfang und strengerer Privacy-Positionierung:

- **Open-Source** (AGPL-3.0), selbst-hostbar per `docker compose up`
- **E2E-verschlüsselt**: Server kennt zu keinem Zeitpunkt Klartext, Key oder Passwort
- **Zero-Metadata**: keine Access-Logs, keine IP-Speicherung, keine Analytics, keine Drittanbieter-Abhängigkeit
- **Keine Accounts**, keine Email, keine Nutzer-Identität
- **Ephemer by design**: Storage im RAM (tmpfs), Reboot löscht alles

Kernversprechen: Wenn ein Angreifer den Server live beschlagnahmt und das Netzwerk beobachtet, sollen ausschließlich Ciphertext-Blobs und TLS-verschlüsselter Transit existieren — keine Nutzer-zu-Nutzer-Korrelation rekonstruierbar sein.

## 2. Bedrohungsmodell

**Level C — Zero-Trust + Zero-Metadata** (bewusst das höchste gewählte Level aus den Brainstorming-Optionen).

### Geschützt gegen

- Mitlesen auf dem Transport (TLS 1.3, HSTS)
- Kompromittierung des Servers nach Abruf der Nachricht (ephemere Storage)
- Kompromittierung des Servers auf Festplatten-Ebene (tmpfs, keine Disk-Persistenz)
- Link-Preview-Crawler in Messengern (Click-to-Reveal-Pattern, siehe 5.3)
- Brute-Force gegen optionales Passwort (Argon2id, siehe 4.2)
- Kontent-Spam / Storage-DoS (PoW-Challenge)
- Drittanbieter-Datenleaks (keine CDNs, keine Analytics, keine externen Shortener)
- Strafverfolgungs-Subpoenas bzgl. Metadaten (es existieren keine)

### Nicht geschützt gegen

- Live-Backdoor im laufenden Server-Prozess (könnte IPs beim Request sehen und Ciphertexte abgreifen, aber weiterhin nicht entschlüsseln)
- Kompromittierter Browser des Senders/Empfängers (Keylogger, Clipboard-Hijacker)
- Kompromittierte Endgeräte insgesamt
- Brute-Force gegen ein schwaches Nutzer-Passwort (einmal Ciphertext abgegriffen, läuft Brute-Force client-seitig, Argon2id bremst, aber bricht schwache Passwörter irgendwann)
- Staatliche Akteure auf IP-Level (ohne Tor-Einsatz — bewusst nicht im v1-Scope)

### Explizit akzeptierte Restrisiken

- **Tamper-evident statt tamper-proof beim Reveal:** Wenn ein Crawler den Reveal-Endpoint trotz Click-to-Reveal-Landing triggern sollte (z.B. per Headless-Browser), verbrennt die Nachricht und der echte Empfänger sieht "bereits gelesen". Das ist ein bewusstes Sicherheitssignal, nicht ein Bug.
- **Kein Backup:** Reboot/Crash/VPS-Ausfall = alle offenen Notes sind weg. Feature, nicht Bug.

## 3. Kern-Features

### 3.1 Nachrichtentypen

- **Plain Text** (Markdown-artig dargestellt, aber ohne aktives Rendern von HTML)
- **Code-Snippets mit Syntax-Highlighting** (highlight.js, ~20 gängige Sprachen, Auto-Detection)

**Nicht enthalten** (bewusst): Dateianhänge, Bilder, Chat, Mehrfach-Empfänger.

### 3.2 Zerstörungs-Trigger

- **First-Read:** Beim Klick auf "Nachricht anzeigen" im Reveal-View wird der Ciphertext vom Server atomar (GET+DEL in einer Redis-Transaction) abgerufen und gelöscht
- **Ablaufzeit:** Sender wählt aus Preset [5 min, 1 h, 1 d, 7 d, 30 d]; Redis-TTL räumt automatisch
- **Manueller Kill-Switch:** Sender erhält beim Erstellen ein Kill-Token (einmalig), mit dem er via `DELETE /api/notes/<id>` die Nachricht jederzeit vorzeitig zerstören kann

Nicht vorhanden: Max-N-Reads, Grace-Period, Read-Receipts.

### 3.3 Verschlüsselung & Key-Verteilung

- **Default:** 256-Bit-Key wird client-seitig generiert und im URL-Fragment (`#k=…`) transportiert. Browser senden das Fragment spezifikationsgemäß nie an den Server.
- **Optional:** Zusätzliche Passwort-Schicht. Wenn aktiviert, wird der Payload-Key mit einem aus dem Nutzer-Passwort via Argon2id abgeleiteten Wrap-Key verschlüsselt; Salt liegt im Fragment als `&s=…`. Der Empfänger braucht dann Link **und** Passwort.

Details in Sektion 4.

### 3.4 Click-to-Reveal Landing

Die URL `/n/<id>#k=<key>` liefert bei initialem GET eine **statische HTML-Shell** mit generischen OG-Tags. Kein DB-Zugriff, kein Burn. Erst der explizite User-Klick auf "Nachricht anzeigen" triggert `POST /api/notes/<id>/reveal`. Dies schützt gegen Link-Preview-Crawler in Messengern (WhatsApp, Telegram, Discord, Slack), die andernfalls die Nachricht vorzeitig verbrennen würden.

Bleibt tamper-evident: Wer zuerst klickt (Crawler oder echter User), gewinnt. Der jeweils Zweite sieht "bereits gelesen".

### 3.5 Convenience- & Security-Features (A-Tier, alle in v1)

| Feature | Zweck |
|---|---|
| **QR-Code** | Teilen über physische Distanz / zweites Gerät (client-side SVG) |
| **Web Share API** | Ein Button → alle installierten Messenger-Apps (OS-nativ) |
| **Sichtschutz-Toggle** | Textarea und Reveal maskieren Inhalt mit `●`; Schutz gegen Schulter-Blicke |
| **Self-Destruct-Countdown** | Beim Reveal: sichtbarer 60s-Timer, optional 1× um 60s verlängerbar; nach Ablauf wird DOM geleert |
| **Clipboard-Auto-Clear** | Beim Copy-Button: Option, Zwischenablage nach 30s zu leeren |
| **Dark/Light/Auto-Theme** | System-Preference + manueller Toggle, localStorage-Persistenz |
| **Estimate-Expiry-Anzeige** | Nach Erstellen: konkretes Datum in Nutzer-Zeitzone |
| **Keyboard-Shortcuts** | `Ctrl+Enter` = senden/anzeigen, `Esc` = zurück, `?` = Hilfe |
| **Passwort-Stärke-Indikator** | Client-side, eigene ~30-Zeilen-Heuristik (keine libzxcvbn) |
| **i18n DE/EN** | Flache JSON-Strings, `navigator.language` default, manueller Toggle |
| **Accessibility (WCAG 2.2 AA)** | Semantic HTML, Focus-Ring, Kontrast, ARIA-Live, Screen-Reader, Keyboard-Nav |
| **PWA** | Installierbar, Offline-Compose, aber kein API-Caching |
| **Kill-Switch-UI** | Ein-Klick-Zerstörung mit Confirm-Dialog |

### 3.6 Non-Goals (explizit nicht gebaut)

- Accounts, Login, Email
- Dateianhänge, Bilder
- Chat, Replies, Multi-Round-Kommunikation
- Read-Receipts, Push-Notifications, Delivery-Confirmation
- Externe URL-Shortener-Integration (bit.ly etc.) — Key-Leak
- Eigener URL-Shortener — Key ist mathematisch nicht kürzbar, kein Gewinn
- Analytics-SDKs (GA, Plausible, Posthog etc.)
- CDN für statische Assets
- Drag-and-Drop-Datei-Import
- Auto-Save-Drafts (localStorage-Klartext wäre Threat-Model-Bruch)
- Mobile-Native-Apps (PWA reicht)
- Tor Hidden Service (v1; kann später als Caddy-Side-Car nachgerüstet werden, ohne App-Änderung)
- Hardcoded-Messenger-Buttons (Web Share API deckt ab)

## 4. Crypto-Stack

### 4.1 Symmetric AEAD: XChaCha20-Poly1305

- 256-Bit-Key, 192-Bit-Nonce (randomisiert pro Operation)
- Library: **libsodium.js** (selbst gehostet, ~150 KB WASM)
- **Warum nicht AES-GCM:** 96-Bit-Nonce (Kollisionsrisiko bei Random-Generation), kein nativer Nonce-Reuse-Schutz. XChaCha20 mit 192-Bit-Nonce macht Random-Nonces sicher.
- **Warum nicht WebCrypto-API:** Kein XChaCha20-Support; AES-GCM als Fallback bringt keine Sicherheitsgewinne, kostet aber Audit-Fläche (zwei Crypto-Libs statt einer).

### 4.2 Key-Derivation (wenn Passwort aktiv): Argon2id

- Parameter (OWASP-2024-konform): **64 MiB Memory, 3 Iterations, 4 Parallelism**
- Salt: 128-Bit random pro Nachricht, im URL-Fragment als `&s=<base64>`
- Output: 256-Bit-Wrap-Key

**Dokumentierte Eigenschaft:** Nach erfolgreichem Reveal hat der Client den Ciphertext. Server hat bereits gelöscht. Ein Angreifer, der den Ciphertext **vor** dem Reveal abfängt (z.B. TLS-Man-in-the-Middle, was durch HSTS unwahrscheinlich ist) könnte unbegrenzt Passwörter probieren; nach dem Reveal kann nur der Empfänger das noch, auf seinem Gerät. **Argon2id ist die einzige Brute-Force-Bremse.** ~500 ms pro Versuch auf Mid-Range-Laptop. Ein 10-Zeichen-zufälliges Passwort bleibt praktisch unbrechbar (~10^19 Versuche); ein schwaches "hund12" wäre in Minuten raus. Wird in `SECURITY.md` und `THREAT-MODEL.md` explizit dokumentiert.

### 4.3 Zwei-Stufen-Encrypt (wenn Passwort aktiv)

```
Stage 1: PayloadKey = random(256-bit)
         Ciphertext = XChaCha20-Poly1305(PayloadKey, Nonce1, Plaintext)
Stage 2: WrapKey = Argon2id(UserPasswort, Salt)
         WrappedPayloadKey = XChaCha20-Poly1305(WrapKey, Nonce2, PayloadKey)

Fragment ohne Passwort:  #k=<base64(PayloadKey)>
Fragment mit Passwort:   #k=<base64(WrappedPayloadKey)>&s=<base64(Salt)>
```

Server speichert ausschließlich `Ciphertext` (Stage 1). Stage 2 + Fragment sind rein clientseitig.

### 4.4 Kill-Token

- Server generiert beim Erstellen 256-Bit random
- Speichert **nur SHA-256(Token)** in Redis
- Klartext-Token wird einmalig dem Sender im POST-Response zurückgegeben
- Wird für `DELETE /api/notes/<id>` benötigt; Vergleich erfolgt per Hash

### 4.5 PoW-Challenge (Abuse-Prevention)

- SHA-256-basiert: `SHA256(seed || nonce)` muss `N` Leading-Zero-Bits haben
- Default-Difficulty: 20 Bits (~500 ms auf Mid-Range-Laptop)
- Server vergibt Seeds mit 5 min TTL, markiert als verbraucht nach Verify
- Difficulty per ENV-Variable zur Laufzeit verstellbar (bei Angriffslast)
- Löser läuft in Web Worker, damit UI nicht blockiert

### 4.6 IDs

- 96-Bit random (16 Base32-Chars, URL-safe, großschreibungs-unabhängig)
- Keine fortlaufenden Counter, keine Timestamp-Bestandteile

## 5. Server-API & Datenmodell

### 5.1 Endpoints

| Methode | Pfad | Zweck |
|---|---|---|
| `GET` | `/api/pow/challenge` | Liefert Seed + Difficulty; speichert Seed mit 5 min TTL |
| `POST` | `/api/notes` | Erstellt Note (benötigt PoW), gibt ID + Kill-Token zurück |
| `GET` | `/n/<id>` | Statische HTML-Shell (Click-to-Reveal-Landing); **kein Burn** |
| `POST` | `/api/notes/<id>/reveal` | Atomarer GET+DEL aus Redis; liefert Ciphertext oder 404 |
| `DELETE` | `/api/notes/<id>` | Kill-Switch; prüft SHA-256(Token); löscht bei Match |
| `GET` | `/healthz` | Health-Check für Monitoring |
| `GET` | `/metrics` | Prometheus-Metriken, **nur via Unix-Socket**, nicht public |

### 5.2 Request/Response-Schemas

**POST /api/notes — Request:**
```json
{
  "ciphertext": "<base64>",
  "expires_in": 3600,
  "has_password": false,
  "pow": { "seed": "<hex>", "nonce": "<hex>" }
}
```

**POST /api/notes — Response:**
```json
{
  "id": "A3KQP9XM2VF7WXNB",
  "kill_token": "<43-char-base64>",
  "expires_at": 1713795120
}
```

**POST /api/notes/<id>/reveal — Response (success):**
```json
{ "ciphertext": "<base64>", "has_password": true }
```

**Bei gone:** `404` mit `{"error":"gone","reason":"already_read_or_expired"}` — Client unterscheidet die beiden Fälle bewusst **nicht** (Metadaten-Leak).

### 5.3 Click-to-Reveal HTML-Shell (`GET /n/<id>`)

- Identische Shell für alle IDs (keine DB-Query)
- OG-Meta-Tags generisch:
  - `og:title` = "One-Time Note"
  - `og:description` = "Click to reveal — will be destroyed on read"
  - `og:image` = statisches Logo
- Crawler, die OG-Tags parsen oder den statischen HTML ausliefern, triggern **keinen** Burn

### 5.4 Redis-Datenmodell

```
KEY:   note:<id>
TYPE:  Hash
FIELDS:
  ciphertext:      <base64>
  expires_at:      <unix-ts>
  kill_token_hash: <sha256-hex>
  created_at:      <unix-ts>
TTL:   max(expires_at - now, 0)
```

PoW-Seeds separat: `pow:<seed>` → `"1"`, TTL 5 min, `DEL` bei Verify.

### 5.5 Konfiguration (ENV)

```
BURN_LISTEN_ADDR=:8080
BURN_REDIS_SOCKET=/sockets/redis.sock
BURN_MAX_CIPHERTEXT_KB=100
BURN_POW_DIFFICULTY=20
BURN_POW_SEED_TTL_SEC=300
BURN_EXPIRY_OPTIONS=300,3600,86400,604800,2592000
BURN_MAX_EXPIRY_SEC=2592000
```

### 5.6 Logging-Policy (streng)

- **Kein Access-Log** (Go-HTTP-Handler schweigen bei Erfolg)
- **Fehler-Logs nur bei Fatal** → stderr, keine Datei-Persistenz
- **Kein `X-Forwarded-For`-Handling** in der Applikation (einzig Caddy sieht die IP, schreibt sie aber nicht)
- **Caddy:** `log { output discard }`
- **System:** `journalctl` auf RAM-Storage (`Storage=none`)

### 5.7 Abuse-Obergrenzen

- Redis `maxmemory 256mb`, `maxmemory-policy volatile-ttl`
- Caddy globale Rate-Limit `1000 req/s` (DoS-Schutz, nicht per-IP)
- PoW-Difficulty dynamisch anhebbar

## 6. Frontend-Architektur

### 6.1 Views

**View 1 — Compose (`/`)**
- Textarea mit Sichtschutz-Toggle und Code-Mode-Toggle
- Ablaufzeit-Dropdown (Preset-Liste aus ENV)
- Passwort-Toggle mit Input + Stärke-Indikator (nur wenn aktiviert)
- "Nachricht erstellen"-Button (primary CTA, `Ctrl+Enter`)

**View 2 — Success (nach POST)**
- Kopier-Link-Feld mit Copy-Button (+ 30s-Auto-Clear-Option)
- "Teilen"-Button (Web Share API, Fallback: Clipboard)
- "QR-Code anzeigen"-Expand mit SVG-QR + Download
- Expiry-Datum in Nutzer-Zeitzone
- Kill-Switch-Button (zweistufig mit Confirm)
- Transparenz-Hinweise ("wir können das nicht wiederherstellen" etc.)

**View 3 — Reveal-Landing (`/n/<id>`)**
- Statische Shell (siehe 5.3)
- Bei `&s=` im Fragment: zusätzliches Passwort-Input
- Großer "Nachricht anzeigen"-Button
- Nach Klick: entschlüsselter Inhalt mit Countdown (60s, 1× verlängerbar)
- Sichtschutz-Toggle auch im Reveal
- Copy-Button mit Auto-Clear-Option

### 6.2 Stack

- **Vanilla JS + Web Worker** (PoW-Löser)
- **libsodium.js** (lazy loaded beim ersten Crypto-Call)
- **highlight.js** (lazy loaded im Code-Mode, Subset ~20 Sprachen)
- **qrcode-svg** (lazy loaded bei QR-Expand, ~5 KB)
- **CSS:** CSS-Variablen für Theme, keine Framework
- **Build:** Vite (nur für Bundling/Minifizierung, kein Framework-Compile)

### 6.3 Asset-Budget

- `index.html`: ~3 KB
- `app.js`: ~15 KB gzipped (ohne Deps)
- **First-Load-Budget für Compose-Seite: ~25 KB** (libsodium und highlight.js werden erst beim Submit bzw. Code-Mode geladen → wahrgenommen als instant)

### 6.4 Service-Worker-Policy

- Cache-First für HTML/JS/WASM/CSS
- **Network-Only für `/api/*`** — niemals API-Cache
- Offline: Compose-UI sichtbar, POST schlägt kontrolliert fehl mit Hinweis. **Kein Queuing** (würde Klartext-Persistenz bedeuten).

### 6.5 Security-Headers (Caddy)

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()`

## 7. Deployment

### 7.1 Topologie

Ein VPS (z.B. Hetzner CX22, 4 €/Monat), Debian 12, Docker Engine. Drei Container:

- `caddy` — TLS + Reverse-Proxy, `log output discard`
- `burn` — Go-Binary (distroless, read-only FS, non-root, cap_drop ALL)
- `redis` — redis:7-alpine, nur Unix-Socket (kein TCP), tmpfs-Storage, `appendonly no`, `save ""`, `maxmemory 256mb`

### 7.2 Repo-Struktur

```
/cmd/burn                Go-Entrypoint
/internal/api            HTTP-Handler
/internal/storage        Redis-Interface
/internal/pow            PoW-Verifier
/web                     Frontend (index.html, js, css, wasm)
/deploy                  docker-compose.yml, Caddyfile, Dockerfile
/docs
  /README.md             Projekt-Überblick
  /SECURITY.md           Responsible-Disclosure, PGP-Key
  /THREAT-MODEL.md       detaillierte Bedrohungsanalyse
  /HOSTING.md            Self-Host-Anleitung
/.github/workflows       CI (lint, test, build, sign, push)
```

### 7.3 CI/CD

- GitHub Actions: Lint (golangci-lint, biome), Test (Go + Playwright E2E), Build Multi-Arch (amd64+arm64), Sign mit Cosign, Push zu GHCR
- Deploy: Watchtower auf VPS oder manuell `docker compose pull && up -d`

### 7.4 Monitoring

- Extern: Uptime Kuma o.ä., pollt `/healthz` alle 5 min
- Intern: Prometheus-Metriken nur via Unix-Socket (nicht public); Counter: `notes_created_total`, `notes_read_total`, `notes_expired_total`, `notes_killed_total`; Gauge: `notes_in_redis`
- **Keine** IP-/Geo-/User-Agent-Metriken

### 7.5 Backup

- **Keine Datenbank-Backups** (Threat-Model-konform, ephemer by design)
- Gebackupt: Container-Images (GHCR), Caddyfile, compose.yml, TLS-Cert-State

### 7.6 OS-Härtung

- SSH key-only, Fail2Ban, root-login disabled
- UFW: 22/tcp (IP-whitelisted), 80/tcp, 443/tcp
- Unattended-Upgrades
- Docker-Socket nicht exponiert
- `journalctl Storage=none`

## 8. Testing-Strategie

### 8.1 Testarten

- **Go Unit-Tests:** PoW-Verification, Redis-Interactions (miniredis), API-Handler (httptest). Coverage-Ziel ≥ 80 %.
- **JS Unit-Tests (Vitest):** Krypto-Roundtrip (Known-Answer-Tests libsodium), PoW-Solver, UI-Utilities. Coverage ≥ 70 %.
- **E2E (Playwright):** Happy-Path (Create→Share→Reveal→Burn), Passwort-Flow, Kill-Switch, abgelaufene Note, QR, Web-Share-Fallback, Keyboard-Shortcuts, i18n-Switch, Theme-Switch.

### 8.2 Security-spezifische Asserts

- Kein HTTP-Request enthält das URL-Fragment (Netzwerk-Mitschnitt-Check in Playwright)
- Zweiter Reveal-Call auf dieselbe ID → 404
- Kill-Switch ohne Token → 403
- OG-Tags bei `/n/<id>` sind statisch und identisch für alle IDs
- TTL-Ablauf räumt Redis-Eintrag

### 8.3 Fuzz-Testing

- go-fuzz auf API-Endpoints (malformed JSON, Überlängen, PoW-Angriffsvektoren)

## 9. Lizenz & Release

- **Lizenz:** AGPL-3.0 — Copyleft verhindert geschlossene Klone als Hosted-Service ohne Source
- **Dokumente im Repo:** `README.md`, `SECURITY.md` (Responsible-Disclosure + PGP-Key), `THREAT-MODEL.md` (explizit was schützt und was nicht, inkl. Passwort-Brute-Force-Eigenschaft), `HOSTING.md` (VPS-Setup, DNS, Caddyfile-Anpassung)
- **Legal Response Policy:** Dokumentiert, dass wir technisch keine Klartexte oder Metadaten herausgeben können; Admin-CLI `burn-admin kill <id>` existiert als formaler Takedown-Pfad

## 10. Grobe Roadmap (wird in writing-plans verfeinert)

| Milestone | Inhalt | Schätzung |
|---|---|---|
| M1 | Kern-Crypto-Backend: Go-Skelett, Redis, POST/GET/DELETE, PoW, Basis-Tests | ~3 Tage |
| M2 | Kern-Frontend: Compose/Success/Reveal, libsodium, Click-to-Reveal | ~4 Tage |
| M3 | A-Tier-Features: QR, Web Share, Sichtschutz, Countdown, Clipboard-Clear, Theme, i18n, PWA, Kill-UI, Passwort, Code-Mode | ~3 Tage |
| M4 | Accessibility & Polish: WCAG, Shortcuts, Error-States, Mobile-Testing | ~2 Tage |
| M5 | Deploy-Ready: Docker-Compose, Caddy, CI/CD, CSP, E2E, Docs, Public-Release | ~2 Tage |

**Gesamt ~14 Entwicklertage** für v1.0 — production-ready, self-hosted, open-source.

## 11. Offene Punkte für writing-plans

- Konkrete Task-Reihenfolge innerhalb der Milestones
- Exakte Go-Modulstruktur (internal-Packages, Interface-Grenzen)
- Exaktes JS-Bundle-Layout (Code-Splitting-Grenzen)
- Test-Daten & Playwright-Fixtures
- Repo-Initialisierung und erste Commits
- Domain/DNS-Konkretisierung (note.backsafe.de → VPS)

---

**Ende der Spezifikation.**
