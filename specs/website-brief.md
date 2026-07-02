# Sigil — Website Design Brief for Claude Design

> **Purpose.** This document is the ingestion brief for [Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs) covering the **marketing site at [sigil.live](https://sigil.live)** — explicitly out of scope for the widget [design-system brief](./design-system-brief.md) (see its §6.3). Pair this file with the repository when running Claude Design's onboarding flow. It is a sibling of `design-system-brief.md`; the two should read as one matched set, and the site must look like the same brand as the widgets it advertises.

> **Status (2026-07-02).** Written when the widget set counted 7. The shipped set is now **10** (adds `stat-panel`, `dashboard`, `map`), so the gallery counts and the "3 of 7 widgets have no incantation" dependency below should be re-scoped (now 6 of 10) when this brief is next taken up.

---

## 1. Product context

**Sigil** is an MCP Apps server that ships **live, interactive chart widgets** for AI hosts (Claude Desktop, Claude web, VS Code Copilot, etc.). Unlike chart MCPs that return PNGs, every Sigil widget is a React app sandboxed inside the host's iframe, with hover tooltips, click-to-highlight, Copy-as-CSV, and Copy-as-PNG. See [README.md](../README.md) and [SPEC.md](../SPEC.md).

**Tagline.** *A sigil is a symbol that carries compressed meaning. Same idea, applied to data.*

**The one differentiator that drives everything.** Competing chart MCPs emit **static images**. Sigil emits **live widgets**. The website must *be* the proof of that claim, not merely assert it — see §6 (the live gallery is the centerpiece, not a feature row).

**Widget set (v0.2.0, 7 total).** `bar-chart`, `line-chart`, `pie-chart`, `scatter-chart`, `treemap`, `heatmap`, `table`. Registered in [src/registry.ts](../src/registry.ts).

**Audience.** Developers and data-literate professionals who already use Claude / ChatGPT / Copilot and work with numeric data — analysts, managers, engineers, researchers (SPEC §1.3). They are skeptical of marketing, fluent in dev-tool landing pages, and convert on *seeing the thing work*, not on adjectives.

---

## 2. Site goals & success signals

| Priority | Goal | How the design serves it |
|---|---|---|
| **1 — primary** | Make a first-time visitor *feel* the interactivity within seconds. **The hero leads with a live, hands-on widget**, not a screenshot or headline-over-gradient. | Hero = working widget the visitor can hover/click immediately. CTA hierarchy: **try it → install**. |
| 2 | Convert the "wow" into an install. | A copy-paste install block (Claude Desktop / VS Code / Claude web tabs) is always one scroll or one anchor-jump away, and re-appears near the bottom. |
| 3 | Bank social proof → GitHub stars. | A GitHub star affordance in the nav and footer; room for a star count / "first interactive charts for Claude" positioning line. Tie to SPEC §1.4 / §12 (100+ stars in month one). |

These are a hierarchy, not a menu — when two goals compete for the same pixels, the higher one wins. The decided lead is **live demo first, install second** (per author direction).

---

## 3. Render targets & constraints

### 3.1 This is a full screen, not a chat window

The widget brief's defining constraint — a 600–800px tall-and-narrow iframe — **does not apply here**. The site is a real marketing page: design desktop-first with full-bleed composition room, then make it degrade gracefully to tablet and mobile. *But* the widgets embedded on the page still carry their own narrow-canvas constraint inside their frames (see §6.3).

- **Breakpoints:** desktop-lead (≈1280px design width), responsive down to ~360px mobile.
- **Light/dark:** must support both, driven by `prefers-color-scheme`, with an explicit toggle (the live gallery already lets users flip theme — the page chrome should honor the same switch). Dark is a strong candidate for the *default* given the brand — flag in §11.
- **Performance budget:** a marketing page that embeds live React widgets must still feel instant. Lazy-mount widgets below the fold; the hero widget is the only one allowed to block first paint. Target a fast LCP on the hero.
- **SEO / social:** the page needs real `<title>`/meta, Open Graph + Twitter card images (a still of a Sigil widget), and crawlable text — even though the centerpiece is interactive. Don't let "it's all canvas/SVG" hide the value prop from crawlers.
- **Accessibility:** WCAG AA contrast in both themes, visible focus rings (reuse the design-system `focusRing` token), keyboard-operable gallery controls, `prefers-reduced-motion` honored for every animation in §5/§7.

### 3.2 Live-widget embedding (the load-bearing constraint)

The site shows **real, running widgets** (author decision — not GIFs). There are two viable mechanisms; Claude Design should design assuming the first and treat the second as a fidelity upgrade for the hero only:

1. **Direct `View`-import (recommended, low-risk).** The in-browser sandbox already does exactly what the gallery needs: it imports each widget's pure presentational `View` component and passes a `payload` prop directly, bypassing all MCP/`postMessage` plumbing — see [Sandbox.tsx:151](../src/widgets/sandbox/Sandbox.tsx) and [widget-shell.tsx:42](../src/widgets/shared/widget-shell.tsx) (`mountWidget` is the MCP wrapper around the same `View`). The site reuses this: a React page imports the widgets and the per-widget preset datasets in [src/widgets/sandbox/datasets/](../src/widgets/sandbox/datasets/). **This means the gallery is design-equivalent to a polished sandbox.**
2. **Iframe + host-shim (max authenticity, hero only).** Embed the *shipped* single-file HTML bundle in an `<iframe>` and have the page play MCP host — post the payload via the `app.ontoolresult` JSON-RPC-over-`postMessage` handshake `mountWidget` expects. The visitor then sees the literal production artifact (sandbox isolation included). More engineering; reserve for the hero if we want the "this is the real thing" tell.

Design implication: the gallery frame must look intentional whether the widget inside is `View`-imported or iframed — i.e. design a **widget stage / chrome** (see §7) that frames either cleanly.

### 3.3 Tech stack for the site (context, not a design ask)

The site's *implementation* stack is not Claude Design's deliverable, but two facts shape the design: (a) it must reuse the widget design tokens (§4) so site and widgets are one family, and (b) it embeds React widgets, so a React-capable static framework (Astro/Next/Vite SPA) is implied. Don't design anything that can only exist in a non-React runtime.

---

## 4. Brand direction — **quiet premium** (author decision)

The site **mirrors the widget design system**. It is the same restrained, precise, Apple/Material-leaning language already defined in [theme.ts](../src/widgets/shared/theme.ts) and [design-system-tokens.json](./design-system-tokens.json) — scaled up from a 600px card to a full page. The occult/ritual layer of the brand is **not** site decoration — it lives **inside the widgets themselves**. Ritual mode makes each widget render a visible incantation caption *in the host chat*: e.g. a bar chart titled *"Astrologers proclaim a week of bar charts."* in place of *"Q1 Sales by Region"* (see [INCANTATIONS.md](../INCANTATIONS.md), "Response register"). On the site that layer stays a **whisper** — surfaced only as an opt-in toggle on the live gallery (§6.1), never as page-wide theming:

- The sigil **mark** can be a quiet, geometric, precise glyph — a logo, not a wizard.
- Ritual mode is **shown, not explained**: a single gallery toggle (default **off**) flips the live widgets into ritual register by reusing the widgets' own render-time captions — no standalone "fantasy" section, no how-to-incant tutorial. It must never make the page read as a fantasy game site to a skeptical engineer.
- No mystical color schemes, no serif-fantasy display type, no parchment textures. Precision *is* the mood; ritual mode rides on top of it as a reveal, not a reskin.

### 4.1 Token reuse (non-negotiable)

The site's color, type, spacing, radius, elevation, and motion **start from the existing `--sigil-*` token surface**, then *extend* it with page-only tokens (e.g. larger display type steps, hero spacing, max-width container scale) — the same "add, don't replace" rule the design-system brief used in its §5. A visitor flipping between a widget and the surrounding page should perceive zero seam.

### 4.2 References

| Reference | What we want from it |
|---|---|
| **Apple product pages** (iOS feature pages, Apple Card) | Generous negative space, layered soft surfaces, hairline borders, spring-eased reveals, type hierarchy by weight + line-height, large continuous corner radii. |
| **Linear / Vercel / Stripe docs & marketing** | Dev-credible polish: crisp install/code blocks with copy buttons, tab switchers, restrained accent color, dark-first option, fast-feeling micro-interactions. |
| **Sigil's own widget design system** | The literal source of truth for color/type/motion. The site is its enclosure, not a contrast to it. |

### 4.3 Premium "3-second tells" for the page

The design-system brief listed the tells that make a *widget* read as premium. The page-level equivalents Claude Design must bake in:

- **A live thing above the fold** that responds to the cursor before the visitor scrolls.
- **Frictionless copy** — install/code blocks with an unmistakable, satisfying copy affordance.
- **Layered depth** — page bg → section surface → elevated widget stage, with the same hairline borders and soft two-layer shadows as the widgets.
- **Motion that respects the reader** — entrance reveals on scroll, hover lift on cards, theme cross-fade; all `prefers-reduced-motion`-safe, none gratuitous.
- **Cohesion** — the widget on the page and the page around it share corners, shadows, and palette so they look manufactured together.

> **The one non-negotiable tell (author).** The hero widget must be **interactive within ~1 second of load** — no spinner, no "loading demo" placeholder. If the first widget a visitor meets makes them *wait*, the live-not-PNG promise dies on arrival. Every performance and layout trade-off bends to keep the hero instantly live.

---

## 5. Brand voice & key copy

The site's tone matches the README: confident, concrete, lightly literary, never breathless. Numerals and verbs over adjectives. Claude Design may propose layout-driven copy, but the **load-bearing line is the author's call**:

> **Hero value proposition (locked).** The main heading, verbatim — it stands alone, no explainer subhead:
>
> > *"Summon live, interactive charts into your AI chat."*

Supporting copy Claude Design can lay out around it: the tagline (§1), the per-widget one-liners from the README "Tools" table, the three install targets, and the ritual-mode whisper.

---

## 6. Information architecture (one-pager + live gallery)

Decided scope (author): **a single landing page whose centerpiece is an interactive gallery of all 7 widgets.** Not a multi-page docs site. Sections, top to bottom, each with its job:

1. **Nav** — wordmark + sigil glyph, anchor links (Demo · Widgets · Install · GitHub), theme toggle, GitHub star button. Sticky, thin, quiet.
2. **Hero** — the value-prop line (§5) + a **single live widget the visitor can immediately interact with**, plus a primary "Install" affordance. This is goal #1 made physical.
3. **The differentiator, shown not told** — a tight beat that contrasts "static PNG" vs "live Sigil widget" (ideally the same data, one dead image, one interactive). Keep it to one screen.
4. **Live gallery (centerpiece)** — see §6.1.
5. **Install** — tabbed copy-paste blocks: Claude Desktop, VS Code, Claude web (HTTP/connector). Mirrors README "Install" verbatim so it never drifts.
6. **Why it's different / feature beats** — interactivity, export (CSV/PNG), light-dark, single-file distribution, 7 widget types. Short, scannable, icon-light.
7. **Footer** — repeat install CTA, GitHub, npm, license (MIT), author/brand line, links to SPEC / TESTING. (Ritual mode gets no section of its own — it's *demonstrated* live via the gallery toggle in §6.1; the footer may carry a single one-line link to [INCANTATIONS.md](../INCANTATIONS.md) for the curious.)

### 6.1 The live gallery — design this most carefully

This section *is* the product demo. Requirements:

- **All 7 widgets**, each driven by a curated preset dataset from [src/widgets/sandbox/datasets/](../src/widgets/sandbox/datasets/) (bar, line, pie, table, scatter, treemap, heatmap — already exist, one file each).
- **Controls** the visitor operates: switch widget type, switch dataset, toggle theme, and toggle **ritual mode** (default off). The first three mirror the sandbox's curated subset (viewport/debug are dev-only — drop them). Ritual mode is the brand's "one whisper": flipping it on makes each live widget render its incantation caption (§4) in place of its plain title — the *same* render-time behavior the widget shows inside a real chat, not a site-only overlay.
- **A widget "stage"** — the framed surface a widget sits in (see §7) — that reads as deliberate product chrome, not a raw embed, and frames either a `View`-import or an iframe identically (§3.2).
- **Real interactivity preserved** — hover tooltips, click-to-highlight, the Copy-CSV / Copy-PNG toolbar must all work in the gallery. If they don't, the section defeats its own purpose.
- **Graceful empty/loading** — reuse the widgets' own `EmptyState` / `LoadingSkeleton` so the gallery degrades like the product does.
- **Dependency — ritual captions are a *widget* feature, not a site feature.** Because the caption must be visible *in the host chat*, it renders **inside the widget**, which makes it owned by [design-system-brief.md](./design-system-brief.md) — the site only *toggles* it. Two things must land there before this gallery toggle can ship: (1) widgets need a render-time "ritual title" slot; (2) **3 of 7 widgets have no incantation yet** — [INCANTATIONS.md](../INCANTATIONS.md) covers bar/line/pie/table only, so scatter/treemap/heatmap are unwritten. Resolve before handoff: extend INCANTATIONS.md with three new incantations, or scope ritual mode to the original four.

---

## 7. Components Claude Design should produce

Page-level components (distinct from the widget primitives the design-system brief already covers). All consume the shared `--sigil-*` tokens plus page-only extensions (§4.1).

1. **`<SiteNav>`** — sticky thin bar: wordmark + glyph, anchor links, theme toggle, GitHub-star button. Collapses to a minimal mobile variant.
2. **`<Hero>`** — value-prop line, live widget slot, primary CTA. Defines the page's vertical rhythm and the largest type step.
3. **`<WidgetStage>`** — the framed surface that wraps any embedded widget (hero + gallery). Token-driven bg, hairline border, radius, two-layer elevation; sizes the inner widget to its narrow-canvas constraint (§3.1) while sitting in a wide page.
4. **`<GalleryControls>`** — the curated widget / dataset / theme / **ritual-mode** switcher (segmented controls or selects; ritual mode is a single toggle, default off). Keyboard-operable, visible focus, mobile-friendly.
5. **`<InstallBlock>`** — tabbed (Desktop / VS Code / Web) code panel with a copy button and copy-confirmation micro-interaction. The single most important conversion component.
6. **`<FeatureCard>`** / feature grid — the §6.6 beats; bento-friendly, harmonized padding/gap/radius with `<WidgetStage>` so they read as a set.
7. **`<StaticVsLive>`** — the side-by-side "dead PNG vs live widget" comparison unit.
8. **`<SiteFooter>`** — links, CTA repeat, license, brand line.
9. **`<SigilMark>`** — the wordmark + glyph lockup; the quiet, precise sigil logo (§4).
10. **Theme toggle + scroll-reveal motion utilities** — shared behaviors, `prefers-reduced-motion`-aware.

### 7.1 Not in scope (do not design)

- A multi-page docs/reference site, a blog, search, auth, dashboards, settings.
- Anything that re-skins the **widgets themselves** — those are owned by [design-system-brief.md](./design-system-brief.md). This brief designs their *enclosure*.
- New widget types or new chart UX.

---

## 8. Handoff expectations

Optimal shape for this codebase (mirrors the design-system handoff so the two integrate the same way):

- **Page-only tokens** as a TypeScript module that *augments* the existing token surface — new display-type steps, container max-widths, hero spacing, section rhythm — preserving every existing `--sigil-*` variable and `installThemeStyles()` so widgets keep working unchanged.
- **Components** as `.tsx` files for a React static-site stack (the framework is the author's choice; assume React, plain CSS / inline styles / CSS variables — **no Tailwind, no CSS-in-JS runtime, no Radix/Framer** unless the author opts in, to stay consistent with the widget constraint).
- **Motion via CSS** transitions/keyframes; `prefers-reduced-motion` branches included, not bolted on later.
- **A full-page comp** (light + dark, desktop + mobile) as the visual source of truth — standalone HTML or images under a `design/` directory (not shipped), consistent with the design-system brief's §7.
- **OG / social card** artwork as part of the bundle (§3.1).

---

## 9. Acceptance criteria

A PR integrating Claude Design's website handoff is "done" when:

1. The hero renders a **live, immediately-interactive** Sigil widget in both light and dark, with no blocking spinner.
2. The live gallery exposes all **7 widgets** with working widget / dataset / theme controls, and hover / click / Copy-CSV / Copy-PNG all function inside it.
3. Page chrome and embedded widgets share the **same token surface** — no visible seam between a widget and the page around it (§4.1).
4. Install blocks (Desktop / VS Code / Web) match [README.md](../README.md) exactly and copy to clipboard with confirmation.
5. The page passes WCAG AA contrast in both themes, is keyboard-operable, and honors `prefers-reduced-motion`.
6. Responsive from ~1280px down to ~360px with no broken gallery or overflow.
7. Real `<title>`/meta + OG/Twitter cards present; core value prop is in crawlable text.
8. Lighthouse performance on the hero is documented in the PR (lazy-mount below-fold widgets); not gated, but measured.

---

## 10. Open questions for Claude Design to surface

The author expects push-back on at least:

- **Default theme** — should the site default to **dark** (stronger fit for the "sigil" brand and most dev tools) or follow `prefers-color-scheme` with a neutral light default?
- **Live mechanism for the hero** — is the iframe + host-shim authenticity (§3.2 option 2) worth the engineering, or is a `View`-import (option 1) indistinguishable to a visitor and therefore the right call everywhere?
- **Ritual mode scope & ownership** — settled as a gallery toggle (default off) that reuses the widgets' render-time incantation captions (§4, §6.1), not a standalone section. Still open: extend [INCANTATIONS.md](../INCANTATIONS.md) to all 7 widgets, or scope the toggle to the original four (bar/line/pie/table)? And since the caption renders *inside* the widget to be visible in the host chat, the "ritual title" slot is a widget feature — should it be specced wholesale in [design-system-brief.md](./design-system-brief.md), with this brief only consuming the toggle?
- **Static-vs-live unit** — does the explicit "dead PNG vs live widget" comparison (§6.3) land as confident, or as defensive/competitor-baiting? Propose the framing.
- **Gallery density** — show all 7 widgets at once (grid) or one-at-a-time with a switcher? Trade-off: instant breadth vs. focused interactivity.

---

*Last updated: 2026-06-05. Maintained by the Sigil author. Pairs with [design-system-brief.md](./design-system-brief.md); update both before re-running Claude Design ingestion. Both author-input blocks (§4.3 hero tell, §5 hero line) are resolved.*
