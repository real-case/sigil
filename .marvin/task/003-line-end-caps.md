---
slug: line-end-caps
type: feature
status: shipped
created: 2026-07-30
tracker: none
supersedes: none
stack: typescript, react
risk: low
breaking: false
spike_required: false
test_command: npm test
contract_sha: 96906aa4f0896a16
---

# Line Chart: Start-of-Line End Caps (Asymmetric Terminators)

## Goal
Give every line series an explicit start-of-line terminator circle, completing item 3 of `specs/design-system-followups.md` under the user-chosen asymmetric treatment (V3): the start cap is quiet (r 3, surface ring 1.5 — the size the redesign already uses for sparse-series point markers), while the existing end cap stays the accent (r 4, ring 2, unchanged). No payload, schema, or docs surface changes — this is a purely visual completion inside the line widget.

## Context
- Related patterns: the July chart redesign already ships **half of item 3** — `LineChartView.tsx` renders an end-of-line dot per series (custom `dot` renderer, `isEnd` → r 4 with a `tokens.surfaces.surface` ring of 2) and full point markers for sparse series (≤ 12 points → every point r 3, ring 1.5). The May followups doc and its `end-cap-radius` tokens (primary 3 / secondary 2.5) predate that redesign; the user chose V3, which keeps the shipped end-cap accent and reuses the existing quiet dot size for the start cap. The doc's implementation options A/C (coordinate math / overlay Line) are obsolete — option B (the custom dot renderer) is already the shipped mechanism and only needs a first-index anchor.
- Callers / reverse-deps: `LineChartView` is consumed by `src/widgets/line-chart/App.tsx` (mountWidget), `src/widgets/shared/widget-views.ts` (dashboard tiles), `src/widgets/sandbox/datasets/index.ts`, `src/widgets/line-chart/LineChart.stories.tsx`, and the site-facing sandbox — all inherit the start caps automatically; none change.
- Constraints and discovered facts:
  - `lastIndexBySeries` (the end-dot anchor) is an inline `useMemo` scanning merged rows backwards; the start cap needs the forward mirror. Both move into one pure, node-testable helper per the repo's pure-module convention (`collapse.ts` precedent from spec 002) — the vitest suite has no DOM harness, so index math is the testable half and the rendering is QA.
  - Merged rows (`mergeSeries`) union all series' x values: a series absent at the first rows has leading `undefined` gaps, so "first index" means first row where the series has a value — exactly mirroring the existing last-index semantics (`rows[i][s.name] != null`).
  - Single-point series: first == last; the end style must win (matches today's rendering, where the sole point draws as the end dot).
  - Sparse series (≤ `SPARSE_DOT_THRESHOLD` 12) already draw every point at r 3 / ring 1.5 — the start cap is that same style, so sparse rendering is visually unchanged by construction.
  - Mute/focus opacity (`opacityFor`) and the transition style already apply to dot circles via the shared renderer — start caps inherit them with no extra wiring.
  - Existing presets already exercise the new visual: `line-medium-numeric` (20 points) and `line-large-numeric` (120) are non-sparse and will grow start caps; `line-small-categorical` (5) and `line-minimal-single` (1) prove the unchanged sparse/single paths. No dataset or story changes needed.
- Sibling specs: `.marvin/task/001-dev-main-branch-workflow.md`, `.marvin/task/002-pie-max-segments-other.md` — both `shipped`; delivery goes as a PR to `dev`.

## Spec Contract
The authoritative, machine-validated contract. The implementer may touch **only** the files listed in `files`.

```yaml spec-contract
files:
  - id: F1
    path: src/widgets/line-chart/end-indices.ts
    action: new
    intent: pure helpers — `seriesEndIndices(rows, seriesNames)` returning per-series first/last merged-row indices (-1 for a series with no values; forward scan mirrors the existing backward scan's `!= null` semantics), and `dotRole({ index, first, last, sparse })` encoding the renderer's decision order (end wins when index equals last — including the single-point first-equals-last case — then start, then sparse, else none); node-testable per the repo's pure-module convention
    satisfies: [AC1, AC3, AC4]
  - id: F2
    path: src/__tests__/line-end-indices.test.ts
    action: new
    intent: node-only unit tests, describe "seriesEndIndices" (dense series, multi-series with disjoint x coverage producing leading/trailing gaps in merged rows, single-point series with first equal to last, a series entirely absent from rows giving -1/-1, empty rows, null-valued cells skipped on both ends) and describe "dotRole" (end precedence at first-equals-last, start only at the first anchor, sparse fallback for interior points of sparse series, none for interior points of dense series, no start/end role for -1 anchors)
    satisfies: [AC1, AC4]
  - id: F3
    path: src/widgets/line-chart/LineChartView.tsx
    action: edit
    intent: replace the inline lastIndexBySeries memo with the shared helper (one memo yielding both anchors) and route the dot renderer's branch through dotRole — a non-sparse series renders exactly two markers, a quiet start cap (r 3, surface ring 1.5) and the unchanged end accent (r 4, ring 2); sparse rendering unchanged by construction (start style equals the sparse dot style); while editing the dot callback, correct its stale prop typing (Recharts passes value as a [baseValue, rawValue] tuple, not a number — gap safety comes from the cy null guard, which stays); no other behavioral change
    satisfies: [AC2, AC3]
    anchor: src/widgets/line-chart/LineChartView.tsx:89
build_order: [F1, F2, F3]
depends_on: []
contract:
  kind: function
  signature: |
    export interface SeriesEndIndices {
      first: number;   // first merged-row index where the series has a value; -1 if none
      last: number;    // last such index; -1 if none
    }
    export function seriesEndIndices(
      rows: ReadonlyArray<Record<string, unknown>>,
      seriesNames: readonly string[],
    ): SeriesEndIndices[]

    export type DotRole = "end" | "start" | "sparse" | "none";
    // end wins when index === last (covers the single-point first === last case);
    // start only when index === first; sparse for other points of a sparse series.
    export function dotRole(args: {
      index: number;
      first: number;
      last: number;
      sparse: boolean;
    }): DotRole
criteria:
  - id: AC1
    statement: seriesEndIndices returns the correct first and last merged-row indices per series — dense series span the full range, a series with leading/trailing gaps anchors on its own first/last non-null cells, a single-point series returns first equal to last, a series never present (or empty rows) returns -1 for both, and null cells at the edges are skipped
    implemented_by: [F1, F2]
    oracle:
      kind: test
      ref: src/__tests__/line-end-indices.test.ts::seriesEndIndices
    failure: a wrong first anchor makes the start cap silently vanish (the cy-null guard swallows gap rows) or anchor on the wrong point
  - id: AC2
    statement: Visual QA (sandbox + Storybook, both themes) — (a) line-medium-numeric (20 points, non-sparse) renders exactly two markers per series, a quiet r-3 start cap and the unchanged r-4 end accent; (b) line-multi-series gives every series both caps in its own colour, and the column of start caps at the left plot edge reads acceptably against the Y-axis tick labels (same position sparse dots already occupy today); (c) line-small-categorical (5 points, sparse) — every point still dotted r 3, end still r 4, and no additional marker appears; (d) line-minimal-single renders one end-style dot only; (e) muting a series dims its caps with the line; (f) hover activeDot (r 4.5) still renders; (g) dark theme spot-check; (h) Copy PNG includes the caps; (i) the dashboard preset embedding line-multi-series shows the caps in its tile without clutter or layout breakage; (j) line-edge-labels and line-negatives (both sparse) show no visible diff at all
    implemented_by: [F3]
    oracle:
      kind: prose-review
    failure: start caps double up on sparse series, caps ignore mute opacity, or a start cap silently fails to appear on a non-sparse series
  - id: AC3
    statement: The View actually consumes the shared helpers — the inline backward-scan memo (and its lastIndexBySeries symbol) is gone, both anchors come from seriesEndIndices, and the renderer branch goes through dotRole, so the tested code is the shipped code
    implemented_by: [F1, F3]
    oracle:
      kind: command
      ref: >-
        grep -q "seriesEndIndices" src/widgets/line-chart/LineChartView.tsx &&
        grep -q "dotRole" src/widgets/line-chart/LineChartView.tsx &&
        ! grep -q "lastIndexBySeries" src/widgets/line-chart/LineChartView.tsx &&
        ! grep -q "for (let i = rows.length - 1" src/widgets/line-chart/LineChartView.tsx
    failure: the helpers exist and pass their tests while the View keeps a diverging inline copy
  - id: AC4
    statement: dotRole encodes the renderer's decision order — end wins whenever index equals last (so a single-point series with first equal to last gets exactly the end role), start fires only at the first anchor, interior points of sparse series get sparse, interior points of dense series get none, and -1 anchors never match
    implemented_by: [F1, F2]
    oracle:
      kind: test
      ref: src/__tests__/line-end-indices.test.ts::dotRole
    failure: a single-point series draws two stacked markers, or start caps appear on every sparse point twice
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
N/A — no payload, schema, env, or config changes of any kind. The tool schema, guard, README field table, datasets, and stories are all untouched (and out of scope).

## Chosen Approach
Variant 3 from dialogue — asymmetric caps, redesign-consistent:

1. **F1 helpers**: `seriesEndIndices(rows, seriesNames)` — for each name, scan forward for the first row with `row[name] != null` and backward for the last; `{ first: -1, last: -1 }` when absent. Plus `dotRole({ index, first, last, sparse })` returning `"end" | "start" | "sparse" | "none"` with end-first precedence per the contract signature. Pure, no React.
2. **F3 wiring**: replace the `lastIndexBySeries` memo with `const endIndices = useMemo(() => seriesEndIndices(rows, series.map(s => s.name)), [rows, series])`. In the series map, destructure `first`/`last` and have the dot renderer switch on `dotRole(...)`: `end` → r 4, ring 2 (unchanged); `start` and `sparse` → r 3, ring 1.5; `none` → no dot. Because end wins inside `dotRole`, a single-point series (first === last) keeps its end-accent rendering — and that precedence is unit-tested rather than implied by JSX branch order. Start caps inherit `opacityFor` and the existing transition style through the same `<circle>` construction. While editing the callback, fix its stale prop type: Recharts passes `value` as a `[baseValue, rawValue]` tuple for a non-stacked Area, so the declared `value?: number` is wrong; gap rows are (and remain) filtered by the `cy == null` guard.
3. **No new visuals elsewhere**: sparse series are untouched by construction (start style ≡ sparse style); `activeDot`, tooltip, legend, gradient fills, axes all unchanged.

**Stack compliance:** NATIVE
**Future alignment:** N/A (no VISION.md)

**Stack extensions required:** none.

## Why this over alternatives
- V1 — symmetric r-4 caps at both ends (rejected): two equal accents flatten the redesign's deliberate emphasis on the current value; a 120-point time series would open and close with the same visual weight, reading as two "now" markers.
- V2 — strict token values, primary 3 / secondary 2.5 at both ends (rejected): changes the already-shipped end-cap look across every line chart and introduces per-series marker sizing the redesign never adopted; the May token spec predates the July redesign, and the design memory holds the redesign comps as the source of truth.
- Followups-doc options A (manual coordinate math over chart scales) and C (overlay `<Line>` with first/last datum) (rejected): the shipped custom dot renderer already solves anchoring with none of that machinery — only the first-index anchor is missing.

## Test Plan
- Harness: vitest, node-only (`npm test`); the index math is the testable half (F2, pure-module style per `pie-collapse.test.ts` precedent); rendering is proven by the AC2 QA checklist.
- F2 block names pinned ("seriesEndIndices", "dotRole") so the AC1/AC4 oracle refs resolve.
- Visual QA: `npm run dev:sandbox` and `npm run dev:storybook`, walking AC2 (a)–(h) in both themes.

## Definition of Done
- [ ] `npm run typecheck`, `npm test`, `npm run build` green
- [ ] AC1/AC4 test oracles and the AC3 command oracle pass
- [ ] AC2 checklist (a)–(j) walked in sandbox/Storybook (both themes), outcomes recorded in verification notes
- [ ] No repository Markdown touched beyond the `.marvin/task/` lifecycle artifacts (spec record, verification.md); delivery PR targets `dev` per the branch workflow

## Non-goals
- Any payload/schema/guard/tool change (no new fields; `render_line_chart` contract untouched)
- Per-series marker-size differentiation (V2's primary/secondary split — rejected)
- Editing `specs/design-system-tokens.json` or the followups doc (their refresh is a separate docs task already noted in spec 002's Future Considerations)
- Dataset/story additions (existing presets demonstrate every path)
- End caps for scatter, bar, or any other widget
- Changing `SPARSE_DOT_THRESHOLD`, `activeDot`, stroke widths, or the area-gradient rendering

## Assumptions
- The May token values (`end-cap-radius` primary 3 / secondary 2.5) are treated as superseded by the July redesign's dot family. V3 is a **repo-side interpretation** chosen by the user in dialogue — the claude.ai/design comps were not consulted for this task — reading the tokens as "the start cap adopts the existing quiet size (3)" while the end accent stays 4. Recorded so nobody later "fixes" the caps to 2.5 or claims the comps settled it.
- For the four sparse presets (`line-minimal-single`, `line-small-categorical`, `line-edge-labels`, `line-negatives`) V3 ships **zero visual change by construction**: every sparse point already renders at the start-cap style, so followups item 3 is complete for sparse series by argument, not by new pixels. AC2 step (j) pins this as an explicit no-diff check.
- A series whose data is entirely `null`-valued (no real points) simply gets no caps (-1 anchors never match an index) — consistent with it drawing no line today.

## Open Questions
none

## Security / NFR
N/A — pure client-side rendering detail inside one widget; no inputs parsed, no surfaces exposed. Bundle impact is a few dozen bytes.

## Critic Verdict & Overrides
PASS WITH WARNINGS (single round — no blockers; the critic verified every load-bearing code claim, including Recharts dot-callback semantics down to the vendored source). All eight warnings folded into this revision: AC3's grep now also requires the `lastIndexBySeries` symbol gone and `dotRole` present; the renderer's decision order moved into the pure `dotRole` helper with its own test block (new AC4) so the genuinely new logic sits under `npm test`; AC2 gained the dashboard-tile step, the left-edge crowding look, and the sparse no-diff step; AC1/AC2 failure clauses reworded to the real symptom (a silently missing cap, not a misplaced one); the stale `value?: number` dot-prop typing is corrected in F3's scope; the DoD Markdown line now excepts `.marvin/task/` lifecycle artifacts; AC2(c) reworded to an observable claim. Author answers to the critic's questions are recorded in Assumptions (V3 is a repo-side interpretation; sparse-series completeness is by construction). No overrides.

## Design Notes
- The start cap's style intentionally equals the sparse-dot style — one visual vocabulary ("quiet marker") with the end accent as the single emphasized point. If a future design pass adopts per-series radii, `seriesEndIndices` already exposes both anchors; only the renderer constants move.
- `LineChartView.tsx` hooks stay above the empty-payload early return (the new memo replaces an existing one in the same position — the spec-002 hook-placement hazard applies here too).
- The helper is exported for potential reuse (scatter end labels were once discussed), but only line-chart consumes it in this task.

## Future Considerations
- Item 4 (table sparkline columns) is the last unstarted followup; the ValueLegend revision (item 5 vs the shipped `ValueLegend`) remains open.
- Refresh `specs/design-system-followups.md` and the token json (items 2+3 shipped, fonts footnote stale) as a small docs task.

## Delivery

- PR: https://github.com/real-case/sigil/pull/43 (base: dev)
- Date: 2026-07-31
- AC2 QA outcomes (a)-(j): all PASS, light + dark — medium-numeric 3x(start r3 + end r4); multi-series 6x both caps, left-edge column clean; small-categorical 8xr3+2xr4 unchanged; minimal-single one r4 only; mute dims caps to 0.18; activeDot/tooltip working and untouched by the diff; PNG copy clean console; dashboard tile 6xr3+6xr4 no overflow; edge-labels 4+1 and negatives 7+1 no visible diff.
- Diff-critic PASS WITH WARNINGS, 0 blockers: W1 (dead value guard) fixed, W3 (-1 index assertion) fixed, N1/N3 folded; W2 satisfied by this section + the PR body; N2 accepted (same code path as walked presets).
