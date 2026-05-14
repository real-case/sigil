# Sigil — Design System Follow-ups

> Features described in [`specs/design-system-tokens.json`](./design-system-tokens.json) v0.3.0 that were **intentionally deferred** from the Phase A + B migration. Each entry is a self-contained, PR-sized chunk of work.
>
> All purely-styling concerns (tokens, primitives, per-widget look) are *already shipped*. The items below are **feature additions** that the token spec anticipates but does not enforce. They live here so they don't drift out of sight.

---

## Why these were deferred

Phase A + B scope was "apply the design system to existing widgets without changing what they *do*". The items below would change widget *behavior* — clipping pies, adding columns, reshaping payloads, or introducing new shared abstractions. Bundling them with the styling migration would have:

1. Made the PR un-reviewable (styling + behavior intertwined).
2. Required payload-schema changes for some items, which means coordinated server-side updates in [src/shared/payloads.ts](../src/shared/payloads.ts) and [src/tools/*.ts](../src/tools/).
3. Made a clean "before vs. after" visual diff impossible — styling regressions would hide behind new features.

Each item below should ship as its own PR.

---

## 1. Pie chart — max-segments cap with "Other" grouping

**Spec:** [`components.chart.pie.max-segments: 5`](./design-system-tokens.json) (and implicitly: anything over the cap collapses to an "Other" slice).

**Current behavior:** [PieChartView.tsx](../src/widgets/pie-chart/PieChartView.tsx) renders all slices verbatim from `payload.data`. A 12-category pie becomes an unreadable compote.

**Desired behavior:** when `data.length > 5`, keep the top 4 by `value`, sum the rest into a single `{ label: "Other", value: <sum>, color: <muted> }` slice. The collapsed group must be reflected in:
- The legend (one "Other" entry)
- The tooltip (shows the aggregated value)
- The CSV export (one row per original datum — the cap is *visual only*, raw data still copies in full)

**Files to touch:**
- [src/widgets/pie-chart/PieChartView.tsx](../src/widgets/pie-chart/PieChartView.tsx) — add a `useMemo` that produces `displayData` with top-N + Other; pass to `<Pie>` and `<Legend>`; keep `data` untouched for `copyCsv`.
- Optionally: expose `maxSegments` in [src/shared/payloads.ts](../src/shared/payloads.ts) `PieChartPayload` so callers can override 5 → other.

**Test coverage:**
- New unit test for the top-N + Other reducer
- Snapshot test for displayData with 3, 5, 6, 12 categories
- Manual: verify CSV still has all 12 rows when 12 categories collapse

**Effort estimate:** ~1 hour. Pure data transform + integration.

---

## 2. Line chart — area fill under the primary series

**Spec:** [`components.chart.line.area-fill: "series-0 linear-gradient 18% (light) / 22% (dark) → 0%"`](./design-system-tokens.json).

**Current behavior:** [LineChartView.tsx](../src/widgets/line-chart/LineChartView.tsx) renders all series as `<Line>`. No area fill.

**Desired behavior:** the *first* series gets a subtle gradient fill from its stroke color (`series-0` typically) down to 0% opacity at the chart baseline. Top of the gradient sits at 18% opacity in light theme, 22% in dark. Secondary series remain stroke-only.

**Implementation hint:** Recharts has `<Area>`, but mixing `<Area>` and `<Line>` in the same `<ComposedChart>` is the documented pattern. Alternative: render an SVG `<defs>` linearGradient inside the chart and use `<Area dataKey={firstSeriesName} fill="url(#sigil-area-fill)" stroke="none" />` *plus* the existing `<Line>` for the stroke on top.

**Files to touch:**
- [src/widgets/line-chart/LineChartView.tsx](../src/widgets/line-chart/LineChartView.tsx) — switch from `<LineChart>` to `<ComposedChart>`; add `<defs><linearGradient>` with `prefers-color-scheme`-aware stops (or two gradient defs and CSS pickers).
- Verify behavior when series share an x-axis but data lengths differ (gradient under the longest series only).
- Decide: should *only* the primary fill, or all series with a "primary" flag? Current spec implies first-only.

**Test coverage:**
- Visual QA only — no logic to unit-test besides "first series has fill, others don't".

**Effort estimate:** ~2 hours. Mostly Recharts wrangling and visual tuning.

---

## 3. Line chart — explicit end-cap radii

**Spec:** [`components.chart.line.end-cap-radius: { primary: 3, secondary: 2.5 }`](./design-system-tokens.json).

**Current behavior:** [LineChartView.tsx](../src/widgets/line-chart/LineChartView.tsx) sets `strokeLinecap="round"`, which rounds the *stroke* itself — visually equivalent to a half-circle of radius `strokeWidth / 2` at each end. With stroke-width 1.75 / 1.5 px, that's a ~0.9 / 0.75 px effective cap radius.

**Desired behavior:** the spec asks for explicit *terminator circles* of 3 px (primary) / 2.5 px (secondary) at the start and end of each line. This is visually distinct from `strokeLinecap` — the circles are filled discs, optionally with a stroke ring in `surface` for separation from area fills.

**Implementation hint:** Recharts has no built-in "end cap circle" prop. Options:
- A) Render extra `<circle>` SVG elements inside `<ResponsiveContainer>` at the data-coordinate positions of `series.data[0]` and `series.data[data.length - 1]`. Requires reading the chart's x/y scale.
- B) Use Recharts `<Line dot={false}>` plus a custom `<Line dot={customDot}>` that only renders dots at index 0 and last.
- C) Render the caps as a second `<Line>` overlay with only the first/last datum.

**Files to touch:** [LineChartView.tsx](../src/widgets/line-chart/LineChartView.tsx) + likely a new `EndCaps.tsx` helper.

**Effort estimate:** ~2 hours. Recharts coordinate math is the bottleneck.

---

## 4. Table — sparkline columns

**Spec:** [`components.chart.table.spark-width: 56`, `spark-height: 16`](./design-system-tokens.json).

**Current behavior:** [TableView.tsx](../src/widgets/table/TableView.tsx) renders cells as plain text via `String(v)`. No notion of inline visuals.

**Desired behavior:** allow a column to declare itself a sparkline column, with each cell holding a numeric series (e.g. last 12 months). Sparkline renders as a 56 × 16 px inline SVG using `series-0` with `strokeWidth: 1`, no axes, no labels. Hover on a row should *not* re-emphasize the sparkline (it lives in the table chrome, not the chart-chrome).

**Required:**
1. **Payload-schema change** in [src/shared/payloads.ts](../src/shared/payloads.ts):
   - Extend `TableColumn` with `kind?: "text" | "sparkline"` (defaults to "text").
   - Sparkline cells expect `number[]` instead of `string | number`.
2. **Server-side** in [src/tools/table.ts](../src/tools/table.ts):
   - Loosen the description so the LLM emits sparkline columns when asked for "show trend".
3. **Renderer** in [TableView.tsx](../src/widgets/table/TableView.tsx):
   - Inline `<Sparkline>` SVG component.
4. **CSV export** in [src/widgets/shared/export-utils.ts](../src/widgets/shared/export-utils.ts):
   - Sparkline values export as `"1,2,3,4"` joined strings, or one column per index (decide which).

**Test coverage:**
- New `TableColumn` payload tests
- Snapshot test for Sparkline at 0 / 1 / 12 values, constant data, with-null gaps

**Effort estimate:** ~4 hours. Cross-cuts payload + server + renderer + tests.

---

## 5. Shared `Legend.tsx` primitive

**Spec:** [`components.legend.*`](./design-system-tokens.json) — `gap: spacing.md`, `item-padding: 3px 4px`, `item-radius: radius.sm`, `swatch-size: 10px`, `muted-opacity: 0.4`, transition on `motion.duration.fast`.

**Current behavior:** [line-chart](../src/widgets/line-chart/LineChartView.tsx), [scatter-chart](../src/widgets/scatter-chart/ScatterChartView.tsx), and [pie-chart](../src/widgets/pie-chart/PieChartView.tsx) all use Recharts `<Legend>` with `wrapperStyle`. This gets us the right typography and spacing tokens but **not** the hover-emphasize, click-to-toggle, or `motion.duration.fast` background transition the spec asks for.

**Desired behavior:** a `src/widgets/shared/Legend.tsx` that:
- Receives `items: { name: string; color: string; muted?: boolean }[]` + `onItemClick`, `onItemHover`.
- Hover dims siblings (`muted-opacity 0.4`) and tightens transition on `motion.duration.fast`.
- Click toggles its own muted state.
- Used via Recharts `<Legend content={(props) => <Legend ... />} />` adapter.

**Files to touch:**
- New `src/widgets/shared/Legend.tsx`
- 3 widget files: replace `<Legend wrapperStyle={...}>` with `<Legend content={...}>`

**Tradeoff:** this is the closest item to "premium tell". Hover-emphasize on a 4-series line chart is a recognizable detail. But it requires the most coordination across widgets — defer until after visual QA confirms current state is acceptable.

**Effort estimate:** ~3 hours. ~80 LOC for the primitive + ~30 LOC × 3 widgets for adapters.

---

## Suggested order

If you tackle these in sequence:

1. **#1 (pie max-segments)** — smallest, no cross-file coupling, biggest UX win.
2. **#5 (Legend)** — refines a styling concern already in the design system. Highest premium impact relative to effort.
3. **#2 + #3 (line area + caps)** — visual upgrades to the same widget, do them together as one PR.
4. **#4 (table sparklines)** — most invasive (payload + server + renderer). Worth its own PR.

---

## Out of scope (here and probably forever)

These were considered but deemed not worth the cost:

- **`cozy` density preset.** Claude Design's handoff omitted it. Chat-window only target makes a second density redundant. If multi-host (dashboard mode) ever lands, revisit.
- **JSX-in-CSS or styled-components abstraction.** Inline styles + CSS variables work fine and keep the single-file constraint pure. Don't introduce a runtime CSS-in-JS layer.
- **Custom font subsetting / self-host of IBM Plex.** Google Fonts CDN works in all 3 target hosts. ~80KB woff2 per face × 5 faces would be a meaningful bundle hit.

---

*Last updated: 2026-05-14. After Phase A + B token migration.*
