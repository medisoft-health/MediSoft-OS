# MediSoft C-OS — Brand Identity Guide

> Harmonized with the official marketing site **medisofthealth.com**.
> Last updated: June 9, 2026 — `claude/ui-visual-identity`

The C-OS app and the marketing site are one brand. The site is calm, editorial,
and minimal: warm paper background, near-black ink, serif display headings,
monospace eyebrow labels, and the colorful pentagon logo as the *only* vibrant
element. This guide encodes that language as design tokens so the app feels like
a natural extension of the site.

---

## Design principles

1. **Keep it CALM.** Warm-paper / light surfaces, generous whitespace, few colors at a time.
2. **Brand colors are ACCENTS, not backgrounds.** Pink, navy, teal, coral live in labels, links, indicators — never as page fills.
3. **Typography-driven hierarchy.** Large serif display headings, clear monospace labels, calm sans body.
4. **Subtle depth.** Thin hairline borders, barely-there shadows. No heavy elevation.
5. **The pentagon logo is the single vibrant element** — let it carry the color energy.
6. **Bilingual by construction.** Latin headings use the serif; Arabic (فصحى) headings stay on the Arabic sans for legibility. RTL uses logical properties only.

---

## Color palette

### Brand colors (accents only)

| Token | Hex | Use |
|-------|-----|-----|
| `--color-brand-navy` | `#1e3a8c` / primary `#1B4F7C` | Logo "Soft", primary CTAs, headings ink |
| `--color-brand-pink` | `#e84a8a` | Logo "Medi", active nav, highlights |
| `--color-brand-magenta` | `#d63384` | Active-state text, links |
| `--color-brand-cyan` | `#3fc4d9` | AI sparkles, icon accents, borders |
| `--color-brand-purple` | `#8b3fb8` | Gradient transitions |
| `--color-brand-orange` | `#f5a04a` | Warm accents |
| `--color-brand-coral` | `#e85d3a` | **Eyebrow / module labels** (the site's signature label color) |

### Surfaces (light)

| Token | OKLCH | Hex ref | Use |
|-------|-------|---------|-----|
| `--color-background` | `oklch(0.976 0.004 91)` | `#f8f7f4` | Warm editorial paper — main app background |
| `--color-card` | `oklch(1 0 0)` | `#ffffff` | Crisp white cards on the paper |
| `--color-muted` | `oklch(0.952 0.008 90)` | warm `#f1efe9` | Subtle fills, hover surfaces |
| `--color-border` | `oklch(0.922 0.005 88)` | warm hairline | Card / input borders |
| `--color-foreground` | `oklch(0.22 0.008 250)` | `#1A1A1A`-ish | Near-black ink |
| `--color-muted-foreground` | `oklch(0.5 0.01 250)` | `#4A4A4A`-ish | Secondary text |

### Semantic

| Token | Meaning |
|-------|---------|
| `--color-primary` | Deep navy `#1B4F7C` — dark editorial CTA buttons |
| `--color-label` | Coral `#E85D3A` — eyebrow labels (see `.label-eyebrow`, Badge `variant="label"`) |
| `--color-ring` | Navy focus ring |
| `--color-success` / `warning` / `destructive` / `critical` | Clinical status (unchanged) |

Dark mode keeps a neutral, slightly-cool slate base; `--color-label` brightens
for contrast. Brand accents and status colors carry across both themes.

---

## Typography

| Role | Font | Token / class |
|------|------|---------------|
| Display headings (h1/h2, card titles) | **Playfair Display** (serif) | `--font-serif`, `.font-display` |
| Body & UI | **Inter** (Latin) / **Noto Sans Arabic** | `--font-sans` |
| Eyebrow labels, code, keys | **JetBrains Mono** | `--font-mono`, `.label-eyebrow` |
| Decorative script (sparingly) | Pacifico | `--font-script` |

**Rules**

- Serif headings are **LTR-only**. In RTL (`dir="rtl"`), `h1/h2` and `.font-display`
  fall back to the Arabic sans — Playfair has no Arabic glyphs, and فصحى must stay crisp.
- Use `.label-eyebrow` (mono, uppercase, `0.14em` tracking, coral) for the
  "01 · THE PLATFORM" / module-subtitle treatment.
- Body stays sans for long-form readability — physicians spend hours here.

```html
<p class="label-eyebrow">Intelligent consultation engine</p>
<h1>Clinical intelligence, unified</h1>   <!-- serif (LTR), Arabic sans (RTL) -->
<Badge variant="label">MediScript</Badge>  <!-- coral eyebrow label -->
```

---

## Components

- **Cards** — hairline border + barely-there shadow (`0_1px_2px_rgba(16,24,40,0.03)`), `rounded-2xl`. No heavy elevation. Titles use `.font-display`.
- **Buttons** — `default` is now deep navy (editorial dark CTA); `brand` keeps the pink→navy gradient for hero moments; `outline`/`ghost` for calm actions.
- **Badge** — status variants (`success`/`warning`/`info`/`critical`) unchanged; new `label` variant = coral mono eyebrow for module/section labels.
- **Sidebar** — warm-tinted surface, pink active state with a pink→navy indicator bar. Brand lockup at top.

---

## RTL & i18n

- Logical properties only: `border-s`, `text-start`, `ps-`/`pe-`, `ms-`/`me-`.
- All UI strings live in both `messages/ar.json` and `messages/en.json`.
- Arabic is Modern Standard Arabic (فصحى) — never dialect.
- Test every change in both `/en/` and `/ar/`.

---

## Do / Don't

| Do | Don't |
|----|-------|
| Use coral for labels and pink/navy for accents | Flood backgrounds with brand color |
| Keep surfaces warm-paper / white | Introduce cool gray or pure-black page fills |
| Let the pentagon logo be the vibrant focal point | Add competing vibrant blocks |
| Use serif for Latin display headings | Force serif on Arabic text |
| Lean on thin borders for separation | Stack heavy drop-shadows |

---

## Token source of truth

All tokens live in [`src/app/globals.css`](../app/globals.css) under `@theme`
(Tailwind 4, OKLCH). Change colors there — components read the tokens, so the
palette stays consistent across the whole app from one place.
