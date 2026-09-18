# Report Sol — Design System (jw.org Style Guide, Dark Theme)

Source: tokens extracted directly from www.jw.org production CSS (`collector.css`, build `28ada02fb0`). Active theme: **dark** (matching jw.org dark mode as shown in user's reference screenshot). Structural guidance from ui-ux-pro-max skill (Minimalism & Swiss Style pattern).

## Brand Colors (verified from jw.org CSS)

| Role | Hex | Evidence |
|------|-----|----------|
| Primary (brand blue) | `#4a6da7` | Most frequent color in jw.org CSS (284 uses) — logo chip, buttons |
| Primary hover | `#3d5c8f` | Darkened brand for button hover |
| Link/accent on dark | `#9fb9e3` | Light blue — "Ver más" links, card titles in dark mode |
| Navy band (alert bar) | `#0a224b` | `--ct-alerts-bgColor` dark variant; hover `#143368` |
| Error | `#a71d01` | `--ct-errorText-color` |

## Neutrals — dark theme (verified from jw.org CSS)

| Role | Hex | Evidence |
|------|-----|----------|
| Page background | `#000000` | `--ct-body-bgColor` dark |
| Panel / cards | `#121212` | `--ct-mobileNavPanel-bgColor` |
| Nav / copyright strips | `#292929` | `--ct-primaryNav-bgColor`, `--ct-footer-bgColor` dark |
| White block (hero) | `#ffffff` | Hero sections stay white in dark mode |
| Border (dark) | `#3c3c3c` | Dark-theme borders |
| Border (light surfaces) | `#d8d8d8` | Light-theme borders |
| Text primary (on dark) | `#ffffff` | |
| Text muted (on dark) | `#a7a7a7` | Dark-theme muted |
| Text primary (on white) | `#292929` | |
| Text muted (on white) | `#626262` | |

## CSS Variables (Tailwind 4 `@theme`)

```css
@theme {
  --color-page: #000000;
  --color-surface: #121212;
  --color-surface-light: #ffffff;
  --color-nav: #292929;
  --color-brand: #4a6da7;
  --color-brand-dark: #3d5c8f;
  --color-brand-light: #9fb9e3;
  --color-brand-highlight: #0a224b;
  --color-brand-highlight-hover: #143368;
  --color-ink: #ffffff;
  --color-ink-muted: #a7a7a7;
  --color-ink-on-light: #292929;
  --color-ink-muted-on-light: #626262;
  --color-line: #3c3c3c;
  --color-line-on-light: #d8d8d8;
  --color-icon: #a7a7a7;
  --color-danger: #a71d01;
}
```

## Typography

- Stack: `Helvetica, Arial, sans-serif` (jw.org's actual stack)
- Weight hierarchy: regular body (400), bold headings (700)
- Uppercase tracking for nav items and micro-labels (`text-[11px] uppercase tracking-wider`)
- Content-first: clear type scale, generous white space

## Style Principles (from jw.org dark home)

1. **Photo billboard hero** — full-width photo banner (jw.org "billboard" pattern): dark gradient overlay left→right, white bold heading, solid brand button. Height tiers: 288px mobile / 384px sm / 440px lg; `object-[center_35%]` keeps faces in frame.
2. **Black page canvas** — black background carries the sections below the hero; contrast IS the hierarchy.
2. **Blue logo chip** — solid `#4a6da7` box with white bold letters (JW.ORG pattern).
3. **Flat panels** — cards are `#121212` with `#3c3c3c` borders, NO border radius (square corners everywhere).
4. **Solid brand buttons** — `#4a6da7` background, white semibold text, square corners.
5. **Light blue links on dark** — titles and "Ver más" in `#9fb9e3`, underline on hover.
6. **Uppercase micro-labels** — muted `#a7a7a7` with wide tracking.
7. **Accessibility** — white on black ≈ 21:1; `#9fb9e3` on `#121212` ≈ 9:1; `#292929` on white ≈ 12.6:1; white on brand blue ≈ 4.2:1 (bold text only, jw.org's own choice).

## Anti-patterns (avoid)

- Border radius (jw.org uses square corners; max 2px if ever needed)
- Heavy shadows, gradients, glassmorphism
- Decorative color floods that compete with content
- Emoji as structural icons — use consistent SVG family with `aria-hidden`
- Layout-shifting hover states (no scale transforms)

## Effects

- Hover: color/underline transitions, 150–250ms
- Focus: visible outline in `#9fb9e3` (dark) or brand blue (light surfaces)
- `prefers-reduced-motion` respected
