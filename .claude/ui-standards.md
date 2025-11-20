# UI Standards & Design System Reference

**Last Updated**: January 2025
**Applies To**: All UI development and feature implementation

---

## Overview

This document provides quick-reference standards for UI development. For detailed information, see:

- **Spacing**: `docs/CSS_CHEAT_SHEET.md` (comprehensive spacing documentation)
- **Components**: `/app/_components` (component library)
- **Agent Guide**: `.claude/agents/ui-feature-builder.md` (workflow)

---

## 🎨 Design System Stack

### Technology

- **Framework**: Next.js 15.5.4 with React 19
- **Styling**: Tailwind CSS v4 (CSS-first configuration)
- **Icons**: `react-icons` (Lucide icons primarily)
- **Fonts**: Roboto (sans), Roboto Mono (monospace), Roboto Condensed
- **Colors**: OKLCH color space (P3 gamut support)

### Configuration Files

- **`app/styles/theme.css`** - All design tokens in `@theme` block + `:root` semantic tokens
- **`app/globals.css`** - CSS imports using `@import 'tailwindcss'`
- **`postcss.config.mjs`** - PostCSS with `@tailwindcss/postcss` plugin
- **`app/fonts.ts`** - Font loading with next/font
- **NO `tailwind.config.ts`** - Deleted in v4 migration (CSS-first approach)

---

## ⚡ Tailwind v4 Architecture (CRITICAL)

### CSS-First Configuration

Tailwind v4 uses **pure CSS configuration** with NO JavaScript config file. All tokens are defined in CSS using the `@theme` directive.

#### Primary Configuration: app/styles/theme.css

**Two distinct layers with strict separation:**

##### Layer 1: @theme Block (Utility-Generating Tokens)

**Purpose**: Design tokens that generate Tailwind utilities automatically

```css
@theme {
  /* Typography - generates text-body, text-heading-lg, etc. */
  --text-body: 0.875rem;
  --text-body--line-height: 1.4286;  /* Extended syntax */
  --text-heading-lg: 1.5rem;
  --text-heading-lg--line-height: 1.2;
  --text-heading-lg--font-weight: 700;

  /* Spacing - generates p-3, gap-5, m-2, etc. */
  --spacing-3: 0.75rem;
  --spacing-2\.5: 0.625rem;

  /* Border radius - generates rounded-sm, rounded-lg, etc. */
  --radius-sm: 0.25rem;
  --radius: 0.375rem;
  --radius-lg: 0.75rem;

  /* Shadows - generates shadow-sm, shadow-md, etc. */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);

  /* Font families - generates font-sans, font-mono, font-condensed */
  --font-sans: var(--font-roboto), system-ui, sans-serif;
  --font-mono: var(--font-roboto-mono), ui-monospace, monospace;
  --font-condensed: var(--font-roboto-condensed), sans-serif;

  /* Letter spacing - generates letter-spacing-caps, etc. */
  --letter-spacing-caps: 0.08em;
  --letter-spacing-caps-tight: 0.04em;

  /* Line heights - generates leading-none, leading-tight, etc. */
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-normal: 1.5;

  /* Transitions - generates ease-in, ease-out, duration-150, etc. */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --duration-150: 150ms;
  --duration-200: 200ms;

  /* Static colors (never change in dark mode) */
  --color-primary-foreground: oklch(100% 0 0);
  --color-platform-steam-dark: oklch(0.17 0.02 264);
}
```

✅ **DO** define in @theme:
- Typography scale (--text-*)
- Spacing values (--spacing-*)
- Border radius (--radius-*)
- Box shadows (--shadow-*)
- Font families (--font-*)
- Letter spacing (--letter-spacing-* or --tracking-*)
- Line heights (--leading-*)
- Transitions (--ease-*, --duration-*)
- **Static colors** that never change between themes

❌ **DON'T** define in @theme:
- Colors that change in dark mode (use :root + @theme inline)
- Non-standard semantic tokens (use :root)
- Anything that doesn't need to generate utilities

##### Layer 2: :root Block (Semantic Tokens + Dynamic Colors)

**Purpose**: Semantic tokens and colors that change with `[data-theme='dark']`

```css
:root {
  /* OKLCH colors (change in dark mode) */
  --background: oklch(0.95 0.01 264);
  --foreground: oklch(0.20 0.01 264);
  --primary: oklch(0.57 0.27 264);
  --muted: oklch(0.96 0.01 264);

  /* Semantic layout tokens (non-utility) */
  --width-content: 75rem;
  --spacing-content-pad: 1.25rem;
  --hero-slider-h: 15.625rem;

  /* Semantic shadows */
  --shadow-focus: 0 0 0 2px oklch(from var(--ring) l c h / 0.28);
  --shadow-card: none;  /* Flat design */
}

:root[data-theme='dark'] {
  /* Override colors for dark mode */
  --background: oklch(0.18 0.005 264);
  --foreground: oklch(0.95 0.01 264);
  --primary: oklch(0.57 0.27 264);  /* Same in both themes */
}
```

