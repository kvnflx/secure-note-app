# Design System

Professional, privacy-oriented visual identity for secure-note-app, aligned with the
Backsafe brand. No decorative emojis, clear typographic hierarchy, restrained
palette built on Backsafe Blue.

## Principles

1. **Clarity over decoration.** Every element earns its place. No gratuitous
   gradients, no glassmorphism, no stock-hero aesthetics.
2. **Trust through restraint.** A security tool looks serious. Clean type,
   adequate whitespace, deliberate colour usage.
3. **Function over fashion.** Icons appear where they aid comprehension, not
   where they decorate. Text labels always take precedence.
4. **Systematic.** All visual properties drawn from the token set. No
   one-off hex values, no magic pixel values.

## Palette — Backsafe Blue

### Light mode

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#ffffff` | Page background |
| `--bg-subtle` | `#f8fafc` | Card backgrounds, muted surfaces |
| `--bg-muted` | `#f1f5f9` | Disabled states, code blocks |
| `--fg` | `#0f172a` | Primary text |
| `--fg-muted` | `#475569` | Secondary text, captions |
| `--fg-subtle` | `#94a3b8` | Placeholders, disabled text |
| `--border` | `#e2e8f0` | Default border |
| `--border-strong` | `#cbd5e1` | Emphasised border |
| `--primary` | `#0F4C96` | **Backsafe Blue** — brand, primary actions |
| `--primary-hover` | `#0A3972` | Primary action hover |
| `--primary-fg` | `#ffffff` | Text on primary |
| `--primary-subtle` | `#dbeafe` | Primary tinted backgrounds |
| `--accent` | `#2563EB` | Interactive accents, focus rings |
| `--danger` | `#b91c1c` | Destructive actions (destroy) |
| `--danger-subtle` | `#fee2e2` | Destructive tinted backgrounds |
| `--success` | `#047857` | Success states |
| `--warning` | `#b45309` | Warnings |

### Dark mode

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0A0E1A` | Page background |
| `--bg-subtle` | `#0F172A` | Card backgrounds |
| `--bg-muted` | `#1E293B` | Muted surfaces |
| `--fg` | `#F8FAFC` | Primary text |
| `--fg-muted` | `#CBD5E1` | Secondary text |
| `--fg-subtle` | `#64748B` | Placeholders |
| `--border` | `#1E293B` | Default border |
| `--border-strong` | `#334155` | Emphasised border |
| `--primary` | `#3B82F6` | Brand — lifted for contrast |
| `--primary-hover` | `#60A5FA` | Primary action hover |
| `--primary-fg` | `#0A0E1A` | Text on primary |
| `--primary-subtle` | `#1E3A8A` | Primary tinted backgrounds |
| `--accent` | `#60A5FA` | Interactive accents |
| `--danger` | `#EF4444` | Destructive actions |
| `--danger-subtle` | `#7F1D1D` | Destructive tinted backgrounds |

## Typography

### Stacks

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
```

Fully self-hosted, no web-font requests. Modern system UIs already ship
quality sans-serifs (San Francisco, Segoe UI Variable, Inter on ChromeOS).

### Scale (modular, 1.125 — minor third)

| Token | Size | Use |
|---|---|---|
| `--text-xs` | 0.75rem (12px) | Captions, microcopy |
| `--text-sm` | 0.875rem (14px) | Secondary UI text |
| `--text-base` | 1rem (16px) | Body default |
| `--text-lg` | 1.125rem (18px) | Emphasised body |
| `--text-xl` | 1.25rem (20px) | Subtitles |
| `--text-2xl` | 1.5rem (24px) | Section headings |
| `--text-3xl` | 1.875rem (30px) | Page title |

### Weights

400 (regular), 500 (medium), 600 (semibold), 700 (bold). No italics.

### Line-height

1.5 for body, 1.2 for headings, 1.6 for long paragraphs.

## Spacing

4-point scale: `--space-1` (4px), `--space-2` (8px), `--space-3` (12px),
`--space-4` (16px), `--space-6` (24px), `--space-8` (32px),
`--space-12` (48px), `--space-16` (64px).

## Radius

`--radius-sm` 4px · `--radius` 6px · `--radius-md` 8px · `--radius-lg` 12px.
Restrained. Nothing rounder than 12px except circular UI elements (avatars,
if any).

## Shadows

Used sparingly. Privacy-tool aesthetic prefers flat surfaces with borders
over elevated floating elements.

`--shadow-sm` = `0 1px 2px 0 rgb(0 0 0 / 0.05)` (on light mode only)

## Motion

Defaults: `150ms` ease-out for hover, `200ms` ease-in-out for appearance.
Reduced motion honoured via `@media (prefers-reduced-motion: reduce)`.

## Iconography

- No decorative emojis
- Inline SVG, stroke-based, 2px stroke, 24×24 viewBox
- Icons appear only for functional purposes (copy, share, toggle theme,
  destructive action), never as decoration
- Accompanied by aria-label when used alone
- Palette: `currentColor` so icons inherit text colour

## Components

### Button

- **Primary** — solid Backsafe Blue background, white foreground, 600 weight.
- **Secondary** — transparent background, 1px border, primary text colour,
  fills subtly on hover.
- **Destructive** — transparent with red border+text, fills red on hover.
- **Ghost** — text-only, no border, underline on hover.
- Height 44px by default for touch-target compliance.
- Focus ring: 2px `--accent`, offset 2px.

### Input / Textarea

- 1px border, `--radius`.
- Monospace font for `textarea` (user content is to be taken literally).
- Focus: border becomes `--primary`, 2px focus ring at `--accent`.

### Card

- `--bg-subtle` background, 1px `--border`.
- `--radius` rounding.
- Padding: `--space-4` to `--space-6`.

### Status message

- Body text, muted colour by default.
- Danger variant: `--danger` colour + subtle icon if functional.
- No emoji prefix.

## Accessibility

- WCAG 2.2 AA: all text ≥ 4.5:1 contrast; large text ≥ 3:1.
- Focus always visible via `:focus-visible` rings.
- Reduced-motion respected for all transitions.
- Touch targets ≥ 44×44 CSS px.
- `prefers-color-scheme` honoured; manual override via toggle persists in
  localStorage.
- `:lang()`-aware where applicable.

## Brand

- Product name: **Secure Note** (title case), wordmark only (no logomark in
  v1). Set in weight 600, `--text-xl`–`--text-2xl`, `--fg` colour.
- Tagline: _End-to-end encrypted. Self-destructing. Zero metadata._
- Tone: factual, terse, technical-credible. Avoid marketing language
  ("blazing fast", "revolutionary", "game-changing").

## Anti-patterns (things that would break the system)

- Adding drop-shadows to every card
- Using multiple brand colours beyond `--primary` + `--accent`
- Introducing a gradient
- Using emojis as UI elements
- Adding a hero with stock imagery or abstract shapes
- Mixing icon families (Feather + Material + emojis)
- Stacking font weights — more than 3 weights per page indicates
  design debt
