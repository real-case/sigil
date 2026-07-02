# Sigil — Design System Brief for Claude Design

> **Purpose.** This document is the ingestion brief for [Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs). It describes Sigil's product context, distribution constraints, current token surface, target token surface, references, and the components we want Claude Design to produce. Pair this file with the repository itself when running Claude Design's onboarding flow.

---

## 1. Product context

**Sigil** is an MCP Apps server that ships **live, interactive chart widgets** for AI hosts. Unlike chart MCPs that return PNGs, every Sigil widget is a React app sandboxed inside the host's iframe, with hover tooltips, click-to-highlight, Copy-as-CSV, and Copy-as-PNG. See [README.md](../README.md) and [SPEC.md](../SPEC.md).

**Tagline.** *A sigil is a symbol that carries compressed meaning. Same idea, applied to data.*

**Widget set (v0.2.0).** `bar-chart`, `line-chart`, `pie-chart`, `scatter-chart`, `treemap`, `heatmap`, `table`, `stat-panel`, `dashboard`, `map`. All registered in [src/registry.ts](../src/registry.ts) and share the `mountWidget` HOC in [src/widgets/shared/widget-shell.tsx](../src/widgets/shared/widget-shell.tsx).

---

## 2. Render targets and constraints

### 2.1 Primary surface: AI chat windows

Widgets render inside chat conversations. Treat the available canvas as **narrow and tall**:

- **Width:** ~600–800px effective (Claude Desktop, Claude web, ChatGPT, Gemini all sit in this range; some allow ~900px max).
- **Height:** typically 300–500px before scrolling becomes awkward.
- **Density:** the design must default to **compact** — chat space is precious. A `cozy` preset is welcome but compact is the lead.
- **Light/dark:** the host's `prefers-color-scheme` drives the theme. We must look correct in both with the same component code.

### 2.2 Distribution constraint (read carefully)

Each widget compiles to a **single self-contained HTML file** via `vite-plugin-singlefile`. There is **no shared CSS bundle, no CDN, no npm runtime for widgets**. Consequences for the design system:

- All tokens are inlined as CSS custom properties at runtime by [`installThemeStyles()`](../src/widgets/shared/theme.ts:159) which `mountWidget` calls on boot. Tokens travel as JavaScript, not as a `.css` file.
- Components produced by Claude Design must be **React + inline styles or styled JSX** with the same token interface — *not* a Tailwind-style class system, *not* a CSS-in-JS runtime, *not* a separate stylesheet. CSS variables are the dist mechanism.
- Recharts is the charting layer; it themes via **props** on `<XAxis>`, `<CartesianGrid>`, `<Tooltip content={…}>` etc., not class overrides. Custom chart sub-components (e.g. tooltip) should be **React components**, not CSS skins.
- Per-widget bundle size is acceptable (Recharts is inlined per widget on purpose — see [memory/feedback_bundle_size.md](../memory/feedback_bundle_size.md)). Don't optimize for that.

### 2.3 What lives in `shared/` vs. per-widget

Anything cross-widget — token definitions, shared React primitives (Card, Tooltip, Legend, EmptyState, LoadingSkeleton), the `mountWidget` shell, the toolbar — lives in [`src/widgets/shared/`](../src/widgets/shared/) and is re-bundled into every widget at build time. Per-widget files only contain the chart view itself.

---

## 3. Design direction

### 3.1 References (replaces prior Linear/Vercel/Stripe direction)

| Reference | What we want from it |
|---|---|
| **Apple charts** (iOS Health, Fitness, Stocks, Apple Card) | Soft, layered surfaces. Hairline borders. Spring-easing motion. Large continuous corner radii. SF Pro-grade typography hierarchy (weight + line-height, not just size). |
| **Google charts / Material 3** | Accessible color contrast. Dynamic color theory for series palettes. Clear focus states. |
| **Top Dribbble chart designs** | Bento layouts, sophisticated tints (multi-stop gradients, not flat hex), confident negative space. |

### 3.2 Premium tells to bake into tokens

These are the user-stated "3-second tells" — every token category below must enable at least one:

- **Skeleton loaders** — shimmer animation for `LoadingSkeleton` primitive; tokens for shimmer gradient + duration.
- **Microanimations** — hover lift, tooltip fade-in, focus ring bloom; tokens for duration, easing, transform delta.
- **Soft lines** — hairline borders (0.5px on retina, 1px otherwise), low-contrast dividers, rounded but not pill corners.
- **Layered tints** — surfaces have *depth*. At minimum: page bg → surface → elevated surface. Tooltips and legends sit on `surfaceElevated`. Allow subtle gradient overlays for hero cards.
- **Bento grids** — widgets should compose well when stacked. Padding, gap, and radius should harmonize so two side-by-side cards look like a set, not collisions.
- **Rich tooltips** — Recharts default tooltip is replaced. Tokens drive the bg, border, shadow, type, and motion of every tooltip.

### 3.3 Brand voice for typography

Sigil = "compressed meaning in a glyph". The type system should feel **precise and quiet**:

- Numerals are the protagonists. Prefer **tabular numerals** (`font-variant-numeric: tabular-nums`) wherever values are listed.
- Labels are supporting cast — small, secondary color, generous letter-spacing at small sizes.
- No display-weight headlines inside widgets; widgets live inside someone else's UI.

---

## 4. Current token surface (starting point)

Defined in [src/widgets/shared/theme.ts](../src/widgets/shared/theme.ts). Summary:

| Category | Present | Token names |
|---|---|---|
| Series palette | 10 colors, shared across themes | `--sigil-series-0…9` |
| Surface neutrals | 2 (bg + surface) | `--sigil-bg`, `--sigil-surface` |
| Text | 3 tiers (primary/secondary/muted) | `--sigil-text`, `--sigil-text-secondary`, `--sigil-text-muted` |
| Grid + axis | 2 | `--sigil-grid`, `--sigil-axis` |
| Tooltip | 3 (bg/border/text) | `--sigil-tooltip-bg/-border/-text` |
| Radius | 1 (6px flat) | `--sigil-radius` |
| Typography | 1 family + 3 sizes (label/title/tooltip) | `--sigil-font-family`, `--sigil-font-label/-title/-tooltip` |

Distribution: `installThemeStyles()` injects a `<style>` element with `:root { … }` plus a `@media (prefers-color-scheme: dark)` override. No JS runtime theme switching — `prefers-color-scheme` is canonical.

---

## 5. Target token surface (what Claude Design should fill in)

This is the **structural shape** we want. Names are suggestions; Claude Design may refine. The goal is to retain CSS-variable distribution so existing `var(--sigil-*)` usage in `styles.css` keeps working — *add*, don't *replace*.

### 5.1 Color