✅ **DO** define in :root:
- OKLCH colors (using relative color syntax)
- Semantic layout tokens
- Component-specific dimensions
- Semantic shadow overrides

❌ **DON'T** define in :root:
- Typography values (use @theme)
- Spacing scale (use @theme)
- Anything that should generate utilities

##### Layer 3: @theme inline (Color Utility Mapping)

**Purpose**: Map :root colors to --color-* namespace for utility generation

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-muted: var(--muted);
}
```

This generates utilities: `bg-background`, `text-foreground`, `bg-primary`, etc.

### Extended Syntax Pattern

Tailwind v4 supports bundling multiple CSS properties into a single utility:

```css
@theme {
  --text-heading-lg: 1.5rem;                    /* font-size */
  --text-heading-lg--line-height: 1.2;          /* line-height */
  --text-heading-lg--font-weight: 700;          /* font-weight */
  --text-heading-lg--letter-spacing: -0.01em;   /* letter-spacing */
}
```

Usage: `<h1 className="text-heading-lg">` applies ALL four properties!

### Single Source of Truth

| Token Type        | Location             | Generates                | Example                                 |
| ----------------- | -------------------- | ------------------------ | --------------------------------------- |
| Typography        | @theme               | `text-body`, `text-*`    | `--text-body: 0.875rem`                 |
| Spacing           | @theme               | `p-3`, `gap-5`, `m-2`    | `--spacing-3: 0.75rem`                  |
| Radius            | @theme               | `rounded-sm`, `rounded`  | `--radius-sm: 0.25rem`                  |
| Shadows           | @theme               | `shadow-sm`, `shadow-lg` | `--shadow-sm: 0 1px 2px ...`            |
| Fonts             | @theme               | `font-sans`, `font-mono` | `--font-sans: var(--font-roboto), ...`  |
| Leading           | @theme               | `leading-tight`, etc.    | `--leading-tight: 1.25`                 |
| Ease/Duration     | @theme               | `ease-out`, `duration-*` | `--ease-out: cubic-bezier(...)`         |
| Static colors     | @theme               | `bg-*`, `text-*`         | `--color-primary-foreground: oklch(...)`|
| Dynamic colors    | :root + @theme inline| `bg-*`, `text-*`         | `--background: oklch(...)` → `--color-background: var(--background)` |
| Semantic tokens   | :root                | N/A (use directly)       | `--width-content: 75rem`                |

### v4 Migration: What Changed

❌ **REMOVED** (no longer needed):
- `tailwind.config.ts` - Deleted entirely
- `autoprefixer` package - Built into v4 (Lightning CSS)
- `postcss-import` - Built into v4
- `postcss-nesting` - Built into v4
- `@tailwind base/components/utilities` - Replaced with `@import 'tailwindcss'`
- HSL color format - Migrated to OKLCH

✅ **ADDED** (new in v4):
- `@theme` directive for design tokens
- `@theme inline` for color mapping
- `@utility` directive for custom utilities
- `@import 'tailwindcss'` directive
- OKLCH color space (P3 gamut)
- Extended syntax (`--text-*--line-height`)
- Relative color syntax (`oklch(from var(--primary) l c h / 0.8)`)

### Common v4 Patterns

#### Custom Utilities (app/styles/utilities.css)

```css
/* Simple utilities - use @utility directive */
@utility max-w-content {
  max-width: var(--width-content);
}

@utility text-balance {
  text-wrap: balance;
}

