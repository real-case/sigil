---
slug: pie-max-segments-other
type: feature
status: in-progress
created: 2026-07-29
tracker: none
supersedes: none
stack: typescript, react
risk: low
breaking: false
spike_required: false
test_command: npm test
contract_sha: 56be260dd0fee9e7
---

# Pie Chart: Max-Segments Cap with Expandable "Other" Slice

## Goal
Cap the number of rendered pie/donut slices at `maxSegments` (default 5): when the payload carries more, keep the top `maxSegments − 1` by value and collapse the remainder into a single muted **"Other"** slice that the viewer can **click to expand** into the full slice set (with a "Show top N" control to collapse back). Expose `maxSegments` as an optional payload field so callers (and the LLM on user request) can raise the cap. CSV export always contains every original row — the cap is visual only. This is item 1 of `specs/design-system-followups.md`, upgraded per user choice (V3) with the expand interaction.

## Context
- Related patterns: `src/widgets/pie-chart/PieChartView.tsx` (redesigned 2026-07: fat donut ring, center KPI, `ValueLegend` with meters, mute/focus state keyed by index into `data`, palette-wrap `colorFor` from PR #17); pure-module + node-only vitest convention (`src/__tests__/*.test.ts`, no DOM harness); table-driven guard tests in `src/__tests__/payloads.test.ts` (`GuardCase` with `valid` + `rejects` mutators); in-process MCP round-trip harness in `src/__tests__/e2e.test.ts` (`TOOL_ARGS` per tool + structuredContent assertions); dataset-driven Storybook with **manually enumerated** stories (`PieChart.stories.tsx` → `payloadById`); `BarChartView` already reads the hovered datum from `props.payload?.[0]?.payload` — the tooltip approach to copy.
- Callers / reverse-deps of `PieChartView`: `src/widgets/pie-chart/App.tsx` (mountWidget + `isPieChartPayload` guard), `src/widgets/shared/widget-views.ts` (dashboard tile — inherits the new behavior automatically; two shipped dashboard presets embed the 12-slice pie and will visibly collapse), `src/widgets/sandbox/datasets/index.ts` (sandbox), `src/widgets/pie-chart/PieChart.stories.tsx`, and `src/widgets/palette-preview/App.tsx` — which renders a **10-equal-slice** pie as a neighbour-contrast test and MUST opt out of the cap (`maxSegments` 10), else the default collapses it to 4 + Other and destroys the preview's purpose.
- Constraints and discovered hazards:
  - The tooltip currently resolves the hovered slice by **label lookup** (`data.findIndex(d => d.label === name)`) — a synthetic "Other" slice has no row in `data`, and the demo dataset `pie-minimal-two` already contains a user slice literally labeled "Other". The tooltip must switch to reading the datum object from `props.payload[0].payload` (identity-match against `data` is not an option — `pieData` entries are spread copies).
  - `mountWidget` renders `<View payload={payload} />` **without a key** (`widget-shell.tsx`), and the sandbox does the same — component state survives payload swaps. All per-payload UI state (`expanded`, `muted`, `focused`) must reset when `payload.data` changes, or a new chart inherits the old expansion and renders uncapped.
  - Mute/focus state is keyed by index into `data`; display indices shift between collapsed and expanded modes, so state must key on **original data index** (`origIndex`; the synthetic Other uses `-1`). `ValueLegend` consumes `muted: ReadonlySet<number>` and `focused` by **display index**, so the View must project origIndex-keyed state back to display indices when passing legend props.
  - Palette colors must be assigned by `origIndex`, not display index, so kept slices keep identical hues across expand/collapse (palette-wrap cycles from PR #17 stay meaningful in expanded mode).
  - Center KPI (donut) currently derives from raw `data`; it must derive from the **displayed** slices so the visual and the number never disagree (if Other dominates, the center honestly shows Other).
  - Layout: `.sigil-split > .sigil-legend` (direct-child selector) gives the legend its scroll box, so the collapse-back control must NOT wrap `ValueLegend`; and there is no shared small-button class besides `.sigil-toolbar-btn`. The control renders inside `.sigil-plot` (after the canvas) reusing `.sigil-toolbar-btn` — zero CSS changes.
  - The guard (`isPieChartPayload`) accepts any finite `value` numbers (no non-negativity check, unlike zod) — a host-supplied tail can sum to 0 or negative; the synthetic Other then behaves exactly like a regular zero/negative-value slice does today (zero-angle sector, legend row still present). No special-casing.
  - Theme token for the Other slice fill: `tokens.texts.muted` (#888A92 light / #7B7D86 dark) — the only neutral non-palette tone in `ChartDesignTokens`.
  - README's tool reference documents `render_pie_chart` fields — the new field must be added there; its existing "slices under 4% hide their inline label" note is stale (the redesign sets `label={false}` — no inline labels exist) and gets corrected in the same edit.
- Sibling specs: `.marvin/task/001-dev-main-branch-workflow.md` (shipped) — delivery goes as a PR to `dev` per the branch rules.

## Spec Contract
The authoritative, machine-validated contract. The implementer may touch **only** the files listed in `files`.

```yaml spec-contract
files:
  - id: F1
    path: src/widgets/pie-chart/collapse.ts
    action: new
    intent: pure reducer `collapsePieData(data, maxSegments?)` — top-(cap−1) by value in original payload order + trailing synthetic Other slice ({label "Other", value = tail sum, origIndex -1, isOther true, otherCount}); returns {display, isCollapsed}; never mutates input; every display entry carries origIndex; tail sums of zero or negative are kept as-is (Other then behaves like any zero/negative-value slice)
    satisfies: [AC1, AC2]
  - id: F2
    path: src/__tests__/pie-collapse.test.ts
    action: new
    intent: node-only unit tests for the reducer, structured as top-level describe "collapsePieData" with nested describe "collapse rule" (collapse, boundary N == cap, stable ties by original index, order preservation, Other aggregation and otherCount, zero-sum tail, input immutability) and nested describe "maxSegments override" (2, >= N, omitted default 5)
    satisfies: [AC1, AC2]
  - id: F3
    path: src/widgets/pie-chart/PieChartView.tsx
    action: edit
    intent: wire the reducer + expanded state — the rendered slice set switches between collapsed display and full data when expanded; mute/focus keyed by origIndex with a projected display-index set passed to ValueLegend; palette color by origIndex; Other fill = tokens.texts.muted; click on Other (sector or legend row) expands instead of muting; collapse-back button labeled "Show top N" rendered inside .sigil-plot after the canvas reusing the .sigil-toolbar-btn class (no CSS file changes); tooltip reads the datum object from props.payload (no label lookup) and for Other adds a categories row + a muted click-to-expand hint; center KPI and legend derive from the shown set; CSV keeps exporting raw payload.data; expanded/muted/focused all reset when payload.data changes (effect on data identity); ALL new hooks are declared above the existing empty/zero-total early returns (the component returns early between its hooks and its body — misplacement only crashes on empty/all-zero payloads, which no gate walks) with useMemo/useEffect added to the react import
    satisfies: [AC4]
    anchor: src/widgets/pie-chart/PieChartView.tsx:55
  - id: F4
    path: src/shared/payloads.ts
    action: edit
    intent: add the optional numeric maxSegments field to PieChartPayload with a doc comment (integer >= 2, default 5, collapse-into-Other semantics)
    satisfies: [AC3]
    anchor: src/shared/payloads.ts:42
  - id: F5
    path: src/widgets/pie-chart/App.tsx
    action: edit
    intent: extend isPieChartPayload — accept absent maxSegments, else require Number.isInteger(v) && v >= 2
    satisfies: [AC3]
  - id: F6
    path: src/__tests__/payloads.test.ts
    action: edit
    intent: pie-chart GuardCase — valid payload gains maxSegments 7; rejects gain maxSegments 1, maxSegments 4.5, maxSegments "5"; PLUS a second cases[] entry "pie-chart (no maxSegments)" whose valid payload omits the field entirely (guards the undefined branch — the highest-risk regression)
    satisfies: [AC3]
  - id: F7
    path: src/tools/pie-chart.ts
    action: edit
    intent: zod inputSchema gains maxSegments (z.number().int().min(2).optional()) with an LLM-facing describe; payload passthrough by direct assignment matching sibling tools; the description const (the string the LLM reads in tools/list) gains a sentence on the default cap, the expandable Other, and when to raise maxSegments
    satisfies: [AC3, AC5, AC6]
  - id: F8
    path: src/widgets/sandbox/datasets/pie.ts
    action: edit
    intent: relabel presets whose default rendering changes (pie-medium, pie-many, pie-large-imbalanced) to mention collapse/expand; add preset pie-max-segments-raised — the 12-service data as variant donut with maxSegments 12, label noting the raised cap
    satisfies: [AC4]
  - id: F9
    path: src/widgets/pie-chart/PieChart.stories.tsx
    action: edit
    intent: add story MaxSegmentsRaised for the new dataset preset (stories are manually enumerated)
    satisfies: [AC4]
  - id: F10
    path: README.md
    action: edit
    intent: add the maxSegments row to the render_pie_chart field table; replace the stale "slices under 4% hide their inline percentage label" note with an accurate note on the cap, the expandable Other, and CSV keeping all rows
    satisfies: "—"
    anchor: README.md:133
  - id: F11
    path: src/widgets/palette-preview/App.tsx
    action: edit
    intent: set maxSegments 10 on the palette-preview pie payload so the 10-equal-slice neighbour-contrast test keeps rendering all palette colours under the new default cap
    satisfies: [AC4]
  - id: F12
    path: src/__tests__/e2e.test.ts
    action: edit
    intent: render_pie_chart TOOL_ARGS gain maxSegments 7 with a structuredContent.maxSegments === 7 round-trip assertion, plus a rejection case asserting the tool call with maxSegments 1 fails schema validation
    satisfies: [AC6]
build_order: [F4, F1, F2, F5, F6, F7, F12, F3, F11, F8, F9, F10]
depends_on: []
contract:
  kind: function
  signature: |
    export interface PieDisplaySlice extends PieDatum {
      origIndex: number;        // index into the original payload data; -1 for the synthetic Other
      isOther?: true;           // present only on the synthetic Other slice
      otherCount?: number;      // how many source slices the Other aggregates (only on Other)
    }
    export function collapsePieData(
      data: readonly PieDatum[],
      maxSegments?: number,     // integer >= 2; defaults to 5; values >= data.length disable collapsing
    ): { display: PieDisplaySlice[]; isCollapsed: boolean }
criteria:
  - id: AC1
    statement: With N slices and cap C (default 5) — when N > C the reducer returns exactly C display entries — the top C−1 by value in original payload order followed by a synthetic Other (label "Other", value = sum of the tail even when zero or negative, origIndex −1, isOther true, otherCount = N−(C−1)) — ties at the boundary resolve stably by original index, the input array and its entries are not mutated; when N <= C the display mirrors the input (origIndex added, no Other, isCollapsed false)
    implemented_by: [F1, F2]
    oracle:
      kind: test
      ref: src/__tests__/pie-collapse.test.ts::collapse rule
    failure: a 12-category pie renders 12 slices, Other double-counts or drops values, or a 5-slice payload sprouts a pointless Other
  - id: AC2
    statement: maxSegments is honored — maxSegments 2 yields 1 + Other; maxSegments >= data.length yields no collapse; omitted maxSegments behaves as 5
    implemented_by: [F1, F2]
    oracle:
      kind: test
      ref: src/__tests__/pie-collapse.test.ts::maxSegments override
    failure: raising maxSegments still collapses, or the default drifts from 5
  - id: AC3
    statement: The widget-side guard accepts optional maxSegments as an integer >= 2 — it passes a payload with maxSegments 7 AND a payload without the field (separate GuardCase entry), and rejects 1, 4.5, and "5"
    implemented_by: [F4, F5, F6]
    oracle:
      kind: test
      ref: src/__tests__/payloads.test.ts::pie-chart
    failure: a guard written without the undefined branch rejects every existing pie payload while npm test stays green
  - id: AC4
    statement: Interactive behavior QA checklist (sandbox + Storybook, both themes) — (a) pie-medium (12 slices, variant pie) renders 5 sectors and 5 legend rows with Other last in the muted token color; (b) Other's tooltip shows value, share, "8 categories", and the click-to-expand hint; (c) clicking Other — sector or legend row — reveals all 12 slices with origIndex-stable palette colors, and the "Show top 5" button (toolbar-btn style, inside the plot column) collapses back; (d) muting a kept slice survives expand/collapse and highlights the correct legend row in both modes; (e) pie-many (16 slices, donut) — center KPI derives from the displayed slices in both modes; (f) expand pie-medium, switch preset, come back — it renders collapsed (state reset on payload change); (g) pie-minimal-two — hovering the user slice labeled "Other" shows its own correct tooltip (collision regression); (h) a dashboard preset embedding the 12-slice pie collapses in its tile and expand/collapse works without breaking the tile layout; (i) pie-max-segments-raised (donut, maxSegments 12) renders all 12 uncollapsed; (j) palette-preview still shows all 10 palette slices; (k) Copy CSV on pie-medium yields all 12 original rows in both collapsed and expanded states
    implemented_by: [F3, F8, F9, F11]
    oracle:
      kind: prose-review
    failure: Other is unclickable or mutes instead of expanding, colors jump on toggle, stale expansion leaks across payloads, the legend highlights wrong rows, or CSV loses the collapsed rows
  - id: AC5
    statement: The tool description const — the text the LLM reads in tools/list — documents the default cap with collapse into an expandable "Other" and instructs raising maxSegments when the user wants more categories
    implemented_by: [F7]
    oracle:
      kind: command
      ref: >-
        sed -n '/^const description/,/join(/p' src/tools/pie-chart.ts | grep -qi "maxSegments" &&
        sed -n '/^const description/,/join(/p' src/tools/pie-chart.ts | grep -qiE "collapse|Other"
    failure: the knob exists only in the schema, the description never mentions it, and users asking "show all categories" get a capped pie
  - id: AC6
    statement: The tool schema mirrors the guard bounds end to end — an in-process render_pie_chart call with maxSegments 7 round-trips structuredContent.maxSegments === 7, and a call with maxSegments 1 is rejected by schema validation
    implemented_by: [F7, F12]
    oracle:
      kind: test
      ref: src/__tests__/e2e.test.ts::render_pie_chart
    failure: the widget accepts a payload the tool would reject (or vice versa), or maxSegments silently never reaches the View
```

## Host Bindings
Discovered from this repo.

```yaml host-bindings
spec_location: .marvin/task/
decision_record:
  style: none
  path: none
merge_obligations:
  - all Markdown in this repository is written in English (CLAUDE.md documentation-language rule)
  - typecheck + tests + build green (npm run typecheck / npm test / npm run build)
  - PRs target dev; main is release-only (CLAUDE.md branch & release workflow)
gates:
  test: npm test
  typecheck: npm run typecheck
  build: npm run build
```

## Data & Config
N/A — no migrations, env vars, or flags. The payload schema change is additive and backward-compatible (`maxSegments` optional); `breaking: false`.

## Chosen Approach
Variant 3 from dialogue — View-side collapse + optional `maxSegments` payload knob + expandable Other:

1. **F4 type**: `maxSegments?: number` on `PieChartPayload`, doc comment stating integer ≥ 2, default 5, collapse-into-Other semantics.
2. **F1 reducer** (`src/widgets/pie-chart/collapse.ts`): pure, per the contract signature. Selection: rank by value descending with stable tie-break on original index; the kept set renders in **original payload order**; Other appended last with `color` left undefined (the View owns its fill). `maxSegments` defaults to 5; `data.length <= cap` → `isCollapsed: false`, display mirrors input with `origIndex` stamped. A tail summing to 0 or negative stays as-is — the Other slice then renders exactly like any zero/negative-value slice does today.
3. **F5 guard / F6 tests**: structural check added to `isPieChartPayload` (`undefined` OR `Number.isInteger && >= 2`); pie `GuardCase` valid payload gains `maxSegments: 7`, rejects gain `1`, `4.5`, `"5"`; a **second** `cases[]` entry `pie-chart (no maxSegments)` keeps a field-less valid payload passing — this guards the `undefined` branch, the change's highest-risk regression.
4. **F7 tool**: zod `maxSegments: z.number().int().min(2).optional().describe(...)`; payload passthrough by direct assignment (`maxSegments: args.maxSegments`), matching sibling tools (bar-chart's `xlabel`/`ylabel` style — the repo does not enable exactOptionalPropertyTypes). The `description` const gains: slices beyond the cap (default 5) collapse into a click-to-expand "Other" — raise `maxSegments` when the user asks to see more/all categories.
5. **F12 e2e**: `TOOL_ARGS.render_pie_chart` gains `maxSegments: 7`; the round-trip test asserts `structuredContent.maxSegments === 7`; a new case asserts `callTool render_pie_chart` with `maxSegments: 1` fails schema validation (zod bound mirrors the guard bound).
6. **F3 View wiring**:
   - `const cap = payload.maxSegments ?? 5;`
   - `const full = useMemo(() => data.map((d, i) => ({ ...d, origIndex: i })), [data]);`
   - `const { display, isCollapsed } = useMemo(() => collapsePieData(data, cap), [data, cap]);`
   - `const [expanded, setExpanded] = useState(false);` — `const shown = expanded || !isCollapsed ? full : display;`
   - **State reset:** an effect keyed on `data` identity resets `expanded`, `muted`, `focused` — `mountWidget` and the sandbox render `<View>` without a key, so state must not leak across payload swaps.
   - Mute/focus state keys on **origIndex** (Other = −1, never mutable). Sector handlers translate display position → `shown[i].origIndex`. For `ValueLegend`, project back: `legendMuted = new Set(shown.flatMap((s, i) => muted.has(s.origIndex) ? [i] : []))`, `legendFocused = shown.findIndex(s => s.origIndex === focusedOrig)` (−1 → null).
   - Fill: `slice.isOther ? tokens.texts.muted : colorFor(slice, slice.origIndex, tokens)` — palette by origIndex keeps hues stable across modes.
   - Click on Other (sector `onClick` and the legend row's `onToggleMute` for that display index) → `setExpanded(true)`; the Other legend row is an expand control, never mutable.
   - Collapse-back control: when `expanded && isCollapsed`, a `<button className="sigil-toolbar-btn">Show top {cap}</button>` rendered inside `.sigil-plot` after the canvas (NOT wrapping `ValueLegend` — the `.sigil-split > .sigil-legend` direct-child selector owns the legend scroll box). Zero CSS-file changes.
   - Tooltip: read the hovered datum from `props.payload[0].payload` (the shown entry itself — same pattern as `BarChartView`); removes the label-findIndex lookup and its collision with user slices named "Other". For the synthetic Other add a `categories: {otherCount}` row and a muted "click to expand" hint line.
   - Center KPI (donut) + legend items + meter max derive from `shown`; `total` stays the raw-data sum. `copyCsv` unchanged (raw `payload.data`, all rows, both states). `copyPng` captures the current view.
7. **F11 palette-preview**: its 10-equal-slice pie payload gains `maxSegments: 10` so the neighbour-contrast test keeps showing the full palette.
8. **F8 datasets**: relabel `pie-medium` → "Medium — 12 slices (collapses to Other)", `pie-many` → "Many — 16 slices (collapse → expand, palette wrap)", `pie-large-imbalanced` → "Large — 1 dominant slice (collapses)"; add `pie-max-segments-raised` — the 12-service data, `variant: "donut"`, `maxSegments: 12`, label "Medium — 12 slices, maxSegments 12 (no collapse)".
9. **F9 story**: `export const MaxSegmentsRaised: Story = { args: { payload: payloadById(pieDatasets, "pie-max-segments-raised") } };`
10. **F10 README**: `maxSegments` row in the `render_pie_chart` table (`number`, no, "Max rendered slices (default 5, min 2). Extra slices collapse into a click-to-expand 'Other'; CSV export keeps all rows.") and replace the stale under-4%-labels note (the redesign renders no inline labels) with the collapse/expand behavior note.

**Stack compliance:** NATIVE
**Future alignment:** N/A (no VISION.md)

**Stack extensions required:** none.

## Why this over alternatives
- Variant 1 — hard-coded cap 5, View only (rejected): no escape hatch — the palette-wrap capability from PR #17 and its 16-slice demo become unreachable, the palette-preview widget breaks with no opt-out, and an LLM asked to "show all categories" cannot comply.
- Variant 2 — cap + maxSegments knob without expansion (rejected as final scope; a strict subset of V3): static payloads only — the viewer of an already-rendered chart cannot see what "Other" hides without re-asking the model. The user explicitly chose the richer V3 interaction.
- Server-side collapse in `tools/pie-chart.ts` (considered, rejected): the widget would receive only the collapsed data, so Copy CSV could no longer export the original rows — violating the followups-doc requirement that the cap is visual-only ("raw data still copies in full") — and dashboard tiles fed by stored payloads would bypass it.

## Test Plan
- Harness: vitest, node-only (`npm test`, suites in `src/__tests__/`); no DOM/react harness exists (verified: `vitest.config.ts` `environment: "node"`, no jsdom dependency) — component behavior is proven by the pure reducer's unit tests, the guard table, the e2e round-trip, and the AC4 QA checklist, matching how every existing widget is tested.
- F2 follows the plain describe/it style (nearest pure-function neighbor: `export-utils.test.ts`); block names are pinned ("collapsePieData" → "collapse rule" / "maxSegments override") so the AC1/AC2 oracle refs resolve; F6 extends the `GuardCase` table in place; F12 extends the existing in-process MCP client harness.
- Visual QA: `npm run dev:sandbox` and `npm run dev:storybook` for checklist steps (a)–(i) and (k), plus `npm run dev:preview` for step (j) — palette-preview is a dev-only widget with its own entry point, absent from the sandbox and Storybook. Both themes.

## Definition of Done
- [ ] `npm run typecheck`, `npm test`, `npm run build` green
- [ ] AC1/AC2/AC3/AC6 test oracles pass; AC5 command oracle passes
- [ ] AC4 checklist (a)–(k) walked in sandbox/Storybook (both themes), outcomes recorded in verification notes
- [ ] README table + note updated (English); no other Markdown touched
- [ ] Delivery PR targets `dev` per the branch workflow

## Non-goals
- Server-side collapsing or any change to what the tool sends beyond the passthrough field
- Drill-down via `app.callServerTool` (still deferred pending a live GUI host)
- Legend interactivity changes for other widgets or any `ValueLegend` API change (the expand affordance rides the existing `onToggleMute` callback; projection happens in PieChartView)
- Persisting the expanded state across re-renders or into the payload
- Applying caps to treemap/bar or any other widget
- New CSS classes or styles.css changes (the collapse-back control reuses `.sigil-toolbar-btn`)
- INCANTATIONS.md / ritual-mode updates

## Assumptions
- No DOM test harness exists and introducing one is out of scope — AC4 is a structured manual QA checklist by design, consistent with the repo's testing philosophy.
- The expanded state is ephemeral UI state and resets on payload change (enforced by the F3 effect — verified by AC4 step f); it does not persist into the payload.
- A user payload may legitimately contain its own slice labeled "Other"; the synthetic slice does not rename it and both may appear — the object-based tooltip lookup makes this safe (AC4 step g).
- The Other legend row reuses the mute-toggle button as an expand control; its `aria-pressed` stays false (it is never muted). A dedicated aria affordance is deliberately out of scope with the no-ValueLegend-change rule.

## Open Questions
none

## Security / NFR
N/A — client-side rendering logic only; input validation is tightened (guard + zod gain bounds for the new field); no auth, network, storage, or PII surface. Bundle-size impact is a few hundred bytes in one widget (bundle size is explicitly a non-concern per CLAUDE.md).

## Critic Verdict & Overrides
PASS WITH WARNINGS (round 2; round 1 was BLOCK). Round-1 blockers — palette-preview casualty, state leak across keyless payload swaps, unproven guard undefined-branch, unproven tool-schema parity, unfalsifiable description grep, homeless collapse-back control — all fixed and re-verified by the critic against the code. Round-2 warnings folded into this revision: F3 pins new-hook placement above the early returns (no lint gate exists to catch a misplacement, and no dataset walks the empty/zero paths); Test Plan adds `npm run dev:preview` for AC4 step (j) since palette-preview is a dev-only entry point. No overrides.

## Design Notes
- The tooltip's switch from label lookup to `props.payload[0].payload` fixes a latent bug (duplicate labels resolved to the wrong slice) as a required side effect of AC4; `BarChartView` is the in-repo precedent for the pattern.
- Keying colors and mute state by `origIndex` is the invariant that makes expand/collapse feel continuous; "colors jump on toggle" is the symptom of re-keying by display index.
- `PieChartView.tsx` is the churniest file in the contract (recharts 2→3 bump, redesign, palette-wrap fix are its last three commits) — implement F3 as a focused diff, no drive-by refactors.
- The reducer is exported for reuse (a future treemap cap could adopt it), but only pie consumes it in this task.
- `pie-minimal-two` keeps its user-authored "Other" slice on purpose — it doubles as the collision regression case (AC4 step g).

## Future Considerations
- Item 3 (line end-caps) and the ValueLegend revision against followups item 5 are the next candidates from `specs/design-system-followups.md`; item 4 (table sparklines) needs its own payload-contract spec. A dedicated expand-affordance aria treatment could ride the item-5 ValueLegend work.
- If a DOM test harness ever lands, AC4's checklist converts naturally into component tests.
- `specs/design-system-followups.md` itself is stale (item 2 shipped, fonts footnote outdated) — worth a refresh pass as a separate docs task.
