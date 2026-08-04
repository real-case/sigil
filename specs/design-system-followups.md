# Sigil — Design System Follow-ups

> Features described in [`specs/design-system-tokens.json`](./design-system-tokens.json) v0.3.0 that were **intentionally deferred** from the Phase A + B migration. Each entry is a self-contained, PR-sized chunk of work.
>
> All purely-styling concerns (tokens, primitives, per-widget look) are *already shipped*. The items below are **feature additions** that the token spec anticipates but does not enforce. They live here so they don't drift out of sight.
>
> **Program closed on the repo side (2026-08-04).** All five items are resolved — items 1–4 shipped via specs 002–004 and the v0.3.0 redesign, and item 5 was satisfied by the redesign's `ValueLegend`; each item's status banner records its delivery and deltas. Six superseded token values await the DesignSync reconciliation — see "Superseded token values" below.

---

## Why these were deferred

Phase A + B scope was "apply the design system to existing widgets without changing what they *do*". The items below would change widget *behavior* — clipping pies, adding columns, reshaping payloads, or introducing new shared abstractions. Bundling them with the styling migration would have:

1. Made the PR un-reviewable (styling + behavior intertwined).
2. Required payload-schema changes for some items, which means coordinated server-side updates in [src/shared/payloads.ts](../src/shared/payloads.ts) and [src/tools/*.ts](../src/tools/).
3. Made a clean "before vs. after" visual diff impossible — styling regressions would hide behind new features.

Each item shipped as its own PR (or with the v0.3.0 redesign).

---

## 1. Pie chart — max-segments cap with "Other" grouping

> **✅ Shipped** — spec [`002-pie-max-segments-other`](../.marvin/task/002-pie-max-segments-other.md), [PR #42](https://github.com/real-case/sigil/pull/42). As-shipped deltas vs the sketch below: the `maxSegments` payload knob landed (integer ≥ 2, default 5); the collapsed slice is click-to-expand with a "Show top N" collapse back; the cap stays visual-only — Copy CSV exports every original row.

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

> **✅ Shipped** — v0.3.0 chart redesign, commit b11de90 (no task spec). As-shipped deltas vs the sketch below: the gradient fill renders under **every** series while the chart has ≤ 3 series, not primary-only; the top stop is a uniform 18 % in both themes — the token's "18 % (light) / 22 % (dark)" split did not ship and those token values are superseded.

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

> **✅ Shipped** — end dots with the v0.3.0 redesign (commit b11de90); start caps via spec [`003-line-end-caps`](../.marvin/task/003-line-end-caps.md), [PR #43](https://github.com/real-case/sigil/pull/43). As-shipped deltas vs the sketch below: radii are per **position**, not per series — end r 4 / ring 2, start r 3 / ring 1.5, identical across series; the token's per-series 3 / 2.5 split was rejected (003 Non-goals) and those token values are superseded.

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

> **✅ Shipped** — spec [`004-table-sparkline-columns`](../.marvin/task/004-table-sparkline-columns.md), [PR #44](https://github.com/real-case/sigil/pull/44). As-shipped deltas vs the sketch below: a mono last-value readout renders beside each spark; scalar cells stay legal under sparkline columns (plain text); missing cells, empty arrays, and non-finite entries render an em dash — narrowing the "with-null gaps" test idea; CSV ships the joined-cell option (one quoted `"1,2,3"` cell per series); sorting uses the last value; the filter excludes spark digits.

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

> **✅ Shipped** — by the v0.3.0 redesign (commit b11de90), as [`ValueLegend`](../src/widgets/shared/ValueLegend.tsx). As-shipped deltas vs the sketch below: it ships in **four** widgets (pie, bar, line, scatter — the sketch named three); rows are value-bearing (formatted value, share suffix, proportion meter or min/avg/max range) rather than name+swatch; the legend row restyles on hover while focus dims the non-focused series in the **plot** (0.2 line/scatter, 0.32 bar/pie) instead of dimming legend siblings at 0.4; click-mute keeps series at 18 % in the plot; and it renders outside the Recharts tree, so the `<Legend content>` adapter idea was dropped. Tokens: `muted-opacity` 0.4 (applied to the click-muted legend row) and the fast background transition match; `legend.gap`, `legend.item-padding`, `legend.item-radius`, and `legend.swatch-size` are superseded by the richer July chrome (see "Superseded token values" below). Residual: the focused/muted interaction state machine is duplicated per consumer widget — chrome is shared, state is not; a shared-state consolidation remains future work.

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

Retired — all five items are resolved (see the status banners above).

---

## Superseded token values

The shipped design overtook these token-spec values. The token record itself is owned by the claude.ai/design project and is reconciled through the DesignSync flow — not by repo-side edits; this table is the hand-off list for that reconciliation.

| Token | Spec value | Shipped |
|---|---|---|
| `chart.line.area-fill` | 18 % (light) / 22 % (dark) top stop | uniform 18 % top stop in both themes |
| `chart.line.end-cap-radius` | per series — primary 3 / secondary 2.5 | per position — end r 4 / ring 2, start r 3 / ring 1.5 |
| `components.legend.gap` | `spacing.md` (12px) | 4px (column layout) / 10px (row layout) |
| `components.legend.item-padding` | 3px 4px | 11px 13px |
| `components.legend.item-radius` | `radius.sm` (4px) | `radius.lg` (12px) |
| `components.legend.swatch-size` | 10px | 14px |

---

## Out of scope (here and probably forever)

These were considered but deemed not worth the cost:

- **`cozy` density preset.** Claude Design's handoff omitted it. Chat-window only target makes a second density redundant. If multi-host (dashboard mode) ever lands, revisit.
- **JSX-in-CSS or styled-components abstraction.** Inline styles + CSS variables work fine and keep the single-file constraint pure. Don't introduce a runtime CSS-in-JS layer.
- **Custom font subsetting.** IBM Plex is self-hosted via `@fontsource` and inlined into each single-file widget bundle (see `src/widgets/shared/styles.css`) — the original Google-Fonts-CDN plan was replaced during the v0.3.0 redesign. Further subsetting stays out of scope.

---

*Last updated: 2026-08-04. The followups program is closed on the repo side; superseded token values await DesignSync reconciliation.*
