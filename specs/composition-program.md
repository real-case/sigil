# Sigil — Composition Program

> Feature work that extends Sigil from **eleven independent widgets** to a set that can express **combinations, cards, and panels**. Each entry below is a self-contained, PR-sized chunk of work sized to one Marvin task spec.
>
> Scope comes from four requested areas: complex chart combinations, information cards, panels, and new chart types. The program adds a fifth, **foundations** — consolidations and integrity fixes that every later item would otherwise re-pay.
>
> **Status: open (drafted 2026-08-09).** No item started. Order and dependencies are in "Suggested order"; each item's banner is updated on delivery, following the [design-system follow-ups](./design-system-followups.md) precedent.

---

## Why a program, not one PR

The four requested areas are not independent. Multi-series bars, a combo chart, and every new chart type all need the same legend-state machine; every card variant needs the same sparkline geometry; every new widget lands in the same five hand-maintained lists. Shipping the visible features first means re-implementing those foundations three to six times and discovering the list drift late — the failure shape [`.marvin/memory`](../.marvin/memory/MEMORY.md) already records three times over.

The program is therefore staged: foundations, then composition, then panels, then cards, then new chart types. Stages 2–5 are independently orderable once stage 1 lands.

---

## Design rules for this program

Rules that apply to every item; a spec that breaks one must say so explicitly.

1. **Extend tools before minting them.** Sigil already exposes eleven `render_*` tools. Host tool-selection accuracy degrades as that list grows, so a new data shape ships as a *variant or optional field on an existing tool* whenever it can (`render_bar_chart` gaining `series` + `stack`, `render_heatmap` gaining a calendar variant). A new tool is justified only when no existing tool's mental model covers the shape — the same bar the `sankey` widget had to clear.
2. **Additive payloads only.** Every payload change keeps existing payloads valid and rendering identically. Widgets are addressed by LLMs from tool descriptions; a breaking change silently breaks prompts in the wild.
3. **Guard in the view, not only in zod.** Dashboard tiles pass `payload` as `z.record(z.string(), z.unknown())` and bypass the tool schema entirely ([tools/dashboard.ts:43](../src/tools/dashboard.ts)). Any invariant that matters must be enforced where the view can see it — the rule `sankey` established.
4. **Pin every hand-maintained mirror against `WIDGETS` in the same change.** And verify the new pin fails without the fix before accepting it.
5. **No new runtime dependencies** unless the item says otherwise. Recharts 3.10.1 already ships `ComposedChart`, `RadarChart`, `FunnelChart`, `RadialBarChart`, `SunburstChart` and `Sankey`; the single-file bundle constraint makes every added package a per-widget cost.

---

# Stage 1 — Foundations

## 1. Dashboard tile resilience