/* Complex utilities - use @layer utilities */
@layer utilities {
  .clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
```

#### Component Classes (app/styles/components.css)

```css
@layer components {
  .link-primary {
    color: var(--primary);
  }
  .link-primary:hover {
    color: oklch(from var(--primary) l c h / 0.8);
  }
}
```

### v4 Limitations & Workarounds

#### Cannot Use Custom Colors in @apply

```css
/* ❌ WILL FAIL */
.my-class {
  @apply bg-primary text-foreground;
}

/* ✅ CORRECT - Use CSS variables directly */
.my-class {
  background-color: var(--primary);
  color: var(--foreground);
}

/* ✅ ALSO CORRECT - Use standard utilities */
.my-class {
  @apply flex items-center gap-3;
}
```

---

## 📏 Spacing System

### Rem-Based Scale (Accessible)

All spacing uses **rem values** (0.25rem base unit = 4px @ 16px root):

```tsx
p-1     = 0.25rem   (4px @ 16px root)
p-2     = 0.5rem    (8px @ 16px root)
p-2.5   = 0.625rem  (10px @ 16px root)  // ⭐ STANDARD for cards
p-3     = 0.75rem   (12px @ 16px root)
p-4     = 1rem      (16px @ 16px root)
p-5     = 1.25rem   (20px @ 16px root)  // ⭐ Component gaps
p-6     = 1.5rem    (24px @ 16px root)
```

**Accessibility**: Scales proportionally when users adjust browser font size.

### Component Padding Standards

| Component Type | Padding    | Size @ 16px root | Usage            |
| -------------- | ---------- | ---------------- | ---------------- |
| Cards/Panels   | `p-2.5`    | 10px             | Most common      |
| Card Headers   | `px-2.5 py-2` | 10px/8px      | Section headers  |
| Buttons        | `px-3 py-2`| 12px/8px         | All button types |
| Badges/Tags    | `px-2 py-1`| 8px/4px          | Labels, chips    |
| List Items     | `py-2`     | 8px vertical     | Rows, menu items |

---

## 🎨 Color System (OKLCH)

### OKLCH Color Space

All colors use **OKLCH format** for wider P3 color gamut support:

```css
/* OKLCH: oklch(lightness chroma hue) */
--primary: oklch(0.57 0.27 264);        /* Vivid blue */
--background: oklch(0.95 0.01 264);     /* Light gray */
--foreground: oklch(0.20 0.01 264);     /* Dark text */
```

**Benefits**:
- Wider P3 color gamut (25% more colors than sRGB)
- Perceptually uniform lightness
- Better color interpolation
- Future-proof for HDR displays

### Semantic Colors

```css
--background       // Page background
--foreground       // Primary text
--muted            // Subtle backgrounds
--muted-foreground // Secondary text
--primary          // Brand accent (use sparingly!)
--secondary        // Neutral surfaces
--success          // Positive states
--warning          // Caution states
--destructive      // Error/delete actions
--border           // Dividers, strokes
```

### Relative Color Syntax

```css
/* Lighten/darken colors */
background: oklch(from var(--primary) l c h / 0.8);  /* 80% opacity */

/* Hover states */
.link-primary:hover {
  color: oklch(from var(--primary) l c h / 0.8);
}
```

---

## ✏️ Typography System

### Semantic Font Size Tokens

Use the extended syntax utilities that bundle size + line-height + weight:

```tsx
text-body        = 14px, lh 1.43     // Default body text
text-small       = 12px, lh 1.33     // Labels, tabs
text-heading-sm  = 16px, lh 1.2, fw 600  // h3
text-heading-md  = 20px, lh 1.2, fw 600  // h2
text-heading-lg  = 24px, lh 1.2, fw 700  // h1
text-display-2xl = 44px, lh 1.1      // Hero text
```

### Font Weights

```tsx
font-normal    = 400  // Body text
font-medium    = 500  // Slight emphasis
font-semibold  = 600  // Strong emphasis
font-bold      = 700  // Headings
```

### Font Families

```tsx
font-sans       // Roboto (default)
font-mono       // Roboto Mono (code, numbers)
font-condensed  // Roboto Condensed
```

### Line Height Utilities

```tsx
leading-none    = 1      // Icons, tabular
leading-tight   = 1.25   // Compact layouts
leading-normal  = 1.5    // Body text
leading-relaxed = 1.625  // Readable prose
```

### Letter Spacing

```tsx
letter-spacing-caps       = 0.08em   // Standard uppercase
letter-spacing-caps-tight = 0.04em   // Tight uppercase
letter-spacing-caps-wide  = 0.12em   // Wide uppercase
tracking-tight           = -0.01em  // Headings
tracking-wide            = 0.02em   // Slight spacing
```

---

## 🧱 Component Patterns

### Cards (Use `<Section>`)

```tsx
import Section from '@/components/layout/Section';

// Standard card
<Section title="Card Title">
  <div>Content</div>
</Section>

// Compact
<Section title="Stats" density="compact">
  <div>Content</div>
</Section>
```

### Buttons

```tsx
<button className="rounded-sm bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90">
  Button
</button>
```

### Badges

```tsx
<span className="letter-spacing-caps inline-flex items-center rounded-sm bg-muted px-2 py-1 text-small font-semibold uppercase text-muted-foreground">
  Badge
</span>
```

---

## 🔍 Border & Radius

### Border Radius (v4 utilities)

```tsx
rounded-sm   = 4px   // Buttons, inputs
rounded      = 6px   // Default, cards
rounded-lg   = 12px  // Feature cards
rounded-xl   = 16px  // Large containers
rounded-full        // Pills, avatars
```

---

## 📋 v4 Migration Checklist

Before adding new design tokens:

```
[ ] Determine correct layer (@theme, :root, or @theme inline)
[ ] Verify token doesn't exist elsewhere (no duplication)
[ ] Use OKLCH for all colors
[ ] Use extended syntax for typography (--text-*--line-height)
[ ] Add to @theme if generating utilities
[ ] Add to :root if semantic/component-specific
[ ] Test that utilities generate correctly
[ ] Document if creating custom utility
```

---

## 🔗 Related Documentation

- `docs/CSS_CHEAT_SHEET.md` - Complete design system reference
- `.claude/agents/ui-feature-builder.md` - UI development workflow
- `app/styles/theme.css` - All design tokens
- `app/styles/utilities.css` - Custom utilities
- `app/styles/components.css` - Component classes
- `app/globals.css` - CSS imports

---

**For Questions**: Check docs → Search codebase → Consult team
