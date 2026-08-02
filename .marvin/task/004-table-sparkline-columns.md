---
slug: table-sparkline-columns
type: feature
status: in-progress
created: 2026-07-31
tracker: none
supersedes: none
stack: typescript, react
risk: medium
breaking: false
spike_required: false
test_command: npm test
contract_sha: 4514d774a8cd2c1a
---

# Table: Sparkline Columns with Last-Value Readout

## Goal
Let a table column declare `kind: "sparkline"`: its cells hold numeric series (`number[]`, oldest → newest) rendered as a fixed 56×16 inline SVG line (design tokens `components.chart.table.spark-width/height`, `series-0`, stroke 1, no axes) **plus the last value as a mono-font readout** beside it (user-chosen V2) — trend and current figure readable without hover. Sorting a sparkline column orders by last value; the text filter ignores sparkline digits; Copy CSV exports each series as one joined `"1,2,3"` cell. This is item 4 of `specs/design-system-followups.md` — the last unstarted followup and the only one with a payload-contract change.

## Context
- Related patterns: `TableView.tsx` (post-redesign): `detectNumericColumn` walks cells, `alignFor` defaults right/left, `compareValues` sorts numbers/localeCompare with empties last, `matchesFilter` builds a lowercase haystack from `String(v)` of every row value (including keys not present in `columns` — that reach must be preserved), `copyCsv` maps `row[c.key] ?? ""` per column, cells render `String(v)`; styles live in the widget's own `<TableStyles>` CSS block. Pure-module + node-only test convention per specs 002/003 (`collapse.ts`, `end-indices.ts` precedents). Stat-panel ships its own `Sparkline` (area+line, W 100 / H 28, `preserveAspectRatio="none"`, gradient fill, `aria-hidden`, 2px pad, `.toFixed(2)` points) — deliberately NOT reused (V3 rejected), but its pad/precision/aria conventions are adopted.
- Callers / reverse-deps: `TableView` ← `table/App.tsx` (mountWidget + `isTablePayload`), `widget-views.ts` (dashboard tiles — tile payloads bypass the widget guard entirely, `z.record(z.string(), z.unknown())`, so the renderer must stay defensive), sandbox datasets, `Table.stories.tsx` (manually enumerated). The tool schema (`tools/table.ts`) types rows as `z.record(z.string(), z.union([z.string(), z.number()]))` — it must learn arrays. **No dashboard preset embeds a table today** — the AC6(j) fixture must be added to `sandbox/datasets/dashboard.ts` (F12); the sandbox has no free-form payload editor.
- Constraints and discovered facts:
  - `csvField` in `export-utils.ts` quotes any value containing commas; its formula-injection rule prefixes `'` to **string** values starting with `=+-@` — so a joined series starting with a negative number exports as `"'-3,4"`. That is the safety carve-out working as designed (the joined value is a string, not a typed number); the expectation is pinned in AC6(e) so QA does not misread the apostrophe as a bug.
  - Cross-field zod validation (arrays only under sparkline columns) is impractical: `registerAppTool` receives a raw shape, not a refinable object schema. Division of labor: **zod stays permissive** (cell union gains `z.array(z.number())` anywhere), **the widget guard is the strict gate** (arrays accepted only under columns whose `kind` is "sparkline", every entry a finite number), **the renderer is defensive** — same layering as spec 002. The zod side is proven by the e2e round-trip (AC4), not by the guard suite.
  - **Scalar cells under a sparkline column are legal at every layer** (zod, guard, renderer) and render as plain text — an LLM emitting a single number for a one-point trend is the likely real-world producer. The em dash is reserved for missing cells, empty arrays, and arrays with non-finite entries.
  - Guard-test hygiene (spec 002 blocker B4 + this spec's critic W6): the existing kind-less `table` GuardCase stays untouched so its column-mutating rejects keep failing through the columns branch; the sparkline coverage lands as a **second** `cases[]` entry.
  - `detectNumericColumn` must skip sparkline columns explicitly; their default alignment is `center` (overridable via `align`).
  - Token values: `spark-width` 56, `spark-height` 16; stroke `var(--sigil-series-0)`, strokeWidth 1; a **2px inset pad** keeps the stroke and the single-value dot inside the viewport (stat-panel precedent); points are emitted at `.toFixed(2)` precision so tests assert stable strings. The followups doc mandates that row hover must NOT re-emphasize the sparkline.
  - Edge inputs decided in dialogue: missing cell / empty array / non-finite entries → em dash; scalar → plain text; single value → a dot at the right edge, mid-height; constant series → horizontal midline; negatives normalized by min/max.
  - `CsvCell` needs no widening — `string | number` is already assignable to it.
- Sibling specs: 001, 002, 003 — all `shipped`. Delivery goes as a PR to `dev`.

## Spec Contract
The authoritative, machine-validated contract. The implementer may touch **only** the files listed in `files`.

```yaml spec-contract
files:
  - id: F1
    path: src/shared/payloads.ts
    action: edit
    intent: add ColumnKind ("text" | "sparkline") and optional kind on TableColumn (default "text"); widen TableCell to include number arrays with a doc comment stating arrays are legal only under sparkline columns (oldest → newest) while scalars stay legal everywhere
    satisfies: [AC3]
    anchor: src/shared/payloads.ts:208
  - id: F2
    path: src/widgets/table/cells.ts
    action: new
    intent: pure kind-aware cell helpers — sparkPoints(values, width 56, height 16) producing an SVG polyline points string with an asymmetric inset (2px horizontal for the dot radius, 1px vertical for the stroke — a symmetric 2px pad would spend a quarter of the 16px box on padding) and .toFixed(2) coordinates (min/max normalization, constant series at midline, fewer than 2 points yields an empty string), cellSortValue (sparkline arrays sort by their last value, empty arrays as undefined, scalars pass through even under sparkline kind), cellFilterText (sparkline arrays contribute nothing to the filter haystack, scalars stringify), cellCsvValue (sparkline arrays join as a comma-separated string, scalars pass through)
    satisfies: [AC1, AC2, AC7]
  - id: F3
    path: src/__tests__/table-cells.test.ts
    action: new
    intent: node-only unit tests, describes "sparkPoints" (all coordinates within the 2px-padded 56 by 16 box, min at the padded bottom and max at the padded top, negatives via the same normalization, constant midline, oldest leftmost, fixed two-decimal formatting, fewer than 2 values gives an empty string) and "cell transforms" (sort by last value with empty-as-undefined and scalar passthrough, filter text empty for arrays and unchanged for scalars, CSV join for arrays incl. a negative-leading series and passthrough for scalars)
    satisfies: [AC1, AC2]
  - id: F4
    path: src/widgets/table/App.tsx
    action: edit
    intent: guard — column kind accepts undefined or the two literals; row validation becomes column-aware, so an array cell passes only when a matching column declares kind sparkline and every entry is a finite number; scalar cells keep the existing rule everywhere (including under sparkline columns); unknown row keys keep scalar-only validation
    satisfies: [AC3]
  - id: F5
    path: src/__tests__/payloads.test.ts
    action: edit
    intent: keep the existing kind-less table GuardCase untouched (its column-mutating rejects must keep failing through the columns branch); add a SECOND cases[] entry "table (sparkline)" whose valid payload mixes a kind-less column, a scalar-celled sparkline column value, and array cells under the sparkline column, with rejects for an array under a text column, an array containing a non-number, an array containing Infinity, and an invalid kind literal
    satisfies: [AC3]
  - id: F6
    path: src/tools/table.ts
    action: edit
    intent: zod — columns gain the optional kind enum with an LLM-facing describe; the rows record union gains number arrays; the description const gains a sentence teaching when to emit sparkline columns (inline trends, recent history per row) and that cells are then arrays oldest to newest
    satisfies: [AC4, AC5]
  - id: F7
    path: src/__tests__/e2e.test.ts
    action: edit
    intent: TOOL_ARGS.render_table gains a sparkline column and an array cell; a dedicated test asserts the array round-trips through structuredContent intact and that an array containing a string is rejected by schema validation with the failure blaming rows
    satisfies: [AC4]
  - id: F8
    path: src/widgets/table/TableView.tsx
    action: edit
    intent: wiring — kindByKey map from columns; sparkline columns skip numeric detection and default to center alignment; sorting routes cells through cellSortValue, CSV through cellCsvValue, and filtering through cellFilterText with non-column row keys still contributing as scalars (kind lookup defaults to text); sparkline cells render an inline flex group of the 56x16 polyline SVG (stroke var(--sigil-series-0), strokeWidth 1, aria-hidden, no hover styles) plus the last value in mono tabular-nums as the accessible text; a scalar under a sparkline column renders as plain text; a lone dot at the right edge for single-value series; an em dash for missing cells, empty arrays, or non-finite entries; styles extend the existing TableStyles block
    satisfies: [AC6, AC7]
    anchor: src/widgets/table/TableView.tsx:46
  - id: F9
    path: src/widgets/sandbox/datasets/table.ts
    action: edit
    intent: new preset table-sparklines — services with mixed columns (text, right-aligned number, sparkline of ~12 weekly values) where one spark contains the distinctive value 777 appearing nowhere else (makes the filter-exclusion step falsifiable), one row has a single-value series, one row a scalar under the sparkline column, one row the sparkline key missing, and one series dips negative starting with a negative value
    satisfies: [AC6]
  - id: F10
    path: src/widgets/table/Table.stories.tsx
    action: edit
    intent: add story Sparklines for the new preset (stories are manually enumerated)
    satisfies: [AC6]
  - id: F11
    path: README.md
    action: edit
    intent: render_table reference — add the columns[].kind row, note that sparkline cells are number arrays rendered as a 56x16 inline trend plus last value, sorting uses the last value, and Copy CSV exports the series as one joined cell
    satisfies: "—"
    anchor: README.md:150
  - id: F12
    path: src/widgets/sandbox/datasets/dashboard.ts
    action: edit
    intent: add a table tile embedding the table-sparklines preset payload to the dashboard-overview preset with colSpan 2 (via payloadById, same pattern the pie and line tiles use; stat-panel tiles set the colSpan precedent) so AC6 step (j) has a walkable fixture — no dashboard preset embeds a table today
    satisfies: [AC6]
build_order: [F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F12, F11]
depends_on: []
contract:
  kind: function
  signature: |
    export type ColumnKind = "text" | "sparkline";        // TableColumn.kind, default "text"
    export type TableCell = string | number | number[];   // arrays only under sparkline columns

    export function sparkPoints(
      values: readonly number[],
      width?: number,    // default 56
      height?: number,   // default 16
    ): string            // SVG polyline points, 2px inset pad, .toFixed(2) coords;
                         // "" when fewer than 2 values

    export function cellSortValue(
      cell: TableCell | undefined,
      kind: ColumnKind,
    ): string | number | undefined   // sparkline array → last value; empty array → undefined;
                                     // scalars pass through under any kind

    export function cellFilterText(
      cell: TableCell | undefined,
      kind: ColumnKind,
    ): string            // sparkline array → "" (excluded from the haystack); scalars stringify

    export function cellCsvValue(
      cell: TableCell | undefined,
      kind: ColumnKind,
    ): string | number   // sparkline array → values joined with commas; scalars pass through
criteria:
  - id: AC1
    statement: sparkPoints maps a series into the 56-by-16 box with an asymmetric inset (2px horizontal, 1px vertical) — every coordinate stays within the padded bounds, min maps to the padded bottom and max to the padded top, negatives ride the same normalization, a constant series draws at the vertical midline, oldest renders leftmost, coordinates carry fixed two-decimal precision, and fewer than 2 values yields an empty string
    implemented_by: [F2, F3]
    oracle:
      kind: test
      ref: src/__tests__/table-cells.test.ts::sparkPoints
    failure: extreme vertices clip half their stroke outside the viewport, a flat series draws on the floor, or float jitter makes the points string unstable across engines
  - id: AC2
    statement: kind-aware transforms behave per contract — cellSortValue returns the last value for sparkline arrays (undefined for empty arrays, scalar passthrough even under sparkline kind), cellFilterText returns an empty string for sparkline arrays and the string form for scalars, cellCsvValue joins sparkline arrays with commas (negative-leading series included) and passes scalars through
    implemented_by: [F2, F3]
    oracle:
      kind: test
      ref: src/__tests__/table-cells.test.ts::cell transforms
    failure: sorting a sparkline column falls back to localeCompare of joined strings, or filter terms match invisible sparkline digits
  - id: AC3
    statement: The widget guard is the strict gate — the untouched kind-less GuardCase keeps its column-branch rejects meaningful, and the new "table (sparkline)" case accepts a payload mixing kind-less columns, scalar cells under the sparkline column, and array cells, while rejecting an array under a text column, an array with a non-number, an array with a non-finite number, and an invalid kind literal
    implemented_by: [F1, F4, F5]
    oracle:
      kind: test
      ref: src/__tests__/payloads.test.ts::table
    failure: a guard written cell-first rejects every existing table payload, or arrays leak into text columns uncaught
  - id: AC4
    statement: The zod schema accepts sparkline payloads and enforces the cell union — an in-process render_table call round-trips the number array intact through structuredContent, and a call whose array contains a string fails schema validation blaming rows
    implemented_by: [F6, F7]
    oracle:
      kind: test
      ref: src/__tests__/e2e.test.ts::render_table
    failure: arrays are silently stringified crossing the protocol, or garbage arrays reach the widget
  - id: AC5
    statement: The tool description const teaches the LLM the new surface — when to emit sparkline columns and that their cells are numeric arrays oldest to newest
    implemented_by: [F6]
    oracle:
      kind: command
      ref: >-
        sed -n '/^const description/,/join(/p' src/tools/table.ts | grep -qi "sparkline" &&
        sed -n '/^const description/,/join(/p' src/tools/table.ts | grep -qiE "trend|array"
    failure: the schema supports sparklines but the LLM never learns to use them
  - id: AC6
    statement: Visual QA (sandbox + Storybook, both themes) — (a) the table-sparklines preset renders 56x16 line sparks in series-0 with the last value beside them in mono; (b) the sparkline column defaults to center alignment; (c) clicking its header sorts rows by last value asc/desc/none; (d) filtering for 777 (a value occurring only inside a spark) matches nothing while a text-column term still matches; (e) Copy CSV yields one quoted joined cell per series — the negative-leading series carries the formula-guard apostrophe by design — and scalar cells unchanged; (f) the single-value row renders a lone dot plus its value, the scalar-cell row renders the number as plain text, the missing-cell row renders an em dash; (g) the negative series stays inside its padded 16px box; (h) row hover changes the row background but not the spark; (i) dark theme spot-check; (j) the dashboard preset with the new table tile renders the sparks without layout breakage
    implemented_by: [F8, F9, F10, F12]
    oracle:
      kind: prose-review
    failure: sparks overflow their box, hover re-emphasizes them, a scalar trend cell vanishes into an em dash, or CSV splits a series across columns
  - id: AC7
    statement: The View actually consumes the tested helpers — sparkPoints, cellSortValue, cellFilterText, and cellCsvValue are all referenced in TableView.tsx, so the tested code is the shipped code
    implemented_by: [F2, F8]
    oracle:
      kind: command
      ref: >-
        grep -q "sparkPoints(" src/widgets/table/TableView.tsx &&
        grep -q "cellSortValue(" src/widgets/table/TableView.tsx &&
        grep -q "cellFilterText(" src/widgets/table/TableView.tsx &&
        grep -q "cellCsvValue(" src/widgets/table/TableView.tsx
    failure: the helpers exist and pass their tests while the View keeps diverging inline copies
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
N/A — no migrations, env vars, or flags. The payload change is additive (`kind` optional defaulting to "text"; `TableCell` widened by a union member no existing payload produces); `breaking: false` for every existing caller.

## Chosen Approach
Variant 2 from dialogue — local sparkline + last-value readout:

1. **F1 types**: `ColumnKind`, `TableColumn.kind?: ColumnKind`, `TableCell = string | number | number[]` with doc comments (arrays only under sparkline columns, oldest → newest — same convention as stat-panel `trend`; scalars stay legal everywhere).
2. **F2 helpers** (`src/widgets/table/cells.ts`, pure): `sparkPoints` normalizes by min/max into the box inset by `PAD = 2` on every side (y inverted so max is up; constant series → mid-height; `values.length < 2` → `""`); coordinates via `.toFixed(2)`. `cellSortValue`/`cellFilterText`/`cellCsvValue` implement the dialogue decisions with **scalar passthrough under sparkline kind**.
3. **F4 guard**: `isTableColumn` accepts the kind literals; `isTablePayload` builds a sparkline-key set from columns and validates rows column-aware (array ⇒ key must be a sparkline column AND every entry `Number.isFinite`; scalars legal everywhere; missing keys stay legal).
4. **F6 zod**: `kind: z.enum(["text", "sparkline"]).optional().describe(...)`; rows union gains `z.array(z.number())`; description gains the LLM guidance sentence. Permissive-zod/strict-guard layering — the zod half is proven by AC4's e2e, not the guard suite.
5. **F8 View wiring**: `kindByKey` memo (lookup defaults to "text", which also covers non-column row keys in the filter); numeric detection skips sparkline columns; `alignFor` defaults sparkline → center; sort/CSV call the F2 helpers with the column kind; the filter maps `Object.entries(row)` through `cellFilterText` so non-column keys keep contributing. Cell rendering for a sparkline column: array with ≥2 finite values → `<span class="sigil-spark-cell"><svg width=56 height=16 viewBox="0 0 56 16" aria-hidden="true"><polyline points={sparkPoints(v)} fill="none" stroke="var(--sigil-series-0)" strokeWidth=1 /></svg><span class="sigil-spark-last">{String(last)}</span></span>` (the readout is the accessible text); single value → `<circle r=1.5>` at the padded right edge, mid-height, plus the readout; **scalar → plain text like any cell**; missing / empty array / non-finite entries → em dash. `.sigil-spark-cell { display: inline-flex; align-items: center; gap: 6px; }`, `.sigil-spark-last` mono + tabular-nums; no hover rules. All inside the existing `TableStyles` template string.
6. **F9 preset / F10 story / F12 dashboard fixture**: `table-sparklines` — ~6 service rows with `name`, `region`, `requests` (number, right), `trend` (sparkline, 12 weekly values); one spark contains **777** (nowhere else in the table); one single-value row; one scalar-cell row; one missing-trend row; one negative-dipping series starting negative. Story `Sparklines`. A new table tile in a dashboard preset via `payloadById(tableDatasets, "table-sparklines")`.
7. **F11 README**: `columns[].kind` row + rows-type note + behavior sentence (56×16 + last value, sort by last, CSV joined cell).

**Stack compliance:** NATIVE
**Future alignment:** N/A (no VISION.md)

**Stack extensions required:** none.

## Why this over alternatives
- V1 — sparkline only, no readout (rejected): with hover emphasis forbidden by the followups doc, the exact current value would be reachable only via Copy CSV or re-asking the model; the readout removes that dead end at negligible cost. V2 subsumes V1.
- V3 — extract stat-panel's `Sparkline` into `shared/` and parameterize (rejected): stat-panel's is an area+line at W 100 / H 28 with `preserveAspectRatio="none"` and gradient fill; the table wants fixed 56×16 line-only. Sharing means a two-mode rewrite of a shipped sibling widget — worse than ~30 lines of local SVG. Recorded for a future consolidation task.
- CSV as one column per index (the followups doc's other option — rejected): ragged row lengths would force either padding or variable column counts per row, breaking the header contract; the joined single cell is lossless and spreadsheet-splittable.
- Server-side rendering of spark cells (noted for completeness): dashboard tiles feed the widget stored payloads with no server in the path — same reasoning as the pie collapse.

## Test Plan
- Harness: vitest, node-only (`npm test`); F3 covers the pure geometry and transforms (the genuinely new logic), F5 the guard table, F7 the protocol round-trip; AC7 pins the View wiring mechanically (spec 003 precedent).
- F3 block names pinned ("sparkPoints", "cell transforms") so AC1/AC2 oracle refs resolve. Oracle refs match by substring (vitest -t semantics): AC3's `::table` runs BOTH the kind-less case and "table (sparkline)" — same shape spec 002 shipped with `::pie-chart`.
- Visual QA: `npm run dev:sandbox` and `npm run dev:storybook`, walking AC6 (a)–(j) in both themes.

## Definition of Done
- [ ] `npm run typecheck`, `npm test`, `npm run build` green
- [ ] AC1–AC4 test oracles and the AC5/AC7 command oracles pass
- [ ] AC6 checklist (a)–(j) walked in sandbox/Storybook (both themes), outcomes recorded in the PR body and the spec's Delivery section
- [ ] README updated (English); no repository Markdown touched beyond it and the `.marvin/task/` lifecycle artifacts
- [ ] Delivery PR targets `dev` per the branch workflow

## Non-goals
- Refactoring stat-panel's Sparkline or introducing a shared sparkline component (V3 — rejected; future consolidation task seeded by the exported `sparkPoints`)
- Hover tooltips, point markers, or interaction on table sparklines (the followups doc explicitly forbids hover emphasis)
- Per-column spark colors or column-level color overrides (series-0 only, per tokens)
- Multi-series sparklines in one cell, band/area fills, or axis hints
- Pagination, virtualization, or any unrelated table feature
- Editing `specs/design-system-followups.md`, the token JSON, `TESTING.md`, or `.design-sync/config.json` (all queued for the standing docs-refresh task — see Future Considerations)

## Assumptions
- The last-value readout (V2) is a deliberate superset of the token spec's bare sparkline; recorded as the user's choice so a later "tokens say spark only" reading does not strip it.
- Sorting by last value treats an empty/missing series like other empty cells (sorted last via the existing empty handling); scalar cells under a sparkline column sort by their own value — consistent with rendering them as plain text.
- `String(last)` (raw, like every other table cell today) rather than a formatted number — table cells do not use fmtNumber anywhere; consistency wins over prettiness.
- Dashboard tile payloads bypass the widget guard (verified in spec 002); the renderer's scalar/em-dash handling is the defense for malformed spark cells arriving via that path.
- The formula-guard apostrophe on negative-leading joined series is accepted as correct safety behavior (the joined value IS a string); pinned in AC6(e) so it is never "fixed" into an injection hole.

## Open Questions
none

## Security / NFR
- Input validation tightened at both real gates (zod cell union typed; guard enforces per-column shape and finite numbers — `Number.isFinite` also rejects NaN/Infinity smuggled via raw dashboard payloads at render level through the em-dash path). CSV reuses `csvField` unchanged; F3 asserts `cellCsvValue`'s negative-leading join, and the composed apostrophe behavior (`csvField` applies it downstream in `toCsv`) is observed at AC6(e) — the string-typed join deliberately keeps the formula guard active.
- Accessibility: the spark SVG is `aria-hidden`; the mono readout is the accessible cell text (stat-panel precedent).
- Rendering cost: one polyline per sparkline cell, no event handlers — negligible. No auth/network/PII surface. Bundle impact ~1 kB in one widget (non-concern per CLAUDE.md).

## Critic Verdict & Overrides
PASS WITH WARNINGS (round 2; round 1 was BLOCK). Round-1 blockers — unoracled zod clause in AC3, unwalkable dashboard step, missing View-wiring criterion, undefined scalar-under-sparkline behavior — all fixed and re-verified by the critic against the code, along with warnings 5–12 and the three author questions (aria-hidden + readout as accessible text, .toFixed(2) precision, TESTING.md deferred to the docs task). Round-2 warnings folded: AC7 greps target call sites (helper name plus open paren) since no lint layer would catch an unused import; the spark inset is asymmetric (2px horizontal for the dot, 1px vertical for the stroke) preserving 87 percent amplitude; F12 pins dashboard-overview and colSpan 2. The critic's residual notes are recorded: oracle refs match by vitest -t substring (both table GuardCases run under ::table), and the composed CSV apostrophe behavior is proven at the unit layer only for the join, observed end-to-end at AC6(e). No overrides.

## Design Notes
- The permissive-zod / strict-guard / defensive-renderer layering mirrors spec 002's and exists for the same reason: dashboard tiles feed the View raw payloads with no zod in the path.
- `sparkPoints` is exported and geometry-only so a future shared-sparkline consolidation (Non-goals) can lift it without touching the table.
- The two-GuardCase split (kind-less case untouched, sparkline case added) protects the columns-branch rejects from being shadowed by the rows branch — see this spec's critic W6 and spec 002 blocker B4.
- `.design-sync/config.json` hard-codes the old table row type and is already stale for pie (`maxSegments`); it is deliberately untouched here and named in the docs-refresh task.
- TableView has no early returns before hooks — the 002/003 hook-placement hazard does not bite; new memos go beside the existing ones.

## Future Considerations
- Standing docs-refresh task (queued across specs 002–004): `specs/design-system-followups.md` (items 1–4 shipped), token JSON, `TESTING.md` per-widget QA rows, `.design-sync/config.json` payload types.
- Followup item 5 revision (`ValueLegend` vs the shipped value-bearing legend) is the last open design-system item.
- A shared `Sparkline` consolidation (stat-panel + table) once both are stable — the F2 geometry helper is the natural seed.
- If tables ever gain per-row drill-down (`app.callServerTool`), sparkline cells are the obvious click target — deferred with the rest of drill-down pending a live GUI host.
