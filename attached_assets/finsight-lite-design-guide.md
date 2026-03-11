# FinSight Lite — Design System Guide

Adapted from FinSight 360 for young learners (ages 12–17) in the Caribbean.
Stack: **React + TypeScript + Tailwind CSS + shadcn/ui**

---

## 1. Brand Philosophy

| Dimension | FinSight 360 (adult) | FinSight Lite (youth) |
|-----------|---------------------|----------------------|
| Feeling | Professional, trustworthy | Playful, energetic, safe |
| Fonts | Outfit + Plus Jakarta Sans | **Baloo 2 + Nunito** |
| Card radius | 20px | **28px** (friendlier) |
| Gradient speed | 45s | **30s** (livelier) |
| Coral accent | None | **hsl(15, 90%, 65%)** — gamification |
| Base radius | 0.75rem | **0.875rem** |

Both apps share the same brand family: teal/amber colors, glassmorphism cards, Caribbean gradient backgrounds.

---

## 2. Color Tokens

### Brand Colors

```css
/* Primary — violet/purple (learning, navigation) */
--primary: 262 83% 58%;

/* Secondary — amber/gold (achievements, money) */
--secondary: 32 95% 60%;

/* Coral — GAMIFICATION ONLY (XP, streaks, badges) */
--coral: 15 90% 65%;

/* Teal — informational, hints, tips */
--accent: 190 80% 92%;          /* bg tint */
--accent-foreground: 190 80% 28%;
```

### Usage Rules

| Token | Use it for | Never use it for |
|-------|-----------|-----------------|
| `--primary` | Navigation, CTA buttons, progress bars | Decorative-only elements |
| `--secondary` | Coins, money amounts, savings goals | Error states |
| `--coral` | XP pills, streak badges, level tags, game scores | General body text |
| `--accent` | Info banners, tip cards, lesson highlights | Primary actions |

### Coral in Practice
```tsx
// XP display
<span className="xp-pill">+50 XP</span>

// Streak badge
<span className="streak-badge">🔥 7-day streak</span>

// Coral glass panel (wrap a section)
<div className="glass-card-coral p-4">
  <p className="text-white font-bold">Level Up!</p>
</div>

// Tailwind direct (after adding to tailwind.config)
<div className="bg-coral text-coral-foreground rounded-full px-3 py-1">
  Badge text
</div>
```

---

## 3. Typography

### Font Setup

```html
<!-- In index.html <head> -->
<link
  href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600&display=swap"
  rel="stylesheet"
/>
```

### Font Roles

| Font | CSS Var | Tailwind Class | Role |
|------|---------|----------------|------|
| Baloo 2 | `var(--font-display)` | `font-display` | Headings, CTAs, badges, scores |
| Nunito | `var(--font-body)` | `font-sans` | Body text, descriptions, labels |

```tsx
// Heading — auto-uses Baloo 2 via base layer
<h1 className="text-4xl font-bold">Learn money, have fun!</h1>

// Explicit display in a non-heading
<span className="font-display font-bold text-2xl text-primary">480 XP</span>

// Body — default everywhere
<p className="text-muted-foreground">Complete 6 modules to unlock the next level.</p>
```

### Type Scale (recommended)

| Usage | Tailwind | Notes |
|-------|----------|-------|
| Hero title | `text-5xl lg:text-6xl font-display font-bold` | Landing, auth pages |
| Section header | `text-2xl font-display font-bold` | Dashboard sections |
| Card title | `text-lg font-display font-semibold` | Glass card headings |
| Body | `text-sm font-sans` | Paragraphs, lists |
| Label | `text-xs font-semibold uppercase tracking-wider` | Form labels, tags |
| XP/Score | `text-3xl font-display font-extrabold` | Large metric displays |

---

## 4. Glassmorphism Cards

### Available Classes

