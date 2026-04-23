# Burn Note — Design System (v2: Dev-Console)

**Scope:** Burn-Note project only. Not a global design system.

**Aesthetic reference:** Linear · Vercel · Raycast · Dub.co · Plausible.
Minimal, monochrome, dev-tool feel. The UI is functional infrastructure,
not a marketing site.

---

## 1. Color — Functional neutrals + single accent

Monochrome base, zero brand colors aside from a restrained accent. Danger
and success colors only appear when semantically needed.

### Light

| Token             | Value       | Use                                   |
|-------------------|-------------|---------------------------------------|
| `--bg`            | `#FAFAFA`   | Page background                        |
| `--surface`       | `#FFFFFF`   | Elevated surface (cards, inputs)       |
| `--surface-2`     | `#F4F4F5`   | Second layer (highlighted blocks)      |
| `--border`        | `#E4E4E7`   | Default separator                      |
| `--border-strong` | `#D4D4D8`   | Inputs, emphasised separators          |
| `--fg`            | `#09090B`   | Primary text                           |
| `--fg-muted`      | `#52525B`   | Secondary text                         |
| `--fg-subtle`     | `#A1A1AA`   | Tertiary / placeholders                |
| `--accent`        | `#2563EB`   | Primary actions, focus, single accent  |
| `--accent-hover`  | `#1D4ED8`   | Accent hover                           |
| `--accent-fg`     | `#FFFFFF`   | Text on accent                         |
| `--danger`        | `#DC2626`   | Destructive actions, errors            |
| `--success`       | `#16A34A`   | Positive confirmation                  |
| `--warning`       | `#D97706`   | Warnings                               |

### Dark (primary / default-first)

| Token             | Value       |
|-------------------|-------------|
| `--bg`            | `#0A0A0A`   |
| `--surface`       | `#111113`   |
| `--surface-2`     | `#17171A`   |
| `--border`        | `#1F1F23`   |
| `--border-strong` | `#2A2A30`   |
| `--fg`            | `#FAFAFA`   |
| `--fg-muted`      | `#A1A1AA`   |
| `--fg-subtle`     | `#71717A`   |
| `--accent`        | `#3B82F6`   |
| `--accent-hover`  | `#60A5FA`   |
| `--accent-fg`     | `#FFFFFF`   |
| `--danger`        | `#F87171`   |
| `--success`       | `#4ADE80`   |
| `--warning`       | `#FBBF24`   |

**Rules:**
- Never introduce a second brand hue. One accent, period.
- Functional color must carry icon + text, never color alone (WCAG).
- All text/background pairs ≥ 4.5:1 (AA).

---

## 2. Typography

| Role          | Font                          | Weight  | Size              |
|---------------|-------------------------------|---------|-------------------|
| Sans (UI)     | Inter variable, system fallback | 400/500/600/700 | 12–32px |
| Mono          | JetBrains Mono, ui-monospace  | 400/500/600 | 12–15px    |

**Scale (rem):**
`0.75 · 0.8125 · 0.875 · 1 · 1.125 · 1.25 · 1.5 · 2` (12/13/14/16/18/20/24/32)

**Line-height:** 1.5 body · 1.2 headings · 1.3 UI labels.
**Letter-spacing:** `-0.011em` body · `-0.022em` headings · `0` mono.

**Usage:**
- Mono for: timers, countdown, link URL, IDs, code blocks, expiry timestamps.
- Tabular nums (`font-variant-numeric: tabular-nums`) on all numeric
  readouts.
- H1: 24px (mobile) / 32px (desktop), weight 600.
- Body lede: 16px, color `--fg-muted`.
- Labels: 13px, weight 500, color `--fg-muted`.

---

## 3. Spacing & layout

**Scale:** 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64

**Layout:**
- Max content width: 560px (compose/reveal/success). Wider feels marketing-y.
- Max header/footer width: 720px with generous horizontal padding.
- Gutter: 24px desktop, 16px mobile.

**Section rhythm:** 32px between major sections, 16px within a group.

---

## 4. Radius & elevation

**Radius scale:** 4 · 6 · 8 · 10.
- Inputs, buttons, cards: `8`.
- Small chips, dots, QR corners: `4`.
- Avoid anything ≥ 12 except the full "pill" for tags (999).