- **Series palette** — keep 10. Re-tune for Apple-leaning hues if needed (currently Tailwind-ish saturated). Provide *paired* light/dark variants if perceptually necessary (currently shared — that's a constraint to break only with reason).
- **Semantic colors** — `success`, `warning`, `danger`, `info`. Each as a *triplet*: surface tint, border, text. Currently only a hardcoded `#EF4444` lives in [styles.css:77](../src/widgets/shared/styles.css).
- **Layered surfaces** — at least `bg`, `surface`, `surfaceElevated`, `surfaceSunken`. Each in light + dark.
- **Borders** — `borderSubtle`, `borderDefault`, `borderStrong`. Hairline-friendly values.

### 5.2 Spacing

A scale on a 4px grid: `space.0` … `space.8` (or named: `xs`/`sm`/`md`/`lg`/`xl`/`2xl`). Used for padding, gap, stack rhythm. Must allow a compact density preset.

### 5.3 Density preset

Two presets — `compact` (default for chat) and `cozy`. A preset is a *mapping* over spacing + font-size + chart-axis-tick-density. Switching presets is a single token swap.

### 5.4 Radius scale

`radius.sm` (chips, tags) / `radius.md` (cards, tooltips) / `radius.lg` (hero containers) / `radius.full` (pills, avatars). Continuous-corner (squircle-like) values welcome — Apple lives in 10–22px.

### 5.5 Elevation / shadow

Three levels: `elevation.low` (resting card), `elevation.mid` (tooltip), `elevation.high` (popover, modal — even if we don't ship modals yet). Each shadow is **layered** (1 ambient + 1 directional) — not a single CSS shadow.

### 5.6 Motion

- `motion.duration.fast` (~120ms) / `base` (~200ms) / `slow` (~320ms).
- `motion.easing.standard` (ease-out cubic) / `emphasized` (spring-like cubic-bezier) / `linear`.
- Tokens used by: hover transitions, tooltip fade, skeleton shimmer, focus ring bloom.

### 5.7 Focus ring

Critical for a11y and "premium tell". A token bundle: `focusRing.width` / `focusRing.color` / `focusRing.offset`. Should be visible on light **and** dark, on any series color background.

### 5.8 Typography scale

Beyond size, add: **weight** (regular/medium/semibold), **line-height** per scale step, **letter-spacing** at small sizes. Tabular-numerals flag for value-bearing text.

### 5.9 State colors

Hover / active / focus / disabled / selected modifiers expressed as token *modulations* (alpha overlays or color-mix) — not separate hex values per state per token. Goal: any token can be `hovered()` without exploding the palette.

---

## 6. Components Claude Design should produce

All as React + inline-style components consuming `--sigil-*` variables. All must work in single-file bundle.

### 6.1 Cross-widget primitives (`shared/`)

1. **`<Card>`** — the chrome around every widget. Bg, radius, optional elevation, optional padding via density preset. Used by `mountWidget` to wrap every widget.
2. **`<Tooltip>`** — Recharts-compatible tooltip component. Header (label), rows (series swatch + label + tabular value), optional footer. Animated entrance per `motion.duration.fast`.
3. **`<Legend>`** — series swatch + name; supports click-to-toggle, hover-to-emphasize.
4. **`<EmptyState>`** — icon-glyph + headline + sub. Used when payload is valid but empty.
5. **`<LoadingSkeleton>`** — shimmer rectangles approximating the widget layout. Required for skeleton loaders premium tell.
6. **`<Toolbar>`** — already exists at [src/widgets/shared/Toolbar.tsx](../src/widgets/shared/Toolbar.tsx). Re-skin to match new tokens.
7. **`<ValueText>`** — typography primitive that auto-applies tabular numerals.

### 6.2 Chart sub-primitives (per chart type)

8. **`<AxisLabel>` / `<TickLabel>`** — typography + token-driven, replacing Recharts defaults.
9. **`<GridLines>`** — Recharts `<CartesianGrid>` wrapper that pulls from tokens.
10. **`<SeriesSwatch>`** — circular/square color chip used in legends and tooltips.

### 6.3 Not in scope (do not design)

- Navigation, search, modals, forms, settings panels, login.
- Anything that breaks the iframe sandbox (no portals to host DOM).
- A documentation site theme — `sigil.live` is separate.

---

## 7. Handoff expectations

When Claude Design packages a handoff bundle, optimal shape for our codebase:

- **Token output** as a TypeScript module that *augments* [`src/widgets/shared/theme.ts`](../src/widgets/shared/theme.ts) — add new interfaces and exported objects, preserve the existing `light` / `dark` exports and `installThemeStyles()` so existing usages don't break.
- **Components** as `.tsx` files dropped into [`src/widgets/shared/`](../src/widgets/shared/) — one component per file, named-export, consuming `--sigil-*` CSS variables (or imported token objects).
- **No external dependencies** beyond what's in [package.json](../package.json): `react`, `recharts`. No Radix, no Framer Motion, no Tailwind, no clsx. Motion via CSS transitions/keyframes only.
- **Visual examples** as standalone HTML or a Storybook-style index would be welcome; if produced, place them under a new `design/` directory (not shipped).

---

## 8. Acceptance criteria for the new system

A pull request integrating Claude Design's handoff is "done" when:

1. All 7 existing widgets still render correctly in light + dark, with no visible regressions.
2. The token surface in `theme.ts` covers the categories listed in §5.
3. Every cross-widget primitive in §6.1 exists in `shared/` and is consumed by at least one widget.
4. Density preset switching is demonstrable: changing one token swaps `compact` ↔ `cozy` for all widgets.
5. The vitest harness ([src/__tests__/](../src/__tests__/)) still passes; new tests added for any new shared logic.
6. Bundle size per widget is documented in the PR but not gated — premium > bytes for this product.
7. A new entry in [TESTING.md](../TESTING.md) describes how to visually QA the design system across chat hosts.

---

## 9. Open questions for Claude Design to surface

The author of this brief expects Claude Design to push back on at least:

- Whether the series palette stays shared across light/dark or splits — perceptual contrast may demand the split for some hues.
- Whether `cozy` is worth shipping at all if chat windows are the only target.
- Whether tooltips should use frosted-glass (`backdrop-filter: blur()`) — iframe sandbox may restrict this in some hosts.
- The right `focusRing.color` given the indigo brand accent (`#6366F1`) — currently no explicit brand-color token exists separate from `series-0`.

---

*Last updated: 2026-05-14. Maintained by the Sigil author. Update before each re-run of Claude Design ingestion.*