| Class | Use case | Blur | BG opacity |
|-------|----------|------|------------|
| `.glass-card` | Standard content panels | 16px | 18% |
| `.glass-card-heavy` | Hero, modals, featured | 24px | 28% |
| `.glass-card-coral` | XP, badges, streaks, rewards | 12px | 15% coral |
| `.glass-card-teal` | Tips, info panels, hints | 12px | 13% teal |
| `.glass-panel` | Legacy — sidebar panels | 16px | 70% white |
| `.glass-inset` | Nested stats inside a card | — | 12% black |
| `.glass-inset-light` | Nested on dark backgrounds | — | 10% white |

### Code Examples

```tsx
// Standard card
<div className="glass-card p-6">
  <h3 className="font-display font-bold text-white text-lg mb-2">Saving vs. Spending</h3>
  <p className="text-white/80 text-sm">Learn the difference with interactive examples.</p>
</div>

// Coral card — for gamification
<div className="glass-card-coral p-4 flex items-center gap-3">
  <span className="text-3xl">🏆</span>
  <div>
    <p className="font-display font-bold text-white">Achievement Unlocked!</p>
    <p className="text-white/70 text-sm">First Savings Goal Completed</p>
  </div>
</div>

// Inset stat inside a card
<div className="glass-card p-5">
  <div className="glass-inset">
    <p className="text-white/60 text-xs">Current Streak</p>
    <p className="font-display font-extrabold text-2xl text-white">🔥 7 days</p>
  </div>
</div>

// Heavy modal/hero card
<div className="glass-card-heavy p-8 max-w-md mx-auto">
  <h2 className="font-display font-bold text-3xl text-white mb-4">
    Welcome back, Jamie! 👋
  </h2>
</div>
```

### Card Border Radius Reference

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-glass` | 28px | Outer glass card corners |
| `--radius-inset` | 18px | Nested panels inside glass cards |
| `--radius-badge` | 999px | Pill badges |
| `--radius-icon` | 14px | Icon container squares |
| `--radius` (shadcn) | 0.875rem | shadcn components (Button, Input, etc.) |

---

## 5. Caribbean Background Gradient

### Usage
```tsx
// Wrap the page or section
<div className="caribbean-bg min-h-screen">
  {/* content */}