**Elevation:**
- Dark mode: **no shadows**. Use `--border` to separate layers.
- Light mode: at most `0 1px 2px rgba(0,0,0,0.04)` on the primary CTA.
- Modals / sheets: `0 8px 24px rgba(0,0,0,0.08)` (light) / same with black.

---

## 5. Motion

- Durations: **120ms** micro (hover/focus), **200ms** state, **260ms** transitions.
- Easing: `cubic-bezier(0.2, 0, 0, 1)` (ease-out-expo-ish, Vercel style).
- Exit ≤ 70% of enter duration.
- All motion honors `prefers-reduced-motion`.
- Only animate `opacity`, `transform`. Never `width/height/top/left`.

---

## 6. Iconography

- Library feel: Lucide-style stroke icons, **1.5px** stroke, 16/18/20 px.
- All strokes `currentColor`.
- No emoji. Ever.
- Icons always paired with text for primary actions; icon-only allowed only
  on secondary/toolbar buttons, with `aria-label`.

---

## 7. Components

### 7.1 Header (minimal)

```
[● Burn Note]                                          [☾] [EN ▾]
```
- Brand: wordmark + pulsing 6px accent dot (status indicator).
- Right: theme toggle (ghost icon button), optional language switch.
- 56px tall, border-bottom `--border`.

### 7.2 Buttons

| Variant  | Use                       | Bg         | Fg         | Border           |
|----------|---------------------------|------------|------------|------------------|
| Primary  | Main CTA (1 per screen)   | `--accent` | `--accent-fg` | —            |
| Secondary| Share, copy, toolbar      | transparent | `--fg`   | `--border-strong`|
| Ghost    | Tertiary / toolbar icons  | transparent | `--fg-muted` | transparent  |
| Danger   | Destroy note              | transparent | `--danger` | `--danger`     |

- Min-height 40px (regular), 32px (small), 52px (primary full-width CTA).
- Radius `8`.
- Focus: 2px outline, `--accent`, 2px offset.

### 7.3 Input / Textarea

- Bg `--surface`, border `--border-strong`, radius `8`, padding 12 16.
- Focus: border `--accent` + 2px offset outline.
- Min font-size 16px on mobile (anti-iOS-zoom).
- Textarea: mono, min-height 200px, resize vertical.

### 7.4 Option-Card (NEU)

Groups compose options into a single labeled block. Replaces loose rows.

```
┌─ Options ──────────────────────────────────────────┐
│  Expires                   [ 1 hour      ▾ ]       │
│  ─────────────────────────────────────────────     │
│  □ Require password                                │
│  └── [ password input ]                            │
│      [||||||·····] Strong · ~72 bits               │
└────────────────────────────────────────────────────┘
```

- Border `1px --border`, radius `10`, padding 16 20.
- Section label at top-left, 12px uppercase tracking 0.06em, `--fg-subtle`.
- Internal divider: `1px --border`.

### 7.5 Link display (success)

- Mono font, full-width input, integrated copy button.
- Radius `8`, border `--border-strong`.
- Copy button on the right, 1px border-left.
- On copy: button swaps to check icon + "Copied" (2s).

### 7.6 Countdown

- Mono tabular-num, 15px, weight 600.
- Pill shape (radius 999) with dot indicator that pulses red under 10s.
- Extend action stays a ghost button beside it.

### 7.7 Content block (revealed note)

- Mono, 14px, line-height 1.6.
- Bg `--surface-2`, border `--border`, radius `8`, padding 16 20.
- Syntax highlight uses accent-restrained token palette (no bright colors).

### 7.8 Footer

- Left: `End-to-end encrypted · Zero metadata` in `--fg-subtle` 12px.
- Right: `Source ↗`  link only.

---

## 8. Anti-patterns

- ❌ Brand accent on more than one element per screen.
- ❌ Large hero marketing copy.
- ❌ Drop shadows as primary separation.
- ❌ Gradients.
- ❌ Rounded-full buttons (pills). Use 8px.
- ❌ Emojis.
- ❌ Layout-shifting press states.
- ❌ Icon-only primary CTA.

---

## 9. Voice

Precise, technical, short. No exclamation marks. No "awesome". Use
present-tense verbs ("Creates", "Destroys"). German/English parity.