> ✅ Shipped — spec [`007-dashboard-tile-resilience`](../.marvin/task/007-dashboard-tile-resilience.md) · PR [#54](https://github.com/real-case/sigil/pull/54)
>
> **As-shipped deltas versus this sketch:**
> - The sketch missed a **live bug**: `isDashboardPayload`'s hardcoded tile-type set had drifted two entries behind the registry, so any `render_dashboard` call containing a `sankey` or `map` tile was rejected at mount and the whole dashboard failed to load. Invisible in the sandbox and Storybook, which render `DashboardView` directly.
> - Rather than *deriving* `WIDGET_VIEWS`-backed tile types as the sketch implies, the guard's type set was **deleted outright** — a tile now needs only a non-empty string `type`. Which types render is `Tile`'s business, so an unknown type (a newer server against a cached older bundle) costs one tile instead of the dashboard. That removes one of the five hand-maintained mirrors listed in item 2 and pins a second.
> - `lookupWidgetView` own-property-checks: `WIDGET_VIEWS` is an object literal, so a bare index answers `"toString"` with a truthy inherited function and the resulting `TypeError` escapes *above* the boundary. Deleting the type set is what made that reachable.
> - A fourth failure mode was added beyond the sketch's three: `type: "dashboard"` renders a distinct **Nested dashboard** card rather than the generic unknown-widget one.
> - Guard extraction covers **eleven** modules (the ten tile widgets plus the dashboard's own), not ten.
> - Test harness widened to collect `*.test.tsx` so `DashboardView` can be server-rendered in tests; no new dependency (`tsconfig`'s `jsx: react-jsx` covers the transform). React 19 does not route a throw through an error boundary under `renderToString`, so boundary containment is proven by a pure contract test plus a wiring assertion instead.
> - Suite 323 → 371 tests.

**Task slug:** `dashboard-tile-resilience` · risk: medium · breaking: no · stack: typescript, react

**Current behavior:** [`DashboardView`](../src/widgets/dashboard/DashboardView.tsx) renders each tile by looking its type up in `WIDGET_VIEWS` and passing `tile.payload as never` straight into the view. The `isXPayload` guards live in each widget's `App.tsx` and run only on the standalone mount path, so a tile never sees them. There is no error boundary anywhere in the repo (`grep -r componentDidCatch src` — no matches). A tile whose payload is missing a required array therefore throws inside render and unmounts the **entire** dashboard, not just that tile. Only `sankey` is protected, by its own in-view validation.

**Desired behavior:** a malformed tile degrades to an inline error card naming the tile type and the reason; sibling tiles render normally.

- Extract each widget's payload guard out of `App.tsx` into a side-effect-free module the dashboard can import (`src/widgets/<name>/guard.ts`), leaving `App.tsx` importing it.
- `WIDGET_VIEWS` becomes a type → `{ View, isPayload }` map so `DashboardView` can validate before rendering; an invalid payload renders the existing `EmptyState variant="error"` instead of the view.
- Add a small class-component error boundary wrapping each tile, so a runtime throw inside a *valid-looking* payload is still contained.

**Files to touch:** ten `src/widgets/*/App.tsx` (guard extraction) + ten new `guard.ts`, [`widget-views.ts`](../src/widgets/shared/widget-views.ts), [`DashboardView.tsx`](../src/widgets/dashboard/DashboardView.tsx), one new shared `TileBoundary.tsx`.

**Test coverage:** per-widget guard modules become directly unit-testable (they are today reachable only through `App.tsx`); dashboard tests for an invalid tile payload, an unknown tile type, and a throwing view.

**Depends on:** nothing. **Blocks:** nothing hard, but every later dashboard item is safer behind it.

---

## 2. Registry-derived widget lists

> ⏳ Open

**Task slug:** `widget-registry-derivation` · risk: low · breaking: no · stack: typescript

**Current behavior:** the widget set is mirrored by hand in five places, of which only two are pinned:

| Mirror | Pinned against `WIDGETS`? |
|---|---|
| [`WIDGET_VIEWS`](../src/widgets/shared/widget-views.ts) | **no** |
| [`DashboardTileType`](../src/shared/payloads.ts) | **no** |
| tile-type zod enum in [`tools/dashboard.ts`](../src/tools/dashboard.ts) | **no** |
| `.design-sync/entry.tsx` exports + `config.json` titleMap | yes — `design-sync-config.test.ts` (PR #53) |
| hardcoded name array in `registry.test.ts` | it *is* the pin |

This program adds four to six widgets. Each addition currently walks five lists, and three of them fail silently — the exact shape recorded three times in the Marvin lessons (`dtsPropsFor` without `entry.tsx`; the tile-type enum without a dashboard preset).

Separately, [`CLAUDE.md`](../CLAUDE.md) claims *"When adding a new widget, only create new files; the registry pattern means no enumeration list needs editing."* That is false today — at minimum `registry.ts` and the three unpinned mirrors need edits.

**Desired behavior:** derive what can be derived and pin the rest.

- `DashboardTileType` derived from `WIDGETS` rather than re-listed, with `dashboard` excluded structurally (no dashboard-in-dashboard).
- The `render_dashboard` tile-type zod enum built from the same source instead of a literal array.
- A test asserting `WIDGET_VIEWS` keys ≡ registry names minus `dashboard`, in both directions.
- `CLAUDE.md` corrected to state what adding a widget actually touches.

**Test coverage:** one new pin per mirror; each must be verified to fail against the current tree before the fix (rule 4).

**Depends on:** none — but land it *before* the new chart types so they benefit. **Blocks:** items 11–15 in practice.

---

## 3. Shared sparkline geometry

> ⏳ Open

**Task slug:** `shared-sparkline-geometry` · risk: low · breaking: no · stack: typescript, react

Parked consolidation, already recorded in [design-system-followups](./design-system-followups.md). Sparkline geometry exists twice today — the area+line card spark in [`StatPanelView.tsx:59`](../src/widgets/stat-panel/StatPanelView.tsx) (100×28, gradient fill, non-scaling stroke) and the pure `sparkPoints` polyline helper in [`src/widgets/table/cells.ts`](../src/widgets/table/cells.ts) (56×16, asymmetric inset, `.toFixed(2)`). Deliberately not shared when the table version shipped (spec 004 rejected reuse as V3); the info-card items would add a third copy, which is where the cost flips.

**Desired behavior:** one geometry module (normalization, padding, point emission, constant-series and single-point cases) with both existing call sites as thin presentational wrappers over it. Rendered output must stay byte-identical for both consumers — this is a refactor, not a redesign.

**Test coverage:** the existing `table-cells.test.ts` assertions move onto the shared module unchanged; add stat-panel geometry cases at its own dimensions.

**Depends on:** nothing. **Blocks:** items 9 and 10 (cards).

---

## 4. Shared legend state

> ⏳ Open

**Task slug:** `use-legend-state` · risk: low · breaking: no · stack: typescript, react

Parked consolidation, recorded as the honest residual of follow-up item 5: [`ValueLegend`](../src/widgets/shared/ValueLegend.tsx) shares the chrome, but the `focused` / `muted` / `toggleMute` / `opacityFor` state machine is duplicated near-verbatim in all four consumers ([line:77](../src/widgets/line-chart/LineChartView.tsx), [bar:98](../src/widgets/bar-chart/BarChartView.tsx), pie:64, scatter:45), differing only in the unfocused-opacity constant (0.2 line/scatter, 0.32 bar/pie).

**Desired behavior:** a `useLegendState({ unfocusedOpacity })` hook returning `{ focused, muted, setFocused, toggleMute, opacityFor }`, adopted by all four consumers with **no** behavioral change — the per-widget opacity difference stays a parameter, not a normalization.

**Test coverage:** hook unit tests for focus, mute, combined precedence (muted wins over focused), and the two opacity profiles.

**Depends on:** nothing. **Blocks:** items 5, 7, and each new chart type — otherwise the duplication reaches eight copies.

---

# Stage 2 — Complex chart combinations

## 5. Multi-series and stacked bars

> ⏳ Open

**Task slug:** `bar-multi-series` · risk: medium · breaking: no · stack: typescript, react

**Current behavior:** [`BarChartPayload.data: BarDatum[]`](../src/shared/payloads.ts) is single-series. `grep -rn stackId src` returns nothing — there are no grouped and no stacked bars anywhere in Sigil. "Revenue by region by quarter" is expressible only as a dashboard of N bar charts or a table.

**Desired behavior:** `render_bar_chart` additionally accepts `series?: { name, data: BarDatum[] }[]` (the shape line and scatter already use) plus `stack?: "none" | "normal" | "percent"`, defaulting to `"none"` (grouped). `data` keeps working untouched and stays the single-series fast path.

Interactions to resolve in the spec, not left to the implementer: which mode the header KPI reports; how the existing pill-mode look (lane tracks, value labels at bar ends, hidden numeric axis — the redesign's default) degrades for grouped and stacked bars, where per-bar end labels collide; whether `percent` reuses the pie chart's share formatting; and whether `BarDatum.color` or the series palette wins.

**Files to touch:** [`payloads.ts`](../src/shared/payloads.ts), [`tools/bar-chart.ts`](../src/tools/bar-chart.ts), [`BarChartView.tsx`](../src/widgets/bar-chart/BarChartView.tsx), sandbox datasets, stories, README tool reference.

**Test coverage:** payload guard for both shapes and their mutual exclusivity; a pure layout/normalization module for the percent mode; e2e round-trip through the tool for a stacked payload.

**Depends on:** item 4 (legend state). **Blocks:** items 7, 11 — waterfall is a stacked bar with an invisible base.

---

## 6. Reference lines and bands

> ⏳ Open

**Task slug:** `chart-reference-layer` · risk: low · breaking: no · stack: typescript, react

**Current behavior:** Recharts' `ReferenceLine` is imported in exactly one place — [`BarChartView.tsx:351`](../src/widgets/bar-chart/BarChartView.tsx), drawing the zero line for mixed-sign data. There is no way to express a target line, a threshold band, an average, an annotated event, or a forecast boundary in any widget.

**Desired behavior:** a shared, opt-in payload field carried by bar, line and scatter:

```ts
reference?: Array<{
  axis: "x" | "y";
  kind: "line" | "band";
  value?: number | string;        // line
  from?: number | string;         // band
  to?: number | string;           // band
  label?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}>
```

Rendered by one shared component so tone → token mapping, label placement, and dark/light behavior are defined once. The bar chart's existing zero line stays as-is (it is derived, not authored).

**Test coverage:** unit tests for tone → token resolution and label placement; guard tests for a band missing `to`; visual coverage via a sandbox preset per kind.

**Depends on:** nothing. **Blocks:** nothing, but item 7 is much more useful with it.

---

## 7. Combo chart with a secondary axis

> ⏳ Open

**Task slug:** `combo-chart` · risk: medium · breaking: no · stack: typescript, react

**Current behavior:** no widget puts two encodings on one plot. "Revenue as bars with a margin-percent line over it" — mixed units, mixed marks — is the most common composed business chart and Sigil cannot draw it.

**Desired behavior:** a twelfth widget, `render_combo_chart`, built on Recharts' `ComposedChart` (already bundled, no new dependency). This is the one item in the program that earns a new tool rather than a variant: neither `render_bar_chart` nor `render_line_chart` extends to per-series mark types and a second axis without becoming a different tool wearing the old name.

```ts
series: Array<{ name, mark: "bar" | "line" | "area", axis?: "left" | "right", data }>
```

Plus `xlabel`, `ylabel`, `ylabelRight`, and the item-6 `reference` field. Stacking within the bar marks is out of scope here — that lives in item 5.

**Files to touch:** new `src/tools/combo-chart.ts`, new `src/widgets/combo-chart/*`, [`registry.ts`](../src/registry.ts), plus whatever item 2 has not yet derived; `.design-sync/entry.tsx` + titleMap; README, SPEC, INCANTATIONS scope note, `TESTING.md` §A5 row.

**Test coverage:** guard for mark and axis enums; axis-assignment and domain unit tests; dashboard-tile coverage (a new preset — rule from PR #52).

**Depends on:** items 2, 4, ideally 5 and 6.

---

# Stage 3 — Panels

## 8. Responsive dashboard grid

> ⏳ Open

**Task slug:** `dashboard-responsive-grid` · risk: low · breaking: no · stack: react, css

**Current behavior:** the tile grid is inline-styled `repeat(${columns}, minmax(0, 1fr))` at [`DashboardView.tsx:32`](../src/widgets/dashboard/DashboardView.tsx) and does not respond to width at all. The container query at [`styles.css:185`](../src/widgets/shared/styles.css) governs the plot/legend split *inside* a widget and cannot reach the tile grid. In a narrow host panel a three- or four-column dashboard compresses to unreadable tiles — while `stat-panel`, which uses `auto-fit minmax(168px, 1fr)`, adapts correctly. `TESTING.md` §A5 already records the grid as "fixed, not responsive".

**Desired behavior:** `columns` becomes a *maximum*, with the effective count stepping down as the dashboard's own container narrows; `colSpan` clamps to the effective count so a `colSpan: 2` tile never overflows a single-column layout. Container queries, not viewport media queries — a dashboard can itself be a tile-sized surface.

**Test coverage:** pure unit tests for the columns/colSpan clamp; sandbox viewport presets at narrow widths for the visual half.

**Depends on:** nothing.

---

## 9. Dashboard sections and provenance

> ⏳ Open

**Task slug:** `dashboard-sections` · risk: medium · breaking: no · stack: typescript, react

**Current behavior:** a dashboard is a title plus a flat tile list. There is no way to group tiles under a subheading, annotate a tile, or state where the numbers came from — and no Sigil payload anywhere carries provenance.

**Desired behavior:** two additive changes.

- **Sections:** `tiles` may contain a section entry (`{ section: string, description?, tiles: [...] }`) alongside plain tiles, so a dashboard reads as "Traffic / Revenue / Health" rather than one undifferentiated grid. Nesting is one level only, mirroring the existing no-dashboard-in-dashboard rule.
- **Provenance:** an optional `note?`, `source?`, `asOf?` on the dashboard and on each tile, rendered as a muted footnote in the shared header/footer chrome.

Whether provenance should instead be a cross-widget field on every payload is the spec's first decision. Recommendation: dashboard-level here, cross-widget in a follow-up, so this item stays PR-sized.

**Depends on:** item 8 (both restructure the same render path — sequence them, do not parallelize).

---

# Stage 4 — Information cards

## 10. Info card widget — narrative and comparison

> ⏳ Open

**Task slug:** `info-card-narrative` · risk: medium · breaking: no · stack: typescript, react

**Current behavior:** the card vocabulary is exactly one shape — `stat-panel`'s label + value + delta + sparkline + progress + badge. The forms an LLM most naturally produces have no widget at all: a claim with supporting evidence, or a side-by-side comparison of two things. Both fall back to plain Markdown and leave the design system entirely.

**Desired behavior:** a `render_info_card` tool with a `variant` discriminator, shipping two variants first:

- `narrative` — headline claim, optional supporting rows (`label`/`value`/`tone`), optional body text, optional `source` / `asOf` footnote.
- `comparison` — two (or more) named subjects with their values side by side and the derived difference between *them*, which is categorically different from `stat-panel`'s delta-versus-prior-period.

Variants ship additively over releases, the way `map` shipped choropleth → us-states → bubble.

**Depends on:** item 3 (shared sparkline geometry).

## 11. Info card widget — bullet and ranking

> ⏳ Open

**Task slug:** `info-card-bullet-ranking` · risk: low · breaking: no · stack: typescript, react

Two further variants on the same tool:

- `bullet` — actual against target against qualitative ranges. `stat-panel`'s `target` progress bar is the degenerate case; a bullet adds the comparative and range bands.
- `ranking` — top-N rows with a proportion meter. Notably this shape is **already implemented** inside [`ValueLegend`](../src/widgets/shared/ValueLegend.tsx) (name + swatch + formatted value + meter) and simply never exposed as a widget — the spec should assess reusing it before drawing anything new.

**Depends on:** item 10 (same tool, same widget shell).

---

# Stage 5 — New chart types

Ordered by "shape no existing widget can express" — the criterion that picked `sankey` over funnel, radar and gauge.

## 12. Waterfall chart

> ⏳ Open

**Task slug:** `waterfall-chart` · risk: low · breaking: no · stack: typescript, react

Contribution-to-change: start value → signed steps → end value, the standard way a variance or bridge analysis is narrated. Nothing in Sigil expresses it. Implementable as a stacked bar with a transparent base segment, so it is cheap **after item 5** and expensive before it. Decide in the spec whether it ships as `render_bar_chart`'s `variant: "waterfall"` (rule 1) or its own tool; the payload wants `{ label, value, kind?: "delta" | "total" }`, which reads as a different tool to a model.

**Depends on:** item 5.

## 13. Timeline / Gantt

> ⏳ Open

**Task slug:** `timeline-chart` · risk: medium · breaking: no · stack: typescript, react

Intervals in time — schedules, phases, incident windows, availability. No Sigil widget takes a `{ start, end }` pair; the closest is a horizontal bar, which cannot express an offset start. Floating horizontal bars grouped by row, with optional milestone markers. Needs a date-axis decision (ISO strings versus numeric epochs — line-chart's numeric/categorical split is the local precedent).

**Depends on:** items 2, 4.

## 14. Distribution — box plot and histogram

> ⏳ Open

**Task slug:** `distribution-chart` · risk: medium · breaking: no · stack: typescript, react

Sigil can show a joint distribution (scatter) but not a marginal one: no spread, no quartiles, no outliers, no bucket counts. One tool with `variant: "box" | "histogram"`, accepting either raw `values: number[]` per group (widget computes quartiles/bins) or pre-computed summaries. Recharts has no native box plot — a custom `Bar` shape or a hand-rolled SVG in the `heatmap`/`map` tradition.

**Depends on:** items 2, 4.

## 15. Calendar heatmap

> ⏳ Open

**Task slug:** `heatmap-calendar-variant` · risk: low · breaking: no · stack: typescript, react

"Value per day over a year" — the single most-recognized heatmap form, and the current [`HeatmapPayload`](../src/shared/payloads.ts) cannot express it: it is an index-addressed matrix over `xLabels`/`yLabels` with no notion of dates. Ships as `render_heatmap`'s `variant: "calendar"` with `days: { date: string, value: number }[]` (rule 1 — same tool, same mental model, no twelfth entry in the tool list). Reuses the existing shared [`color-scale`](../src/widgets/shared/color-scale.tsx) intensity ramp and legend.

**Depends on:** nothing (item 2 helps).

---

## Suggested order

| # | Item | Stage | Depends on |
|---|---|---|---|
| 1 | `dashboard-tile-resilience` | foundations | — |
| 2 | `widget-registry-derivation` | foundations | — |
| 3 | `shared-sparkline-geometry` | foundations | — |
| 4 | `use-legend-state` | foundations | — |
| 5 | `bar-multi-series` | combinations | 4 |
| 6 | `chart-reference-layer` | combinations | — |
| 7 | `combo-chart` | combinations | 2, 4, (5, 6) |
| 8 | `dashboard-responsive-grid` | panels | — |
| 9 | `dashboard-sections` | panels | 8 |
| 10 | `info-card-narrative` | cards | 3 |
| 11 | `info-card-bullet-ranking` | cards | 10 |
| 12 | `waterfall-chart` | chart types | 5 |
| 13 | `timeline-chart` | chart types | 2, 4 |
| 14 | `distribution-chart` | chart types | 2, 4 |
| 15 | `heatmap-calendar-variant` | chart types | — |

Items 1–4 are genuinely independent of each other and can run in any order or in parallel. After them, the three tracks (5–7, 8–9, 10–11) are independent; stage 5 draws on stage 2's output.

**Minimum viable slice**, if the whole program is too much: items 4, 5, 6 — legend-state consolidation, multi-series and stacked bars, and the reference layer. That trio closes the most conspicuous expressiveness gap and makes waterfall and bullet nearly free later.

---

## Working this program with the Marvin task pipeline

Each item maps to one task cycle:

```
/marvin:task-start <slug>      # dialogue → immutable spec at .marvin/task/NNN-<slug>.md
/marvin:task-implement         # execute the spec
/marvin:task-verify            # typecheck + tests + build → verification.md
/marvin:task-deliver           # commit + PR to dev
```

Conventions this repo already enforces, which every spec inherits:

- Spec numbers are allocated at `task-start` time in start order; specs 001–006 exist, so the first item started here becomes 007. This document deliberately carries slugs only.
- Specs are immutable once sealed (`contract_sha`); the file allowlist in the spec contract is the scope gate.
- Gates: `npm run typecheck`, `npm test`, `npm run build`. CI runs CodeQL and CodeRabbit only — **it does not run the test suite**, so gates must pass locally before merge.
- Branch `task/<slug>` off `dev`; PRs target `dev`; `main` is release-only.
- All Markdown in English (CLAUDE.md documentation-language rule).
- On delivery, flip that item's `⏳ Open` banner here to `✅ Shipped` with the spec link, PR link, and as-shipped deltas versus the sketch — the pattern the design-system follow-ups doc uses.

Each item above is deliberately a *seed*, not a spec: it states the current behavior with file references, the desired behavior, and the decisions the spec must make. `task-start`'s job is to turn that into a contract with oracles — not to rediscover the context.

---

## Out of scope (for this program)

- **Cross-tile interactivity** — synced crosshair, shared filters, click-through between tiles. It needs a cross-tile state bus and, for anything server-backed, `app.callServerTool` drill-down, which is deferred pending a live GUI host. Revisit as its own program once drill-down lands.
- **Dashboard tabs.** Sections (item 9) cover most of the density problem without a view-state machine.
- **Radar and funnel charts.** Already assessed as near-duplicates of grouped bar and bar-by-stage respectively; reconsider only after item 5 ships and the overlap can be judged against a real grouped bar.
- **Network / force-directed graphs, candlestick, chord, sunburst.** Either a new runtime dependency against the single-file bundle constraint, or an audience too narrow to justify a slot in the tool list.
- **Bundle-size work.** Standing repo rule: widgets ship self-contained; portability beats kilobytes.