</div>
```

The gradient drifts through deep violet → purple → teal on a **30-second loop** (more energetic than FinSight 360's 45s). It also includes a subtle radial overlay via `::before` for depth — no extra markup needed.

### Custom gradient stops (in CSS vars)
```css
--grad-stop-1: hsl(262, 72%, 26%);   /* deep violet */
--grad-stop-2: hsl(288, 68%, 22%);   /* purple */
--grad-stop-3: hsl(190, 72%, 20%);   /* deep teal */
--grad-stop-4: hsl(262, 78%, 18%);   /* dark violet */
```

---

## 6. Tailwind Config Snippet

Merge this into your existing `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg:    "1rem",
        md:    ".75rem",
        sm:    ".5rem",
        glass: "28px",
        inset: "18px",
        badge: "999px",
        icon:  "14px",
      },
      colors: {
        background:  "hsl(var(--background) / <alpha-value>)",
        foreground:  "hsl(var(--foreground) / <alpha-value>)",
        border:      "hsl(var(--border) / <alpha-value>)",
        input:       "hsl(var(--input) / <alpha-value>)",
        ring:        "hsl(var(--ring) / <alpha-value>)",

        /* Coral — gamification accent */
        coral: {
          DEFAULT:    "hsl(var(--coral) / <alpha-value>)",
          foreground: "hsl(var(--coral-foreground) / <alpha-value>)",
          muted:      "hsl(var(--coral-muted) / <alpha-value>)",
        },

        primary: {
          DEFAULT:    "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT:    "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",  /* violet */
          "2": "hsl(var(--chart-2) / <alpha-value>)",  /* teal */
          "3": "hsl(var(--chart-3) / <alpha-value>)",  /* coral */
          "4": "hsl(var(--chart-4) / <alpha-value>)",  /* amber */
          "5": "hsl(var(--chart-5) / <alpha-value>)",  /* emerald */
        },
      },
      fontFamily: {
        sans:    ["var(--font-body)", "sans-serif"],
        display: ["var(--font-display)", "cursive"],
        mono:    ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "bounce-in": {
          "0%":   { transform: "scale(0.3) translateY(30px)", opacity: "0" },
          "50%":  { transform: "scale(1.12) translateY(-6px)", opacity: "1" },
          "70%":  { transform: "scale(0.94) translateY(2px)" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        "pop-in": {
          "0%":   { transform: "scale(0.85)", opacity: "0" },
          "70%":  { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "bounce-in":      "bounce-in 0.55s cubic-bezier(0.34,1.56,0.64,1) both",
        "pop-in":         "pop-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
```

---

## 7. Shadow & Elevation Scale

```css
/* Use these Tailwind-style via CSS vars or inline styles */
--shadow-xs:  0 1px 2px  hsl(262 40% 18% / 0.06);   /* subtle dividers */
--shadow-sm:  0 2px 8px  hsl(262 40% 18% / 0.10);   /* default card */
--shadow-md:  0 4px 16px hsl(262 40% 18% / 0.12);   /* hover state */
--shadow-lg:  0 8px 32px hsl(262 40% 18% / 0.14);   /* modal, dropdown */
--shadow-xl:  0 16px 48px hsl(262 40% 18% / 0.18);  /* hero / full-page */

/* Glow variants — use on Caribbean background */
--shadow-glow-primary: 0 0 24px hsl(262 83% 58% / 0.35);
--shadow-glow-coral:   0 0 20px hsl(15 90% 65% / 0.40);
--shadow-glow-teal:    0 0 20px hsl(190 80% 55% / 0.35);
```

Apply glow on active/featured elements:
```tsx
<button
  style={{ boxShadow: "var(--shadow-glow-primary)" }}
  className="btn-primary"
>
  Start Learning
</button>
```

---

## 8. Animation Reference

| Class | Keyframe | Duration | Best for |
|-------|----------|----------|----------|
| `animate-float` | `float` | 3s loop | Logos, hero icons |
| `animate-wiggle` | `wiggle` | 2s loop | Attention icons, coins |
| `animate-bounce-in` | `bounce-in` | 0.55s once | Achievement popups, rewards |
| `animate-pop-in` | `pop-in` | 0.3s once | Modal entrance, tooltips |
| `animate-rainbow` | `rainbow-shift` | 4s loop | Special items, fun mode |
| `animate-caribbean` | `caribbean-drift` | 30s loop | Background gradient |
| `animate-shimmer` | `shimmer` | 1.8s loop | Loading skeletons |

```tsx
// Achievement unlock
<div className="glass-card-coral p-5 animate-bounce-in">
  <span className="text-5xl">🎉</span>
  <p className="font-display font-bold text-white text-xl">Level 5!</p>
</div>

// Floating coin icon
<div className="w-16 h-16 animate-float">
  <Coins className="w-full h-full text-amber-400" />
</div>
```

---

## 9. XP & Progress Bars

```tsx
// XP bar — primary to coral gradient
<div className="xp-bar-track">
  <div className="xp-bar-fill" style={{ width: `${(xp % 100)}%` }} />
</div>

// Lesson completion bar — teal gradient
<div className="xp-bar-track">
  <div className="lesson-bar-fill" style={{ width: `${(lessonsCompleted / 6) * 100}%` }} />
</div>
```

---

## 10. Consistency Checklist

Before shipping any new screen, verify:

- [ ] Body text uses Nunito (`font-sans`) — not Baloo 2
- [ ] All headings use Baloo 2 (`font-display`) — or rely on the `h1–h6` base rule
- [ ] Coral is only used for XP, streaks, badges, and game scores — not general UI
- [ ] All cards on the Caribbean background use `.glass-card` or `.glass-card-*` (not plain `bg-white`)
- [ ] Interactive cards have `.card-hover` or `.hover-elevate`
- [ ] Border radius on glass cards = `--radius-glass` (28px) — not `rounded-xl` (12px)
- [ ] Reward / achievement popups use `animate-bounce-in`
- [ ] Chart data uses the chart palette: violet (1), teal (2), coral (3), amber (4), emerald (5)
- [ ] Dark mode checked — all custom colors have `.dark` overrides
- [ ] No hardcoded hex values — use CSS vars or Tailwind semantic tokens only
