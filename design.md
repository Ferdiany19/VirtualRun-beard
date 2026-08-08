# Design — VirtualRun Beard

A locked design system for the public VirtualRun Beard experience. Public pages use this file as
their shared visual source of truth; admin pages retain their operational dashboard system.

## Genre

Editorial athletic: direct, image-led, information-dense, and grounded in real event operations.

## Macrostructure family

- Marketing homepage: Marquee Hero with event photography and editorial catalogue sections.
- Public event index: Catalogue with equal-weight, image-forward inventory cards.
- Public event detail: Photographic hero followed by the existing operational content sequence.
- Admin application: Workbench; no decorative enrichment.

## Theme

- Paper: warm off-white, `--color-landing-paper`.
- Ink: deep navy, `--color-landing-ink`.
- Secondary surface: pale teal paper, `--color-landing-paper-2`.
- Primary signal: restrained teal, `--color-landing-teal`.
- Action signal: orange, `--color-landing-orange`.
- Rules: cool tinted hairlines, `--color-landing-rule`.

The accent occupies a small part of each viewport. Event brand colour may appear only on event-owned
elements such as category labels.

## Typography

- Display: Oswald, weight 800, upright, condensed, uppercase only for display headings.
- Body: Montserrat, weight 400; weight 700 for labels and actions.
- Display tracking: `-0.025em`.
- Body measure: 45–68 characters where prose is continuous.

## Spacing

Use the named 4-point scale in `tokens.css`. Public pages retain responsive gutters of 16 px on
mobile, 24 px on tablet, and 32 px on desktop.

## Motion

- Motion-cut: no page reveal or scroll animation.
- Image hover may scale by at most 1.02 using `--dur-long` and `--ease-out`.
- Actions use short colour transitions and a 1 px pressed translation.
- Reduced motion is respected globally.

## Microinteractions stance

- Focus is immediate and visible.
- Touch targets are at least 44 px.
- Success and error feedback remain inline.
- No celebratory animation, hover-only information, or decorative motion.

## CTA voice

- Primary: rectangular, 2 px ink border, solid ink fill, concise verb-led label.
- Secondary: typographic link with a single underline rule.
- Labels never wrap.

## Per-page allowances

- Public marketing and event pages may use real event photography.
- Event detail pages may use the event's configured brand colour on category labels.
- Admin pages do not use photographic enrichment or landing display scale.

## What pages MUST share

- Official BEARD logo assets.
- Navy, teal, orange, and warm-paper palette.
- Oswald display and Montserrat body typography.
- Square editorial action treatment and strong horizontal rules.
- Public header N6 Masthead and footer Ft1 Mast-headed.

## What pages MAY differ on

- Homepage may use a full-fold marquee.
- Event index uses a uniform catalogue grid.
- Event detail keeps its transactional two-column content/form layout.
- Event-owned brand colours may vary by event.

## Exports

### tokens.css

```css
:root {
  --color-landing-paper: oklch(97.8% 0.009 92);
  --color-landing-paper-2: oklch(93.8% 0.014 172);
  --color-landing-ink: oklch(24% 0.075 255);
  --color-landing-ink-2: oklch(45% 0.045 250);
  --color-landing-rule: oklch(82% 0.025 210);
  --color-landing-teal: oklch(61% 0.13 178);
  --color-landing-teal-dark: oklch(48% 0.105 178);
  --color-landing-orange: oklch(70% 0.19 48);
  --color-landing-accent-ink: oklch(24% 0.075 255);
  --color-landing-white: oklch(99.5% 0.002 92);
  --color-landing-focus: oklch(63% 0.18 48);
  --font-display: var(--font-oswald), "Arial Narrow", sans-serif;
  --font-body: var(--font-montserrat), sans-serif;
  --space-3xs: 0.25rem;
  --space-2xs: 0.5rem;
  --space-xs: 0.75rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2rem;
  --space-xl: 3rem;
  --space-2xl: 4.5rem;
  --space-3xl: 7rem;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.75rem;
  --text-2xl: 2.5rem;
  --text-display: clamp(4.5rem, 12vw, 11rem);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-short: 150ms;
  --dur-medium: 240ms;
  --dur-long: 420ms;
  --radius-landing: 0;
}
```

### Tailwind theme mapping

```ts
{
  colors: {
    landingPaper: "var(--color-landing-paper)",
    landingInk: "var(--color-landing-ink)",
    landingTeal: "var(--color-landing-teal)",
    landingOrange: "var(--color-landing-orange)",
  },
  fontFamily: {
    display: ["var(--font-oswald)", "Arial Narrow", "sans-serif"],
    sans: ["var(--font-montserrat)", "sans-serif"],
  },
}
```

### DTCG tokens.json

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(97.8% 0.009 92)", "$type": "color" },
    "paper-2": { "$value": "oklch(93.8% 0.014 172)", "$type": "color" },
    "ink": { "$value": "oklch(24% 0.075 255)", "$type": "color" },
    "ink-2": { "$value": "oklch(45% 0.045 250)", "$type": "color" },
    "rule": { "$value": "oklch(82% 0.025 210)", "$type": "color" },
    "teal": { "$value": "oklch(61% 0.13 178)", "$type": "color" },
    "orange": { "$value": "oklch(70% 0.19 48)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Oswald, Arial Narrow, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "Montserrat, sans-serif", "$type": "fontFamily" }
  },
  "space": {
    "sm": { "$value": "1rem", "$type": "dimension" },
    "md": { "$value": "1.5rem", "$type": "dimension" },
    "lg": { "$value": "2rem", "$type": "dimension" },
    "xl": { "$value": "3rem", "$type": "dimension" }
  }
}
```

### shadcn/ui variable mapping

```css
:root {
  --background: 97.8% 0.009 92;
  --foreground: 24% 0.075 255;
  --card: 97.8% 0.009 92;
  --card-foreground: 24% 0.075 255;
  --primary: 61% 0.13 178;
  --primary-foreground: 99.5% 0.002 92;
  --secondary: 93.8% 0.014 172;
  --secondary-foreground: 24% 0.075 255;
  --muted: 82% 0.025 210;
  --muted-foreground: 45% 0.045 250;
  --accent: 70% 0.19 48;
  --accent-foreground: 24% 0.075 255;
  --border: 82% 0.025 210;
  --input: 82% 0.025 210;
  --ring: 63% 0.18 48;
  --radius: 0;
}
```
